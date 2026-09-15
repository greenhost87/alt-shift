import { expect, test } from '@playwright/test';
import { seedApplications } from '../support/applications';
import { expectSuccessfulCopy } from '../support/clipboard';

test('copies an application through the browser clipboard on the HTTPS origin', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await seedApplications(page, 1);
  await page.goto('/');

  expect(await page.evaluate(() => window.isSecureContext)).toBe(true);
  await expectSuccessfulCopy(page);
  expect(await page.evaluate(async () => navigator.clipboard.readText())).toBe('Cover letter 1');
});
