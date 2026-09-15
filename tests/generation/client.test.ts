import { afterEach, expect, jest, test } from 'bun:test';
import { GenerationError, generateApplication } from '../../src/system/generation/client';
import generationFixtures from '../fixtures/generation.json' with { type: 'json' };

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
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () =>
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
    ) });
}

test('collects delta events across arbitrary byte chunks', async () => {
  const bytes = new TextEncoder().encode(generationFixtures.unicodeStream);
  const split = bytes.indexOf(0xf0) + 2;
  respondWithChunks([bytes.slice(0, split), bytes.slice(split)]);

  let letter = '';
  await generateApplication(request, {
    onDelta: (delta) => {
      letter += delta;
    },
  });

  expect(letter).toBe(generationFixtures.unicodeLetter);
});

test('handles mixed SSE line endings and rejects an unterminated event', () => {
  const encoder = new TextEncoder();
  respondWithChunks([
    encoder.encode(generationFixtures.mixedFirstChunk),
    encoder.encode(generationFixtures.mixedSecondChunk),
  ]);

  const deltas: string[] = [];
  const generation = generateApplication(request, {
    onDelta: (delta) => {
      deltas.push(delta);
    },
  }).then(() => 'completed');
  expect(generation).rejects.toThrow(
    'The generation stream ended before the final event completed.',
  );

  expect(deltas).toEqual(['first', 'second']);
});

test('keeps structured rate-limit metadata from the response', async () => {
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () =>
    Promise.resolve(
      Response.json(
        { error: { code: 'rate_limited', message: 'Please wait before trying again.' } },
        { status: 429, headers: { 'retry-after': '12' } },
      ),
    ) });

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

test('accepts a future HTTP date for rate-limit retry metadata', () => {
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () =>
    Promise.resolve(
      Response.json(
        { error: { code: 'rate_limited', message: 'Please wait.' } },
        {
          status: 429,
          headers: { 'retry-after': 'Thu, 01 Jan 2026 00:00:12 GMT' },
        },
      ),
    ) });

  const generation = generateApplication(request, { onDelta() {} }).then(() => 'completed');
  expect(generation).rejects.toMatchObject({
    code: 'rate_limited',
    retryAfter: Date.parse('2026-01-01T00:00:12Z'),
  });
});

test('does not set retry metadata for absent or invalid Retry-After values', () => {
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
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () =>
      Promise.resolve(
        Response.json(
          { error: { code: 'rate_limited', message: 'Please wait.' } },
          { status: 429, headers },
        ),
      ) });

    const generation = generateApplication(request, { onDelta() {} }).then(() => 'completed');
    expect(generation).rejects.toMatchObject({
      code: 'rate_limited',
      retryAfter: undefined,
    });
  }
});

test('normalizes transport failures while preserving API errors', () => {
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () => Promise.reject(new TypeError('Failed to fetch')) });

  const transportGeneration = generateApplication(request, { onDelta() {} }).then(
    () => 'completed',
  );
  expect(transportGeneration).rejects.toMatchObject({
    name: 'GenerationError',
    code: 'generation_failed',
    message: 'The application could not be generated. Please try again.',
  });

  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () =>
    Promise.resolve(
      Response.json(
        {
          error: {
            code: 'service_unavailable',
            message: 'Generation is temporarily unavailable.',
          },
        },
        { status: 503 },
      ),
    ) });

  const serviceGeneration = generateApplication(request, { onDelta() {} }).then(
    () => 'completed',
  );
  expect(serviceGeneration).rejects.toMatchObject({
    name: 'GenerationError',
    code: 'service_unavailable',
    message: 'Generation is temporarily unavailable.',
  });
});

test('aborts a hung stream when the caller cancels', () => {
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () =>
    Promise.resolve(
      new Response(
        new ReadableStream({
          start() {
            // Remain pending until generateApplication cancels the reader.
          },
        }),
        { headers: { 'content-type': 'text/event-stream' } },
      ),
    ) });
  const controller = new AbortController();
  const generation = generateApplication(request, {
    signal: controller.signal,
    onDelta() {},
  }).then(() => 'completed');

  controller.abort();

  expect(generation).rejects.toHaveProperty('name', 'AbortError');
});

test('times out after 30 seconds without another result', async () => {
  jest.useFakeTimers();
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () =>
    Promise.resolve(
      new Response(
        new ReadableStream({
          start() {
            // The inactivity timer is responsible for ending this stream.
          },
        }),
        { headers: { 'content-type': 'text/event-stream' } },
      ),
    ) });
  const generation = generateApplication(request, { onDelta() {} }).then(() => 'completed');
  await Promise.resolve();

  jest.advanceTimersByTime(30_000);
  await Promise.resolve();

  expect(generation).rejects.toMatchObject({ code: 'timeout' });
});
