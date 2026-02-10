import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

/**
 * LokaScript TextShelf Profile Bundle
 *
 * Custom tree-shaken bundle for projects/textshelf.
 * Uses the new createRuntime() tree-shaking architecture.
 *
 * Target: ~5 KB gzipped (vs 12 KB official hyperscript)
 *
 * Commands (10):
 * - DOM: add, remove, toggle, show, hide
 * - Animation: transition
 * - Data: set
 * - Async: wait
 * - Navigation: go
 * - Execution: call
 *
 * Expressions (3 categories):
 * - references: me, my, CSS selectors
 * - logical: comparisons
 * - special: literals
 *
 * Parser: hybrid (handles "then" chaining)
 *
 * Special features:
 * - HTMX integration (htmx:afterSettle re-processing)
 * - Drop-in _hyperscript compatibility
 */
export default {
  input: 'src/compatibility/browser-bundle-textshelf-profile.ts',
  output: {
    file: 'dist/hyperfixi-textshelf.js',
    format: 'iife',
    name: 'hyperfixi',
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
  // Enable tree-shaking
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false
  }
};
