import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  APPLICATION_STORAGE_KEY,
  createApplicationFixtures,
  expectApplicationFields,
  expectApplicationProgress,
  expectBlankGenerator,
  expectGoalBannerHidden,
  openSubscriptionModal,
  seedApplications,
  storeApplications,
} from '../support/applications';
import { expectSuccessfulCopy, rejectClipboardWrites } from '../support/clipboard';
import { expectCookie } from '../support/cookies';
import {
  cancelDeletion,
  confirmDeletion,
  escapeDeletion,
  openDeletionDialog,
} from '../support/dialog';

async function openDashboard(page: Page, applicationCount: number) {
  await page.goto('/applications');
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(applicationCount);
}

async function setApplicationCountCookie(page: Page, count: number) {
  await page
    .context()
    .addCookies([{ name: 'ALT_SHIFT_APPLICATION_COUNT', value: String(count), url: page.url() }]);
}

async function expectServerRenderedProgress(page: Page, expectedProgress: string) {
  const response = await page.context().request.get('/');
  expect(await response.text()).toContain(expectedProgress);
}

async function expectEmptyDashboard(page: Page) {
  await expect(page.getByRole('heading', { name: 'No applications yet' })).toBeVisible();
  await expectApplicationProgress(page, 0);
}

async function expectApplicationPage(page: Page, url: RegExp, heading: string) {
  await expect(page).toHaveURL(url);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
}

async function expectStorageWarningOnApplicationPage(page: Page, message: string) {
  await page.goto('/applications/00000000-0000-4000-8000-000000000001');
  await expect(page.getByRole('alert')).toContainText(message);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toHaveCount(0);
}

async function expectSubscriptionRequired(page: Page) {
  await expectApplicationFields(page, 'disabled');
  await expect(page.getByRole('button', { name: 'Subscribe' })).toBeEnabled();
}

test('fresh browser storage starts with an empty dashboard', async ({ page }) => {
  await openDashboard(page, 0);

  await expectEmptyDashboard(page);
});

test('synchronizes deleted applications across tabs', async ({ context, page }) => {
  await seedApplications(page, 1);
  await openDashboard(page, 1);

  const secondPage = await context.newPage();
  await openDashboard(secondPage, 1);

  const dialog = await openDeletionDialog(page);
  await confirmDeletion(dialog);

  for (const dashboardPage of [page, secondPage]) {
    await expectEmptyDashboard(dashboardPage);
  }
});

test('deleted applications stay deleted after reload', async ({ page }) => {
  await seedApplications(page, 1);
  await openDashboard(page, 1);

  const dialog = await openDeletionDialog(page);
  await confirmDeletion(dialog);
  await page.reload();
  await expectEmptyDashboard(page);

  await page.getByRole('button', { name: 'Create your first application' }).click();
  await expect(page).toHaveURL(/\/applications\/new$/);
});

test('deletion dialog actions work when reduced motion disables transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedApplications(page);
  await openDashboard(page, 3);

  const cancelledDialog = await openDeletionDialog(page);
  await cancelledDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(cancelledDialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(3);

  const confirmedDialog = await openDeletionDialog(page);
  await confirmDeletion(confirmedDialog);
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(2);
});

for (const [entryPoint, index] of [
  ['header', 0],
  ['goal banner', 1],
] as const) {
  test(`opens the generator from the dashboard ${entryPoint}`, async ({ page }) => {
    await seedApplications(page);
    await openDashboard(page, 3);

    const createButtons = page.getByRole('button', { name: 'Create New' });
    await expect(createButtons).toHaveCount(2);
    await createButtons.nth(index).click();

    await expectApplicationPage(page, /\/applications\/new$/, 'New application');
  });
}

test('opens a stored application with read-only details, copy, and Home navigation', async ({
  page,
}) => {
  await rejectClipboardWrites(page, 0);
  await seedApplications(page);
  await openDashboard(page, 3);
  await expect(
    page.getByRole('link').filter({ hasText: 'Cover letter' }).first(),
  ).toHaveAccessibleName('Open application for Role 3 at Company 3');

  await page.getByRole('link', { name: 'Open application for Role 3 at Company 3' }).click();

  await expectApplicationPage(
    page,
    /\/applications\/00000000-0000-4000-8000-000000000003$/,
    'Role 3, Company 3',
  );
  for (const [label, value] of [
    ['Job title', 'Role 3'],
    ['Company', 'Company 3'],
    ['I am good at...', 'Strengths 3'],
    ['Additional details', 'Details 3'],
  ] as const) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    await expect(page.getByLabel(label, { exact: true })).toBeDisabled();
  }
  await expect(page.getByText('Cover letter 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate Now' })).toHaveCount(0);
  await expectSuccessfulCopy(page);

  await page.getByRole('link', { name: 'My letters' }).click();
  await expect(page).toHaveURL('/applications');
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(3);
});

