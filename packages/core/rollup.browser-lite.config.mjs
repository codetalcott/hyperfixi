import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

/**
 * HyperFixi Lite Bundle
 *
 * Ultra-minimal bundle using regex-based parser instead of full AST.
 * Target: ~20-25 KB gzipped (matching original hyperscript's ~18 KB)
 *
 * Features:
 * - 8 core commands (toggle, add, remove, put, set, log, send, wait)
 * - Simple event handlers (on click, on submit, etc.)
 * - No expression parser, no AST, no TypeScript runtime overhead
 */
export default {
  input: 'src/compatibility/browser-bundle-lite.ts',
  output: {
    file: 'dist/hyperfixi-lite.js',
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
          regex: /^_/  // Mangle private properties
        }
      },
      format: {
        comments: false,
        ecma: 2020
      }
    })
  ]
};
