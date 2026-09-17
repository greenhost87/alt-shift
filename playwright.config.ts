import { randomInt } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';
import * as v from 'valibot';
import { getOptionalEnv, setEnv } from './src/server/config/environment';

const DYNAMIC_PORT_START = 49_152;
const E2E_TIMEOUT_MS = 5_000;
const INTERNAL_PORT_KEY = 'ALT_SHIFT_E2E_PORT';
const INTERNAL_BASE_PATH_PORT_KEY = 'ALT_SHIFT_E2E_BASE_PATH_PORT';
const INTERNAL_PRODUCTION_PORT_KEY = 'ALT_SHIFT_E2E_PRODUCTION_PORT';
const dynamicPortSchema = v.pipe(
  v.string(),
  v.regex(/^\d+$/, `${INTERNAL_PORT_KEY} must be a port number`),
  v.transform(Number),
  v.integer(),
  v.minValue(DYNAMIC_PORT_START),
  v.maxValue(65_535),
);
const inheritedPort = getOptionalEnv(INTERNAL_PORT_KEY);
const rootPort = inheritedPort
  ? v.parse(dynamicPortSchema, inheritedPort)
  : randomInt(DYNAMIC_PORT_START, 65_536);
const inheritedBasePathPort = getOptionalEnv(INTERNAL_BASE_PATH_PORT_KEY);
const selectedBasePathPort = inheritedBasePathPort
  ? v.parse(dynamicPortSchema, inheritedBasePathPort)
  : randomInt(DYNAMIC_PORT_START, 65_536);
const basePathPort =
  selectedBasePathPort === rootPort
    ? DYNAMIC_PORT_START + ((selectedBasePathPort - DYNAMIC_PORT_START + 1) % 16_384)
    : selectedBasePathPort;
const inheritedProductionPort = getOptionalEnv(INTERNAL_PRODUCTION_PORT_KEY);
const selectedProductionPort = inheritedProductionPort
  ? v.parse(dynamicPortSchema, inheritedProductionPort)
  : randomInt(DYNAMIC_PORT_START, 65_536);
const occupiedPorts = new Set([rootPort, basePathPort]);
let productionPort = selectedProductionPort;
while (occupiedPorts.has(productionPort)) {
  productionPort = DYNAMIC_PORT_START + ((productionPort - DYNAMIC_PORT_START + 1) % 16_384);
}
setEnv(INTERNAL_PORT_KEY, String(rootPort));
setEnv(INTERNAL_BASE_PATH_PORT_KEY, String(basePathPort));
setEnv(INTERNAL_PRODUCTION_PORT_KEY, String(productionPort));
const rootBaseURL = `https://127.0.0.1:${rootPort}`;
const productionBaseURL = `http://127.0.0.1:${productionPort}`;
const deploymentBasePath = '/alt-shift';
const basePathBaseURL = `https://127.0.0.1:${basePathPort}${deploymentBasePath}/`;

export default defineConfig({
  expect: { timeout: E2E_TIMEOUT_MS },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/base-path.pw.ts', '**/production-assets.pw.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-webkit',
      testMatch: '**/mobile.pw.ts',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'base-path-chromium',
      testMatch: '**/base-path.pw.ts',
      use: { ...devices['Desktop Chrome'], baseURL: basePathBaseURL },
    },
    {
      name: 'production-chromium',
      testMatch: '**/production-assets.pw.ts',
      use: { ...devices['Desktop Chrome'], baseURL: productionBaseURL },
    },
  ],
  testDir: './tests/e2e',
  testMatch: '**/*.pw.ts',
  timeout: E2E_TIMEOUT_MS,
  use: {
    baseURL: rootBaseURL,
    ignoreHTTPSErrors: true,
  },
  webServer: [
    {
      command: `SQLITE_PATH=test-results/e2e-${rootPort}.sqlite SESSION_SECRET=e2e-only-session-secret-at-least-32-characters PUBLIC_SITE_URL=https://seo.example.test GENERATION_RATE_LIMIT=2 GENERATION_GLOBAL_RATE_LIMIT=100 APPLICATION_COUNT_COOKIE_TTL_SECONDS=120 COPY_FEEDBACK_TIMEOUT_MS=500 bun run dev -- --host 127.0.0.1 --port ${rootPort} --strictPort`,
      ignoreHTTPSErrors: true,
      url: rootBaseURL,
    },
    {
      command: `BASE_PATH=${deploymentBasePath} SQLITE_PATH=test-results/e2e-${basePathPort}.sqlite SESSION_SECRET=e2e-only-session-secret-at-least-32-characters PUBLIC_SITE_URL=https://seo.example.test${deploymentBasePath} bun run dev -- --host 127.0.0.1 --port ${basePathPort} --strictPort`,
      ignoreHTTPSErrors: true,
      url: basePathBaseURL,
    },
    {
      command: `HOST=127.0.0.1 PORT=${productionPort} SQLITE_PATH=test-results/e2e-${productionPort}.sqlite SESSION_SECRET=e2e-only-session-secret-at-least-32-characters PUBLIC_SITE_URL=${productionBaseURL} bun dist/server/server.js`,
      url: productionBaseURL,
    },
  ],
  workers: 4,
});
