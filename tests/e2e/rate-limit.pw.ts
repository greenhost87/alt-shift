import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import generationFixtures from '../fixtures/generation.json' with { type: 'json' };

const RATE_LIMIT = 2;
const TEST_DEVICE_SIGNAL = 'a'.repeat(64);

const input = {
  jobTitle: 'Database rate limit test',
  company: 'Variant',
  strengths: 'Reliable testing',
  details: 'Verify that generation limits persist on the server.',
  locale: 'en',
};

async function requestGeneration(
  page: Page,
  includeCsrf: boolean,
  deviceSignal: string | null = TEST_DEVICE_SIGNAL,
  endpoint = '/api/generate',
  consumeSuccessfulResponse = false,
) {
  return page.evaluate(
    async ({ consumeResponse, requestInput, sendCsrf, signal, generationEndpoint }) => {
      const headers = new Headers({ 'content-type': 'application/json' });
      if (signal !== null) headers.set('x-client-device-signals', signal);
      if (sendCsrf) {
        const csrfToken = document.cookie.match(/(?:^|; )ALT_SHIFT_CSRF=([^;]*)/)?.[1] ?? '';
        headers.set('x-csrf-token', csrfToken);
      }
      const controller = new AbortController();
      const timeout = window.setTimeout(() => {
        controller.abort();
      }, 2_000);
      try {
        const response = await fetch(generationEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestInput),
          signal: controller.signal,
        });
        const body = response.status === 429 ? await response.text() : '';
        if (response.status !== 429) {
          if (consumeResponse) await response.text();
          else await response.body?.cancel();
        }
        return {
          body,
          retryAfter: response.headers.get('retry-after'),
          status: response.status,
        };
      } catch {
        return { body: '', retryAfter: null, status: 0 };
      } finally {
        window.clearTimeout(timeout);
      }
    },
    {
      consumeResponse: consumeSuccessfulResponse,
      requestInput: input,
      sendCsrf: includeCsrf,
      signal: deviceSignal,
      generationEndpoint: endpoint,
    },
  );
}

async function submitApplication(page: Page) {
  const response = page.waitForResponse(
    (candidate) =>
      new URL(candidate.url()).pathname === '/api/generate' &&
      candidate.request().method() === 'POST',
  );
  await page.locator('form button[type="submit"]').click();
  return response;
}

test('sends browser device signals through the production generation path', async ({ page }) => {
  await page.goto('/applications/new', { waitUntil: 'networkidle' });
  await page.getByLabel('Job title').fill(input.jobTitle);
  await page.getByLabel('Company').fill(input.company);
  await page.getByLabel('I am good at...').fill(input.strengths);
  await page.getByLabel('Additional details').fill(input.details);

  expect((await submitApplication(page)).status()).not.toBe(400);
  await page.goto('/');

  expect((await requestGeneration(page, true, null)).status).toBe(400);
});

test('releases failed streams and enforces the application limit', async ({ page }) => {
  await page.goto('/');
  const interrupted = await requestGeneration(
    page,
    true,
    'b'.repeat(64),
    '/fake?incomplete=1',
    true,
  );
  expect(interrupted.status).toBe(0);

  const signals = ['c', 'c', 'd', 'd', 'e'].map((value) => value.repeat(64));
  for (const signal of signals) {
    const response = await requestGeneration(page, true, signal, '/fake', true);
    expect(response.status).toBe(200);
  }

  const limited = await requestGeneration(page, true, 'f'.repeat(64), '/fake');
  expect(limited.status).toBe(429);
  expect(JSON.parse(limited.body)).toEqual(generationFixtures.applicationLimitError);
});

test('protects generation across anonymous session rotation', async ({ page }) => {
  await page.goto('/');
  await page.context().clearCookies();
  expect((await requestGeneration(page, false)).status).toBe(401);
  expect((await requestGeneration(page, false)).status).toBe(403);

  for (let requestIndex = 0; requestIndex < RATE_LIMIT; requestIndex += 1) {
    expect((await requestGeneration(page, true)).status).not.toBe(429);
  }

  await page.context().clearCookies();
  await page.goto('/');
  const limited = await requestGeneration(page, true);

  expect(limited.status).toBe(429);
  expect(Number(limited.retryAfter)).toBeGreaterThan(0);
  expect(JSON.parse(limited.body)).toEqual(generationFixtures.rateLimitError);
});
