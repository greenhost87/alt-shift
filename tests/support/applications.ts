import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export const APPLICATION_STORAGE_KEY = 'variant-cover-letters:v1';

export const APPLICATION_FIELD_LABELS = [
  'Job title',
  'Company',
  'I am good at...',
  'Additional details',
] as const;

export type ApplicationFixture = {
  id: string;
  company: string;
  role: string;
  strengths: string;
  details: string;
  letter: string;
  createdAt: string;
};

export function createApplicationFixtures(
  count: number,
  letterPrefix = 'Cover letter',
): ApplicationFixture[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    company: `Company ${index + 1}`,
    role: `Role ${index + 1}`,
    strengths: `Strengths ${index + 1}`,
    details: `Details ${index + 1}`,
    letter: `${letterPrefix} ${index + 1}`,
    createdAt: `2025-01-0${index + 1}T03:04:05.000Z`,
  }));
}

type StoredApplicationsInput = {
  key: string;
  storedApplications: ApplicationFixture[];
};

function writeApplicationsToStorage({ key, storedApplications }: StoredApplicationsInput) {
  localStorage.setItem(key, JSON.stringify({ version: 1, applications: storedApplications }));
}

export async function storeApplications(
  page: Page,
  applications: ApplicationFixture[],
  timing: 'init' | 'now',
) {
  const input = { key: APPLICATION_STORAGE_KEY, storedApplications: applications };
  if (timing === 'init') {
    await page.addInitScript(writeApplicationsToStorage, input);
    return;
  }
  await page.evaluate(writeApplicationsToStorage, input);
}

export async function seedApplications(page: Page, count = 3, letterPrefix = 'Cover letter') {
  await page.addInitScript(
    ({ applications, key }) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify({ version: 1, applications }));
      }
    },
    { applications: createApplicationFixtures(count, letterPrefix), key: APPLICATION_STORAGE_KEY },
  );
}

export async function fillApplicationFields(page: Page) {
  await page.getByLabel('Job title').fill('Test Engineer');
  await page.getByLabel('Company').fill('Local Company');
  await page.getByLabel('I am good at...').fill('Testing');
  await page.getByLabel('Additional details').fill('This request must stay local.');
}

export async function gotoNewApplication(page: Page) {
  await page.goto('/applications/new', { waitUntil: 'networkidle' });
}

export async function gotoDashboard(page: Page) {
  await page.goto('/applications', { waitUntil: 'networkidle' });
}

export function getGenerateButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Generate Now' });
}

async function forEachApplicationField(
  page: Page,
  check: (field: Locator, label: (typeof APPLICATION_FIELD_LABELS)[number]) => Promise<void>,
) {
  for (const label of APPLICATION_FIELD_LABELS) {
    await check(page.getByLabel(label, { exact: true }), label);
  }
}

export async function clearApplicationFields(page: Page) {
  for (const label of APPLICATION_FIELD_LABELS) {
    await page.getByLabel(label, { exact: true }).fill('');
  }
}

export async function expectRequiredFieldMessages(page: Page, count: number) {
  await expect(page.getByText('This field is required.')).toHaveCount(count);
}

export async function expectRequiredFieldState(page: Page) {
  await forEachApplicationField(page, async (field, label) => {
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAttribute('required', '');
    const describedBy = await field.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    if (describedBy === null) throw new Error(`The ${label} field must describe its error.`);
    await expect(page.locator(`#${describedBy}`)).toHaveText('This field is required.');
  });
}

export async function expectGeneratingFieldsDisabled(page: Page) {
  await forEachApplicationField(page, async (field) => {
    await expect(field).toBeDisabled();
    await expect(field).toHaveCSS('background-color', 'rgb(242, 244, 247)');
    await expect(field).toHaveCSS('border-color', 'rgb(208, 213, 221)');
    await expect(field).toHaveCSS('box-shadow', 'none');
    await expect(field).toHaveCSS('color', 'rgb(152, 162, 179)');
  });
}

export async function submitApplicationForm(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
  await fillApplicationFields(page);
  await page.getByRole('button', { name: 'Generate Now' }).click();
}

export async function openDashboardAndExpectProgress(page: Page, applicationCount: number) {
  await page.getByRole('link', { name: 'My letters' }).click();
  await expectApplicationProgress(page, applicationCount);
}

export async function navigateHome(page: Page) {
  const home = page.getByRole('link', { name: 'My letters' });
  await home.focus();
  await home.press('Enter');
  await expect(page).toHaveURL('/applications');
}

export async function openSubscriptionModal(page: Page): Promise<Locator> {
  const subscribe = page.getByRole('button', { name: 'Subscribe' });
  await expect(subscribe).toBeEnabled();
  await subscribe.click();
  const modal = page.getByRole('dialog', { name: 'Unlock unlimited applications' });
  await expect(modal).toBeVisible();
  return modal;
}

export async function expectApplicationProgress(page: Page, applicationCount: number) {
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(applicationCount);
  await expect(page.getByText(`${applicationCount}/5 applications generated`)).toBeVisible();
}

export async function expectApplicationFields(page: Page, state: 'disabled' | 'empty') {
  for (const label of APPLICATION_FIELD_LABELS) {
    const field = page.getByLabel(label, { exact: true });
    if (state === 'disabled') await expect(field).toBeDisabled();
    else await expect(field).toHaveValue('');
  }
}

export async function expectGoalBannerHidden(page: Page, applicationCount: number) {
  await expect(page.getByRole('heading', { name: 'Hit your goal' })).toHaveCount(0);
  await expect(page.getByText(`${applicationCount}/5 applications generated`)).toBeVisible();
}

export async function expectBlankGenerator(page: Page) {
  await expect(page.getByRole('heading', { name: 'New application' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate Now' })).toBeDisabled();
  await expect(
    page.getByText('Your personalized job application will appear here...'),
  ).toBeVisible();
}
