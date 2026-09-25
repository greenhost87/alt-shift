import { expect, test } from '@playwright/test';
import { gotoDashboard, seedApplications } from '../support/applications';
import { openDeletionDialog } from '../support/dialog';

test('delete confirmation uses a destructive treatment', async ({ page }) => {
  await seedApplications(page, 1);
  await gotoDashboard(page);
  const dialog = await openDeletionDialog(page);

  const confirm = dialog.getByRole('button', { name: 'Confirm deletion' });
  await expect(confirm).toBeVisible();
  await expect(confirm).toHaveCSS('color', 'rgb(240, 68, 56)');
  await expect(confirm).toHaveCSS('border-color', 'rgb(253, 162, 155)');
  const background = await confirm.evaluate((element) => {
    return window.getComputedStyle(element).backgroundColor;
  });
  expect(background).not.toBe('rgb(8, 116, 67)');
});
