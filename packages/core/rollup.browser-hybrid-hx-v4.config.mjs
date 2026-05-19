import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const noTerser = process.env.NO_TERSER === '1';

/**
 * HyperFixi Hybrid-HX v4 Bundle
 *
 * Full runtime + @hyperfixi/reactivity + htmx-compat attribute processor.
 * The "batteries-included" htmx v4 surface bundle:
 *   - All v1/v2 htmx attributes (hx-get/post/put/patch/delete, hx-target,
 *     hx-swap, hx-trigger, hx-confirm, hx-boost, hx-vals, hx-headers,
 *     hx-push-url, hx-replace-url, hx-on:*)
 *   - All fixi attributes (fx-action, fx-method, …, fx-ignore)
 *   - `hx-live="..."` — reactive expressions with fine-grained dep tracking
 *   - Future: sse-connect/sse-swap (Phase 3), ws-connect/ws-send (Phase 4)
 *
 * Larger than `hyperfixi-hx.js` because it uses the full runtime instead
 * of the slim hybrid-complete runtime — necessary so the `set` command
 * routes through `notifyGlobalWrite()` and wakes reactive effects.
 *
 * For size-tuned production builds, use `@hyperfixi/vite-plugin` to ship
 * only the surface the project actually uses.
 */
export default {
  input: 'src/compatibility/browser-bundle-hybrid-hx-v4.ts',
  output: {
    file: 'dist/hyperfixi-hx-v4.js',
    format: 'iife',
    name: 'hyperfixi',
    sourcemap: false,
    inlineDynamicImports: true,
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
      sourceMap: false,
    }),
    ...(noTerser
      ? []
      : [
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
              ecma: 2020,
            },
            mangle: {
              toplevel: true,
              properties: {
                regex: /^_/,
              },
            },
            format: {
              comments: false,
              ecma: 2020,
            },
          }),
        ]),
  ],
};
