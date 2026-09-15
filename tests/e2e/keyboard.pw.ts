import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { seedApplications } from '../support/applications';
import { waitForDialogReady } from '../support/dialog';

async function pressTabAndExpectFocus(page: Page, target: Locator) {
  await page.keyboard.press('Tab');
  await expect(target).toBeFocused();
}

test('cycles through every dashboard action in document order', async ({ page }) => {
  await seedApplications(page, 1);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();

  const brand = page.getByRole('link', { name: 'Alt+Shift' });
  const language = page.getByRole('combobox', { name: 'Language' });
  const home = page.getByRole('button', { name: 'Home' });
  const createButtons = page.getByRole('button', { name: 'Create New' });
  const openApplication = page.getByRole('link', {
    name: 'Open application for Role 1 at Company 1',
  });
  const deleteApplication = page.getByRole('button', { name: 'Delete' });
  const copyApplication = page.getByRole('button', { name: 'Copy to clipboard' });

  for (const target of [
    brand,
    language,
    home,
    createButtons.first(),
    openApplication,
    deleteApplication,
    copyApplication,
    createButtons.last(),
  ]) {
    await pressTabAndExpectFocus(page, target);
  }
});

test('traps keyboard focus in the deletion dialog and restores it on close', async ({ page }) => {
  await seedApplications(page, 1);
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Delete' });
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Delete application?' });
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  const confirm = dialog.getByRole('button', { name: 'Confirm deletion' });
  await expect(dialog).toContainText(
    'This application will be permanently deleted. This action cannot be undone.',
  );
  await waitForDialogReady(dialog);
  await expect(cancel).toBeEnabled();
  await cancel.focus();
  await pressTabAndExpectFocus(page, confirm);
  await pressTabAndExpectFocus(page, cancel);
  await page.keyboard.press('Shift+Tab');
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cancel).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
