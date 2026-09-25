import { expect, test } from '@playwright/test';

test('serves assets, routes, and health checks below the configured base path', async ({
  page,
}) => {
  const response = await page.goto('./');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/alt-shift\/$/);
  await expect(page.getByAltText('Alt+Shift')).toHaveAttribute('src', '/alt-shift/brand.svg');
  await Promise.all([
    page.waitForURL(/\/alt-shift\/applications$/),
    page.getByRole('link', { name: '0/5 applications generated' }).click(),
  ]);

  const healthResponse = await page.goto('./api/health');
  expect({ body: await healthResponse?.text(), status: healthResponse?.status() }).toEqual({
    body: '{"status":"healthy"}',
    status: 200,
  });
});
