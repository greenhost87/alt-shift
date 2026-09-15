import { test } from '@playwright/test';
import { navigateHome } from '../support/applications';

test('logo links to the home page', async ({ page }) => {
  await page.goto('/applications/new');

  await navigateHome(page);
});
