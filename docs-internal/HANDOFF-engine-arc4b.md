# Arc 4b brief — compile to closures

> Written 2026-09-04 on `c2297bc8` + #1086 (the slice that closed Arc 4a),
> opening Arc 4b of [ENGINE_MIGRATION_PLAN.md](./ENGINE_MIGRATION_PLAN.md).
> The plan asks every arc to open with a brief that **re-measures the plan's
> own claims on the then-current tree**; Arc 2's found four of seven false,
> Arc 3's three of fourteen. This one scores **eleven claims: five hold, three
> are false, three are materially incomplete** — and, as before, the false
> ones concern WHERE the deletion lands and WHAT the gate measures, not what
> the work is.
>
> Read the plan's Arc 4 section for intent; read this for the numbers. Nothing
> here has been started. The plan's rule stands: re-measure before costing,
> and when a measurement falsifies a written claim, correct the doc in the
> same PR, struck through in place.

## How to re-measure

```bash
cd packages/core
grep -rn "_runtimeExecute" src --include='*.ts' | grep -v "test" | wc -l     # 6 (1 producer, 5 consumer sites)
grep -rln "parseInput(" src/commands --include='*.ts' | grep -v "test\|index.ts" | wc -l   # 50
grep -rln "raw\.slots\|CommandRaw<" src/commands --include='*.ts' | grep -v test | wc -l    # 48
grep -rn "adapter.execute(\|\.execute(context)" src/runtime src/commands --include='*.ts' | grep -v test
npx vitest bench bench/hot-path.bench.ts --run              # numbers below
npx vitest run src/runtime/__tests__/control-flow-matrix.test.ts   # 35 cells, must not move
```

## The plan's claims, scored

