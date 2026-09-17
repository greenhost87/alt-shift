import type { Database } from 'bun:sqlite';

type AnonymousSessionRow = {
  id: string;
  csrfTokenHash: string;
  expiresAtMs: number;
};

type CreateAnonymousSessionOptions = {
  database: Database;
  id: string;
  csrfTokenHash: string;
  expiresAtMs: number;
};

function deleteExpiredAnonymousSessions(database: Database, currentTime: number): void {
  database
    .query<never, [number]>('DELETE FROM anonymous_sessions WHERE expires_at_ms <= ?')
    .run(currentTime);
}

function createAnonymousSession(options: CreateAnonymousSessionOptions): void {
  options.database
    .query<never, [string, string, number]>(`
      INSERT INTO anonymous_sessions (id, csrf_token_hash, expires_at_ms)
      VALUES (?, ?, ?)
    `)
    .run(options.id, options.csrfTokenHash, options.expiresAtMs);
}

export function storeAnonymousSession(
  options: CreateAnonymousSessionOptions,
  currentTime: number,
): void {
  options.database
    .transaction(() => {
      deleteExpiredAnonymousSessions(options.database, currentTime);
      createAnonymousSession(options);
    })
    .immediate();
}

export function findAnonymousSession(
  database: Database,
  id: string,
  currentTime: number,
): AnonymousSessionRow | null {
  const findSession = database.query<AnonymousSessionRow, [string, number]>(`
    SELECT id, csrf_token_hash AS csrfTokenHash, expires_at_ms AS expiresAtMs
    FROM anonymous_sessions
    WHERE id = ? AND expires_at_ms > ?
  `);
  return findSession.get(id, currentTime);
}
