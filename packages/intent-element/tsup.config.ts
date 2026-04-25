import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM + CJS for Node / bundlers
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: false,
    external: ['@hyperfixi/core'],
  },
  // IIFE browser bundle — self-registers the custom element
  {
    entry: { 'intent-element.iife': 'src/index.ts' },
    format: ['iife'],
    globalName: 'HyperFixiIntentElement',
    splitting: false,
    sourcemap: true,
    minify: true,
    dts: false,
    external: ['@hyperfixi/core'],
  },
]);
