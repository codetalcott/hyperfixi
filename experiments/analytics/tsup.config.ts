import { defineConfig } from 'tsup';

export default defineConfig([
  // Node.js builds (CJS/ESM)
  {
    entry: {
      index: 'src/index.ts',
      tracker: 'src/tracker.ts',
      collector: 'src/collector.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    target: 'es2020',
    minify: false,
    splitting: false,
    treeshake: true,
    external: ['@hyperfixi/core'],
    banner: {
      js: '/* Analytics System for HyperFixi Applications */',
    },
  },
  // Browser bundle (IIFE) - for use with <script> tags
  {
    entry: {
      'analytics-browser': 'src/browser.ts',
    },
    format: ['iife'],
    globalName: 'HyperFixiAnalytics',
    dts: false,
    clean: false, // Don't clean since first config already did
    sourcemap: true,
    target: 'es2020',
    minify: true,
    splitting: false,
    treeshake: true,
    // Bundle dependencies for browser
    noExternal: [/.*/],
    banner: {
      js: '/* HyperFixi Analytics Browser Bundle */',
    },
  },
]);