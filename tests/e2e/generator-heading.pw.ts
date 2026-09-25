import { expect, test } from '@playwright/test';
import {
  clearApplicationFields,
  fillApplicationFields,
  gotoNewApplication,
} from '../support/applications';

test('generator heading uses the muted color until it shows an application title', async ({
  page,
}) => {
  await gotoNewApplication(page);
  await clearApplicationFields(page);

  const emptyHeading = page.getByRole('heading', { name: 'New application' });
  await expect(emptyHeading).toBeVisible();
  await expect(emptyHeading).toHaveCSS('color', 'rgb(102, 112, 133)');

  await fillApplicationFields(page);
  const titledHeading = page.getByRole('heading', { name: 'Test Engineer, Local Company' });
  await expect(titledHeading).toBeVisible();
  await expect(titledHeading).toHaveCSS('color', 'rgb(16, 24, 40)');
});
