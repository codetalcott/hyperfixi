# Arc 3 brief — grammar into the parser

> Written 2026-09-02 on `2b1a6f22`, the commit that closed Arc 2, opening Arc 3
> of [ENGINE_MIGRATION_PLAN.md](./ENGINE_MIGRATION_PLAN.md). The plan asks
> every arc to open with a brief that **re-measures the plan's own claims on the
> then-current tree**; Arc 2's found four of seven false. This one scores
> **fourteen claims: eight hold, three are false, three are materially
> incomplete** — and, as in Arc 2, the false ones all concern WHERE the work is
> and HOW MUCH of it there is, not what it is.
>
> Read the plan's Arc 3 section for intent; read this for the numbers. Nothing
> here has been started. The plan's rule stands: re-measure before costing, and
> when a measurement falsifies a written claim, correct the doc in the same PR,
> struck through in place.

## How to re-measure

```bash
cd packages/core
node scripts/check-type-escapes.cjs                          # from the repo root: 927
npx tsx tools/triage-parse-paths.ts | grep -E 'same|differ|both-fail|marker-in-args'
                                                             # 140 · 77 · 19 · marker-in-args 13
grep -c "^\s*ast:" ../semantic/src/generators/command-schemas.ts   # 47 schema `ast` descriptors
npm run check:mapper-parity --prefix packages/semantic       # the cross-package fixture
```

The `parseInput` census below is a brace-matched scan of every
`parseInput(` body under `src/commands/` (non-test), counting `if (` / `case` /
`?:` as branches. It is a one-off script, not a committed tool — **step 1's
first deliverable is to commit it**, because its numbers are the ratchet.

## The plan's claims, scored

