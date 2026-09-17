import { cpSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import basicSsl from '@vitejs/plugin-basic-ssl';
import viteReact from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

function copyServerMigrations(): Plugin {
  return {
    name: 'copy-server-migrations',
    writeBundle(options) {
      if (options.dir === undefined || basename(options.dir) !== 'server') return;
      cpSync(
        fileURLToPath(new URL('./migrations', import.meta.url)),
        resolve(options.dir, 'migrations'),
        {
          recursive: true,
        },
      );
    },
  };
}

export default defineConfig({
  define: { 'import.meta.main': 'false' },
  resolve: {
    alias: {
      '@/system/config/environment': fileURLToPath(
        new URL('./src/server/config/environment.ts', import.meta.url),
      ),
      '@/system/database': fileURLToPath(new URL('./src/server/database', import.meta.url)),
    },
  },
  plugins: [
    copyServerMigrations(),
    basicSsl(),
    tanstackStart({ server: { entry: './server.ts' } }),
    viteReact(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      emitTsDeclarations: true,
      outputStructure: 'message-modules',
      cookieName: 'ALT_SHIFT_LOCALE',
      strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
    }),
  ],
  ssr: {
    noExternal: ['@reshaped/utilities', 'reshaped'],
  },
});
