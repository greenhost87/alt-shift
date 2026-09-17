import { sleep } from 'bun';
import { expect, test } from 'bun:test';
import { handleGenerateRequest } from '../../src/server/generation/handler';
import { VERIFIED_SESSION_HEADER } from '../../src/system/security/session';
import generationFixtures from '../fixtures/generation.json' with { type: 'json' };

const input = {
  jobTitle: 'Product Manager',
  company: 'Apple',
  strengths: 'HTML, CSS and doing things in time',
  details: 'I want to help build awesome solutions.',
  locale: 'en',
};

test('releases an application slot when the generation stream is incomplete', async () => {
  let releaseCalls = 0;
  const response = await handleGenerateRequest(
    new Request('http://localhost/api/generate', {
      method: 'POST',
      headers: {
        [VERIFIED_SESSION_HEADER]: 'session-a',
        'x-client-device-signals': 'a'.repeat(64),
      },
      body: JSON.stringify(input),
    }),
    async () => {
      await sleep(0);
      return new Response(generationFixtures.incompleteServerStream, {
        headers: { 'content-type': 'text/event-stream' },
      });
    },
    () => undefined,
    () => ({
      release() {
        releaseCalls += 1;
      },
    }),
  );

  expect(response.status).toBe(200);
  const responseBody = response.text();
  expect(responseBody).rejects.toThrow('incomplete event');
  try {
    await responseBody;
  } catch {
    // The rejected body confirms that the proxy surfaced the incomplete stream.
  }
  expect(releaseCalls).toBe(1);
});
