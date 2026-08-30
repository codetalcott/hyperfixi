# Engine migration plan — one typed AST, commands as grammar + op, closures at compile

> **Entry point, written 2026-08-30 on `e3b3e34a` (the 3.0.0 tree).** The
> standing plan for migrating the hyperscript engine in `packages/core` — the
> parser, AST, runtime, command and expression layers — toward the design a
> fresh, fully modular, typed implementation would have. It is the third
> queue document, alongside
> [PARSER_NEXT_STEPS.md](./PARSER_NEXT_STEPS.md) (correctness papercuts in the
> parser) and
> [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md)
> (the command-layer arcs D→F, all done). Those two hold defects and
> single-layer structure; this one holds the **cross-layer** structure that the
> six command arcs, deliberately, did not touch.
>
> **Status: PLANNED — no arc has started.** Every claim in
> [Verified state](#verified-state-measured-2026-08-30-on-e3b3e34a) was measured
> on the tree named above, not inherited from an earlier doc. Line refs will
> drift — re-verify by symbol (`grep -n`), not by number.
>
> **Not a rewrite.** The engine passes 7,972 tests and is the reference
> implementation for a 3,744-row multilingual corpus, an execution oracle, and
> five downstream tooling packages. The plan is a strangler-fig migration: each
> arc leaves the tree shippable, each stage is one PR, and each arc lands with a
> gate — the same discipline that closed D→F. The greenfield design is
> described in [Target design](#target-design) so every arc can be checked
> against it, but no arc is "build the new engine beside the old one."
>
> **Pointer-only below the plan level.** Per repo convention, each arc gets a
> `HANDOFF-engine-<topic>.md` brief when it starts, written from a fresh
> measurement of the rows it touches. This document holds the plan and the
> measurements the plan rests on; it must not accumulate repro detail.

## Why this plan exists

A whole-engine review (2026-08-30) found the code well *governed* — the
manifest audit, output-contract test, ratchets, `--check`'d generators and the
docs-internal queues are the reason 115 k lines are still navigable — but the
*design* underneath fighting itself in five places. Each is measured below; the
one-line versions:

| #   | Finding                                                                                                                                                                          | Where it is felt                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **The AST is untyped**, five times over: every `ASTNode` is `{ type: string; [key: string]: unknown }`; three producers emit three vocabularies into it                          | 1,152 type escape hatches in non-test source; `evaluateAST` re-declares node shapes locally and dispatches on `node as any`; commands read `(arg as Record<string, unknown>).name`                                        |
| 2   | **The grammar is parsed twice** — once by the parser's generic argument loop, again by each command's `parseInput`, on **every execution**                                       | prepositions travel through `args` as identifier nodes and are filtered back out at runtime; 30 commands index `raw.args[N]`; `put.ts`'s `parseInput` has 33 branches; nothing caches `parseInput`                       |
| 3   | **Two front-ends feed one runtime and the commands absorb the difference.** The core parser tries the semantic parser FIRST for 32 of 59 commands, then re-syncs tokens by heuristic | `toggle.ts`, `property-target.ts`, `numeric-target-parser.ts` each special-case "semantic parser vs traditional"; the engine package statically imports `@lokascript/semantic`, so "engine tests" are never engine-only |
| 4   | **Two control-flow protocols**, bridged in both directions                                                                                                                       | `enableResultPattern` gates duplicate paths; commands still `throw`; `toSignal`/`signalToError` convert each way; 49 sites match message strings or `isHalt`-style flags                                                 |
| 5   | **The execution context is a mutable bag with hidden channels and per-command copying**                                                                                          | commands re-enter the runtime via `locals.get('_runtimeExecute')`; `ContextBridge` copies the context per command and `Object.assign`s it back; a `Proxy` wraps handler contexts (registry providers, default ON)      |
| 6   | **~17 k lines (15 %) are dead scaffolding exported as public API**                                                                                                              | `features/` (10.6 k) has zero production callers by its own docblock; `context/` (2.5 k) is excluded from `tsconfig`; a second root `tokenizer.ts`; an 833-line zod clone                                                 |
| 7   | **Layering is circular**                                                                                                                                                         | `parser/runtime.ts` → `commands/helpers`; `parser-constants` → `commands/manifest`; `commands` → `parser/runtime`; `expressions` → `parser/extensions`, which is a process-global registry carrying the reactivity hooks |
| 8   | **Four parser implementations, 17 bundle entries, 23 rollup configs** — the consequence of #2: a command that is not a composable grammar + op unit has to be re-implemented per tier | Arc E gated the drift; this plan removes the cause                                                                                                                                                                       |

The pattern the command arcs established — audit first, gate with the audit,
migrate one row at a time, delete the mechanism last — is the pattern here. The
difference is scale: D→F touched one layer at a time and left the layer
boundaries where they were. Every arc below moves a boundary.

## Design principles

The five from `COMMAND_ARCHITECTURE_NEXT_STEPS.md` carry over verbatim —
**derive, don't trust · data over duplicated code · audit first · every arc
lands with a gate · one PR per arc stage, merged sequentially** — plus four
this plan needs:

- **A gate that becomes a type error is the best gate.** Where an arc can turn
  a runtime audit into a compile error (an exhaustive `switch`, a discriminated
  union, an import a leaf package cannot express), prefer that over a test. The
  manifest audit stays a test only because re-export statements cannot be
  derived; most of this plan's gates can be `tsc`.
- **The front-end / engine boundary is a package boundary.** The semantic
  parser is a front-end that produces the engine's AST. It depends on the
  engine's types; the engine never depends on it. Anything that needs both
  (interchange role inference, the multilingual API) lives on the front-end side
  or is injected.
- **Measure the incumbent before costing the change.** Six of the command arcs
  found a plan claim false on measurement. Each arc's step 1 below is a
  measurement, and several steps are explicitly conditional on what it finds.
- **Byte-identical where the arc is a refactor; deliberate where it is not.**
  Arcs 2 and 4b are refactors and carry an AST/behaviour-equivalence corpus
  that must not move. Arc 3 changes AST shapes on purpose and regenerates its
  snapshot per command, under review. Never let the second kind wear the first
  kind's commit message.

## Verified state (measured 2026-08-30 on `e3b3e34a`)

> **This section is a stamped SNAPSHOT, and arcs have since landed against it.**
> Rows the work has overtaken are struck through in place rather than deleted —
> a plan whose starting measurements quietly change is a plan nobody can audit,
> and three separate filings in this repo have already cost a session by being
> read as current. Where a number now lives in a committed baseline, that
> baseline is authoritative and is named:
>
> | Fact | Live source |
> | ---- | ----------- |
> | type-escape counts | `packages/core/baselines/type-escapes.json` |
> | import-direction debt | `packages/core/baselines/layering.json` |
> | front-end coupling | `packages/core/baselines/semantic-boundary.json` |
> | per-source parse shapes | `packages/core/baselines/ast-equivalence.json` |
> | node-kind vocabularies | `packages/core/src/parser/__tests__/ast-vocabulary.test.ts` |

Baseline: **7,972 passing, 106 skipped, 312 files** (`npm run test:check
--prefix packages/core`). Non-test core source: **114,763 lines**; the test
tree is 114 k lines across 316 files. Upstream `_hyperscript/src` is 15,318
lines for comparison.

### The AST

- **Five `ASTNode` definitions**, all structurally `{ type: string; …;
  [key: string]: unknown }`: `types/base-types.ts:308` (61 importing files),
  `types/core.ts` (re-exports it; 17 importing files), `types/unified-types.ts:199`
  (0), `ast-utils/types.ts:13` (0 external), `parser/hybrid/ast-types.ts:7`
  (the hybrid producer's own). A sixth in `parser/types.ts:154` declares
  **PascalCase** kinds (`'Literal'`, `'BinaryExpression'`) that nothing emits
  and nothing imports.
- **Three producers, three vocabularies.** `type:` literals emitted by the
  full parser + command-parsers: **37** distinct (including strays — `object`,
  `keyword`, `idSelector`, `functionCall`, `expression`, `dollarExpression`,
  `contextVariable`, `Command`, and both `sequence`/`CommandSequence`). The
  semantic `buildAST` emits **27** (adds `contextReference`, `propertyAccess`,
  `timeExpression`, `objectProperty`, `error`, `if`). The hybrid parser emits
  **23** under different names (`binary`, `member`, `event`, `sequence`,
  `fetchConfig`, `valuesOf`…), adapted at `runtime-base.ts` `case 'event'` /
  `case 'sequence'`. `evaluateAST` handles 26 kinds and falls through to a
  plugin registry.
- The one discriminated union in the package,
  `ast-utils/interchange/types.ts` (17 kinds), is consumed by the AOT compiler,
  the language server and the MCP LSP bridge — never by the runtime.
- **Type escape hatches** in non-test source: `: any` 459 · `as any` 471 ·
  `as Record<string, unknown>` 121 · `as unknown as` 101. Top files:
  `parser/pratt-parser.ts` 46, `ast-utils/transformer.ts` 40,
  `parser/runtime.ts` 37, `features/def.ts` 36.

### The grammar split

- 59 manifest commands. **31 have a dedicated parser** (`COMPOUND_COMMANDS` +
  the explicit `parse*Command` branches in `parseCommandCore`): `add decrement
  fetch go halt hide if increment install js measure morph pick process push put
  remove repeat replace send set show start swap take tell toggle transition
  trigger unless wait`. **28 go through the generic argument loop**: `append
  async beep blur break breakpoint call clear close continue copy default empty
  exit focus get log make open prepend pseudo-command render reset return scroll
  select settle throw`.
- The generic loop stops on a hand list (`continuationKeywords`, nine words);
  its stop set is `STOP_TOKENS` (Pratt) plus `then/and/else/end`. Prepositions
  reach the runtime as identifier nodes and are removed again by
  `KEYWORD_PREPOSITIONS` in `commands/helpers/element-resolution.ts` (six
  words). Eight hand-maintained keyword lists govern command parsing in total.
- **51 commands implement `parseInput`.** 41 call `evaluator.evaluate` inside
  it; 30 index `raw.args[N]`. `CommandAdapterV2.execute` calls it on every
  execution and nothing caches the result. Largest, by lines of `parseInput`:

  | lines | command             | lines | command       |
  | ----: | ------------------- | ----: | ------------- |
  |   242 | `dom/toggle`        |    62 | `dom/remove`  |
  |   197 | `dom/swap`          |    56 | `install`     |
  |   151 | `dom/put`           |    56 | `transition`  |
  |   125 | `control-flow/repeat` |  52 | `data/default`|
  |   121 | `data/set`          |    52 | `if`          |
  |   104 | `utility/pick`      |    50 | `measure`     |
  |   103 | `pseudo-command`    |    42 | `data/clear`  |
  |    80 | `process-partials`  |    41 | `advanced/js` |
  |    70 | `animation/take`    |    38 | `render`      |
  |    66 | `dom/add`           |       |               |
  |    62 | `events/trigger`    |       |               |

- Commands that special-case the semantic front-end's shapes by name: 6 files
  (`toggle.ts:286-330` alone handles three shapes of `*display`).

### The semantic coupling — narrower than it looks

`grep -l '@lokascript/semantic'` returns 15 core files, but most are comments.
~~The **load-bearing static imports** are exactly:~~ — **superseded 2026-08-30
by Arc 1 step 1's gate**, which measured **eight** static-value imports across
nine files, not five. This hand-read table was comment-blind in both directions.
`packages/core/baselines/semantic-boundary.json` is authoritative, and splits
each file by import KIND — the distinction that matters, and one this table does
not make. Kept for the shape it describes:

| File                                        | Imports                                                                                    | Nature                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `api/hyperscript-api.ts:35-41`              | `parseSemantic, isLanguageRegistered, getRegisteredLanguages, buildAST, DEFAULT_CONFIDENCE_THRESHOLD` (+2 lazy) | **the one that matters** — builds the analyzer for every `compile()`      |
| `ast-utils/interchange/from-core.ts:21-22`  | `getSchema` (semantic), `inferRolesFromSchema` (intent)                                    | schema-driven role inference for the AOT/LSP interchange                   |
| `multilingual/bridge.ts:14-15`, `index.ts:13` | `SemanticNode, ASTNode` (types), `DEFAULT_CONFIDENCE_THRESHOLD`; the module itself is `await import`ed | already lazy; the constant is a duplicate of `parser/semantic-integration.ts:146` |
| `compatibility/eval-hyperscript.ts:26`      | same five as the API                                                                       | bundle-facing                                                              |
| `compatibility/browser-bundle.ts`, `-semantic-complete.ts`, `-multilingual.ts` | the semantic API                                                        | these ARE the multilingual bundles — legitimate                            |

The parser layer is **already decoupled by interface**:
`parser/semantic-integration.ts` defines `SemanticAnalyzer` and
`createSemanticAdapter({ parse, isRegistered, registered, buildAST })` is the
injection shape the API already uses (`getSemanticAnalyzer()`,
`hyperscript-api.ts:265`). `config.semantic` defaults to `true`, so **every
English `compile()` runs the semantic analyzer first** for the 27 commands not
on `skipSemanticParsing` (`parser.ts:3481`).

### Control flow and context

- `enableResultPattern` is referenced by **one** test file and set `false` by
  **none**. The exception path is reachable only through a constructor option
  nothing passes.
- `TypedExecutionContext`'s extras (`evaluationHistory`, `expressionStack`, `validationMode`, …) are populated at 3 sites in `ContextBridge.toTyped` and read by **nothing** in `commands/` or `runtime/`; the sole reader anywhere is `expressions/shared/index.ts:trackEvaluation`.
- `_runtimeExecute` / `_behaviors` channel readers: `control-flow/if.ts`,
  `control-flow/repeat.ts`, `utility/tell.ts`,
  `animation/start-view-transition.ts`.
- `enhanceContext` (the `Proxy`) is called from **7** sites in `runtime-base.ts`;
  no package outside `src/registry/` registers a context provider.
- `RuntimeBase` has **zero** downstream importers. `Parser` (17 files, all in i18n), `installPlugin` (14), `createRuntime` (15), `hybridParser` (5), `getParserExtensionRegistry` (6) are the internals downstream actually reaches for; core's `createSemanticAdapter` has none (aot-compiler exports its own function of that name). The plugin contract is `HyperfixiPlugin.install({ commandRegistry,
  parserExtensions, runtime })`.

### Downstream consumers of `@hyperfixi/core`

By package: i18n 17 files · vite-plugin 4 · developer-tools 3 · realtime,
reactivity, mcp-server, intercept, components 2 each · speech, playground 1.
`aot-compiler`, `language-server`, `hyperscript-adapter`, `htmx-adapter`,
`compilation-service` and `server-bridge` import **nothing** from core (they
go through semantic, framework and their own adapters). `testing-framework`
imports `@hyperfixi/core/multilingual` — the multilingual ratchet executes the
engine, so it is a regression detector for every arc here.

### Dead and scaffolding code

| Tree                                  | Lines  | Status                                                                                                                                                       |
| ------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/`                       | 10,572 | zero production callers; imported only by `index.ts`, which re-exports six `Typed*FeatureImplementation` families as public API, already `@deprecated` |
| ~~`src/context/`~~ **DELETED (Arc 6a)**  |  2,543 | was excluded from ALL THREE tsconfigs (`.json`, `.build.json`, `.scripts.json`), so it had not compiled in any configuration; imported by nothing                                                                           |
| `src/registry/examples/`, `registry/multilingual/` | ~1,800 | no non-test downstream importer of either (the only hits are `dist/` artifacts) — ghost-test before deleting                                                                  |
| ~~`src/experimental/`~~ **DELETED (Arc 6a)** |  2,696 | imported by nothing (the 2,217 here counted only `.ts`; the tree was 2,696)                                                                                                                                          |
| `src/tokenizer.ts` (root)             |    —   | a second tokenizer, "compatible with `_hyperscript` tokenizer API", exported as `Lexer, Tokens`; the parser uses `parser/tokenizer.ts`                       |
| `validation/lightweight-validators.ts`|    833 | a zod clone; consumed by `features/`, `context/`, the `types/*` files, and three expression modules' `inputSchema` fields                                     |
| ~~`types/core.ts` `CommandImplementation`, `BaseCommandImplementation`; `command-types.ts` `TypedCommandImplementation`~~ **DELETED (Arc 6a)** | 144 | **0 implementers** each; the only implemented command interface is `DecoratedCommand` (46 files). Arc 6a deleted these plus four more in the same dead chain — `LegacyValidationResult`, `FeatureImplementation`, and the `types/core.ts` `Runtime`/`HyperscriptConfig` (each of which had a LIVE namesake elsewhere) |
| `src/types.d.ts`                      |    —   | `any`-typed module declarations for `@lokascript/i18n/browser`                                                                                               |
| `api/dom-processor.ts` + `dom/attribute-processor.ts` + `dom/minimal-attribute-processor.ts` | — | three DOM processors; the first two both wire `compileSync`/runtime |

### Gates that already exist and that every arc must keep green

`test:check` (core + the other 26 packages) · `command-manifest-audit` ·
`command-output-contract` (both execution paths) · `compound-command-coverage` ·
`selector-shape` · `verify:reference` · `generate:bundles:check` ·
`bundle-size-snapshot --check` (±5 %, plus CI absolute ceilings — hx is at
21,997 gz against `MAX_HYBRID=24000`) · the Playwright bundle-compatibility
matrix and `quick`/`comprehensive` browser tiers · the shipped-sources and
shipped-examples-execution allowlists · the multilingual `--regression` gate
(eleven signals; **run it locally per §"Running the multilingual --regression
gate locally" in CLAUDE.md before any PR that touches AST shapes**) ·
`check:mapper-parity` in semantic (the buildAST fixture — **regenerate in the
same PR as any AST-shape change**).

## Target design

The end state every arc is checked against. Written as the design a fresh
implementation would choose; the arcs approach it from the current tree.

1. **One AST, a discriminated union.** `ast/nodes.ts` declares every node kind
   once — `readonly` fields, positions, no index signature. Every front-end
   (full parser, hybrid parser, semantic `buildAST`) targets it. Statement
   kinds (`command`, `eventHandler`, `behavior`, `def`, `initBlock`, `block`,
   `sequence`, `program`) and expression kinds are separate unions. Commands
   carry a **per-command typed args struct** (`CommandNode<'toggle'>` has
   `form: 'classes' | 'attribute' | …` and expression slots), not
   `ExpressionNode[]` with prepositions inline.

2. **A command is one module: keyword + parse + compile.** Upstream's model,
   typed:

   ```ts
   export const toggle = defineCommand({
     keyword: 'toggle',
     // Consumes tokens ONCE. Returns the typed node. All syntax decisions
     // (between/and, on/from, as modal, *display, for <duration>) happen here.
     parse(p: CommandParser): ToggleNode { … },
     // Binds ONCE per compiled program. Returns the closure the runtime runs.
     compile(node: ToggleNode, c: Compiler): Op {
       const targets = c.expr(node.target);           // (scope) => unknown
       const classes = node.classes.map(c.expr);
       return async scope => { …; return NORMAL; };
     },
     meta: commandMeta({ … }),                          // unchanged from Arc B
   });
   ```

   `parseInput` no longer exists; what it did at runtime happens in `parse`
   (syntax) or is a closure produced by `compile` (values). The manifest is the
   import list — a command that is not imported does not exist, which is the
   endpoint "derive, don't trust" was aiming at. Bundle tiers are subsets of the
   same definitions with pluggable grammar fragments, the way the Pratt
   fragments already work for expressions.

3. **Compile to closures; execute closures.** `compile(ast, runtime): Program`
   binds every node once. The API's AST cache becomes a Program cache with the
   same key. Block bodies are closures handed to `if`/`repeat`/`tell` at compile
   time, so no command re-enters the runtime through a variable map. The AOT
   compiler becomes a sibling backend of the same compile step.

4. **One control-flow protocol.** A `Completion` value —
   `{ kind: 'normal' | 'halt' | 'exit' | 'break' | 'continue' | 'return', value? }`
   — is what every `Op` returns. No exception-based signals, no string
   messages, no `enableResultPattern`. Hyperscript's `throw` throws a real
   `Error`; that is the only exception, and `catch`/`finally` in handlers and
   `def` see only it.

5. **A small typed `Scope`, not a bag.** `{ me, you, it, event, owner, locals,
   globals }` plus `elementVars(owner)`, with an explicit `child()`. Runtime
   services (`execute`, behaviors, cleanup, the expression table) live on the
   `Runtime` passed to every `Op`. One flag set. No `Proxy`. Context providers,
   if kept, are compile-time expression resolvers.

6. **The engine package has no dependency on `@lokascript/semantic` or
   `@lokascript/i18n`.** The multilingual system is a front-end package that
   depends on core's AST types and registers itself:
   `hyperscript.use(semanticFrontEnd)`. Confidence-based fallback ("try
   semantic, else core parser") lives in the front-end, not inside the core
   parser's command loop. The full bundle still ships both; the engine's own
   test suite runs without the front-end.

7. **Operators are Pratt table entries with `compile`**, the same shape as
   commands. Metadata and LLM documentation move to generated JSON (the
   `commands.json` generator already exists); evaluation tracking is an opt-in
   devtools wrapper, not a `Date.now()` pair on every `is`.

8. **Delete, don't deprecate** the scaffolding in the next major.

9. **Keep the governance.** Manifest audit, output-contract test, ratchets,
   generators with `--check`, the queue docs. Most become type errors.

## Read this before starting anything below

| Arc | Scope                                                              | Size | Gate it leaves behind                                                                       | Needs a major? |
| --- | ------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------------------------- | -------------- |
| 0   | Baselines and ratchets                                             | S    | escape-hatch ratchet, layering ratchet, AST-vocabulary snapshot, hot-path benchmark         | no             |
| 6a  | Delete UNEXPORTED dead code                                        | S    | ghost-import tests per deleted tree                                                          | no             |
| 1   | Engine / front-end boundary — semantic out of the engine           | M    | `no-static-semantic-import` test; en-parse equivalence corpus (semantic-first on vs off)    | no (option kept) |
| 2   | One typed AST                                                      | M–L  | exhaustive `switch` (tsc); `[key: string]: unknown` gone; AST-equivalence corpus byte-identical | no          |
| 3   | Grammar into the parser — `parseInput` → parse-time               | L    | per-command classification audit ratcheting `parseInput` line count to 0; snapshot regen per command | no    |
| 4   | Compile to closures · one control-flow protocol · typed Scope      | L    | control-flow matrix test; Program-cache benchmark; `Scope` shape test                       | no             |
| 7   | Expressions: table entries, docs out of the hot path               | S–M  | expression-table parity vs the switch; bundle-size gate                                     | no             |
| 5   | One parser, tiers as fragment subsets                              | XL, **conditional** | bundle-size ceilings; Playwright matrix; parser-template-drift retires                  | no             |
| 6b  | Delete EXPORTED dead code                                          | S    | CHANGELOG BREAKING entry; ghost tests from 6a                                                | **yes (4.0)**  |

**Order: 0 → 6a → 1 → 2 → 3 → 4 → 7 → 5 → 6b.** Dependencies: 2 needs 1
(otherwise the union has to type the semantic front-end's shapes too); 3 needs
2 (per-command nodes are union members); 4 needs 3 for the commands it binds
but 4a (the control-flow protocol) can start after 2; 7 can run in parallel
with 3; 5 needs 3 and 4 and is explicitly conditional on a size spike; 6a can
run any time and shrinks what 2 has to type, so it goes early; 6b waits for 4.0
(3.0.0 shipped 2026-08-30 — the deletions are the first entries on the 4.0
list, not a reason to cut a major).

**Every arc starts with a `HANDOFF-engine-<topic>.md` brief** that re-measures
the rows below on the then-current tree. Three of the six command arcs found a
plan claim false on measurement; assume the same rate here.

## The arcs

### Arc 0 — Baselines and ratchets (small, first)

Nothing below is safe to start without a way to see it regress. Four gates,
each a zero-dependency script or a vitest file, each recording today's number
and failing on increase:

1. **Type-escape ratchet** — `check:type-escapes`: per-directory counts of
   `: any`, `as any`, `as Record<string, unknown>`, `as unknown as` in non-test
   `packages/core/src`, committed as `baselines/type-escapes.json`; fails when
   any directory's count rises. Arcs 2–4 drive it down; the baseline is
   regenerated in the same PR that lowers it (shrink-only, like the kept-rows
   ratchet was).
2. **Layering ratchet** — `check:layering`: the import-direction matrix
   between `parser/`, `runtime/`, `commands/`, `expressions/`, `ast/` (new),
   `api/`, `compatibility/`. Today's violations are recorded as an allowlist
   with a reason each; a new edge fails; removing an edge requires removing its
   allowlist row. Target matrix (end of Arc 4): `ast ← parser ← commands ←
   runtime ← api ← compatibility`, expressions beside commands, nothing pointing
   left-to-right.
3. **AST-vocabulary snapshot** — a test that parses a corpus (the gallery, the
   shipped sources, the en column of the pattern corpus, and every
   `parser/__tests__` input) with each producer and pins the SET of `type:`
   literals seen per producer. Arc 2 collapses the set; Arc 3 renames per
   command under review. A stray kind appearing is a failure.
4. **Hot-path benchmark** — `bench:ci` already exists and uploads nightly; add
   a row that compiles once and executes `toggle .active on #x then put 'a'
   into #y` N times through `hyperscript.execute`, so Arc 4b's "bind once"
   claim is a number, not an adjective. Record today's figure in the arc brief.

Also in this arc: **an AST-equivalence corpus** (`parse(x)` deep-equal before
/ after, for every input in gate 3's corpus), used by Arcs 1 and 2 as a
byte-identical refactor gate and by Arc 3 as a per-command reviewed diff.

### Arc 6a — Delete unexported dead code (small, any time, before Arc 2)

Delete what nothing imports and nothing exports, so Arc 2 does not type it:

- `src/context/` (excluded from both tsconfigs already — the deletion changes
  no compiled output).
- `src/experimental/`.
- `src/registry/examples/` — 0 non-test downstream importers (measured 2026-08-30; the only hits are `dist/` artifacts). `src/registry/multilingual/` is the same shape, but Arc 1 may claim it as front-end code — decide there before deleting here.
- ~~`parser/types.ts`'s PascalCase node kinds~~ — **measured false, 2026-08-30.**
  Stripping the block makes `tsc` fail: `parser.ts` imports `ParseError` from
  it, and `__test-utils__/parser-helpers.ts` imports `CommandNode`, `ASTNode`
  and `ParseError`. So the engine's own parser holds one `ParseError` while
  everything else uses `types/base-types`'s — a real finding, and **Arc 2's**
  problem (two definitions to collapse) rather than a deletion.
- The three zero-implementer command interfaces (`CommandImplementation`,
  `BaseCommandImplementation`, `TypedCommandImplementation`) — after a ghost
  test proves 0 `implements` and 0 type-position uses outside `types/`.
- `lightweight-validators` consumers in `types/*`: `BaseContextInputSchema`
  and friends are `any`-typed by their own comment
  (`context-types.ts:238`); delete the schemas, keep the interfaces.

Step 1 is a ghost test per tree (`no module outside <tree> imports <tree>`);
step 2 deletes; each deletion is its own PR. Tag the tree
`archived/engine-scaffolding-2026h2` before the first deletion, per the
`archived/peripheral-2026h1` precedent.

### Arc 1 — Engine / front-end boundary (medium)

The semantic package becomes a front-end the engine does not know about.
The seam is already there; the arc is about the one call site that ignores it
and the parser loop that assumes it.

1. **Audit-as-gate**: `no-static-semantic-import.test.ts` — asserts the set of
   `packages/core/src` files that statically import `@lokascript/semantic` or
   `@lokascript/intent` equals an allowlist (today: the API, the interchange
   converter, the bridge's constant, and the three multilingual bundle
   entries). Ratchets to `compatibility/browser-bundle*.ts` +
   `multilingual/` only. Also unify the duplicated
   `DEFAULT_CONFIDENCE_THRESHOLD` (core's `semantic-integration.ts:146` is
   the survivor; the bridge imports it from there).
2. **`hyperscript-api.ts` stops importing semantic.** `getSemanticAnalyzer()`
   reads an analyzer that a front-end registered: `hyperscript.use({ name,
   analyzer: createSemanticAdapter({ parse, isRegistered, registered, buildAST
   }) })`. `config.semantic` keeps its meaning (use a registered front-end if
   one exists). `compileAsync`'s non-en branch delegates to the registered
   front-end's `parseToAST` (today `SemanticGrammarBridge.parseToASTWithDetails`);
   with no front-end registered it returns the same "no analyzer" result the
   traditional-only path returns today. The multilingual bundles call `use()`
   at boot, so **their behaviour is unchanged**; `minimal`/`standard`/`classic`
   never loaded semantic and are unchanged; the library entry (`index.ts`) stops
   pulling semantic into every Node consumer — measure the `dist/index.mjs`
   size change and record it.
3. **Move `SemanticGrammarBridge` and `MultilingualHyperscript`** (`src/multilingual/`)
   out of the engine's dependency graph: they stay published at
   `@hyperfixi/core/multilingual` (testing-framework depends on that path) but
   become the front-end module — the thing that calls `use()` — and the only
   core module allowed to import semantic. Whether they physically move to a
   new package is a later decision; the import edge is what this arc removes.
4. **`ast-utils/interchange/from-core.ts`** takes its role inferrer by
   injection (`fromCoreAST(node, { inferRoles })`); the schema-driven default
   moves to the multilingual module. Consumers: `mcp-server/lsp-bridge`,
   `language-server/server.ts`, `aot-compiler/core-parser-adapter.ts` — each
   already depends on semantic and passes the default.
5. **Measure semantic-first for English.** — ✅ **DONE 2026-08-30, and none of
   the three anticipated outcomes was the answer.** Measured over the 233-source
   corpus: **same 107 · differ 105 · traditional-only 2 · semantic-only 2 ·
   both-fail 17.** Semantic-first produces a *materially different* English AST
   for **105 of the 214** sources both paths parse — different node kinds
   (`contextReference` vs `identifier`), an added `semanticRoles` field, zeroed
   positions, an injected implicit `me` target, and prepositions kept out of
   `args` rather than left in them. So step 6 is **not** a free deletion, and
   the plan's original framing below understated it badly.

   Two concrete findings, each recorded where it belongs:

   - **A live shipped bug, found and FIXED** (filed in `PARSER_NEXT_STEPS.md`):
     `hyperscript.compileSync('on click log 1 and 2')` FAILS in the default
     configuration (`Unexpected token: 2`) while `{ traditional: true }`
     parses it. Any `and` in the arguments of a command absent from the
     27-entry `skipSemanticParsing` list, inside a handler. The semantic match
     consumes a prefix, `skipToCommandBoundary()` stops at the `and`, and the
     rest re-parses as a fresh command. **Fixed the same day, and by neither of the fixes first proposed**: `and` had no business in that boundary list at all — it is not a command separator anywhere in this engine, a fact `then-as-separator.test.ts` already pins. The analyzer had been reporting `tokensConsumed: 4` at confidence 1 the whole time. One word deleted; 14-assertion gate, mutation-verified; the multilingual `--regression` gate run locally with no regression and confidence UP in several languages. It stays step 6's motivating case: step 6 removes the resync heuristic entirely rather than tuning its keyword list.
   - **Semantic-first is better on two rows and worse on two.** It rescues
     `render … with (…)` (two of the fifteen parser gaps filed from Arc 0) and
     breaks `log [1, 2] and {a: 1}` plus `log 5 is between 1 and 10`.

   The 105 differing rows are the real cost of step 6 and must be reviewed as a
   diff, not asserted as a refactor. The original three-outcome framing is kept
   below for the record.

   > Superseded framing: three outcomes, each with its own step 6:
   - **identical** → step 6 deletes the in-loop attempt and the
     `skipSemanticParsing` list outright;
   - **differs only where the core parser is worse** (semantic parses en
     syntax the core parser rejects) → those are core-parser defects; file
     them in `PARSER_NEXT_STEPS.md`, fix them, then delete;
   - **differs where semantic is worse** → those rows are already the reason
     the skip list exists; they become test cases for the deletion PR.
6. **Delete `trySemanticParse` / `skipToCommandBoundary` /
   `skipSemanticParsing` from `parseCommandCore`.** Fallback for a non-en
   program is whole-program: the front-end tries `parseToAST`; if it fails, it
   renders to English and the core parser parses the English. That is what
   `compileAsync` already does (`fallbackText`); this step makes it the ONLY
   path. The `SemanticAnalyzer` interface and `semantic-integration.ts` shrink
   to the adapter the front-end registers.

Gates: step 1's test; the AST-equivalence corpus (steps 2–4 must be
byte-identical; step 6 must be identical or reviewed per row); bundle-size
snapshot (`hyperfixi.js`, `-multilingual.js`, `-semantic-complete.js`
unchanged; `minimal`/`standard`/`classic` unchanged); the multilingual
`--regression` gate — its 3,744 rows execute exactly the path step 6 rewrites,
so run it locally before the PR, not in CI first.

Blast radius: `createSemanticAdapter` (no downstream importer; the signature is kept anyway because the multilingual bundles call it); `config.semantic` (public, kept); `compile().meta.parser`
values (`'semantic' | 'traditional' | 'lse'`, kept — step 6 makes `'semantic'`
mean "the front-end produced the AST" rather than "the analyzer was consulted").

### Arc 2 — One typed AST (medium-large)

A types-only arc. Runtime behaviour is byte-identical; the AST-equivalence
corpus is the gate and it must not move. The escape-hatch ratchet is the
progress meter.

1. **Classify the strays.** From Arc 0's vocabulary snapshot, every emitted
   kind is one of: canonical · alias-of (`CommandSequence` = `sequence`,
   `Command` = `command`, `functionCall` = `callExpression`) · producer-local
   (`object`/`keyword` in command-parsers) · dead (`dollarExpression`,
   `contextVariable`, `idSelector`, `expression` — verify each). Aliases are
   normalised at the producer, not accepted by the consumer; dead kinds are
   deleted with the code that emits them. A test pins the classification.
2. **`ast/nodes.ts`.** The union. Start from `parser/parser-types.ts` (already
   camelCase, already matches the emitted names, already per-kind interfaces
   for 20 kinds) and the interchange union's structure. Keep the emitted
   camelCase names — 61 files import by them and renaming buys nothing.
   Expression and statement unions are separate; `Node = Expr | Stmt`.
   Positions are a required `{ start, end, line, column }` (the parser always
   sets them; the type just stops saying it might not).
3. **`evaluateAST` becomes exhaustive.** `switch (node.type)` over `Expr` with
   a `never` default; the local `type X = ASTNode & {…}` block
   (`parser/runtime.ts:63-135`) is deleted; each `evaluate*` helper takes its
   union member. Plugin-registered kinds are a declared `PluginNode` member
   whose payload is `unknown` — the registry stays, typed.
4. **Collapse the definitions.** `types/base-types.ASTNode` → `Node`
   (re-exported under the old name for one release with `@deprecated`);
   `types/core`, `types/unified-types`, `types/index` re-export; `ast-utils/types.ts`'s
   duck-typed `ASTNode` becomes `Node` (the visitor/query/transformer modules
   are the second-largest `any` cluster and go on the ratchet); the hybrid
   parser's `ast-types.ts` is left alone here — it is a separate producer and
   Arc 5 decides its fate — but the `case 'event'`/`case 'sequence'` adapter in
   `runtime-base.ts` is typed as a converter from `HybridNode` to `Stmt`.
5. **Commands stop casting.** `ast/guards.ts` (`isIdentifier`, `isSelector`,
   `isLiteral`, …) replaces `(arg as Record<string, unknown>).name === 'x'`
   one file at a time, ratcheted. This is mechanical and boring and it is where
   most of the 1,152 hatches live.
6. **Remove the index signature.** `[key: string]: unknown` comes off `Node`
   last. The compile errors that appear are the burn-down list; the arc is done
   when `tsc` is clean without it.

Gates: `tsc` (the exhaustive switch and the removed index signature ARE the
gate); the AST-equivalence corpus; the vocabulary snapshot; the escape ratchet
(monotone down); every existing suite.

Blast radius: `ASTNode` is exported from `index.ts` and used downstream as a
type (vite-plugin, developer-tools). Keep the alias for a release. The hybrid
`ast-types` subpath export is unchanged.

### Arc 3 — Grammar into the parser (large; one PR per command)

The core of the migration. Each command's `parseInput` is split: syntax
decisions move into that command's parser; value work stays as expression
slots the runtime evaluates. At the end of the arc `parseInput` receives a
typed node and does nothing but evaluate slots — which is what Arc 4 turns into `compile`.

> **Argue this arc on maintainability, not speed.** Arc 0 step 4 measured the
> per-execution `parseInput` cost directly: `toggle` (242-line `parseInput`)
> against `add` (66), doing comparable DOM work, came out at **1.03-1.05x —
> noise**, because most of those 242 lines are branches a given call never
> enters. The win is that the grammar stops being re-derived at runtime in ~50
> hand-written places, not that pages get faster. Re-measure after the first few
> commands land; do not promise a speedup.

1. **Audit-as-gate.** For each of the 51 `parseInput`s, a table (in a test)
   classifying every branch as **S** (syntax discrimination — `between`,
   prepositions, `as modal`, `*display`, `for <duration>`), **V** (value
   evaluation — targets, durations, URLs), or **A** (absorbing the semantic
   front-end's shapes — dies with Arc 1 step 6). The test pins the
   `parseInput` line count per command and fails on increase; the arc ratchets
   it to zero.
2. **Per-command typed nodes.** `ToggleNode` is `ToggleCommandInput` with
   `HTMLElement[]` replaced by `Expr` slots and `duration: number` by `Expr`.
   The existing input unions (46 files already have one) are the shapes —
   this step is moving them one layer up. The dedicated parser
   (`parseToggleCommand` in `command-parsers/dom-commands.ts`) emits the node;
   `CommandNode` becomes `CommandNode<K extends CommandName>` with a per-K
   `args` type, and `command-node-builder.ts` builds it.
3. **Migration order = the `parseInput` size table above**, largest first:
   toggle, swap, put, repeat, set, pick, pseudo-command, process, take, add,
   trigger, remove, install, transition, default, if, measure, clear, js,
   render, then the tail. Largest-first because the big ones are where the
   syntax lives and the small ones mostly get their `parseInput` deleted as a
   side effect of step 4. Each command: (a) extend/author its parser to emit
   the typed node, (b) shrink `parseInput` to slot evaluation, (c) regenerate
   that command's rows in the AST snapshot **under review** — this arc changes
   AST shapes on purpose, so its snapshot diff is the review artifact, not a
   red gate — (d) update semantic's `buildAST` mapper for the command and
   regenerate `check:mapper-parity`'s fixture in the same PR (cross-package,
   same PR: a split lands one half green and the other broken).
4. **The 28 generic-loop commands** get a declared grammar instead of the
   loop. **Decision to record in the brief:** (a) a core-local arg spec per
   command module (`args: [{ slot: 'value', kind: 'expr' }, { marker: 'to',
   slot: 'target' }]`) consumed by ONE generic parser, or (b) reuse
   `@lokascript/semantic`'s per-command schemas via `@lokascript/intent`.
   **Recommendation: (a)** — the schema is the front-end's description of the
   command and the engine must not import it (Arc 1), but a parity test
   asserts (a) and (b) produce the same typed node on the en corpus, the way
   `check:mapper-parity` already pins the mappers. Two sources with a gate
   beat one source across a boundary the plan is trying to draw.
5. **Delete the mechanism.** `continuationKeywords`, the generic argument
   loop, `KEYWORD_PREPOSITIONS`, `filterPrepositions`, `fallbackModifierKey`,
   `resolveTargetsFromArgs`'s AST-walking half — each when its caller count
   reaches zero (a test per list, ratcheted). `COMPOUND_COMMANDS` becomes "all
   commands" and is deleted with `isCompoundCommand`.

Gates: the classification audit (ratchet to 0); `command-output-contract`
(both paths — until Arc 4 deletes one); `compound-command-coverage`;
`selector-shape`; the R2 execution subset and the shipped-examples-execution
allowlist (their keys embed source hashes, so a behaviour change here is
visible); the multilingual `--regression` gate (every PR, locally); the
vocabulary snapshot (per-command kinds appear under review).

Blast radius: semantic's mappers (cross-package PR pairs, ~50 of them);
`hybridParser` and the generated `HYBRID_PARSER_TEMPLATE` keep emitting the
OLD shape until Arc 5 — the `runtime-base.ts` adapter converts; the
`ast-utils` visitor/query/transformer see per-command `args` (they already
duck-type `args`, so they keep working — add a test that they do); LSP
completions and `reference/index.ts` are metadata, untouched.

### Arc 4 — Compile to closures · one control-flow protocol · typed Scope (large)

Three sub-arcs, sequenced 4a → 4b → 4c. 4a can start as soon as Arc 2 lands;
4b needs the commands Arc 3 has migrated (it binds them) and wraps the rest
behind the strangler adapter; 4c needs 4b.

**4a — `Completion`.** Define the type in `types/result.ts` (the
`ExecutionSignal` union is already it, minus `normal`). Commands return it;
`halt.ts`/`exit.ts` stop throwing; `signalToError`, `toSignal`,
`isControlFlowError`'s message-string branches, the dynamic
`error['is' + Type] = true`, and `enableResultPattern` with its exception
path are deleted (no test sets it `false`; one references it). Step 1 is the
**control-flow matrix test**: `{halt, exit, break, continue, return <v>}` ×
`{top-level, inside if, inside repeat, inside tell, inside def, inside a
handler with catch, with finally}` — 35 rows pinning today's observable
behaviour (which is the spec; upstream parity where they disagree is a
separate decision, filed not fixed). Step 2 migrates; step 3 deletes.
`throw` becomes the only exception and the `catch`/`finally` paths in
`installFunction` and `executeEventHandler` are re-derived against the matrix.

**4b — `compile`.** `compile(ast, runtime): Program`, with `Program.run(scope)`.
`CommandAdapterV2` becomes the strangler seam: a command with a legacy
`parseInput` gets `compile = node => async scope => execute(await
parseInput(node, evaluator, scope), scope)` — per-execution, exactly today's
behaviour — and a migrated command's `compile` binds once. The API's
`ASTCache` becomes a Program cache with the same key (`lang\0trad\0code`). The
`_runtimeExecute` channel is replaced by `compile` handing block-body `Op`s to
`if`/`repeat`/`tell`/`start-view-transition` (four commands).

Gate: `command-output-contract` collapses to one path. **Not** "Arc 0's
benchmark improves" — step 4 measured that the `ASTCache` already makes
warm-path compilation free (`compile + execute` ≈ `execute only`, within
noise), so binding once buys nothing on the parse side, and the per-execution
`parseInput` cost it would remove measured as noise too. Treat the benchmark as
a REGRESSION guard here — closures must not make execution slower — and take
the arc's justification from what it DELETES: the `ContextBridge` per-command
copy, the `_runtimeExecute` channel, and the dual execution paths.

**4c — `Scope`.** Replace `ExecutionContext` with the typed `Scope` from the
target design: `ContextBridge.toTyped/fromTyped` and the per-command copy are deleted (the typed extras have no reader outside `trackEvaluation`, which Arc 7 makes opt-in); the three flag sets collapse to none (control
flow is `Completion` now); `enhanceContext`'s `Proxy` is deleted after step 1
measures that no production caller registers a context provider (2026-08-30:
none outside `src/registry/`) — the `ContextProviderRegistry` API stays as a
compile-time resolver for server-integration if that package needs it, or is
deleted with it. `parser/extensions.ts`'s global read/write hooks (the
reactivity plugin's dependency tracking) move to `Runtime` — plugins get them
through `HyperfixiPluginContext.runtime`, which they already receive. Gate: a
`scope-shape.test.ts` pinning the interface; the escape ratchet; the layering
ratchet (this is the arc that removes `expressions → parser/extensions` and
`commands → parser/extensions`).

Blast radius: `ExecutionContext` is exported and used downstream as a type
(reactivity, realtime, components). Keep it as an alias of `Scope` for one
release. `createContext`/`createChildContext`/`ensureContext` keep their
names. `HyperfixiPluginContext` gains `runtime.globals` hooks; nothing is
removed from it.

### Arc 7 — Expressions: table entries, docs out of the hot path (small-medium)

Runs in parallel with Arc 3.

1. **Measure**: bundle-size delta of removing the per-expression `metadata` /
   `documentation` / `inputSchema` objects from the seven category modules
   (`logical/index.ts` is 1,033 lines; the executable core is a few dozen).
   Who reads them at runtime? (2026-08-30 guess: `command-pattern-validator`
   and the LSP data generators — verify.)
2. **Move docs to generated JSON** beside `commands.json`, produced by the same
   generator with the same `--check` gate. The runtime objects keep `name`,
   `evaluate`, `precedence`, `operators`.
3. **`trackEvaluation` becomes opt-in**: a devtools wrapper installed by
   `DebugController`, not a `Date.now()` pair on every comparison.
4. **Operators as table entries with `compile`.** `evaluateBinaryExpression`
   switches on the operator string and then calls `getExpr('equals')` — the
   registry is indirection over a switch that already knows the answer. Fold
   the switch INTO the Pratt entries (`{ token, bp, compile }`) so grammar and
   semantics sit together as they do for commands after Arc 3. The
   `ExpressionRegistry` on the scope goes away; tree-shaking is by fragment
   import, which is how the Pratt fragments already shake.

Gates: the bundle-size snapshot in both directions (a large drop trips the
±5 % gate and must be recorded, as #821 was); the expression parity corpus
(every `parser/__tests__` and `expressions/**/__tests__` input, before/after).

### Arc 5 — One parser, tiers as fragment subsets (extra-large, conditional)

The hybrid and lite tiers exist because the full parser is ~70 KB gz and a
static page wants 2–11 KB. After Arc 3 a command module carries its own
grammar, so a tier can be "these modules' `parse` fragments + the core
statement grammar" instead of a second parser. Whether that hits the ceilings
is an empirical question, so this arc **starts with a spike and has an
explicit stop**:

1. **Spike**: build `hybrid-complete` from full-parser fragments for its 38
   commands; measure gz against `MAX_HYBRID=24000` and today's 11.1 KB /
   21,997 (hx). If the fragment build cannot get within the ceilings, **stop
   here**: the hybrid parser stays as a second producer of the typed AST (Arc
   2 already types it), Arc E's generator keeps it in sync, and this arc closes
   as "measured, not worth it" — a record, like the mini-morph parking.
2. If it fits: the hybrid `cmdMap` becomes a fragment selection;
   `HYBRID_PARSER_TEMPLATE`, `parser-template-drift.test.ts`, and the executor
   template regions from Arc E retire (the executor IS the command modules'
   `compile`).
3. The regex lite family stays hand-written by design — it has no AST and no
   canonical twin — exactly as Arc E recorded.

Gates: bundle-size ceilings; the Playwright bundle-compatibility matrix;
`generate:bundles:check` until it retires.

### Arc 6b — Delete exported dead code (small, needs 4.0)

The `@deprecated` exports: the six `features/` families from `index.ts`,
`Lexer`/`Tokens` and root `tokenizer.ts`, the `unified-types` `Validator`
class, `types.d.ts`'s `any` module declarations (replaced by real types from
i18n's own `.d.ts`), and — if Arc 1 moved them — the `registry/multilingual`
subpath. Each has a ghost test from 6a proving no internal consumer; the PR is
the deletion plus a CHANGELOG `⚠ BREAKING` entry per removed name, in the
3.0.0 format. Land as the first PRs of the 4.0 cycle, not the last.

## Non-goals

- **No hyperscript-language changes.** Every arc preserves observable
  behaviour or changes it under a named gate with a reviewed diff. Upstream
  parity gaps found along the way are filed in `PARSER_NEXT_STEPS.md`, not
  fixed here.
- **No bundle removed, no entry point removed** before 4.0, and then only
  those in 6b. The 23 rollup configs are the shape of the product; Arc 5 may
  make some of them thinner, not fewer.
- **No multilingual work** beyond keeping the buildAST mappers and their parity
  fixture in step with Arc 3. The front-end's quality queue stays in
  `MULTILINGUAL_NEXT_STEPS.md`.
- **No new engine beside the old one.** If an arc's brief finds that a step
  needs a parallel implementation to land safely, that is a finding to record
  and a reason to re-sequence, not a licence to fork.

## Risks and measured unknowns

1. **Arc 1 step 5 may find semantic-first is load-bearing for English.** The
   skip list records where semantic is *worse*; the inverse — en syntax the
   core parser rejects and semantic rescues — has never been measured. The
   step is written as a measurement with three outcomes for this reason.
2. **Arc 3 is ~50 cross-package PR pairs.** Each command's typed node changes
   what semantic's mapper must emit. The mapper-parity fixture makes a split
   landing loud, but the coordination cost is real; the brief should batch by
   category (dom, data, control-flow) where mappers share structure.
3. **Arc 4a re-derives `catch`/`finally`.** Handler and `def` error paths were
   fixed against upstream in #768 and share one shape; the control-flow matrix
   must pin them BEFORE the protocol changes, or the arc will quietly re-open
   what #768 closed.
4. **Arc 5 may not fit the ceilings.** Hence the spike-and-stop; the arc is
   allowed to close as "no."
5. **`Parser` is imported by 17 downstream files** (all in i18n). Its constructor
   signature `(tokens, options, originalInput)` and `parse()` are kept through
   every arc; only what it emits changes, under Arc 2/3's gates.
6. **Two of the three DOM processors will move.** `api/dom-processor.ts` and
   `dom/attribute-processor.ts` both wire `compileSync` + runtime; Arc 4b's
   Program cache is the natural moment to collapse them, but it is not in any
   arc's scope above — file it as a 4b follow-up when 4b's brief is written,
   and decide there.

## History

- **2026-08-30** — plan written from the whole-engine review on `e3b3e34a`.
  Baseline 7,972 / 106 / 312.
- **2026-08-30** — **Arc 0 step 1** (type-escape ratchet) landed.
  `scripts/check-type-escapes.cjs` + `packages/core/baselines/type-escapes.json`,
  wired into CI's `lint-typecheck` and the pre-commit hook, with 21 self-tests
  and a mutation check (adding one `as any` to `dom/attribute-processor.ts`
  reddens it). **Measured baseline: 1,285 escapes across 27 directories** —
  worst are `commands` 235, `features` 238, `parser` 163, `ast-utils` 157,
  `compatibility` 161. That number is deliberately NOT the plan's 1,152: the
  script strips comments and string contents (which lowers it) and counts
  type-argument `any` — `Map<string, any>`, 144 occurrences — which the four
  grep patterns structurally cannot see (no colon). Leaving that pattern out
  would have made the ratchet dodgeable by writing the hatch in a generic.
- **2026-08-30** — **Arc 0 step 2** (layering ratchet) landed.
  `scripts/check-layering.cjs` + `packages/core/baselines/layering.json`, same
  wiring and 25 self-tests. Every `packages/core/src` unit now carries a layer
  (an unclassified one is a hard failure, so a new directory must be placed
  deliberately); root modules are layered individually, because lumping
  `version.ts` in with `index.ts` turned eleven leaf imports into a phantom
  `compatibility -> .` violation.

  **Measured: 893 conforming imports, 14 upward edges, 38 upward imports —
  but only 22 of those are VALUE imports.** The type/value split was added
  after measuring, and it reorders the debt: the biggest edge,
  `types -> validation` (10), is mostly `import type`, while
  `parser -> expressions` (5, all value) is the real one. Ten of the fourteen
  edges are barrel `export type` rows that erase at build time.

  Two findings the measurement produced, both recorded in the baseline's
  per-edge reasons:

  - **`parser/runtime.ts` is not a parser.** It is the 1,967-line canonical
    evaluator filed under `parser/`, and it alone accounts for all five
    `parser -> expressions` imports plus two of the three `parser -> commands`
    — **7 of the 22 value edges move with one file**.
  - **`parser/regex-parser.ts` imports the lite BUNDLE it is a component of**
    (`compatibility/browser-bundle-lite`), inverting the whole stack in one
    line. The single most backwards edge in the graph; Arc 5 repairs it.
- **2026-08-30** — **Arc 0 step 4** (hot-path benchmark) landed, and it
  **falsified the performance framing of two later arcs**.
  `bench/hot-path.bench.ts` is the first benchmark here that compiles OUTSIDE
  the measured body; every row in `execution.bench.ts` calls `compile()` inside
  it, so nothing had ever measured execution alone.

  - **`compile + execute` and `execute only` are within noise (1.00-1.06x
    across runs).** `compile()` on a repeated source is an `ASTCache` hit — a
    Map lookup — so both rows were really measuring execution. **On the warm
    path the engine already pays no parse cost**, so Arc 4b's win cannot come
    from "compile once" in the parsing sense. It has to come from the runtime
    side: `parseInput` running per execution.
  - **`parseInput` SIZE does not predict execution cost: 1.03-1.05x** between
    `toggle` (242-line `parseInput`, the largest in the set) and `add` (66),
    doing comparable DOM work. Most of those 242 lines are branches a given
    call never enters. **Arc 3's case is maintainability, not speed, and should
    be argued that way** — noted on the arc itself.

  One measurement artifact worth recording because it nearly shipped: the
  contrast row was originally `log`, which writes to stdout, and the I/O
  dominated so completely that the "cheap" command benchmarked **9.6x slower**
  than the expensive one.
- **2026-08-30** — **Arc 6a** (delete unexported dead code) landed.
  **5,801 lines gone**, every deletion measured rather than assumed:
  `src/context/` (2,543 — excluded from all THREE tsconfigs, so it had not
  compiled in any configuration for as long as those excludes existed),
  `src/experimental/` (2,696), and seven dead interfaces (144) —
  `CommandImplementation`, `BaseCommandImplementation`, `LegacyValidationResult`,
  `FeatureImplementation`, `Runtime`, `HyperscriptConfig` from `types/core.ts`
  plus `TypedCommandImplementation` from `command-types.ts`. Zero implementers,
  zero type-position references, none in the public export surface — so no
  major was needed. `Runtime` and `HyperscriptConfig` each had a LIVE namesake
  elsewhere; it was the `types/core.ts` declarations that were dead.

  **Two documentation claims that were already false** went with them: both
  CLAUDE.md files said "all commands use `CommandImplementation<TInput, TOutput,
  TypedExecutionContext>`". They never did — they implement `DecoratedCommand` —
  and the named interface had zero implementers. The core one also still
  documented the `@meta` decorator that Arc B deleted in #827.

  **The plan's own list was wrong about one item**, caught by testing rather
  than trusting: see the struck-through `parser/types.ts` row in Arc 6a above.
  `registry/examples/` also stays — its only reference is inside a
  documentation template literal, and Arc 1 may claim that tree as front-end
  code.

  Ratchets regenerated: type escapes **1,285 → 1,231**, layering conforming
  imports 893 → 873, all 14 upward edges and their reasons intact. Suite
  7,972 → **7,915** passing (the 57 were the deleted trees' own tests).
- **2026-08-30** — **Arc 0 steps 3 and 5** (AST-vocabulary snapshot +
  equivalence corpus) landed together, because both read one corpus and
  splitting them would have duplicated it.
  `packages/core/src/parser/__tests__/engine-corpus.ts` derives the corpus from
  every registered command's `metadata.examples` plus 28 hand-written feature
  sources (no command example is a handler, a behavior or a `def`, so the whole
  statement half of the AST would otherwise sit outside both gates).
  **233 sources, 218 unique.**

  Three findings, each now pinned:

  - **The two in-core producers share only FOUR spellings** — `command`,
    `identifier`, `literal`, `selector`. Everything else that both emit they
    spell differently (`binaryExpression`/`binary`, `memberExpression`/`member`,
    `eventHandler`/`event`, `possessiveExpression`/`possessive`,
    `callExpression`/`call`, `arrayLiteral`/`array`, `objectLiteral`/`object`) —
    seven rename pairs, which is exactly why `runtime-base.ts` needs its
    `case 'event'` / `case 'sequence'` adapter arms.
  - **`Program`/`CommandSequence` are the only PascalCase kinds**, each with a
    camelCase twin the evaluator also accepts; and the full parser emits both
    `callExpression` and `functionCall` for one concept. `functionCall` is
    emitted only by `parseTriggerCommand` and read only by `trigger.ts`'s
    `parseInput` — command-local, never evaluated, and precisely the thing Arc 3
    turns into a typed per-command node.
  - **19 documented command examples do not parse** (18 unique sources). Four
    are documentation defects (`repeat … { … }` — hyperscript has never had
    C-style block braces); the other fifteen are parser gaps in syntax the
    command's own metadata advertises, including `install Draggable on #box`,
    `settle for 3000`, `tell closest <form/> submit` and all four
    `pseudo-command` forms. **These belong in `PARSER_NEXT_STEPS.md`** and are
    pinned here in both directions meanwhile, because the vocabulary snapshot is
    built from the sources that parse — so an example silently starting or
    stopping to parse would move the vocabulary underneath it.

  The equivalence gate records a hash of each source's canonicalized parse
  (keys sorted, `undefined` dropped, so mechanical edits do not cry wolf).
  Mutation-verified in both directions: a comment-only parser edit moves
  nothing, flipping `CommandNodeBuilder`'s `isBlocking` default moves **134**
  fingerprints. Arcs 1 and 2 must leave this file untouched; Arc 3 regenerates
  it per command and the diff is the review artifact.

  Also fixed in passing: `__tests__` helper files were emitting `.d.ts` into the
  published `dist/` (`add-standalone-helpers.d.ts` had been shipping). Excluded
  from `tsconfig.build.json`.
- **2026-08-30** — **Arc 1 step 1** (the boundary audit-as-gate) landed.
  `scripts/check-semantic-boundary.cjs` records every `packages/core/src` file
  importing `@lokascript/semantic`, `/intent` or `/i18n`, **per file and per
  import KIND**, ratcheting each kind down independently.

  **Measured: 9 files — 8 static-value, 3 dynamic, 2 static-type, 2
  typeof-import.** The kind split is the finding, and it reorders the debt:
  only `static-value` is an eager bundled dependency; `static-type` and
  `typeof-import` erase at build time and `dynamic` already defers. So
  `multilingual/bridge.ts`, with the most rows of any file (4), is nearly
  target-shape already, while `api/hyperscript-api.ts`'s single static import
  is the one that pulls the semantic stack into every Node consumer.

  Two corrections the measurement forced:

  - The Verified-state section above says "five load-bearing static imports".
    It is **eight** — and a first, comment-blind count said **thirteen**,
    because five of those were example `import` lines inside docblocks. This
    gate strips comments but KEEPS string contents (the specifier IS a string),
    the mirror image of what the type-escape ratchet needs, which is why it
    carries its own stripper.
  - **Four of the nine rows are target-state and terminal**, not debt — the
    three multilingual browser bundles and the classic-i18n bundle import the
    front-end because that is what those bundles ARE. Recorded as such, so the
    list is not later read as nine things to fix.

  Step 1's other half also landed: `DEFAULT_CONFIDENCE_THRESHOLD` was defined
  identically (0.5) in both `parser/semantic-integration.ts` and
  `@lokascript/semantic`, and `multilingual/bridge.ts` imported the front-end's.
  It now imports core's — this is the engine deciding when to trust a
  front-end's parse, so the policy belongs on the engine side.
  **static-value 8 → 7.**

  A separate assertion guards the property most worth keeping, which is already
  TRUE: `parser/`, `runtime/`, `commands/`, `expressions/`, `types/` and `core/`
  import the front-end **nowhere**. The coupling is confined to the api, the
  bundles and the multilingual module — so Arc 1's remaining steps are a handful
  of files, not a sweep.

  **Arc 1 step 5 ran in the same session and revised the arc.** Measured over
  the 233-source corpus, semantic-first vs traditional for English:
  **same 107 · differ 105 · traditional-only 2 · semantic-only 2 · both-fail
  17.** None of step 5's three anticipated outcomes was the answer — the two
  paths produce materially different English ASTs for **half the corpus**, so
  step 6 is a reviewed behavioural change, not a deletion. It also surfaced a
  **live shipped bug** (`on click log 1 and 2` fails in the default config),
  filed in `PARSER_NEXT_STEPS.md` and now step 6's motivating case. Detail is
  on the step itself.
