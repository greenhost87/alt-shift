import { expect, test } from '@playwright/test';

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
  const languageButton = page.getByRole('button', { name: 'Switch language to Russian' });
  const homeButton = page.getByRole('button', { name: 'Home' });
  await expect(languageButton).toHaveText('🇷🇺');
  await expect(languageButton.locator('[aria-hidden="true"]')).toHaveCSS('font-size', '24px');
  const languageButtonBox = await languageButton.boundingBox();
  const homeButtonBox = await homeButton.boundingBox();
  expect(languageButtonBox?.width).toBe(homeButtonBox?.width);
  expect(languageButtonBox?.height).toBe(homeButtonBox?.height);
  await languageButton.click();

  await expect
    .poll(
      async () =>
        (await page.context().cookies()).find((cookie) => cookie.name === 'ALT_SHIFT_LOCALE')
          ?.value,
    )
    .toBe('ru');
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
  const englishLanguageButton = page.getByRole('button', {
    name: 'Переключить язык на английский',
  });
  await expect(englishLanguageButton).toHaveText('🇬🇧');
  await englishLanguageButton.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
