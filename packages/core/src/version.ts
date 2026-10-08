/**
 * The package version, as a single source of truth for every surface that
 * reports one (`VERSION` from the root, `packageInfo.version`).
 *
 * GENERATED — do not edit by hand. `scripts/set-version.cjs` rewrites this file
 * alongside the `package.json` files it already touches, so a release bump
 * updates the reported version automatically.
 *
 * This is a generated *source* file rather than a build-time `define:`
 * substitution on purpose: the core suite runs vitest against `src/`, never the
 * bundle, so an injected constant would be `undefined` in exactly the test that
 * is supposed to catch drift — `version.test.ts`, which compares it against
 * `package.json` and fails if the two ever diverge.
 */
export const VERSION = '4.3.0';
