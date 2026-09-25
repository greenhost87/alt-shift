import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openSubscriptionModal, seedApplications } from '../support/applications';
import {
  expectContentFitsViewport,
  expectDialogFitsViewport,
  expectPageWidth,
  openResponsivePage,
  RESPONSIVE_WIDTHS,
} from '../support/viewport';

async function openSeededMobilePage(page: Page, path: string) {
  await page.setViewportSize({ height: 568, width: 320 });
  await seedApplications(page);
  await page.goto(path, { waitUntil: 'networkidle' });
}

function getGoalBanner(page: Page) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Hit your goal' }),
  });
}

test('desktop primitives match the design geometry and typography', async ({ page }) => {
  await page.setViewportSize({ height: 1300, width: 1440 });
  await seedApplications(page);
  await page.goto('/applications', { waitUntil: 'networkidle' });

  const myLetters = page.getByRole('link', { name: 'My letters' });
  await expect(myLetters).toHaveAccessibleName('My letters');
  await expect(myLetters).toHaveAttribute('href', '/applications');
  await expect(myLetters.getByText('My letters')).toBeVisible();

  const mainBox = await page.locator('main').boundingBox();
  expect(mainBox?.x).toBe(160);
  expect(mainBox?.y).toBe(112);
  expect(mainBox?.width).toBe(1120);

  const banner = getGoalBanner(page);
  await expect(banner).toHaveCSS('padding', '48px 64px');

  const card = page.locator('article').first();
  const cardBox = await card.boundingBox();
  const letterBox = await card.locator('p').boundingBox();
  expect(cardBox?.height).toBe(240);
  expect(letterBox?.y).toBe((cardBox?.y ?? 0) + 24);
  expect(letterBox?.height).toBe(152);
  await expect(card.getByRole('heading')).toHaveCount(0);
  await expect(card.locator('time')).toHaveCount(0);
  const copyIcon = card.getByRole('button', { name: 'Copy to clipboard' }).locator('svg');
  const iconBox = await copyIcon.boundingBox();
  const contourBox = await copyIcon.evaluate((svg) => {
    if (!(svg instanceof SVGSVGElement)) throw new Error('Expected an SVG icon');
    const box = svg.getBBox();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
  expect(iconBox).toMatchObject({ width: 20, height: 20 });
  expect(contourBox.width).toBeCloseTo(16.66667, 2);
  expect(contourBox.height).toBeCloseTo(16.66667, 2);
  expect(contourBox.x).toBeCloseTo(1.66667, 2);
  expect(contourBox.y).toBeCloseTo(1.66667, 2);

  await page.goto('/applications/new', { waitUntil: 'networkidle' });

  const jobTitle = page.getByLabel('Job title');
  const jobTitleBox = await jobTitle.boundingBox();
  expect(jobTitleBox?.height).toBe(40);
  await expect(jobTitle).toHaveCSS('font-size', '16px');

  const jobTitleLabel = page.locator('label[for="job-title"]');
  await expect(jobTitleLabel).toHaveCSS('font-size', '14px');
  await expect(jobTitleLabel).toHaveCSS('font-weight', '500');

  const detailsField = page.getByLabel('Additional details');
  const detailsBox = await detailsField.boundingBox();
  expect(detailsBox?.height).toBe(236);

  const describedBy = await detailsField.getAttribute('aria-describedby');
  if (describedBy === null) throw new Error('Expected the details field to describe its caption.');
  const caption = page.locator(`#${describedBy}`);
  await expect(caption).toHaveCSS('font-size', '14px');
  await expect(caption).toHaveCSS('line-height', '20px');
  await expect(caption).toHaveCSS('margin-top', '6px');
  const captionBox = await caption.boundingBox();

  const generateBox = await page.getByRole('button', { name: 'Generate Now' }).boundingBox();
  expect(generateBox?.height).toBe(60);
  expect(generateBox?.y).toBe((captionBox?.y ?? 0) + (captionBox?.height ?? 0) + 16);
});

async function expectMobileStatusLayout(page: Page) {
  const brand = await page.getByAltText('Alt+Shift').boundingBox();
  const home = await page.getByRole('link', { name: 'My letters' }).boundingBox();
  const status = page.getByText('0/5 applications generated');
  const label = await status.boundingBox();
  const progress = await page
    .locator('header')
    .getByRole('progressbar')
    .locator('..')
    .boundingBox();
  expect(home?.y).toBe(brand?.y);
  expect(label?.y).toBeGreaterThanOrEqual((home?.y ?? 0) + (home?.height ?? 0));
  expect(progress?.x).toBeGreaterThanOrEqual((label?.x ?? 0) + (label?.width ?? 0));
  expect(
    Math.abs(
      (progress?.y ?? 0) + (progress?.height ?? 0) / 2 - (label?.y ?? 0) - (label?.height ?? 0) / 2,
    ),
  ).toBeLessThanOrEqual(1);
}

for (const width of RESPONSIVE_WIDTHS) {
  test(`responsive screens fit at ${width}px`, async ({ page }) => {
    await openResponsivePage(page, width, '/applications');
    await expectPageWidth(page, width);
    if (width < 768) await expectMobileStatusLayout(page);
    await expect(page.getByRole('heading', { name: 'No applications yet' })).toBeVisible();
    await expectPageWidth(page, width);
    await page.getByRole('button', { name: 'Create your first application' }).click();
    await page.getByLabel('Job title').fill('Engineering'.repeat(20));
    await page.getByLabel('Company').fill('Company'.repeat(20));
    await expectPageWidth(page, width);
    await expect(page.getByRole('button', { name: 'Copy to clipboard' })).toBeVisible();
    await page.screenshot({
      path: `test-results/responsive-generator-${width}.png`,
      fullPage: true,
    });
    await page.getByRole('link', { name: 'My letters' }).click();
    await page.screenshot({ path: `test-results/responsive-empty-${width}.png`, fullPage: true });
  });
}

test('mobile actions have touch targets of at least 44 pixels', async ({ page }) => {
  await page.setViewportSize({ height: 812, width: 375 });
  await page.goto('/applications', { waitUntil: 'networkidle' });

  await expectContentFitsViewport(page);
});

test('subscription modal fits at 320 pixels without overlapping its close action', async ({
  page,
}) => {
  await page.setViewportSize({ height: 568, width: 320 });
  await seedApplications(page, 5);
  await page.goto('/applications', { waitUntil: 'networkidle' });

  const modal = await openSubscriptionModal(page);
  await expectDialogFitsViewport(
    page,
    modal,
    modal.getByRole('button', { name: 'Close' }),
    modal.getByRole('heading', { name: 'Unlock unlimited applications' }),
  );
});

test('dashboard uses the compact layout at 320 pixels', async ({ page }) => {
  await openSeededMobilePage(page, '/applications');

  await expectContentFitsViewport(page);

  const mainBox = await page.locator('main').boundingBox();
  expect(mainBox?.x).toBe(12);
  expect(mainBox?.width).toBe(296);

  const brandBox = await page.getByAltText('Alt+Shift').boundingBox();
  const homeBox = await page.getByRole('link', { name: 'My letters' }).boundingBox();
  const statusBox = await page.getByText('3/5 applications generated').boundingBox();
  expect(brandBox?.width).toBe(128);
  expect(homeBox?.y).toBe(brandBox?.y);
  expect(statusBox?.y).toBeGreaterThanOrEqual((brandBox?.y ?? 0) + (brandBox?.height ?? 0));

  const applicationsHeadingBox = await page
    .getByRole('heading', { name: 'Applications', exact: true })
    .boundingBox();
  const headerCreateBox = await page
    .getByRole('button', { name: 'Create New' })
    .first()
    .boundingBox();
  expect(headerCreateBox?.y).toBeGreaterThanOrEqual(
    (applicationsHeadingBox?.y ?? 0) + (applicationsHeadingBox?.height ?? 0),
  );
  expect(headerCreateBox?.width).toBe(mainBox?.width);

  const cards = page.locator('article');
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveCSS('height', '220px');
  expect((await cards.nth(1).boundingBox())?.y).toBeGreaterThan(
    (await cards.first().boundingBox())?.y ?? 0,
  );

  const banner = getGoalBanner(page);
  await expect(banner).toHaveCSS('padding', '32px 16px');
  await expect(banner.getByRole('heading', { name: 'Hit your goal' })).toHaveCSS(
    'font-size',
    '32px',
  );
  const bannerActionBox = await banner.getByRole('button', { name: 'Create New' }).boundingBox();
  const bannerHeadingBox = await banner
    .getByRole('heading', { name: 'Hit your goal' })
    .boundingBox();
  expect(bannerActionBox?.width).toBe(264);
  expect(bannerActionBox?.y).toBeGreaterThan(
    (bannerHeadingBox?.y ?? 0) + (bannerHeadingBox?.height ?? 0),
  );

  await page.evaluate(() => {
    localStorage.setItem(
      'variant-cover-letters:v1',
      JSON.stringify({ applications: [], version: 1 }),
    );
  });
  await page.reload({ waitUntil: 'networkidle' });

  const emptyState = page.getByRole('heading', { name: 'No applications yet' }).locator('../..');
  await expect(emptyState).toHaveCSS('min-height', '240px');
  await expectContentFitsViewport(page);
});

test('generator uses the compact layout at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ height: 568, width: 320 });
  await page.goto('/applications/new', { waitUntil: 'networkidle' });

  await expectContentFitsViewport(page);

  const title = page.getByRole('heading', { name: 'New application' });
  await expect(title).toHaveCSS('font-size', '28px');

  const jobTitleBox = await page.getByLabel('Job title').boundingBox();
  const companyBox = await page.getByLabel('Company').boundingBox();
  expect(companyBox?.y).toBeGreaterThanOrEqual((jobTitleBox?.y ?? 0) + (jobTitleBox?.height ?? 0));

  const details = page.getByLabel('Additional details');
  await expect(details).toHaveCSS('min-height', '200px');
  expect((await details.boundingBox())?.height).toBe(200);

  const generateBox = await page.getByRole('button', { name: 'Generate Now' }).boundingBox();
  const previewBox = await page
    .getByText('Your personalized job application will appear here...')
    .boundingBox();
  expect(previewBox?.y).toBeGreaterThan((generateBox?.y ?? 0) + (generateBox?.height ?? 0));
});
