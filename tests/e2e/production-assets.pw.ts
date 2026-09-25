import { expect, test } from '@playwright/test';

test('serves production client assets from the application server', async ({ page, request }) => {
  const documentResponse = await page.goto('/');

  expect(documentResponse?.status()).toBe(200);
  expect(documentResponse?.headers()['cache-control']).toBe('no-cache');

  const stylesheetPath = await page.locator('link[rel="stylesheet"]').first().getAttribute('href');
  const scriptPath = await page.locator('script[type="module"][src]').last().getAttribute('src');
  expect(stylesheetPath).not.toBeNull();
  expect(scriptPath).not.toBeNull();

  const [stylesheetResponse, scriptResponse, brandResponse] = await Promise.all([
    request.get(stylesheetPath ?? ''),
    request.get(scriptPath ?? ''),
    request.get('/brand.svg'),
  ]);

  expect(stylesheetResponse.status()).toBe(200);
  expect(stylesheetResponse.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  expect(stylesheetResponse.headers()['content-type']).toContain('text/css');
  expect(scriptResponse.status()).toBe(200);
  expect(scriptResponse.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  expect(scriptResponse.headers()['content-type']).toContain('text/javascript');
  expect(brandResponse.status()).toBe(200);
  expect(brandResponse.headers()['cache-control']).toBe('no-cache');
  expect(brandResponse.headers()['content-type']).toContain('image/svg+xml');
  await expect(page.getByAltText('Alt+Shift')).toBeVisible();
});
