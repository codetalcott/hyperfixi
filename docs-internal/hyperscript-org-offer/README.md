# Hand-off package: language support for hyperscript.org

Working set for the offer to Carson Gross. Read this index, then dive into
whichever sub-doc you need.

## Status

| Step | Artifact                                                                                                                     | Status                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1    | `@hyperscript-tools/multilingual` self-contained (vendors 31 adapter bundles into its own dist)                              | ✅ done in monorepo                                                             |
| 2    | `@hyperscript-tools/i18n` package (CLI + Eleventy plugin + programmatic API)                                                 | ✅ done in monorepo                                                             |
| 3a   | lokascript-docs patterns page: language chip grid + live-execution toggle (in shared partial, gated by `enableTranslations`) | ✅ landed in `_hyper_min` commit `80214fd`                                      |
| 3b   | hyperfixi-docs patterns page: verify engine showcase                                                                         | 📄 verification doc ready: [hyperfixi-docs-patch.md](./hyperfixi-docs-patch.md) |
| 4    | Drop-in integration guide for hyperscript.org's audience (lives on lokascript.org)                                           | 📄 ready: [integration-guide.md](./integration-guide.md)                        |
| 5    | Carson hand-off message                                                                                                      | 📄 ready (two variants): [carson-handoff.md](./carson-handoff.md)               |

## What's done in the monorepo (no further code work required)

- [`packages/multilingual-hyperscript/`](../../packages/multilingual-hyperscript/) — wrapper now copies all 31 adapter bundles into its own `dist/` via [`scripts/copy-bundles.mjs`](../../packages/multilingual-hyperscript/scripts/copy-bundles.mjs). `npm pack --dry-run` confirms 1.2 MB tarball, 35 files. CDN URLs (`unpkg.com/@hyperscript-tools/multilingual/dist/...`) will resolve cleanly once published.
- [`packages/hyperscript-tools-i18n/`](../../packages/hyperscript-tools-i18n/) — new package. Re-exports `@lokascript/i18n` translation API, ships a CLI (`npx @hyperscript-tools/i18n translate <html> --langs ja,es,ko --out <dir>`) and an Eleventy plugin entry. Verified end-to-end on a fixture across SVO, SOV, VSO word orders.

## What's outside the monorepo

- `~/projects/_hyper_min/` — chip strip + live-execution toggle landed in commit `80214fd` (shared partial at `packages/layouts/includes/patterns-page.njk`, gated by `enableTranslations`).
- `~/projects/_hyper_min/sites/hyperfixi-docs/` — verification only per [hyperfixi-docs-patch.md](./hyperfixi-docs-patch.md). No required edits.
- **Pending:** new page on lokascript.org carrying [integration-guide.md](./integration-guide.md). The Carson hand-off message currently links to `https://lokascript.org/integration-guide`; update if you pick a different URL.

## Decisions baked in

- **Both sites stay on `@lokascript/*` / `@hyperfixi/*` deps.** The `@hyperscript-tools/*` URLs only appear in the integration guide aimed at _external_ sites. Forcing the neutral namespace onto our own sites was self-aliasing busywork.
- **Audience split: hyperfixi.org = engine showcase, lokascript.org = multilingual demo.** The hyperfixi-docs patterns page already has the cross-link; no UI changes needed.
- **Switcher UX = compact chip grid (24 chips, native names + ISO codes).** Decided over single `<select>` and regional tabs.
- **Build-time companion = wrapper + CLI + Eleventy plugin.** Vite plugin can come later if Carson asks.

## Pre-publish gate (before sending Carson the hand-off)

1. `npm publish` from `packages/multilingual-hyperscript/` — confirms the new dist-with-bundles works against the live npm registry.
2. `npm publish` from `packages/hyperscript-tools-i18n/`.
3. Apply the lokascript-docs patch, deploy, smoke-test.
4. Deploy the integration guide page.
5. Walk through the pre-send checklist in [carson-handoff.md](./carson-handoff.md).
