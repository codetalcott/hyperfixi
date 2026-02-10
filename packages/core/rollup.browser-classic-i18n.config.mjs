/**
 * Rollup config for LokaScript Classic + i18n combined bundle
 *
 * This bundle includes:
 * - Classic _hyperscript runtime (37 commands)
 * - Full i18n support (12 locales + grammar transformation)
 *
 * Output: hyperfixi-classic-i18n.js (~400 KB, ~105 KB gzipped)
 */

import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  input: 'src/compatibility/browser-bundle-classic-i18n.ts',
  output: {
    file: 'dist/hyperfixi-classic-i18n.js',
    format: 'iife',
    name: 'hyperfixi',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    // Alias @hyperfixi/i18n to the built dist files
    alias({
      entries: [
        {
          find: '@hyperfixi/i18n/browser',
          replacement: path.resolve(__dirname, '../i18n/dist/hyperfixi-i18n.mjs'),
        },
        {
          find: '@hyperfixi/i18n',
          replacement: path.resolve(__dirname, '../i18n/dist/hyperfixi-i18n.mjs'),
        },
      ],
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
      sourceMap: true,
      // Include i18n package source files
      include: ['src/**/*.ts', '../i18n/src/**/*.ts'],
      // Ensure TypeScript can resolve the aliased paths
      compilerOptions: {
        paths: {
          '@hyperfixi/i18n/browser': ['../i18n/src/browser.ts'],
          '@hyperfixi/i18n/*': ['../i18n/src/*'],
          '@hyperfixi/i18n': ['../i18n/src/index.ts'],
        },
      },
    }),
    terser({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        passes: 2,
        drop_console: false, // Keep console for debugging locales
      },
      mangle: {
        properties: false, // Keep property names for compatibility
      },
    }),
  ],
  // Don't externalize i18n - we want it bundled
  external: [],
};
