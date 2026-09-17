import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDatabase } from '../database/connection';
import { findAnonymousSession, storeAnonymousSession } from '../database/session/session.dao';
import {
  ANONYMOUS_SESSION_COOKIE,
  CSRF_COOKIE,
  CSRF_HEADER,
  VERIFIED_SESSION_HEADER,
} from '../../system/security/session';
import { getCookiePath } from '../../system/config/base-path';
import { BASE_PATH } from '../../system/config/environment';
import { getSessionSecret, getSessionTtlMs } from './config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

type SessionCredentials = {
  id: string;
  csrfToken: string;
  expiresAtMs: number;
};

type SessionSecurityResult = {
  request?: Request;
  response?: Response;
  credentials?: SessionCredentials;
};

function readCookie(request: Request, name: string): string | undefined {
  const prefix = `${name}=`;
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

function digestCsrfToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signSessionId(id: string): string {
  return createHmac('sha256', getSessionSecret()).update(id).digest('base64url');
}

function parseSessionId(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const separator = value.indexOf('.');
  if (separator <= 0 || value.indexOf('.', separator + 1) !== -1) return undefined;
  const id = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = signSessionId(id);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return undefined;
  return timingSafeEqual(receivedBuffer, expectedBuffer) ? id : undefined;
}

function createSession(currentTime: number): SessionCredentials {
  const database = getDatabase();
  const credentials = {
    id: randomBytes(32).toString('base64url'),
    csrfToken: randomBytes(32).toString('base64url'),
    expiresAtMs: currentTime + getSessionTtlMs(),
  };
  storeAnonymousSession(
    {
      database,
      id: credentials.id,
      csrfTokenHash: digestCsrfToken(credentials.csrfToken),
      expiresAtMs: credentials.expiresAtMs,
    },
    currentTime,
  );
  return credentials;
}

function cookieAttributes(credentials: SessionCredentials): string {
  const maxAge = Math.max(1, Math.floor((credentials.expiresAtMs - Date.now()) / 1_000));
  return `Path=${getCookiePath(BASE_PATH)}; Max-Age=${maxAge}; Secure; SameSite=Strict`;
}

function sessionCookie(credentials: SessionCredentials): string {
  return `${ANONYMOUS_SESSION_COOKIE}=${credentials.id}.${signSessionId(credentials.id)}; ${cookieAttributes(credentials)}; HttpOnly`;
}

function csrfCookie(credentials: SessionCredentials): string {
  return `${CSRF_COOKIE}=${credentials.csrfToken}; ${cookieAttributes(credentials)}`;
}

function withSessionCookies(response: Response, credentials: SessionCredentials): Response {
  const secured = new Response(response.body, response);
  secured.headers.append('set-cookie', sessionCookie(credentials));
  secured.headers.append('set-cookie', csrfCookie(credentials));
  return secured;
}

function securityError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function hasValidRequestSource(request: Request): boolean {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  return origin === new URL(request.url).origin && fetchSite === 'same-origin';
}

function hasValidCsrfToken(request: Request, csrfTokenHash: string): boolean {
  const cookieToken = readCookie(request, CSRF_COOKIE);
  const headerToken = request.headers.get(CSRF_HEADER);
  if (cookieToken === undefined || headerToken === null || cookieToken !== headerToken)
    return false;
  const actualBuffer = Buffer.from(digestCsrfToken(headerToken));
  const expectedBuffer = Buffer.from(csrfTokenHash);
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function authorizeRequest(request: Request, currentTime: number): SessionSecurityResult {
  const sessionId = parseSessionId(readCookie(request, ANONYMOUS_SESSION_COOKIE));
  const session =
    sessionId === undefined ? null : findAnonymousSession(getDatabase(), sessionId, currentTime);
  if (session === null) {
    const credentials = createSession(currentTime);
    if (SAFE_METHODS.has(request.method)) return { request, credentials };
    return {
      response: securityError(401, 'session_required', 'A valid session is required.'),
      credentials,
    };
  }

  if (!SAFE_METHODS.has(request.method)) {
    if (!hasValidRequestSource(request)) {
      return { response: securityError(403, 'invalid_request_source', 'Request source rejected.') };
    }
    if (!hasValidCsrfToken(request, session.csrfTokenHash)) {
      return { response: securityError(403, 'invalid_csrf_token', 'CSRF token rejected.') };
    }
  }

  const headers = new Headers(request.headers);
  headers.delete(VERIFIED_SESSION_HEADER);
  headers.set(VERIFIED_SESSION_HEADER, session.id);
  const securedRequest = SAFE_METHODS.has(request.method)
    ? new Request(request.url, { headers, method: request.method, signal: request.signal })
    : new Request(request.url, {
        body: request.body,
        headers,
        method: request.method,
        signal: request.signal,
      });
  return { request: securedRequest };
}

export async function handleSessionSecurity(
  request: Request,
  resolve: (securedRequest: Request) => Promise<Response>,
): Promise<Response> {
  const result = authorizeRequest(request, Date.now());
  if (result.response !== undefined) {
    return result.credentials === undefined
      ? result.response
      : withSessionCookies(result.response, result.credentials);
  }
  const response = await resolve(result.request ?? request);
  return result.credentials === undefined
    ? response
    : withSessionCookies(response, result.credentials);
}
