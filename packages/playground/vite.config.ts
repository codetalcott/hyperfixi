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
      '@hyperfixi/core': resolve(__dirname, '../core/src'),
      '@lokascript/semantic': resolve(__dirname, '../semantic/src'),
    },
  },
});
