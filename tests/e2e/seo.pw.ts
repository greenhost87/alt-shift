import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function expectPageIsNotIndexable(page: Page) {
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
}

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
    'https://seo.example.test/',
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'AI Cover Letter Generator — Alt+Shift',
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    'Generate a personalized cover letter for your next job application.',
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://seo.example.test/',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://seo.example.test/og-cover.png',
  );
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    'content',
    'Alt+Shift — personalized AI cover letters for your next opportunity',
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1280');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '640');
  const socialImage = await page.request.get(new URL('/og-cover.png', page.url()).toString());
  expect(socialImage.status()).toBe(200);
  expect(socialImage.headers()['content-type']).toBe('image/png');
  expect((await socialImage.body()).byteLength).toBeGreaterThan(0);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    'AI Cover Letter Generator — Alt+Shift',
  );
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
    'content',
    'Generate a personalized cover letter for your next job application.',
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    'https://seo.example.test/og-cover.png',
  );
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute(
    'content',
    'Alt+Shift — personalized AI cover letters for your next opportunity',
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
    await expectPageIsNotIndexable(page);
  }
});

test('sitemap uses the configured public site URL', async ({ page }) => {
  const response = await page.goto('/sitemap.xml');
  const body = await response?.text();

  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-type']).toBe('application/xml; charset=utf-8');
  expect(body).toContain('<loc>https://seo.example.test/</loc>');
  expect(body).not.toContain('https://example.com/');
});
