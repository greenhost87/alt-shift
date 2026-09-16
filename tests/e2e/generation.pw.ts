import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import generationFixtures from '../fixtures/generation.json' with { type: 'json' };
import { expectApplicationProgress } from '../support/applications';
import { rejectClipboardWrites } from '../support/clipboard';
import { rejectApplicationStorageWrites } from '../support/storage';

declare global {
  interface Window {
    delayedGenerationResponse: (release: () => Promise<void>, content: string) => Response;
    finishInterruptedGenerationRetry: () => Promise<void>;
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
        headers: {
          'content-type': 'text/event-stream',
          'x-generation-inactivity-timeout-ms': '30000',
        },
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
  await page.getByLabel('Job title').fill('Product manager');
  await page.getByLabel('Company').fill('Apple');
  await page.getByLabel('I am good at...').fill('HTML, CSS and doing things in time');
  await page
    .getByLabel('Additional details')
    .fill('I want to help you build awesome solutions to accomplish your goals and vision');
  await page.getByRole('button', { name: 'Generate Now' }).click();
}

async function expectGenericGenerationFailure(page: Page) {
  await expect(page.getByRole('alert')).toHaveText(
    'The application could not be generated. Please try again.',
  );
  await expect(page.getByText('0/5 applications generated')).toBeVisible();
}

async function setupCopyableGeneration(page: Page) {
  await page.addInitScript(() => {
    window.respondToGeneration = () =>
      window.generationResponse(window.generationFixtures.copyableStream);
  });
}

async function generateCopyableApplication(page: Page) {
  await setupCopyableGeneration(page);
  await generateApplication(page);
}

async function expectCompletedGeneration(page: Page, letter: string) {
  await expect(page.getByText(letter)).toBeVisible();
  const tryAgain = page.getByRole('button', { name: 'Try Again' });
  await expect(tryAgain).toBeVisible();
  await expect(tryAgain.locator('svg')).toHaveAttribute('viewBox', '0 0 24 24');
  await expect(tryAgain.locator('svg')).toHaveCSS('width', '24px');
  await expect(tryAgain.locator('svg')).toHaveCSS('height', '24px');
  await page.mouse.move(0, 0);
  await expect(tryAgain).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByText('1/5 applications generated')).toBeVisible();
  const goalHeading = page.getByRole('heading', { name: 'Hit your goal' });
  await expect(goalHeading).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('progressbar', { name: '1 of 5 applications generated' }),
  ).toHaveAttribute('aria-valuenow', '1');
  const previewBox = await page
    .locator('section')
    .filter({ hasText: letter })
    .first()
    .boundingBox();
  const bannerBox = await page.locator('section').filter({ has: goalHeading }).boundingBox();
  expect(previewBox?.height).toBe(620);
  expect(bannerBox?.y).toBe((previewBox?.y ?? 0) + 620 + 48);
}

test('completed layout matches Figma with the full design letter', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1300 });
  await page.addInitScript(() => {
    window.respondToGeneration = () =>
      window.generationResponse(window.generationFixtures.designStream);
  });
  await generateApplication(page);
  await expectCompletedGeneration(page, generationFixtures.designLetter);
  const letterBox = await page.getByText(generationFixtures.designLetter).boundingBox();
  expect(letterBox).toMatchObject({ x: 760, y: 136, width: 496, height: 532 });
  const copyBox = await page.getByRole('button', { name: 'Copy to clipboard' }).boundingBox();
  expect(copyBox?.y).toBe(684);
});

async function openDashboardAndExpectCount(page: Page, applicationCount: number) {
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(applicationCount);
}

async function holdGenerationStream(page: Page) {
  let releaseStream = () => {};
  const streamReleased = new Promise<void>((resolve) => {
    releaseStream = resolve;
  });
  await page.exposeFunction('waitToFinishGeneration', async () => streamReleased);
  return releaseStream;
}

async function readAnimationFrames(locator: Locator) {
  return locator.evaluate((element) =>
    element.getAnimations().flatMap((animation) =>
      animation.effect instanceof KeyframeEffect
        ? animation.effect.getKeyframes().map((frame) => ({
            opacity: frame['opacity'],
            transform: frame['transform'],
          }))
        : [],
    ),
  );
}

