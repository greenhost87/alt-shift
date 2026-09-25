import { expect, test } from '@playwright/test';

test('reports that the production server is healthy', async ({ page }) => {
  const response = await page.goto('/api/health');

  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).toHaveText('{"status":"healthy"}');
});
