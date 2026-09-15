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

test('keeps partial output but does not save when the generation stream is interrupted', async ({
  page,
}) => {
  let interruptStream!: () => void;
  const streamInterrupted = new Promise<void>((resolve) => {
    interruptStream = resolve;
  });
  await page.exposeFunction('waitToInterruptGeneration', () => streamInterrupted);
  await page.addInitScript(() => {
    const nativeFetch = window.fetch;
    const testWindow = window as typeof window & {
      waitToInterruptGeneration: () => Promise<void>;
    };
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString(), location.href);
      if (url.pathname !== '/api/generate') return nativeFetch.call(window, input, init);

      const encoder = new TextEncoder();
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

  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(3);
  await expect(page.getByText('3/5 applications generated')).toBeVisible();
});
