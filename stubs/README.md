# stubs/

npm-name management packages. **Not workspaces** (root globs are `packages/*`, `apps/*`) — deliberately outside lockstep versioning, `ensure-fresh`, and all guarded CI package lists. Nothing here is built or tested by CI; each directory is published by hand, if at all.

Two different kinds live here:

## Name placeholders (`hyperfixi/`, `lokascript/`)

Claim the bare unscoped names, which stale published READMEs reference and which were unclaimed until 2026-08. **Non-functional on purpose**: `index.js` throws with a pointer to the real packages. They are not aliases — a functional re-export would make `import { hyperscript } from 'hyperfixi'` work outside Vite but fail inside it, because `@hyperfixi/vite-plugin` intercepts both names ahead of node_modules resolution and serves a virtual module with different exports. One name, two meanings — the placeholder avoids that by working nowhere.

Publish once, then deprecate immediately (`npm deprecate <name> "..."`); no per-release maintenance.

## Rename stubs (`lokascript-*/`)

Functional re-export wrappers for the `@lokascript/*` → `@hyperfixi/*` engine rename (MIGRATION.md § npm Stub Packages), written for v2.0.0 but **never published**. As of 2026-08-03, of the 8 names only 4 ever existed on the registry (`core`, `vite-plugin`, `mcp-server`†, `patterns-reference`† — †no stub dir), all now deprecated with pointer messages; the other 6 were never published, so their stubs guard nothing yet.

Publishing these is a **deliberate, separate decision**: it changes what `latest` resolves to for existing installs (real 1.x/2.0.0 code → thin wrapper pulling `@hyperfixi/*@^2`). Two traps if you proceed:

1. The `"deprecated"` field in their package.json files is **not honored by npm** — only the `npm deprecate` CLI writes registry deprecation. Published as-is they land _undeprecated_; each needs a follow-up `npm deprecate` call.
2. Their `@hyperfixi/*` dependency ranges are hand-maintained (`^2.0.0`) and outside `set-version.cjs`'s reach.

Brand context: the code-level rename **to** `@lokascript/*` was cancelled 2026-07-13 (see the SUPERSEDED banner in `docs-internal/analysis/LOKASCRIPT_REBRAND_ASSESSMENT.md`) — engine = `@hyperfixi/*`, multilingual = `@lokascript/*`, revisit only at a v3-scale break.
