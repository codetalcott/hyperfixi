/**
 * The package version reported by `hyperfixi --version` / `hfx --version`.
 *
 * GENERATED — do not edit by hand. `scripts/set-version.cjs` rewrites this file
 * alongside the `package.json` files it already touches.
 *
 * A generated constant rather than a runtime `package.json` read because tsup
 * emits this CLI in BOTH cjs (`dist/cli.js`, the published bin) and esm
 * (`dist/cli.mjs`): `__dirname` exists only in the former and `import.meta.url`
 * only in the latter, so no single filesystem anchor works for both. The
 * literal here was '0.1.0' while the package shipped 2.10.0.
 */
export const VERSION = '3.0.0';
