import * as v from 'valibot';

export const APPLICATION_COUNT_COOKIE_NAME = 'ALT_SHIFT_APPLICATION_COUNT';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parseApplicationCountCookie(value: string | undefined, limit: number): number {
  if (value === undefined) return 0;

  const result = v.safeParse(
    v.pipe(
      v.string(),
      v.regex(/^\d+$/),
      v.transform(Number),
      v.integer(),
      v.minValue(0),
      v.transform((count) => Math.min(count, limit)),
    ),
    value,
  );
  return result.success ? result.output : 0;
}

export function writeApplicationCountCookie(count: number) {
  document.cookie = `${APPLICATION_COUNT_COOKIE_NAME}=${count}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}
