# Handoff: make `@hyperfixi/core` Node/SSR-safe (morphlex) + evaluate morph alternatives

> **STATUS (2026-07-08): RESOLVED — shipped in 2.7.2.**
>
> - **Decision 1 (shipped):** guarded DOM-globals shim
>   (`packages/core/src/lib/dom-globals-shim.ts`), hardened beyond the proposal below —
>   morph-adapter imports and *uses* the shim's exported `domGlobalsEnsured` const so the
>   package's `"sideEffects": false` can't let downstream statement-level treeshakers
>   (Rollup/Vite SSR) drop the shim while retaining morphlex. Covers `.`, `./commands`,
>   and `./behaviors` (the last also inlines morphlex — not in the original analysis).
>   Regression guards: `scripts/check-node-import.mjs` (per-PR, in the CI
>   `export-validation` job) + a core import check in the release-smoke `node-smoke.mjs`.
>   morphlex range bumped `^1.0.5` → `^1.4.0`. Reactivity's dynamic import kept as
>   defense-in-depth.
> - **Decision 2 (settled): keep morphlex.** Only morphlex has native `preserveChanges`
>   (all 4 call sites rely on it); it's actively maintained (1.4.0, 2026-03), small
>   (~2.4 KB gz), and algorithmically current (id-set + LIS + moveBefore — same family as
>   the idiomorph-derived morph htmx v4 beta inlined). Alternatives evaluated: idiomorph
>   (Node-safe, +1 KB, dirty-input preservation must be reimplemented via hooks), morphdom,
>   nanomorph (unmaintained), fixi's paxi.js (42-line vendorable, implicit input
>   preservation, no options/moveBefore), native `moveBefore()` alone (Safari hasn't
>   shipped it). Revisit triggers: head-merge need, morphlex maintenance stall, or
>   htmx-v4/fixi byte-alignment for the hx-compat layer. Follow-up: file the one-line
>   upstream guard PR against `yippee-fun/morphlex`
>   (`typeof Element !== 'undefined' && "moveBefore" in Element.prototype`).

**For a fresh Claude Code session. Enter plan mode and produce a plan covering the two
decisions below. They are separable — you can ship Decision 1 without settling Decision 2.**

---

## TL;DR

Importing `@hyperfixi/core`'s main index in bare Node/SSR throws
`ReferenceError: Element is not defined`. Root cause: the vendored `morphlex`
(`^1.0.5`) runs `"moveBefore" in Element.prototype` at **module scope**, and core's
index reaches it (via the `swap` command). This is pre-existing; it surfaced during
the 2.7.x release when `@hyperfixi/reactivity`'s `bind` started importing core's
index and the release smoke test's Node-import check failed.

Two decisions:
1. **Node-safety hardening** — small, low-risk. Ship a guarded DOM-globals shim (proposal below).
2. **morphlex vs alternatives** — architecture call. Evaluate whether to keep morphlex or replace it.

## Context: what already shipped (do not redo)

- **`@hyperfixi/core@2.7.1` is published** (all ~35 packages synced; `latest`).
  2.7.0 = element-scoped `:name` + numeric `increment @attr`; 2.7.1 = hotfix below.
- **2.7.1 reactivity workaround is in place and sufficient for now:** `bind`
  (`packages/reactivity/src/bind.ts`) loads `getElementScopeMap` via a **dynamic**
  `import('@hyperfixi/core')` *inside the evaluator* (which only runs in a browser),
  instead of a static top-level import — so the reactivity package imports cleanly
  in Node. The general core-index Node-safety gap remains open; that's this task.
- Downstream `~/projects/_hyper_min` is already bumped to `@hyperfixi/core@^2.7.1`.

## Root cause (verified)

- `packages/core/src/lib/morph-adapter.ts` does `import { morph, morphInner } from 'morphlex'`.
- morphlex's bundled code has `var SUPPORTS_MOVE_BEFORE = "moveBefore" in Element.prototype;`
  at module top level → evaluates on import → throws in Node (no `Element`).
- Reachability into the index: `swap` command → `lib/swap-executor.ts` /
  `commands/dom/process-partials.ts` → `lib/morph-adapter.ts` → `morphlex`;
  `commands/index` → core `src/index.ts`.
- The morph *functions* are already browser-only (`morphInner` calls
  `document.createElement`). Only the eager module-load evaluation is the problem.
- Confirmed a dummy `Element` is enough: with `globalThis.Element ??= class {}` set
  before import, `await import('@hyperfixi/core')` succeeds in Node (53 exports).
  (Re-verify this yourself — figures/paths drift.)

## Decision 1 — proposed fix: guarded DOM-globals shim (NOT yet shipped)

Add a side-effect module and import it **before** morphlex so it evaluates first.
Placement in `morph-adapter.ts` (not just `index.ts`) is deliberate: ESM evaluates
imported modules in declaration order, so putting the shim first in the module that
*owns* the morphlex import covers **every** entry path that reaches morphlex — the
main index, the `/commands` and `/dom` subpath exports, and any plugin that pulls them.

