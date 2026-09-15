import { paraglideVitePlugin } from '@inlang/paraglide-js';
import basicSsl from '@vitejs/plugin-basic-ssl';
import viteReact from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
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
