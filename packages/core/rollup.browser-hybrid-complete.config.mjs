import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

/**
 * LokaScript Hybrid Complete Bundle
 *
 * Combines the best of hybrid and hybrid-lite:
 * - Full recursive descent parser with operator precedence (from hybrid)
 * - Event modifiers: .once, .prevent, .stop, .debounce, .throttle (from hybrid-lite)
 * - i18n alias system (from hybrid-lite)
 * - Positional expressions, function calls, HTML selectors (from hybrid)
 *
 * Target: ~7-8 KB gzipped (~85% hyperscript coverage)
 *
 * Commands (21):
 * - add, remove, toggle, take
 * - put, append, set, increment, decrement
 * - show, hide, focus, blur
 * - log, send, trigger, wait, go
 * - call, return, halt
 *
 * Block commands (7):
 * - repeat N times ... end
 * - for each item in collection ... end
 * - if condition ... [else if ...] [else ...] end
 * - unless condition ... end
 * - fetch url [as json|text|html] then ...
 * - while condition ... end
 * - async do ... end
 *
 * Expressions:
 * - Full operator precedence (or > and > equality > comparison > math)
 * - Positional: first, last, next, previous, closest, parent
 * - Property access: element.property, element's property
 * - Function calls: myFunc(args)
 * - HTML selectors: <button.class#id/>
 * - Literals: strings, numbers, booleans, arrays, objects
 *
 * Events:
 * - Standard: on click, on keydown, on input, etc.
 * - Init: init ...
 * - Interval: every Nms ...
 * - Modifiers: .once, .prevent, .stop, .debounce(N), .throttle(N)
 * - Sources: from element, from window, from document
 */
export default {
  input: 'src/compatibility/browser-bundle-hybrid-complete.ts',
  output: {
    file: 'dist/hyperfixi-hybrid-complete.js',
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
