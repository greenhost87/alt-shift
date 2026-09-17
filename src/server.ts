import { fileURLToPath } from 'node:url';
import handler from '@tanstack/react-start/server-entry';
import { paraglideMiddleware } from './paraglide/server.js';
import { runDatabaseMigrations } from './server/database/migrate';
import { getSessionSecret } from './server/security/config';
import { handleSessionSecurity } from './server/security/session';

getSessionSecret();
runDatabaseMigrations({
  directory: import.meta.env.DEV
    ? 'migrations'
    : fileURLToPath(new URL('./migrations', import.meta.url)),
});

export default {
  async fetch(request: Request): Promise<Response> {
    return handleSessionSecurity(request, async (securedRequest) =>
      paraglideMiddleware(securedRequest, async () => handler.fetch(securedRequest)),
    );
  },
};
