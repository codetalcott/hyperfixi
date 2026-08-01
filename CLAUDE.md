# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HyperFixi** is a complete \_hyperscript ecosystem with server-side compilation, multi-language i18n (24 languages including SOV/VSO grammar transformation), semantic-first multilingual parsing, and comprehensive developer tooling. Engine packages are published under `@hyperfixi/*`, multilingual packages under `@lokascript/*`.

- **14,000+ tests** passing across all suites (core ~7000, semantic ~6500, i18n ~900, plus per-package suites)
- **~310 KB** full browser bundle (gzipped); slim bundles from **1.9 KB** (lite) to **21.5 KB** (hybrid-hx) — sizes re-measured 2026-07-24 (post-dedupe; the 2.7.x ~534 KB figure was a duplicate core+semantic copy, since removed — growth from ~299 is semantic-content growth from the July pick/vocab arcs plus the 2.9.0 `markerLegacy` data, single-copy verified). **Gzip sizes are platform-dependent** — `metadata.ts` carries the values CI measures (Linux zlib); a local macOS `update:sizes` reads ~2 KB lower on the full bundles. `update:sizes` tolerates ±2% drift and fails only when metadata is stale enough to mislead; the size-**regression** gate is `scripts/bundle-size-snapshot.mjs --check` (±5% vs `baseline.json`), and CI also enforces absolute ceilings. Never run `update:sizes:auto` locally and commit the result — `dist/` is untracked, so your tree may hold another branch's build; take the numbers from the CI job log.
- **\_hyperscript compatible** — tested via gallery examples, bundle compatibility matrix, and command/expression browser tests (Playwright)

## Monorepo Structure

```
packages/
├── core/           # Main hyperscript runtime, parser, commands (primary development)
│   ├── src/
│   │   ├── parser/           # Hyperscript parser with CommandNodeBuilder pattern
│   │   ├── runtime/          # Runtime execution engine
│   │   ├── commands/         # All command implementations (tree-shakeable factories)
│   │   └── expressions/      # 6 expression categories (references, logical, etc.)
│   └── dist/                 # Built bundles (hyperfixi.js)
│
├── i18n/           # Internationalization (24 languages + grammar transformation)
│   ├── src/
│   │   ├── grammar/          # SOV/VSO word order transformation
│   │   ├── dictionaries/     # Per-language keyword dictionaries
│   │   └── parser/           # Multilingual keyword providers
│   └── dist/                 # Built bundles (lokascript-i18n.min.js)
│
├── semantic/       # Semantic-first multilingual parsing (24 languages)
│   ├── src/
│   │   ├── tokenizers/       # Language-specific tokenizers (ar, bn, de, en, es, fr, he, hi, id, it, ja, ko, ms, pl, pt, qu, ru, sw, th, tl, tr, uk, vi, zh)
│   │   ├── generators/       # Pattern generation from command schemas
│   │   ├── parser/           # Semantic parser with confidence scoring
│   │   └── explicit/         # Language-agnostic intermediate representation
│   └── dist/                 # Built bundles (lokascript-semantic.browser.global.js)
│
├── vite-plugin/    # Zero-config Vite plugin for automatic bundle generation
│   └── src/
│       ├── scanner.ts        # Hyperscript detection in HTML/Vue/Svelte/JSX
│       ├── aggregator.ts     # Usage collection across files
│       └── generator.ts      # Minimal bundle generation
│
├── hyperscript-adapter/  # Multilingual plugin for original _hyperscript (preprocessor)
│   └── src/              # See packages/hyperscript-adapter/CLAUDE.md
│
├── htmx-adapter/    # Multilingual adapter for upstream htmx v4 (canonicalizing extension)
│   └── src/         # See packages/htmx-adapter/CLAUDE.md
│
├── framework/       # Shared DSL framework (createMultilingualDSL, DomainRegistry, CrossDomainDispatcher)
├── compilation-service/  # Multi-target codegen (React, Vue, Svelte components; Playwright tests)
├── mcp-server/      # MCP server exposing all tools (hyperscript + domain DSLs)
├── aot-compiler/    # Ahead-of-time compiler (hyperscript → JS, semantic → JS)
├── server-bridge/   # Server-side route extraction from HTML
│
├── domain-sql/      # SQL DSL (11 languages: en, es, ja, ar, ko, zh, tr, fr, de, pt, ru)
├── domain-bdd/      # BDD/Gherkin DSL (8 languages)
├── domain-behaviorspec/  # Interaction testing DSL (8 languages)
├── domain-jsx/      # JSX/React DSL (11 languages)
├── domain-llm/      # LLM prompt DSL (11 languages)
├── domain-todo/     # Todo management DSL (11 languages)
├── domain-flow/     # Reactive data flow DSL (11 languages)
├── domain-voice/    # Voice/accessibility commands DSL (11 languages)
├── domain-learn/    # Language learning DSL (10 languages)
│
├── patterns-reference/  # Queryable patterns database with multilingual translations
├── language-server/     # LSP implementation for LokaScript/hyperscript (21 languages)
├── behaviors/           # Reusable hyperscript behaviors (draggable, sortable, etc.)
├── types-browser/       # TypeScript type definitions for browser globals
│
├── language-server-hyperscript/ # LSP for original _hyperscript
├── multilingual-hyperscript/    # Multilingual plugin for original _hyperscript (24 languages)
├── vscode-extension/            # VSCode extension for LokaScript
├── vscode-extension-hyperscript/ # VSCode extension for original _hyperscript
│
└── [other packages: smart-bundling, developer-tools, testing-framework, ast-toolkit, etc.]

examples/
├── multilingual/   # Live grammar transformation demo
└── gallery/        # Feature showcase
```

## Essential Commands

### Cold start (fresh checkout / web session)

A freshly-cloned container has no workspace symlinks or local bins yet, and the
package `dist/` trees are unbuilt. Before anything else:

```bash
npm install          # alias: npm run bootstrap — links workspaces + installs bins (tsx, vitest…)
```

