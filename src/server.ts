import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from '@tanstack/react-start/server-entry';
import { paraglideMiddleware } from './paraglide/server.js';
import { runDatabaseMigrations } from './server/database/migrate';
import { getSessionSecret } from './server/security/config';
import { BASE_PATH } from './system/config/environment';
import { handleSessionSecurity } from './server/security/session';
import { startInstance } from './start';

const clientDirectory = fileURLToPath(new URL('../client', import.meta.url));

function getClientAssetPath(request: Request): string | undefined {
  if (import.meta.env.DEV || (request.method !== 'GET' && request.method !== 'HEAD')) {
    return undefined;
  }

  const pathname = new URL(request.url).pathname;
  const relativePath =
    BASE_PATH && pathname.startsWith(`${BASE_PATH}/`)
      ? pathname.slice(BASE_PATH.length + 1)
      : pathname.slice(1);
  if (!relativePath) return undefined;

  const assetPath = resolve(clientDirectory, relativePath);
  if (
    relative(clientDirectory, assetPath).startsWith('..') ||
    !existsSync(assetPath) ||
    !statSync(assetPath).isFile()
  ) {
    return undefined;
  }

  return assetPath;
}

function getContentType(path: string): string {
  switch (extname(path)) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

function serveClientAsset(request: Request): Response | undefined {
  const assetPath = getClientAssetPath(request);
  if (assetPath === undefined) return undefined;

  const headers = new Headers({
    'Cache-Control': 'no-cache',
    'Content-Length': String(statSync(assetPath).size),
    'Content-Type': getContentType(assetPath),
  });
  if (new URL(request.url).pathname.includes('/assets/')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return new Response(request.method === 'HEAD' ? null : readFileSync(assetPath), { headers });
}

await startInstance.getOptions();
getSessionSecret();
runDatabaseMigrations({
  directory: import.meta.env.DEV
    ? 'migrations'
    : fileURLToPath(new URL('./migrations', import.meta.url)),
});

export default {
  async fetch(request: Request): Promise<Response> {
    const assetResponse = serveClientAsset(request);
    if (assetResponse !== undefined) return assetResponse;

    return handleSessionSecurity(request, async (securedRequest) =>
      paraglideMiddleware(securedRequest, async () => handler.fetch(securedRequest)),
    );
  },
};
