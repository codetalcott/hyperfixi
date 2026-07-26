/**
 * Rollup config for @lokascript/i18n browser bundle
 *
 * Generates:
 * - dist/lokascript-i18n.min.js (UMD, minified) - Global: LokaScriptI18n
 * - dist/lokascript-i18n.mjs (ESM) - For modern bundlers
 */

import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { withAsciiOnly } from '../../scripts/rollup-ascii-only.mjs';

export default withAsciiOnly({
  input: 'src/browser.ts',
  output: [
    {
      file: 'dist/lokascript-i18n.mjs',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/lokascript-i18n.min.js',
      format: 'umd',
      name: 'LokaScriptI18n',
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
});
