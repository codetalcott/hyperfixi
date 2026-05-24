# release-smoke

End-to-end smoke test for the **published** `@hyperfixi/*` / `@lokascript/*`
npm packages. Run it after every release to catch registry-artifact bugs that
the in-repo test suites structurally cannot — because vitest aliases
`@hyperfixi/*` to local source, never the published tarball.

## What it checks

1. **Install resolution** — `npm install`s the published packages into an
   isolated temp dir outside the repo (so npm resolves from the registry, not
   the `packages/*` workspaces). Catches a published package depending on an
   unpublished or `private` one — e.g. the `@hyperfixi/core → @lokascript/intent`
   404 that shipped in v2.4.0.
2. **Node import surface** — imports each Node-safe package and asserts its
   `exports` map resolves and key symbols (`speechPlugin`, `reactivityPlugin`,
   `parseSemantic`, `GrammarTransformer`, the vite plugin factory) are intact.
3. **Browser bundles** — serves the published `hyperfixi.js` and
   `hyperfixi-hx-v4.js` bundles and drives them with Playwright/chromium:
   a `toggle`/`put` round-trip on the full bundle, and an `hx-live` reactive
   update on the hx-v4 bundle.

`@hyperfixi/core` and `@hyperfixi/components` reference browser globals at
module scope and can't be imported in bare Node — they're covered by the
browser stage, not the Node stage.

## Usage

```bash
node examples/release-smoke/run.mjs            # tests the "latest" dist-tag
node examples/release-smoke/run.mjs 2.4.0      # tests a specific version
node examples/release-smoke/run.mjs --matrix   # adds the bundle compatibility matrix
node examples/release-smoke/run.mjs --matrix 2.5.0
```

Exit `0` = all green, `1` = any failure. Each check prints a `✓`/`✗` line.

### `--matrix` (opt-in, comprehensive browser stage)

By default the harness only drives two browser pages (toggle/put on the full
bundle, `hx-live` on hx-v4). With `--matrix`, it additionally serves the repo's
`examples/` and `packages/core/test-pages/` to Playwright, but rewrites
`/packages/core/dist/*` to the registry-installed `node_modules/@hyperfixi/core/dist/`.
That points two in-repo specs at the published tarball:

- [`bundle-compatibility.spec.ts`](../../packages/core/src/compatibility/browser-tests/bundle-compatibility.spec.ts) — 8 bundles × gallery examples + bundle-specific tests (~92 tests)
- [`hx-v4-features.spec.ts`](../../packages/core/src/compatibility/browser-tests/hx-v4-features.spec.ts) — hx-v4 distinctive surface: `hx-live`, multi-dep reactivity, two-way `bind`, SSE mock streaming, WS mock round-trip, hx-on:click in slim bundle without reactivity (~6 tests)
- [`i18n-orchestrator-api.spec.ts`](../../packages/core/src/compatibility/browser-tests/i18n-orchestrator-api.spec.ts) — guards the v2.5.0 terser regression where `window.__hyperfixi_i18n.register` was mangled out of the minified hybrid-hx / hybrid-hx-v4 bundles, silently breaking every `vocab/htmx/{lang}.js` module on load (2 tests, ~600 ms)

The webroot also exposes `packages/core/vocab/` (from the registry tarball) so
[`i18n-htmx.spec.ts`](../../packages/core/src/compatibility/browser-tests/i18n-htmx.spec.ts) can be wired in once two underlying bugs are resolved: localized `hx-live` counters don't re-render on global writes (reactivity / notify-hook), and `fetch ... as html` → `put it into target` stringifies the parsed `DocumentFragment` instead of inserting it (swap pipeline). Both are pre-existing and separate from the vocab-packaging signal the orchestrator-api spec now covers.

Slower (~minutes) and noisier (Playwright's line reporter streams), but it's
the most comprehensive browser-level signal we have against actual npm
artifacts. Run it after publishing a new minor/major or before tagging a
release.

## Requirements

- Network access to `registry.npmjs.org`.
- Playwright + its chromium browser. Playwright is a devDependency of
  `packages/core` (hoisted to the repo-root `node_modules`); if chromium is
  missing, install it once with `npx playwright install chromium`.

## Notes

- Nothing is installed into the repo — the harness uses a fresh
  `mkdtemp` dir and removes it on exit.
- A just-published version can take a few minutes to propagate across the
  npm CDN; if `run.mjs` reports an install 404 immediately after a publish,
  wait and re-run.
