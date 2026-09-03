/**
 * Rollup Configuration for Modular Browser Bundle
 *
 * This config produces ES modules with code splitting for optimal loading.
 *
 * Output:
 * - dist/hyperfixi.mjs - Core bundle (~150KB minified, ~40KB gzipped)
 * - dist/chunks/sockets-[hash].js - WebSocket feature (~20KB)
 * - dist/chunks/eventsource-[hash].js - SSE feature (~20KB)
 * - dist/chunks/webworker-[hash].js - Worker feature (~20KB)
 *
 * Usage:
 *   <script type="module" src="hyperfixi.mjs"></script>
 *
 * Features are automatically loaded on demand when hyperscript code
 * uses WebSocket, SSE, or Worker functionality.
 */

import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { withAsciiOnly } from '../../scripts/rollup-ascii-only.mjs';

export default withAsciiOnly({
  input: 'src/compatibility/browser-modular.ts',
  output: {
    dir: 'dist',
    format: 'es',
    entryFileNames: 'hyperfixi.mjs',
    // Content-hashed, so every source change emits a NEW filename and rollup
    // never removes the old one (output.dir does not clean). This is the only
    // config in the repo that emits chunks; its npm script
    // (`build:browser:modular`) does `rm -rf dist/chunks` first. Not `rm -rf
    // dist` — build-browser-bundles.mjs writes the sibling bundles into dist/
    // concurrently.
    chunkFileNames: 'chunks/[name]-[hash].js',
    sourcemap: true,
    // Enable code splitting (don't inline dynamic imports). The three
    // `feature-*` manualChunks that used to sit here went with `features/`
    // (Arc 6b); the runtime's own lazy imports still split.
    inlineDynamicImports: false,
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
      sourceMap: true,
    }),
    terser({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        // Keep console.warn/error so parse failures stay observable (see
        // rollup.browser.config.mjs).
        drop_console: ['log', 'info', 'debug', 'trace'],
        pure_funcs: [
          'debug.command',
          'debug.event',
          'debug.parse',
          'debug.expr',
          'debug.expressions',
          'debug.style',
          'debug.runtime',
          'debug.loop',
          'debug.async',
        ],
      },
      mangle: {
        properties: false,
      },
    }),
  ],
  // Preserve dynamic imports for code splitting
  preserveEntrySignatures: 'strict',
});
