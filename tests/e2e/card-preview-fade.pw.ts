import { expect, test } from '@playwright/test';
import { gotoDashboard, seedApplications } from '../support/applications';

test('card preview fade fully covers the final clipped line', async ({ page }) => {
  await seedApplications(page, 1);
  await gotoDashboard(page);

  const fade = page.locator('article > a > div[aria-hidden="true"]').first();
  await expect(fade).toBeVisible();
  await expect(fade).toHaveCSS('height', '64px');
  const background = await fade.evaluate((element) => {
    return window.getComputedStyle(element).backgroundImage;
  });
  expect(background).toContain('linear-gradient');
  expect(background).toContain('65%');
});
