import { expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';

export async function expectCookie(context: BrowserContext, name: string, value: string) {
  await expect
    .poll(async () => (await context.cookies()).find((cookie) => cookie.name === name)?.value)
    .toBe(value);
}
