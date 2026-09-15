import { expect, test } from '@playwright/test';

test('logo links to the home page', async ({ page }) => {
  await page.goto('/applications/new');

  await page.getByRole('link', { name: 'Alt+Shift' }).click();
  await expect(page).toHaveURL('/');
});
