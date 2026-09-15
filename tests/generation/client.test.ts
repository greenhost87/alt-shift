import { afterEach, expect, test } from 'bun:test';
import { generateApplication } from '../../src/system/generation/client';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const request = {
  jobTitle: 'Engineer',
  company: 'Variant',
  strengths: 'TypeScript',
  details: 'Relevant details',
};

function respondWithChunks(chunks: Uint8Array[]) {
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        new ReadableStream({
          start(controller) {
            for (const chunk of chunks) controller.enqueue(chunk);
            controller.close();
          },
        }),
        { headers: { 'content-type': 'text/event-stream' } },
      ),
    )) as typeof fetch;
}

test('collects delta events across arbitrary byte chunks', async () => {
  const bytes = new TextEncoder().encode('event: delta\r\ndata: Hello 🌍\r\n\r\nevent: delta\ndata: !\n\n');
  const split = bytes.indexOf(0xf0) + 2;
  respondWithChunks([bytes.slice(0, split), bytes.slice(split)]);

  let letter = '';
  await generateApplication(request, { onDelta: (delta) => (letter += delta) });

  expect(letter).toBe('Hello 🌍!');
});

test('handles mixed SSE line endings and rejects an unterminated event', async () => {
  const encoder = new TextEncoder();
  respondWithChunks([
    encoder.encode('event: delta\ndata: first\n\r'),
    encoder.encode('\nevent: delta\rdata: second\r\n\revent: delta\ndata: incomplete'),
  ]);

  const deltas: string[] = [];
  await expect(
    generateApplication(request, { onDelta: (delta) => deltas.push(delta) }),
  ).rejects.toThrow('The generation stream ended before the final event completed.');

  expect(deltas).toEqual(['first', 'second']);
});
