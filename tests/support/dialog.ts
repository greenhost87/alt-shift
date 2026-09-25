import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export async function waitForDialogReady(dialog: Locator) {
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Confirm deletion' })).toBeVisible();
}

async function dismissDialog(dialog: Locator, dismiss: () => Promise<void>) {
  await expect
    .poll(async () => {
      if (await dialog.isHidden()) return true;
      await dismiss();
      return dialog.isHidden();
    })
    .toBe(true);
}

export async function confirmDeletion(dialog: Locator) {
  await dismissDialog(dialog, async () => {
    await dialog.getByRole('button', { name: 'Confirm deletion' }).click();
  });
}

export async function cancelDeletion(dialog: Locator) {
  await dismissDialog(dialog, async () => {
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
}

export async function escapeDeletion(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect
    .poll(async () => {
      if (await dialog.isHidden()) return true;
      await page.keyboard.press('Escape');
      return dialog.isHidden();
    })
    .toBe(true);
}

export async function openDeletionDialog(page: Page) {
  await page.getByRole('button', { name: 'Delete' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Delete application?' });
  await waitForDialogReady(dialog);
  return dialog;
}
