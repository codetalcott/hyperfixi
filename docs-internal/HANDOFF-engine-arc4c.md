# Arc 4c brief — the typed `Scope`

> Written 2026-09-04 on the tree that closes Arc 4b's numbered steps (#1091 +
> steps 3/4), opening Arc 4c of [ENGINE_MIGRATION_PLAN.md](./ENGINE_MIGRATION_PLAN.md).
> The plan asks every arc to open with a brief that **re-measures the plan's
> own claims**; 4b's found three of eleven false. This one scores **nine
> claims: four hold, two are false, three are materially incomplete** — and the
> two false ones are the arc's stated BLAST RADIUS and its stated WIN, which is
> why the brief exists.
>
> Nothing here has been started. Re-measure before costing; when a
> measurement falsifies a written claim, correct the doc in the same PR,
> struck through in place.

## How to re-measure

```bash
cd packages/core
grep -rn "expressionStack\|evaluationDepth\|validationMode" src --include='*.ts' | grep -v "test\|types/base-types\|command-adapter"   # 0 readers
grep -rn "context\.evaluationHistory\|ctx\.evaluationHistory" src --include='*.ts' | grep -v test                                    # trackEvaluation + base-expression only
grep -rn "context\.meta\b\|ctx\.meta\b" src --include='*.ts' | grep -v test                                                          # 1 (the bridge writes it)
grep -rn "\.variables\b" src --include='*.ts' | grep -v "test\|__tests__" | cut -d: -f1 | sort -u                                   # 7 production files
grep -rn "contextRegistry\.register\|\.context\.register(" ../*/src | grep -v "test\|/registry/"                                    # none
grep -rn "enhanceContext(" src/runtime/runtime-base.ts                                                                              # 5 call sites
grep -rln "from '.*parser/extensions'" src/expressions src/commands                                                                 # 5 layering edges
```

## The plan's claims, scored

