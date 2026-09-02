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
- **`args` is syntax; `semanticRoles` is semantics.** Settled 2026-08-31 by the
  `implicit-me` decision. `args`/`modifiers` record what the AUTHOR WROTE — a
  schema default the matcher materialized (tagged `implicit`, e.g. bare `focus`
  → patient `me`, `increment :x` → quantity `1`) is deliberately absent from
  them, because forging it in makes the AST claim `focus me` was typed when
  `focus` was. `semanticRoles` carries the RESOLVED reading, defaults included,
  and is where a consumer that wants a bare `focus`'s target looks (the
  interchange layer, the Go client, the LSP already read it). The corollary
  matters for every future arc: **a runtime default does not need an AST
  representation.** Duplicating one into the AST obliges every producer — the
  traditional parser, the hybrid template parser, lite, AOT — to inject it too,
  or no consumer can rely on it; core's `implicitTarget` field, with builder
  plumbing and zero readers, is the fossil of the attempt.
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

> **Brief: [HANDOFF-engine-arc1.md](./HANDOFF-engine-arc1.md)** (2026-08-30).
> Steps 1 and 5 are done; it carries the measured state, the open decision step
> 5 surfaced, and the recommended order for the rest. Read it before starting
> step 2, 3, 4 or 6.

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
   — ✅ **DONE 2026-08-30**, with two of its own claims corrected:

   - **The default is not a marginal fallback.** The code comment said it
     covered "scroll, push, replace, process and any future command"; measured
     over the corpus's 214 parsing sources, **43 command names receive roles and
     41 of them come from the default** — only `set` and `go` have explicit
     cases. A consumer that omits the inferrer loses roles for 41 commands, and
     `aot-compiler`'s `command-transforms.ts` reads `node.roles` in two dozen
     places. So the three consumers are wired at their module-load site (one
     binding each, downstream call sites unchanged), the AOT one throws rather
     than degrades, and the LSP two log the degradation.
   - **It does not reduce the static-value count.** The brief said it "removes 2
     of the 7"; the two imports MOVE, from `ast-utils/interchange/from-core.ts`
     to the new `multilingual/schema-roles.ts`. Total stays **7**. That is still
     the progress the arc wants — the ratchet's endpoint is
     `compatibility/browser-bundle*.ts` + `multilingual/` only, and both rows are
     now on the target side — but it is a move, not a deletion, and the baseline
     says so.

   Equivalence was proven rather than assumed: `main`'s converter vs the
   injected one over both parse paths of every corpus source — **430
   comparisons, 0 diffs**.
5. **Measure semantic-first for English.** — ✅ **DONE 2026-08-30, and none of
   the three anticipated outcomes was the answer.** Measured over the 233-source corpus, **and then RE-measured after the `and`
   fix below landed, which moved it**:

   | | same | differ | trad-only | sem-only | both-fail |
   | - | - | - | - | - | - |
   | before the `and` fix | 107 | 105 | **2** | 2 | 17 |
   | after (current `main`) | 107 | **107** | **0** | 2 | 17 |

   The two traditional-only rows WERE the `and` cases; fixing that moved them
   into `differ`. So **semantic-first is now a strict superset in
   parseability** — it parses everything traditional does, plus the two
   `render … with (…)` forms — while still producing a different AST for
   **107 of the 216** sources both paths parse. Re-run this before costing
   step 6; it has already moved once. Semantic-first produces a *materially different* English AST
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
6. ~~**Delete `trySemanticParse` / `skipToCommandBoundary` /
   `skipSemanticParsing` from `parseCommandCore`.**~~ ✅ **DONE 2026-09-02.**
   Fallback for a non-en program is whole-program: the front-end tries
   `parseToAST`; if it fails, it renders to English and the core parser parses
   the English. That is what `compileAsync` already did (`fallbackText`); it is
   now the ONLY path, and English never reaches the front-end at all. ~~The
   `SemanticAnalyzer` interface and `semantic-integration.ts` shrink to the
   adapter the front-end registers.~~ **Measured smaller than that:** nothing
   in the repo consumed `createSemanticAdapter`'s product except the deleted
   in-loop adapter — the plan's "kept anyway because the multilingual bundles
   call it" was false (they never did; they use `@lokascript/semantic` directly
   and the bridge). So `SemanticAnalyzer`, `createSemanticAdapter`,
   `SemanticIntegrationAdapter` (650 lines), `ParserOptions.semanticAnalyzer` /
   `language` / `semanticConfidenceThreshold`, and `types.ts`'s mirror
   `SemanticAnalyzerInterface` are all gone; `semantic-integration.ts` is the
   one number the engine still owns, `DEFAULT_CONFIDENCE_THRESHOLD`, which the
   API now passes to the bridge (`config.confidenceThreshold` had been reaching
   the in-loop path only). Step 2's registration seam is a `parseToAST`-shaped
   front-end, not an analyzer, and will be written fresh.

   What else moved, all measured: `config.semantic` now gates `compileAsync`
   (it had governed only the in-loop attempt); the AST cache key includes it
   (a non-English program compiled with the front-end on and then off was
   served the front-end's AST — found by the new gate); `meta.parser` on an
   English compile is `'traditional'`, always — `'semantic'` now means "the
   front-end PRODUCED this AST", as the plan said it would; the
   `hyperfixi:semantic-parse` event and `semanticDebug` stats are fed from the
   whole-program path, once per non-English compile; `eval-hyperscript.ts`
   routes a non-English script through the API instead of building its own
   analyzer (its `static-value` row is gone: **boundary 7 → 5**);
   `tools/triage-parse-paths.ts` compares the core parser against the bridge's
   direct path with `lang: 'en'`, because comparing `compileSync` against itself
   would have made every row `same` — and on THAT comparison the corpus reads
   `same` 0 · `differ` 202 (86 metadata-only) · `trad-only` 15 · `sem-only` 14
   · `both-fail` 5, `marker-in-args` 51, not the detour's 140 · 77 · 19 / 13:
   the direct path never had the in-loop adapter's coverage gate or span
   rebasing, so it is a wider gap, and it is the one a multilingual-bundle
   user's English actually crosses. Type-escapes **927 → 922**. Bundles (gz,
   local macOS): `hyperfixi.js` 346,391 → 344,563, `-hx-v4.js` 358,319 →
   356,194, `-multilingual.js` 98,374 → 95,968; `dist/index.mjs` −22 KB.

   Five test files (77 cases) whose whole subject was the deleted path —
   `semantic-integration`, `-delegation`, `toggle-skip-semantic`,
   `semantic-resync-and`, `semantic-adoption-coverage`, `semantic-span` — are
   replaced by `whole-program-fallback.test.ts` (11 cases): the default path
   and `{ traditional: true }` produce byte-identical ASTs over the WHOLE engine
   corpus, `meta.parser`, the `config.semantic` / `traditional` gates, the debug
   stats, and the absolute shapes the retired files pinned. One pre-existing
   test (`scroll-parse`) had recorded the in-loop path's `in`-as-binary shape
   as a convergence difference; it now asserts upstream's shape on both paths.

**The owner decided on 2026-08-30: CONVERGE the two paths first** (step 5's
third option). Steps 2, 3 and 6 stay blocked behind that work, which has its own
brief — **[HANDOFF-parse-path-convergence.md](./HANDOFF-parse-path-convergence.md)**
— and its own committed measurement tool,
`packages/core/tools/triage-parse-paths.ts`. Two findings from that brief's
step 1 belong here because they change THIS plan:

