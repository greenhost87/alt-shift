import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { seedApplications } from '../support/applications';
import { waitForDialogReady } from '../support/dialog';

async function pressTabAndExpectFocus(page: Page, target: Locator) {
  await page.keyboard.press('Tab');
  await expect(target).toBeFocused();
}

async function activateDashboardButton(page: Page, applicationCount: number, name: string) {
  await seedApplications(page, applicationCount);
  await page.goto('/applications');
  const trigger = page.getByRole('button', { name });
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await page.keyboard.press('Enter');
  return trigger;
}

test('cycles through every dashboard action in document order', async ({ page }) => {
  await seedApplications(page, 1);
  await page.goto('/applications');
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();

  const brand = page.getByRole('link', { name: 'Alt+Shift' });
  const applications = page.getByRole('link', { name: '1/5 applications generated' });
  const language = page.getByRole('button', { name: 'Language' });
  const home = page.getByRole('link', { name: 'My letters' });
  const createButtons = page.getByRole('button', { name: 'Create New' });
  const openApplication = page.getByRole('link', {
    name: 'Open application for Role 1 at Company 1',
  });
  const deleteApplication = page.getByRole('button', { name: 'Delete' });
  const copyApplication = page.getByRole('button', { name: 'Copy to clipboard' });

  for (const target of [
    brand,
    applications,
    home,
    language,
    createButtons.first(),
    openApplication,
    deleteApplication,
    copyApplication,
    createButtons.last(),
  ]) {
    await pressTabAndExpectFocus(page, target);
  }
});

test('closes the subscription modal on Escape', async ({ page }) => {
  await activateDashboardButton(page, 5, 'Subscribe');

  const dialog = page.getByRole('dialog', { name: 'Unlock unlimited applications' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('traps keyboard focus in the deletion dialog and restores it on close', async ({ page }) => {
  const trigger = await activateDashboardButton(page, 1, 'Delete');

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
