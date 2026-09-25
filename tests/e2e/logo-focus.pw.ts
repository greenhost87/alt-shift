import { test } from '@playwright/test';
import { gotoNewApplication } from '../support/applications';
import { expectBrandFocusStyle } from '../support/shell';

test('logo uses the shared green focus style', async ({ page }) => {
  await gotoNewApplication(page);
  await expectBrandFocusStyle(page);
});