- **The 107 differing sources are not 107 decisions.** They decompose into nine
  families; **45 differ only in metadata** (positions, `semanticRoles`, optional
  field presence) and 62 structurally. Most families are one decision each.
- **Convergence cannot finish without part of Arc 2.** Four of the `node-type`
  transitions (`identifier`↔`contextReference`,
  `memberExpression`/`possessiveExpression`↔`propertyAccess`,
  `command`↔`CommandSequence`) are exactly the alias-of strays Arc 2 step 1
  classifies. **Arc 2 is sequenced after Arc 1 in this plan, and that ordering is
  now known to be wrong** — either Arc 2 step 1 moves ahead of the convergence
  work, or the two duplicate each other.

And one that was a live bug rather than a plan correction — **found, decided
and FIXED the same day** (full entry in `PARSER_NEXT_STEPS.md`): the default
English path silently truncated a command's arguments (`log "a" is not "b"` →
`log "a"`, `ok: true`, no warning). The fix is the engine verifying rather than
trusting: core's adapter rejects any semantic parse carrying the parser's own
`unconsumed-input` diagnostic, and — because an adoption then provably consumed
the whole remainder — the resync became "consume the rest", **deleting
`skipToCommandBoundary` and its keyword list**. That is a piece of step 6
landed early: the resync heuristic is gone; `trySemanticParse` and the
`skipSemanticParsing` list remain, and their fate is the convergence arc's.
Corpus effect: same 107 → 135; truncation-lost sources 8 → 0; the two
`render … with (…)` "semantic-only wins" were measured to be truncations too
(`style: "("`, named args dropped) and now fail honestly on both paths — so
**step 5's "strict superset in parseability" claim is corrected: the two
sem-only rows were prefix-parses, not wins**, and sem-only now reads 0. The
multilingual `--regression` gate runs green over the change.

**2026-08-31 — the convergence arc closed three of its own items and opened a
second thread (#1023–#1026).** Full state in
[HANDOFF-parse-path-convergence.md](./HANDOFF-parse-path-convergence.md); the
parts that change THIS plan:

- **Two of the arc's queue items are done.** `hide <button/>` (a live throw on a
  documented example in the DEFAULT config) is fixed in `packages/semantic`'s
  `convertSelector`, which also closed the query-literal half of the arc's item
  3. And **`implicit-me` was DECIDED by the owner**: an injected schema default
  is *relocated, not duplicated* — held back from `args`/`modifiers` and kept on
  `semanticRoles`, with the runtime remaining the single executable home of
  every default. That decision generalises beyond the 7 triaged rows to all 22
  defaulted schema roles, and it is the precedent for any future "does the
  default belong in the AST" question in Arc 3.
- **The triage's `both-fail 19` bucket was opened and is NOT parser gaps.** All
  19 are the repo's own `metadata.examples` — shipped in docs, MCP
  `get_command_docs` and LSP hover — and nothing had ever asserted that any of
  the 205 parse. Now gated by
  `packages/core/src/parser/__tests__/documented-examples.test.ts`.
