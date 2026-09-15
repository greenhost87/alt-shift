import type { GenerationRequest } from './schema';

type GenerateOptions = {
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
};

export class GenerationError extends Error {
  constructor(message: string) {
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
  try {
    const body = (await response.json()) as { error?: { message?: unknown } };
    if (typeof body.error?.message === 'string') return body.error.message;
  } catch {
    // The endpoint may have failed before it could create a normalized response.
  }
  return 'The application could not be generated. Please try again.';
}

export async function generateApplication(
  request: GenerationRequest,
  { signal, onDelta }: GenerateOptions,
): Promise<void> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) throw new GenerationError(await readError(response));
  if (!response.body) throw new GenerationError('The generation stream was unavailable.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createEventParser(onDelta);
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
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
        throw new GenerationError('The generation stream ended before the final event completed.');
      }
      break;
    }
  }
}
