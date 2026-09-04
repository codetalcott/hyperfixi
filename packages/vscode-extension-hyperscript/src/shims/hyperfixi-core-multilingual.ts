/**
 * Throwing shim for @hyperfixi/core/multilingual.
 *
 * The language server dynamically imports this subpath (inside the
 * @hyperfixi/core try/catch) to bind the schema-driven role inferrer. In
 * standalone mode core itself is shimmed to throw, so this import is never
 * reached — but esbuild still has to RESOLVE it, and without an alias it
 * rewrites the subpath under the `@hyperfixi/core` alias to
 * `src/shims/hyperfixi-core.ts/multilingual`, which is not a directory and
 * fails the bundle (broken from #1016 until the 2026-09 audit).
 */
throw new Error('shim: @hyperfixi/core/multilingual not available in standalone mode');
