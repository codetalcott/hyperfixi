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
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/compatibility/browser-modular.ts',
  output: {
    dir: 'dist',
    format: 'es',
    entryFileNames: 'hyperfixi.mjs',
    chunkFileNames: 'chunks/[name]-[hash].js',
    sourcemap: true,
    // Enable code splitting (don't inline dynamic imports)
    inlineDynamicImports: false,
    // Optimize chunk splitting
    manualChunks: {
      // Group feature modules into separate chunks
      'feature-sockets': ['src/features/sockets.ts'],
      'feature-eventsource': ['src/features/eventsource.ts'],
      'feature-webworker': ['src/features/webworker.ts'],
    },
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
        drop_console: true,
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
};
