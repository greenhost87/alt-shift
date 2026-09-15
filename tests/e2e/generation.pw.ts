import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import generationFixtures from '../fixtures/generation.json' with { type: 'json' };
import { rejectClipboardWrites } from '../support/clipboard';

declare global {
  interface Window {
    delayedGenerationResponse: (release: () => Promise<void>, content: string) => Response;
    finishInterruptedGenerationRetry: () => Promise<void>;
    finishRetriedGeneration: () => Promise<void>;
    generationResponse: (body: BodyInit) => Response;
    recordGenerationRequest: () => Promise<void>;
    recordInterruptedGenerationRequest: () => Promise<void>;
    recordTransportAttempt: () => Promise<void>;
    respondToGeneration: (init?: RequestInit) => Promise<Response> | Response;
    waitToFinishGeneration: () => Promise<void>;
    waitToInterruptGeneration: () => Promise<void>;
    generationFixtures: typeof generationFixtures;
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((fixtures) => {
    window.generationFixtures = fixtures;
    window.generationResponse = (body) =>
      new Response(body, {
        headers: { 'content-type': 'text/event-stream' },
        status: 200,
      });
    window.delayedGenerationResponse = (release, content) =>
      window.generationResponse(
        new ReadableStream({
          async start(controller) {
            await release();
            controller.enqueue(new TextEncoder().encode(content));
            controller.close();
          },
        }),
      );
    const nativeFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      value: async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : input.toString(), location.href);
        if (url.pathname !== '/api/generate') return nativeFetch.call(window, input, init);
        return window.respondToGeneration(init);
      },
    });
  }, generationFixtures);
});

const STREAMED_LETTER = generationFixtures.streamedLetter;

async function generateApplication(page: Page) {
  await page.goto('/applications/new', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Generate Now' }).click();
}

async function expectCompletedGeneration(page: Page, letter: string) {
  await expect(page.getByText(letter)).toBeVisible();
  await expect(page.getByText('Application generated and saved.')).toBeVisible();
  await expect(page.getByText('4/5 applications generated')).toBeVisible();
}

async function openDashboardAndExpectCount(page: Page, applicationCount: number) {
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(applicationCount);
}

test('streams, saves, restores, and counts a completed application once', async ({ page }) => {
  let requestCount = 0;
  let releaseStream!: () => void;
  const streamReleased = new Promise<void>((resolve) => {
    releaseStream = resolve;
  });
  await page.exposeFunction('recordGenerationRequest', () => {
    requestCount += 1;
  });
  await page.exposeFunction('waitToFinishGeneration', async () => streamReleased);
  await page.addInitScript(() => {
    window.respondToGeneration = async (init) => {
      if (new Headers(init?.headers).has('authorization')) {
        throw new Error('The browser request exposed an authorization token.');
      }
      await window.recordGenerationRequest();
      const encoder = new TextEncoder();
      return window.generationResponse(
        new ReadableStream({
          async start(controller) {
            controller.enqueue(encoder.encode(window.generationFixtures.firstAppleChunk));
            await window.waitToFinishGeneration();
            controller.enqueue(encoder.encode(window.generationFixtures.secondAppleChunk));
            controller.close();
          },
        }),
      );
    };
  });
  await generateApplication(page);

  await expect.poll(() => requestCount).toBe(1);
  await expect(page.getByText('Dear Apple team,')).toBeVisible();
  await expect(page.getByText('Writing your application…')).toBeVisible();
  await expect(page.getByText('Application generated and saved.')).toHaveCount(0);

  releaseStream();
  await expectCompletedGeneration(page, STREAMED_LETTER);

  await page.reload();
  await expect(page.getByText('4/5 applications generated')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { name: 'Product manager, Apple' })).toBeVisible();
  await expect(page.getByText(STREAMED_LETTER)).toBeVisible();
  await expect(page.getByText('4/5 applications generated')).toBeVisible();
});

test('reports clipboard rejection and clears the alert after a successful copy', async ({ page }) => {
  await rejectClipboardWrites(page, 1);
  await page.addInitScript(() => {
    window.respondToGeneration = () =>
      window.generationResponse(window.generationFixtures.copyableStream);
  });
  await generateApplication(page);
  await expect(page.getByText('Copyable application')).toBeVisible();

  const copy = page.getByRole('button', { name: 'Copy to clipboard' });
  await copy.click();
  await expect(page.getByRole('alert')).toContainText('could not be copied to the clipboard');
  await expect(page.getByText('Copyable application')).toBeVisible();

  await copy.click();
  await expect(page.getByText('could not be copied to the clipboard')).toHaveCount(0);
});

test('does not save or increment progress when generation fails', async ({ page }) => {
  await page.addInitScript(() => {
    window.respondToGeneration = () =>
      new Response(
        JSON.stringify({ error: { message: 'Generation is temporarily unavailable.' } }),
        { headers: { 'content-type': 'application/json' }, status: 502 },
      );
  });
  await generateApplication(page);

  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await expect(page.getByText('3/5 applications generated')).toBeVisible();
  await openDashboardAndExpectCount(page, 3);
});

