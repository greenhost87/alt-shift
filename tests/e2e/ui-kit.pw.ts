import { expect, test } from '@playwright/test';

test('desktop primitives match the design geometry and typography', async ({ page }) => {
  await page.setViewportSize({ height: 1300, width: 1440 });
  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.getByRole('button', { name: 'Home' })).toHaveAccessibleName('Home');

  const mainBox = await page.locator('main').boundingBox();
  expect(mainBox?.x).toBe(160);
  expect(mainBox?.y).toBe(112);
  expect(mainBox?.width).toBe(1120);

  const banner = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Hit your goal' }),
  });
  await expect(banner).toHaveCSS('padding', '54px 64px');

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
});

test('textarea exposes the over-limit error state without truncating input', async ({ page }) => {
  await page.goto('/applications/new', { waitUntil: 'networkidle' });

  const details = page.getByLabel('Additional details');
  const generate = page.getByRole('button', { name: 'Generate Now' });
  const overLimitValue = 'a'.repeat(1201);

  await details.fill(overLimitValue);

  await expect(details).toHaveValue(overLimitValue);
  await expect(details).toHaveAttribute('aria-invalid', 'true');
  const lengthAlert = page.getByRole('alert');
  await expect(lengthAlert).toHaveText('1201/1200');
  const lengthAlertId = await lengthAlert.getAttribute('id');
  expect(lengthAlertId).toBeTruthy();
  await expect(details).toHaveAttribute('aria-describedby', lengthAlertId!);
  await expect(generate).toBeDisabled();

  await details.fill(overLimitValue.slice(0, 1200));
  await expect(details).toHaveValue(overLimitValue.slice(0, 1200));
  await expect(details).toHaveAttribute('aria-invalid', 'false');
  await expect(lengthAlert).toHaveCount(0);
  const boundaryDescriptionId = await details.getAttribute('aria-describedby');
  expect(boundaryDescriptionId).toBeTruthy();
  expect(boundaryDescriptionId).not.toBe(lengthAlertId);
  await expect(page.locator(`#${boundaryDescriptionId}`)).toHaveText('1200/1200');
  await expect(generate).toBeEnabled();

  await generate.click();
  await expect(generate).toHaveAttribute('aria-busy', 'true');
  await expect(generate).toHaveAccessibleName('Generate Now, loading');
  await expect(generate).toBeDisabled();
});

test('mobile actions have touch targets of at least 44 pixels', async ({ page }) => {
  await page.setViewportSize({ height: 812, width: 375 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const actions = page.getByRole('button');
  const actionCount = await actions.count();

  for (let index = 0; index < actionCount; index += 1) {
    const box = await actions.nth(index).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
});
