# CLAUDE.md

Guidance for coding agents working in this repository. It holds what an agent would get wrong
without it. Package-specific detail lives in `packages/<name>/CLAUDE.md` (core, htmx-adapter,
hyperscript-adapter, i18n, patterns-reference, semantic, testing-framework, vite-plugin), in
`packages/engine/README.md` and in `docs-internal/CLAUDE.md`: read the one for the place you are
changing.

## Project Overview

**HyperFixi** is a \_hyperscript ecosystem: an engine that follows upstream `_hyperscript`,
multilingual parsing and rendering in 24 languages (SVO, SOV and VSO word order), and developer
tooling. Engine packages are published under `@hyperfixi/*`, multilingual packages under
`@lokascript/*`.

- The engine's acceptance oracle is upstream `_hyperscript`'s own test suite, vendored in
  `packages/engine/upstream-suite/`.
- The browser bundle is the engine's `hyperfixi-hs.js` (about 34 KB gzipped), which
  `@hyperfixi/core` also ships under the name `hyperfixi.js`.

## Monorepo Structure

`git ls-files packages | cut -d/ -f2 | sort -u` is the package list. A worktree can hold
untracked leftover directories from removed packages, so do not trust `ls packages`.

| Package                                          | What it is                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `engine`                                         | THE engine (`@hyperfixi/engine`): typed, modular, upstream-faithful. Hyperscript behavior lives here         |
| `core`                                           | `@hyperfixi/core`: the engine re-exported, plus `/multilingual`, `/ast-utils`, `/reference`, `/lsp-metadata` |
| `semantic`                                       | Multilingual parser and renderer (24 tokenizers, command schemas, language profiles)                         |
| `framework`                                      | Shared DSL framework; `src/languages/<code>.ts` is each language's grammar, as data                          |
| `intent`                                         | LSE: the bracket syntax and protocol JSON (`protocol/README.md`)                                             |
| `i18n`                                           | Per-language vocabulary and word-order profiles. It does not translate                                       |
| `hyperscript-adapter`                            | Runs non-English hyperscript on the engine or on upstream (a source transform)                               |
| `htmx-adapter`                                   | Localized attribute names for upstream htmx v4                                                               |
| `vite-plugin`                                    | Scans a project and emits an engine bundle with only the modules it uses                                     |
| `patterns-reference`                             | The patterns database (`data/patterns.db`) and its translations: the corpus the multilingual gates read      |
| `testing-framework`                              | Private: the repository's multilingual and shipped-source gates                                              |
| `compilation-service`                            | A library: validate, translate, diff and score hyperscript. It is the MCP server's backend                   |
| `mcp-server`                                     | MCP server (hyperscript tools, plus the domain DSLs through `@lokascript/domains`)                           |
| `behaviors`                                      | Reusable behaviors written in hyperscript                                                                    |
| `language-server`, `language-server-hyperscript` | LSP servers: for LokaScript/hyperscript in 24 languages, and for original \_hyperscript                      |
| `multilingual-hyperscript`                       | `@hyperscript-tools/multilingual`: original \_hyperscript in 24 languages                                    |
| `hyperscript-tools-i18n`                         | `@hyperscript-tools/i18n`: build-time translation of hyperscript code samples                                |
| `speech`                                         | The `speak` command, as an engine module in its own package                                                  |
| `intent-element`                                 | The `<lse-intent>` element: runs LSE protocol JSON as written, or refuses it                                 |
| `server-bridge`                                  | Extracts server route contracts from hyperscript/htmx HTML                                                   |
| `types-browser`                                  | TypeScript definitions for the browser globals                                                               |
| `developer-tools`, `playground`                  | Private tooling                                                                                              |

The gallery is `examples/index.html` with one directory per category; `examples/multilingual/`
holds the multilingual demos and `examples/release-smoke/` the post-publish smoke test.

## Essential Commands

### Cold start

A fresh checkout has no workspace links and no `dist/` trees. Run `npm install` first.

**`npm run build` is not dependency-ordered.** It runs `build --workspaces --if-present`, in
declaration order, so building one deep package on a cold tree fails with
`Cannot find module .../framework/dist/index.js` until its dependencies are built.

- The authoritative build order is the `build` job of `.github/workflows/ci.yml`
  (`npm run check:ci-order` guards it against drift).
- For the multilingual stack the ordered chain is `npm run test:multilingual:build-deps`
  (intent, framework, semantic, i18n, patterns-reference, engine, hyperscript-adapter).
- Some builds print `DTS Build error` and still emit usable JS, because the bundle is written
  before the declaration step. Check whether the `dist/` file you consume exists.

### Engine and core

