import { afterAll, describe, expect, test } from 'bun:test';
import { requestGeneration } from '../../src/server/generation/client';
import { buildGenerationPrompt } from '../../src/server/generation/prompt';
import { handleGenerateRequest } from '../../src/routes/api.generate';
import { safeParseGenerationRequest } from '../../src/system/generation/schema';

const input = {
  jobTitle: 'Product manager',
  company: 'Variant',
  strengths: 'Clear communication',
  details: 'I ship useful products.',
};

let receivedAuthorization = '';
let receivedBody = '';
let releaseStreamingResponse = () => {};
let upstreamCompleted = false;
const server = Bun.serve({
  port: 0,
  async fetch(request) {
    receivedAuthorization = request.headers.get('authorization') ?? '';
    receivedBody = await request.text();

    if (new URL(request.url).pathname === '/stream') {
      const release = new Promise<void>((resolve) => {
        releaseStreamingResponse = resolve;
      });
      upstreamCompleted = false;
      return new Response(
        new ReadableStream({
          async start(controller) {
            controller.enqueue(new TextEncoder().encode('event: delta\ndata: First\n\n'));
            await release;
            controller.enqueue(new TextEncoder().encode('event: delta\ndata: second\n\n'));
            upstreamCompleted = true;
            controller.close();
          },
        }),
        { headers: { 'content-type': 'text/event-stream' } },
      );
    }

    return new Response('event: delta\ndata: Hello\n\n', {
      headers: { 'content-type': 'text/event-stream' },
    });
  },
});

afterAll(() => server.stop());

describe('generation server contract', () => {
  test('rejects incomplete and over-limit structured input', async () => {
    expect(safeParseGenerationRequest({ ...input, company: '' }).success).toBe(false);
    expect(safeParseGenerationRequest({ ...input, details: 'x'.repeat(1_201) }).success).toBe(false);

    const response = await handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({ ...input, company: '' }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'invalid_request',
        message: 'Please complete all fields within their limits.',
      },
    });
  });

  test('marks applicant values as untrusted prompt text', () => {
    const prompt = buildGenerationPrompt(input);
    expect(prompt).toContain('<untrusted_applicant_input>');
    expect(prompt).toContain('Job title: Product manager');
    expect(prompt).toContain('Company: Variant');
  });

  test('adds server bearer authentication and returns the upstream stream', async () => {
    const response = await requestGeneration(input, {
      token: 'server-secret',
      url: `http://127.0.0.1:${server.port}/v1/generate`,
    });

    expect(receivedAuthorization).toBe('Bearer server-secret');
    expect(JSON.parse(receivedBody)).toEqual({ prompt: buildGenerationPrompt(input) });
    expect(await response.text()).toBe('event: delta\ndata: Hello\n\n');
  });

  test('proxies the first event before the upstream stream completes', async () => {
    const endpointResult = handleGenerateRequest(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
      (generationInput, options) =>
        requestGeneration(generationInput, {
          signal: options.signal,
          token: 'server-secret',
          url: `http://127.0.0.1:${server.port}/stream`,
        }),
    ).then(async (response) => {
      const reader = response.body?.getReader();
      const firstRead = await reader?.read();
      return { response, reader, firstRead, completedBeforeFirstRead: upstreamCompleted };
    });

    const first = await Promise.race([endpointResult, Bun.sleep(1_000).then(() => null)]);
    releaseStreamingResponse();

    expect(first).not.toBeNull();
    if (!first) return;

    expect(first.response.status).toBe(200);
    expect(first.response.headers.get('content-type')).toContain('text/event-stream');
    expect(first.completedBeforeFirstRead).toBe(false);
    expect(new TextDecoder().decode(first.firstRead?.value)).toBe('event: delta\ndata: First\n\n');

    const secondRead = await first.reader?.read();
    expect(new TextDecoder().decode(secondRead?.value)).toBe('event: delta\ndata: second\n\n');
    expect(upstreamCompleted).toBe(true);
    expect(receivedAuthorization).toBe('Bearer server-secret');
    expect(JSON.parse(receivedBody)).toEqual({ prompt: buildGenerationPrompt(input) });
  });
});
