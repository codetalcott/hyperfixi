import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['@hyperfixi/core', '@lokascript/semantic'],
  },
  // Runtime (separate entry for smaller imports)
  {
    entry: ['src/runtime/aot-runtime.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist/runtime',
    sourcemap: true,
  },
  // CLI
  {
    entry: ['src/cli/index.ts'],
    format: ['esm'],
    dts: false,
    outDir: 'dist/cli',
    banner: {
      js: '#!/usr/bin/env node',
    },
    external: ['@hyperfixi/core', '@lokascript/semantic', 'commander', 'fast-glob'],
  },
]);
