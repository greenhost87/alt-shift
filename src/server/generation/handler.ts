import * as v from 'valibot';
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
const takeApplicationGenerationSlot = createApplicationGenerationLimiter();
const takeGenerationRateLimitSlot = createGenerationRateLimiter();
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

export async function handleGenerateRequest(
  request: Request,
  generate: typeof requestGeneration = requestGeneration,
  rateLimit: (clientFingerprint: string) => number | undefined = takeGenerationRateLimitSlot,
  applicationLimit: (
    sessionId: string,
  ) => ApplicationGenerationReservation | undefined = takeApplicationGenerationSlot,
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

  if (request.headers.has(VERIFIED_SESSION_HEADER) && !hasValidClientDeviceSignal(request)) {
    return errorResponse(400, 'invalid_client_signal', 'Client device signal rejected.');
  }

  const clientFingerprint = getClientFingerprint(request);
  const retryAfter = rateLimit(clientFingerprint);
  if (retryAfter !== undefined) {
    return errorResponse(
      429,
      'rate_limited',
      'Too many generation requests. Please try again later.',
      { 'retry-after': String(retryAfter) },
    );
  }

  const sessionId = request.headers.get(VERIFIED_SESSION_HEADER);
  const reservation = sessionId === null ? undefined : applicationLimit(sessionId);
  if (sessionId !== null && reservation === undefined) {
    return errorResponse(
      429,
      'application_limit_reached',
      'The application generation limit has been reached.',
    );
  }

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

  if (
    !upstream.body ||
    !upstream.headers.get('content-type')?.toLowerCase().includes('text/event-stream')
  ) {
    reservation?.release();
    return errorResponse(
      502,
      'invalid_stream',
      'The generation service returned no stream.',
      getDiagnosticHeaders(upstream),
    );
  }

  return new Response(reserveGenerationStream(upstream.body, reservation), {
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
