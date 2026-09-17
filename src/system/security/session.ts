export const ANONYMOUS_SESSION_COOKIE = 'ALT_SHIFT_SESSION';
export const CSRF_COOKIE = 'ALT_SHIFT_CSRF';
export const CSRF_HEADER = 'x-csrf-token';
export const VERIFIED_SESSION_HEADER = 'x-alt-shift-verified-session';

export function getBrowserCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${CSRF_COOKIE}=`;
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}
