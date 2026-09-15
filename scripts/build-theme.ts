/// <reference types="bun" />

import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';

const build = spawnSync('bunx', ['reshaped', 'theming', '--output', 'src/themes'], {
  stdio: 'inherit',
});

if (build.error) {
  throw build.error;
}

if (build.status !== 0) {
  throw new Error(`Reshaped theme generation failed with exit code ${String(build.status)}`);
}

await rm('src/themes/variant/tailwind.css', { force: true });
