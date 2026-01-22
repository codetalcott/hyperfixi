import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

/**
 * LokaScript TextShelf Minimal Bundle
 *
 * Ultra-lightweight bundle following the hybrid-complete pattern.
 * Only includes 10 commands TextShelf actually uses.
 *
 * Target: ~5 KB gzipped (vs 7 KB hybrid-complete, vs 39 KB tree-shakable)
 */
export default {
  input: 'src/compatibility/browser-bundle-textshelf-minimal.ts',
  output: {
    file: 'dist/lokascript-textshelf-minimal.js',
    format: 'iife',
    name: 'lokascript',
    sourcemap: false
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
      sourceMap: false
    }),
    terser({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        passes: 3,
        dead_code: true,
        conditionals: true,
        evaluate: true,
        unused: true,
        drop_debugger: true,
        drop_console: false,
        booleans_as_integers: true,
        toplevel: true,
        ecma: 2020
      },
      mangle: {
        toplevel: true,
        properties: {
          regex: /^_/
        }
      },
      format: {
        comments: false,
        ecma: 2020
      }
    })
  ],
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false
  }
};
