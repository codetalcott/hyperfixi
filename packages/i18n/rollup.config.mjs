/**
 * Rollup config for @hyperfixi/i18n browser bundle
 *
 * Generates:
 * - dist/hyperfixi-i18n.min.js (UMD, minified) - Global: HyperFixiI18n
 * - dist/hyperfixi-i18n.mjs (ESM) - For modern bundlers
 */

import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/browser.ts',
  output: [
    {
      file: 'dist/hyperfixi-i18n.mjs',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/hyperfixi-i18n.min.js',
      format: 'umd',
      name: 'HyperFixiI18n',
      plugins: [terser()],
      sourcemap: true,
    },
  ],
  plugins: [
    nodeResolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false, // Already handled by tsup
      declarationMap: false,
      compilerOptions: {
        // Ensure type-only exports are stripped
        verbatimModuleSyntax: false,
        isolatedModules: true,
      },
    }),
  ],
  // Don't bundle @hyperfixi/core - it's loaded separately
  external: ['@hyperfixi/core'],
};
