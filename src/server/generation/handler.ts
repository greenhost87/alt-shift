import * as v from 'valibot';
import { generationRequestSchema } from '../../system/generation/schema';
import { requestGeneration } from './client';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

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

export async function handleGenerateRequest(
  request: Request,
  generate: typeof requestGeneration = requestGeneration,
) {
  const parsed = v.safeParse(
    v.pipe(v.string(), v.parseJson(), generationRequestSchema),
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

  let upstream: Response;
  try {
    upstream = await generate(parsed.output, { signal: request.signal });
  } catch {
    return errorResponse(502, 'generation_unavailable', 'The generation service is unavailable.');
  }

  if (!upstream.ok) {
    const retryAfter = upstream.headers.get('retry-after');
    return errorResponse(
      upstream.status === 429 ? 429 : 502,
      upstream.status === 429 ? 'rate_limited' : 'generation_failed',
      upstream.status === 429
        ? 'Too many generation requests. Please try again later.'
        : 'The generation service could not complete the request.',
      retryAfter ? { 'retry-after': retryAfter } : undefined,
    );
  }

  if (
    !upstream.body ||
    !upstream.headers.get('content-type')?.toLowerCase().includes('text/event-stream')
  ) {
    return errorResponse(502, 'invalid_stream', 'The generation service returned no stream.');
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/event-stream; charset=utf-8',
    },
  });
}
