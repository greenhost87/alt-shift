import { serve, sleep } from 'bun';
import { afterAll, describe, expect, test } from 'bun:test';
import {
  getGenerationFieldLimits,
  getGenerationSystemPrompt,
} from '../../src/server/config/application';
import { requestGeneration } from '../../src/server/generation/client';
import { handleGenerateRequest } from '../../src/server/generation/handler';
import { createGenerationRateLimiter } from '../../src/server/generation/rate-limit';
import { buildGenerationPrompt } from '../../src/server/generation/prompt';
import { safeParseGenerationRequest } from '../../src/system/generation/schema';
import generationFixtures from '../fixtures/generation.json' with { type: 'json' };

const input = {
  jobTitle: 'Product manager',
  company: 'Variant',
  strengths: 'Clear communication',
  details: 'I ship useful products.',
  locale: 'en' as const,
};

let receivedAccept = '';
let receivedAuthorization = '';
let receivedBody = '';
let receivedContentType = '';
let receivedMethod = '';
let releaseStreamingResponse = () => {};
let upstreamCompleted = false;
const server = serve({
  port: 0,
  async fetch(request) {
    receivedAccept = request.headers.get('accept') ?? '';
    receivedAuthorization = request.headers.get('authorization') ?? '';
    receivedContentType = request.headers.get('content-type') ?? '';
    receivedMethod = request.method;
    receivedBody = await request.text();

    if (new URL(request.url).pathname === '/stream') {
      const release = new Promise<void>((resolve) => {
        releaseStreamingResponse = resolve;
      });
      upstreamCompleted = false;
      return new Response(
        new ReadableStream({
          async start(controller) {
            controller.enqueue(new TextEncoder().encode(generationFixtures.firstServerStream));
            await release;
            controller.enqueue(new TextEncoder().encode(generationFixtures.secondServerStream));
            upstreamCompleted = true;
            controller.close();
          },
        }),
        { headers: { 'content-type': 'text/event-stream' } },
      );
    }

    return new Response(generationFixtures.helloServerStream, {
      headers: { 'content-type': 'text/event-stream' },
    });
  },
});
const serverPort = server.port;
if (serverPort === undefined) throw new Error('The test server did not bind to a port.');

afterAll(async () => server.stop());

