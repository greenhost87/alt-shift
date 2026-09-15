import { expect, test } from '@playwright/test';

const STREAMED_LETTER = 'Dear Apple team,\n\nI would love to help build useful products.';

test('streams, saves, restores, and counts a completed application once', async ({ page }) => {
  let requestCount = 0;
  let releaseStream!: () => void;
  const streamReleased = new Promise<void>((resolve) => {
    releaseStream = resolve;
  });
  await page.exposeFunction('recordGenerationRequest', () => {
    requestCount += 1;
  });
  await page.exposeFunction('waitToFinishGeneration', () => streamReleased);
  await page.addInitScript(() => {
    const nativeFetch = window.fetch;
    const testWindow = window as typeof window & {
      recordGenerationRequest: () => Promise<void>;
      waitToFinishGeneration: () => Promise<void>;
    };
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString(), location.href);
      if (url.pathname !== '/api/generate') return nativeFetch.call(window, input, init);

      if (new Headers(init?.headers).has('authorization')) {
        throw new Error('The browser request exposed an authorization token.');
      }
      await testWindow.recordGenerationRequest();
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          async start(controller) {
            controller.enqueue(encoder.encode('event: delta\ndata: Dear Apple team,\n\n'));
            await testWindow.waitToFinishGeneration();
            controller.enqueue(
              encoder.encode(
                'event: delta\ndata:\ndata:\ndata: I would love to help build useful products.\n\n',
              ),
            );
            controller.close();
          },
        }),
        { headers: { 'content-type': 'text/event-stream' }, status: 200 },
      );
    };
  });
  await page.goto('/applications/new', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Generate Now' }).click();

  await expect.poll(() => requestCount).toBe(1);
  await expect(page.getByText('Dear Apple team,')).toBeVisible();
  await expect(page.getByText('Writing your application…')).toBeVisible();
  await expect(page.getByText('Application generated and saved.')).toHaveCount(0);

  releaseStream();
  await expect(page.getByText(STREAMED_LETTER)).toBeVisible();
  await expect(page.getByText('Application generated and saved.')).toBeVisible();
  await expect(page.getByText('4/5 applications generated')).toBeVisible();

  await page.reload();
  await expect(page.getByText('4/5 applications generated')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { name: 'Product manager, Apple' })).toBeVisible();
  await expect(page.getByText(STREAMED_LETTER)).toBeVisible();
  await expect(page.getByText('4/5 applications generated')).toBeVisible();
});

test('does not save or increment progress when generation fails', async ({ page }) => {
  await page.route('**/api/generate', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Generation is temporarily unavailable.' } }),
    }),
  );
  await page.goto('/applications/new', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Generate Now' }).click();

  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await expect(page.getByText('3/5 applications generated')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(3);
});

test('cancels a streamed result, keeps it copyable, and explicitly retries', async ({ page }) => {
  let finishRetry!: () => void;
  const retryReleased = new Promise<void>((resolve) => {
    finishRetry = resolve;
  });
  await page.exposeFunction('finishRetriedGeneration', () => retryReleased);
  await page.addInitScript(() => {
    const nativeFetch = window.fetch;
    const testWindow = window as typeof window & {
      finishRetriedGeneration: () => Promise<void>;
    };
    let attempts = 0;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString(), location.href);
      if (url.pathname !== '/api/generate') return nativeFetch.call(window, input, init);
      attempts += 1;
      const encoder = new TextEncoder();
      if (attempts === 1) {
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('event: delta\ndata: Cancellable partial\n\n'));
            },
          }),
          { headers: { 'content-type': 'text/event-stream' } },
        );
      }
      return new Response(
        new ReadableStream({
          async start(controller) {
            await testWindow.finishRetriedGeneration();
            controller.enqueue(encoder.encode('event: delta\ndata: Retried application\n\n'));
            controller.close();
          },
        }),
        { headers: { 'content-type': 'text/event-stream' } },
      );
    };
  });
  await page.goto('/applications/new', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Generate Now' }).click();
  await expect(page.getByText('Cancellable partial')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel generation' }).click();

  await expect(page.getByText('Generation cancelled.')).toBeVisible();
  await expect(page.getByText('Cancellable partial')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy to clipboard' })).toBeVisible();
  await expect(page.getByText('3/5 applications generated')).toBeVisible();

  await page.getByRole('button', { name: 'Retry generation' }).click();
  await expect(page.getByText('Cancellable partial')).toHaveCount(0);
  finishRetry();
  await expect(page.getByText('Retried application')).toBeVisible();
  await expect(page.getByText('Application generated and saved.')).toBeVisible();
  await expect(page.getByText('4/5 applications generated')).toBeVisible();
});

test('blocks retry only for a valid server Retry-After period', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/generate', (route) => {
    attempts += 1;
    if (attempts === 1) {
      return route.fulfill({
        status: 429,
        headers: { 'retry-after': '1' },
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'rate_limited', message: 'Too many generation requests.' },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'event: delta\ndata: Generated after waiting\n\n',
    });
  });
  await page.goto('/applications/new', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Generate Now' }).click();

  await expect(page.getByRole('alert')).toContainText('Too many generation requests');
  const retry = page.getByRole('button', { name: 'Retry generation' });
  await expect(retry).toBeDisabled();
  await expect(retry).toBeEnabled({ timeout: 2_000 });
  await retry.click();
  await expect(page.getByText('Generated after waiting')).toBeVisible();
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
  await page.exposeFunction('waitToInterruptGeneration', () => streamInterrupted);
  await page.exposeFunction('finishInterruptedGenerationRetry', () => retryReleased);
  await page.addInitScript(() => {
    const nativeFetch = window.fetch;
    const testWindow = window as typeof window & {
      recordInterruptedGenerationRequest: () => Promise<void>;
      waitToInterruptGeneration: () => Promise<void>;
      finishInterruptedGenerationRetry: () => Promise<void>;
    };
    let attempts = 0;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString(), location.href);
      if (url.pathname !== '/api/generate') return nativeFetch.call(window, input, init);

      attempts += 1;
      await testWindow.recordInterruptedGenerationRequest();
      const encoder = new TextEncoder();
      if (attempts === 1) {
        return new Response(
          new ReadableStream({
            async start(controller) {
              controller.enqueue(encoder.encode('event: delta\ndata: Partial application\n\n'));
              await testWindow.waitToInterruptGeneration();
              controller.error(new Error('The generation stream was interrupted.'));
            },
          }),
          { headers: { 'content-type': 'text/event-stream' }, status: 200 },
        );
      }

      return new Response(
        new ReadableStream({
          async start(controller) {
            await testWindow.finishInterruptedGenerationRetry();
            controller.enqueue(encoder.encode('event: delta\ndata: Recovered application\n\n'));
            controller.close();
          },
        }),
        { headers: { 'content-type': 'text/event-stream' }, status: 200 },
      );
    };
  });
  await page.goto('/applications/new', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Generate Now' }).click();

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
  await expect(page.getByText('Recovered application')).toBeVisible();
  await expect(page.getByText('Application generated and saved.')).toBeVisible();
  await expect(page.getByText('4/5 applications generated')).toBeVisible();

  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(4);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(4);
  await expect(page.getByText('4/5 applications generated')).toBeVisible();
});
