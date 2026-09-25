import { createParser } from 'eventsource-parser';
import * as v from 'valibot';
import * as m from '../../paraglide/messages.js';
import { GenerationError } from './errors';
import { createEventStreamCompletionTracker } from './event-stream';

const generationDeltaSchema = v.looseObject({ text: v.string() });

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

export async function consumeEventStream(
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
