import { expect, test } from '@playwright/test';
import { expectApplicationFields, seedApplications } from '../support/applications';
import { expectPageWidth, openResponsivePage, RESPONSIVE_WIDTHS } from '../support/viewport';

for (const width of RESPONSIVE_WIDTHS) {
  test(`stored application fits and stays read-only at ${width}px`, async ({ page }) => {
    await seedApplications(page);
    await openResponsivePage(page, width, '/applications/00000000-0000-4000-8000-000000000003');

    await expectPageWidth(page, width);
    await expect(page.getByRole('heading', { name: 'Role 3, Company 3' })).toBeVisible();
    await expectApplicationFields(page, 'disabled');
    const details = page.getByLabel('Additional details');
    const preview = page.getByText('Cover letter 3');
    const detailsBox = await details.boundingBox();
    const previewBox = await preview.boundingBox();
    if (width < 900) expect(previewBox?.y).toBeGreaterThan(detailsBox?.y ?? 0);
    else expect(previewBox?.x).toBeGreaterThan(detailsBox?.x ?? 0);
    await page.screenshot({
      path: `test-results/responsive-stored-application-${width}.png`,
      fullPage: true,
    });
  });
}

test('stored application scrolls its letter except on phones', async ({ page }) => {
  const letterPrefix = `Scrollable marker ${'Long application text. '.repeat(300)}`;
  const path = '/applications/00000000-0000-4000-8000-000000000001';
  await seedApplications(page, 1, letterPrefix);

  for (const width of [600, 768, 1024]) {
    await page.setViewportSize({ height: 500, width });
    await page.goto(path, { waitUntil: 'networkidle' });
    const letter = page.getByText('Scrollable marker', { exact: false });
    const panel = page.locator('main section').filter({ has: letter });
    const mainBox = await page.locator('main').boundingBox();
    const panelBox = await panel.boundingBox();
    const availableHeight = 500 - (mainBox?.y ?? 0);
    await expect(letter).toBeVisible();
    expect(panelBox?.height).toBeLessThanOrEqual(availableHeight + 1);
    await expect(letter).toHaveCSS('overflow-y', 'auto');
    expect(await letter.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
      true,
    );
    await expect(panel.getByRole('button', { name: 'Copy to clipboard' })).toHaveCount(1);
  }

  await page.setViewportSize({ height: 900, width: 1024 });
  await page.goto(path, { waitUntil: 'networkidle' });
  const desktopLetter = page.getByText('Scrollable marker', { exact: false });
  const desktopSections = page.locator('main section');
  await expect(desktopLetter).toBeVisible();
  const primaryBox = await desktopSections.first().boundingBox();
  const desktopPanelBox = await desktopSections.filter({ has: desktopLetter }).boundingBox();
  expect(desktopPanelBox?.height).toBeLessThanOrEqual((primaryBox?.height ?? 0) + 1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight === document.documentElement.clientHeight,
    ),
  ).toBe(true);

  await openResponsivePage(page, 375, path);
  const phoneLetter = page.getByText('Scrollable marker', { exact: false });
  const phonePanel = page.locator('main section').filter({ has: phoneLetter });
  const copyButtons = phonePanel.getByRole('button', { name: 'Copy to clipboard' });
  await expect(phoneLetter).toBeVisible();
  await expect(phoneLetter).toHaveCSS('overflow-y', 'visible');
  expect(
    await phoneLetter.evaluate((element) => element.scrollHeight === element.clientHeight),
  ).toBe(true);
  await expect(copyButtons).toHaveCount(2);
  const firstCopyBox = await copyButtons.first().boundingBox();
  const letterBox = await phoneLetter.boundingBox();
  const lastCopyBox = await copyButtons.last().boundingBox();
  expect(firstCopyBox?.y).toBeLessThan(letterBox?.y ?? 0);
  expect(lastCopyBox?.y).toBeGreaterThan(letterBox?.y ?? Number.POSITIVE_INFINITY);
});
