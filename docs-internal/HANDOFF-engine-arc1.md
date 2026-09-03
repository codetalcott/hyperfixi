# Handoff — engine migration, Arc 1 (the engine / front-end boundary), steps 2 and 3

> **Rewritten 2026-09-03 on `79052242` (post-3.0.0).** The previous brief
> (2026-08-30, updated 2026-09-02) carried the decision that unblocked step 6;
> step 6 landed (#1058), the decision is history, and the measurements below
> replaced its numbers. Steps 1, 4, 5 and 6 are DONE. **Steps 2 and 3 are the
> only open steps in `ENGINE_MIGRATION_PLAN.md`**, and the plan's close-out
> (History, 2026-09-05) wrongly said every arc had closed — corrected in the
> same PR as this rewrite.

Paste the block below the `---` into a fresh session. Everything above it is
orientation for a human.

**Provenance caveat, unchanged.** The arcs from #1007 on were merged by the
agent that wrote them, on the user's instruction, with gates and local runs as
the evidence. This brief was written the same way.

---

MISSION: finish Arc 1 of `docs-internal/ENGINE_MIGRATION_PLAN.md` — target
design point 6, "the engine package has no dependency on `@lokascript/semantic`
or `@lokascript/i18n`; the multilingual system is a front-end that registers
itself." Read the plan's Arc 1 section and its 2026-09-03 History entry first.
Do not re-derive anything in "What is already true" below.

## What is already true (measured 2026-09-03 on `79052242`, do not re-derive)

Gates, all shrink-only, all in CI's `lint-typecheck` and the pre-commit hook:

| Gate               | Command                           | Baseline today                                              |
| ------------------ | --------------------------------- | ----------------------------------------------------------- |
| type escapes       | `npm run check:type-escapes`      | 640                                                         |
| import direction   | `npm run check:layering`          | 13 upward edges, 23 value imports                           |
| front-end coupling | `npm run check:semantic-boundary` | 9 files: static-value 5, dynamic 3, static-type 2, typeof 2 |
| parseInput census  | `parse-input-census.test.ts`      | 50 bodies, 2,085 lines, 70 syntax sites                     |
| core suite         | `npm run test:check --prefix packages/core` | 7,550 passed, 92 skipped, 320 files               |

**At the SOURCE level the boundary is at the ratchet's endpoint.** The five
`static-value` rows are the four bundle entries (`browser-bundle.ts`,
`browser-bundle-classic-i18n.ts`, `browser-bundle-semantic-complete.ts`, and
the multilingual bundle's `typeof` query) plus `multilingual/schema-roles.ts`
(2) — every one recorded as target-state in
`packages/core/baselines/semantic-boundary.json`. `parser/`, `runtime/`,
`commands/`, `expressions/`, `types/` and `core/` import the front-end nowhere
(a separate assertion in the same gate). The only non-target row is
`api/hyperscript-api.ts`, and it is **dynamic only**:

| Site in `api/hyperscript-api.ts`                                           | Kind    | What it does                                                             |
| -------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `getOrCreateBridge()` → `import('../multilingual/bridge')`                 | dynamic | the bridge then does `await import('@lokascript/semantic')` on `initialize()` |
| `compileMultilingual` → `import('@lokascript/semantic')` (`parseSemantic`) | dynamic | language-detect + parse for `translate`-style calls                      |
| the render path → `import('@lokascript/semantic')` (`render`)              | dynamic | renders a semantic node to a language                                    |
| `lse/index.ts` → `import('@lokascript/framework')`                         | dynamic | LSE support; `require.resolve` guard says "install it as a peer"         |

`compileAsync` consults the front-end exactly once per NON-English program
(`lang === 'en'`, `traditional`, or `config.semantic === false` all mean
"core parser only"). English never touches it — Arc 1 step 6.

**At the BUILD level the boundary does not exist.** `packages/core/rollup.config.mjs`,
main entry:

```js
{ input: 'src/index.ts', output: [{ file: 'dist/index.mjs', format: 'es', inlineDynamicImports: true }, …], external: [] }
```

`external: []` + `nodeResolve()` resolve the workspace symlinks, and
`inlineDynamicImports: true` flattens every `await import(...)` — so the
published `dist/index.mjs` (**3,331,225 bytes**) inlines
`semantic/dist/index.js`, `framework/dist/index.js` and `intent/dist/index.js`
whole (its sourcemap `sources` name all three) and contains **zero** dynamic
imports. Rebuilt once with `['@lokascript/semantic', '@lokascript/intent',
'@lokascript/i18n', '@lokascript/framework']` external, same plugins:
**1,036,964 bytes**, with three `import('@lokascript/semantic')` and one
`import('@lokascript/framework')` surviving as real deferred loads. That is the
whole of step 2's "the library entry stops pulling semantic into every Node
consumer — measure the `dist/index.mjs` size change": −69 %, no source change.

Three facts about the surrounding build that bound the work:

- **The subpath entries are already clean.** `commands`, `expressions`,
  `parser/full`, `registry`, `behaviors`, `bundle-generator` inline no
  workspace package (only `tslib`/`morphlex`). `multilingual/index.mjs` lists
  semantic external but inlines `intent/dist` — same fix, one more name.
- **`@lokascript/framework` is an optional peer** in `package.json` and is
  inlined anyway, which makes `lse/index.ts`'s `require.resolve` guard
  vacuous today. `@lokascript/semantic` and `@lokascript/intent` are hard
  `dependencies`, so externalizing them changes nothing for a consumer that
  installs core: npm installs them, Node resolves them at the first
  non-English compile.
- **`dist/index.min.js` is a UMD of the same entry** (global `LokaScriptCore`).
  It is not in `exports`, and no config, README or docs page under
  `packages/core` or `docs/` names it. Externals in a UMD need a `globals`
  map, so it is the one output that cannot simply take the same `external`
  list. Measure whether anything downloads it before deciding (decision 1).

**Consumers.** Of the sixteen workspace packages that depend on
`@hyperfixi/core`, the six that compile non-English through the library entry
(aot-compiler, i18n, language-server, mcp-server, playground,
testing-framework) already depend on `@lokascript/semantic` themselves. None
of the other ten appears among the library entry's `compile`/`compileAsync`
callers (grep, 2026-09-03). So a default registration kept through 3.x changes
nobody's behaviour, and dropping the dependency is a 4.0 entry, not a 3.x one.

One more thing the inlining implies and that step A should MEASURE, not
assume: a consumer that imports both `@hyperfixi/core` and
`@lokascript/semantic` (all six above) currently loads **two copies** of the
semantic module — the inlined one core's bridge reaches, and the real one the
consumer registers languages into. They work today only because semantic's
entry registers its languages on import in both copies. Step A removes the
second copy; if anything was relying on the copies being distinct (a registry
mutated in one and not the other), it will show up as a test failure in those
six packages, which is why their suites are on step A's gate list.

## The steps

Order: A → B → C. A is a build-only PR and can land today; B is the API; C
is the gate flip that turns the ratchet into an assertion. Each is one PR.

### Step A — the build stops inlining the front-end (step 2, build half)

1. In `rollup.config.mjs`, give the main entry's `.mjs` and `.js` outputs
   `external: ['@lokascript/semantic', '@lokascript/intent', '@lokascript/i18n',
   '@lokascript/framework']`, and give `createSubpathEntry('src/multilingual/…')`
   the same list (it has semantic only). Keep `inlineDynamicImports: true` —
   it is what keeps each entry single-file; with the packages external the
   dynamic imports survive as `import('@lokascript/semantic')` (measured).
2. Confirm the CJS output emits the deferred form
   (`Promise.resolve().then(() => require('@lokascript/semantic'))`) and that
   `dist/index.js` in bare Node still passes `scripts/check-node-import.mjs`
   (it asserts the named entry points, not a size).
3. Decision 1 on `index.min.js` (below), then apply it.
4. **Gate this PR leaves behind:** extend `scripts/check-node-import.mjs` (it
   already runs in CI's `export-validation` job against built `dist/`) with a
   sourcemap check — `dist/index.mjs.map` `sources` contains no path under
   `../semantic/`, `../framework/`, `../intent/` or `../i18n/`, and
   `dist/index.mjs` contains at least one `import('@lokascript/semantic')`.
   Mutation-verify by reverting the `external` line: the check must go red.
5. Record the measured before/after sizes in the plan's History and the step
   2 entry. Check `packages/core/scripts/bundle-snapshots/baseline.json` and
   `metadata.ts` for a row that names `index.mjs` before assuming no size gate
   moves; the browser bundles are untouched by this PR and must not move.
6. Run the six consumer suites (aot-compiler, i18n, language-server,
   mcp-server, playground, testing-framework) plus core's, and the
   release-smoke script against an `npm pack` of core if the harness allows a
   local tarball (its README says it installs from the registry; if it cannot,
   say so in the PR rather than skipping silently).

### Step B — `hyperscript.use(frontEnd)` (step 2, API half)

The plan's wording: `getSemanticAnalyzer()` reads an analyzer a front-end
registered. That function is gone (step 6 deleted `createSemanticAdapter` and
the in-loop path), so the shape today is smaller:

1. Define a `FrontEnd` interface in `parser/semantic-integration.ts` (the
   29-line file that now holds only `DEFAULT_CONFIDENCE_THRESHOLD`): `{ name;
   parseToAST(code, lang): Promise<BridgeASTResult>; }` plus the two optional
   methods the API's `compileMultilingual`/render path needs
   (`parse(code)` with detection, `render(node, lang)`). `BridgeASTResult` is
   what `SemanticGrammarBridge.parseToASTWithDetails` already returns.
2. `hyperscript.use(frontEnd)` stores it; `getOrCreateBridge()` becomes
   `getFrontEnd()`: the registered one if any, else — **through 3.x** — the
   lazily-imported `SemanticGrammarBridge` as today. That default is what
   keeps every consumer above unchanged. The two direct
   `import('@lokascript/semantic')` sites in the API route through the same
   front-end so `api/` has no import of the package at all, dynamic or not.
3. The multilingual bundles: `browser-bundle-multilingual.ts` never used the
   API's `compileAsync` (it calls `parseSemantic`/`buildAST` itself) and is
   unchanged; `browser-bundle.ts` exposes `hyperfixi.semantic.*` and should
   call `use()` at boot with the bridge so the full bundle is the reference
   registration. Measure first whether `browser-bundle.ts`'s non-English
   compiles go through `compileAsync` at all.
4. Existing plugin contract: `runtime/plugin.ts`'s `HyperfixiPlugin` is
   per-runtime and about commands/operators. A front-end is per-API, not
   per-runtime, so `use()` is a sibling on `hyperscript`, not an
   `installPlugin` extension. Do not fold them.
5. Gates: the multilingual `--regression` gate LOCALLY before pushing (its
   3,744 rows run exactly the `compileAsync` path this rewires); the boundary
   ratchet's `api/hyperscript-api.ts` row goes to zero in the same PR; a test
   that `use()` is honoured (a stub front-end returning a canned AST is what
   `compileAsync('x', { language: 'ja' })` compiles) and one that with the
   default the ja demo string still parses.
6. CHANGELOG `[Unreleased]` → Added: `hyperscript.use(frontEnd)`. The 4.0
   list gains: "the default front-end registration is removed;
   `@lokascript/semantic` moves to an optional peer; a non-English
   `compileAsync` with no front-end registered returns the same "no
   analyzer" result the traditional-only path returns today."

### Step C — the ratchet becomes an assertion (step 3)

When B lands, every remaining row in `semantic-boundary.json` is a
target-state row (bundles + `multilingual/`). Turn the ratchet's endpoint into
the rule: `check-semantic-boundary.cjs` fails on ANY import of the three
packages outside `compatibility/browser-bundle*.ts` and `multilingual/`,
regardless of kind, and the per-file allowlist is deleted. The plan's
principle — "a gate that becomes a type error is the best gate" — would
prefer a `tsconfig` `paths` block that makes the import unresolvable outside
those directories; try that first and fall back to the script if the build
tooling cannot express it. Whether `multilingual/` physically moves to its own
package stays a later decision; the import edge is what this arc removes.

## Decisions for the owner (each blocks one step, none blocks step A's core)

1. **`dist/index.min.js`** — keep it as a self-contained UMD (own config
   block, `external: []`, so it stays the one inlined output) or delete it. It
   is not in `exports`; measure downloads/consumers first. Recommendation:
   keep, self-contained, with a comment saying it is the exception and why.
2. **Framework external in the main entry** — yes is the recommendation: it
   is declared an optional peer, so bundling it contradicts the declaration
   and defeats `lse/index.ts`'s guard. The only cost is that an LSE user must
   actually install it, which is what the guard already tells them.
3. **3.x or 4.0 for dropping the default registration** — 4.0. Step B keeps
   the default; the removal is a `⚠ BREAKING` entry queued for the 4.0 cycle
   beside probe F.

## Operational traps

- **The shell's working directory persists across calls and drifts** — a `cd`
  in one command moves every later one. Use absolute paths; the release-check
  loop and the first probe build both failed on this in one session.
- **`@rollup/plugin-typescript` refuses an output outside the project's
  `outDir`** (`dist/`). A probe config must write into `dist/` and delete
  after; the scratchpad is not an option.
- **Rollup emits single-quoted `import('…')`** — a grep for `import("` finds
  nothing and reads as "no dynamic imports", which was briefly believed.
- **The sourcemap is the oracle for "what is inlined"**, not a grep for a
  class name: core has its own `Tokenizer` classes, and semantic's error
  strings appear in framework too. `sources` in `dist/index.mjs.map` named the
  three inlined packages unambiguously.
- Every PR touches the plan's History, so sequential PRs conflict there —
  keep both entries. `main` is `strict`-protected; merges are squash; stacked
  PRs get no CI; never `git stash`; never commit a regenerated `patterns.db`.
- A change to the `compileAsync` path (step B) needs the multilingual gate
  run LOCALLY first: `npm run test:multilingual:build-deps` → `npm run
  populate --prefix packages/patterns-reference` → `cd
  packages/testing-framework && npx tsx src/multilingual/cli.ts --full --bundle
  browser-priority --regression`. ~10 minutes; one heavy job at a time on this
  machine.

## The habit that produced everything of value here

The plan's Arc 1 was written as an import-graph problem, and at the import
graph it was already solved by step 6. The debt had moved to the build, where
no ratchet looked. Every arc's first step is a measurement, and it is allowed
to move the arc — when it does, correct the plan in the same PR, struck
through in place, and say so in the commit message.
