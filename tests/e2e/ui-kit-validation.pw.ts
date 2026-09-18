import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { expectBlankGenerator } from '../support/applications';
import { rejectClipboardWrites } from '../support/clipboard';

type LengthErrorOptions = {
  field: Locator;
  generate: Locator;
  lengthAlert: Locator;
  message: string;
  value: string;
};

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
