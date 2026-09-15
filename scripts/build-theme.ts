import { rm } from 'node:fs/promises';

const build = Bun.spawn(['bunx', 'reshaped', 'theming', '--output', 'src/themes'], {
  stderr: 'inherit',
  stdout: 'inherit',
});
const exitCode = await build.exited;

if (exitCode !== 0) {
  throw new Error(`Reshaped theme generation failed with exit code ${exitCode}`);
}

await rm(new URL('../src/themes/variant/tailwind.css', import.meta.url), { force: true });