```bash
npm run build --prefix packages/engine              # library + dist/hyperfixi-hs.js
npm run test:upstream --prefix packages/engine      # the gate: upstream's suite vs known-failures.json (needs a browser)
npm run test:own --prefix packages/engine           # the engine's additions + regressions
npm run check:claims --prefix packages/engine       # what each non-upstream module takes from upstream
npm run typecheck --prefix packages/engine

npm run build --prefix packages/core                # root + subpaths (build the engine first)
npm run build:browser --prefix packages/core        # dist/hyperfixi.js, copied from the engine
npm test --prefix packages/core
npm run verify:reference --prefix packages/core     # reference + LSP data against the engine's grammar

# Playwright must run from packages/core
cd packages/core && npx playwright test --project=quick --project=comprehensive
cd packages/core && npx playwright test browser-tests/bundle-compatibility.spec.ts
```

### Other packages

Every package with tests has `npm test --prefix packages/<name>` and, for summary-only output,
`npm run test:check --prefix packages/<name>`. `npm run test:check` at the root runs them all
and is the right default for an agent; use `npm test` when debugging.

```bash
npm test --prefix packages/semantic -- test/ast-builder.test.ts   # one file
npm run typecheck --prefix packages/<name>
npm run build:browser --prefix packages/semantic                  # also packages/i18n
npm run clean:test                                                # coverage, HTML and Playwright reports
VITEST_HTML=1 npm test --prefix packages/core                     # HTML test report (off by default)
cd packages/core && npx playwright test --grep "Command Compatibility"
```

**Vitest can hang on exit** (an esbuild daemon keeps the process alive), so `timeout` kills the
run with exit code 124 after every test has passed. `scripts/vitest-run.sh`, which is behind
each package's `test` and `test:check`, decides from the reporter summary instead: a failure in
the summary fails, a passing summary passes even with 124, and no summary at all fails (the run
hung before finishing). If you run `vitest` directly under `timeout`, read a 124 the same way,
and never treat a 124 without a summary as green. When the wrapper reports no summary, the run hung or
the suite outgrew `VITEST_TIMEOUT` (default 120 seconds).

### Gates `test:check` does not cover

These are CI checks that no `test:check` reaches, so a green local run can still fail CI. Run 1
and 2 when a change touches `packages/semantic/src/generators/command-schemas.ts`, a language
profile, or R2's curated execution subset. Run 3 on every change: it is cheap. Run 4 when a
change touches `packages/intent` or `packages/framework`.

```bash
# 1. Vocab consistency
cd packages/testing-framework && npx tsx src/vocab/cli.ts validate

# 2. The R2 curated-subset lock (part of the testing-framework suite)
npm run test:check --prefix packages/testing-framework

# 3. What the `lint-typecheck` job runs that no test suite does. The job stops at the
#    first failure, so run them all locally.
for s in check-ci-build-order check-bundle-shards check-test-check-list \
         check-ci-test-list check-ci-job-lists validate-versions \
         check-published-files check-domains-peer-major check-semantic-boundary; do
  node scripts/$s.cjs || echo "FAILED: $s"
done
for t in check-domains-peer-major wait-for-registry check-semantic-boundary; do
  node --test scripts/$t.test.cjs || echo "FAILED: $t.test.cjs"
done
npm run lint
npm run typecheck:scripts --prefix packages/core
npm run check:grammar --prefix packages/semantic
npm run check:mapper-parity --prefix packages/semantic
npm run check:keywords --prefix packages/vite-plugin
npm run verify:reference --prefix packages/core
# plus `npm run typecheck --prefix packages/<each>` for every package the job lists:
# grep -oE "npm run typecheck --prefix packages/[a-z0-9-]+" .github/workflows/ci.yml

# 4. The domain gate (the `domain-gate` job). It clones lokascript-domains at the ref
#    pinned in the script; DOMAINS_DIR=<checkout> reuses an installed one.
npm run test:domains
```

1. **Vocab consistency** fails when a schema gains a `markerOverride` whose word tokenizes as
   `identifier` instead of keyword or particle. Waive it in
   `packages/testing-framework/vocab-waivers.json`, keyed `V4|<lang>|<marker>`, with a reason.
   The error aggregates its sites, so a marker that has shipped for years becomes reportable
   the moment a second schema uses it.
2. **The R2 subset lock** (`validators/execution-validator.test.ts`) asserts the exact curated
   pattern list. Expanding `EXECUTION_SUBSET` means updating the count in the test title and
   the sorted expectation array, and regenerating the multilingual baseline, in the same PR.
