import * as v from 'valibot';
import type { Database } from 'bun:sqlite';
import { getGenerationFieldLimits } from '../config/application';
import { createEventStreamCompletionTracker } from '../../system/generation/event-stream';
import { createGenerationRequestSchema } from '../../system/generation/schema';
import { getClientFingerprint, hasValidClientDeviceSignal } from './client-fingerprint';
import { createApplicationGenerationLimiter } from './application-limit';
import { GenerationRequestError, requestGeneration } from './client';
import { getGenerationInactivityTimeoutMs } from './config';
import { createGenerationRateLimiter } from './rate-limit';
import { VERIFIED_SESSION_HEADER } from '../../system/security/session';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const upstreamErrorSchema = v.strictObject({
  error: v.strictObject({
    code: v.string(),
    message: v.string(),
  }),
});

type NormalizedError = {
  status: number;
  code: string;
  message: string;
};

type ApplicationGenerationReservation = {
  release: () => void;
};

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>,
) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

function getDiagnosticHeaders(response: Response) {
  const headers: Record<string, string> = {};
  const retryAfter = response.headers.get('retry-after');
  const requestId = response.headers.get('x-request-id');
  if (retryAfter) headers['retry-after'] = retryAfter;
  if (requestId) headers['x-request-id'] = requestId;
  return headers;
}

async function parseUpstreamError(response: Response) {
  try {
    return v.safeParse(
      v.pipe(v.string(), v.parseJson(), upstreamErrorSchema),
      await response.text(),
    );
  } catch {
    return undefined;
  }
}

function normalizeUpstreamError(code: string | undefined, status: number): NormalizedError {
  if (code === 'invalid_token') {
    return {
      status: 502,
      code: 'invalid_token',
      message: 'The generation service is not configured correctly.',
    };
  }
  if (code === 'invalid_request') {
    return {
      status: 502,
      code: 'invalid_request',
      message: 'The generation service rejected the request.',
    };
  }
  if (code === 'rate_limit_exceeded' || status === 429) {
    return {
      status: 429,
      code: 'rate_limited',
      message: 'Too many generation requests. Please try again later.',
    };
  }
  if (code === 'upstream_error') {
    return {
      status: 502,
      code: 'upstream_error',
      message: 'The generation provider is temporarily unavailable.',
    };
  }
  return {
    status: 502,
    code: 'generation_failed',
    message: 'The generation service could not complete the request.',
  };
}

async function createUpstreamErrorResponse(upstream: Response) {
  const parsed = await parseUpstreamError(upstream);
  const error = normalizeUpstreamError(
    parsed?.success ? parsed.output.error.code : undefined,
    upstream.status,
  );
  return errorResponse(error.status, error.code, error.message, getDiagnosticHeaders(upstream));
}

function createReservedGenerationStream(
  upstreamBody: ReadableStream<Uint8Array>,
  reservation: ApplicationGenerationReservation,
) {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  const completion = createEventStreamCompletionTracker();
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    reservation.release();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        const chunk = decoder.decode(value, { stream: !done });
        completion.feed(chunk);
        if (done) {
          if (completion.hasIncompleteEvent()) {
            release();
            controller.error(new Error('The generation stream ended with an incomplete event.'));
            return;
          }
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch {
        release();
        controller.error(new Error('The generation stream failed.'));
      }
    },
    async cancel() {
      release();
      await reader.cancel();
    },
  });
}

function reserveGenerationStream(
  upstreamBody: ReadableStream<Uint8Array>,
  reservation: ApplicationGenerationReservation | undefined,
) {
  if (reservation === undefined) return upstreamBody;
  return createReservedGenerationStream(upstreamBody, reservation);
}

type GenerationRateLimit = (clientFingerprint: string) => number | undefined;
type GenerationApplicationLimit = (
  sessionId: string,
) => ApplicationGenerationReservation | undefined;
type GenerationDatabase = () => Database;

type ApplicationReservationResult = {
  limited: boolean;
  reservation: ApplicationGenerationReservation | undefined;
};

function rejectInvalidClientSignal(request: Request): Response | undefined {
  if (request.headers.has(VERIFIED_SESSION_HEADER) && !hasValidClientDeviceSignal(request)) {
    return errorResponse(400, 'invalid_client_signal', 'Client device signal rejected.');
  }
  return undefined;
}

