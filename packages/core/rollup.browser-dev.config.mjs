import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { withAsciiOnly } from '../../scripts/rollup-ascii-only.mjs';

/**
 * Development browser bundle - no minification for easier debugging
 * Use: npx rollup -c rollup.browser-dev.config.mjs
 * Output: dist/hyperfixi-dev.js
 */
export default withAsciiOnly({
  input: 'src/compatibility/browser-bundle.ts',
  output: {
    file: 'dist/hyperfixi-dev.js',
    format: 'iife',
    name: 'hyperfixi',
    sourcemap: true,
    inlineDynamicImports: true
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
      sourceMap: true
    })
    // No terser - readable output for debugging
  ]
});
