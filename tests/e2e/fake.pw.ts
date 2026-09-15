import { expect, test } from '@playwright/test';

test('generates and saves a local result without requesting the LLM endpoint', async ({ page }) => {
  let llmRequestCount = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/generate') llmRequestCount += 1;
  });
  await page.goto('/fake', { waitUntil: 'networkidle' });
  await page.getByLabel('Job title').fill('Test Engineer');
  await page.getByLabel('Company').fill('Local Company');
  await page.getByLabel('I am good at...').fill('Testing');
  await page.getByLabel('Additional details').fill('This request must stay local.');

  await page.getByRole('button', { name: 'Generate Now' }).click();

  await expect(page.getByText('no LLM request was made', { exact: false })).toBeVisible();
  expect(llmRequestCount).toBe(0);
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(1);
});