3. **`check-semantic-boundary` is a ratchet, not lint.** It holds a committed baseline of every
   place `packages/core/src` imports `@lokascript/*` and fails on any increase. Use
   `npm run check:semantic-boundary:update` only when the import is required, and say why in
   the PR.
4. **`check-domains-peer-major`** guards the cross-repo version contract.
   `@lokascript/domains` (repository `lokascript-domains`) peers on framework, semantic and
   intent, and mcp-server depends on it back. The guard reads the lockfile's domains entry and
   fails unless those three are peers, not bundled dependencies, at a range this repository's
   version satisfies; otherwise a clean install gets two framework copies and forked
   singletons. It also runs in `publish.yml` after the bump, so a framework major cannot
   publish until domains accepts it:
   - A major that only renumbers the contract: pack framework, semantic and intent here at
     the new version, prove domains against them (its `pack-smoke.sh` takes
     `UPSTREAM_TARBALLS`), release a domains patch peering `^old || ^new`, bump the range here
     and relock, then publish hyperfixi.
   - A major that changes the contract needs a real domains major, cut after hyperfixi's is on
     npm.
5. **The domain gate** (`scripts/domain-gate.sh`) is the only gate here that parses a domain
   DSL. The domains read on framework's matcher and its language grammars. The first pass runs
   lokascript-domains' own round-trip gate on this tree's packed intent, framework and
   semantic, and fails on a case worse than the domains' baseline (moved parses and better
   cases are reported, not failed). That pass renders and reads with the same packages, so it
   cannot see a change both sides share. The second pass (`domain-gate-read-back.mjs`) reads
   the sentences the domains' locked packages render with this tree's packages and fails on
   one that reads differently. A deliberate change to what old input means is listed in
   `scripts/domain-gate-accepted.json`, one entry per sentence with a reason, shrink-only.
   When the domains relock, bump the pinned ref and regenerate their baseline.

### Stale `dist/`

`npm test --prefix packages/<X>` (through `pretest`) and `npm run test:check` (through
`scripts/test-check-all.sh`) rebuild any workspace dependency whose `src/` is newer than its
`dist/`, using `scripts/ensure-fresh.sh`. `npm run check:fresh` does it by hand.

- **Direct `npx vitest` and `npx tsx` runs skip these hooks.** After editing an upstream
  package, rebuild it first; a green suite against a stale `dist/` proves nothing. The
  multilingual CLI refuses `--regression` and `--save-baseline` when one of its packages has
  `src/` newer than `dist/`.
- A file that a build bakes another package into is rebuilt when that package was built after
  it: semantic's `browser.global.js` (framework), the adapter's `hyperscript-i18n.global.js`
  (semantic), core's `hyperfixi.js` (the engine). The list is `baked_files` in
  `ensure-fresh.sh`; add a line when a build starts inlining or copying a workspace package.
- When you add a dependency between workspace packages, add it to the consumer's `pretest`.
  Every `ensure-fresh` call lists packages dependency-first and must name packages;
  `npm run check:ci-order` fails otherwise.
- **An MCP tool refusing with "serving STALE code" is a guard working.** The MCP server
  (`.mcp.json` launches `packages/mcp-server/dist/index.js`) resolves its workspace
  dependencies at startup and cannot reload them, so after a rebuild it would serve old code
  silently. `packages/mcp-server/src/freshness.ts` detects that and refuses the call. Restart
  the server (`/mcp`, reconnect); do not debug the tool.

### Hand-maintained package lists

CI and the local gate name packages in hand-written lists. Each list has a guard, run in
`lint-typecheck` and from the pre-commit hook:

| List                                       | Guard                | A package must be listed if and only if                                 |
| ------------------------------------------ | -------------------- | ----------------------------------------------------------------------- |
| `build` job step order                     | `check:ci-order`     | a runtime dependency is built before its consumer                       |
| `unit-tests` / `unit-tests-packages` steps | `check:ci-test-list` | it has a `test:check` script                                            |
| `scripts/test-check-all.sh`                | `check:test-list`    | it has a `test:check` script                                            |
| `export-validation` arguments              | `check:ci-job-lists` | it is published, declares an entry point, and the `build` job builds it |
| `lint-typecheck` typecheck lines           | `check:ci-job-lists` | it has a `typecheck` script                                             |
| nightly `coverage` job                     | `check:ci-job-lists` | its flag is declared in `codecov.yml` (both directions)                 |

