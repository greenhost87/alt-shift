import { expect, test } from '@playwright/test';
import { gotoNewApplication } from '../support/applications';

test('generator fields show the design placeholders', async ({ page }) => {
  await gotoNewApplication(page);

  await expect(page.getByPlaceholder('Product manager')).toBeVisible();
  await expect(page.getByPlaceholder('Apple')).toBeVisible();
  await expect(page.getByPlaceholder('HTML, CSS and doing things in time')).toBeVisible();
  await expect(
    page.getByPlaceholder('Describe why you are a great fit or paste your bio'),
  ).toBeVisible();
});