| # | Arc 3 claim | measured 2026-09-02 | verdict |
| - | ----------- | ------------------- | ------- |
| 1 | step 1: "each of the **51** `parseInput`s" | **51** bodies — 45 in decorated classes, 3 in abstract bases (`insertion-base`, `signal-base`, `visibility-base`, inherited by 7 commands), 3 in undecorated classes (`install`, `render`, `pseudo-command`). 2,485 lines, 361 branches. | ✅ holds |
| 2 | step 2: "the existing input unions (**46 files** already have one)" | **77** exported `*Input` types across the command tree; only **7** are discriminated unions (`Insertion`, `Remove`, `Add`, `Toggle`, `Set`, `Default`, `Clear`). 46 corresponds to nothing measurable. | ❌ **the shapes exist; the count and the word "union" do not** |
| 3 | step 2: `ToggleCommandInput` carries `HTMLElement[]` and `duration: number` | verified (`targets: HTMLElement[]`, `duration?: number`). **26 files** carry resolved `HTMLElement` fields in their input type. | ✅ holds |
| 4 | step 2: "`CommandNode` becomes `CommandNode<K extends CommandName>`" | **no `CommandName` type exists.** `manifest.ts` declares `COMMAND_NAMES: readonly string[]` — a widened array, not `as const` — so `K` cannot be derived from it today. | ⚠️ **needs a manifest change first** |
| 5 | step 2: "`parseToggleCommand` in `command-parsers/dom-commands.ts` emits the node; `command-node-builder.ts` builds it" | both exist. **29** `parseXxxCommand` functions in 8 files, 169 tests; the builder emits `args` / `modifiers` / `body` / `implicitTarget` / `originalCommand`. | ✅ holds |
| 6 | step 3: migration order "toggle, swap, put, repeat, set, pick, pseudo-command, process, take, add, trigger, remove, install, transition, default, if, measure, clear, js, render" | sizes: toggle **244**, swap 199, put 153, repeat 127, set 123, pick 106, pseudo-command 104, **morph 104**, process 82, transition 75, take 72, add 67, trigger 63, remove 63, install 57, default 54, if 53, measure 52, js 42, clear 40, render 39. Order holds to within a swap or two; **`morph` (8th) is missing from the list.** | ⚠️ holds, one omission |
| 7 | step 4: "the **28** generic-loop commands" | **25**, and there are **two** generic loops: 23 commands fall through `parseCommandCore`'s own tail loop (`parser.ts:3790`, expression-based, with the `continuationKeywords` array), and 2 (`push`, `replace`) are `COMPOUND_COMMANDS` members with no `case` and reach `parseRegularCommand` (`utility-commands.ts:134`, primary-based) through the switch's `default`. | ❌ **25 not 28, and two loops not one** |
| 8 | step 5: the deletion list `continuationKeywords`, `KEYWORD_PREPOSITIONS`, `filterPrepositions`, `fallbackModifierKey`, `resolveTargetsFromArgs`, `COMPOUND_COMMANDS` / `isCompoundCommand` | all exist. Caller counts (non-test files): `continuationKeywords` is a **local array** inside `parseCommandCore` (1 site); `KEYWORD_PREPOSITIONS` 1 def / 1 use (`element-resolution.ts`); `filterPrepositions` and `fallbackModifierKey` are **option flags, not functions** — 11 files each; `resolveTargetsFromArgs` **14 files, including `expressions/references/index.ts`** (an expression module reading command args); `COMPOUND_COMMANDS` has **23 members** (not 13 — the earlier count stopped at a `]` inside a comment), 12 files; `isCompoundCommand` 3. | ✅ holds — with counts |
| 9 | gates: `command-output-contract`, `compound-command-coverage`, `selector-shape`, the R2 execution subset, the shipped-examples allowlist | all exist. `compound-command-coverage` asserts `PROBES ≡ COMPOUND_COMMANDS` (every member has a probe). The shipped-examples baseline holds **33** `allowedDivergences` keyed `file::<hash>::event` — the "keys embed source hashes" claim holds. **The R2 subset is 41 ids, not the 47 `CLAUDE.md` states.** | ✅ holds; one stale doc number |
| 10 | blast radius: "semantic's mappers (cross-package PR pairs, **~50** of them)" | Arc F already moved **43 of 47** mappers to declarative schema `ast` descriptors (47 `ast:` fields in `command-schemas.ts`), so a command's mapper "pair" is a descriptor edit + fixture regen, not a mapper rewrite. The parity fixture covers **51** actions = 44 commands + 7 features. **15 manifest commands have no mapper at all** and fall to `buildGenericCommand`'s blanket role→preposition map; `pseudo-command` and `start` have **no schema**. | ⚠️ **smaller and differently shaped than planned** |
| 11 | blast radius: `ast-utils` "already duck-type `args`, so they keep working — add a test" | 14 `.args` reads in `ast-utils/`; `real-ast.test.ts` touches `args` twice. Plausible; the test is still owed. | ✅ holds |
| 12 | blast radius: "LSP completions and `reference/index.ts` are metadata, untouched" | both language-server packages: **0** `.args` reads. ✅. But the plan lists no other downstream consumer, and **`aot-compiler` reads `.args` 52 times** (`command-transforms.ts` alone 34, switching on 21 preposition/unit literals — `into`, `before`, `ms`, `html`…) and **`vite-plugin/src/compiler.ts` 12 times**. Per-command `args` shapes break both. | ❌ **two consumers omitted** |
| 13 | "argue on maintainability, not speed" — 1.03–1.05× | recorded on the arc and in Arc 0's history; nothing to re-measure. | ✅ holds |
| 14 | step 1's **A** class "absorbs the semantic front-end's shapes — dies with Arc 1 step 6" | Arc 1 step 6 is **unblocked but not executed**: `trySemanticParse` still runs at `parser.ts:3663` for every English command not on its 27-name skip list, and `semantic-integration.ts` is 1,102 lines. Nine command files carry path-shape comments (26 lines); `toggle`'s `*display` recovery (`toggle.ts:288–322`, "Semantic parser may split `*display` … may drop property name entirely — recover from modifier value") is the canonical A branch. | ⚠️ **true only if Arc 1 step 6 lands first — a sequencing decision, below** |

## The real shape of the work

### The census (step 1's ratchet, measured once by hand)