test('starts a blank application from a stored application', async ({ page }) => {
  await seedApplications(page);
  await page.goto('/applications/00000000-0000-4000-8000-000000000003');

  await page.getByRole('button', { name: 'Try Again' }).click();

  await expect(page).toHaveURL(/\/applications\/new$/);
  await expectBlankGenerator(page);
});

test('deletion can be cancelled without changing stored applications', async ({ page }) => {
  await seedApplications(page);
  await openDashboard(page, 3);
  for (const dismissal of ['button', 'escape']) {
    const dialog = await openDeletionDialog(page);
    await expect(dialog).toContainText(
      'This application will be permanently deleted. This action cannot be undone.',
    );
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
    await expect(cancel).toBeEnabled();
    if (dismissal === 'button') await cancelDeletion(dialog);
    else await escapeDeletion(page);
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
  const copy = page.locator('article').first().getByRole('button').last();
  await expect(copy).toHaveAccessibleName('Copied!');
  await expect(page.getByRole('button', { name: 'Copy to clipboard' })).toHaveCount(3);
  await expect(copy).toHaveAccessibleName('Copy to clipboard');
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

  await expectStorageWarningOnApplicationPage(page, 'Browser storage is unavailable');
});

test('stores and caps the application count for the next server render', async ({ page }) => {
  await seedApplications(page);
  await openDashboard(page, 3);

  await expectCookie(page.context(), 'ALT_SHIFT_APPLICATION_COUNT', '3');

  await expectServerRenderedProgress(page, '3/5 applications generated');

  await setApplicationCountCookie(page, 6);
  await expectServerRenderedProgress(page, '5/5 applications generated');
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

  await page.goto('/applications');

  await expect(page.getByText('A persisted cover letter')).toBeVisible();
  await expectApplicationProgress(page, 1);

  await page.goto('/applications/b12e8f4c-ea95-42cc-9e48-41fd1d29a977');
  const tryAgain = page.getByRole('button', { name: 'Try Again' });
  await expect(tryAgain).toBeEnabled();
  await tryAgain.click();
  await expect(page).toHaveURL(/\/applications\/new$/);
});

test('offers a subscription after restoring five applications', async ({ page }) => {
  const applications = createApplicationFixtures(5, 'Persisted cover letter');

  await storeApplications(page, applications, 'init');

  await openDashboard(page, 5);

  await expectGoalBannerHidden(page, 5);
  await expect(page.locator('header').getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create New' })).toHaveCount(0);
  const subscriptionModal = await openSubscriptionModal(page);
  await subscriptionModal.getByRole('button', { name: 'Close' }).click();
  await expect(subscriptionModal).toBeHidden();
});

test('blocks application forms after all attempts are used', async ({ page }) => {
  await seedApplications(page, 5);

  await page.goto('/applications/new', { waitUntil: 'networkidle' });

  await expectSubscriptionRequired(page);

  await page.goto('/applications/00000000-0000-4000-8000-000000000005');

  await expectSubscriptionRequired(page);
});

test('server-renders a loading status for a stored-application link', async ({ request }) => {
  const response = await request.get('/applications/00000000-0000-4000-8000-000000000001');

  expect(await response.text()).toContain('Loading applications…');
});

test('rejects invalid stored data without overwriting it', async ({ page }) => {
  const invalidValue = '{"version":2,"applications":[]}';
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: APPLICATION_STORAGE_KEY, value: invalidValue },
  );

  await page.goto('/applications');

  await expect(page.getByRole('alert')).toContainText('stored data was left unchanged');
  await setApplicationCountCookie(page, 3);
  await page.reload();
  await expectCookie(page.context(), 'ALT_SHIFT_APPLICATION_COUNT', '0');
  await expectServerRenderedProgress(page, '0/5 applications generated');
  await expect(page.getByRole('heading', { name: 'No applications yet' })).toHaveCount(0);
  const storedValue = await page.evaluate(
    (key) => localStorage.getItem(key),
    APPLICATION_STORAGE_KEY,
  );
  expect(storedValue).toBe(invalidValue);

  await expectStorageWarningOnApplicationPage(page, 'stored data was left unchanged');
});
