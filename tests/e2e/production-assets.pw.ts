import { expect, test } from '@playwright/test';

test('serves production client assets from the application server', async ({ page, request }) => {
  const documentResponse = await page.goto('/');

  expect(documentResponse?.status()).toBe(200);

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
  expect(stylesheetResponse.headers()['content-type']).toContain('text/css');
  expect(scriptResponse.status()).toBe(200);
  expect(scriptResponse.headers()['content-type']).toContain('text/javascript');
  expect(brandResponse.status()).toBe(200);
  expect(brandResponse.headers()['content-type']).toContain('image/svg+xml');
  await expect(page.getByAltText('Alt+Shift')).toBeVisible();
});
