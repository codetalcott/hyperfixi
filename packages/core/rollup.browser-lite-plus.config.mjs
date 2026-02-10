import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

/**
 * LokaScript Lite Plus Bundle
 *
 * Extended lite bundle with more commands.
 * Target: ~3-4 KB gzipped
 *
 * Commands (14):
 * - add, remove, toggle, take
 * - put, append, set, increment, decrement
 * - show, hide, focus, blur
 * - log, send, trigger, wait, go
 */
export default {
  input: 'src/compatibility/browser-bundle-lite-plus.ts',
  output: {
    file: 'dist/hyperfixi-lite-plus.js',
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
  ]
};
