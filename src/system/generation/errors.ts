import * as v from 'valibot';
import * as m from '../../paraglide/messages.js';

const errorResponseSchema = v.strictObject({
  error: v.strictObject({
    code: v.optional(v.string()),
    message: v.optional(v.string()),
  }),
});

export class GenerationError extends Error {
  readonly code: string;
  readonly retryAfter: number | undefined;

  constructor(message: string, code = 'generation_failed', retryAfter?: number) {
    super(message);
    this.name = 'GenerationError';
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export class GenerationTimeoutError extends GenerationError {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message, 'timeout');
    this.name = 'GenerationTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

function getGenerationErrorMessage(code: string) {
  if (code === 'rate_limited') return m.generation_rate_limited();
  if (code === 'application_limit_reached') {
    return m.generation_application_limit_reached();
  }
  if (code === 'invalid_request') return m.generation_invalid_request();
  if (code === 'generation_unavailable' || code === 'upstream_error') {
    return m.generation_unavailable();
  }
  return m.application_generation_failed();
}

export async function readError(response: Response) {
  const fallbackCode = response.status === 429 ? 'rate_limited' : 'generation_failed';
  const parsed = v.safeParse(
    v.pipe(v.string(), v.parseJson(), errorResponseSchema),
    await response.text(),
  );
  const code = parsed.success ? (parsed.output.error.code ?? fallbackCode) : fallbackCode;
  return { code, message: getGenerationErrorMessage(code) };
}

export function parseRetryAfter(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) {
    const deadline = now + Number(value) * 1_000;
    return Number.isSafeInteger(deadline) ? deadline : undefined;
  }

  const date = Date.parse(value);
  const isHttpDate = Number.isFinite(date) && new Date(date).toUTCString() === value;
  return isHttpDate && date > now ? date : undefined;
}
