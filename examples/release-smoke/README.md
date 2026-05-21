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
```

Exit `0` = all green, `1` = any failure. Each check prints a `✓`/`✗` line.

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