test('cancels a streamed result, keeps it copyable, and explicitly retries', async ({ page }) => {
  let finishRetry!: () => void;
  const retryReleased = new Promise<void>((resolve) => {
    finishRetry = resolve;
  });
  await page.exposeFunction('finishRetriedGeneration', async () => retryReleased);
  await page.addInitScript(() => {
    let attempts = 0;
    window.respondToGeneration = () => {
      attempts += 1;
      const encoder = new TextEncoder();
      if (attempts === 1) {
        return window.generationResponse(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(window.generationFixtures.cancellableStream));
            },
          }),
        );
      }
      return window.delayedGenerationResponse(
        window.finishRetriedGeneration,
        window.generationFixtures.retriedStream,
      );
    };
  });
  await generateApplication(page);
  await expect(page.getByText('Cancellable partial')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel generation' }).click();

  await expect(page.getByText('Generation cancelled.')).toBeVisible();
  await expect(page.getByText('Cancellable partial')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy to clipboard' })).toBeVisible();
  await expect(page.getByText('3/5 applications generated')).toBeVisible();

  await page.getByRole('button', { name: 'Retry generation' }).click();
  await expect(page.getByText('Cancellable partial')).toHaveCount(0);
  finishRetry();
  await expectCompletedGeneration(page, 'Retried application');
});

test('blocks retry only for a valid server Retry-After period', async ({ page }) => {
  await page.addInitScript(() => {
    let attempts = 0;
    window.respondToGeneration = () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response(
          JSON.stringify({
            error: { code: 'rate_limited', message: 'Too many generation requests.' },
          }),
          {
            headers: { 'content-type': 'application/json', 'retry-after': '1' },
            status: 429,
          },
        );
      }
      return window.generationResponse(window.generationFixtures.waitingStream);
    };
  });
  await generateApplication(page);

  await expect(page.getByRole('alert')).toContainText('Too many generation requests');
  const retry = page.getByRole('button', { name: 'Retry generation' });
  await expect(retry).toBeDisabled();
  await expect(retry).toBeEnabled({ timeout: 2_000 });
  await retry.click();
  await expect(page.getByText('Generated after waiting')).toBeVisible();
});

test('reports a transport failure and retries only after an explicit action', async ({ page }) => {
  let attempts = 0;
  await page.exposeFunction('recordTransportAttempt', () => {
    attempts += 1;
  });
  await page.addInitScript(() => {
    let browserAttempts = 0;
    window.respondToGeneration = async () => {
      browserAttempts += 1;
      await window.recordTransportAttempt();
      if (browserAttempts === 1) throw new TypeError('Failed to fetch');
      return window.generationResponse(window.generationFixtures.reconnectingStream);
    };
  });
  await generateApplication(page);

  await expect(page.getByRole('alert')).toHaveText(
    'The application could not be generated. Please try again.',
  );
  await expect(page.getByText('3/5 applications generated')).toBeVisible();
  expect(attempts).toBe(1);

  await page.getByRole('button', { name: 'Retry generation' }).click();
  await expect(page.getByText('Generated after reconnecting')).toBeVisible();
  await expect(page.getByText('Application generated and saved.')).toBeVisible();
  expect(attempts).toBe(2);
});

test('preserves a generated letter when browser storage rejects the save', async ({ page }) => {
  await page.addInitScript((storageKey) => {
    const nativeSetItem = Storage.prototype.setItem.bind(localStorage);
    Storage.prototype.setItem = function (key, value) {
      if (key === storageKey && this.getItem(key) !== null) {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      nativeSetItem(key, value);
    };
  }, 'variant-cover-letters:v1');
  await page.addInitScript(() => {
    window.respondToGeneration = () =>
      window.generationResponse(window.generationFixtures.unsavedStream);
  });
  await generateApplication(page);

  await expect(page.getByText('Letter that could not be saved')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('browser storage could not save it');
  await expect(page.getByText('3/5 applications generated')).toBeVisible();

  await openDashboardAndExpectCount(page, 3);
  await expect(page.getByText('Letter that could not be saved')).toHaveCount(0);
});

test('keeps interrupted output unsaved and retries only after an explicit action', async ({
  page,
}) => {
  let requestCount = 0;
  let interruptStream!: () => void;
  let finishRetry!: () => void;
  const streamInterrupted = new Promise<void>((resolve) => {
    interruptStream = resolve;
  });
  const retryReleased = new Promise<void>((resolve) => {
    finishRetry = resolve;
  });
  await page.exposeFunction('recordInterruptedGenerationRequest', () => {
    requestCount += 1;
  });
  await page.exposeFunction('waitToInterruptGeneration', async () => streamInterrupted);
  await page.exposeFunction('finishInterruptedGenerationRetry', async () => retryReleased);
  await page.addInitScript(() => {
    let attempts = 0;
    window.respondToGeneration = async () => {
      attempts += 1;
      await window.recordInterruptedGenerationRequest();
      const encoder = new TextEncoder();
      if (attempts === 1) {
        return window.generationResponse(
          new ReadableStream({
            async start(controller) {
              controller.enqueue(encoder.encode(window.generationFixtures.partialStream));
              await window.waitToInterruptGeneration();
              controller.error(new Error('The generation stream was interrupted.'));
            },
          }),
        );
      }

      return window.delayedGenerationResponse(
        window.finishInterruptedGenerationRetry,
        window.generationFixtures.recoveredStream,
      );
    };
  });
  await generateApplication(page);

  await expect(page.getByText('Partial application')).toBeVisible();
  await expect(page.getByText('Writing your application…')).toBeVisible();
  interruptStream();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Partial application')).toBeVisible();
  await expect(page.getByText('3/5 applications generated')).toBeVisible();
  await expect.poll(() => requestCount).toBe(1);
  await page.waitForTimeout(100);
  expect(requestCount).toBe(1);

  await page.getByRole('button', { name: 'Retry generation' }).click();
  await expect.poll(() => requestCount).toBe(2);
  await expect(page.getByText('Partial application')).toHaveCount(0);
  finishRetry();
  await expectCompletedGeneration(page, 'Recovered application');

  await openDashboardAndExpectCount(page, 4);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(4);
  await expect(page.getByText('4/5 applications generated')).toBeVisible();
});
