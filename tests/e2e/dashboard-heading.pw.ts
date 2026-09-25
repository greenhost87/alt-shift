import { expect, test } from '@playwright/test';
import { gotoNewApplication } from '../support/applications';

test('dashboard heading matches the design size without changing the generator heading', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/applications', { waitUntil: 'networkidle' });
  const dashboardHeading = page.getByRole('heading', { name: 'Applications', exact: true });
  await expect(dashboardHeading).toBeVisible();
  await expect(dashboardHeading).toHaveCSS('font-size', '48px');

  await gotoNewApplication(page);
  const generatorHeading = page.getByRole('heading', { name: 'New application' });
  await expect(generatorHeading).toBeVisible();
  await expect(generatorHeading).toHaveCSS('font-size', '36px');
});
