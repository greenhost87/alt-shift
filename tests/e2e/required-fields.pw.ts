import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  clearApplicationFields,
  expectRequiredFieldMessages,
  expectRequiredFieldState,
  fillApplicationFields,
  getGenerateButton,
  gotoNewApplication,
} from '../support/applications';

async function getBorderColor(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).evaluate((field) => {
    return window.getComputedStyle(field).borderColor;
  });
}

test('blank generator marks required fields and explains empty values', async ({ page }) => {
  await gotoNewApplication(page);
  await clearApplicationFields(page);

  const generate = getGenerateButton(page);
  await expect(generate).toBeDisabled();

  await expectRequiredFieldMessages(page, 4);
  await expectRequiredFieldState(page);

  await fillApplicationFields(page);
  await expectRequiredFieldMessages(page, 0);
  await expect(generate).toBeEnabled();
});

test('invalid text inputs share the textarea error border treatment', async ({ page }) => {
  await gotoNewApplication(page);
  await clearApplicationFields(page);

  const inputBorder = await getBorderColor(page, 'Job title');
  const textareaBorder = await getBorderColor(page, 'Additional details');
  expect(inputBorder).toBe(textareaBorder);

  await fillApplicationFields(page);
  await expect.poll(async () => getBorderColor(page, 'Job title')).not.toBe(inputBorder);
});
