import { createParser } from 'eventsource-parser';
import * as v from 'valibot';
import * as m from '../../paraglide/messages.js';
import { getBrowserCsrfToken, CSRF_HEADER } from '../security/session';
import { getClientDeviceSignal } from './device-signal';
import { createEventStreamCompletionTracker } from './event-stream';
import type { GenerationRequest } from './schema';

const generationDeltaSchema = v.strictObject({ text: v.string() });
const inactivityTimeoutSchema = v.pipe(
  v.string(),
  v.regex(/^\d+$/),
  v.transform(Number),
  v.safeInteger(),
  v.minValue(1),
);
const errorResponseSchema = v.strictObject({
  error: v.strictObject({
    code: v.optional(v.string()),
    message: v.optional(v.string()),
  }),
});

type GenerateOptions = {
  endpoint?: string | undefined;
  signal?: AbortSignal;
  onOpen?: () => void;
  onDelta: (delta: string) => void;
};

type InactivityTimer = {
  clear: () => void;
  reset: () => void;
};

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

async function readError(response: Response) {
  const fallbackCode = response.status === 429 ? 'rate_limited' : 'generation_failed';
  const parsed = v.safeParse(
    v.pipe(v.string(), v.parseJson(), errorResponseSchema),
    await response.text(),
  );
  const code = parsed.success ? (parsed.output.error.code ?? fallbackCode) : fallbackCode;
  return { code, message: getGenerationErrorMessage(code) };
}

function parseRetryAfter(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) {
    const deadline = now + Number(value) * 1_000;
    return Number.isSafeInteger(deadline) ? deadline : undefined;
  }

  const date = Date.parse(value);
  const isHttpDate = Number.isFinite(date) && new Date(date).toUTCString() === value;
  return isHttpDate && date > now ? date : undefined;
}

function createInactivityTimer(
  controller: AbortController,
  inactivityTimeoutMs: number,
): InactivityTimer {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return {
    clear() {
      clearTimeout(timeout);
    },
    reset() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        controller.abort('inactivity-timeout');
      }, inactivityTimeoutMs);
    },
  };
}

function linkCallerSignal(controller: AbortController, signal: AbortSignal | undefined) {
  const abortFromCaller = () => {
    controller.abort(new DOMException('Aborted', 'AbortError'));
  };
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });
  return () => signal?.removeEventListener('abort', abortFromCaller);
}

async function requestGenerationStream(
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

async function readWithAbort(reader: ReadableStreamDefaultReader<Uint8Array>, signal: AbortSignal) {
  let rejectForAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    rejectForAbort = () => {
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.throwIfAborted();
    signal.addEventListener('abort', rejectForAbort, { once: true });
  });
  return Promise.race([reader.read(), aborted]).finally(() => {
    signal.removeEventListener('abort', rejectForAbort);
  });
}

function parseDelta(data: string) {
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), generationDeltaSchema), data);
  if (!parsed.success) {
    throw new GenerationError(m.generation_event_invalid(), 'invalid_stream');
  }
  return parsed.output.text;
}

async function consumeEventStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
  onDelta: (delta: string) => void,
) {
  const decoder = new TextDecoder();
  const completion = createEventStreamCompletionTracker();
  const parser = createParser({
    onEvent(event) {
      if (event.event === 'delta') onDelta(parseDelta(event.data));
    },
  });

  for (;;) {
    const { value, done } = await readWithAbort(reader, signal);
    const chunk = decoder.decode(value, { stream: !done });
    completion.feed(chunk);
    parser.feed(chunk);
    if (!done) continue;
    if (completion.hasIncompleteEvent()) {
      throw new GenerationError(m.generation_stream_incomplete(), 'incomplete_stream');
    }
    return;
  }
}

function rethrowGenerationError(error: Error, controller: AbortController): never {
  if (error instanceof GenerationError || controller.signal.aborted) throw error;
  throw new GenerationError(m.application_generation_failed());
}

export async function generateApplication(
  request: GenerationRequest,
  { endpoint = '/api/generate', signal, onOpen, onDelta }: GenerateOptions,
): Promise<void> {
  const controller = new AbortController();
  const unlinkCallerSignal = linkCallerSignal(controller, signal);
  let inactivityTimeoutMs: number | undefined;
  let timer: InactivityTimer | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const stream = await requestGenerationStream(request, controller.signal, endpoint);
    inactivityTimeoutMs = stream.inactivityTimeoutMs;
    const inactivityTimer = createInactivityTimer(controller, inactivityTimeoutMs);
    timer = inactivityTimer;
    inactivityTimer.reset();
    onOpen?.();
    reader = stream.body.getReader();
    await consumeEventStream(reader, controller.signal, (delta) => {
      inactivityTimer.reset();
      onDelta(delta);
    });
  } catch (error) {
    if (controller.signal.reason === 'inactivity-timeout') {
      throw new GenerationError(
        m.generation_timeout({
          seconds: Math.ceil((inactivityTimeoutMs ?? 0) / 1_000),
        }),
        'timeout',
      );
    }
    rethrowGenerationError(v.parse(v.instance(Error), error), controller);
  } finally {
    timer?.clear();
    unlinkCallerSignal();
    if (controller.signal.aborted) await reader?.cancel().catch(() => undefined);
    reader?.releaseLock();
  }
}
