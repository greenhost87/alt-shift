import { expect, test } from '@playwright/test';
import { seedApplications } from '../support/applications';
import { expectSuccessfulCopy } from '../support/clipboard';

declare global {
  interface Window {
    waitToWriteClipboard: () => Promise<void>;
  }
}

test('disables copy while a clipboard operation is pending', async ({ page }) => {
  let releaseClipboard = () => {};
  const clipboardReleased = new Promise<void>((resolve) => {
    releaseClipboard = resolve;
  });
  await page.exposeFunction('waitToWriteClipboard', async () => clipboardReleased);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        async writeText() {
          await window.waitToWriteClipboard();
        },
      },
    });
  });
  await seedApplications(page, 1);
  await page.goto('/');

  const copy = page.getByRole('button', { name: 'Copy to clipboard' });
  await copy.click();
  await expect(copy).toBeDisabled();
  releaseClipboard();
  await expect(page.getByRole('button', { name: 'Copied!' })).toBeEnabled();
});

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
  await expect(page.getByRole('button', { name: 'Copy to clipboard' }).first()).toBeVisible({
    timeout: 1_500,
  });

  const countCookie = (await context.cookies()).find(
    (cookie) => cookie.name === 'ALT_SHIFT_APPLICATION_COUNT',
  );
  expect(countCookie?.value).toBe('1');
  expect(countCookie?.expires).toBeGreaterThan(Date.now() / 1_000 + 90);
  expect(countCookie?.expires).toBeLessThan(Date.now() / 1_000 + 130);
});
