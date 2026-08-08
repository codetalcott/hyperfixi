# Handoff: TypeScript 6 migration (unblock Dependabot #698)

Paste the block below into a fresh session. Everything above the `---` is orientation
for a human; the prompt itself starts after it.

**Arc state:** scoped, not started. `rootDir` prep is in PR #713 (green). The remaining
work is **blocked on tsup**, not on repo code — see "The real blocker" below. All
findings here are measured against a real TypeScript 6.0.3 install, not inferred.

---

MISSION: Land `typescript` 5.9.3 → 6.0.3 (Dependabot #698), which has been red since it
opened. The work is small in code terms but has a hard ordering constraint and one
genuine unknown (tsup). Do not budget it as "a dependency bump."

## What is already true (measured, do not re-derive)

Probed with a throwaway TS 6.0.3 (`npm i --prefix /tmp/ts6 typescript@6.0.3`) plus one
full real-toolchain install:

| Signal | Result under TS 6.0.3 |
| --- | --- |
| `typecheck` (`tsc --noEmit`), all 43 packages | **0 errors** |
| `build:types` (tsc emit), all packages, pre-#713 | TS5011 in **14** packages |
| `build:types`, all packages, post-#713 | **only `core`** — 55 errors |
| `core` with `"types": ["node"]` added | **0 errors** |
| Full ordered build (real TS6 install) | **TS5101 from tsup's dts** — the blocker |

### 1. TS5011 (`rootDir`) — DONE in PR #713

TS 6 requires `rootDir` explicit once `outDir`/`declarationDir` is set. #713 sets
`"rootDir": "./src"` in the 14 packages that emit via tsc and trigger it. It is a
verified no-op (TS 6 reports `./src` as the common source dir for all 14; the emitted
`.d.ts` tree is byte-identical before/after under 5.9.3). **Merge #713 first.**

### 2. `core` node types — 1 line, not yet landed

With `rootDir` set, core surfaces **55** errors (TS2591/TS2304/TS2503: `process`,
`require`, `global`, `NodeJS`, `perf_hooks`) across 12 files. Cause: TS 5.x
auto-included every `@types/*` package; TS 6 does not. Fix, verified to take it to 0:

```jsonc
// packages/core/tsconfig.build.json
"types": ["node"],
```

Why only `tsconfig.build.json` and not `tsconfig.json`: the latter includes
`vitest.config.ts`, which transitively pulls vite→node types in, so typecheck passes.
`tsconfig.build.json` includes `src/**/*` only, so nothing supplies them. That asymmetry
is also why #709 could report "0 errors repo-wide" with all of this underneath.

## The real blocker: tsup injects a deprecated `baseUrl`

`node_modules/tsup/dist/rollup.js:6837`:

```js
baseUrl: compilerOptions.baseUrl || ".",
```

tsup **unconditionally injects `baseUrl: "."`** into its dts build's compilerOptions.
Under TS 6 that is `error TS5101: Option 'baseUrl' is deprecated and will stop
functioning in TypeScript 7.0`, and it fails the build (`DTS Build error`, exit 1). It is
NOT a repo tsconfig issue — no tsconfig in the repo sets `baseUrl` (#708 removed the last
one; only a comment in `packages/core/tsconfig.json` mentions it). Proof: removing core's
`paths` entirely does not help, and `patterns-reference` — which has no `baseUrl`, no
`paths`, and does not even extend `tsconfig.base.json` — still fails.

**tsup 8.5.1 is the latest release; there is no upstream fix to take.** 24 tsup configs
build dts; 40 packages use tsup.

### The ordering constraint that makes this one PR

The workaround is `ignoreDeprecations: "6.0"` in the dts compilerOptions (verified: takes
i18n's build from `DTS Build error` to `DTS ⚡️ Build success`). But:

```
$ npx -p typescript@5.9.3 tsc -p tsconfig.json     # with ignoreDeprecations: "6.0"
tsconfig.json(1,46): error TS5103: Invalid value for '--ignoreDeprecations'.
```

**TS 5.9.3 REJECTS `ignoreDeprecations: "6.0"`.** So it cannot be pre-landed on main the
way #713 was — it must ship in the SAME PR as the typescript bump. That is the whole
reason this is one atomic changeset rather than incremental prep.

## Options for the blocker (pick before starting)

1. **Workaround, one PR** — add `ignoreDeprecations: "6.0"` to each tsup dts config that
   fails, together with the typescript bump. Cheapest. Cost: ~24 configs carry a
   deprecation-silencer that must be removed again for TS 7 (where `baseUrl` is REMOVED,
   so tsup's injection becomes a hard unknown-option error regardless — tsup must fix it
   upstream before TS 7 is possible at all).
   **Sweep, do not guess the count**: the ordered build fails at the FIRST package, so
   fixing i18n just moved the error to patterns-reference. Iterate to a clean full build.
2. **Fix tsup upstream** (make the injection conditional) and take a patched release.
   Correct, slow, unblocks TS 7 too.
3. **Migrate off tsup's dts** — already on the roadmap for TS 7 ("tsc-free DTS needs
   `isolatedDeclarations`, 72 violations in packages/semantic alone", dependabot.yml).
   Biggest, but retires the blocker permanently.

Recommendation: (1) to unblock #698 now, and open an upstream tsup issue for (2). Do not
start (3) for this.

## Plan

1. Merge #713 (`rootDir`) — prerequisite.
2. Branch from #698 (`dependabot/npm_and_yarn/typescript-6.0.3`) or bump typescript
   yourself; the bump and the fixes must be one PR.
3. Add `"types": ["node"]` to `packages/core/tsconfig.build.json`.
4. Iterate the full ordered build, adding `ignoreDeprecations: "6.0"` to each failing
   tsup dts config until clean.
5. Verify (below). Fold this doc's outcome into that PR and delete the doc.

## VERIFICATION PROTOCOL

- `npm run test:multilingual:build-deps` — the ordered build; this is what surfaces the
  tsup dts failures. `npm run build` is NOT dependency-ordered and swallows errors.
- `npm run typecheck` across packages (expected 0 — it already is under TS6).
- `npm run test:affected`. **`domain-toolkit` "fails" because it has no test files (0 of
  them) — pre-existing, ignore it.**
- `npm run populate --prefix packages/patterns-reference` then
  `npm run test:canonical --prefix packages/testing-framework` (foreign gate is env-gated
  `FOREIGN_CANONICAL_VALIDITY=1`; the committed patterns.db LAGS — populate first).
- Fidelity ratchet: `npx tsx src/multilingual/cli.ts --full --bundle browser-priority
  --regression` from `packages/testing-framework`.
- A TS-version change can move emitted `.d.ts`, so **Export Validation** matters here —
  it verifies package.json exports still resolve to dist.

## Footguns

- **Never commit `packages/patterns-reference/data/patterns.db`** — `git checkout --` it.
- **A `--noEmit` probe cannot see TS 6's new diagnostics** — they are emit-only. This is
  exactly how "6.x probed clean" (dependabot.yml, since corrected) and #709's "0 errors
  repo-wide" were both true and both missed all of the above. Probe `build:types`.
- **TS5011 is a config error that aborts tsc before typechecking**, so it MASKS
  everything behind it. core looked like 1 error and was 56. Expect each fix to reveal
  the next layer; do not treat the first clean package as done.
- Probe with a throwaway install (`npm i --prefix /tmp/ts6 typescript@6.0.3`) to avoid
  touching the lockfile — but note the standalone binary does NOT exercise tsup/rollup
  dts, which is where the actual blocker lives. One real install is required to see it.
- Do NOT open a docs-only PR — fold docs into the code PR.