| signal | count | what it says |
| ------ | ----- | ------------ |
| `parseInput` bodies | 51 | over 59 commands: `increment`/`decrement`, `trigger`/`send`, `if`/`unless` share a body and branch on `raw.commandName` (4 bodies do); 7 inherit from 3 bases |
| lines | 2,485 | the plan's "grammar re-derived at runtime in ~50 hand-written places" |
| branches (`if`/`case`/`?:`) | 361 | put 34 · toggle 30 · repeat 30 · swap 27 · pick 21 · set 20 · pseudo-command 16 · morph 15 |
| value-evaluation calls | 101 | `evaluator.evaluate` / `resolveTargetsFromArgs` / `resolveTargetElements` / `parseTemporalModifiers` — the **V** class |
| `raw.modifiers.<key>` reads | 114 | **37 distinct keys**: `on` 21 · `for` 15 · `to` 12 · `from` 10 · `viewTransition` 7 · `with` 6 · `as` 6 · `variant` 5 · `until` 5 · `transitionName` 5 · `count` 5 · … — this table IS the declared grammar step 4 wants, written today as reads |
| positional `args[i]` reads | 97 | the **S** class's other half: position-as-syntax |
| keyword-name compares (`.name === 'between'`, `'on'`, `'from'`…) | 25 | **S**, and the `marker-in-args` linkage below |

So the S/V/A split the plan asks for is roughly: ~120 syntax sites (positional
reads + keyword compares), ~215 value sites (evaluations + modifier reads),
and A confined to 9 files. Commit the census as the step-1 test; the table
above is its first row.

### Two generic loops, and what actually reaches each

The plan says "the generic loop". There are two, and the dispatch that feeds
them is spread across three places:

| route | where | commands |
| ----- | ----- | -------- |
| keyword branches in `parseCommandCore` | `parser.ts:3729–3790` | `fetch`, `repeat`, `if`/`unless`, `wait`, `install`, `transition`, `add`, `increment`/`decrement` (10), plus `for` (a parser command that is NOT in the manifest) |
| `MULTI_WORD_PATTERNS` | `helpers/parsing-helpers.ts:18` | `append`, `prepend`, `make`, `throw` (4) |
| `COMPOUND_COMMANDS` → `parseCompoundCommand` switch | `parser-constants.ts:140` → `utility-commands.ts:53` | 20 with a `case`: put trigger send remove take toggle set halt measure js go scroll tell pick start swap morph show hide process |
| the switch's `default` → `parseRegularCommand` | `utility-commands.ts:134` | `push`, `replace` (members with no case — primary-based loop, no modifiers) |
| `parseCommandCore`'s tail loop | `parser.ts:3790` | the other **23**: async beep blur break breakpoint call clear close continue copy default empty exit focus get log open pseudo-command render reset return select settle — expression-based, `continuationKeywords` (`into from to with by at before after over`), returns a bare `{ type, name, args, isBlocking: false }` with **no modifiers** |

`add` is in `COMPOUND_COMMANDS` with no `case` — harmless only because its
keyword branch runs first. `pseudo-command` is not parsed by any of these: it
is **constructed** by `createPseudoCommandNode` (`parser.ts:2437`) from a call
expression, so it has no parser to migrate and no semantic schema.
`CONTROL_FLOW_COMMANDS` lists `while`, which is not a command anywhere.

### The dedicated parsers push MARKER WORDS INTO `args` — and that is the open convergence family

`parseToggleCommand` pushes `between`, `and` and `on`/`from` into `args` as
identifier nodes (`ctx.createIdentifier('between')`, `consumeKeywordToArgs`,
`consumeOneOfKeywordsToArgs` — **19 such sites** in `dom-commands.ts` and
`async-commands.ts`), and `ToggleCommand.parseInput` then re-discriminates on
`firstArgName === 'between'` and skips `'on'`/`'from'` by name. The parser
already KNOWS the syntax — it consumed the keyword — and then throws that
knowledge away by encoding it as an argument for the command to rediscover.

