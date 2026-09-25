import { expect, test } from '@playwright/test';
import { gotoDashboard, seedApplications } from '../support/applications';

test('gray-surface actions show hover feedback', async ({ page }) => {
  await seedApplications(page, 1);
  await gotoDashboard(page);

  const cardDelete = page.getByRole('button', { name: 'Delete' }).first();
  const cardCopy = page.getByRole('button', { name: 'Copy to clipboard' }).first();
  await expect(cardDelete).toBeVisible();
  await expect(cardCopy).toBeVisible();
  const card = page.locator('article').first();
  await expect(card).toBeVisible();
  const cardBackground = await card.evaluate((element) => {
    return window.getComputedStyle(element).backgroundColor;
  });

  await cardDelete.hover();
  const hoveredDelete = await cardDelete.evaluate((element) => {
    return window.getComputedStyle(element).backgroundColor;
  });
  expect(hoveredDelete).not.toBe(cardBackground);

  await cardCopy.hover();
  const hoveredCopy = await cardCopy.evaluate((element) => {
    return window.getComputedStyle(element).backgroundColor;
  });
  expect(hoveredCopy).not.toBe(cardBackground);
});
