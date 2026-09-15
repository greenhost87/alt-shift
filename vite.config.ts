import basicSsl from '@vitejs/plugin-basic-ssl';
import viteReact from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [basicSsl(), tanstackStart(), viteReact()],
  ssr: {
    noExternal: ['@reshaped/utilities', 'reshaped'],
  },
});
