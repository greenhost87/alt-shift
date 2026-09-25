import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import {
  clearApplicationFields,
  expectBlankGenerator,
  expectRequiredFieldMessages,
  fillApplicationFields,
  gotoNewApplication,
} from '../support/applications';
import {
  holdGenerationStream,
  installGenerationBrowserFixtures,
  useDelayedCopyableStream,
} from '../support/generation-browser';
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

test('empty preview disables its copy action without copying placeholder text', async ({
  page,
}) => {
  await rejectClipboardWrites(page, 0);
  await gotoNewApplication(page);
  await clearApplicationFields(page);
  await expectBlankGenerator(page);
  await expectRequiredFieldMessages(page, 4);
  const copy = page.getByRole('button', { name: 'Copy to clipboard' });
  await expect(copy).toBeVisible();
  await expect(copy).toBeDisabled();
  await expect(copy).not.toBeFocused();
  await copy.focus();
  await expect(copy).not.toBeFocused();
  await expectRequiredFieldMessages(page, 4);
});

test('textarea exposes the over-limit error state without truncating input', async ({ page }) => {
  await installGenerationBrowserFixtures(page);
  const releaseGeneration = await holdGenerationStream(page);
  await useDelayedCopyableStream(page);
  await page.goto('/applications/new', { waitUntil: 'networkidle' });

  const details = page.getByLabel('Additional details');
  const generate = page.locator('button[type="submit"]');
  const overLimitValue = 'a'.repeat(1201);

  await fillApplicationFields(page);
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
  const restingBox = await generate.boundingBox();

  await generate.click();
  await expect(generate).toHaveAttribute('aria-busy', 'true');
  await expect(generate).toHaveAccessibleName('Generate Now, loading');
  await expect(generate).toBeDisabled();
  const loadingBox = await generate.boundingBox();
  expect(loadingBox?.height).toBe(60);
  expect(loadingBox?.height).toBe(restingBox?.height);
  await expect(page.getByRole('button', { name: 'Cancel generation' })).toHaveCount(0);
  releaseGeneration();
});

for (const { label, limit, fieldId } of [
  { label: 'Job title', limit: 200, fieldId: 'job-title' },
  { label: 'Company', limit: 200, fieldId: 'company' },
  { label: 'I am good at...', limit: 2_000, fieldId: 'strengths' },
]) {
  test(`${label} exposes an error when its character limit is exceeded`, async ({ page }) => {
    await page.goto('/applications/new', { waitUntil: 'networkidle' });
    await fillApplicationFields(page);
    const field = page.getByLabel(label, { exact: true });
    const generate = page.getByRole('button', { name: 'Generate Now' });
    const overLimitValue = 'a'.repeat(limit + 1);

    await field.fill(overLimitValue);

    const lengthAlert = page.locator(`#${fieldId}-error`);
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
