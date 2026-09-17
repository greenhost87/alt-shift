import { randomInt } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';
import * as v from 'valibot';
import { getOptionalEnv, setEnv } from './src/server/config/environment';

const DYNAMIC_PORT_START = 49_152;
const E2E_TIMEOUT_MS = 5_000;
const INTERNAL_PORT_KEY = 'ALT_SHIFT_E2E_PORT';
const dynamicPortSchema = v.pipe(
  v.string(),
  v.regex(/^\d+$/, `${INTERNAL_PORT_KEY} must be a port number`),
  v.transform(Number),
  v.integer(),
  v.minValue(DYNAMIC_PORT_START),
  v.maxValue(65_535),
);
const inheritedPort = getOptionalEnv(INTERNAL_PORT_KEY);
const port = inheritedPort
  ? v.parse(dynamicPortSchema, inheritedPort)
  : randomInt(DYNAMIC_PORT_START, 65_536);
setEnv(INTERNAL_PORT_KEY, String(port));
const baseURL = `https://127.0.0.1:${port}`;

export default defineConfig({
  expect: { timeout: E2E_TIMEOUT_MS },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-webkit',
      testMatch: '**/mobile.pw.ts',
      use: { ...devices['iPhone SE'] },
    },
  ],
  testDir: './tests/e2e',
  testMatch: '**/*.pw.ts',
  timeout: E2E_TIMEOUT_MS,
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: `SQLITE_PATH=test-results/e2e-${port}.sqlite SESSION_SECRET=e2e-only-session-secret-at-least-32-characters GENERATION_RATE_LIMIT=2 GENERATION_GLOBAL_RATE_LIMIT=100 APPLICATION_COUNT_COOKIE_TTL_SECONDS=120 COPY_FEEDBACK_TIMEOUT_MS=500 bun run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    ignoreHTTPSErrors: true,
    url: baseURL,
  },
  workers: 4,
});
