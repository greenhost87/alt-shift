import * as v from 'valibot';
import * as m from '../../paraglide/messages.js';
import { CSRF_HEADER, getBrowserCsrfToken } from '../security/session';
import { getClientDeviceSignal } from './device-signal';
import { GenerationError, parseRetryAfter, readError } from './errors';
import type { GenerationRequest } from './schema';

const inactivityTimeoutSchema = v.pipe(
  v.string(),
  v.regex(/^\d+$/),
  v.transform(Number),
  v.safeInteger(),
  v.minValue(1),
);

export async function requestGenerationStream(
  request: GenerationRequest,
  signal: AbortSignal,
  endpoint: string,
) {
  const deviceSignal = await getClientDeviceSignal();
  const csrfToken = getBrowserCsrfToken();
  const headers = new Headers({
    'content-type': 'application/json',
    accept: 'text/event-stream',
    'x-client-device-signals': deviceSignal,
  });
  if (csrfToken !== undefined) headers.set(CSRF_HEADER, csrfToken);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) {
    const error = await readError(response);
    throw new GenerationError(
      error.message,
      error.code,
      error.code === 'rate_limited'
        ? parseRetryAfter(response.headers.get('retry-after'))
        : undefined,
    );
  }
  if (
    !response.body ||
    !response.headers.get('content-type')?.toLowerCase().includes('text/event-stream')
  ) {
    throw new GenerationError(m.generation_stream_unavailable(), 'invalid_stream');
  }
  const parsedTimeout = v.safeParse(
    inactivityTimeoutSchema,
    response.headers.get('x-generation-inactivity-timeout-ms'),
  );
  if (!parsedTimeout.success) {
    throw new GenerationError(m.generation_stream_invalid_config(), 'invalid_stream');
  }
  return { body: response.body, inactivityTimeoutMs: parsedTimeout.output };
}
