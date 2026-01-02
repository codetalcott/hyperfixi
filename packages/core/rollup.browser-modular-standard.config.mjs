/**
 * Rollup config for Modular Standard Bundle
 *
 * Uses the extracted StandardParser adapter (~1,000 lines) instead of
 * the full parser (~3,860 lines), demonstrating the modular architecture.
 *
 * Expected output: ~15-20 KB gzipped
 */

import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';
const noTerser = process.env.NO_TERSER === '1';

export default {
  input: 'src/compatibility/browser-bundle-modular-standard.ts',
  output: {
    file: 'dist/hyperfixi-modular-standard.js',
    format: 'iife',
    name: 'hyperfixi',
    sourcemap: true,
    inlineDynamicImports: true,
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
    ...(noTerser ? [] : [
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          passes: 3,
          dead_code: true,
          unused: true,
          conditionals: true,
          evaluate: true,
        },
        mangle: {
          properties: {
            regex: /^_/,
          },
        },
        format: {
          comments: false,
        },
      }),
    ]),
  ],
};