| #   | Arc 4b claim                                                                                                                                                            | measured 2026-09-04                                                                                                                                                                                                                                                                                                                                                                                                                              | verdict                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| 1   | "`CommandAdapterV2` becomes the strangler seam"                                                                                                                         | `adapter.execute` has exactly ONE production caller, `processCommandWithResult` (`runtime-base.ts`), reached from `executeNode`'s `command` arm. Its per-execution stages, in order: `beforeExecute` hook → `shouldIntercept` → `ContextBridge.toTyped` (copies 12 fields, adds 4 tracking fields) → `when`/`where` guard → `parseInput` → `execute` (2-arg, or legacy 3-arg) → `ContextBridge.fromTyped` (copies 10 back) → `afterExecute`. 602-line file. | holds                      |
| 2   | "a command with a legacy `parseInput` gets `compile = node => scope => execute(await parseInput(…))`; a **migrated** command's `compile` binds once"                    | No command has a `compile`. Arc 3 migrated SYNTAX (48 of 50 `parseInput` files read `raw.slots`), but all 50 `parseInput`s still run per execution to evaluate the slots. In 4b's sense **0 of 59** commands are migrated; the strangler starts at 100 % legacy and the plan's "the commands Arc 3 has migrated (it binds them)" conflates two migrations.                                                                                              | materially incomplete      |
| 3   | "The API's `ASTCache` becomes a Program cache with the same key (`lang\0trad\0code`)"                                                                                   | The key has FOUR parts: `` `${lang}\0${trad}\0${semantic ? 1 : 0}\0${code}` `` (`hyperscript-api.ts`). It stores `CompileResult { ok, ast, errors, meta }`; 500 entries; FIFO eviction with move-to-end on hit (LRU-like, the comment says FIFO); failures never cached. `ast-cache.test.ts` pins hits/misses/key separation and **never exercises eviction** (its own comment admits it).                                                          | false (key), holds (shape) |
| 4   | "The `_runtimeExecute` channel is replaced by `compile` handing block-body `Op`s to `if`/`repeat`/`tell`/`start-view-transition` (four commands)"                        | 1 producer (`executeNode`), 5 consumer sites in exactly those 4 commands (`if` twice). Since #1086 the hook returns `ExecutionResult`. A SIXTH body-runner, `async`, takes only functions or `{ execute }` objects, throws on anything else, has no parser entry, and never touches the hook — an API-only path, not a fifth compile target.                                                                                                        | holds                      |
| 5   | "Gate: `command-output-contract` collapses to one path"                                                                                                                 | The gate's two paths are the `then`-sequence and the event-handler body, and its pinned 29 disagreements (of 47) are ALL the initial-value family: `it` starts `null` in a sequence context and as the DOM event in a handler. That is a CONTEXT-CONSTRUCTION difference — `Scope`, Arc 4c — which 4b does not touch. The gate stays as the wrapper-leak ratchet; nothing in 4b collapses it.                                                     | **false**                  |
| 6   | "Not 'Arc 0's benchmark improves' … treat the benchmark as a REGRESSION guard"                                                                                          | Re-measured today: `compile + execute` 119 k hz vs `execute only` 109 k hz (the cache hit; compile+execute is nominally FASTER — noise), `toggle` (242-line `parseInput`) 237 k hz vs `add` (66) 198 k hz. Both findings hold. But there is **no committed numeric baseline**: the numbers live in a header comment, `bench:ci` is nightly with `continue-on-error`, and nothing compares runs. A guard without a baseline is a sentence.       | holds; guard does not exist |
| 7   | "take the arc's justification from what it DELETES: the `ContextBridge` per-command copy, the `_runtimeExecute` channel, and the dual execution paths"                   | The next paragraph (4c) assigns the `ContextBridge.toTyped/fromTyped` deletion to 4c. 4b can delete the hook and the dual paths; the copy is 4c's, and 4b must not pay for it twice.                                                                                                                                                                                                                                                             | materially incomplete      |
| 8   | "dual execution paths"                                                                                                                                                  | Three, not two, and only one is reachable from parsed code. (a) `processCommandWithResult` → adapter (the only path an AST node takes); (b) direct `cmd.execute(context)` on already-built command INSTANCES in `if`, `repeat`, `tell`, `async`; (c) bare functions / echoed values in the same four. (b) and (c) exist for direct API callers; grep finds no production caller passing them, only hand-built tests (30 mock sites in 5 files, adapted in #1086). | materially incomplete      |
| 9   | Target design 3: "Block bodies are closures handed to `if`/`repeat`/`tell` at compile time, so no command re-enters the runtime through a variable map"                 | Today each of the four accepts FOUR body shapes (block node via the hook, array of AST nodes, functions, `{ execute }` objects, plus bare values echoed back). The Op hand-off replaces all of them — which is the deletion, and the reason those five test suites move again.                                                                                                                                                                       | holds                      |
| 10  | "`compile(ast, runtime): Program`, with `Program.run(scope)`"                                                                                                           | No `Program`, `Op`, `Scope` or `compile(` symbol exists in `src` (only `ProgramNode`, the AST). `Scope` is 4c's; 4b's `Program.run` takes today's `ExecutionContext` and its signature changes once more in 4c. Say so in the type's doc, not in a release note.                                                                                                                                                                                | holds (vocabulary is new)  |
| 11  | Target design 4: "`Completion` — `{ kind: 'normal' \| 'halt' \| … , value? }` — is what every `Op` returns"                                                              | Arc 4a settled the protocol as `ExecutionResult<T>` = `ok(value) \| err(signal)` with `Completion<T> = T \| ExecutionSignal` for a command's own return. A `{ kind: 'normal' }` object would be a rename with zero readers. Keep the Result form; strike the target's wording.                                                                                                                                                                    | superseded by 4a           |

## The real shape of the work

**What an `Op` is.** `type Op = (ctx: ExecutionContext) => Promise<ExecutionResult<unknown>>` —
exactly what `executeNode` returns today for one node, bound to that node
once. `Program = { run: Op }`. Nothing about the protocol changes; #1086
already made every loop read it.

**Where compile happens.** A `compile(node, runtime): Op` walk over the
STATEMENT tree only: `command` → `adapter.compile(node)`, whose default is the
per-execution closure of claim 1 (hooks, bridge, `parseInput`, `execute`,
bridge back) — behaviour-identical to `processCommandWithResult` by
construction; `block`/`sequence`/`Program` → a sequence Op with the same
signal rules the loops have now; `if`/`repeat`/`tell`/`start view transition`
→ their `compile` receives the body as an Op (or a list of Ops for `repeat`,
which needs per-iteration re-entry); `eventHandler`/`def`/`behavior` init →
the body compiled ONCE at registration, so `createEventHandler`'s
`runCommands` becomes `body(ctx)`. Expressions are NOT compiled in this arc:
`evaluateAST` (24 arms, no cache, no precompile today) stays the evaluator
inside every Op; that is Arc 7's table-entry work and the target's item 7.

**Where the win is.** Not speed — claim 6 re-measured it. Deletion:
the hook and its `locals` back-channel; the four body shapes in four commands
(twelve branches); `LoopResult.signal` (the loop executor returns the body's
Result); the `AsyncCommandItem` function/object protocol if `async` is given
a parse or deleted (decision 4); and, in 4c, the bridge copy that every Op
would otherwise still pay.

**What 4b cannot claim.** The output-contract gate (claim 5) and the
`ContextBridge` copy (claim 7). Both are 4c's. A 4b PR that touches either
is scope creep by the plan's own text.

## Decisions to put to the owner before the first PR

1. **Op protocol: keep `ExecutionResult`** (recommended) or introduce the
   target's `{ kind: 'normal', … }`. The Result form has every reader; the
   `kind` form has none. Recommendation: keep, and strike target item 4's
   object wording in the same PR.
2. **Strangler granularity: statements only** (recommended) or statements +
   expressions. Compiling expressions is a rewrite of a 24-arm evaluator
   plus 6 expression categories with no measured cost to remove (claim 6);
   Arc 7 owns it.
3. **The three API-only body shapes (functions, `{ execute }` objects, echoed
   values) in `if`/`repeat`/`tell`: delete with the hook** (recommended) or
   keep behind an adapter. No production caller passes them; 30 test mocks
   do. Deleting means the five suites move to real parses (the fixture rule
   in `feedback_convert_fixtures_to_real_parses`), which is where they should
   have been.
4. **`async`**: it is a body-runner that no parser feeds. Either give it a
   parse (`async do … end` as a block body, compiled like the other four) or
   list it for 6b. Out of 4b either way; decide so 4b does not half-migrate it.
5. **Bench baseline**: commit `bench/baseline.json` with a tolerance (step 0)
   so "closures must not make execution slower" is a check, not a sentence.
   The nightly `bench:ci` output is a trend, never a gate; this would be the
   first execution-time gate in the repo — say whether that is wanted on PRs
   (it costs a ~3 s bench per PR and a tolerance wide enough for CI noise,
   ±15 % at the measured rme of 2–4 %) or nightly-only with a hard fail.

## Recommended order

| step | does                                                                                                                                                                                                                                                  | gate it leaves                                                                          | size |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---- |
| 0    | Commit the hot-path numbers as a baseline with a tolerance; a `bench:check` that fails outside it (decision 5 says where it runs).                                                                                                                     | the regression guard exists                                                             | S    |
| 1    | `Op`/`Program` types; `compile()` for the statement tree; `adapter.compile(node)` with the per-execution default; `execute()` becomes `compile(node, this)(ctx)`. No command changes.                                                                | matrix unchanged (35); AST-equivalence untouched; output-contract untouched; bench in tolerance | M    |
| 2    | Block bodies as Ops for the four commands; delete `_runtimeExecute`, the three API-only body shapes, `LoopResult.signal`; the five suites move to real parses.                                                                                        | matrix unchanged; parse-input census shrinks (the body-shape branches leave `parseInput`) | M–L  |
| 3    | Handlers, `def`, behavior init compile their bodies once at registration; `runCommands` becomes `body(ctx)`. **Add the observer row to the matrix first** — #1085 found those loops by reading, not by a test.                                       | matrix +1 row (observer), otherwise unchanged                                           | M    |
| 4    | `ASTCache` → Program cache: the value gains `program`, the four-part key stays, and an eviction test is added (the current suite never crosses 500).                                                                                                  | `ast-cache.test.ts` exercises eviction                                                  | S    |
| 5    | OPTIONAL tail, per command, only where a measurement shows a win: a real `compile` that binds slot evaluators once instead of running `parseInput`. The plan's rule applies — no measured win, no PR. Claim 6 predicts none.                          | bench per command                                                                       | —    |

Steps 1–3 each delete something and each keep the matrix still. Step 5 is
where the target design's `defineCommand({ parse, compile })` shape would
land, and the honest expectation from the numbers is that it lands nowhere.

## Gates, per PR

- `control-flow-matrix.test.ts` — the acceptance test for this arc; a cell
  moving is a finding to write down, never a re-pin without a sentence.
- core `test:check` (7979 today), the testing-framework gate (its R2 lock
  EXECUTES the curated subset through this runtime — it caught nothing in
  4a but it is the only cross-language execution gate), the three ratchets,
  lint, the bench baseline from step 0.
- `command-output-contract.test.ts` must not move in 4b (claim 5).

## Traps

- **A hand-built mock of the hook pins the hook's contract.** #1086 changed
  `_runtimeExecute` to return a Result and 30 mock sites in 5 suites kept
  returning bare values; every one of those tests passed typecheck and 12 of
  them failed only at runtime. Step 2 deletes the hook, so those suites move
  regardless — convert them to real parses rather than re-adapting.
- **A boundary wrapper silently breaks every per-command loop that called
  the public entry.** The observer loops called `execute()` per command and
  no test saw it. Before step 3, grep every `this.execute(`/`runtime.execute(`
  in `runtime-base.ts` and classify each: per-command loop → the dispatcher
  (soon: the body Op); whole program → the boundary.
- **The matrix has no observer row.** Add it before step 3, not after.
- **`grep -E "^ +× "` matches vitest's ✓ lines in some terminals.** Two of
  this session's "failures" were passes. Read the summary line.
- **The bench's contrast row must not write to stdout** (Arc 0's `log`
  artifact, 9.6×). Step 0 inherits `toggle`/`add`.
- **A probe on a stacked branch under-reports.** Every number above is from
  `c2297bc8` with #1086 applied and nothing else stacked.
