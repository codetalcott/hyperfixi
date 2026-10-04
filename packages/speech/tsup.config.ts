import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // ESM only, as @hyperfixi/engine is.
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['@hyperfixi/engine'],
});
