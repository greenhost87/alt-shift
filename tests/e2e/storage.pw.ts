import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'variant-cover-letters:v1';

test('deleted applications stay deleted after reload and synchronize across tabs', async ({
  context,
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(3);

  const secondPage = await context.newPage();
  await secondPage.goto('/');
  await expect(secondPage.getByRole('button', { name: 'Delete' })).toHaveCount(3);

  await page.getByRole('button', { name: 'Delete' }).first().click();

  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(2);
  await expect(secondPage.getByRole('button', { name: 'Delete' })).toHaveCount(2);

  await page.getByRole('button', { name: 'Delete' }).first().click();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(1);
  await expect(secondPage.getByRole('button', { name: 'Delete' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Delete' }).click();

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
  await expect(page.getByRole('heading', { name: 'No applications yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  await expect(page.getByText('0/5 applications generated')).toBeVisible();

  await page.getByRole('button', { name: 'Create your first application' }).click();
  await expect(page).toHaveURL(/\/applications\/new$/);
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
    { key: STORAGE_KEY },
  );

  await page.goto('/');

  await expect(page.getByText('A persisted cover letter')).toBeVisible();
  await expect(page.getByText('1/5 applications generated')).toBeVisible();
});

test('rejects invalid stored data without overwriting it', async ({ page }) => {
  const invalidValue = '{"version":2,"applications":[]}';
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: invalidValue },
  );

  await page.goto('/');

  await expect(page.getByRole('alert')).toContainText('stored data was left unchanged');
  await expect(page.getByRole('heading', { name: 'No applications yet' })).toHaveCount(0);
  const storedValue = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  expect(storedValue).toBe(invalidValue);
});