test('waiting state preserves Figma colors, geometry, and vertical orb motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1300 });
  const releaseStream = await holdGenerationStream(page);
  await page.addInitScript(() => {
    window.respondToGeneration = () =>
      window.delayedGenerationResponse(
        window.waitToFinishGeneration,
        window.generationFixtures.copyableStream,
      );
  });
  await generateApplication(page);
  try {
    const loading = page.getByRole('button', { name: 'Generate Now, loading' });
    await expect(loading).toBeDisabled();
    await expect(loading).toHaveCSS('background-color', 'rgb(8, 116, 67)');
    await expect(loading).toHaveCSS('color', 'rgb(255, 255, 255)');
    expect(await loading.boundingBox()).toMatchObject({ x: 160, y: 656, width: 544, height: 56 });
    for (const label of ['Job title', 'Company', 'I am good at...', 'Additional details']) {
      const field = page.getByLabel(label, { exact: true });
      await expect(field).toBeDisabled();
      await expect(field).toHaveCSS('background-color', 'rgb(242, 244, 247)');
      await expect(field).toHaveCSS('border-color', 'rgb(208, 213, 221)');
      await expect(field).toHaveCSS('box-shadow', 'none');
      await expect(field).toHaveCSS('color', 'rgb(152, 162, 179)');
    }
    await expect(page.getByLabel('Additional details')).toHaveCSS('height', '240px');
    const preview = page.getByLabel('Generating application');
    await expect(preview).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy to clipboard' })).toHaveCount(0);
    const orb = preview.locator(':scope > span');
    const frames = await readAnimationFrames(orb);
    expect(frames).toEqual([
      { opacity: '1', transform: 'translateY(0.5px)' },
      { opacity: '0.48', transform: 'translateY(-15.5px)' },
    ]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(orb).toHaveCSS('animation-name', 'none');
  } finally {
    releaseStream();
  }
  await expectCompletedGeneration(page, 'Copyable application');
});

test('streams, saves, restores, and counts a completed application once', async ({ page }) => {
  let requestCount = 0;
  const releaseStream = await holdGenerationStream(page);
  await page.exposeFunction('recordGenerationRequest', () => {
    requestCount += 1;
  });
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
  await expect(page.getByRole('button', { name: 'Generate Now, loading' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0);
  const generationCaret = page.getByTestId('generation-caret');
  await expect(generationCaret).toBeVisible();
  const caretFrames = await readAnimationFrames(generationCaret);
  expect(caretFrames.map((frame) => frame.opacity)).toEqual(['1', '0']);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(generationCaret).toHaveCSS('animation-name', 'none');

  releaseStream();
  await expectCompletedGeneration(page, STREAMED_LETTER);

  await page.reload();
  await expect(page.getByText('1/5 applications generated')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByText(STREAMED_LETTER)).toBeVisible();
  await expectApplicationProgress(page, 1);
});

test('supports generation without crypto.randomUUID', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    });
  });
  await setupCopyableGeneration(page);

  await generateApplication(page);
  await expectCompletedGeneration(page, 'Copyable application');
});

test('falls back to a ClipboardItem when writing text is rejected', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        async write() {},
        async writeText() {
          await Promise.reject(new DOMException('Clipboard text denied', 'NotAllowedError'));
        },
      },
    });
  });
  await generateCopyableApplication(page);
  await page.getByRole('button', { name: 'Copy to clipboard' }).click();

  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();
});

test('reports clipboard rejection and clears the alert after a successful copy', async ({
  page,
}) => {
  await rejectClipboardWrites(page, 1);
  await setupCopyableGeneration(page);
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

  await expectGenericGenerationFailure(page);
  await openDashboardAndExpectCount(page, 0);
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

  await expectGenericGenerationFailure(page);
  expect(attempts).toBe(1);

  await page.getByRole('button', { name: 'Retry generation' }).click();
  await expect(page.getByText('Generated after reconnecting')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
  expect(attempts).toBe(2);
});

test('preserves a generated letter when browser storage rejects the save', async ({ page }) => {
  await rejectApplicationStorageWrites(page);
  await page.addInitScript(() => {
    window.respondToGeneration = () =>
      window.generationResponse(window.generationFixtures.unsavedStream);
  });
  await generateApplication(page);

  await expect(page.getByText('Letter that could not be saved')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('browser storage could not save it');
  await expect(page.getByText('0/5 applications generated')).toBeVisible();

  await openDashboardAndExpectCount(page, 0);
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
  await expect(page.getByRole('button', { name: 'Generate Now, loading' })).toBeVisible();
  interruptStream();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Partial application')).toBeVisible();
  await expect(page.getByText('0/5 applications generated')).toBeVisible();
  await expect.poll(() => requestCount).toBe(1);
  await page.waitForTimeout(100);
  expect(requestCount).toBe(1);

  await page.getByRole('button', { name: 'Retry generation' }).click();
  await expect.poll(() => requestCount).toBe(2);
  await expect(page.getByText('Partial application')).toHaveCount(0);
  finishRetry();
  await expectCompletedGeneration(page, 'Recovered application');

  await openDashboardAndExpectCount(page, 1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(1);
  await expect(page.getByText('1/5 applications generated')).toBeVisible();
});
