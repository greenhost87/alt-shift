import { expect, test } from '@playwright/test';

test('unknown routes show a helpful page with a link home', async ({ page }) => {
  const response = await page.goto('/missing-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to applications' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible();
});
