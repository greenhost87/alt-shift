import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  APPLICATION_STORAGE_KEY,
  createApplicationFixtures,
  expectApplicationProgress,
  seedApplications,
} from '../support/applications';
import { rejectClipboardWrites } from '../support/clipboard';

async function openDashboard(page: Page, applicationCount: number) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(applicationCount);
}

async function expectEmptyDashboard(page: Page) {
  await expect(page.getByRole('heading', { name: 'No applications yet' })).toBeVisible();
  await expectApplicationProgress(page, 0);
}

test('fresh browser storage starts with an empty dashboard', async ({ page }) => {
  await openDashboard(page, 0);

  await expectEmptyDashboard(page);
});

test('deleted applications stay deleted after reload and synchronize across tabs', async ({
  context,
  page,
}) => {
  await seedApplications(page);
  await openDashboard(page, 3);

  const secondPage = await context.newPage();
  await openDashboard(secondPage, 3);

  for (const applicationCount of [2, 1]) {
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm deletion' }).click();
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(applicationCount);
    await expect(secondPage.getByRole('button', { name: 'Delete' })).toHaveCount(applicationCount);
  }

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm deletion' }).click();

  for (const dashboardPage of [page, secondPage]) {
    await expect(dashboardPage.getByRole('heading', { name: 'No applications yet' })).toBeVisible();
    await expect(
      dashboardPage.getByRole('button', { name: 'Create your first application' }),
    ).toBeVisible();
    await expect(dashboardPage.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(dashboardPage.getByRole('button', { name: 'Copy to clipboard' })).toHaveCount(0);
    await expect(
      dashboardPage.getByRole('heading', { name: 'Applications', exact: true }),
    ).toBeVisible();
    await expect(dashboardPage.getByRole('heading', { name: 'Hit your goal' })).toBeVisible();
    await expect(dashboardPage.getByText('0/5 applications generated')).toBeVisible();
  }

  await page.reload();
  await expectEmptyDashboard(page);

  await page.getByRole('button', { name: 'Create your first application' }).click();
  await expect(page).toHaveURL(/\/applications\/new$/);
});

test('opens a stored application with its generation details', async ({ page }) => {
  await seedApplications(page);
  await openDashboard(page, 3);

  await page.getByRole('link', { name: 'Open application for Role 3 at Company 3' }).click();

  await expect(page).toHaveURL(/\/applications\/00000000-0000-4000-8000-000000000003$/);
  await expect(page.getByRole('heading', { name: 'Role 3, Company 3' })).toBeVisible();
  await expect(page.getByLabel('Job title')).toHaveValue('Role 3');
  await expect(page.getByLabel('Company')).toHaveValue('Company 3');
  await expect(page.getByLabel('I am good at...')).toHaveValue('Strengths 3');
  await expect(page.getByLabel('Additional details')).toHaveValue('Details 3');
  await expect(page.getByText('Cover letter 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate Now' })).toHaveCount(0);
});

test('deletion can be cancelled without changing stored applications', async ({ page }) => {
  await seedApplications(page);
  await openDashboard(page, 3);
  for (const dismissal of ['button', 'escape']) {
    await page.getByRole('button', { name: 'Delete' }).first().click();
    const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
    await expect(cancel).toBeEnabled();
    if (dismissal === 'button') await cancel.click();
    else await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  }
  await page.reload();
  await expectApplicationProgress(page, 3);
});

async function copyStoredApplication(page: Page, failures: number) {
  await rejectClipboardWrites(page, failures);
  await seedApplications(page);
  await openDashboard(page, 3);
  await page.getByRole('button', { name: 'Copy to clipboard' }).first().click();
}

test('shows temporary feedback after copying an application', async ({ page }) => {
  await copyStoredApplication(page, 0);
  await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy to clipboard' })).toHaveCount(3);
});

test('reports clipboard rejection without changing dashboard applications', async ({ page }) => {
  await copyStoredApplication(page, 1);

  await expect(page.getByRole('alert')).toContainText('could not be copied to the clipboard');
  await expectApplicationProgress(page, 3);
});

test('contains localStorage initialization failures and displays a warning', async ({ page }) => {
  await page.addInitScript((storageKey) => {
    const nativeGetItem = Storage.prototype.getItem.bind(localStorage);
    Storage.prototype.getItem = function (key) {
      if (key === storageKey) throw new DOMException('Storage unavailable', 'SecurityError');
      return nativeGetItem(key);
    };
  }, APPLICATION_STORAGE_KEY);

  await openDashboard(page, 0);

  await expect(page.getByRole('alert')).toContainText('Browser storage is unavailable');
  await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible();
  await expectApplicationProgress(page, 0);
});

test('restores valid versioned applications created in the browser', async ({ page }) => {
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          applications: [
            {
              id: 'b12e8f4c-ea95-42cc-9e48-41fd1d29a977',
              company: 'Variant',
              role: 'Engineer',
              letter: 'A persisted cover letter',
              createdAt: '2025-01-02T03:04:05.000Z',
            },
          ],
        }),
      );
    },
    { key: APPLICATION_STORAGE_KEY },
  );

  await page.goto('/');

  await expect(page.getByText('A persisted cover letter')).toBeVisible();
  await expectApplicationProgress(page, 1);
});

test('hides the goal banner after restoring five applications', async ({ page }) => {
  const applications = createApplicationFixtures(5, 'Persisted cover letter');

  await page.addInitScript(
    ({ key, storedApplications }) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, applications: storedApplications }));
    },
    { key: APPLICATION_STORAGE_KEY, storedApplications: applications },
  );

  await openDashboard(page, 5);

  await expect(page.getByRole('heading', { name: 'Hit your goal' })).toHaveCount(0);
});

test('rejects invalid stored data without overwriting it', async ({ page }) => {
  const invalidValue = '{"version":2,"applications":[]}';
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: APPLICATION_STORAGE_KEY, value: invalidValue },
  );

  await page.goto('/');

  await expect(page.getByRole('alert')).toContainText('stored data was left unchanged');
  await expect(page.getByRole('heading', { name: 'No applications yet' })).toHaveCount(0);
  const storedValue = await page.evaluate(
    (key) => localStorage.getItem(key),
    APPLICATION_STORAGE_KEY,
  );
  expect(storedValue).toBe(invalidValue);
});
