const REQUEST_LIMIT = 6;
const WINDOW_MS = 60_000;

export function createGenerationRateLimiter(now: () => number = Date.now) {
  let requestTimes: number[] = [];

  return () => {
    const currentTime = now();
    const cutoff = currentTime - WINDOW_MS;
    requestTimes = requestTimes.filter((requestTime) => requestTime > cutoff);

    const oldestRequest = requestTimes[0];
    if (requestTimes.length >= REQUEST_LIMIT && oldestRequest !== undefined) {
      return Math.max(1, Math.ceil((oldestRequest + WINDOW_MS - currentTime) / 1_000));
    }

    requestTimes.push(currentTime);
    return undefined;
  };
}
