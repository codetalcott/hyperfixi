import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'api/index': 'src/api/index.ts',
    'sync/index': 'src/sync/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  external: ['better-sqlite3'],
  splitting: false,
  shims: true, // Enable __dirname and import.meta.url shims
});
