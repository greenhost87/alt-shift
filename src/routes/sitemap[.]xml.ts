import { createFileRoute } from '@tanstack/react-router';
import { PUBLIC_SITE_URL } from '../system/config/environment';

function getSitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${PUBLIC_SITE_URL}/</loc>
  </url>
</urlset>`;
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(getSitemap(), {
          headers: { 'content-type': 'application/xml; charset=utf-8' },
        }),
    },
  },
});