```ts
// packages/core/src/lib/dom-globals-shim.ts
// Vendored morph libs do module-scope DOM feature-detection
// (`"moveBefore" in Element.prototype`) that throws in bare Node/SSR. Provide dummy
// constructors when there's no DOM so the *import* doesn't crash; a real browser keeps
// its real globals. This does NOT make morph work headless — morph still needs a real
// DOM to run; it only prevents the import-time crash.
if (typeof globalThis.Element === 'undefined') (globalThis as any).Element = class {};
// Add Node/HTMLElement too if a rebuilt bundle still throws on a different global.
```

```ts
// morph-adapter.ts — shim import must be FIRST, before morphlex
import './dom-globals-shim';
import { morph as morphlexMorph, morphInner as morphlexMorphInner } from 'morphlex';
```

**Caveats / must-verify:**
- Global mutation, but guarded (`typeof … === 'undefined'`) so it only fires in a
  no-DOM env; no-op in browsers.
- **Verify bundler order:** rebuild core (`npm run build --prefix packages/core`) and
  confirm the shim's code appears *before* morphlex in `dist/index.mjs`, then test
  `node --input-type=module -e "import('@hyperfixi/core').then(()=>console.log('ok'))"`
  with **no** external shim. (The earlier proof used an external pre-import; the built
  order is the thing to confirm.)
- Decide whether to **revert reactivity's dynamic import back to a static import** once
  core is Node-safe (single mechanism), or keep it as defense-in-depth. Recommendation:
  keep reactivity as-is (it works); the shim is the general fix.
- Consider adding a **Node-import regression test**: extend the release smoke fixture
  (`examples/release-smoke/fixtures/node-smoke.mjs`) with an `await import('@hyperfixi/core')`
  check, and/or a plain vitest that imports the index under Node.
- Rejected alternative: lazy `await import('morphlex')` in morph-adapter — forces
  `executeSwap()` (currently **sync**, `lib/swap-executor.ts`) to become async, rippling
  to all `swap` callers. Too invasive for no gain over the shim.

## Decision 2 — morphlex vs alternatives (the open architecture question)

Evaluate whether to keep `morphlex` or replace it. Candidates to compare:
- **Idiomorph** (what htmx uses) — DOM morphing, `head` merging, id-set matching.
- **morphdom** — the original; widely used, simple.
- **nanomorph** — tiny.
- **Native `Element.moveBefore()`** — the very API morphlex feature-detects; leaning on
  it (with fallback) may reduce/replace the dep.

**Evaluation criteria:**
1. **Node/SSR-safety** — does importing it evaluate DOM globals at module scope? (The
   whole reason we're here. Prefer libs that don't, or that we can shim once.)
2. **Feature parity with what we actually use** — critically `preserveChanges`
   (in-flight form-input preservation during swaps). We pass `preserveChanges: true`
   from `commands/dom/swap.ts` (3 sites) and `process-partials.ts`, and default it true
   in `morph-adapter.ts`. Any replacement must preserve modified form inputs during
   morph, or we need to reimplement that.
3. **Bundle size** (gzipped) — morph goes into the big browser bundles; compare deltas.
4. **Maintenance / API stability / types.**
5. **Migration cost** — `morph-adapter.ts` is a thin, single seam (good); the swap
   command and `process-partials` are the only consumers.

Deliverable for Decision 2: a recommendation (keep morphlex + shim, or switch), with
the size/parity/safety trade-off and a migration sketch if switching.

## Key files

- `packages/core/src/lib/morph-adapter.ts` — the single morphlex seam (`morph`, `morphInner`).
- `packages/core/src/lib/swap-executor.ts` — `executeSwap()` (**sync**), calls morphAdapter.
- `packages/core/src/commands/dom/swap.ts`, `commands/dom/process-partials.ts` — consumers; pass `preserveChanges: true`.
- `packages/core/src/index.ts` — main library entry (what breaks in Node).
- `packages/core/package.json` — `"morphlex": "^1.0.5"`; browser-bundle + build scripts.
- `examples/release-smoke/fixtures/node-smoke.mjs` — the Node-import gate that caught this.

## Constraints / gotchas (read the saved memories)

- **Do not break the browser bundles.** morph must keep working in `hyperfixi.js` /
  `hyperfixi-hx-v4.js`. Rebuild and run the relevant Playwright morph/swap specs.
- **Publishing is monorepo-wide and heavy** — `scripts/set-version.cjs <ver>` syncs ALL
  ~35 packages; the publish workflow gates on a Node-import release smoke test; the
  `publish.yml` build order must keep `semantic` before the `domain-*` packages. See the
  saved memory `publish-release-gotchas` before any release. This fix would ship as **2.7.2**.
- Core suite is large (~7000 tests, timeout-wrapped; esbuild-daemon hang is expected —
  see root CLAUDE.md). Validate core + reactivity + a morph/swap Playwright spec.

## Suggested order

1. Enter plan mode; re-verify the root cause and the shim-order claim against the current tree.
2. Plan Decision 1 (shim + regression test) as the shippable near-term fix.
3. Plan Decision 2 (morph-lib evaluation) — can be a follow-up; note if the choice would
   change the Decision-1 approach (e.g. a Node-safe replacement might remove the need for a shim).
4. Present the plan; on approval, implement, validate, and ship as 2.7.2.
