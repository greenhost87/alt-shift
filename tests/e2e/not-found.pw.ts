import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function expectNotFoundAndReturnHome(page: Page) {
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByText('The page you are looking for does not exist.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to applications' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible();
}

test('unknown routes show a helpful page with a link home', async ({ page }) => {
  const response = await page.goto('/missing-page');
  expect(response?.status()).toBe(404);
  await expectNotFoundAndReturnHome(page);
});

test('missing stored applications show a helpful page with a link home', async ({ page }) => {
  await page.goto('/applications/00000000-0000-4000-8000-999999999999');

  await expectNotFoundAndReturnHome(page);
});
