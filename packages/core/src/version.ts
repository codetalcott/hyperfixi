/**
 * The package version, as a single source of truth for every runtime surface
 * that reports one (`hyperscript.version`, `lokascript.version`,
 * `packageInfo.version`).
 *
 * GENERATED — do not edit by hand. `scripts/set-version.cjs` rewrites this file
 * alongside the 38 `package.json` files it already touches, so a release bump
 * updates the reported version automatically.
 *
 * This is a generated *source* file rather than a build-time `define:`
 * substitution on purpose: the core suite runs vitest against `src/`, never the
 * bundle, so an injected constant would be `undefined` in exactly the tests that
 * are supposed to catch drift. That is how the previous hardcoded `'2.0.0'`
 * survived five minor releases — `hyperscript-api.test.ts` asserted only that
 * the string matched `/^\d+\.\d+\.\d+/`, which a stale literal passes forever.
 *
 * The equality check in `hyperscript-api.test.ts` ('reports the real package
 * version') is what keeps this honest; it compares against `package.json` at
 * test time and fails if the two ever diverge.
 */
export const VERSION = '3.0.0';
