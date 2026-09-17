import type { Database } from 'bun:sqlite';
import { getDatabase } from '../database/connection';
import { takeGenerationRateLimitSlot } from '../database/generation/rate-limit.dao';
import {
  getGenerationGlobalRateLimit,
  getGenerationRateLimit,
  getGenerationRateWindowMs,
} from './config';

function getRetryAfter(requestTime: number, currentTime: number, windowMs: number) {
  return Math.max(1, Math.ceil((requestTime + windowMs - currentTime) / 1_000));
}

export function createGenerationRateLimiter(
  now: () => number = Date.now,
  requestLimit = getGenerationRateLimit(),
  windowMs = getGenerationRateWindowMs(),
  globalRequestLimit = getGenerationGlobalRateLimit(),
  database: () => Database = getDatabase,
) {
  return (clientFingerprint: string) => {
    const currentTime = now();
    const limitRequestTime = takeGenerationRateLimitSlot({
      database: database(),
      clientFingerprint,
      currentTime,
      requestLimit,
      windowMs,
      globalRequestLimit,
    });
    return limitRequestTime === undefined
      ? undefined
      : getRetryAfter(limitRequestTime, currentTime, windowMs);
  };
}
