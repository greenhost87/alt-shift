import { randomInt } from 'node:crypto';
import { defineConfig } from '@playwright/test';
import * as v from 'valibot';
import { getOptionalEnv, setEnv } from './src/server/config/environment';

const DYNAMIC_PORT_START = 49_152;
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
  testDir: './tests/e2e',
  testMatch: '**/*.pw.ts',
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: `bun run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    ignoreHTTPSErrors: true,
    url: baseURL,
  },
});