describe('generation server contract', () => {
  test('rejects malformed, incomplete, and over-limit structured input', async () => {
    const fieldLimits = getGenerationFieldLimits();
    expect(safeParseGenerationRequest({ ...input, company: '' }, fieldLimits).success).toBe(false);
    expect(
      safeParseGenerationRequest({ ...input, details: 'x'.repeat(1_201) }, fieldLimits).success,
    ).toBe(false);

    const malformedResponse = await handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: '{',
      }),
    );
    expect(malformedResponse.status).toBe(400);
    expect(await malformedResponse.json()).toEqual(generationFixtures.invalidJsonError);

    const response = await handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({ ...input, company: '' }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(generationFixtures.invalidFieldsError);

    const unsupportedLocaleResponse = await handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({ ...input, locale: 'de' }),
      }),
    );
    expect(unsupportedLocaleResponse.status).toBe(400);
    expect(await unsupportedLocaleResponse.json()).toEqual(generationFixtures.invalidFieldsError);
  });

  test('limits generation requests before calling the upstream service', async () => {
    let currentTime = 0;
    let upstreamCalls = 0;
    const rateLimit = createGenerationRateLimiter(() => currentTime);
    const generate = async () => {
      upstreamCalls += 1;
      return Promise.resolve(
        new Response(generationFixtures.helloServerStream, {
          headers: { 'content-type': 'text/event-stream' },
        }),
      );
    };

    for (let requestIndex = 0; requestIndex < 6; requestIndex += 1) {
      const response = await handleGenerateRequest(
        new Request('http://localhost/api/generate', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
        generate,
        rateLimit,
      );
      expect(response.status).toBe(200);
    }

    const limited = await handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      generate,
      rateLimit,
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
    expect(await limited.json()).toEqual(generationFixtures.rateLimitError);
    expect(upstreamCalls).toBe(6);

    currentTime = 60_000;
    const available = await handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      generate,
      rateLimit,
    );
    expect(available.status).toBe(200);
    expect(upstreamCalls).toBe(7);
  });

  test('normalizes an upstream rate limit and preserves Retry-After', async () => {
    const response = await handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      async () =>
        Promise.resolve(new Response('limited', { status: 429, headers: { 'retry-after': '17' } })),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('17');
    expect(await response.json()).toEqual(generationFixtures.rateLimitError);
  });

  test('normalizes non-rate-limit upstream failures', async () => {
    const unavailable = await handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      async () => Promise.reject(new Error('connection failed')),
    );
    expect(unavailable.status).toBe(502);
    expect(await unavailable.json()).toEqual(generationFixtures.unavailableError);

    const failed = await handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      async () => Promise.resolve(new Response('internal details', { status: 500 })),
    );
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual(generationFixtures.failedError);
  });

  test('marks applicant values as untrusted prompt text', () => {
    const prompt = buildGenerationPrompt(input);
    expect(prompt).toStartWith('Write the response in English.');
    expect(prompt).toContain('<untrusted_applicant_input>');
    expect(prompt).toContain('Job title: Product manager');
    expect(buildGenerationPrompt({ ...input, locale: 'ru' })).toStartWith(
      'Write the response in Russian.',
    );
    expect(prompt).toContain('Company: Variant');
  });

  test('adds server bearer authentication and returns the upstream stream', async () => {
    const response = await requestGeneration(input, {
      token: 'server-secret',
      url: `http://127.0.0.1:${serverPort}/v1/generate`,
    });

    expect(receivedMethod).toBe('POST');
    expect(receivedAccept).toBe('text/event-stream');
    expect(receivedAuthorization).toBe('Bearer server-secret');
    expect(receivedContentType).toBe('application/json');
    expect(JSON.parse(receivedBody)).toEqual({
      system: getGenerationSystemPrompt(),
      prompt: buildGenerationPrompt(input),
      maxTokens: 1_500,
    });
    expect(await response.text()).toBe(generationFixtures.helloServerStream);
  });

  test('proxies the first event before the upstream stream completes', async () => {
    const endpointResult = handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      async (generationInput, options) => {
        if (options === undefined) throw new Error('Generation options are required.');
        return requestGeneration(generationInput, {
          ...(options.signal ? { signal: options.signal } : {}),
          token: 'server-secret',
          url: `http://127.0.0.1:${serverPort}/stream`,
        });
      },
    ).then(async (response) => {
      const reader = response.body?.getReader();
      const firstRead = await reader?.read();
      return { response, reader, firstRead, completedBeforeFirstRead: upstreamCompleted };
    });

    const first = await Promise.race([endpointResult, sleep(1_000).then(() => null)]);
    releaseStreamingResponse();

    expect(first).not.toBeNull();
    if (!first) return;

    expect(first.response.status).toBe(200);
    expect(first.response.headers.get('content-type')).toContain('text/event-stream');
    expect(first.completedBeforeFirstRead).toBe(false);
    expect(new TextDecoder().decode(first.firstRead?.value)).toBe(
      generationFixtures.firstServerStream,
    );

    const secondRead = await first.reader?.read();
    expect(new TextDecoder().decode(secondRead?.value)).toBe(generationFixtures.secondServerStream);
    expect(upstreamCompleted).toBe(true);
    expect(receivedAuthorization).toBe('Bearer server-secret');
    expect(JSON.parse(receivedBody)).toEqual({
      system: getGenerationSystemPrompt(),
      prompt: buildGenerationPrompt(input),
      maxTokens: 1_500,
    });
  });
});
