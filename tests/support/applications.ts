import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const APPLICATION_STORAGE_KEY = 'variant-cover-letters:v1';

type ApplicationFixture = {
  id: string;
  company: string;
  role: string;
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
    letter: `${letterPrefix} ${index + 1}`,
    createdAt: `2025-01-0${index + 1}T03:04:05.000Z`,
  }));
}

export async function seedApplications(page: Page, count = 3) {
  await page.addInitScript(
    ({ applications, key }) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify({ version: 1, applications }));
      }
    },
    { applications: createApplicationFixtures(count), key: APPLICATION_STORAGE_KEY },
  );
}

export async function expectApplicationProgress(page: Page, applicationCount: number) {
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(applicationCount);
  await expect(page.getByText(`${applicationCount}/5 applications generated`)).toBeVisible();
}
