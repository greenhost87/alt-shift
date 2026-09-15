import * as v from 'valibot';
import { getOptionalEnv, getPositiveIntegerEnv, getRequiredEnv } from '../config/environment';

const DEFAULT_API_URL = 'https://test-assignment-api.variant.net/v1/generate';
const DEFAULT_MAX_TOKENS = 1_500;
const DEFAULT_MAX_INPUT_LENGTH = 23_000;
const DEFAULT_RATE_LIMIT = 6;
const DEFAULT_RATE_WINDOW_MS = 60_000;
const DEFAULT_INACTIVITY_TIMEOUT_MS = 30_000;
const httpUrlSchema = v.pipe(
  v.string(),
  v.url('GENERATION_API_URL must be a valid URL'),
  v.regex(/^https?:\/\//, 'GENERATION_API_URL must use HTTP or HTTPS'),
);

export function getGenerationApiUrl(): string {
  return v.parse(httpUrlSchema, getOptionalEnv('GENERATION_API_URL') ?? DEFAULT_API_URL);
}

export function getGenerationApiToken(): string {
  return getRequiredEnv('GENERATION_API_TOKEN');
}

export function getGenerationMaxTokens(): number {
  return getPositiveIntegerEnv('GENERATION_MAX_TOKENS') ?? DEFAULT_MAX_TOKENS;
}

export function getGenerationMaxInputLength(): number {
  return getPositiveIntegerEnv('GENERATION_MAX_INPUT_LENGTH') ?? DEFAULT_MAX_INPUT_LENGTH;
}

export function getGenerationRateLimit(): number {
  return getPositiveIntegerEnv('GENERATION_RATE_LIMIT') ?? DEFAULT_RATE_LIMIT;
}

export function getGenerationRateWindowMs(): number {
  return getPositiveIntegerEnv('GENERATION_RATE_WINDOW_MS') ?? DEFAULT_RATE_WINDOW_MS;
}

export function getGenerationInactivityTimeoutMs(): number {
  return getPositiveIntegerEnv('GENERATION_INACTIVITY_TIMEOUT_MS') ?? DEFAULT_INACTIVITY_TIMEOUT_MS;
}
