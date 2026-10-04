import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@hyperfixi/engine': resolve(__dirname, '../engine/src/index.ts'),
      '@lokascript/semantic': resolve(__dirname, '../semantic/src'),
    },
  },
});
