import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const noTerser = process.env.NO_TERSER === '1';

/**
 * HyperFixi Hybrid-HX Bundle
 *
 * Extends hybrid-complete with htmx attribute compatibility (hx-*).
 * Supports both `_="..."` hyperscript syntax AND htmx-style attributes.
 *
 * Target: ~8-9 KB gzipped
 *
 * htmx Attributes Supported:
 * - hx-get, hx-post, hx-put, hx-patch, hx-delete
 * - hx-target (this, closest, find, next, previous, CSS selector)
 * - hx-swap (innerHTML, outerHTML, beforeend, afterbegin, morph, etc.)
 * - hx-trigger (click, load, submit, etc.)
 * - hx-confirm (browser confirmation dialog)
 * - hx-boost (convert links/forms to AJAX)
 * - hx-vals, hx-headers (additional data)
 * - hx-push-url, hx-replace-url (URL management)
 * - hx-on:* (inline event handlers)
 *
 * All hybrid-complete features are also included.
 */
export default {
  input: 'src/compatibility/browser-bundle-hybrid-hx.ts',
  output: {
    file: 'dist/hyperfixi-hybrid-hx.js',
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
    ...(noTerser ? [] : [
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
    ])
  ]
};
