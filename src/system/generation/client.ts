import * as v from 'valibot';
import type { GenerationRequest } from './schema';

const INACTIVITY_TIMEOUT_MS = 30_000;

type GenerateOptions = {
  signal?: AbortSignal;
  onOpen?: () => void;
  onDelta: (delta: string) => void;
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

function createEventParser(onDelta: (delta: string) => void) {
  let event = 'message';
  let data: string[] = [];
  let isFirstLine = true;
  let hasPendingEvent = false;

  return {
    parseLine(line: string) {
      if (isFirstLine) {
        line = line.replace(/^\uFEFF/, '');
        isFirstLine = false;
      }

      if (line === '') {
        if (event === 'delta' && data.length > 0) onDelta(data.join('\n'));
        event = 'message';
        data = [];
        hasPendingEvent = false;
        return;
      }
      if (line.startsWith(':')) return;

      const separator = line.indexOf(':');
      const field = separator === -1 ? line : line.slice(0, separator);
      let value = separator === -1 ? '' : line.slice(separator + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'event') {
        event = value;
        hasPendingEvent = true;
      }
      if (field === 'data') {
        data.push(value);
        hasPendingEvent = true;
      }
    },
    hasPendingEvent() {
      return hasPendingEvent;
    },
  };
}

const ErrorResponseSchema = v.object({
  error: v.object({
    code: v.optional(v.string()),
    message: v.optional(v.string()),
  }),
});

async function readError(response: Response) {
  const fallback = {
    message: 'The application could not be generated. Please try again.',
    code: response.status === 429 ? 'rate_limited' : 'generation_failed',
  };
  const parsed = v.safeParse(
    v.pipe(v.string(), v.parseJson(), ErrorResponseSchema),
    await response.text(),
  );
  if (!parsed.success) return fallback;
  return {
    code: parsed.output.error.code ?? fallback.code,
    message: parsed.output.error.message ?? fallback.message,
  };
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

type EventParser = {
  parseLine: (line: string) => void;
  hasPendingEvent: () => boolean;
};

type InactivityTimer = {
  clear: () => void;
  reset: () => void;
};

function createInactivityTimer(controller: AbortController): InactivityTimer {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return {
    clear() {
      clearTimeout(timeout);
    },
    reset() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        controller.abort('inactivity-timeout');
      }, INACTIVITY_TIMEOUT_MS);
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

async function requestGenerationStream(request: GenerationRequest, signal: AbortSignal) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
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
  if (!response.body) {
    throw new GenerationError('The generation stream was unavailable.', 'invalid_stream');
  }
  return response.body;
}

async function readWithAbort(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
) {
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

function parseBufferedLines(buffer: string, done: boolean, parser: EventParser) {
  let offset = 0;
  while (offset < buffer.length) {
    const lineEnd = buffer.slice(offset).search(/[\r\n]/);
    if (lineEnd === -1) break;

    const end = offset + lineEnd;
    if (buffer[end] === '\r' && end + 1 === buffer.length && !done) break;

    parser.parseLine(buffer.slice(offset, end));
    offset = end + (buffer[end] === '\r' && buffer[end + 1] === '\n' ? 2 : 1);
  }
  return buffer.slice(offset);
}

function finishEventStream(buffer: string, parser: EventParser) {
  if (buffer.length > 0) parser.parseLine(buffer);
  if (parser.hasPendingEvent()) {
    throw new GenerationError(
      'The generation stream ended before the final event completed.',
      'incomplete_stream',
    );
  }
}

async function consumeEventStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
  parser: EventParser,
) {
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await readWithAbort(reader, signal);
    buffer += decoder.decode(value, { stream: !done });
    buffer = parseBufferedLines(buffer, done, parser);
    if (!done) continue;
    finishEventStream(buffer, parser);
    return;
  }
}

function rethrowGenerationError(error: Error, controller: AbortController): never {
  if (error instanceof GenerationError || controller.signal.aborted) throw error;
  throw new GenerationError('The application could not be generated. Please try again.');
}

export async function generateApplication(
  request: GenerationRequest,
  { signal, onOpen, onDelta }: GenerateOptions,
): Promise<void> {
  const controller = new AbortController();
  const unlinkCallerSignal = linkCallerSignal(controller, signal);
  const timer = createInactivityTimer(controller);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  timer.reset();

  try {
    const stream = await requestGenerationStream(request, controller.signal);
    onOpen?.();
    reader = stream.getReader();
    const parser = createEventParser((delta) => {
      timer.reset();
      onDelta(delta);
    });
    await consumeEventStream(reader, controller.signal, parser);
  } catch (error) {
    if (controller.signal.reason === 'inactivity-timeout') {
      throw new GenerationError(
        'Generation timed out after 30 seconds without a response. Please try again.',
        'timeout',
      );
    }
    rethrowGenerationError(v.parse(v.instance(Error), error), controller);
  } finally {
    timer.clear();
    unlinkCallerSignal();
    if (controller.signal.aborted) await reader?.cancel().catch(() => undefined);
    reader?.releaseLock();
  }
}
