import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  createApplicationFixtures,
  openDashboardAndExpectProgress,
  storeApplications,
  submitApplicationForm,
} from '../support/applications';
import {
  installCopyableGenerationResponse,
  installGenerationBrowserFixtures,
} from '../support/generation-browser';
import { expectContentFitsViewport, expectDialogFitsViewport } from '../support/viewport';

async function openFaqAnswers(page: Page, answers: string[]) {
  for (const answer of answers) {
    const details = page.locator('details').filter({ hasText: answer });
    await details.locator('summary').click();
    await expect(details.getByText(answer)).toBeVisible();
  }
}

test('Russian screens and subscription modal fit at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ height: 568, width: 320 });
  await page.goto('/applications', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Language' }).click();
  await expectContentFitsViewport(page);
  await page.getByRole('option', { name: '🇷🇺 Русский' }).click();
  await expect(page.getByRole('heading', { name: 'Писем пока нет' })).toBeVisible();
  await expectContentFitsViewport(page);

  await page.getByRole('button', { name: 'Создать первое письмо' }).click();
  await expect(page).toHaveURL('/applications/new');
  await expect(page.getByRole('heading', { name: 'Новое письмо' })).toBeVisible();
  await expectContentFitsViewport(page);

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { name: 'Генератор сопроводительных писем с ИИ' }),
  ).toBeVisible();
  await openFaqAnswers(page, [
    'Да. Это черновик, который можно скопировать и адаптировать перед отправкой.',
    'Сохранённые письма остаются в локальном хранилище браузера и не публикуются как общедоступные страницы.',
    'Добавьте должность, компанию, свои подходящие сильные стороны и детали, которые важно подчеркнуть.',
  ]);
  await expectContentFitsViewport(page);

  await storeApplications(page, createApplicationFixtures(5), 'now');
  await page.goto('/applications', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Оформить подписку' }).click();
  const modal = page.getByRole('dialog', { name: 'Откройте безлимитную генерацию' });
  await expect(modal).toBeVisible();
  await expectDialogFitsViewport(
    page,
    modal,
    modal.getByRole('button', { name: 'Закрыть' }),
    modal.getByRole('heading', { name: 'Откройте безлимитную генерацию' }),
  );
});

test('streams and stores a completed application at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ height: 568, width: 320 });
  await installGenerationBrowserFixtures(page);
  await installCopyableGenerationResponse(page);
  await submitApplicationForm(page, '/applications/new');

  await expect(page.getByText('Copyable application')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
  await expectContentFitsViewport(page);
  await openDashboardAndExpectProgress(page, 1);
  await expect(page.getByText('Copyable application')).toBeVisible();
  await expectContentFitsViewport(page);
});

test('landing interactions fit at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ height: 568, width: 320 });
  await page.goto('/', { waitUntil: 'networkidle' });

  await expectContentFitsViewport(page);
  await openFaqAnswers(page, [
    'Yes. The generated letter is a draft that you can copy and adapt before sending.',
    'Your saved letters stay in local browser storage and are not published as public pages.',
    'Add the role, company, your relevant strengths, and any details you want the draft to emphasize.',
  ]);
  await expectContentFitsViewport(page);

  const ctas = page.getByRole('button', { name: 'Create my cover letter' });
  await expect(ctas).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    await ctas.nth(index).click();
    await expect(page).toHaveURL('/applications/new');
    if (index === 0) await page.goBack({ waitUntil: 'networkidle' });
  }
});
