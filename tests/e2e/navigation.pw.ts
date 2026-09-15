import { expect, test } from '@playwright/test';
import { navigateHome } from '../support/applications';

test('runs the test application on a dynamic port', async ({ page }) => {
  await page.goto('/');

  const port = Number(new URL(page.url()).port);
  expect(port).toBeGreaterThanOrEqual(49_152);
  expect(port).toBeLessThanOrEqual(65_535);
});

test('logo links to the home page', async ({ page }) => {
  await page.goto('/applications/new');

  await navigateHome(page);
});
