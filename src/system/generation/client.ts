import type { GenerationRequest } from './schema';

const INACTIVITY_TIMEOUT_MS = 30_000;

type GenerateOptions = {
  signal?: AbortSignal;
  onOpen?: () => void;
  onDelta: (delta: string) => void;
};

export class GenerationError extends Error {
  constructor(
    message: string,
    public readonly code = 'generation_failed',
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'GenerationError';
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

async function readError(response: Response) {
  let message = 'The application could not be generated. Please try again.';
  let code = response.status === 429 ? 'rate_limited' : 'generation_failed';
  try {
    const body = (await response.json()) as { error?: { code?: unknown; message?: unknown } };
    if (typeof body.error?.message === 'string') message = body.error.message;
    if (typeof body.error?.code === 'string') code = body.error.code;
  } catch {
    // The endpoint may have failed before it could create a normalized response.
  }
  return { code, message };
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

export async function generateApplication(
  request: GenerationRequest,
  { signal, onOpen, onDelta }: GenerateOptions,
): Promise<void> {
  const controller = new AbortController();
  let timedOut = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });

  const resetTimeout = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, INACTIVITY_TIMEOUT_MS);
  };
  resetTimeout();

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify(request),
      signal: controller.signal,
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

    onOpen?.();
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = createEventParser((delta) => {
      resetTimeout();
      onDelta(delta);
    });
    let buffer = '';

    while (true) {
      let rejectForAbort: (() => void) | undefined;
      const aborted = new Promise<never>((_, reject) => {
        rejectForAbort = () =>
          reject(controller.signal.reason ?? new DOMException('Aborted', 'AbortError'));
        if (controller.signal.aborted) rejectForAbort();
        else controller.signal.addEventListener('abort', rejectForAbort, { once: true });
      });
      const { value, done } = await Promise.race([reader.read(), aborted]).finally(() => {
        if (rejectForAbort) controller.signal.removeEventListener('abort', rejectForAbort);
      });
      buffer += decoder.decode(value, { stream: !done });

      let offset = 0;
      while (offset < buffer.length) {
        const lineEnd = buffer.slice(offset).search(/[\r\n]/);
        if (lineEnd === -1) break;

        const end = offset + lineEnd;
        if (buffer[end] === '\r' && end + 1 === buffer.length && !done) break;

        parser.parseLine(buffer.slice(offset, end));
        offset = end + (buffer[end] === '\r' && buffer[end + 1] === '\n' ? 2 : 1);
      }
      buffer = buffer.slice(offset);

      if (done) {
        if (buffer.length > 0) parser.parseLine(buffer);
        if (parser.hasPendingEvent()) {
          throw new GenerationError(
            'The generation stream ended before the final event completed.',
            'incomplete_stream',
          );
        }
        break;
      }
    }
  } catch (error) {
    if (timedOut) {
      throw new GenerationError(
        'Generation timed out after 30 seconds without a response. Please try again.',
        'timeout',
      );
    }
    if (error instanceof GenerationError || controller.signal.aborted) throw error;
    throw new GenerationError('The application could not be generated. Please try again.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
    if (controller.signal.aborted) await reader?.cancel().catch(() => undefined);
    reader?.releaseLock();
  }
}
