import { expect, test } from '@playwright/test';

test('home page exposes indexable metadata and structured landing content', async ({ page }) => {
  const response = await page.goto('/');
  const serverHtml = await response?.text();

  await expect(page).toHaveTitle('AI Cover Letter Generator — Alt+Shift');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Generate a personalized cover letter for your next job application.',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://example.com/',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://example.com/og-cover.png',
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain(
    '"@type":"WebApplication"',
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'AI Cover Letter Generator' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toHaveCount(0);
  expect(serverHtml).toContain('Create a tailored cover letter for any role in seconds.');

  await page.getByRole('link', { name: '0/5 applications generated' }).click();
  await expect(page).toHaveURL('/applications');
  await expect(page.locator('main h1')).toHaveText('Applications');
});

test('private and test routes are not indexable', async ({ page }) => {
  const privateRoutes = ['/applications', '/applications/new', '/applications/example', '/fake'];

  for (const route of privateRoutes) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  }
});

test('not-found pages are not indexable', async ({ page }) => {
  const response = await page.goto('/not-a-real-page');

  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle('Page Not Found — Alt+Shift');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('sitemap lists the public home page', async ({ page }) => {
  const response = await page.goto('/sitemap.xml');

  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).toContainText('https://example.com/');
});