> **`npm run build` is NOT dependency-ordered.** It maps to
> `build --workspaces --if-present`, which builds in `package.json` declaration
> order, not topological order. So building a single deep package on a cold tree
> (e.g. `npm run build --prefix packages/core`) fails with
> `Cannot find module .../framework/dist/index.js` until its upstream deps are
> built first. (`npm run rebuild:full` uses the same unordered command and only
> _looks_ like it succeeds — it pipes through `grep … || true` and swallows the
> errors.)
>
> The authoritative topological build order lives in the **`build` job of
> `.github/workflows/ci.yml`** (guarded against drift by
> `npm run check:ci-order` → `scripts/check-ci-build-order.cjs`). For the
> multilingual stack specifically, the ready-made ordered chain is
> `npm run test:multilingual:build-deps` (intent → framework → semantic → i18n →
> patterns-reference → core's `build:multilingual-dist`).
>
> Some package builds print `DTS Build error` / `tsc --emitDeclarationOnly`
> failures but **still emit usable JS** — the `.js` bundle is produced before the
> declaration step. A DTS error alone does not mean the build you need failed;
> check whether the `dist/` artifact you actually consume exists.

### Core Package (Primary Development)

```bash
# Quick validation (recommended after changes)
npm run test:quick --prefix packages/core           # Build + test (<10 sec)
npm run test:comprehensive --prefix packages/core   # Full browser suite

# Unit tests
npm test --prefix packages/core                     # Run vitest (7000+ tests)
npm test --prefix packages/core -- --run src/expressions/  # Test specific module

# Build
npm run build:browser --prefix packages/core        # Build browser bundle
npm run typecheck --prefix packages/core            # TypeScript validation

# Browser testing (Playwright) - MUST run from packages/core directory
cd packages/core && npx playwright test src/compatibility/
```

> **Known issue: esbuild daemon hang.** Core vitest tests complete successfully but the
> Node process hangs indefinitely because esbuild's daemon keeps the event loop alive.
> The `test` and `test:quick` scripts wrap vitest with `timeout` and treat exit code 124
> (killed by timeout) as success. CI uses the same pattern. If running vitest directly,
> use: `timeout 120 vitest run || [ $? -eq 124 ]`

### i18n Package

```bash
# Tests
npm test --prefix packages/i18n                     # Run vitest (900+ tests)
npx vitest run src/grammar/grammar.test.ts          # Grammar transformation tests

# Build
npm run build:browser --prefix packages/i18n        # Build browser bundle

# TypeScript
npm run typecheck --prefix packages/i18n
```

### Semantic Package

```bash
# Tests
npm test --prefix packages/semantic                     # Run vitest (6400+ tests)
npm test --prefix packages/semantic -- --run            # Single run

# Build
npm run build --prefix packages/semantic                # Build all bundles
npm run build:browser --prefix packages/semantic        # Browser bundle

# TypeScript
npm run typecheck --prefix packages/semantic
```

### Test Output Management

```bash
# Clean all test outputs (coverage, HTML reports, playwright reports)
npm run clean:test

# Generate HTML test reports (optional, disabled by default to reduce disk usage)
VITEST_HTML=1 npm test --prefix packages/core
```

### Quick Test Validation (Compact Output)

For agent/CI contexts where verbose output is too large, use `test:check` for summary-only output (~5 lines per package):

```bash
# All packages — summary only
npm run test:check

# Per-package compact output
npm run test:check --prefix packages/core
npm run test:check --prefix packages/semantic
npm run test:check --prefix packages/i18n
```

> **Agent/CI tip:** Use `npm run test:check` for compact pass/fail output.
> Use `npm test` for full verbose output during debugging.

#### Three gates `test:check` does NOT cover

These are required CI checks that no `test:check` invocation reaches, so a green
local run can still fail CI. Each cost a full CI round-trip during Arc F
follow-ups round 2. Run all three whenever a change touches
`packages/semantic/src/generators/command-schemas.ts`, a language profile, or
R2's curated execution subset:

```bash
# 1. Vocab consistency (V1–V4 cross-surface check)
cd packages/testing-framework && npx tsx src/vocab/cli.ts validate

# 2. Generated syntax-table drift (derives from the command schemas)
npm run test:check --prefix packages/hyperscript-adapter

# 3. The R2 curated-subset lock (part of the testing-framework suite)
npm run test:check --prefix packages/testing-framework
```

1. **Vocab consistency** fires when a schema gains a `markerOverride` whose word
   tokenizes as `identifier` rather than keyword/particle. Waive in
   `packages/testing-framework/vocab-waivers.json`, keyed `V4|<lang>|<marker>`,
   with a reason. The error aggregates its SITES, so a marker that has shipped
   for years can become newly reportable the moment a second schema uses it.
2. **`syntax-table.ts`** is generated from the schemas and gated by
   `derive-syntax.test.ts`. Any change to a role's `svoPosition` or marker
   restages it: `npm run generate:syntax --prefix packages/hyperscript-adapter`.
   Two traps — the file is **tracked but also matches `.gitignore`**, so it needs
   `git add -f`, and lint-staged cannot re-add it after prettier, so that commit
   needs `--no-verify`.
3. **The R2 subset lock** (`validators/execution-validator.test.ts`) asserts the
   exact curated pattern list. Expanding `EXECUTION_SUBSET` means updating the
   count in the test title, the sorted expectation array, AND regenerating the
   multilingual baseline in the same PR.

#### Stale-dist auto-rebuild

Both `npm test --prefix packages/<X>` and `npm run test:check` auto-rebuild any workspace dependency whose `src/` is newer than its `dist/` (via [scripts/ensure-fresh.sh](scripts/ensure-fresh.sh)). Per-package `pretest` hooks cover the first path; [scripts/test-check-all.sh](scripts/test-check-all.sh) runs `ensure-fresh` upfront for the second (npm pre/post hooks don't fire for `:check` variants). Manual escape hatch: `npm run check:fresh`.

When you add a new internal-dep relationship between workspace packages, add the dep to the consumer's `pretest` in its `package.json` so its `dist/` stays fresh during tests.

##### Keeping the gate's package list honest

`npm run test:check` walks a hand-maintained list in [scripts/test-check-all.sh](scripts/test-check-all.sh), so **a new package with a `test:check` script is not in the gate until you add it there** (plus the `ensure-fresh` args, if its tests read a workspace dep's `dist/`). Both directions of drift used to go unnoticed: a package deleted from disk but left in the list made the gate exit 1 on a green tree, and nine packages with real suites were never added, so ~390 tests never ran in the gate that claims to run everything.

[`npm run check:test-list`](scripts/check-test-check-list.cjs) now fails on either. It's a zero-dep node script, run in CI's `lint-typecheck` job and from the pre-commit hook when a workspace `package.json` or the gate script is staged. Deliberate exclusions go in its `INTENTIONALLY_UNGATED` map, with a reason.

##### The six hand-maintained package lists, and what guards each

CI addresses packages by name in six places, all hand-written. **Every one is now guarded** — the last four by [`npm run check:ci-job-lists`](scripts/check-ci-job-lists.cjs), and all six by zero-dep node scripts wired into `lint-typecheck` and the pre-commit hook.

| List                                       | Guard                | Predicate ("must be listed iff…")                                             |
| ------------------------------------------ | -------------------- | ----------------------------------------------------------------------------- |
| `build` job step ORDER                     | `check:ci-order`     | a runtime dep is built before its consumer                                    |
| `unit-tests` / `unit-tests-packages` steps | `check:ci-test-list` | the package has a `test:check` script                                         |
| `scripts/test-check-all.sh`                | `check:test-list`    | same predicate, local gate                                                    |
| `export-validation` args                   | `check:ci-job-lists` | published **and** declares an entry point **and** is built by the `build` job |
| `lint-typecheck` typecheck lines           | `check:ci-job-lists` | the package has a `typecheck` script                                          |
| nightly `coverage` job                     | `check:ci-job-lists` | its flag is declared in `codecov.yml` (both directions)                       |
| root `lint:domains` loop                   | `check:ci-job-lists` | a `packages/domain-*` owning a `lint.test.ts`                                 |

When the last four were guarded (2026-08-01), three had drifted: export-validation checked **8** of the 30 packages that qualify (its 9th argument, `aot-compiler`, is private, which the validator skips outright — an argument that had never done anything); the "Typecheck all packages" step ran **11** of 44; and the coverage job uploaded a `language-server` flag `codecov.yml` never declared. `lint:domains` was already correct at 9/9. Deliberate omissions go in the script's per-list `INTENTIONAL_OMISSIONS` maps, with a reason; all three start empty.

**Adding a package to the typecheck list needs it to typecheck on a clean checkout**, not just in your tree. `packages/behaviors` was the trap: its `src/generated/` is gitignored, so `tsc` there fails on a fresh clone — it needs a `pretypecheck` hook, the same way it already had `prebuild`/`pretest`. This is the same "working tree ≠ clean checkout" class that cost #862/#863 two CI round-trips.

> **Neither hook fires for direct `npx vitest` / `npx tsx` invocations.** That's
> how the qu "unreproducible baseline" incident happened (roadmap §7g): a sweep
> executed a stale `dist/` and scored code that differed from the checkout. The
> multilingual CLI now guards this itself — `--regression` / `--save-baseline`
> runs REFUSE when any of intent/framework/semantic/i18n/patterns-reference/core
> has `src/` newer than `dist/index.js` (the dist sibling of the patterns.db
> provenance stamp). If you run vitest directly after editing an upstream
> package, rebuild it first (`npm run check:fresh` or `npm run build --prefix
packages/<dep>`); a green suite against a stale dist is vacuously green.

##### The three freshness guards

Same bug class — _executing code that differs from the checkout_ — asked at three
different moments. They are not redundant; each sees what the others cannot:

| Guard                                                                           | Question                                   | On stale                                |
| ------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------- |
| [`scripts/ensure-fresh.sh`](scripts/ensure-fresh.sh) (`pretest`, `check:fresh`) | is `dist/` behind `src/`?                  | **rebuilds**                            |
| `findStaleDists()` in the multilingual CLI                                      | same, for a gate about to run              | **refuses** (never mutates build state) |
| [`packages/mcp-server/src/freshness.ts`](packages/mcp-server/src/freshness.ts)  | has `dist/` changed **since I loaded it**? | **refuses** the tool call               |

The third exists because the MCP server is the only long-running process here.
`.mcp.json` launches `mcp-server/dist/index.js`; tsup marks every
`dependencies`/`peerDependencies` entry external, so `@lokascript/semantic` & co. are
bare specifiers Node resolves through the workspace symlink **at startup** — and Node's
ESM cache cannot be invalidated. So a rebuild leaves the server serving pre-change code
**silently**, which no `src`-vs-`dist` check can detect (a freshly-rebuilt dist looks
perfectly fresh while the process still holds the previous one).

It detects rather than self-heals, deliberately: re-importing is impossible, and bundling
the deps would be _worse_ — it would move the staleness from "the process is behind the
file" to "the file is behind the source too". (`@hyperfixi/developer-tools` is already
bundled and its dist carries four orphaned generations of the same chunk, because the
build has no `--clean`.) The MCP protocol has no "restart me" primitive, so the refusal
text is the only channel to a human. **An MCP tool refusing with "serving STALE code" is
the guard working — restart the server (`/mcp` → reconnect), don't debug the tool.**

The `patterns.db` half _does_ self-heal: `populate` replaces the file rather than mutating
it, so a long-lived handle keeps reading the old inode; `getDatabase()` now compares file
identity (dev+inode+size+mtime, behind a 1s TTL) and reopens.

### Live Testing

```bash
# Start HTTP server (from project root)
npx http-server . -p 3000 -c-1

# Test pages:
# http://127.0.0.1:3000/examples/multilingual/index.html        # Grammar demo (i18n)
# http://127.0.0.1:3000/examples/multilingual/semantic-demo.html # Semantic parser demo (24 languages)
# http://127.0.0.1:3000/packages/core/compatibility-test.html   # Side-by-side comparison
```

## CI/CD Workflows

### Consolidated CI Workflow

As of 2026-01-23, all CI testing has been consolidated into a single `.github/workflows/ci.yml` workflow for efficiency.

**Key features:**

- **Shared build artifacts**: Packages are built once and shared across all jobs (40% faster)
- **Parallel execution**: jobs run in parallel after build completes
- **Three-tier job set**: full matrix on `pull_request`; `build` only on `push` to main/develop (tree-skew detector); `coverage` + `benchmarks` on a nightly `schedule` (also `workflow_dispatch`)
- **Path-gated npm fan-out**: the `changes` job classifies the diff (`code` / `protocol` / `goclient`); `build` gates on `code` and every npm job inherits the gate through `needs: build`. Doc-only, `protocol/**`-only, and `clients/**`-only diffs skip the whole npm stack (~15–20 runner-min each — Dependabot gomod PRs were the motivating case). Skipped required checks report "skipped" and satisfy branch protection (the required `multilingual-validation` check has always relied on this for doc-only PRs). **As of 2026-07-29 `export-validation`, `lint-typecheck`, and `unit-tests` gate on `code` too** — they previously gated on `pull_request` alone, so a docs/examples-only PR ran the entire 27-package unit suite despite the claim above. `shipped-sources` stays ungated by design (it is the gate that walks `examples/` and `docs/`).
- **Node 24 LTS**: Active LTS release (EOL April 2028)
- **Smart failure handling**: the multilingual job is a real fidelity-ratchet gate (no `continue-on-error`); only the perf `benchmarks` job uses `continue-on-error` (trend tracking, never a gate)

**Jobs:**

| #    | Job                       | PR  | push main/develop | nightly | Notes                                                      |
| ---- | ------------------------- | --- | ----------------- | ------- | ---------------------------------------------------------- |
| 0    | `changes`                 | ✓   | ✓                 | —       | Path classifier (code / protocol / goclient)               |
| 1    | `build`                   | ✓   | ✓                 | ✓       | Build all packages once; gated on `code` paths             |
| 1.5  | `shipped-sources`         | ✓   | —                 | —       | Shipped-sources validity; ungated (walks examples/, docs/) |
| 2    | `export-validation`       | ✓   | —                 | —       | Verify package.json exports resolve to dist                |
| 3    | `lint-typecheck`          | ✓   | —                 | —       | oxlint + TypeScript checks                                 |
| 4    | `unit-tests`              | ✓   | —                 | —       | Vitest tests on Node 24 (27 packages)                      |
| 5    | `coverage`                | —   | —                 | ✓       | Codecov upload; nightly since 2026-07-29 (was push+main)   |
| 6    | `browser-tests`           | ✓   | —                 | —       | Playwright `--project=quick`; PR-only                      |
| 7    | `multilingual-validation` | ✓   | —                 | —       | 21-language full sweep + regression gate; PR-only          |
| 8    | `bundle-size`             | ✓   | —                 | —       | Size report; PR-only (slim post-merge)                     |
| 9    | `mcp-demos`               | ✓   | —                 | —       | Demo capture + drift check; PR-only                        |
| 10   | `protocol-conformance`    | ✓   | —                 | —       | 4 reference parsers; gated on `protocol/**` paths          |
| 10.5 | `go-client`               | ✓   | —                 | —       | `go build` + `go test`; gated on go-client paths           |
| 11   | `benchmarks`              | —   | —                 | ✓       | Perf trend tracking; nightly since 2026-07-29              |

The PR-only jobs already ran against the merged-as-PR code (`strict` branch protection means the PR validated the exact merged tree), so re-running them on the post-merge push would be redundant — the push run keeps only `build`. For the reasoning see the job comments in `.github/workflows/ci.yml`.

`coverage` and `benchmarks` moved off push-to-main on **2026-07-29**: under `strict` protection the post-merge tree is the tree the PR validated, so `coverage` was re-executing the full core + semantic + i18n + language-server suites (430 files) a second time per merge purely for a Codecov datapoint. Neither is a required check (required = Build All Packages, Lint & Typecheck, Unit Tests, Export Validation, Multilingual Validation, Browser Tests), so nightly costs no gate strength. Same change fixed `benchmarks`, which ran `bench:run` (writes no file) and uploaded from a nonexistent `./core/benchmark-results/` — its output had always been discarded; it now runs `bench:ci` and uploads `packages/core/benchmark-results/`.

**Triggers:**

- Push to `main` or `develop` (`build` only — tree-skew detector)
- Pull requests to `main` or `develop` (full job set)
- `schedule` nightly at 06:00 UTC, plus `workflow_dispatch` (`coverage` + `benchmarks`). `changes` is skipped on these events — paths-filter has no diff base — so `build` carries an explicit `!cancelled()` status function; without it the implicit `success()` on a skipped `needs` would skip the whole nightly chain.
- Concurrency: Cancels in-progress runs on new push (per `${{ github.workflow }}-${{ github.ref }}`; pre-merge and post-merge runs are on different refs so the post-merge run is NOT cancelled)

**Known Issues:**

- Experimental behaviors (Draggable, Sortable, Resizable) still run imperative JS installers; migration to the compiled hyperscript `source` path is in progress. Curated (5) + optional (3) behaviors already run the source-compiled path and are fully tested (behaviors suite green).
- **Role fidelity (R1) headroom is now thin and flat** — the SOV six (hi, qu, ko, tr, ja, bn) were burned down to ≥ 0.9907 by the R1 arcs (#637/#638) and no longer trail the SVO languages (lowest are now th 0.9845 / ms / de / fr; corpus mean ≈ 0.992). Every pattern parses faithfully at the command level in all 24 priority languages. Remaining R1 deferrals are named (pick range-role modeling, the reactive `on.event` rows, swap F6) — tracked by the multilingual fidelity ratchet (not `continue-on-error`); queue in `docs-internal/MULTILINGUAL_NEXT_STEPS.md`.

### Multilingual parse rate ≠ fidelity

The `multilingual-validation` parse rate counts a translation as passing when the
semantic parser returns a **non-null** node — **not** when that node is a faithful
translation. A complex pattern can parse non-null while dropping most of the
source's commands (e.g. an `if/focus/halt` body collapsing to a bare `if`). So a
"100% / 99%" parse rate means "parses", not "parses correctly".

The harness computes a structural **fidelity** signal (`packages/testing-framework/src/multilingual/fidelity.ts`):
the fraction of the English reference parse's command actions present in each
translation. By fidelity, passes fall into three bands, each tracked per-language in
the committed baseline:

- **degenerate** (fid < 0.5 — lost most of the structure): `degeneratePasses`. **0.**
- **lossy** (0.5 ≤ fid < 1.0 — parses, clears the floor, but silently drops ≥1
  command): `lossyPasses`. **0.** (Both bands were burned down across #492–#506;
  history in `docs-internal/MULTILINGUAL_ROADMAP.md`.)
- **faithful** (fid = 1.0). **3696 / 3696.** Cross-language `avgFidelity` = 1.000,
  `avgPrecision` ≈ 0.9997, `avgRoleFidelity` ≈ 0.992, `avgMultisetRecall` = 1.000,
  `avgValueRecall` ≈ 0.997 (the SOV six sit ≥ 0.991 on R1 after #637/#638; the
  lowest R1 languages are now th/ms/de/fr ≈ 0.985 — the remaining headroom is
  thin and flat).

> **Figures snapshot:** as of the **2026-07-27** baseline (`77f9c2bc`). They drift as work lands
> — the **authoritative** numbers always live in the committed baseline,
> `packages/testing-framework/baselines/multilingual-priority.json` (its `timestamp`
> and `commit` fields stamp each regeneration). Treat the prose here as orientation,
> not truth. Current plan + per-arc history:
> `docs-internal/MULTILINGUAL_NEXT_STEPS.md`.

The `--regression` gate ratchets on **eleven** signals (each fails CI; each guarded so
an un-regenerated baseline never retro-flags — a baseline lacking a signal's field
yields a 0 delta):

1. **parse-rate** drop > 2pts. Deliberately coarse — signal 10 is what catches a
   small number of patterns breaking.
2. **degenerate ratchet** — a faithful baseline pass that became _degenerate_
   (tolerance 3).
3. **correctness ratchet (R0-recall)** — a faithful baseline pass that became _lossy_
   (**tolerance 0** since 2026-07-25), **plus** a per-language **avgFidelity** drop
   > 0.02. Catches the silent command-drops the degenerate ratchet misses (a
   > 1.0 → 0.8 pass). The tolerance was 3, and that cushion was **measured to be the
   > gate's real blind spot**: reverting #763's `markerLegacy.he` fix — the exact
   > regression two vitest cases caught and the gate did not — produces exactly ONE
   > faithful→lossy flip and moves nothing else (even a nonsense he marker override
   > produced only two). The parser degrades rather than returning null, so signals
   > 1 and 10 never fire for this class. A faithful→lossy flip is binary and
   > structural, like R2/R4, so it has no float/collation noise to absorb.
4. **precision ratchet (R0-precision, the "trust floor")** — a per-language
   **avgPrecision** drop > 0.02. The mirror of recall: catches a parse/render that
   _adds_ phantom/spurious commands the source never had (a phantom `toggle` ahead of
   a real one) — invisible to every recall-based signal above. Multiset-aware, so a
   _duplicated_ phantom (`[toggle, toggle]`) is seen too.
5. **multiset-recall ratchet (R0-recall-multiset)** — a per-language
   **avgMultisetRecall** drop > 0.02. Signals 2–4 all score the **deduped** action
   Set, so a parse that drops a _repeated_ command scores a perfect 1.0: reference
   `[bind, bind]` collapses to `{bind}`, which `[bind]` satisfies in full. That is how
   `bind-two-way` recorded fidelity 1.0 in all 24 languages while every one of them
   parsed only the first of its two `bind`s (the top-level command-sequence fix that
   added this signal). Counting duplicates makes the drop visible. All 24 languages
   sit at 1.0 today — the last sub-1.0 row (qu `behavior-resizable`, whose reorder
   rendered the inline-if's verb-final `man churanay` after `tukuy`/end and stranded
   it at the conditional fold) was cleared by the SOV if-seam work in the R1
   deferred-tail arc (#638).
   The nine other rows this signal originally flagged (colon-qualified event names
   `draggable:start` split at the local-variable sigil by every non-en tokenizer, plus
   two masked co-causes) were fixed in the colon-event-names arc — history in
   `docs-internal/HANDOFF_colon-event-names.md`.
6. **role-fidelity ratchet (R1)** — a per-language **avgRoleFidelity** drop > 0.02
   (`action.role:valueType` recall vs the en reference; catches a parse that keeps the
   verb but drops/mistypes a role). Note this is a Set too, so it shares signal 5's
   blind spot for repeated roles.
   **Plus the role-set flip ratchet (tolerance 0, added 2026-07-31):** a pattern
   that was role-FAITHFUL in the baseline (absent from its `roleLossyPatterns`)
   and now has an incomplete role set fails outright. The average above cannot
   see a single pattern losing one role — ~0.0013 in a ~154-pattern language,
   15× under its tolerance — and that blind spot was **measured**, not
   hypothesized: a `required: false` duration role on toggleSchema cost es/pl/vi
   the second toggle's positional destination on `toggle-aria-expanded`
   (`next .panel` silently became `me`) and the gate stayed green;
   `tools/triage-r1.ts` found it by hand. Same binary-flip argument as the
   lossy/R5 zeros. Guarded by the baseline carrying `roleLossyPatterns`, so an
   un-regenerated baseline never retro-flags; pre-existing role-lossy patterns
   are the R1 burn-down list, not regressions.
7. **execution ratchet (R2)** — a curated-subset pattern whose jsdom DOM effect
   matched the en reference and now diverges (pass→fail; tolerance 0).
8. **value-recall ratchet (R3)** — a per-language **avgValueRecall** drop > 0.02.
   Signals 1–7 compare actions and role _types_; values are never compared (they are
   legitimately translated), so a parse with the right action counts and right role
   types but a silently WRONG role value — ms capturing `trigger` events named
   `draggable` instead of `draggable:start`, the colon-event-names class — scores
   perfect on all of them. R3 compares the subset of values that is
   **language-invariant by construction** (selectors, `:`/`$`/`^` sigil refs,
   numbers/time literals, colon-qualified event names, URLs — whole-surface
   code-shaped, no whitespace/interpolation) **verbatim** against the en reference,
   as an `action.role=value` multiset (a dropped duplicate value is visible).
   Blind-spot inversion: if the **en reference itself** corrupts a value, every
   language flags at once — a 24-language R3 firestorm on one pattern means
   "suspect the en parse first" (useful signal, unlike R0 where en corruption moves
   nothing). Known sub-1.0 rows (all triaged, tracked in
   `docs-internal/MULTILINGUAL_NEXT_STEPS.md` § "R3-discovered value-bug families"):
   symmetric `swap` role-binding flips, connective-swallowed `increment.quantity`,
   bn duration-glue, SOV `in me` qualifier glue, pl/ru/uk `fetch` URL mis-role,
   hi `transition` duration drop, bn/qu/tr behavior trigger events.

9. **canonical-validity ratchet (R4)** — every authored foreign translation is rendered
   to English and parsed on the real `hyperscript.org` engine; the invalid
   (pattern, language) pairs are diffed against the committed allowlist
   (`packages/testing-framework/baselines/foreign-canonical-validity.json`). Both
   directions fail at tolerance 0: a NEW invalid pair is a validity regression, and a
   stale entry (an allowlisted pair that now renders valid) must be pruned via
   `tools/regen-foreign-baseline.ts` in the same change that cleared it. Catches the
   class R0–R3 cannot: a parse that is role-faithful yet renders English the canonical
   parser rejects (signals 1–8 never parse the rendered surface). Full mode only;
   triage failures with `tools/triage-foreign-residual.ts`. The same allowlist backs the
   standalone vitest gate (`foreign-canonical-validity.test.ts`), so the two cannot
   disagree; the en-side twin (`canonical-validity.test.ts`) remains vitest-only, and
   its allowlist is now **empty** — 134/134 corpus references render canonically
   valid. (It formerly held one entry, `pick-text-range`.)

10. **per-pattern parse ratchet (R5)** — a pattern that parsed in the baseline no
    longer parses at all, at **tolerance 0**. Not redundant with signal 1: every
    other signal is structurally incapable of seeing a handful of patterns break.
    Parse rate is per-language, so at ~154 patterns one flip is a **0.65pt** drop
    against a 2pt tolerance — it takes ≥4 in ONE language. The five `avg*` signals
    see **exactly 0.0000**, not merely a small delta, because the orchestrator
    skips a failed parse _before_ scoring, removing it from numerator and
    denominator alike (perversely, a _lossy_ pattern degrading to not-parsing
    **raises** avgFidelity). The degenerate/lossy ratchets only iterate patterns
    that did parse. R2 covers 47 curated ids; R4's denominator excludes ~14% of
    the corpus and is full-mode only. This is not hypothetical — #763's
    `markerOverride.he` change stopped `לך את back` parsing and the gate would
    have gone green; two vitest cases caught it instead. The other tolerances are
    cross-machine headroom for **averages**; a binary pass→fail flip has no such
    noise to absorb. Reads the per-pattern `patterns` map the baseline already
    records, so no format change and no retro-flagging.

None of the recall-based signals can see a regression in the **English reference
itself** — en defines the reference, so a parser change that truncates every language
identically (as the top-level-sequence bug did) moves nothing. Only tests catch that.
(Exception: R3, whose en-corruption failure mode is the all-languages firestorm above.
R4 has a related inversion for the RENDERER: a renderer change that corrupts the emitted
English across languages floods R4 with new invalid pairs at once. A corrupted en
_reference_ is different — R4's fair denominator silently EXCLUDES pairs whose en raw
code the canonical parser rejects, so that class still needs the en-side vitest gate.)

After an _intentional_ fidelity change, regenerate the baseline (`--save-baseline`).
**The baseline must be regenerated against a freshly `populate`d patterns.db** — a
baseline generated against a stale/transitional DB will read as drifted.
`populate` is **deterministic run-to-run**, so the remaining ratchet tolerances (3
degenerate flips, avgFidelity 0.02) are **conservative cross-machine headroom**
(Mac-generated baseline vs CI Linux float/collation drift), not absorbers of local
run-to-run jitter — don't read a green gate as "within noise." The per-pattern
signals (lossy, R2, R4, R5) are all at 0: a binary flip has no such noise to
absorb, and the lossy cushion was measured swallowing a real regression. The remaining
fidelity headroom is the thin R1 tail (named deferrals: pick range-roles, reactive
`on.event` rows, swap F6) and the R3 residual rows — current queue in
`docs-internal/MULTILINGUAL_NEXT_STEPS.md`.

#### Running the multilingual `--regression` gate locally

The CI `multilingual-validation` job is reproducible locally, but it needs the
ordered build + a freshly synced patterns DB (the gate **refuses to run** against
a stale/unstamped `patterns.db` — see the provenance-stamp note in
`packages/patterns-reference/CLAUDE.md`). From a cold tree:

```bash
npm install                                              # if not already done
npm run test:multilingual:build-deps                     # ordered build of the multilingual stack
npm run populate --prefix packages/patterns-reference    # rebuild patterns.db + write its provenance stamp
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
```

The gate exits non-zero on a parse-rate drop >2pts or >3 faithful→degenerate
flips vs the committed baseline. After an _intentional_ fidelity change, re-run
with `--save-baseline` (instead of `--regression`) to regenerate
`packages/testing-framework/baselines/multilingual-priority.json`, and commit the
new baseline. **Do not commit your locally-regenerated `patterns.db`** — commit
only the dicts/profiles + baseline. (Note: a frozen copy of `patterns.db` _is_
tracked — `.gitignore` has an explicit `!packages/patterns-reference/data/patterns.db`
un-ignore, and CI is built around it via `db:init:force`/`populate`. But contributors
don't commit regenerations, to avoid binary churn, so the tracked copy can lag the
current dicts/profiles; CI always re-populates a fresh DB for the gate. If you `git
checkout -- packages/patterns-reference/data/patterns.db` you revert to that possibly-stale
committed copy — re-run `npm run populate` before any local gate/probe work.)

**Other Workflows:**

- `.github/workflows/publish.yml` - Manual npm publishing (workflow_dispatch)
- `.github/workflows/pre-publish-check.yml` - Pre-publish validation (workflow_dispatch)

> **Release prerequisite.** The version bump has to land on `main` after publishing, and
> `main` is push-protected. The workflow tries `RELEASE_BUMP_TOKEN` (admin PAT, direct push),
> then a plain push, then a `release-bump/vX.Y.Z` branch + PR. On v2.6.0 and again on v2.9.1
> **all** paths failed and the bump was landed by hand (#603, #772). The workflow now fails
> loudly instead of going green.
>
> **If a release fails to land the bump, suspect `RELEASE_BUMP_TOKEN` first — it may just need
> a refresh.** PATs expire, and an expired one is the cheapest explanation for a release that
> published to npm but left `main` on the old version. Refreshing the secret is the first thing
> to try before digging into the workflow. (Last refreshed **2026-07-28**.) Distinguish the two
> failure shapes, because they need different fixes:
>
> - **Auth failed / token invalid or expired** → refresh the secret with a new PAT.
> - **`Permission to … denied to <user>`** → the token authenticated fine and is **not**
>   expired; this is a _scope_ problem. For a fine-grained PAT check that _Repository access_
>   includes this repo and _Permissions → Repository → Contents_ is **Read and write**; for a
>   classic PAT, the `repo` scope. Editing a fine-grained PAT's permissions in place keeps the
>   same token string, so the stored secret stays valid and its `updatedAt` will not change —
>   meaning a working-looking secret can still be under-scoped.
>
> **`RELEASE_BUMP_TOKEN` is required, not just preferred.** The PR fallback does not finish on
> its own: PRs opened with `GITHUB_TOKEN` do not trigger CI, so `main`'s six required checks
> never start, `gh pr merge --auto` never fires, and the PR sits pending until a human pushes
> an empty commit or closes/reopens it. Enabling _Settings → Actions → General → Workflow
> permissions → "Allow GitHub Actions to create and approve pull requests"_ lets the PR be
> **created**; only the token makes a release hands-off.
>
> Run the workflow with `dry-run=true` to verify the token can push before committing to a
> release — that step is a no-op push of `main` onto itself, so it exercises the exact path
> that has broken twice. After any real release, confirm `main`'s version matches npm.

**Archived Workflows:**

- See `.github/workflows/archive/README.md` for previously consolidated workflows

## Architecture

> **Known core-parser defects and their queue live in
> `docs-internal/PARSER_NEXT_STEPS.md`** — the counterpart to
> `MULTILINGUAL_NEXT_STEPS.md`, for the `packages/core/src/parser/` track. Check it
> before triaging a parse bug; several are already diagnosed with a written brief.
> Two entries there are held by a gate that fails on its own (the `and` KNOWN GAP
> tests, the shipped-sources allowlist ratchet) — the rest have no gate and are why
> the doc exists. `docs-internal/PARSER_FIX_STATUS.md` is an **archived**
> single-defect report, not an index, despite its name.
>
> **Structural work on the command layer** — registration, metadata, output
> contracts, bundle executors — has its own queue in
> `docs-internal/COMMAND_ARCHITECTURE_NEXT_STEPS.md`. Read it before adding,
> removing, or restructuring a command surface: the command set is currently
> described in ~20 hand-maintained places and executed in 4 implementations, and
> that doc holds the staged plan for collapsing both.

### Command Pattern

All 59 commands use `CommandImplementation<TInput, TOutput, TypedExecutionContext>`:

```typescript
// packages/core/src/commands/data/increment.ts
export class IncrementCommand implements CommandImplementation<IncrementInput, void, TypedExecutionContext> {
  parseInput(node: CommandNode, ctx: TypedExecutionContext): IncrementInput { ... }
  async execute(input: IncrementInput, ctx: TypedExecutionContext): Promise<void> { ... }
}
```

### Grammar Transformation (i18n)

The i18n package transforms hyperscript to native word order:

- **SVO** (English, Chinese, Spanish): `on click increment #count`
- **SOV** (Japanese, Korean, Turkish): `#count を クリック で 増加`
- **VSO** (Arabic): `زِد #count عند النقر`

Key files:

- `packages/i18n/src/grammar/transformer.ts` - GrammarTransformer class
- `packages/i18n/src/grammar/profiles/` - Language profiles with word order rules
- `packages/i18n/src/grammar/types.ts` - Semantic roles, joinTokens for agglutinative suffixes

### Unified Multilingual API

The `MultilingualHyperscript` class provides a unified API that integrates semantic parsing with grammar transformation:

```typescript
import { MultilingualHyperscript } from '@hyperfixi/core';

const ml = new MultilingualHyperscript();
await ml.initialize();

// Parse from any of 24 languages
const node = await ml.parse('#button の .active を 切り替え', 'ja');

// Translate between any languages
const arabic = await ml.translate('toggle .active', 'en', 'ar');
```

Key files:

- `packages/core/src/multilingual/index.ts` - `MultilingualHyperscript` unified API
- `packages/core/src/multilingual/bridge.ts` - `SemanticGrammarBridge` integration layer
- `packages/semantic/src/tokenizers/` - 24 language tokenizers
- `packages/semantic/src/parser/semantic-parser.ts` - Main semantic parser
- `packages/semantic/CLAUDE.md` - Package-specific documentation

### Expression System

Six categories in `packages/core/src/expressions/`:

- **references/** - `me`, `you`, `it`, CSS selectors
- **logical/** - Comparisons, boolean logic
- **conversion/** - `as` keyword, type conversion
- **positional/** - `first`, `last`, array navigation
- **properties/** - Possessive syntax (`element's property`)
- **special/** - Literals, mathematical operations

### Parser Context

The parser uses dependency injection via `ParserContext` interface:

- 48 methods exposed through `.bind(this)` delegation
- Command parsers in `packages/core/src/parser/commands/` are pure functions
- AST helpers in `packages/core/src/parser/ast-helpers.ts`

## Key Patterns

### Testing

```bash
# Fast iteration cycle
npm run test:quick --prefix packages/core  # Exit 0 = pass, 1 = fail

# Run single test file
npm test --prefix packages/core -- --run src/expressions/logical.test.ts

# Playwright for browser tests - MUST run from packages/core directory
cd packages/core && npx playwright test --grep "Grammar Transformation"

# Bundle compatibility matrix - tests all bundles against gallery examples
cd packages/core && npx playwright test src/compatibility/browser-tests/bundle-compatibility.spec.ts
```

**Bundle Test Matrix:**

The bundle compatibility test suite automatically tests all 7 bundles against gallery examples to verify which features work with each bundle size. Tests run in "discovery mode" - bundles are tested against examples they're not expected to support, logging any unexpected successes.

- Location: `packages/core/src/compatibility/browser-tests/bundle-compatibility.spec.ts`
- Tests: Toggle, show/hide, input mirroring, counter, modals, fetch, tabs, blocks, event modifiers
- Bundles: lite (1.9 KB), lite-plus (2.6 KB), hybrid-complete (11.1 KB), hybrid-hx (21.5 KB), hybrid-hx-v4 (~321 KB), minimal (71.5 KB), standard (78 KB), browser (~309 KB)
- Prints ASCII compatibility matrix showing feature support across all bundles

### Using Behaviors (Browser)

Include the resolver bundle after core — all standard behaviors resolve on demand:

```html
<script src="hyperfixi.js"></script>
<script src="resolver.browser.global.js"></script>
<!-- install Toggleable, Draggable, etc. just work -->
<button _="install Toggleable(cls: 'highlighted')">Toggle</button>
```

Behaviors are hyperscript source strings compiled on first use. The resolver bundle is 5.7 KB gzipped.

### Dynamic Class Selectors

`.{varName}` resolves a variable as a CSS class name in `toggle`, `add`, and `remove`:

```hyperscript
behavior MyBehavior(cls)
  on click toggle .{cls} on me
end
```

### Behavior Resolver Hook

External code can register a resolver for custom behaviors:

```javascript
window._hyperscript.behaviors.resolve = name => {
  /* compile & register, return true */
};
window._hyperscript.behaviors.set(name, { name, parameters, eventHandlers, initBlock });
```

### Adding a New Command

1. Create implementation in `packages/core/src/commands/{category}/{name}.ts`
2. Register a factory export in `packages/core/src/commands/index.ts` and add the command name to the `COMMANDS` set in `packages/core/src/parser/parser-constants.ts`
3. Register the factory in the runtime entry points that should include it (`packages/core/src/runtime/runtime.ts` and any relevant `packages/core/src/compatibility/browser-bundle-*.ts`)
4. Add parser support in `packages/core/src/parser/command-parsers/` (only if the command needs a non-generic parser — simple commands use the default identifier-plus-args parser)
5. For lite/hybrid bundle coverage, add cases to `packages/core/src/bundle-generator/templates.ts` and `template-capabilities.ts`, then run `npm run generate:bundles` — the hybrid parser template and hybrid-complete's executor switches are generated (parser rules go in `packages/core/src/parser/hybrid/parser-core.ts`)
6. Add reference/LSP entries in `packages/core/src/reference/index.ts` and `packages/core/src/lsp-metadata.ts`
7. Write tests in `packages/core/src/commands/{category}/__tests__/{name}.test.ts`

### Adding i18n Language Support

1. Create dictionary in `packages/i18n/src/dictionaries/`
2. Add language profile in `packages/i18n/src/grammar/profiles/`
3. Create keyword provider in `packages/i18n/src/parser/`
4. Export from `packages/i18n/src/browser.ts`
5. Add tests in `packages/i18n/src/grammar/grammar.test.ts`

### Adding Semantic Language Support

Use the CLI tool to scaffold a new language. It automatically generates all files and updates:

- `src/languages/_all.ts` - language registration
- `src/tokenizers/index.ts` - tokenizer export
- `src/generators/profiles/index.ts` - profile export
- `src/generators/language-profiles.ts` - profile mapping
- `src/patterns/*/index.ts` - pattern indexes
- `src/patterns/builders.ts` - handcraftedLanguages array
- `src/language-building-schema.ts` - SUPPORTED_LANGUAGES array
- `packages/vite-plugin/src/language-keywords.ts` - keyword detection

```bash
cd packages/semantic
npm run add-language -- --code=xx --name=LanguageName --native=NativeName \
  --wordOrder=SVO --direction=ltr --marking=preposition --usesSpaces=true
```

Then follow the post-scaffold steps:

1. **Fill in keyword translations** in `src/generators/profiles/{code}.ts`
2. **Add character classification** in `src/tokenizers/{code}.ts` (for non-Latin scripts)
3. **Sync keywords to vite-plugin** (after filling in profile):

   ```bash
   npm run sync-keywords --prefix packages/vite-plugin
   # Options: --dry-run (preview), --language=xx (single language)
   ```

4. **Run TypeScript checks**:

   ```bash
   npm run typecheck --prefix packages/semantic
   npm run typecheck --prefix packages/vite-plugin
   ```

5. **Run tests**: `npm test --prefix packages/semantic`

### Custom Language Keywords (Vite Plugin)

The vite-plugin exports utilities for customizing language detection:

```javascript
import {
  registerCustomKeywords, // Add custom keywords for a language
  getKeywordsForLanguage, // Get keyword set for a language
  isNonLatinLanguage, // Check if language uses non-Latin script
  getAllLanguageCodes, // Get all supported language codes
  clearCustomKeywords, // Clear custom keywords
} from '@hyperfixi/vite-plugin';

// Register custom keywords for detection
registerCustomKeywords('my-lang', {
  keywords: ['myToggle', 'myAdd', 'myRemove'],
  isNonLatin: false,
});
```

## Debugging Tools

Quick reference — full detail in [packages/core/docs/API.md](packages/core/docs/API.md).

```javascript
// Which parser handled a compile, and with what confidence:
hyperfixi.compile('toggle .active').metadata;
// { parserUsed: 'semantic', semanticConfidence: 0.98, semanticLanguage: 'en', warnings: [] }

// Debug logging (persists via localStorage, works in production builds):
hyperfixi.debugControl.enable(); // or: localStorage.setItem('hyperfixi:debug', '*') + reload
// Log prefixes: ATTR:/SCRIPT:/SCAN: (attribute-processor) · PARSE: · CMD: · EXPR:

// Per-parse decisions and running stats:
window.addEventListener('hyperfixi:semantic-parse', e => console.log(e.detail));
hyperfixi.semanticDebug.getStats(); // { totalParses, semanticSuccesses, semanticFallbacks, averageConfidence }
```

### API v2 (Recommended)

```javascript
import { hyperscript } from 'hyperfixi';

const result = hyperscript.compileSync('toggle .active'); // CompileResult { ok, errors, meta }
await hyperscript.eval('add .clicked to me', element); // compile + execute
await hyperscript.compileAsync(code, { language: 'ja' }); // async (language loading)
await hyperscript.validate('toggle .active'); // { valid, errors }
```

Options: `language?`, `confidenceThreshold?` (0–1), `traditional?` (force traditional parser).
Legacy methods (`compile()`, `run()`, `evaluate()`) still work but log deprecation warnings.

## Type Safety: Environment-Specific Conditional Types

Zero-cost conditional types keep browser and server code honest: browser code uses
`BrowserEventPayload` (`@hyperfixi/core/registry/browser` — target must be Element,
nativeEvent must be Event); server code uses `ServerEventPayload`
(`@lokascript/server-integration` — no `nativeEvent`, using it is a type error);
code for both uses `UniversalEventPayload` (`@hyperfixi/core/registry/universal`)
and narrows with `instanceof`. See
[TYPE_SAFETY_DESIGN.md](docs-internal/analysis/TYPE_SAFETY_DESIGN.md).

## Important Files

| File                                                     | Purpose                                      |
| -------------------------------------------------------- | -------------------------------------------- |
| `packages/core/src/runtime/runtime.ts`                   | Main runtime (extends RuntimeBase)           |
| `packages/core/src/parser/parser.ts`                     | Hyperscript parser (~3000 lines)             |
| `packages/core/src/commands/`                            | All command implementations (by category)    |
| `packages/core/src/registry/`                            | Registry system (commands, events, context)  |
| `packages/core/src/registry/browser-types.ts`            | Browser-specific types                       |
| `packages/core/src/api/hyperscript-api.ts`               | Main API implementation (v2)                 |
| `packages/core/docs/API.md`                              | API documentation                            |
| `packages/server-integration/src/types/`                 | Server-specific types                        |
| `packages/i18n/src/grammar/transformer.ts`               | GrammarTransformer class                     |
| `packages/i18n/src/browser.ts`                           | Browser bundle exports                       |
| `packages/semantic/src/parser/semantic-parser.ts`        | Semantic parser                              |
| `packages/semantic/src/tokenizers/`                      | 24 language tokenizers                       |
| `packages/framework/src/api/create-dsl.ts`               | `createMultilingualDSL()` factory            |
| `packages/framework/src/api/domain-registry.ts`          | Domain registry + MCP tool generation        |
| `packages/framework/src/api/dispatcher.ts`               | `CrossDomainDispatcher` (auto-detect domain) |
| `packages/mcp-server/src/tools/domain-registry-setup.ts` | Domain registrations for MCP server          |
| `packages/domain-flow/src/index.ts`                      | FlowScript DSL entry point                   |
| `packages/compilation-service/src/`                      | Component renderers (React, Vue, Svelte)     |

## Vite Plugin (Recommended)

For Vite projects, use `@hyperfixi/vite-plugin` for automatic minimal bundles:

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [hyperfixi()],
};
```

```javascript
// app.js - just import, plugin handles the rest
import 'hyperfixi';
```

The plugin automatically scans your files for `_="..."` attributes and generates a bundle with only the commands you use. Options:

```javascript
hyperfixi({
  extraCommands: ['fetch'], // Always include these commands
  extraBlocks: ['if'], // Always include these blocks
  positional: true, // Include positional expressions
  htmx: true, // Enable htmx integration
  debug: true, // Verbose logging
});
```

## Browser Bundles

Full reference — decision tree, htmx-compat layer (`hx-live`, `sse-connect`/`sse-swap`,
`ws-connect`/`ws-send`, localized attribute names), lifecycle events, custom bundle
generator, and semantic regional bundles — lives in
[docs/BROWSER_BUNDLES.md](docs/BROWSER_BUNDLES.md).

Quick selection (sizes gzipped):

| Bundle                         | Size      | Use case                                                                                   |
| ------------------------------ | --------- | ------------------------------------------------------------------------------------------ |
| via `@hyperfixi/vite-plugin`   | minimal   | **Default for Vite projects** — scans usage, emits the right bundle                        |
| `hyperfixi-lite.js`            | 1.9 KB    | Tiny static page (8 commands, regex parser)                                                |
| `hyperfixi-hybrid-complete.js` | 11.1 KB   | Pure hyperscript, ~85% coverage (AST parser, blocks, modifiers)                            |
| `hyperfixi-hx.js`              | 21.5 KB   | + htmx v1/v2 attributes (`hx-get` etc.); no reactivity/streaming                           |
| `hyperfixi-hx-v4.js`           | ~321 KB   | `hx-live`, `bind`, `when`, SSE, WebSocket — full runtime + reactivity                      |
| `hyperfixi.js`                 | ~309 KB   | Full bundle with parser (`window.hyperfixi`); reactivity + realtime plugins pre-installed  |
| `hyperfixi-multilingual.js`    | 93 KB     | Multilingual, parser-free (pair with a semantic bundle)                                    |
| semantic bundles               | 62–203 KB | `LokaScriptSemantic*` globals; regional subsets (en/es/western/east-asian/priority/all-24) |

Rule of thumb: start as small as you can; upgrade when you hit a missing feature.
The vite plugin removes this decision entirely.

Multilingual usage (execute/translate in any of 24 languages):

```html
<script src="lokascript-semantic.browser.global.js"></script>
<script src="hyperfixi-multilingual.js"></script>
<script>
  await hyperfixi.execute('토글 .active', 'ko');
  const korean = await hyperfixi.translate('toggle .active', 'en', 'ko');
</script>
```
