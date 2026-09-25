import * as v from 'valibot';
import { getCookiePath } from '../config/base-path';
import { BASE_PATH } from '../config/environment';

export const APPLICATION_COUNT_COOKIE_NAME = 'ALT_SHIFT_APPLICATION_COUNT';

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

export function writeApplicationCountCookie(count: number, ttlSeconds: number): void {
  document.cookie = `${APPLICATION_COUNT_COOKIE_NAME}=${count}; Max-Age=${ttlSeconds}; Path=${getCookiePath(BASE_PATH)}; SameSite=Lax`;
}