function rejectRateLimited(
  clientFingerprint: string,
  rateLimit: GenerationRateLimit | undefined,
  database: GenerationDatabase | undefined,
): Response | undefined {
  let activeRateLimit = rateLimit;
  if (activeRateLimit === undefined) {
    if (database === undefined) {
      throw new Error('A database connection is required for generation limits.');
    }
    activeRateLimit = createGenerationRateLimiter(
      undefined,
      undefined,
      undefined,
      undefined,
      database,
    );
  }
  const retryAfter = activeRateLimit(clientFingerprint);
  if (retryAfter === undefined) return undefined;
  return errorResponse(
    429,
    'rate_limited',
    'Too many generation requests. Please try again later.',
    { 'retry-after': String(retryAfter) },
  );
}

function resolveApplicationReservation(
  sessionId: string | null,
  applicationLimit: GenerationApplicationLimit | undefined,
  database: GenerationDatabase | undefined,
): ApplicationReservationResult {
  if (sessionId === null) return { limited: false, reservation: undefined };
  let limiter = applicationLimit;
  if (limiter === undefined) {
    if (database === undefined) {
      throw new Error('A database connection is required for generation limits.');
    }
    limiter = createApplicationGenerationLimiter(undefined, undefined, database);
  }
  const reservation = limiter(sessionId);
  if (reservation === undefined) return { limited: true, reservation: undefined };
  return { limited: false, reservation };
}

function getUpstreamEventStream(upstream: Response): ReadableStream<Uint8Array> | undefined {
  if (!upstream.body) return undefined;
  const contentType = upstream.headers.get('content-type');
  if (!contentType) return undefined;
  if (!contentType.toLowerCase().includes('text/event-stream')) return undefined;
  return upstream.body;
}

export async function handleGenerateRequest(
  request: Request,
  generate: typeof requestGeneration = requestGeneration,
  rateLimit?: GenerationRateLimit,
  applicationLimit?: GenerationApplicationLimit,
  database?: GenerationDatabase,
) {
  const parsed = v.safeParse(
    v.pipe(v.string(), v.parseJson(), createGenerationRequestSchema(getGenerationFieldLimits())),
    await request.text(),
  );
  if (!parsed.success) {
    const malformedJson = parsed.issues.some((issue) => issue.type === 'parse_json');
    return errorResponse(
      400,
      'invalid_request',
      malformedJson
        ? 'The request body must be valid JSON.'
        : 'Please complete all fields within their limits.',
    );
  }

  const invalidSignal = rejectInvalidClientSignal(request);
  if (invalidSignal) return invalidSignal;

  const rateLimited = rejectRateLimited(getClientFingerprint(request), rateLimit, database);
  if (rateLimited) return rateLimited;

  const sessionId = request.headers.get(VERIFIED_SESSION_HEADER);
  const applicationReservation = resolveApplicationReservation(
    sessionId,
    applicationLimit,
    database,
  );
  if (applicationReservation.limited) {
    return errorResponse(
      429,
      'application_limit_reached',
      'The application generation limit has been reached.',
    );
  }
  const reservation = applicationReservation.reservation;

  let upstream: Response;
  try {
    upstream = await generate(parsed.output, { signal: request.signal });
  } catch (error) {
    reservation?.release();
    if (error instanceof GenerationRequestError) {
      return errorResponse(400, 'invalid_request', error.message);
    }
    return errorResponse(502, 'generation_unavailable', 'The generation service is unavailable.');
  }

  if (!upstream.ok) {
    reservation?.release();
    return createUpstreamErrorResponse(upstream);
  }

  const streamBody = getUpstreamEventStream(upstream);
  if (!streamBody) {
    reservation?.release();
    return errorResponse(
      502,
      'invalid_stream',
      'The generation service returned no stream.',
      getDiagnosticHeaders(upstream),
    );
  }

  return new Response(reserveGenerationStream(streamBody, reservation), {
    status: 200,
    headers: {
      'cache-control': 'no-cache, no-store',
      connection: 'keep-alive',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-accel-buffering': 'no',
      'x-generation-inactivity-timeout-ms': String(getGenerationInactivityTimeoutMs()),
    },
  });
}
