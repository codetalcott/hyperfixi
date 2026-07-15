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
