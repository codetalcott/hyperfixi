# Spike: Vite+ toolchain (oxlint + tsdown/rolldown) on `packages/semantic`

_Branch: `chore/vite-plus-spike`. Date: 2026-07-15. Bounded spike per the toolchain
discussion — evaluate Vite+'s **engines** (oxlint for lint, tsdown/rolldown/oxc for build)
on one representative package, since the `vp` wrapper is `vite-plus@0.2.4` (pre-1.0) and
delegates to these anyway. Nothing was installed into the workspace; all runs were `npx`._

## Why this spike

The `@typescript-eslint@8.64.0` peer (`typescript <6.1.0`) blocks TS 7 in Dependabot #670.
Oxc/oxlint decouples linting from the `typescript` version entirely, and Vite+ bundles
oxlint + oxfmt + tsdown/rolldown. Question: how close is the Oxc toolchain to viable here,
and does it actually unblock TS 7?

## Findings

### Lint — oxlint (`oxlint@1.74.0`)

- **Works, and is ~10× faster.** oxlint over `packages/semantic/src`: **sub-second, exit 0**.
  Current ESLint over the same tree: **~8 s**.
- **Not a byte-identical drop-in.** Default oxlint = 29 warnings, but a *different set* than
  ESLint:
  - 27 are from plugins the repo's ESLint config doesn't run (`unicorn`, `import`). 25 of
    those are `unicorn(no-thenable)` **false-positives** on the language profiles' `then:`
    keyword property. → need an `.oxlintrc.json` scoped to the repo's ruleset.
  - oxlint did **not** flag the **12 errors** ESLint reported (`no-case-declarations`,
    `no-constant-condition` — likely oxlint's `no-constant-condition` allows `while(true)`).
  - Net: migration = write a tuned `.oxlintrc.json` **and** reconcile a handful of
    rule-behavior differences. Not a pure swap, but small.
- **This is the piece that actually fixes #670**: adopting oxlint removes `@typescript-eslint/*`
  from the dep graph, so the TS-version-vs-linter peer conflict disappears permanently. (oxfmt
  can likewise retire `prettier`, the other Dependabot group-breaker.) The repo uses **zero
  type-aware lint rules** (no `parserOptions.project`), so there is no type-aware coverage to
  lose — oxlint covers the syntactic set it uses.

### Build — tsdown/rolldown/oxc (`tsdown@0.22.8`, rolldown `v1.1.5`)

- **JS transform + bundle: works, very fast.** `tsdown src/index.ts --format esm,cjs --no-dts`
  built semantic's main entry in **~131 ms**, emitting `index.mjs` (1.15 MB) + `index.cjs`.
- **Output shape differs from tsup.** tsdown **code-splits by default** → 60+ per-language
  chunks (`arabic-*.mjs`, `japanese-*.mjs`, …), where the current tsup config uses
  `splitting: false` (single bundle). Would need config to match the shipped `dist/` shape.
  It also surfaced real `INEFFECTIVE_DYNAMIC_IMPORT` warnings (modules in `language-loader.ts`
  imported both statically and dynamically) — a genuine code-structure observation.
- **DTS is the crux, and it's where TS 7 actually lives.** tsdown's **tsc-free** DTS path
  (oxc-based) requires **`isolatedDeclarations: true`**; otherwise it falls back to needing
  `typescript` (tsc) — i.e. no tsc decoupling, no TS 7 benefit on the declaration side.
  - Measured cost for one package: **`tsc --isolatedDeclarations` reports 72 violations in
    `packages/semantic`** (47× TS9010 "needs explicit type annotation", 23× TS9013 "type can't
    be inferred", + a couple others). Mechanical to fix (annotate public-export types; codemods
    exist), but real — call it a few hundred annotations across the ~35-package monorepo to
    unlock tsc-free DTS.
- **Untested (bulk of the real migration):** the many **browser IIFE regional bundles** in
  `tsup.config.ts` (`globalName`, `treeShaking` toggles, `esbuildOptions` passthrough) would
  each need porting to rolldown/tsdown equivalents.

## Bottom line

The spike **confirms the earlier recommendation empirically** and cleanly separates the two
halves:

1. **Lint side = the easy, high-value win, and it's what unblocks TS 7.** Adopt oxlint
   (config-tuned) + optionally oxfmt. Low risk (no type-aware rules in use), ~10× faster,
   removes `@typescript-eslint/*` (and `prettier`) — so the TS-version peer conflict is gone.
   This does **not** require Vite+ or any build change.
2. **Build side = a real, deliberate project — this is where TS 7 viability lives, not in the
   linter.** rolldown/tsdown transform is excellent and fast, but adopting it means (a) porting
   the multi-bundle tsup configs and (b) adopting `isolatedDeclarations` (72 violations in
   semantic alone) for tsc-free DTS. Size it as hundreds of annotations + per-bundle config
   porting; sequence it as its own migration, package by package.
3. **`vp` wrapper** (`vite-plus@0.2.4`, pre-1.0): the engines above are what matter and are
   adoptable independently today. Wrapping them under `vp` is a later packaging step, worth
   revisiting once it's closer to 1.0.

**Recommended next step:** land oxlint (with a scoped `.oxlintrc.json`) as its own change —
it retires the typescript-eslint peer and the whole TS6/TS7 lint entanglement — then treat the
tsdown + isolatedDeclarations build migration as a separate, staged effort that is the actual
TS 7 enabler.

---

## Addendum — 2026-07-16: the real blocker is decorators, and core is not what the spike assumed

_Findings from a follow-up investigation triggered by the red vitest 4.1.10 Dependabot PRs
(#694/695/696). Everything below was measured, not inferred. Two of the bottom-line items
above are now **superseded** — see "Corrections" at the end._

### The decision criterion is COVERAGE, not maturity

Item 3 above ("revisit once it's closer to 1.0") frames this as a maturity question. That is
the wrong test. The Vite team's own position is: _"Vite+ is stable, but not yet complete. We
recommend adopting Vite+ if it covers the features you are looking for in a unified
toolchain."_ So the question is **does it cover what we use** — which is answerable, and
mostly now answered. `vite-plus` is still `0.2.4` (unchanged since 2026-07-08); it is
VoidZero's (`github.com/voidzero-dev/vite-plus`, MIT — the npm name's 2022 history is
inherited, not theirs).

### Vite 8 + Oxc does not lower native decorators — and core is full of them

**This is the finding that matters, and the spike missed it entirely** by testing
`packages/semantic` (which has no decorators).

- Vite 8 has **no esbuild dependency at all** — it transforms with **Oxc** (`rolldown ~1.1.x`,
  `lightningcss`, `postcss`). Vite 7 transforms with esbuild.
- Vite's own migration guide (§"JavaScript transforms by Oxc"): _"Currently, the Oxc
  transformer does not support lowering native decorators as we are waiting for the
  specification to progress."_
- Verified directly — `transformWithOxc()` on `packages/core/src/commands/dom/toggle.ts`
  emits `export @meta({ … }) @command({ … }) class ToggleCommand` — decorators **raw**.
  The same file through esbuild (vite 7) correctly emits `var _ToggleCommand_decorators`.
- **`packages/core` has 51 files carrying `@command`/`@meta`**, and they are TC39 stage-3
  decorators — `command()` takes `(target, context: ClassDecoratorContext)`
  (`src/commands/decorators/index.ts:103-107`), and **no tsconfig repo-wide sets
  `experimentalDecorators`**. Decorators exist in **core only**.

**It is NOT a hard blocker.** Vite documents two workarounds, both targeting `'2023-11'`
(which matches core's `ClassDecoratorContext` shape exactly):

```ts
// @rolldown/plugin-babel@0.2.3 + @babel/plugin-proposal-decorators@8.0.2
import babel from '@rolldown/plugin-babel'
plugins: [babel({ presets: [decoratorPreset({ version: '2023-11' })] })]
// filter: { code: '@' }  — only files containing '@', for perf
```

…or `@rollup/plugin-swc@0.4.1` + `@swc/core@1.15.43` with the same `'2023-11'` setting.

**The cost, stated plainly:** adopting Vite+ to _reduce_ dependency complications would, for
this repo, mean **adding babel or swc back** purely to lower decorators — and that stays
until the TC39 spec lands. Not disqualifying; do go in with eyes open.

### core is NOT the migration problem the spike expected

The spike named its own gap: _"Untested (bulk of the real migration): the many browser IIFE
regional bundles."_ That gap is **core's 23 `rollup*.config.mjs`**. Inventoried — three
assumptions were wrong, all in migration's favour:

- **Zero custom/inline plugins** across all 23 configs. The spike's "hardest to port"
  category is **empty** for core.
- **Zero** `banner`/`footer`/`intro`/`outro`/`output.globals` uses.
- **core does not use tsup at all** (rollup + tsc only), and every config sets
  `declaration: false` — types come from `tsc -p tsconfig.build.json`. So **core sidesteps
  the "DTS is the crux" / `isolatedDeclarations` finding entirely.** That cost lives in the
  32 tsup packages, not here.
- **tsdown does support `iife` and `umd`** (correcting the implicit "no browser bundles"
  fear). Global-name control via `outputOptions` passthrough is unverified.
- ~5 of the 23 configs are **dead** (`rollup.browser-textshelf-{minimal,profile}`,
  `rollup.browser-debug`, `rollup.browser-dev`, `rollup.debug` — zero references in any
  script/orchestrator/baseline/CI). Deleting them drops the surface to ~18 and removes both
  `treeshake` uses.

#### The real Tier-1 risks for a core bundle migration

1. **Selective `drop_console: ['log','info','debug','trace']`** (terser array form,
   `rollup.browser.config.mjs:50-53`). Does oxc-minify support per-method granularity or only
   a boolean? If boolean-only, a migration either loses log stripping or re-introduces the
   exact incident `src/compatibility/browser-tests/error-observability.spec.ts` guards.
   **Cheapest gating question — answer this first.**
2. **`@rollup/plugin-alias` dedupe** — without it the bundle shipped core+semantic twice
   (~534 KB gz vs ~290).
3. **`inlineDynamicImports: true`** in ~15 configs, forcing single-file output despite a
   circular dep in `src/expressions/conversion/`. **rolldown code-splits by default** — the
   spike already hit exactly this on semantic.
4. **`@rollup/plugin-typescript` with per-config `compilerOptions`/`paths` overrides**
   (`rollup.browser-classic-i18n.config.mjs:49-63` cross-compiles `../i18n/src`).

#### ⚠️ The safety net is not armed

`.github/workflows/ci.yml` "Check size limits" sets `failed=0`, emits only `::warning::`, and
never assigns `failed=1` — so `exit $failed` **always exits 0. It cannot fail.** And core's
real ±5% ratchet (`snapshot:bundle-size` → `scripts/bundle-size-snapshot.mjs --check` vs
`scripts/bundle-snapshots/baseline.json`) is **wired into no workflow**. The 534 KB
duplicate-bundle incident would not be caught today. **Arm this before any bundler work** —
without it, "did the bundle stay the same size" has no reliable answer.

### Corrections to the bottom line above

- **Item 3 is superseded.** "Revisit once closer to 1.0" is the wrong test; use coverage.
  The live coverage gaps are the four Tier-1 risks above — not maturity, and not DTS.
- **Item 2 is half-superseded.** `isolatedDeclarations` is real but is **not** a core
  problem (core's DTS comes from tsc). It gates the tsup packages only.
- **New, blocking-ish:** Vite 8/Oxc + TC39 decorators. Core cannot run on Vite 8 — including
  under vitest, which is how this surfaced — without a babel/swc decorator plugin. See
  `docs-internal/HANDOFF_vitest-oxc-decorators.md`.

## Reproduction (all `npx`, no workspace install)

```bash
# Lint
npx oxlint@1.74.0 packages/semantic/src            # sub-second, exit 0 (default ruleset)
npx eslint packages/semantic/src --ext .ts         # ~8 s baseline

# Build (from packages/semantic)
npx tsdown@0.22.8 src/index.ts --format esm,cjs --no-dts --out-dir dist-tsdown --no-clean
tsc -p tsconfig.json --isolatedDeclarations --declaration --emitDeclarationOnly --outDir /tmp/id-test
#   -> 72 errors = the tsc-free-DTS / TS7-ready cost for this package

```

