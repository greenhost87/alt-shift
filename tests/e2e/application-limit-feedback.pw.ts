import { expect, test } from '@playwright/test';
import { openSubscriptionModal, submitApplicationForm } from '../support/applications';
import { installGenerationBrowserFixtures } from '../support/generation-browser';

test.beforeEach(async ({ page }) => {
  await installGenerationBrowserFixtures(page);
});

test('communicates the server application limit and disables further generation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'respondToGeneration', {
      configurable: true,
      value() {
        const body = JSON.stringify(window.generationFixtures.applicationLimitError);
        const headers = new Headers({ 'content-type': 'application/json' });
        return new Response(body, { headers, status: 429 });
      },
    });
  });
  await submitApplicationForm(page, '/applications/new');

  await expect(page.getByRole('alert')).toHaveText(
    'You have reached the application generation limit.',
  );
  await expect(page.getByRole('banner')).toContainText('5/5 applications generated');
  const form = page.locator('form');
  await expect(form.getByRole('button', { name: 'Retry generation' })).toHaveCount(0);
  await expect(form.getByRole('button', { name: 'Generate Now' })).toHaveCount(0);
  await expect(form.getByLabel('Job title')).toBeDisabled();

  await openSubscriptionModal(page);
});
