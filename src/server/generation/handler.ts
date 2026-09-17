import * as v from 'valibot';
import { getGenerationFieldLimits } from '../config/application';
import { createGenerationRequestSchema } from '../../system/generation/schema';
import { getClientFingerprint, hasValidClientDeviceSignal } from './client-fingerprint';
import { GenerationRequestError, requestGeneration } from './client';
import { getGenerationInactivityTimeoutMs } from './config';
import { createGenerationRateLimiter } from './rate-limit';
import { VERIFIED_SESSION_HEADER } from '../../system/security/session';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const takeGenerationSlot = createGenerationRateLimiter();
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

export async function handleGenerateRequest(
  request: Request,
  generate: typeof requestGeneration = requestGeneration,
  rateLimit: (clientFingerprint: string) => number | undefined = takeGenerationSlot,
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

  const retryAfter = rateLimit(getClientFingerprint(request));
  if (retryAfter !== undefined) {
    return errorResponse(
      429,
      'rate_limited',
      'Too many generation requests. Please try again later.',
      { 'retry-after': String(retryAfter) },
    );
  }

  let upstream: Response;
  try {
    upstream = await generate(parsed.output, { signal: request.signal });
  } catch (error) {
    if (error instanceof GenerationRequestError) {
      return errorResponse(400, 'invalid_request', error.message);
    }
    return errorResponse(502, 'generation_unavailable', 'The generation service is unavailable.');
  }

  if (!upstream.ok) return createUpstreamErrorResponse(upstream);

  if (
    !upstream.body ||
    !upstream.headers.get('content-type')?.toLowerCase().includes('text/event-stream')
  ) {
    return errorResponse(
      502,
      'invalid_stream',
      'The generation service returned no stream.',
      getDiagnosticHeaders(upstream),
    );
  }

  return new Response(upstream.body, {
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