That is exactly the `marker-in-args` family the convergence detour left open:
**13 sources**, the only family still blocked, "on Arc 2" (which is now done).
The semantic path puts the destination in `modifiers.on`; the traditional path
puts `on` and the target both in `args`. Step 2's typed node has a
`destination` slot and no marker word in it, so **Arc 3 closes
`marker-in-args` by construction, one command at a time** — it should not be
opened as a separate convergence item first. When a command migrates, expect
its rows to leave the family; that is a review-artifact diff, not a
regression.

### What a per-command PR actually touches (the cross-package half is smaller than planned)

For one command, on today's tree:

1. Its parser (`command-parsers/*.ts`, or a new one for a generic-loop
   command) emits the typed node.
2. Its `parseInput` shrinks to slot evaluation; its `*Input` type moves up a
   layer.
3. `ast-equivalence.json` rows for that command move — **regenerate under
   review** (`npm run baseline:ast-equivalence --prefix packages/core`; the
   test's own comment names Arc 3 as the intended case). Per-command row
   count is that command's `metadata.examples` count: **2–6 each, 191 total
   over 54 commands** (the corpus's 236 sources are those plus 28 hand-written
   plus features).
4. In `packages/semantic`: the schema's `ast:` descriptor (47 of 78 schemas
   have one), then `npm run generate:mapper-parity`. For the 15 manifest
   commands with **no** mapper — beep break breakpoint clear close copy empty
   exit pseudo-command push render replace reset select start — the migration
   ADDS a descriptor, and for `pseudo-command` and `start` a schema.
5. `aot-compiler/src/transforms/command-transforms.ts` and
   `vite-plugin/src/compiler.ts` if they read that command's `args`.

Item 4 is the "~50 cross-package PR pairs" — real, but each is a descriptor
line and a fixture regen, not the mapper rewrite the plan's wording implies.
Item 5 is what the plan missed.

## Decisions to put to the owner before the first command lands

1. **Sequence Arc 1 step 6 first, or carry the A branches through?** The plan's
   A class "dies with Arc 1 step 6". Step 6 is unblocked but not done, and
   semantic-first is live for English. If Arc 3 starts first, each migrated
   command's typed parser has to either reproduce the semantic path's shape
   tolerance (`*` + separate identifier for `*display`; destination in
   `modifiers.on` with the property name in it) or stop accepting it — and the
   AST-equivalence gate pins the TRADITIONAL parse only, so a semantic-path
   regression would surface in the multilingual gate and `triage-parse-paths`,
   not the snapshot. **Recommendation: land Arc 1 step 6 first.** It is a
   deletion with a whole-program fallback already implemented in
   `compileAsync`; it removes the second producer of English ASTs; and it
   takes A to zero before step 1's census is committed, so the census never
   has to classify it.
2. **Step 4's grammar source: (a) core-local arg spec vs (b) reuse semantic's
   schemas via `@lokascript/intent`.** The measurement that bears on it: the 37
   modifier keys and their read counts above are already a complete de-facto
   grammar for the V slots, and semantic's schemas carry `svoPosition` (108),
   `markerOverride` (47), `argSkipTokens` (8) and `valueShape` (9) for the
   same commands. They describe the same thing from two sides.
   **Recommendation stands: (a)**, with the parity test the plan already
   specifies — but write the spec in the shape of the modifier-key table, not
   in semantic's role vocabulary, so the engine never has to know what a
   `patient` is. `@lokascript/intent` exports `CommandSchema`/`RoleSpec`/
   `defineCommand`; do not import them into `packages/core` (Arc 1's
   `no-static-semantic-import` gate would catch it, and should).
3. **The `CommandName` type.** Claim 4: `COMMAND_NAMES` is `readonly string[]`.
   Making it `as const` (or deriving a union from the manifest) is a one-line
   change with a ripple through every `string`-typed consumer of it. Do it as
   its own small PR before step 2, so the per-K `args` type has a `K`.
