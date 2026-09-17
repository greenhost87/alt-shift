import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import {
  expectApplicationFields,
  expectBlankGenerator,
  seedApplications,
} from '../support/applications';
import { rejectClipboardWrites } from '../support/clipboard';

async function expectContentFitsViewport(page: Page) {
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(contentWidth).toBe(viewportWidth);

  const actions = page.getByRole('button');
  const actionCount = await actions.count();
  for (let index = 0; index < actionCount; index += 1) {
    const box = await actions.nth(index).boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect((box?.x ?? viewportWidth) + (box?.width ?? 1)).toBeLessThanOrEqual(viewportWidth);
  }
}

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

  await expect(page.getByRole('link', { name: 'Home' })).toHaveAccessibleName('Home');

  const mainBox = await page.locator('main').boundingBox();
  expect(mainBox?.x).toBe(160);
  expect(mainBox?.y).toBe(112);
  expect(mainBox?.width).toBe(1120);

  const banner = getGoalBanner(page);
  await expect(banner).toHaveCSS('padding', '54px 64px');

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

  const detailsBox = await page.getByLabel('Additional details').boundingBox();
  expect(detailsBox?.height).toBe(236);

  const generateBox = await page.getByRole('button', { name: 'Generate Now' }).boundingBox();
  expect(generateBox?.height).toBe(60);
  expect(generateBox?.y).toBe(652);
  const caption = page.locator('#details-caption');
  await expect(caption).toHaveCSS('font-size', '14px');
  await expect(caption).toHaveCSS('line-height', '20px');
  await expect(caption).toHaveCSS('margin-top', '6px');
  await expect(caption).toHaveCSS('color', 'rgb(71, 84, 103)');
});

async function expectMobileStatusLayout(page: Page) {
  const brand = await page.getByAltText('Alt+Shift').boundingBox();
  const home = await page.getByRole('link', { name: 'Home' }).boundingBox();
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

async function expectPageWidth(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

async function openResponsivePage(page: Page, width: number, path: string) {
  await page.setViewportSize({ height: 900, width });
  await page.goto(path, { waitUntil: 'networkidle' });
}

type LengthErrorOptions = {
  field: Locator;
  generate: Locator;
  lengthAlert: Locator;
  message: string;
  value: string;
};

const RESPONSIVE_WIDTHS = [320, 375, 480, 767, 768, 899, 900, 1024, 1440] as const;

async function expectLengthError(options: LengthErrorOptions) {
  await expect(options.field).toHaveValue(options.value);
  await expect(options.field).toHaveAttribute('aria-invalid', 'true');
  await expect(options.lengthAlert).toHaveText(options.message);
  const errorId = await options.lengthAlert.getAttribute('id');
  expect(errorId).toBeTruthy();
  if (errorId === null) throw new Error('The length alert must have an id.');
  await expect(options.field).toHaveAttribute('aria-describedby', errorId);
  await expect(options.generate).toBeDisabled();
  return errorId;
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
    await page.getByRole('link', { name: 'Home' }).click();
    await page.screenshot({ path: `test-results/responsive-empty-${width}.png`, fullPage: true });
  });
}

test('empty preview retains its copy action without copying placeholder text', async ({ page }) => {
  await rejectClipboardWrites(page, 1);
  await page.goto('/applications/new', { waitUntil: 'networkidle' });
  for (const label of ['Job title', 'Company', 'I am good at...', 'Additional details']) {
    await page.getByLabel(label, { exact: true }).fill('');
  }
  await expectBlankGenerator(page);
  await expect(page.getByText('0/1200')).toBeVisible();
  const copy = page.getByRole('button', { name: 'Copy to clipboard' });
  await expect(copy).toBeVisible();
  await copy.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('textarea exposes the over-limit error state without truncating input', async ({ page }) => {
  await page.goto('/applications/new', { waitUntil: 'networkidle' });

  const details = page.getByLabel('Additional details');
  const generate = page.getByRole('button', { name: 'Generate Now' });
  const overLimitValue = 'a'.repeat(1201);

  await page.getByLabel('Job title').fill('Engineer');
  await page.getByLabel('Company').fill('Variant');
  await page.getByLabel('I am good at...').fill('TypeScript');
  await details.fill(overLimitValue);

  const lengthAlert = page.getByRole('alert');
  const lengthAlertId = await expectLengthError({
    field: details,
    generate,
    lengthAlert,
    message: '1201/1200',
    value: overLimitValue,
  });
  await expect(page.getByRole('button', { name: 'Copy to clipboard' })).toBeVisible();

  await details.fill(overLimitValue.slice(0, 1200));
  await expect(details).toHaveValue(overLimitValue.slice(0, 1200));
  await expect(details).toHaveAttribute('aria-invalid', 'false');
  await expect(lengthAlert).toHaveCount(0);
  const boundaryDescriptionId = await details.getAttribute('aria-describedby');
  expect(boundaryDescriptionId).toBeTruthy();
  expect(boundaryDescriptionId).not.toBe(lengthAlertId);
  if (boundaryDescriptionId === null) throw new Error('The field must have a description.');
  await expect(page.locator(`#${boundaryDescriptionId}`)).toHaveText('1200/1200');
  await expect(generate).toBeEnabled();

  await generate.click();
  await expect(generate).toHaveAttribute('aria-busy', 'true');
  await expect(generate).toHaveAccessibleName('Generate Now, loading');
  await expect(generate).toBeDisabled();
  const loadingBox = await generate.boundingBox();
  expect(loadingBox?.height).toBe(56);
  await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0);
});

for (const { label, limit } of [
  { label: 'Job title', limit: 200 },
  { label: 'Company', limit: 200 },
  { label: 'I am good at...', limit: 2_000 },
]) {
  test(`${label} exposes an error when its character limit is exceeded`, async ({ page }) => {
    await page.goto('/applications/new', { waitUntil: 'networkidle' });
    const field = page.getByLabel(label, { exact: true });
    const generate = page.getByRole('button', { name: 'Generate Now' });
    const overLimitValue = 'a'.repeat(limit + 1);

    await field.fill(overLimitValue);

    const lengthAlert = page.getByRole('alert');
    await expectLengthError({
      field,
      generate,
      lengthAlert,
      message: `${limit + 1}/${limit}`,
      value: overLimitValue,
    });

    await field.fill(overLimitValue.slice(0, limit));
    await expect(field).toHaveAttribute('aria-invalid', 'false');
    await expect(field).not.toHaveAttribute('aria-describedby', /.+/);
    await expect(lengthAlert).toHaveCount(0);
  });
}

test('mobile actions have touch targets of at least 44 pixels', async ({ page }) => {
  await page.setViewportSize({ height: 812, width: 375 });
  await page.goto('/applications', { waitUntil: 'networkidle' });

  await expectContentFitsViewport(page);
});

test('dashboard uses the compact layout at 320 pixels', async ({ page }) => {
  await openSeededMobilePage(page, '/applications');

  await expectContentFitsViewport(page);

  const mainBox = await page.locator('main').boundingBox();
  expect(mainBox?.x).toBe(12);
  expect(mainBox?.width).toBe(296);

  const brandBox = await page.getByAltText('Alt+Shift').boundingBox();
  const homeBox = await page.getByRole('link', { name: 'Home' }).boundingBox();
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
