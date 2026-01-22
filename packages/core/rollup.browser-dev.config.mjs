import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

/**
 * Development browser bundle - no minification for easier debugging
 * Use: npx rollup -c rollup.browser-dev.config.mjs
 * Output: dist/lokascript-browser-dev.js
 */
export default {
  input: 'src/compatibility/browser-bundle.ts',
  output: {
    file: 'dist/lokascript-browser-dev.js',
    format: 'iife',
    name: 'lokascript',
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
};