4. **`unless` never executes its body** (`COMMAND_ARCHITECTURE_NEXT_STEPS.md`
   :1075 — `if.ts` hands `unless` an array where `if` gets the block node; the
   test passes on mocks). Arc 3's `if`/`unless` migration is where this gets
   fixed, and the migration's typed node makes the bug unrepresentable. Decide
   whether it waits for its turn in the size order (16th) or jumps the queue
   as a live bug.

## Recommended order

1. **Arc 1 step 6** (decision 1), then the manifest `as const` (decision 3).
2. **Step 1 as written**: commit the census as a test — per-command line and
   branch counts, S/V/A tags, fail on increase. Also commit the modifier-key
   table; it is the declared grammar's first draft.
3. **`toggle` first**, exactly as the plan says — largest, and it exercises
   `between`, `on`/`from`, `as modal`, `*css-prop`, `for <duration>`,
   `until <event>` and the property-target ladder, i.e. every S kind at once.
   Its PR is the template: parser + input type + snapshot rows + semantic
   descriptor + aot/vite readers, one PR. Expect its `marker-in-args` rows to
   close.
4. Then the size table, with `morph` inserted at 8th.
5. The 25 generic-loop commands are step 4's declared grammar; several of
   them (`log`, `call`, `return`, `beep`, `breakpoint`) have `parseInput`
   bodies under 15 lines and will simply lose them.
6. Step 5's deletions, each behind a caller-count test — `resolveTargetsFromArgs`
   is the one to watch, because `expressions/references/index.ts` calls it
   (an expression module reaching into command-argument shapes — Arc 2's
   layering ratchet allows `expressions` → `commands` as same-layer, so
   nothing flags it).

## Gates, per PR

- `npm run typecheck --prefix packages/core`; the three `lint-typecheck`
  ratchets (`check-type-escapes` 927, layering, semantic boundary).
- Core suite (8,075 today; 2,605 of them are command tests in 111 files,
  169 are parser tests).
- `ast-equivalence.test.ts` — **red on purpose** for the migrated command;
  regenerate in the same PR and review the diff.
- `command-output-contract` (6 cases), `compound-command-coverage` (it will
  need a probe REMOVED when a command leaves `COMPOUND_COMMANDS`),
  `selector-shape`.
- `npm run check:mapper-parity --prefix packages/semantic` after the
  descriptor edit; the semantic suite.
- The multilingual `--regression` gate, locally, for any parser or schema
  change (`CLAUDE.md` § "Running the multilingual `--regression` gate
  locally"). The R2 curated subset is **41** ids.
- `npx tsx tools/triage-parse-paths.ts` — `marker-in-args` should go DOWN.
- `npm run verify:reference --prefix packages/core` and `docs:commands:check`
  if any `commandMeta` changes (syntax strings are metadata; the arc should
  not need to touch them, and if it does, that is a finding).

## Traps

- **Do not regenerate `ast-equivalence.json` to make a PR green.** In this arc
  it goes red by design, but only for the command being migrated. A row moving
  for a command the PR did not touch is a regression, and the diff is where
  you find it.
- **The census script is not committed.** Its numbers above were measured by
  a one-off brace-matcher; step 1's job is to make it a test. Until then,
  nothing ratchets.
- **`COMPOUND_COMMANDS` is 23, not 13.** A regex that stops at the first `]`
  reads 13, because the set's comments contain `[strategy]` and `[over]`. Read
  the file, not a match.
- **`CLAUDE.md`'s "47 curated ids" for R2 is stale (41).** Arc 3 will touch the
  subset lock; update the doc when it does.
- **Two declarations of the raw input shape disagree**:
  `command-adapter.ts:80` types `modifiers` as `Record<string, unknown>`,
  every command types it `Record<string, ExpressionNode>`. Step 2 replaces
  both with the typed node; do not "fix" one to match the other on the way.
- **A probe on a stacked branch under-reports** (Arc 2 step 6 measured 63,
  then 117 on the merged tree). Every number here is from `2b1a6f22` with
  nothing stacked; re-run the triage tool before costing the first command.
