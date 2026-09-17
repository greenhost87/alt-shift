const DEFAULT_PUBLIC_SITE_URL = 'https://example.com';

function getPublicSiteUrl() {
  const configuredUrl = import.meta.env['PUBLIC_SITE_URL']?.trim();
  if (!configuredUrl) return DEFAULT_PUBLIC_SITE_URL;

  const parsedUrl = new URL(configuredUrl);
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('PUBLIC_SITE_URL must use HTTP or HTTPS');
  }
  return parsedUrl.origin;
}

export const PUBLIC_SITE_URL = getPublicSiteUrl();
