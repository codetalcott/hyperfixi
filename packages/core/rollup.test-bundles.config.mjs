/**
 * Rollup Configuration for Tree-Shaking Test Bundles
 *
 * Builds three test bundles for size comparison:
 * 1. test-minimal.js - RuntimeExperimental with 2 commands (~90 KB expected)
 * 2. test-standard.js - RuntimeExperimental with 16 commands (~200 KB expected)
 * 3. test-baseline.js - Original Runtime with all commands (~511 KB baseline)
 */

import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commonPlugins = [
  resolve({
    browser: true,
    preferBuiltins: false,
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false,
    sourceMap: true,
  }),
  terser({
    compress: {
      passes: 2,
      unsafe: true,
      pure_getters: true,
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
];

export default [
  // Minimal Bundle (2 commands)
  {
    input: 'src/bundles/test-minimal.ts',
    output: {
      file: 'dist/test-minimal.js',
      format: 'iife',
      name: 'HyperFixiMinimal',
      sourcemap: true,
    },
    plugins: commonPlugins,
  },

  // Standard Bundle (16 commands)
  {
    input: 'src/bundles/test-standard.ts',
    output: {
      file: 'dist/test-standard.js',
      format: 'iife',
      name: 'HyperFixiStandard',
      sourcemap: true,
    },
    plugins: commonPlugins,
  },

  // Baseline Bundle (original Runtime)
  {
    input: 'src/bundles/test-baseline.ts',
    output: {
      file: 'dist/test-baseline.js',
      format: 'iife',
      name: 'HyperFixiBaseline',
      sourcemap: true,
    },
    plugins: commonPlugins,
  },
];
