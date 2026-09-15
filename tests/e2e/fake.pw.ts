import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  expectApplicationFields,
  expectApplicationProgress,
  expectBlankGenerator,
  expectGoalBannerHidden,
} from '../support/applications';

async function fillApplication(page: Page) {
  await page.getByLabel('Job title').fill('Test Engineer');
  await page.getByLabel('Company').fill('Local Company');
  await page.getByLabel('I am good at...').fill('Testing');
  await page.getByLabel('Additional details').fill('This request must stay local.');
}

async function expectFakeLetter(page: Page) {
  await expect(page.getByText('no LLM request was made', { exact: false })).toBeVisible();
}

async function generateFakeApplication(page: Page) {
  await page.goto('/fake', { waitUntil: 'networkidle' });
  await fillApplication(page);
  await page.getByRole('button', { name: 'Generate Now' }).click();
  await expectFakeLetter(page);
}

test('generates, saves, and synchronizes a local result without requesting the LLM endpoint', async ({
  context,
  page,
}) => {
  let llmRequestCount = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/generate') llmRequestCount += 1;
  });
  const dashboardPage = await context.newPage();
  await dashboardPage.goto('/', { waitUntil: 'networkidle' });
  await generateFakeApplication(page);
  expect(llmRequestCount).toBe(0);
  await expectApplicationProgress(dashboardPage, 1);
  await page.getByRole('button', { name: 'Home' }).click();
  await expectApplicationProgress(page, 1);
});

test('requires every field, submits with the keyboard, and generates again', async ({ page }) => {
  await page.goto('/fake', { waitUntil: 'networkidle' });
  const generate = page.getByRole('button', { name: 'Generate Now' });

  await expect(generate).toBeDisabled();
  await page.getByLabel('Job title').fill('Test Engineer');
  await expect(page.getByRole('heading', { name: 'New application' })).toBeVisible();
  await expect(generate).toBeDisabled();
  await page.getByLabel('Company').fill('Local Company');
  await expect(page.getByRole('heading', { name: 'Test Engineer, Local Company' })).toBeVisible();
  await expect(generate).toBeDisabled();
  await page.getByLabel('I am good at...').fill('Testing');
  await expect(generate).toBeDisabled();
  await page.getByLabel('Additional details').fill('This request must stay local.');
  await expect(generate).toBeEnabled();
  await page.getByLabel('I am good at...').fill('   ');
  await expect(generate).toBeDisabled();
  await page.getByLabel('I am good at...').fill('Testing');

  await page.getByLabel('I am good at...').press('Enter');
  await expectFakeLetter(page);
  await expect(page.getByText('1/5 applications generated')).toBeVisible();

  await page.getByRole('button', { name: 'Try Again' }).click();
  await expect(page.getByText('2/5 applications generated')).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).click();
  await expectApplicationProgress(page, 2);
});

test('starts a blank application from the completed goal banner', async ({ page }) => {
  await generateFakeApplication(page);

  await page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Hit your goal' }) })
    .getByRole('button', { name: 'Create New' })
    .click();

  await expectApplicationFields(page, 'empty');
  await expectBlankGenerator(page);
  await expectGoalBannerHidden(page, 1);
});
