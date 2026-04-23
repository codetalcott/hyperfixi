import { defineConfig } from 'tsup';

// Two-entry build: the plugin itself (index) and the service-worker runtime
// (sw-entry). The SW is emitted as `dist/intercept-sw.js` in IIFE format so it
// can be served as a classic script from the app root — see README for setup.
export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['@hyperfixi/core'],
  },
  {
    // The SW runtime is a classic script that attaches listeners to `self`
    // directly — no global export is needed, so we use the `esbuild-only`
    // format name trick (no format suffix) via outExtension. An IIFE wrapper
    // keeps locals scoped without leaking.
    entry: { 'intercept-sw': 'src/sw-entry.ts' },
    format: ['iife'],
    splitting: false,
    sourcemap: false,
    clean: false,
    platform: 'browser',
    outExtension: () => ({ js: '.js' }),
  },
]);
