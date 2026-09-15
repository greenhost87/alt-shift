import { afterEach, expect, jest, test } from 'bun:test';
import { GenerationError, generateApplication } from '../../src/system/generation/client';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
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

test('keeps structured rate-limit metadata from the response', async () => {
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  globalThis.fetch = (() =>
    Promise.resolve(
      Response.json(
        { error: { code: 'rate_limited', message: 'Please wait before trying again.' } },
        { status: 429, headers: { 'retry-after': '12' } },
      ),
    )) as typeof fetch;

  try {
    await generateApplication(request, { onDelta() {} });
    throw new Error('Expected generation to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(GenerationError);
    expect(error).toMatchObject({
      code: 'rate_limited',
      message: 'Please wait before trying again.',
      retryAfter: Date.parse('2026-01-01T00:00:12Z'),
    });
  }
});

test('accepts a future HTTP date for rate-limit retry metadata', async () => {
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  globalThis.fetch = (() =>
    Promise.resolve(
      Response.json(
        { error: { code: 'rate_limited', message: 'Please wait.' } },
        {
          status: 429,
          headers: { 'retry-after': 'Thu, 01 Jan 2026 00:00:12 GMT' },
        },
      ),
    )) as typeof fetch;

  await expect(generateApplication(request, { onDelta() {} })).rejects.toMatchObject({
    code: 'rate_limited',
    retryAfter: Date.parse('2026-01-01T00:00:12Z'),
  });
});

test('does not set retry metadata for absent or invalid Retry-After values', async () => {
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));

  for (const retryAfter of [
    undefined,
    'not-a-delay',
    '0x10',
    '1.5',
    '-1',
    'Wed, 31 Dec 2025 23:59:59 GMT',
  ]) {
    const headers = new Headers();
    if (retryAfter !== undefined) headers.set('retry-after', retryAfter);
    globalThis.fetch = (() =>
      Promise.resolve(
        Response.json(
          { error: { code: 'rate_limited', message: 'Please wait.' } },
          { status: 429, headers },
        ),
      )) as typeof fetch;

    await expect(generateApplication(request, { onDelta() {} })).rejects.toMatchObject({
      code: 'rate_limited',
      retryAfter: undefined,
    });
  }
});

test('aborts a hung stream when the caller cancels', async () => {
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        new ReadableStream({
          start() {
            // Remain pending until generateApplication cancels the reader.
          },
        }),
        { headers: { 'content-type': 'text/event-stream' } },
      ),
    )) as typeof fetch;
  const controller = new AbortController();
  const generation = generateApplication(request, {
    signal: controller.signal,
    onDelta() {},
  });

  controller.abort();

  await expect(generation).rejects.toHaveProperty('name', 'AbortError');
});

test('times out after 30 seconds without another result', async () => {
  jest.useFakeTimers();
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        new ReadableStream({
          start() {
            // The inactivity timer is responsible for ending this stream.
          },
        }),
        { headers: { 'content-type': 'text/event-stream' } },
      ),
    )) as typeof fetch;
  const generation = generateApplication(request, { onDelta() {} });
  await Promise.resolve();

  jest.advanceTimersByTime(30_000);
  await Promise.resolve();

  await expect(generation).rejects.toMatchObject({ code: 'timeout' });
});
