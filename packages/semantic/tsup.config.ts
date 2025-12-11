import { defineConfig } from 'tsup';

export default defineConfig([
  // Node.js builds (CJS + ESM)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['@hyperfixi/i18n'],
  },
  // Browser bundle (IIFE)
  {
    entry: { 'hyperfixi-semantic.browser': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'HyperFixiSemantic',
    minify: true,
    sourcemap: true,
    platform: 'browser',
    noExternal: ['@hyperfixi/i18n'],
    esbuildOptions(options) {
      // Ensure browser-compatible output
      options.target = 'es2020';
    },
  },
]);