- A new package with a `test:check` script is not in the local gate until you add it to
  `scripts/test-check-all.sh` (and to its `ensure-fresh` arguments, if its tests read a
  workspace dependency's `dist/`).
- Deliberate exclusions go in `INTENTIONALLY_UNGATED` (`check-test-check-list.cjs`) or
  `INTENTIONAL_OMISSIONS` (`check-ci-job-lists.cjs`), each with a reason.
- **A package added to the typecheck list must typecheck on a clean checkout**, not only in
  your tree. `packages/behaviors` generates `src/generated/`, which is gitignored, so it needs
  its `pretypecheck` hook.

### Bundle sizes

Gzip sizes depend on the platform. `packages/core/src/metadata.ts` carries the values CI
measures on Linux. `npm run update:sizes --prefix packages/core` tolerates 2% drift; the
regression gate is `packages/core/scripts/bundle-size-snapshot.mjs --check` (5% against
`scripts/bundle-snapshots/baseline.json`), and CI also enforces absolute ceilings. **Never run
`update:sizes:auto` locally and commit the result**: `dist/` is untracked, so your tree may
hold another branch's build. Take the numbers from the CI job log.

### Live testing

```bash
npm run dev    # http-server on port 3000, from the repository root
# http://127.0.0.1:3000/examples/index.html                         the gallery
# http://127.0.0.1:3000/examples/multilingual/index.html            grammar demo
# http://127.0.0.1:3000/examples/multilingual/semantic-demo.html    semantic parser demo
# http://127.0.0.1:3000/packages/core/compatibility-test.html       side-by-side comparison
```

## CI

All CI is `.github/workflows/ci.yml`, on Node 24. The job comments there hold the reasoning.

| Job                       | PR  | push main/develop | nightly | Notes                                                                                          |
| ------------------------- | --- | ----------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `changes`                 | yes | yes               | no      | Path classifier: `code`, `docsources`, `domaingate`                                            |
| `build`                   | yes | yes               | yes     | Builds every package once; gated on `code` or `docsources`                                     |
| `bundles`                 | yes | yes               | yes     | Browser bundles; gated on `code`                                                               |
| `shipped-sources`         | yes | no                | no      | `test:shipped-sources`; runs whenever `build` ran                                              |
| `export-validation`       | yes | no                | no      | `exports` resolve to `dist/`; bare-Node import                                                 |
| `lint-typecheck`          | yes | no                | no      | Guard scripts, oxlint, typechecks, generated-artifact checks                                   |
| `unit-tests`              | yes | no                | no      | core and semantic                                                                              |
| `unit-tests-packages`     | yes | no                | no      | every other package                                                                            |
| `browser-tests`           | yes | no                | no      | Playwright `quick` + `comprehensive`; the engine's `test:upstream`, `test:own`, `check:claims` |
| `multilingual-validation` | yes | no                | no      | `populate`, vocab consistency, the 24-language regression gate, `test:canonical`               |
| `bundle-size`             | yes | no                | no      | `update:sizes`, the snapshot gate, absolute ceilings                                           |
| `domain-gate`             | yes | no                | no      | gated on `domaingate`                                                                          |
| `coverage`                | no  | no                | yes     | Codecov upload; also `workflow_dispatch`                                                       |
| `ci-gate`                 | yes | yes               | yes     | `always()`; fails if any job failed or was cancelled (a skip passes)                           |

- **Path gating.** `code` is every file outside `**/*.md`, `**/*.txt`, `docs/**`,
  `docs-internal/**`, `examples/**`, `.claude/**`, `protocol/**`, `.gitignore` and `LICENSE`.
  `docsources` is `examples/**`, `docs/**` and `packages/core/docs/**`: the trees
  `shipped-sources` walks. `domaingate` is `packages/intent/**`, `packages/framework/**` and
  `scripts/domain-gate*`. `build` runs on `code` or `docsources`, `shipped-sources` whenever
  `build` ran, `domain-gate` on `domaingate`; every other PR job requires `code`.
- **A diff that matches no filter runs nothing but `changes` and `ci-gate`.** A root-level
  `*.md` edit, this file included, is one. Skipped required checks report "skipped" and
  satisfy branch protection.
- **The push run is only `changes`, `build`, `bundles` and `ci-gate`.** Branch protection is
  `strict`, so the PR already validated the merged tree.
- The required checks on `main` are Build All Packages, Lint & Typecheck, Unit Tests, Export
  Validation, Multilingual Validation, Browser Tests and CI Gate.
- `changes` is skipped on `schedule` (06:00 UTC) and `workflow_dispatch`, so `build`,
  `bundles` and `coverage` each carry an explicit `!cancelled()`. A job added to the nightly
  chain without one is skipped silently while the run reports success.
- Concurrency cancels in-progress runs per workflow and ref.
- `browser-tests` runs `comprehensive` on every code PR and deliberately not on a schedule:
  Playwright pins its browsers, so a browser change arrives as a code PR.

Other workflows, both `workflow_dispatch`: `publish.yml` and `pre-publish-check.yml`.

Docs for finished work are deleted under a tag and indexed in `docs-internal/ARCHIVE.md`, not
moved; `docs-internal/CLAUDE.md` has the procedure.

## Multilingual gates

Authoritative numbers live in the committed baselines under
`packages/testing-framework/baselines/` (`multilingual-priority.json` stamps its `timestamp`
and `commit`). Every corpus signal is at its best value in all 24 languages, so any drop is a
regression. The open work is what the corpus cannot show:
`docs-internal/MULTILINGUAL_NEXT_STEPS.md`.

### Multilingual parse rate ≠ fidelity

The parse rate counts a translation as passing when the semantic parser returns a non-null
node, not when the node is faithful. The parser degrades instead of returning null, so a
pattern can "parse" while dropping most of its commands. The harness therefore scores
structural fidelity (`src/multilingual/fidelity.ts`): the fraction of the English reference
parse's command actions present in each translation. A pass is degenerate (below 0.5), lossy
(below 1.0) or faithful (1.0).

### The `--regression` gate's signals

The reasoning behind each is in [docs/FIDELITY.md](docs/FIDELITY.md); the tolerances are in
`src/multilingual/cli.ts`. Each fails CI. A baseline that lacks a signal's field yields a zero delta, so an
un-regenerated baseline never retro-flags.

1. **Parse rate**: a per-language drop of more than 2 points. Deliberately coarse.
2. **Degenerate ratchet**: a faithful baseline pass that became degenerate (tolerance 3).
3. **Lossy ratchet (R0 recall)**: a faithful baseline pass that became lossy (tolerance 0),
   plus a per-language `avgFidelity` drop of more than 0.02.
4. **Precision (R0 precision)**: a per-language `avgPrecision` drop of more than 0.02. It
   catches a parse or render that adds commands the source never had, which no recall signal
   sees.
5. **Multiset recall**: a per-language `avgMultisetRecall` drop of more than 0.02. Signals 2
   to 4 score the deduplicated action set, so a dropped repeated command (`[bind, bind]` read
   as `[bind]`) scores 1.0 on them.
6. **Role fidelity (R1)**: a per-language `avgRoleFidelity` drop of more than 0.02
   (`action.role:valueType` recall against the English reference), plus the role-set flip
   ratchet at tolerance 0: a pattern absent from the baseline's `roleLossyPatterns` that now
   has an incomplete role set. The average cannot see one pattern losing one role. R1 and R3 also score a handler's event
   modifiers (`from`, `once`, `debounced at`, `throttled at`) as `on.<mod>` pseudo-roles.
7. **Execution (R2)**: a curated-subset pattern whose jsdom DOM effect matched the reference
   and now diverges (tolerance 0). The reference is the English source on upstream
   `hyperscript.org`; each translation runs as written on `@hyperfixi/engine` with the
   adapter's plugin and `lang` on the page.
8. **Value recall (R3)**: a per-language `avgValueRecall` drop of more than 0.02. It compares,
   verbatim and as a multiset, the values that are the same in every language (selectors,
   sigil references, numbers and time literals, colon-qualified event names, URLs). If every
   language flags one pattern at once, suspect the English parse first.
9. **Canonical validity (R4)**: every foreign translation is rendered to English and parsed on
   the real `hyperscript.org` engine. Invalid (pattern, language) pairs are compared with the
   allowlist `baselines/foreign-canonical-validity.json`, tolerance 0 in both directions: a new
   invalid pair fails, and so does a listed pair that now renders valid (prune it with
   `tools/regen-foreign-baseline.ts` in the same change). Full mode only. Triage with
   `tools/triage-foreign-residual.ts`. `foreign-canonical-validity.test.ts` reads the same
   allowlist; the English-side twin is `canonical-validity.test.ts`. R4 excludes pairs whose
   English source the canonical parser rejects, so a corrupted English reference needs the
   English-side gate.
10. **Per-pattern parse (R5)**: a pattern that parsed in the baseline no longer parses at all
    (tolerance 0). One flip is far below signal 1's tolerance, and the averages do not move at
    all because a failed parse is skipped before scoring.

The signals with tolerance 0 are binary flips. The remaining tolerances are cross-machine
headroom (a baseline generated on macOS, CI on Linux), not run-to-run noise: `populate` is
deterministic, so do not read a green gate as "within noise".

### Running the multilingual `--regression` gate locally

```bash
npm run test:multilingual:build-deps                     # ordered build of the multilingual stack
npm run populate --prefix packages/patterns-reference    # rebuild patterns.db and its provenance stamp
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
```

- The gate refuses a `patterns.db` whose stamp is stale (generated from other source than the
  checkout) and warns on one with no stamp. See `packages/patterns-reference/CLAUDE.md`.
- **Populate before any corpus gate or probe.** A copy of `patterns.db` is tracked, and it can
  lag the dictionaries and profiles; CI always repopulates. `git checkout --` on it returns
  the possibly stale copy.
- After an intentional fidelity change, run with `--save-baseline` in place of `--regression`,
  against a freshly populated database, and commit the new
  `baselines/multilingual-priority.json`.
- **Do not commit your regenerated `patterns.db`.** Commit the dictionaries, profiles and
  baseline only. `populate` rewrites the tracked file, so do not `git commit -a` after a gate.

### The corpus writer

Every foreign row in the corpus is `@lokascript/semantic`'s `render(parse(en), L)`: the same
call MCP `translate_code` and `@hyperfixi/core/multilingual`'s `translate` make. There is one
renderer.

- A markup row's `_=` body is translated only when its own English re-render preserves its
  content (`packages/patterns-reference/src/sync/markup-attributes.ts`). Plain rows are gated
  by en-reference preservation instead.
- A row the renderer cannot render keeps its English, is counted, and is reported at the end
  of a `populate` run. That count must stay 0.

### The other gates

Each has a committed baseline that only shrinks, and each fails both on a case worse than
listed and on a listed case that now passes. Run the regeneration tools from
`packages/testing-framework` with `npx tsx tools/<name>.ts`.

- **`npm run test:canonical --prefix packages/testing-framework`** runs six gates: the two
  canonical-validity tests, render fidelity, bare render fidelity, en-reference preservation
  and the English-leak gate's corpus half.
- **En-reference preservation.** No recall signal can see a regression in the English
  reference itself, because English defines the reference. This gate renders every
  translatable unit's English parse back to English and requires the source's content, under
  a short list of named equivalences, each pinned on the real engine. Regenerate with
  `regen-en-reference-baseline.ts`; a new lossy unit must be given a triage family.
- **Direct-path shapes** (`direct-path-shapes.<n>.test.ts`). Cases with an English source, a
  fixture and events; each translation runs as written on the engine with the adapter plugin,
  against upstream's English. `KNOWN` lists the failing cases.
- **Value matrix** (`value-matrix.ts`; shards `value-matrix.<position>.test.ts` and
  `<position>-phrases.test.ts`, in the package's ordinary suite). The corpus holds few value
  shapes, so this gate generates them: operand kinds by operators by value positions, written
  targets, operator phrases, and colliding names (variables spelled like some language's
  marker, and English words upstream runs as variables, `KEYWORD_NAMES`). It executes each
  cell. The English source on upstream `hyperscript.org` is the oracle, and every lane must
  match it: semantic's English round trip, each language through the adapter on upstream, and
  the English source and each language's adapter output on `@hyperfixi/engine`. The baseline
  lists each failing (cell, lane) pair; accepted and refused pairs are listed apart. A name
  that is a pronoun in some language skips that language's lanes. Prune with
  `regen-value-matrix-baseline.ts` (it refuses to add pairs without `--allow-new`). The rules
  that tell a variable from a structure word are in
  `docs-internal/multilingual/VALUE_READING.md`; a PR that moves one updates its row.
- **English leaks** (`english-leaks.ts`). Whether a render reads as the language: English
  grammar words, English event names where the lexicon has a word, a nominative `me` beside a
  marker where that is wrong, and an attached marker written apart. Two halves: the corpus (in
  `test:canonical`) and the command-shape renders (in those shards). Prune with
  `regen-english-leaks-baseline.ts`; `--report` prints the queue.
- **Command shapes** (`command-shapes.ts`; `command-shapes.<n>.test.ts`). The shapes around
  values (a `when` filter, `else if`, `catch`, a second feature after `end`), harvested into
  `command-shapes.cases.json` by `tools/harvest-command-shapes.ts` from the vendored upstream
  suite and core's reference examples. A test pins the count and the vendored version, so
  re-harvest when the suite moves. Each case runs one lane per language:
  `translate(src, 'en', 'en')` for English, `translate(translate(src, 'en', L), L, 'en')` for
  the others. The oracle compares the engine's parse of
  that English with its parse of the source, after named equivalences pinned in
  `command-shapes.oracle.test.ts`. A pair is `pass`, `refused` (`translate` threw) or `silent`
  (it returned English that parses differently or not at all). A case in a family semantic
  does not carry yet must be refused, never silent. Regenerate with
  `regen-command-shapes-baseline.ts` (`--allow-new` to write a worse pair).
- **LSE round trip** (`lse-round-trip.test.ts`). It parses the command-shape sources, writes
  each node as bracket syntax and as protocol JSON, and reads it back: `faithful`, `type-only`,
  `refused` (the writer threw `LossyEncodingError`) or `silent`. `silent` is never allowed,
  except the bracket cases in `BRACKET_UNTYPED`. It is judged three ways, because the scorer
  does not read every field: by the scorer, by a field-by-field `structure()` comparison, and
  by the script the read-back node renders to against the original's, as the engine reads
  both. A parser change that adds a field to a node
  shows as new refusals until a writer learns the field. Regenerate with
  `regen-lse-round-trip-baseline.ts` (`--allow-new` for worse cases, `--report` for the
  refusal reasons).
- **Shipped sources** (`npm run test:shipped-sources --prefix packages/testing-framework`).
  Examples and docs are written in upstream's spelling. Three tests hold that:
  `shipped-sources-engine` (English sources the engine rejects, an empty shrink-only list),
  `shipped-sources-localized` (each source under a non-English `lang` must translate to
  English both engines parse) and `shipped-examples-execution` (the DOM each example handler
  leaves on the engine, against upstream).

## Releases

`publish.yml` publishes to npm and then has to land the version bump on `main`, which is
push-protected. It tries `RELEASE_BUMP_TOKEN` (a direct push), then a plain push, then a
`release-bump/vX.Y.Z` branch and PR, and fails loudly if none lands.

- **`RELEASE_BUMP_TOKEN` is required, not preferred.** A PR opened with `GITHUB_TOKEN` does
  not trigger CI, so the required checks never start and the PR waits until a human pushes an
  empty commit or closes and reopens it. The repository setting "Allow GitHub Actions to
  create and approve pull requests" only lets the fallback PR be created.
- **Run the workflow with `dry-run=true` first.** Its "Verify RELEASE_BUMP_TOKEN can push"
  step is a no-op push of `main` onto itself. A real publish must be dispatched on `main`.
- **If a release publishes but leaves `main` on the old version, suspect the token first.**
  The secret was last set on 2026-10-18; as a 90-day token it expires about 2027-01-16.
  - Authentication failed, or the token is invalid or expired: store a new PAT in the secret.
  - `Permission to … denied to <user>`: the token is valid and under-scoped. A fine-grained
    PAT needs this repository under _Repository access_ and _Contents: Read and write_; a
    classic PAT needs `repo`. Editing a fine-grained PAT's permissions keeps the same token
    string, so the secret's update time does not change.
- After a real release, confirm that `main`'s version matches npm. The workflow's
  release-smoke job runs `examples/release-smoke/run.mjs` against the registry.
- `check-domains-peer-major` runs after the bump (see the gates above).

## Architecture

### The engine

`packages/engine` is the engine; `@hyperfixi/core`'s root re-exports it. Read
`packages/engine/README.md` before changing it. Port from upstream's source, and measure
before and after.

- `npm run test:upstream --prefix packages/engine` fails on a new failing test and on a listed
  one that now passes (`upstream-suite/known-failures.json`). Prune with
  `test:upstream:update`, then update `UPSTREAM_SUITE` in `packages/core/src/metadata.ts`
  (`verify:reference` checks it against that file).
- **The engine has no `test:check` script**, because its gate needs a browser. Root
  `npm run test:check` does not cover it; CI's `browser-tests` job does.
- A bundle is the list of grammar modules passed to `register()`; `register(...everything)`
  is every module. A module can live in another package (`@hyperfixi/speech`).
- The forms upstream lacks are in `src/additions.ts` (`new X()`, `toggle <element>`), measured
  claim by claim by `check:claims`. `npm run test:own` covers them and `tests/regressions.js`:
  places the engine differed from upstream that upstream's own tests did not show.
- **Examples and docs are written in upstream's spelling.** The shipped-sources gates hold
  that.

### Adding a command

Hyperscript syntax follows upstream: a new command is normally upstream's, ported from its
source.

1. Add the rule in a module in `packages/engine/src/commands/` (`g.commands.<keyword> = …`);
   export the module from `src/index.ts` and add it to `src/everything.ts`.
2. Run `npm run test:upstream --prefix packages/engine`. For a form upstream's suite does not
   test, add a test to `tests/regressions.js` that also passes on upstream's bundle
   (`node upstream-suite/run.mjs --bundle <upstream> --own`).
3. Document it in `packages/core/src/reference/index.ts` and `packages/core/src/lsp-metadata.ts`
   (keyword and `HOVER_DOCS`). `npm run verify:reference --prefix packages/core` fails until
   every engine keyword is documented and every example parses on the engine.
4. To make it available in other languages, add it to `packages/semantic/` (a schema and the
   24 profiles).

### Translation

A translation is `@lokascript/semantic`'s `render(parse(code, 'en'), language)`, in each
language's own word order. `@hyperfixi/core/multilingual` (not the package root) exposes
`parse`, `render` and `translate` over it. Running non-English hyperscript on a page is
`@lokascript/hyperscript-adapter`'s job: it translates each script as the engine reads it
(`api.addSourceTransform`).

- **A translation that would lose part of the script is refused, never truncated.**
  `translate()` throws a `LossyTranslationError` carrying the partial output and what it
  drops; `{ lossy: 'allow' }` opts out. The checks are in
  `packages/semantic/src/explicit/lossy.ts`. MCP `translate_code` reports a refusal as
  `ok: false` with `LOSSY_TRANSLATION` and the partial text under `partial`, never `code`.
- The public `render` is `explicit/verified-render.ts`. It writes a variable spelled like a
  structure word of the target language in parentheses (`(si)`), only where the plain render
  would be misread.
- The reader accepts some core-only forms (`prepend`, `X has .c`, `set @a … on X`); English
  output writes upstream's spelling for them (`explicit/upstream-spelling.ts`).
- A language's grammar (word order, role markers, script, particles) is data in
  `packages/framework/src/languages/`. Semantic's profile is that grammar with hyperscript's
  vocabulary over it (`semantic/src/generators/with-grammar.ts`); a domain supplies its own
  vocabulary.
- `packages/framework` exports its own `GrammarTransformer`. It is unrelated to translation
  of hyperscript.

### Adding a language

Follow "Adding a New Language" in `packages/semantic/CLAUDE.md` (the `add-language`
scaffold) and in `packages/i18n/CLAUDE.md`. After filling in the semantic profile, run
`npm run sync-keywords --prefix packages/vite-plugin` (`--dry-run` previews, `--language=xx`
limits it to one language): `lint-typecheck` runs that package's `check:keywords`.

### Behaviors and the Vite plugin

- Behaviors are hyperscript source strings. `resolver.browser.global.js` from
  `@hyperfixi/behaviors`, loaded after `hyperfixi-hs.js`, defines every standard behavior
  eagerly; the engine has no lazy resolver. The sources also run on upstream `_hyperscript`,
  where an install with no arguments is spelled `install X()`. Define your own before the elements that install
  it, in a `<script type="text/hyperscript">` or with
  ``hyperfixi.evaluate(`behavior MyThing on click add .done end`)``.
- `@hyperfixi/vite-plugin` emits a bundle that registers only the engine modules a project
  uses. Its keyword-to-module map is derived from the engine, not copied. Options are in
  `packages/vite-plugin/src/types.ts`; helpers for custom language keywords
  (`registerCustomKeywords` and others) are exported from its `src/index.ts`.

## Debugging

`window.hyperfixi` (also `window._hyperscript`) is the engine's `api`, shaped like upstream's.
A script that fails to parse fires a `hyperscript:parse-error` event and logs a
`console.error`.

```javascript
_hyperscript.parse('on click toggle .active on').errors[0]?.message; // the engine's verdict
_hyperscript.evaluate('put "hi" into #out'); // run a snippet
// `breakpoint` pauses in DevTools; `beep! x` logs x with its type and passes it on.
```

In Node, `import { register, everything, parse } from '@hyperfixi/engine'` and
`register(...everything)` give the same parser; `parse` throws a `ParseError` whose `token`
carries the offset. Core's 3.x debugging API (`compileSync(…).meta`, `debugControl`,
`semanticDebug`) no longer exists.

## Browser Bundles

The full reference is [docs/BROWSER_BUNDLES.md](docs/BROWSER_BUNDLES.md). In short:

- A script-tag page starts with the engine's `hyperfixi-hs.js` (`hyperfixi.js` from
  `@hyperfixi/core/browser` is the same file) and adds fixi or htmx 4 when it needs hypermedia
  attributes. A Vite project uses `@hyperfixi/vite-plugin`.
- Non-English hyperscript: load a `@lokascript/semantic` bundle (`browser.global.js` or a
  regional subset) and `@lokascript/hyperscript-adapter`'s `hyperscript-i18n-lite.global.js`
  after the engine, or one per-language adapter bundle, and put `lang` on the element or page.
- Core's older bundles (`lite`, `minimal`, `standard`, `hyperfixi-hx*.js`,
  `hyperfixi-multilingual.js` and the rest) no longer exist. Do not reference them.
