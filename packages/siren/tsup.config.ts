import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM/CJS library (tree-shakeable, for bundlers)
  {
    entry: ['src/index.ts', 'src/plugin.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  // Browser IIFE bundle (for CDN / script tag)
  {
    entry: {
      'siren.browser': 'src/index.ts',
    },
    format: ['iife'],
    globalName: 'LokaScriptSiren',
    sourcemap: true,
    minify: true,
  },
]);
