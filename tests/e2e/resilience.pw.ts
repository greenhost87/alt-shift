import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  expectApplicationProgress,
  navigateHome,
  seedApplications,
  submitApplicationForm,
} from '../support/applications';
import { confirmDeletion, openDeletionDialog } from '../support/dialog';
import { rejectApplicationStorageWrites } from '../support/storage';

const EMPTY_STREAM_ERROR = 'The generation stream ended before a letter was created.';
const GENERATION_STREAM_MODES = ['empty', 'pending'] as const;
type GenerationStreamMode = (typeof GENERATION_STREAM_MODES)[number];

async function installGenerationStream(page: Page, mode: GenerationStreamMode) {
  await page.addInitScript((streamMode) => {
    const nativeFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      async value(input: RequestInfo | URL, init?: RequestInit) {
        const url = new URL(input instanceof Request ? input.url : input.toString(), location.href);
        if (url.pathname !== '/api/generate') return nativeFetch.call(window, input, init);
        if (streamMode === 'pending') {
          init?.signal?.addEventListener('abort', () => {
            void window.recordGenerationAbort();
          });
        }
        const body = streamMode === 'empty' ? '' : new ReadableStream();
        return new Response(body, {
          headers: {
            'content-type': 'text/event-stream',
            'x-generation-inactivity-timeout-ms': '30000',
          },
          status: 200,
        });
      },
    });
  }, mode);
}

test('rejects an empty generation stream without saving an application', async ({ page }) => {
  await installGenerationStream(page, 'empty');
  await submitApplicationForm(page, '/applications/new');

  await expect(page.getByRole('alert')).toHaveText(EMPTY_STREAM_ERROR);
  await expect(page.getByRole('button', { name: 'Retry generation' })).toBeEnabled();
  await expect(page.getByText('0/5 applications generated')).toBeVisible();
  await navigateHome(page);
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
});

test('aborts generation when leaving the generator', async ({ page }) => {
  let requestWasAborted = false;
  await page.exposeFunction('recordGenerationAbort', () => {
    requestWasAborted = true;
  });
  await installGenerationStream(page, 'pending');
  await submitApplicationForm(page, '/applications/new');
  await expect(page.getByRole('button', { name: 'Generate Now, loading' })).toBeVisible();

  await navigateHome(page);

  await expect.poll(() => requestWasAborted).toBe(true);
  await expectApplicationProgress(page, 0);
});

test('preserves an application and reports a storage write failure during deletion', async ({
  page,
}) => {
  await seedApplications(page, 1);
  await rejectApplicationStorageWrites(page);
  await page.goto('/applications');
  await expectApplicationProgress(page, 1);

  const dialog = await openDeletionDialog(page);
  await confirmDeletion(dialog);

  await expect(page.getByRole('alert')).toContainText('Browser storage is unavailable');
  await expectApplicationProgress(page, 1);
  await page.reload();
  await expectApplicationProgress(page, 1);
});

test('shows card placeholders while browser storage is initialized', async ({ page }) => {
  let loadingCardCount = 0;
  let loadingCardHeight = 0;
  await page.exposeFunction(
    'recordStorageLoadingState',
    (cardCount: number, cardHeight: number) => {
      loadingCardCount = cardCount;
      loadingCardHeight = cardHeight;
    },
  );
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const loadingState = document.querySelector('output[aria-label="Loading applications…"]');
      if (!loadingState) return;
      const cards = loadingState.querySelectorAll('[data-testid="application-card-placeholder"]');
      const firstCard = cards.item(0);
      if (!(firstCard instanceof HTMLElement)) return;
      void window.recordStorageLoadingState(cards.length, firstCard.getBoundingClientRect().height);
    });
    observer.observe(document, { childList: true, subtree: true });
  });

  await page.goto('/applications');

  await expect.poll(() => loadingCardCount).toBe(2);
  expect(loadingCardHeight).toBe(240);
  await expect(page.getByRole('status', { name: 'Loading applications…' })).toHaveCount(0);
  await expect(page.getByTestId('application-card-placeholder')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'No applications yet' })).toBeVisible();
});

declare global {
  interface Window {
    recordGenerationAbort: () => Promise<void>;
    recordStorageLoadingState: (cardCount: number, cardHeight: number) => Promise<void>;
  }
}
