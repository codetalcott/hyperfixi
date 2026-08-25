/**
 * The version reported by this package's plugin descriptor.
 *
 * GENERATED — do not edit by hand. `scripts/set-version.cjs` rewrites this file
 * alongside the `package.json` files it already touches.
 *
 * The literal used to sit inline in the plugin object, where nothing kept it
 * honest: `HyperfixiPlugin` does not declare `version` (the plugins widen the
 * type themselves), so no consumer and no test ever read it. Both froze at the
 * release they were written in — reactivity at 2.3.1, realtime at 2.6.0 — and
 * shipped that way inside the browser bundle for many releases. The equality
 * check in `version.test.ts` is what keeps this one honest.
 */
export const VERSION = '2.11.1';
