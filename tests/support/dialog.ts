import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export async function waitForDialogReady(dialog: Locator) {
  await expect(dialog.locator('[data-dialog-ready="true"]')).toHaveCount(1);
}

export async function confirmDeletion(dialog: Locator) {
  await dialog.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(dialog).toBeHidden();
}

export async function openDeletionDialog(page: Page) {
  await page.getByRole('button', { name: 'Delete' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Delete application?' });
  await waitForDialogReady(dialog);
  return dialog;
}
