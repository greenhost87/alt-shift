import { getGenerationRateLimit, getGenerationRateWindowMs } from './config';

export function createGenerationRateLimiter(
  now: () => number = Date.now,
  requestLimit = getGenerationRateLimit(),
  windowMs = getGenerationRateWindowMs(),
) {
  let requestTimes: number[] = [];

  return () => {
    const currentTime = now();
    const cutoff = currentTime - windowMs;
    requestTimes = requestTimes.filter((requestTime) => requestTime > cutoff);

    const oldestRequest = requestTimes[0];
    if (requestTimes.length >= requestLimit && oldestRequest !== undefined) {
      return Math.max(1, Math.ceil((oldestRequest + windowMs - currentTime) / 1_000));
    }

    requestTimes.push(currentTime);
    return undefined;
  };
}
