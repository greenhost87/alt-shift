import { expect, test } from '@playwright/test';
import { expectCookie } from '../support/cookies';

test('switches to Russian, persists the locale, and submits it for generation', async ({
  page,
}) => {
  let generationRequestBody = '';
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/fake' && request.method() === 'POST') {
      generationRequestBody = request.postData() ?? '';
    }
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const languageSelect = page.getByRole('button', { name: 'Language' });
  const homeButton = page.getByRole('button', { name: 'Home' });
  await expect(languageSelect.getByText('🇬🇧', { exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: '🇬🇧 English' })).toBeHidden();
  const languageSelectBox = await languageSelect.boundingBox();
  const homeButtonBox = await homeButton.boundingBox();
  expect(languageSelectBox?.height).toBe(homeButtonBox?.height);
  await languageSelect.click();
  const englishOption = page.getByRole('option', { name: '🇬🇧 English' });
  await expect(englishOption).toBeVisible();
  const menuHasHorizontalOverflow = await englishOption.evaluate((element) => {
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (parent.scrollWidth > parent.clientWidth) return true;
      parent = parent.parentElement;
    }
    return false;
  });
  expect(menuHasHorizontalOverflow).toBe(false);
  await page.getByRole('option', { name: '🇷🇺 Русский' }).click();

  await expectCookie(page.context(), 'ALT_SHIFT_LOCALE', 'ru');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('heading', { name: 'Писем пока нет' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');

  await page.goto('/fake', { waitUntil: 'networkidle' });
  await page.getByLabel('Должность').fill('Инженер');
  await page.getByLabel('Компания').fill('Вариант');
  await page.getByLabel('Мои сильные стороны...').fill('TypeScript');
  await page.getByLabel('Дополнительная информация').fill('Опыт разработки');
  await page.getByRole('button', { name: 'Создать письмо' }).click();

  await expect.poll(() => generationRequestBody).toContain('"locale":"ru"');
  const russianLanguageSelect = page.getByRole('button', { name: 'Язык' });
  await expect(russianLanguageSelect.getByText('🇷🇺', { exact: true })).toBeVisible();
  await russianLanguageSelect.click();
  await page.getByRole('option', { name: '🇬🇧 English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
