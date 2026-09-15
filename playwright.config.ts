import { defineConfig } from '@playwright/test';
import * as v from 'valibot';
import { getOptionalEnv } from './src/server/config/environment';

const portSchema = v.pipe(
  v.string(),
  v.regex(/^\d+$/, 'PLAYWRIGHT_PORT must be a port number'),
  v.transform(Number),
  v.integer(),
  v.minValue(1),
  v.maxValue(65_535),
);
const port = v.parse(portSchema, getOptionalEnv('PLAYWRIGHT_PORT') ?? '3000');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.pw.ts',
  use: {
    baseURL,
  },
  webServer: {
    command: `bun run dev -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
  },
});
