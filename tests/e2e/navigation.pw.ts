import { expect, test } from '@playwright/test';
import { navigateHome } from '../support/applications';

test('runs the test application on a dynamic port', async ({ page }) => {
  await page.goto('/');

  const port = Number(new URL(page.url()).port);
  expect(port).toBeGreaterThanOrEqual(49_152);
  expect(port).toBeLessThanOrEqual(65_535);
});

test('core navigation does not raise uncaught page errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/applications/new');
  await expect(page.getByRole('heading', { name: 'New application' })).toBeVisible();
  expect(pageErrors, 'generator load errors').toEqual([]);

  await navigateHome(page);
  expect(pageErrors, 'client navigation errors').toEqual([]);

  await page.reload({ waitUntil: 'networkidle' });
  expect(pageErrors, 'dashboard reload errors').toEqual([]);
});

test('logo links to the home page', async ({ page }) => {
  await page.goto('/applications/new');

  await navigateHome(page);
});