- **A live defect class the plan did not know about: the parser discarded input
  in silence.** `on click qqqq` compiled to `ok: true` with an EMPTY handler,
  no error, no warning — a typo produced a handler that does nothing. This is
  the same class as the truncation fixed on 2026-08-30, but on the TRADITIONAL
  parser's recovery paths, which had no gate. Five sites now record it via
  `recovered`, so it is visible to every consumer. **This matters to Arc 2 and
  Arc 3**: any refactor that touches `parseEventHandler` or
  `parseCommandListUntilTerminator` must keep those diagnostics, and the
  AST-equivalence corpus alone will not tell you (a dropped body changes no
  successful parse's fingerprint — it changes `fail:N` counts only).
- **A gate-parity finding worth generalising.** `shipped-sources-validity`
  walked the working TREE while its sibling `shipped-examples-execution` walked
  `git ls-files`; the two silently disagreed (183 local vs 173 CI) until CI
  failed on it. Both now derive from git. Any new corpus-walking gate should do
  the same — the lesson is already recorded at #862 and was not applied.

**2026-09-01 — the convergence detour is CLOSED by owner decision (#1038–#1042).**
Steps 2, 3 and 6 are unblocked. Final triage: `same` 140 · `differ` 77 ·
trad-only 0 · sem-only 0 · both-fail 19 (the gated `metadata.examples`).
Families: `semanticRoles-added` 77, `field-only-sem` 78, `field-only-trad` 68,
`marker-in-args` 13, `node-type` 2, `value` 2, **`position` 0**. What is left is
deliberate enrichment plus a named residual; the owner judged that a defensible
endpoint rather than a stopping point mid-way. The parts that change THIS plan:

- **The `node-type` alias work landed and is not Arc 2's to redo** (#1040). The
  ordering correction recorded above — "Arc 2 is sequenced after Arc 1 and that
  ordering is now known to be wrong" — was resolved by moving Arc 2 **step 1**
  ahead; it is done, and its own hypothesis table is in Arc 2 below. The four
  `node-type` transitions the convergence brief listed are gone: semantic's
  emitters converged on core's spellings, pinned by
  `node-type-alias-parity.test.ts`.
- **Every convergence pass found a live defect, including the last one.** The
  span pass (#1042) set out to fix the SEMANTIC path and fixed the TRADITIONAL
  one in six places: `memberExpression` / `callExpression` /
  `possessiveExpression` all took their span from the token consumed LAST, so
  `call myFunction()` spanned `)` and `get me.parentElement` spanned
  `parentElement`; two synthesized children took a sibling's span; and
  `clear :count` reported a column that indexed different text than its own
  offset. All are read by LSP hover and diagnostic ranges. **The convergence
  brief had named the traditional parse the oracle for spans. It was not.**
- **`marker-in-args` (13) is the only family still explicitly blocked**, on Arc 2
  — semantic is internally inconsistent about markers, and the family is not
  executable until the union exists.

Gates: step 1's test; the AST-equivalence corpus (steps 2–4 must be
byte-identical; step 6 must be identical or reviewed per row); bundle-size
snapshot (`hyperfixi.js`, `-multilingual.js`, `-semantic-complete.js`
unchanged; `minimal`/`standard`/`classic` unchanged); the multilingual
`--regression` gate — its 3,744 rows execute exactly the path step 6 rewrites,
so run it locally before the PR, not in CI first.

Blast radius: **`fromCoreAST` is a published export of `@hyperfixi/core`, and
step 4 changed its default behaviour** — an external caller passing one argument
now gets roles for `set` and `go` only. The signature stays source-compatible, so
this breaks silently rather than loudly; it is the one part of step 4 that
reaches outside this repo. Every in-repo consumer was updated in the same change.
Also: ~~`createSemanticAdapter` (no downstream importer; the signature is kept anyway because the multilingual bundles call it)~~ **deleted by step 6 — measured: no bundle ever called it**; `config.semantic` (public, kept — now gates `compileAsync`); `compile().meta.parser`
values (`'semantic' | 'traditional' | 'lse'`, kept — step 6 makes `'semantic'`
mean "the front-end produced the AST" rather than "the analyzer was consulted").

### Arc 2 — One typed AST (medium-large)

> **Brief: [HANDOFF-engine-arc2.md](./HANDOFF-engine-arc2.md)** (2026-09-01). It
> re-measures this section's claims on the current tree and scores **four of
> seven false**: `parser-types.ts` covers 15 kinds not 20 (and two are
> PascalCase), positions are not always set (see step 2 below), `ast-utils` is
> the 5th `any` cluster not the 2nd, and `commands` holds 19% of the hatches
> rather than "most". The union has to cover **46 live kinds**, of which 15
> exist — that is the real size of step 2. Read it before starting.

A types-only arc. Runtime behaviour is byte-identical; the AST-equivalence
corpus is the gate and it must not move. The escape-hatch ratchet is the
progress meter.

1. **Classify the strays.** — ✅ **DONE 2026-08-31**, and it scored **1 of this
   step's 9 hypotheses correct**. Tool: `packages/core/tools/classify-ast-kinds.ts`
   (committed; run it, the numbers move). Over a 54-kind universe — Arc 0's two
   producer vocabularies plus `buildAST`'s six — the classification is
   **46 live · 2 dead (both false positives, annotated) · 3 orphan-read ·
   3 phantom**.

   | hypothesis | measured |
   | ---------- | -------- |
   | `dollarExpression` dead | ✅ **correct** — emitted by `parser.ts`, read NOWHERE in the monorepo. **Fixed**: it now returns the `expression` it was wrapping. |
   | `contextVariable` dead | phantom — already gone; nothing to delete |
   | `idSelector` dead | **live** — emitted via a *ternary* (`variable-commands.ts:214`) and read as a token type |
   | `expression` dead | **live** — 3 emitters, 3 readers |
   | `functionCall` = alias-of `callExpression` | **not an alias** — command-local, read by `trigger.ts`, exactly as `ast-vocabulary.test.ts` already documented |
   | `Command` = alias-of `command` | live (2 emit / 1 read) |
   | `CommandSequence` = alias-of `sequence` | live — the one alias claim that holds |
   | `object`/`keyword` producer-local | `object` live (10/71); **`keyword` has no emitter at all** |

   So the arc's premise list was mostly stale, and the real remaining alias work
   is the seven `RENAME_PAIRS` Arc 0 already pinned — not the names above.

   **`dollarExpression` was a latent RUNTIME bug, not tidiness.** An unread kind
   does not fail at build time; it surfaces as `Unknown AST node type: …`. No
   input reaches that branch today (the tokenizer emits `$foo` as one variable
   token), so returning the inner expression is not a behaviour change — it
   removes the trap.

   **Two traps the tool documents, both hit while building it.** Text matching
   cannot see a kind consumed by DESTRUCTURING (`forCondition`/`fetchConfig` are
   read via `node.condition.variable`, and are annotated `NOT dead` rather than
   suppressed), nor one emitted by a computed expression (`idSelector`'s
   ternary). And it must strip COMMENTS: the first run after deleting
   `dollarExpression` still reported it emitted, because the comment explaining
   the deletion quotes `type: '…'` — the same reason
   `check-semantic-boundary.cjs` carries its own stripper.
2. **`ast/nodes.ts`.** The union. Start from `parser/parser-types.ts` (already
   camelCase, already matches the emitted names, already per-kind interfaces
   for 20 kinds) and the interchange union's structure. Keep the emitted
   camelCase names — 61 files import by them and renaming buys nothing.
   Expression and statement unions are separate; `Node = Expr | Stmt`.
   ~~Positions are a required `{ start, end, line, column }` (the parser always
   sets them; the type just stops saying it might not).~~ **Measured false,
   2026-09-01, on both paths** — over the engine corpus, the TRADITIONAL parser
   leaves **24 of 857** typed nodes without a complete position and
   semantic-first leaves **58 of 949**. A required position would be a lie the
   type tells, and making it true is not a types change.

   Two distinct causes, and only one of them is a defect:

   - **20 of the semantic 58 are correct.** A value the parser materialized
     from a schema `default` was never written down, so it has no source text
     to point at — a bare `focus`'s implicit `me` is asserted span-free in
     `semantic-span.test.ts`, and a required position would force a fabricated
     one. Whatever the union says, it has to admit these.
   - **The traditional 24 are a defect**, from SEVEN producers, none of them
     the semantic path: `js … end` bodies (9 sites — body literal and params
     arrayLiteral), `pick`'s `variant`/`rangeMode` modifiers (7),
     `propertyOfExpression` (which `asExpression` then inherits from, so 2
     sites collapse to 1), `betweenExpression`, a `when`-modifier
     `unaryExpression`, an object-literal `properties[].key`, and `set`'s
     sigil-variable destination — which sets `start`/`end` and omits
     `line`/`column`, so the same `:count` surface is positioned two different
     ways inside one parse of
     `on click set :count to 1 then increment :count`.

   So: keep the position OPTIONAL on `Node` and say why (the materialized case
   is real), and fix the seven producers separately — a behaviour change, which
   this types-only arc cannot contain. Filed in `PARSER_NEXT_STEPS.md`.
3. **`evaluateAST` becomes exhaustive.** `switch (node.type)` over `Expr` with
   a `never` default; the local `type X = ASTNode & {…}` block
   (`parser/runtime.ts:63-135`) is deleted; each `evaluate*` helper takes its
   union member. ~~Plugin-registered kinds are a declared `PluginNode` member
   whose payload is `unknown` — the registry stays, typed.~~

   > **Design correction, compiler-probed 2026-09-01.** A `PluginNode` member
   > with `type: string` cannot live in the union: it pollutes every narrow
   > (`n.type === 'literal'` yields `LiteralNode | PluginNode` — TS2322 proof)
   > and makes the `never` default impossible, so the design as written cannot
   > produce the very gate this step is supposed to leave behind. Working
   > design instead: TWO layers. `evaluateKnown(node: Expr)` holds the
   > exhaustive switch with the real `never` default; the outer `evaluateAST`
   > keeps an honest wide parameter, consults the plugin registry, and routes
   > known kinds through a runtime kind-set guard — `const EXPR_KINDS = […] as
   > const satisfies readonly Expr['type'][]` plus the reverse completeness
   > check, so the array can neither list a ghost kind nor miss a real one.
   > `PluginNode` stays a TYPE for registry payloads, not a union member.
   > Also: there are TWO switches to make exhaustive, not one —
   > `evaluateExpressionSync` (`runtime.ts:338`) is the second — and the
   > ~~current 24 cases cover only 19 of the 30 full-parser kinds~~; the
   > missing-kind list is this step's interesting output.
   >
   > **Count corrected, measured 2026-09-01 when step 3 executed.** The union
   > has **35** members, not 30 (26 `Expr` + 9 `Stmt`; cross-checked two ways —
   > discriminant count in `nodes.ts`, and membership of the two unions, with
   > `PluginNode` correctly outside both). `evaluateAST`'s 24 arms therefore
   > cover **24 of 35**, not 19 of 30: 23 of the 26 `Expr` kinds plus
   > `eventHandler`, which is a `Stmt` the evaluator really does evaluate. The
   > 11 that never arrive are the 8 remaining statement kinds (executed by
   > `runtime-base.ts`, not evaluated) plus 3 `Expr` kinds consumed
   > structurally — `cssProperty`, `functionCall`, `expression`. The routing is
   > pinned in a table on `evaluateKnown` in `runtime.ts`.
   > **Order correction, measured 2026-09-01 (#1047 follow-up).** For
   > `ast-utils/` this step must come FIRST, not last. Its own `ASTNode`
   > (`ast-utils/types.ts:19`) uses `[key: string]: any`, not `unknown`, so
   > every `(node as any).foo` there is redundant with the index signature:
   > stripping the pattern across all six modules typechecks clean, keeps 348
   > tests green, and moves the ratchet 157 → 81 while changing NOTHING about
   > type safety. `check-type-escapes` counts hatch spellings and cannot see an
   > `any` arriving through an index signature, so the burn-down would book
   > credit for work not done. Replace that `any` with the union first; the
   > compile errors that appear are the real list. `parser/` is the opposite
   > case — `base-types`' signature is `unknown` and `start` is declared, so
   > removing those casts recovers `number | undefined`, which is why #1047 is
   > genuine. Ask per cluster: which `ASTNode`, and is the field declared?

4. **Collapse the definitions.** `types/base-types.ASTNode` → `Node`
   (re-exported under the old name for one release with `@deprecated`);
   `types/core`, `types/unified-types`, `types/index` re-export; ~~`ast-utils/types.ts`'s duck-typed `ASTNode` becomes `Node` (the visitor/query/transformer modules are the second-largest `any` cluster and go on the ratchet)~~ — **falsified when step 4 executed (2026-09-01):** `ast-utils`' `ASTNode` must STAY duck-typed. Measured: it is published as `ASTUtilNode` via the `./ast-utils` subpath and `await import`ed by three packages, and its modules discriminate on kinds no core parser emits (`conditional`, `logicalExpression`, `returnStatement`, `program`, `function` — phantoms in the classifier) and read fields no union member declares (`variable`, `features`, `then`, `else`). Its 348 tests hand-build those shapes and never parse real code. What DID change: the index signature went `any` → `unknown`, one `duck.ts` helper carries the package's single remaining hatch, and every field read now narrows before use — `ast-utils` 157 → **2** counted escapes, honestly this time, because each removed cast was load-bearing under `unknown`. `real-ast.test.ts` now anchors the modules to a real parse — and on its first run found that **the generator renders a block command's branches as empty**. First filed as "never reads `body`" — wrong, and the probe that checked it is why this note is accurate: the real `if` node's keys are `type`, `name`, `args`, `isBlocking` and position; there is no `body`. The condition and the two branches all sit in `args`, the branches as `block` nodes, and `generator.ts` has no `block` arm, so each falls to `generateFallback` and renders as `''` (the two trailing spaces in `on click \nif I match .open  ` are the two empty blocks). Pre-existing, behavioural, pinned as a KNOWN GAP test rather than fixed; the fix is a `case 'block'` rendering `commands`, and the pin flips when it lands; the hybrid
   parser's `ast-types.ts` is left alone here — it is a separate producer and
   Arc 5 decides its fate — but the `case 'event'`/`case 'sequence'` adapter in
   `runtime-base.ts` is typed as a converter from `HybridNode` to `Stmt`.

   > **Executed 2026-09-01 as PR 5, and most of the sentence above was wrong.**
   > Measured first, then done:
   >
   > - ~~`types/base-types.ASTNode` → `Node`, re-exported with `@deprecated`~~ —
   >   falsified twice. The union is `SyntaxNode` (a test pins that `Node` is not
   >   used; it is a DOM global), and every member EXTENDS `base-types.ASTNode`
   >   for its `[key: string]: unknown` index signature — aliasing `ASTNode` to
   >   the union would delete that signature, which is step 6 and goes last on
   >   purpose. `ASTNode` is untouched; it is also public from the package root.
   > - "zero non-test importers: `ContextReferenceNode`, `TypedASTNode`" — it was
   >   **seven**, once imports were attributed by resolved module path instead
   >   of by name (`ast/nodes.ts` reuses the same names, so a name grep counts the
   >   union's importers as base-types'): `Binary`/`Unary`/`Member`/
   >   `PropertyAccess`/`ContextReference`/`LiteralNode` and `TypedASTNode`.
   >   Deleted; zero compile errors.
   > - The other four — `CommandNode`, `EventHandlerNode`, `BehaviorNode`,
   >   `DefNode` — were NOT stale: they were the live parser output, and MORE
   >   complete than the union. `parser.ts` builds `errorSymbol`, `errorHandler`,
   >   `finallyHandler`, `attributeName`, `watchTarget`, `customEventSource` and
   >   `args` at 7–11 sites each, `runtime-base.ts` destructures every one, and
   >   `ast/nodes.ts` declared none of them. The conformance gate never fired
   >   because the engine corpus holds one `catch` and nothing else that emits
   >   them. Also `event`/`target` were declared `unknown`; measured `string` on
   >   both parse paths. The union absorbed all of it, `EXTRA_SOURCES` in the
   >   conformance test now feeds those constructs (mutation-verified: dropping
   >   a field is red with them and GREEN without them), and the four were
   >   deleted from base-types with every consumer repointed — parser.ts,
   >   runtime-base.ts, four parser front-ends, eight test files, and the dead
   >   re-exports in `types/core` and `types/index` (the latter had exported
   >   base-types' three-field `CommandNode` under the same bare name as the
   >   frozen public one — two shapes, one name, path-dependent).
   > - Layering: `types` is layer 0 and `ast` layer 1, so base-types cannot alias
   >   TO the union. Consumers repoint; the originals go.
   > - `parser/parser-types.ts`'s fifteen node interfaces are the third duplicate
   >   description, and they stay for now. Probed: aliasing them to the union
   >   costs 16 errors, all `ast-helpers.ts` factory params; retyping the
   >   factories cascades to 24; and narrowing `parseExpression`'s family to
   >   `Expr` RAISES it to 43 — because those functions legitimately return
   >   commands and handlers in some branches (`CommandNode → Expr` at two
   >   sites, `EventHandlerNode → Expr` at one). Their wide `ASTNode` return type
   >   is honest; making it `Expr` is a front-end redesign (Arc 3), not a
   >   types-only collapse. Instead `ast/legacy.ts` gained the reverse crossings
   >   (`fromLegacyCommands`, `fromLegacyExpression`, `fromHybridStatements`),
   >   three more `as unknown as` in the one file licensed to hold them.
   > - The `case 'event'`/`'sequence'` hybrid adapter IS typed as the plan said
   >   (`HybridEventNode` → `EventHandlerNode` via `fromHybridStatements`), and the
   >   rest of the dispatch narrows to union members; `executeObjectLiteral` takes
   >   `ObjectLiteralNode` and its two key casts went. `runtime/` −6, `ast/` +3.
5. ~~**Commands stop casting.** `ast/guards.ts` (`isIdentifier`, `isSelector`,
   `isLiteral`, …) replaces `(arg as Record<string, unknown>).name === 'x'`
   one file at a time, ratcheted. This is mechanical and boring and it is where
   most of the 1,152 hatches live.~~ **Re-scoped by the owner 2026-09-01, and
   then executed the same day.** Measured first: the AST-shaped portion of
   `commands/` was ~13 sites of 235 — the rest is ExecutionContext / DOM /
   network typing that no node union touches, a different track outside this
   arc. The 13 landed as guard adoptions (`isIdentifierNode`, `isLiteralNode`,
   `isNodeOfKind`, and the existing `isDOMNode` for the one genuinely
   load-bearing cast) plus the `property-target.ts` guard move — its two
   predicates now live in `ast/guards.ts` with their runtime checks verbatim,
   because strengthening them to the resolvers' narrower contract would change
   which nodes route where. The step as originally written — a cluster-wide
   burn-down — is DROPPED; its premise did not survive measurement.
6. ~~**Remove the index signature.** `[key: string]: unknown` comes off `Node`
   last. The compile errors that appear are the burn-down list; the arc is done
   when `tsc` is clean without it.~~ **DONE 2026-09-02, in the narrower of the
   two shapes the sentence conflates.** There are two of them, and the plan did
   not distinguish them:

   - **Probe F — delete the signature from `types/base-types.ASTNode` itself.**
     435 errors in 51 files (production 78 in 18; tests 357 in 33, overwhelmingly
     `TS2353 'value' does not exist` — 216 fixtures hand-building
     `{ type: 'literal', value }` typed as `ASTNode`). It touches the FROZEN
     public `ASTNode` and lands squarely in `commands/`, whose typing the owner
     scoped out of this arc. **That is a 4.0 item, not a step** — it belongs
     with the `ExpressionNode` redefinition that `ast/legacy.ts` already lists
     (`git grep toLegacyExpression`, `fromLegacy*`, `AnyNode`).
   - **Probe G — union members stop inheriting it; `ASTNode` keeps it for
     legacy and public consumers.** This is what shipped. `BaseNode` declares
     `type`, the four optional positions, `raw?` and `diagnostics?` itself.

   **Probe G's cost was measured TWICE and the two numbers differ by 54,**
   which is the useful part: on the step-5 branch (before step 3 landed) it was
   63 errors in 11 files, production 33 in 5; on the merged tree it is **117 in
   12 files, production 87 in 6**. Step 3's exhaustive evaluators are the whole
   delta — `parser/runtime.ts` went from 0 to 54 — because typed switch arms are
   exactly what turns "a union member flows into an `ASTNode` parameter" from
   invisible into a compile error. A probe run on a branch that lacks its
   sibling's merged work under-reports.

   What the errors actually were, and what each says:

   | shape | n | fix |
   | ----- | - | --- |
   | a union member passed to an `ASTNode` parameter (TS2345) | 67 | retype the parameter |
   | an `ASTNode` cast to a union member at a dispatch (TS2352) | 45 | widen the dispatcher's parameter to `AnyNode`; the discriminant then narrows |
   | `node.property.name` on an `Expr` (TS2339) | 4 | structural read — the guards verify less than the resolvers assume, deliberately |

   The parameter retypes are the content. `evaluateAST`, `evaluateExpressionSync`,
   `RuntimeBase.execute` and the observer/handler helpers are dispatchers whose
   callers are split between the two worlds, so they take
   `AnyNode = SyntaxNode | ASTNode` (`ast/legacy.ts`) — casting 34 call sites to
   `ASTNode` would have been the same lie repeated 34 times. Everything else got
   its real union member: `executeProgram(ProgramNode)`,
   `executeBlock(BlockNode | InitBlockNode)`,
   `executeCommandSequence(CommandSequenceNode | HybridSequenceNode)`,
   `executeBehaviorDefinition(BehaviorNode & …)`,
   `makeBlockLiteralClosure(BlockLiteralNode)`, `resolveCallArgs(Expr[])`.

   Three findings the errors surfaced that no gate had:

   - **`expressions/collection/index.ts` declared its OWN
     `CollectionExpressionNode`** — a fifth prose description of a kind,
     exported and imported by nobody (`parser/runtime.ts` takes the union
     member and the four evaluator functions, never the interface). Deleted.
   - **`commands/helpers/property-target.ts` declared its own
     `PropertyOfExpressionNode` / `PropertyAccessNode`**, narrower than the
     union AND narrower than what the guards beside them verify — step 5 kept
     the guards' runtime checks verbatim so no node changed route, which left
     the resolvers' ASSUMPTION written down as if it were the node's SHAPE.
     Deleted; the assumption is now a structural read inside each resolver,
     where it is visibly an assumption.
   - **`imperativeInstaller` has no emitter anywhere in the repo** — read only
     by `executeBehaviorDefinition`, written by nothing, and `parser.ts:3230`
     (the one `type: 'behavior'` producer) does not emit it. It is NOT promoted
     into `BehaviorNode`, because the union describes what the parser builds.
     But `execute` is public and the method is `protected` on a published
     class, so the branch is reachable from outside and deleting it would be a
     behaviour change this arc cannot make. It stays as an intersection at that
     one site, with the reasoning on it.

   The 30 test errors were all one shape — `result.node as BehaviorNode`, a
   cast that asserted nothing — and became `assertNodeOfKind(result.node,
   'behavior')`, which checks the kind it was assuming and names the actual one
   when it is wrong. One of them (`behavior.initBlock?.commands`) was a real
   unchecked read that the cast had been hiding.

   Ratchet: **927 → 927.** Step 6 adds no hatches and removes none — the one
   `as Record<string, unknown>` it deleted lives inside a `debug.parse` template
   literal, which the counter strips. That is the honest number: this step buys
   type safety the ratchet cannot see, which is the same blind spot the arc's
   brief documented in the other direction for `ast-utils`.

Gates: `tsc` (the exhaustive switch and the removed index signature ARE the
gate); the AST-equivalence corpus; the vocabulary snapshot; the escape ratchet
(monotone down); every existing suite.

Blast radius: `ASTNode` is exported from `index.ts` and used downstream as a
type (vite-plugin, developer-tools). Keep the alias for a release. The hybrid
`ast-types` subpath export is unchanged. **As executed, `ASTNode` is untouched**
— step 6 separated the union from it rather than changing it, so downstream
types compile exactly as before. What DID move is a handful of internal
signatures on `RuntimeBase` (`execute`, and the `protected` `executeProgram` /
`executeBlock` / `executeCommandSequence` / `executeBehaviorDefinition` /
`setupMutationObserver` / `setupChangeObserver`): a downstream subclass
overriding one of those with the old `ASTNode`-shaped parameter now sees a
narrower or wider type. In-repo overrides all typecheck; call it out in the
release notes. `ExpressionEvaluator.evaluate` widened the same way, and is safe
by construction: it is declared as a METHOD, and method parameters are checked
bivariantly, so a command or test that implements it as
`evaluate(node: ASTNode, …)` stays assignable.

### Arc 3 — Grammar into the parser (large; one PR per command)

> **Brief: [HANDOFF-engine-arc3.md](./HANDOFF-engine-arc3.md)** (2026-09-02).
> Re-measures this section's claims on `2b1a6f22` and scores **fourteen: eight
> hold, three false, three incomplete**. The false ones are the counts — "46
> input unions" (77 `*Input` types, **7** unions), "28 generic-loop commands"
> (**25**, through **two** loops), and a blast radius that omits `aot-compiler`
> (52 `.args` reads) and `vite-plugin` (12). The finding that changes the
> order: the dedicated parsers push marker words INTO `args`, which IS the open
> `marker-in-args` convergence family (13) — step 2 closes it by construction.
> Four owner decisions are listed there; the first (land Arc 1 step 6 before
> the first command) is the one to answer before starting. **2026-09-02:**
> decided and done — step 6 landed first (#1058), the `CommandName` type
> exists, and decision 4 was withdrawn (`unless` was fixed in #805; the brief
> had quoted the filing's head without its status).

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
   it to zero. ✅ **DONE 2026-09-02** — `baselines/parse-input-census.json`,
   regenerated by `npm run census:parse-input:update`, gated by
   `commands/__tests__/parse-input-census.test.ts` (shrink-only on four
   metrics per body, plus unknown/stale-row checks and a totals-consistency
   check; mutation-verified — one added `if` in `log` reddens it). The
   measurement is a regex census rather than a hand-classified table, and
   that is deliberate: it is reproducible and it is what the arc can ratchet.
   The A class needed no column — Arc 1 step 6 landed first (#1058), so there
   are no semantic-shape branches left to classify. **Baseline: 51 bodies ·
   2,434 lines · 361 branches · 128 syntax sites · 215 value sites.**
2. **Per-command typed nodes.** `ToggleNode` is `ToggleCommandInput` with
   `HTMLElement[]` replaced by `Expr` slots and `duration: number` by `Expr`.
   ~~The existing input unions (46 files already have one) are the shapes —
   this step is moving them one layer up.~~ **Measured 2026-09-02: 77
   exported `*Input` types, of which 7 are discriminated unions** (`Insertion`,
   `Remove`, `Add`, `Toggle`, `Set`, `Default`, `Clear`); the rest are flat
   interfaces. The shapes exist and do move up a layer; "46" and "union" were
   both wrong. Also: **no `CommandName` type exists** — `COMMAND_NAMES` is
   `readonly string[]`, so the `K` below needs a manifest change first. The dedicated parser
   (`parseToggleCommand` in `command-parsers/dom-commands.ts`) emits the node;
   `CommandNode` becomes `CommandNode<K extends CommandName>` with a per-K
   `args` type, and `command-node-builder.ts` builds it.
3. **Migration order = the `parseInput` size table above**, largest first:
   **`toggle` STARTED 2026-09-02 — PR A of two.** The parser now emits the
   destination as a slot: `toggle .active on #panel` is `args: [.active]`,
   `modifiers.on: #panel` (`from`, the HyperFixi spelling, shares the slot).
   ToggleCommand's `parseInput` already read `modifiers.on` as its fallback
   destination — the shape the semantic path always produced — so the runtime
   is untouched, and toggle's rows leave the `marker-in-args` family. Two
   AST-equivalence rows moved, reviewed. What it found: the interchange's
   `inferRolesFromSchema` derives a role's English markers from
   `markerOverride`/`markerVariants` only, and toggle's destination has
   neither (its `on` is the profile's), so the old binding had worked by the
   positional pass skipping the literal `on` in `args` — with the value in a
   slot, `destination` came back undefined and `marker-roles.test.ts` caught
   it. Core's inferrer now also applies the schema's own `ast.modifiers`
   descriptor as the reverse map (`modifiers.on` IS `destination`, by the
   schema's own declaration) before returning. **PR B (same day):** the two
   other syntactic decisions became slots — `between A and B` is
   `modifiers.between` (an arrayLiteral of the pair, `args` empty) and the
   dialog mode of `as modal` / bare `modal` is `modifiers.as` (the parser
   unwraps the `asExpression` the expression parser builds for `#dlg as
   modal`, once). `parseInput` lost the `firstArgName === 'between'` branch,
   the `on`/`from` name-skipping, the `asExpression` unwrap and the
   evaluate-`args[1]`-and-compare-to-`'modal'` mode detection. **Census row:
   243 → 202 lines, 30 → 25 branches, 8 → 3 syntax sites.** What stays is
   value work — element-vs-class from the evaluated first value, the
   dialog/details/select dispatch by element type, `*prop` from a selector
   token's value — and the remaining three syntax sites are `args[0]` reads,
   which a positional slot IS. Pinned end to end in `toggle-slots.test.ts`
   (real parser, real evaluator, DOM effect), not by fixtures: the mock-fed
   `unless` bug is why.

   **`swap` + `morph` + the shared `using view transition` tail (same day).**
   `parseSwapCommand` emits the target positionally and everything syntactic
   as slots — `modifiers.strategy` (the strategy word; the parser now
   recognises every key of `lib/swap-executor.ts`'s `STRATEGY_KEYWORDS`, not
   its own seven-word subset), `modifiers.with` (the content), and
   `modifiers.viewTransition` (the tail, which `swap`, `morph` and `process
   partials` share — `parseViewTransitionTail` replaces the helper that pushed
   `using`, `view`, `transition` into `args` as three identifiers for each
   command to scan for). `swap innerHTML of #t with it`, `swap over #m with
   c`, `swap delete #n`, `swap #t with it` and the variable form `swap a with
   b` all land in one shape. `SwapCommand.parseInput` lost its keyword scan
   (`findIndex` over `with`/`of`/`delete`/`using`/`into`/`over`) and the
   `binaryExpression 'of'` branch no producer emits any more; `MorphCommand`
   likewise. The front-end's positional shape (`[method, destination,
   patient]`, and morph's `args: [source]` + `modifiers.on`) is still read by
   a fallback, as it always was — only the traditional path changed spelling.
   **Census rows: swap 198 → 83 lines / 10 → 2 syntax sites, morph 103 → 56 /
   5 → 4, process 82 → 81.** Type-escapes 918 → 906. Seven corpus rows moved,
   reviewed; two `KNOWN_UNFIXED` marker bindings in `marker-roles.test.ts`
   (`swap.method="over"`, `morph.patient="over"`) cleared, because there is no
   bare `over` in `args` for the positional pass to bind any more.

   **`put` (same day).** The operation is the slot the target lives under:
   `put X into Y` is `args: [X]`, `modifiers.into: Y`, and the multi-word
   operations keep their spelling as the key (`'at start of'`, `'at end of'`)
   — the shape `putSchema`'s `ast` descriptor has always produced on the
   semantic path and `PutCommand.parseInput` already read. The parser had
   just resolved the operation (including `at the start of` → `at start of`)
   and was pushing it back into `args` as an identifier for the command to
   find again by scanning for one of six words. That scan is gone; a bare
   two-argument node built directly still defaults to `into`. **Census row:
   152 → 132 lines, 9 → 3 syntax sites.** Type-escapes 906 → 902. Four corpus
   rows moved, reviewed; 18 fixtures and 4 parser pins reshaped.

   **`repeat` (2026-09-03) — the first block-shaped command.** The parser had
   already resolved the loop form and every operand (`for x in y`, `N times`,
   `while`/`until <cond>`, `until event <name> [from <target>]`, `forever`,
   `index <var>`, and the bottom-tested `repeat … until/while … end` form)
   and was flattening them into `args` in a fixed order behind an identifier
   named after the form, for `RepeatCommand.parseInput` to re-derive from
   `args[0].name` and the positions after it. Every operand is now a slot
   keyed by the word that introduced it — `modifiers.loopType`, `for`, `in`,
   `times`, `while`, `until`, `event`, `from`, `index` (`bottomTested` already
   was) — and only the body block and an `else` block stay positional.
   `parseInput` reads the slots; its `raw.modifiers?.for/times/...` reads had
   only ever been reachable from hand-built nodes, because
   `@lokascript/semantic`'s `buildAST` never builds a loop node (a filed gap).
   **Census row: 126 → 106 lines, 17 → 3 syntax sites** — the three left are
   the `args[i].type === 'block'` reads that find the body. Two corpus rows
   moved; 11 fixtures and 7 parser pins reshaped. One trap worth the note:
   the first draft's slot-reading helper was written inline and took the
   branch count UP (30 → 32) while the syntax count fell — the ratchet caught
   it, and the helper is a module-level function now.

   **`set` (2026-09-03).** The value is the `to` slot: `set x to 1` is
   `args: [x]`, `modifiers.to: 1` — what the semantic path always produced
   and what `SetCommand.parseInput` read first; the parser had consumed `to`
   and was pushing it back as an identifier for the command to scan for.
   The scan is gone. What the scan had been covering for: `increment`/
   `decrement` desugar to a `set` node in the parser, and that desugar was the
   one in-repo producer of the flat `[target, to, value]` shape — it emits the
   slot now too, so `increment :count` and `set :count to :count + 1` are the
   same node. **Census row: 122 lines, syntax sites 1** — the row's numbers
   did not move, because the census counts positional `args[i]` reads and the
   one that remains is the bare two-argument fallback's `args[1]`; the `to`
   scan it removed was a `findIndex`, which the census never counted. The
   step is real; the meter is blind to this one, and says so here. Nine corpus rows moved (every
   `set` and `increment` example), reviewed; seven hand-built runtime nodes,
   the parser expectations and the parser-unit pins reshaped.
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
4. ~~**The 28 generic-loop commands**~~ **The 25 generic-loop commands
   (measured 2026-09-02) — 23 through `parseCommandCore`'s own tail loop and
   2 (`push`, `replace`) through `parseRegularCommand`, because there are
   TWO generic loops, not one** — get a declared grammar instead of the
   loop. ✅ **DONE 2026-09-02 for the 23 (+ the 4 multi-word commands), option
   (a).** `parser/command-grammar.ts` is the table — one row per command:
   a positional rule (`expression` for the 23, `primary` for the four that were
   `MULTI_WORD_PATTERNS`, `none` for the argument-less five), the marker words
   that open a slot, and the syntax string — and
   `command-parsers/declared-commands.ts` is the ONE parser that reads it.
   The tail loop, its `continuationKeywords` array, `parseMultiWordCommand`,
   `MULTI_WORD_PATTERNS`, `getMultiWordPattern` and the `MultiWordPattern`
   type are deleted. `command-routes.test.ts` pins that the dedicated set and
   the grammar's keys partition `COMMAND_NAMES` exactly (tolerance 0): every
   command has one route and no command has two. `push`/`replace` stay on
   `parseRegularCommand` via the compound switch's `default` — their
   `with title <expr>` is a two-word marker the row shape does not have yet.

   **Why (a), measured.** The schemas describe the same commands from the
   other side (`svoPosition` 108 sites, `markerOverride` 47, `argSkipTokens`
   8), in a role vocabulary the engine has no reason to know, across the
   boundary Arc 1 draws. The parity the plan asked for in exchange is
   `grammar-schema-parity.test.ts`: for every generic command, the grammar's
   marker words are compared with the English markers the schema would bind,
   and the **five** asymmetries are pinned by name with their reasons
   (`copy`'s inert `to`, `get`'s unread schema `on`, `make`'s constructor
   words, `open`'s `as` parsed inside the expression, and `settle`'s `for` —
   which the front-end's schema cannot express at all: a front-end gap, filed
   in `MULTILINGUAL_NEXT_STEPS.md`).

   **Two defects the tail loop had, fixed by the shared boundary rule.** It
   did not stop at `on`, and `parsePrimary` on `on` returns an event handler,
   so a zero-argument command at the end of a handler body swallowed the NEXT
   HANDLER as its argument — `on click focus\non keyup log 1` compiled to one
   handler. And it stopped at every command word, so `call fetch("/x")` split
   into an empty `call` and a `fetch` COMMAND that then ran; a command word
   followed by `(` is now a call expression. `settle for 3000` — declared in
   the command's own syntax, filed as a parser gap — parses. The
   AST-equivalence baseline moved on exactly **7 rows**, each reviewed: the
   three `default … to …` examples (`to` is now a `modifiers` slot, which
   DefaultCommand already read on the semantic path), `call fetch(...)`,
   `settle for 3000` (fail → ok), and `blur`/`focus on <input/>` (ok →
   fail, matching upstream's rejection; the documented-examples gate rows are
   re-statused `no-parse`). `CommandSequence` left the corpus vocabulary pin:
   its only producer was the `call fetch` split.

   **Deliberately NOT changed:** leftover tokens that are neither a boundary
   nor a marker are left for the statement loop exactly as before, so
   `log x y z` still parses `log x` and drops the rest in silence. Upstream
   rejects the source; making it an error is filed in `PARSER_NEXT_STEPS.md`
   as the follow-up, because it flips silent drops into errors across an
   unmeasured set of pages. **Decision to record in the brief:** (a) a core-local arg spec per
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
completions and `reference/index.ts` are metadata, untouched. **Two consumers
this list missed (measured 2026-09-02): `aot-compiler` reads `.args` 52
times — `transforms/command-transforms.ts` alone 34, switching on 21
preposition/unit literals — and `vite-plugin/src/compiler.ts` 12 times. Both
break on a per-command `args` shape and belong in each command's PR.** And the
mapper half is smaller than "~50 pairs" implies: Arc F already moved 43 of 47
mappers to schema `ast` descriptors, so a command's cross-package change is a
descriptor line plus a fixture regen; 15 manifest commands have no mapper at
all, and `pseudo-command`/`start` have no schema.

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

1. ~~**Measure**~~ — ✅ **DONE 2026-08-30, and it rescopes the arc.** The premise
   was that the seven category modules are mostly per-expression `metadata` /
   `documentation` prose. They are not:

   | Measured | |
   | -------- | - |
   | `expressions/` non-test lines | 7,385 |
   | `metadata` + `documentation` prose in all of it | **224 (3.0%)** |
   | …of which, in `logical/index.ts` | **224 — all of it** |
   | expressions in `logical/index.ts` carrying those blocks | **3 of 25** |
   | `trackEvaluation` call sites, whole tree | **31 — all in `logical/index.ts`** |
   | `matchesWithCache` call sites | **2** |

   So **Arc 7's entire surface is one file.** The prose is 21.7% of
   `logical/index.ts`, not "the rest" of it — that file is ~810 lines of real
   code for 25 expressions — and only three of those 25 carry the blocks at all.
   The review's claim that the executable core is "a few dozen" lines was simply
   wrong, and it was the claim this step existed to check.

   What that changes: the pattern is not a convention to be generated from, it
   is a **half-applied convention with three stragglers**. Deleting it is at
   least as defensible as extracting it to JSON, and either way the payoff is
   224 lines in one file rather than a sweep across seven modules. Re-cost the
   arc before starting it; it may be worth folding into Arc 2 instead of
   standing alone.

   `documentation` has **zero runtime readers** anywhere. `inputSchema` is read
   at runtime in exactly one place (`expressions/special/index.ts`, two
   `safeParse` calls) — the other readers are in `features/`, which Arc 6b
   deletes.
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

- **2026-08-31** — **Arc 2 step 1 (classify the strays) ran EARLY**, pulled
  forward because three separate convergence findings pointed at it: 12 of the
  14 remaining node-type differences between the two English parse paths are
  alias normalisation, which is this step's job. It scored **1 of its own 9
  hypotheses correct** — `dollarExpression` was genuinely dead (emitted, read
  nowhere in the monorepo) and is now fixed; `contextVariable` was already gone,
  `idSelector` and `expression` are alive, `functionCall` is command-local
  rather than an alias, and `keyword` has no emitter at all. Full table on the
  step. Tool: `packages/core/tools/classify-ast-kinds.ts`, whose own two blind
  spots (destructured reads, computed emissions) and comment-stripping
  requirement are documented in it — the last of those was hit live, when
  deleting the dead kind still reported it emitted because the explanatory
  comment quoted the literal.

- **2026-08-30** — **The silent-truncation class was decided and fixed** (the
  convergence queue's item 1, same day it was filed). Decision: the engine
  verifies rather than trusts — semantic's `unconsumed-input` diagnostic was
  already on the node, written there so a caller could act on it, and core's
  adapter now does (coverage gate in `createSemanticAdapter`); pricing coverage
  into the confidence SCORE stays parked in semantic behind its
  `--diagnose-coverage` sweep. Fixing the gate exposed the second half:
  `skipToCommandBoundary` stopped at any command word and split spans the
  analyzer had fully consumed (`call element.focus()` → phantom `focus()`
  command), so the resync became exact and the keyword scan was **deleted** —
  a piece of step 6 landed early. Measured: corpus same 107 → 135,
  truncation-lost 8 → 0, sem-only 2 → 0 (both `render … with (…)` rows were
  prefix-parses — step 5's superset claim corrected), multilingual gate green.
  Pinned by `semantic-adoption-coverage.test.ts`. Two dead ends measured and
  recorded on the way: resyncing on `tokensConsumed` (it is input length, not
  comprehension) and treating the resync as the root cause (it was downstream
  of adoption trust, and only half the story).

- **2026-08-30** — **The owner chose to CONVERGE the two English parse paths**
  before step 6 (step 5's third option). Its step-1 measurement landed with it:
  `packages/core/tools/triage-parse-paths.ts` plus
  `HANDOFF-parse-path-convergence.md`.

  The measurement revised the cost in both directions. **Down:** "107 sources
  differ" is nine families, and 45 of the 107 differ only in metadata — most
  families are a single decision. **Up:** the arc cannot finish without part of
  **Arc 2**, which this plan sequences after Arc 1; and neither path is simply
  better — traditional is right about operator precedence, `between`, `as` and
  `beep!`'s arguments, while semantic is right about markers, `settle`'s
  blocking, `pick`'s roles and query literals in `hide`/`show`.

  It also found a **live shipped bug**, filed in `PARSER_NEXT_STEPS.md`: the
  default path silently truncates a command's arguments when the analyzer
  matches a prefix (`log "a" is not "b"` → `log "a"`, `ok: true`, no warning).
  Same class as #1013's `and` bug, which did not close it — evidence for the
  plan's existing position that step 6 should REMOVE the resync heuristic rather
  than tune its keyword list.

- **2026-08-30** — **Arc 1 step 4** landed: `fromCoreAST` takes its role
  inferrer by injection, and the schema-driven default lives in
  `multilingual/schema-roles.ts` — the front-end side of the boundary.
  `ast-utils/interchange/from-core.ts` imports the front-end **nowhere**.

  Both of the step's own claims were measured false first, and the step is
  written up above with the corrections. In short: the default supplies roles
  for **41 of the 43** role-bearing command names (not the four the comment
  claimed), so omitting it is a cliff rather than a degradation; and the two
  imports MOVE rather than disappear, leaving static-value at **7**.

  Byte-equivalence with `main`'s converter was proven over both parse paths of
  every corpus source — **430 comparisons, 0 diffs** — so this is a pure
  refactor by measurement, not by assertion. Three new tests pin the injection
  boundary in core (roles present with the inferrer, ABSENT without, and reached
  through handler bodies and `if` branches) and one pins it end-to-end through
  the AOT adapter; the AOT one was mutation-verified by dropping the injection.

  Two things the step found and did not fix:

  - **A pre-existing role-binding defect**, filed in `PARSER_NEXT_STEPS.md`:
    `toggle .active on #panel` parsed traditionally binds `destination` to the
    marker word `on`, leaving `#panel` in no role. Confirmed against `main`.
    It is a concrete instance of the `args`-shape difference step 5 measured,
    so **the fix depends on the open decision** — option 3 would delete it.
  - **The two LSP consumers have no test covering the `fromCoreAST` role path**
    at all (their hover tests assert only `toBeDefined()`). The AOT consumer is
    now covered; those two are wired identically but unguarded.

    **Arc 1 step 5 ran in the same session and revised the arc.** Measured over
  the 233-source corpus, semantic-first vs traditional for English:
  **same 107 · differ 105 · traditional-only 2 · semantic-only 2 · both-fail
  17.** None of step 5's three anticipated outcomes was the answer — the two
  paths produce materially different English ASTs for **half the corpus**, so
  step 6 is a reviewed behavioural change, not a deletion. It also surfaced a
  **live shipped bug** (`on click log 1 and 2` fails in the default config),
  filed in `PARSER_NEXT_STEPS.md` and now step 6's motivating case. Detail is
  on the step itself.

- **2026-09-02** — **Arc 2 is COMPLETE.** Steps 3, 4, 5 and 6 landed as #1052,
  #1053, #1054 and #1055; the union is the single description of the core
  parser's AST, both evaluator switches are exhaustive, and no member inherits
  an index signature. `tsc` is clean without it, which is the finish line the
  arc named for itself.

  The escape ratchet went **1088 → 927** over the four PRs, and the honest
  accounting of that number is the arc's most useful output: 155 of the 161 came
  from `ast-utils` alone, and **only because step 4 flipped its `[key: string]:
  any` to `unknown` FIRST**. Stripping the same casts without that flip
  typechecks clean, keeps all 348 tests green, and moves the meter 157 → 81
  while changing nothing — the arc's brief measured that and reordered the work
  around it. Step 6, conversely, moved the meter **not at all** (927 → 927)
  while doing the single largest type-safety change in the arc. The ratchet
  counts hatch spellings; it cannot see an `any` arriving through an index
  signature, and it cannot see one leaving. Read it as a floor, never as a
  score.

  Four of the arc's seven plan claims were false on measurement, and the plan
  now carries each correction struck through in place: `parser-types.ts` covers
  15 kinds not 20, positions are NOT always set (24 of 857 traditional, 58 of
  949 semantic — and 20 of those are correct, a value materialized from a schema
  default has no source text to point at), `ast-utils` was the 5th `any` cluster
  not the 2nd, and `commands` holds 19% of the hatches rather than "most" — its
  AST-shaped portion was ~13 sites of 235, which re-scoped step 5 to a fraction
  of its planned size. The pattern across all four: the plan's model of WHERE
  the difficulty lived was stale, and re-measuring before costing is what caught
  it every time.

  What the arc deliberately did NOT do, each with its numbers recorded so nobody
  re-runs the probe: delete the index signature from `types/base-types.ASTNode`
  itself (probe F, 435 errors, a 4.0 item — it touches the frozen public type
  and `commands/`); collapse `parser/parser-types.ts` (16 → 24 → **43** errors
  as the retype widens, because the front end's `ASTNode` return types are
  HONEST — `parseExpression` really does return commands and handlers in some
  branches, which is Arc 3's redesign, not a types edit); and retype
  `ast-utils`' public `ASTUtilNode`, which must stay duck-typed because its
  modules discriminate on kinds no core parser emits.

  Three behavioural defects surfaced by the arc are filed rather than fixed,
  because a types-only arc cannot contain them: the seven incomplete-position
  producers, `ast-utils`' generator having no `block` arm (a real `if`'s
  branches render as `''`, pinned as a KNOWN GAP), and `set *<css-prop> …`
  breaking 4 of 5 shapes against upstream 0.9.93, 3 of them silently. All in
  `PARSER_NEXT_STEPS.md`.