| #   | Arc 4c claim                                                                                                                                                  | measured 2026-09-04                                                                                                                                                                                                                                                                                                                                                                                                                                                       | verdict               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | "`ContextBridge.toTyped/fromTyped` and the per-command copy are deleted (the typed extras have no reader outside `trackEvaluation`)"                             | Three of the four extras — `expressionStack`, `evaluationDepth`, `validationMode` — have **zero** readers anywhere: write-only ballast the bridge allocates per command. `evaluationHistory` has TWO reader families, not one: `trackEvaluation` (`expressions/shared/index.ts:71`, ~25 comparison sites) and `BaseExpressionImpl.trackPerformance`/`trackSimple` (`expressions/base-expression.ts:55-96`). The bridge (`command-adapter.ts:153-216`) also copies `variables`/`locals`/`globals` by reference and spreads back 10 fields. | materially incomplete |
| 2   | "`enhanceContext`'s `Proxy` is deleted after step 1 measures that no production caller registers a context provider (2026-08-30: none outside `src/registry/`)" | Re-measured: none. And the Proxy is allocated at **five** call sites in `runtime-base.ts` (behavior, event, mutation, change contexts) on every context, with zero providers — a per-context allocation with no reader. `ContextProviderRegistry.enhance()` builds it (`registry/context-provider-registry.ts:263-294`).                                                                                                                                                | holds                 |
| 3   | "`parser/extensions.ts`'s global read/write hooks move to `Runtime` — plugins get them through `HyperfixiPluginContext.runtime`, which they already receive"     | `runtime` is on the plugin context (`runtime/plugin.ts:52`). But reactivity reaches the hooks through `parserExtensions.registerGlobalWriteHook` & co. (`reactivity/src/index.ts:105-126`), never by importing the file. Of the five `expressions/`+`commands/` edges into `parser/extensions`, only TWO are hook edges (`expressions/special/index.ts:22`, `commands/helpers/variable-access.ts:17`); the other three import `getRegisteredNodeWriter`/`NodeWriterFn` — a different registry the plan does not mention. | materially incomplete |
| 4   | "`ExecutionContext` is exported and used downstream as a type (reactivity, realtime, components). Keep it as an alias of `Scope` for one release."               | **False for production.** Each of reactivity, realtime, intercept and components declares its OWN structural `interface ExecutionContext` (e.g. `reactivity/src/types.ts:22-30`), on purpose ("avoid tight coupling to core internals"). Only two TEST files import core's type. The alias still earns its keep — `ExecutionContext` is on core's public surface — but the reason given is wrong, and a SHAPE change (dropping a field those interfaces name) is what would actually reach them, alias or not. | **false**             |
| 5   | Target 5: "A small typed `Scope`, not a bag — `{ me, you, it, event, owner, locals, globals }` plus `elementVars(owner)`, with an explicit `child()`"           | `CoreExecutionContext` (`types/core-context.ts:26-52`) is ALREADY exactly that shape. What `ExecutionContext` adds on top (`base-types.ts:187-233`) splits three ways: **dead** — `meta` (0 reads; the bridge writes it), `events` (0 code reads; two doc examples); **live** — `variables` (7 production files: `core/context.ts`, `js.ts`, `pseudo-command.ts`, `make.ts`, `variable-access.ts`, `beep.ts`, `features/def.ts`), `parent` (the scope-chain walk in `getContextValue`), `owner`, `result`, `registry`, `registerCleanup`; **dead** — the five readonly legacy flags (`halted`/`returned`/`broke`/`continued`/`async`) have zero reads, and the `flags` object is only CREATED by `createContext`/`createChildContext` and copied by the snapshot/clone helpers in `core/context.ts:324-383` — nothing reads a flag since Arc 4a made every signal a Result (measured 2026-09-04, step 0's first row, done early). `elementVars(owner)` does not exist: element variables are `elementScopes` (a `WeakMap`) behind `getElementVar`/`setElementVar` in `core/context.ts:23-71`, which also notify reactivity. | materially incomplete |
| 6   | "`createContext`/`createChildContext`/`ensureContext` keep their names"                                                                                       | 18 / 1 / 9 production call sites; `ensureContext`'s nine are all compatibility bundle entry points.                                                                                                                                                                                                                                                                                                                                                                       | holds                 |
| 7   | "Gate: a `scope-shape.test.ts` pinning the interface; the escape ratchet; the layering ratchet"                                                                | No such test. `runtime/context-bridge.test.ts` (208 lines) pins `toTyped`/`fromTyped` and dies with the bridge; `core/context.test.ts` and `def-execution.test.ts`'s "production context shape" describe pin what survives.                                                                                                                                                                                                                                              | holds (test to write) |
| 8   | "`HyperfixiPluginContext` gains `runtime.globals` hooks; nothing is removed from it"                                                                            | It carries `commandRegistry`, `parserExtensions`, `runtime`. Adding is free; removing `parserExtensions` would break reactivity's wiring (claim 3).                                                                                                                                                                                                                                                                                                                       | holds                 |
| 9   | Arc 4b's justification list: "the `ContextBridge` per-command copy" is 4b's deletion                                                                          | It is 4c's (the 4b brief already struck it). Recorded here so 4c is credited with its own win: the copy is two object spreads per command execution, plus the ballast in claim 1.                                                                                                                                                                                                                                                                                         | **false** (as filed)  |

## The real shape of the work

**The bridge falls in two steps, not one.** Three fields are write-only and
can go today; the fourth, `evaluationHistory`, has readers in the comparison
expressions and the base-expression class, and they are the `Date.now()`
pair on every `is` that target item 7 makes opt-in. So: delete the ballast
first (claim 1 → a smaller bridge), then make evaluation tracking an opt-in
devtools wrapper on the `Runtime`, then delete the field, and the bridge has
nothing left to add — `TypedExecutionContext` collapses into
`ExecutionContext` and the per-command copy is a single line to remove.

**`Scope` is a rename of what exists, minus the dead half.** `CoreExecutionContext`
IS the target shape. The arc's actual decisions are about the layer on top:
`variables` is live and stays (or its seven readers migrate to `locals` —
a behaviour question, not a types edit); `meta`/`events` go; the flags need
their measurement. A `child()` method is the wrong shape for an object the
codebase spreads (`{ ...context, me: el }` in `tell`, `fnContext` in
`installFunction`, every observer context) — keep the free functions
(`createChildContext`, `getElementVar`) and drop the method wording from
the target.

**The Proxy is five allocations per context for zero readers.** Deleting it is
a two-line change in `enhanceContext` and a decision about the
`ContextProviderRegistry` API (claim 2). Measure with the hot-path bench
(step 0's guard) before and after: it is the one 4c change that could show
above noise.

**The hook move removes two layering edges, not five.** The three
node-writer edges are a separate registry (`getRegisteredNodeWriter`) that
the plan never scheduled; file them under Arc 7 or 6b, do not fold them
into 4c.

## Decisions to put to the owner before the first PR

> **All four DECIDED 2026-09-04, each as recommended** (keep `variables`;
> tracking → opt-in sink; `Scope` = plain object + free functions; delete
> `ContextProviderRegistry` with the Proxy). Steps 2–5 proceed on them.

1. **`variables`**: keep as a live field of `Scope` (recommended — seven
   readers, one of them `def`'s closure capture) or migrate its readers onto
   `locals` first (a separate arc; behaviour, not types).
2. **`evaluationHistory` / evaluation tracking**: make it an opt-in devtools
   wrapper on the `Runtime` (recommended; target item 7, and it is what lets
   the bridge die) or keep the field and only delete the three ballast fields.
3. **`Scope` as a plain object with free functions** (recommended) or a class
   with `child()`/`elementVars()` methods. The codebase spreads contexts in at
   least four places; methods do not survive a spread.
4. **`ContextProviderRegistry`**: keep the API with `enhance()` no longer on
   the hot path, or delete it outright. The plan's named consumer,
   server-integration, is not under `packages/` any more (measured
   2026-09-04), and no other production caller registers a provider — so the
   recommendation is now DELETE (with the `Proxy`), as an exported-surface
   removal that goes on the 6b list if the owner wants a 4.0 boundary for it.
5. **The flags** (`halted`/`returned`/`broke`/`continued`/`async` + `flags`):
   measured unread (claim 5) — they go with `meta`/`events` in step 1. No
   decision left, recorded for the record.

## Recommended order

| step | does                                                                                                                                                                                                                        | gate it leaves                                                                     | size |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---- |
| 0    | ~~Measure the unmeasured: `.flags`/legacy-flag reads, server-integration's use of context providers~~ (both measured 2026-09-04: the flags are unread; there is NO `server-integration` package under `packages/` any more, so decision 4's only named consumer does not exist), and bench `enhanceContext` (5 Proxies) on the hot path. Commit `scope-shape.test.ts` pinning `CoreExecutionContext` as the shape `Scope` will be. | `scope-shape.test.ts`; the numbers in the plan                                     | S    |
| 1 ✅  | Delete the write-only ballast (`expressionStack`, `evaluationDepth`, `validationMode`) and the dead fields (`meta`, `events`, and the flags if step 0 says so) from the types, the bridge, the factories and `context-bridge.test.ts`.              | escape ratchet down; bridge test shrinks                                           | S    |
| 2 ✅  | Evaluation tracking → opt-in devtools wrapper on `Runtime`; `trackEvaluation`/`trackPerformance` read it from the runtime, not the context; delete `evaluationHistory`; `TypedExecutionContext = ExecutionContext`; delete `ContextBridge` and the per-command copy. | bench (the copy is gone); `context-bridge.test.ts` deleted; output-contract untouched | M    |
| 3    | `enhanceContext` returns the context; the Proxy and the five allocations go; `ContextProviderRegistry.enhance()` stays callable but uncalled (decision 4).                                                                    | bench; a test that no Proxy is created                                             | S    |
| 4    | The two global/local hook edges move to `core/context.ts` (or `runtime/`); `parserExtensions.register*Hook` delegates to the runtime; layering ratchet loses two upward edges. The three node-writer edges are FILED, not moved. | layering ratchet                                                                   | M    |
| 5    | `Scope` named: `export type Scope = …` with `ExecutionContext` as its alias on the public surface; `createChildContext`/`getElementVar` documented as the `child()`/`elementVars()` of the target; target item 5's method wording struck.        | `scope-shape.test.ts` re-pinned                                                    | S    |

Steps 1–3 each delete something and each keep the control-flow matrix and
the output-contract gate still; step 2 is where the per-command cost the
plan promised for 4b actually leaves.

## Gates, per PR

- `control-flow-matrix.test.ts` (unchanged), `command-output-contract.test.ts`
  (unchanged — its 29 disagreements are context CONSTRUCTION, and step 2
  does not touch what `it` starts as; if a step here wants to close them,
  that is a decision to write down, not a side effect).
- core `test:check`, the testing-framework gate, the three ratchets, lint,
  `npm run bench:check` (steps 2 and 3 are the ones expected to move it —
  upward).

## Traps

- **`variables` looks dead by name and is not.** Seven production readers,
  including `def.ts`'s closure capture. Grep before deleting any context
  field; the census found `meta` and `events` dead and `variables` live by
  the same grep.
- **`evaluationHistory` collides with private class fields** of the same name
  in six `features/*.ts` files. Grep `context.evaluationHistory`, not the
  bare word.
- **Downstream packages will not see a rename; they WILL see a shape change.**
  Their own `ExecutionContext` interfaces name `me`/`you`/`it`/…; dropping
  one of those fields from core's objects breaks them silently at runtime.
- **The Proxy is on the hot path five times.** Do not delete it without the
  bench before/after; it is the one number 4c can claim.
- **A probe on a stacked branch under-reports.** These numbers are from the
  tree with #1091 and steps 3/4 applied; re-run the greps on `main` before
  the first 4c PR.
