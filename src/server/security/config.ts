import * as v from 'valibot';
import { getPositiveIntegerEnv, getRequiredEnv } from '../config/environment';

const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const sessionSecretSchema = v.pipe(
  v.string(),
  v.minLength(32, 'SESSION_SECRET must contain at least 32 characters'),
);

export function getSessionSecret(): string {
  return v.parse(sessionSecretSchema, getRequiredEnv('SESSION_SECRET'));
}

export function getSessionTtlMs(): number {
  return getPositiveIntegerEnv('SESSION_TTL_MS') ?? DEFAULT_SESSION_TTL_MS;
}
