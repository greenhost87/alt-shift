import type { Database } from 'bun:sqlite';

type RequestTimeRow = {
  requestedAtMs: number;
};

type TakeRateLimitSlotOptions = {
  database: Database;
  clientFingerprint: string;
  currentTime: number;
  requestLimit: number;
  windowMs: number;
  globalRequestLimit: number;
};

function findLimitRequest(
  database: Database,
  cutoff: number,
  requestLimit: number,
  clientFingerprint?: string,
): RequestTimeRow | null {
  const fingerprint = clientFingerprint ?? null;
  return database
    .query<RequestTimeRow, [number, string | null, string | null, number]>(`
      SELECT MIN(requested_at_ms) AS requestedAtMs
      FROM generation_rate_limit_requests
      WHERE requested_at_ms > ? AND (? IS NULL OR client_fingerprint = ?)
      HAVING COUNT(*) >= ?
    `)
    .get(cutoff, fingerprint, fingerprint, requestLimit);
}

export function takeGenerationRateLimitSlot(options: TakeRateLimitSlotOptions): number | undefined {
  const cutoff = options.currentTime - options.windowMs;
  return options.database
    .transaction(() => {
      options.database
        .query<never, [number]>(
          'DELETE FROM generation_rate_limit_requests WHERE requested_at_ms <= ?',
        )
        .run(cutoff);

      const globalLimitRequest = findLimitRequest(
        options.database,
        cutoff,
        options.globalRequestLimit,
      );
      if (globalLimitRequest !== null) return globalLimitRequest.requestedAtMs;

      const clientLimitRequest = findLimitRequest(
        options.database,
        cutoff,
        options.requestLimit,
        options.clientFingerprint,
      );
      if (clientLimitRequest !== null) return clientLimitRequest.requestedAtMs;

      options.database
        .query<never, [string, number]>(`
        INSERT INTO generation_rate_limit_requests (client_fingerprint, requested_at_ms)
        VALUES (?, ?)
      `)
        .run(options.clientFingerprint, options.currentTime);
      return undefined;
    })
    .immediate();
}
