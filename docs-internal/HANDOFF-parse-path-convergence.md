# Handoff — converging the two English parse paths (Arc 1, step 5's sequel)

> ## START HERE — fresh-session brief (2026-08-31)
>
> **Queue items 1–5 are DONE and merged (#1016–#1021).** What remains is below;
> paste the block after the `---` into a fresh session. Everything above that
> line is orientation for a human.
>
> **Provenance caveat.** Those six PRs were written AND merged by the agent, on
> the user's explicit instruction, with CI green on every one but **no human
> review**. Four touch `parser/parser.ts` or the adapter — the engine's hottest
> files — and two moved the AST-equivalence baseline. Worth a human read before
> building on them.
>
> ### What is left, in the order I would take it
>
> 1. ~~**`hide <button/>` THROWS on the default path**~~ — **FIXED
>    2026-08-31**, in `packages/semantic`'s `convertSelector`. The filing's
>    recommendation (option 2, core's adapter) was measured WRONG — core's
>    adapter is one of several `buildAST` consumers, and the multilingual
>    bundles and the R2 execution validator bypass it — and its stated blocker
>    for option 1 ("the converter must know the command") was measured false:
>    `raw` is what keeps `make` working, so one command-agnostic shape serves
>    both meanings, exactly as the traditional parser already does. Story and
>    both corrections on the entry in `PARSER_NEXT_STEPS.md`. **It also closed
>    the query-literal half of item 3 below** (`value` family 9 → 3,
>    `field-only-trad:fromQuery` 6 → 0).
> 2. ~~**Item 6 — `implicit-me` (7 rows).**~~ — **DECIDED AND DONE 2026-08-31.**
>    Owner chose: the injected default is **relocated, not duplicated** — held
>    back from `args`/`modifiers` (the SYNTAX surface, which records what the
>    author wrote) and kept on `semanticRoles` (the SEMANTICS surface, where a
>    consumer reads the resolved target). The runtime stays the single
>    executable home of every default. Triage family 7 → 0.
>
>    Three measurements decided it, and the first reframed the question:
>
>    - **The class is 3× bigger than this family.** 22 schema roles across 21
>      commands declare a `default` (20 `me`, plus `by: 1` on
>      increment/decrement). The triage saw only 7 because `toggle`, `add`,
>      `remove`, `increment`, `trigger`, `measure` … are on
>      `skipSemanticParsing` — their injections never reach the core path but DO
>      reach every `buildAST` consumer (multilingual bundles, R2 validator,
>      MCP). So any answer had to be a policy for the class, not a fix for 7
>      rows.
>    - **The runtime already carries every one of them.** All 7 rows execute
>      identically with args empty; `toggle` behaves identically with and
>      without `on: me`; `increment.ts` has `amount = 1`. Injecting into the AST
>      would put the same default table in two live places AND oblige every
>      other AST producer (traditional, hybrid template, lite, AOT) to inject it
>      too, or consumers still could not rely on it.
>    - **The "mark it in the AST" route has a fossil.** Core already has an
>      `implicitTarget` field with builder plumbing (`withImplicitTarget`) and
>      **zero callers, zero readers** — a previous attempt at exactly that,
>      dead on the vine. The mechanism used instead already existed and is live:
>      the matcher's `implicit: true` tag, which the multilingual renderers
>      read to suppress an injected `me` across 24 languages.
>
>    Implementation is one predicate (`isImplicitValue`) applied at the three
>    surfaces that build args/modifiers — `getRole` (covers the declarative
>    `buildFromAstShape` and the hand-written mappers), `goMapper`'s direct
>    reads, and `buildGenericCommand`. `semanticRoles` reads the full role map
>    and is deliberately untouched.
> 3. **Residual item-5 rows** — ~~query-literal VALUE representation
>    (`button` + `fromQuery` vs raw `<button/>`; same root cause as item 1
>    above, so they may close together)~~ **closed with item 1, as predicted**;
>    what remains is the template-literal backticks (`log \`t ${1}\``). The
>    `value` family is now 3 sites: that one, plus the two `settle` `isBlocking`
>    rows the block below marks INERT.
> 4. **Nested argument positions** (36 sites / 10 sources). Blocked on
>    `packages/semantic` tracking spans; filed, not faked.
> 5. **Arc 2 step 2+** — the seven `RENAME_PAIRS` Arc 0 pinned
>    (`binaryExpression`/`binary`, `eventHandler`/`event`, …). Step 1 is done
>    (#1018); this is the actual alias-normalisation work, and it is what the
>    remaining 14 `node-type` differences are.
>
> ### Do not re-derive these
>
> - **`settle`'s `isBlocking` disagreement is INERT.** Real (semantic is right;
>   the traditional generic path hardcodes `false`), but nothing in the
>   monorepo branches on that field. Scored and deliberately left.
> - **`swap`'s `method="over"` is NOT a defect** — it is swapSchema's
>   `methodCarrier` working as designed.
> - **`morph` and `pick`** bind a marker word as a role, but the SEMANTIC parser
>   cannot parse those surfaces either, so there is no oracle for the right
>   shape. Deeper defect; left with reasons.
> - **`tokensConsumed` is input length, not comprehension.** A resync fix keyed
>   on it is measured dead.
>
> ### Traps that cost time this session
>
> - **A convergence triage is blind to defects both paths SHARE.** `same`
>   includes "agree wrongly", and the 27 `skipSemanticParsing` commands can only
>   ever report `same`. Use the triage to SIZE work; use per-consumer audits and
>   EXECUTION to find defects. (The `hide <button/>` throw was found by running
>   the code — both paths produce a plausible selector node; only one is
>   executable.)
> - **A filing's RECOMMENDED FIX SITE ages like its diagnosis does.** The
>   `hide <button/>` entry analysed three sites and picked core's adapter. The
>   adapter is one of at least four `buildAST` consumers, so that fix would have
>   left the multilingual bundles and the R2 execution validator still throwing —
>   in all 24 languages. Before taking a filing's recommendation, grep for the
>   OTHER callers of the function it proposes to wrap. Same class as "a filing's
>   COST estimate ages too".
> - **A gate you were not aiming at is the best evidence a fix is real.** The
>   `agent-bench` phrasing ratchet independently moved a row `warned-wrong →
>   correct`. Read an unexpected ratchet trip before regenerating it: it is
>   equally likely to be your improvement or your regression, and the band names
>   tell you which.
> - **A moved AST-equivalence baseline must be proven before regenerating.**
>   Single-file swap against `main` over the corpus, and check the diff is
>   position-only / structure-only. "A gate regenerated to go green is a gate
>   deleted with extra steps."
> - **`npm run typecheck`, never bare `npx tsc --noEmit`** — only the script
>   covers `tools/`. CI caught a TS2322 that a bare tsc run missed.
> - **The mock in `__test-utils__/parser-context-mock.ts` can turn a logic error
>   into a 4 GB OOM** whose tests come back `pending` while vitest still reports
>   `success: true`. Its `parsePrimary` does not advance the token position, so
>   any consumption loop whose predicate stays true spins forever. If a run
>   exits non-zero with every file "passed", diff per-file test STATUSES against
>   a reverted run.
>
> ---
>
> MISSION: continue the parse-path convergence arc.
> `docs-internal/HANDOFF-parse-path-convergence.md` is the brief and
> `docs-internal/ENGINE_MIGRATION_PLAN.md` is the authority; read this file's
> "START HERE" block first and do not re-derive what it marks as settled.
>
> The LIVE `hide <button/>` bug is FIXED (item 1 above) — start at item 2.
>
> **Re-run the measurement before costing anything** —
> `cd packages/core && npx tsx tools/triage-parse-paths.ts`. After the
> query-literal fix AND the implicit-default fix: same **137** · differ **77** ·
> trad-only 0 · sem-only 0 · both-fail 19, with families `semanticRoles-added`
> 77, `field-only-trad` 194/43, `field-only-sem` 76/48, `node-type` 14,
> `marker-in-args` 12, `position` 36/10, `value` 3, `arity` 1. `implicit-me` is
> gone from the table. These numbers move with every fix; the tool is the
> authority, not this paragraph.
>
> Note the top-line `differ` did NOT move, and that is expected: the fix removed
> difference SITES from sources that still differ in metadata. Read the family
> table, not the headline — the headline was misleading in step 5 too.
>
> A parser change needs the multilingual gate run LOCALLY before pushing
> (~10 min): `npm run test:multilingual:build-deps` → `npm run populate --prefix
> packages/patterns-reference` → `cd packages/testing-framework && npx tsx
> src/multilingual/cli.ts --full --bundle browser-priority --regression`. Do not
> commit the regenerated `patterns.db`. Never `git stash` in this tree.
>
> Every step is a measurement first, and it is allowed to falsify the step.
> That habit produced everything of value here: across six PRs it killed a
> proposed fix, voided a queue item, corrected a filing's own instruction, and
> scored 1 of 9 plan hypotheses correct. When it falsifies something, correct
> the doc in the SAME PR, struck through in place.

**Owner decision, 2026-08-30: converge.** Of the three answers Arc 1 step 5
posed, the owner chose the third — triage the differing ASTs, teach each path
the shapes worth keeping, and only then let step 6 delete the in-loop semantic
attempt. This brief is that arc's step 1: **the measurement**, and it revises
the cost in both directions.

Read `docs-internal/ENGINE_MIGRATION_PLAN.md` Arc 1 and
`docs-internal/HANDOFF-engine-arc1.md` first. This is their sequel, not a
replacement.

## The tool

`packages/core/tools/triage-parse-paths.ts` — committed, not throwaway, because
this arc will span sessions and the numbers move.

```bash
cd packages/core
npx tsx tools/triage-parse-paths.ts              # the summary quoted below
npx tsx tools/triage-parse-paths.ts --kind=value # sources exhibiting one family
npx tsx tools/triage-parse-paths.ts --source=21  # every diff site for one row
npx tsx tools/triage-parse-paths.ts --json       # machine-readable
```

It parses every engine-corpus source both ways, walks both canonicalized trees
in parallel, and classifies each difference site. **Re-run it before costing
anything here** — step 5's headline moved once already.

## The headline was misleading, in both directions

Step 5 reported "107 of 216 sources differ", which reads as 107 decisions. It
is not. The 107 decompose into nine families, and one source usually sits in
three or four of them:

| family | sites | sources | what it is |
| ------ | ----- | ------- | ---------- |
| `position` | 323 | 106 | semantic zeroes `start`/`end`/`line`/`column` |
| `semanticRoles-added` | 101 | 101 | semantic attaches named roles; purely additive |
| `field-only-sem` | 78 | 52 | `selector`, `selectorType`, `dataType` |
| `field-only-trad` | 221 | 48 | `raw`, `fromQuery`, and the position fields again |
| `node-type` | 24 | 23 | different node kind at the same path |
| `marker-in-args` | 19 | 19 | traditional keeps `to`/`url`/`with`/`from` as bare args |
| `value` | 12 | 12 | same shape, different value |
| `implicit-me` | 8 | 8 | semantic injects a `me` target traditional omits |
| `arity` | 6 | 6 | different argument counts |

**45 of the 107 differ ONLY in metadata** (positions, `semanticRoles`, which
optional fields each side emits). Those are not 45 decisions; they are four.

**62 differ structurally** — and those are the arc.

## The finding that reframes the arc

The convergence was framed as reconciling two defensible shapes. It is not,
because **the default path silently drops user code.**

`config.semantic` defaults true, so for the 32 commands NOT on
`parseCommandCore`'s 27-entry `skipSemanticParsing` list, English goes through
the front-end first. When the analyzer matches a PREFIX of the arguments at high
confidence, `skipToCommandBoundary()` eats the remaining tokens — and the tail is
gone, with `ok: true`, no error and no warning:

```
hyperscript.compileSync('on click log "a" is not "b"')
  → ok=true, parser='semantic', warnings=[]
  → log "a"                       ← the comparison is GONE

hyperscript.compileSync('on click log 5 is between 1 and 10')
  → log 5                         ← the range test is GONE

hyperscript.compileSync('on click log 1 + 2 * 3 and true or false')
  → log (1 + 2 * 3)               ← `and true or false` is GONE

hyperscript.compileSync('beep! myValue')
  → beep, args []                 ← the argument is GONE, and the `!` too
```

`if` and `set` are on the skip list, so `if "a" is not "b" then …` is correct —
which is why no suite caught this. Measured: **semantic drops structure in 8
corpus sources** (20, 21, 22, 25, 26, 41, 42, 134; rows 87 and 88 also flag but
are the `go` marker shapes, not losses). Traditional drops in 2 (96, 197 —
`hide <button/>` / `show <button/>` lose the query literal entirely).

**This is the same class as the `and` bug #1013 fixed, and that fix did not
close it.** #1013 deleted one word from `skipToCommandBoundary`'s keyword list;
the mechanism does not need `and`.

**And the resync is not the cause** — measured, after this brief first claimed it
was. Against the real analyzer wiring, `log "a" is not "b"` comes back with
**confidence 1.0**, `tokensConsumed` 5 (the entire input), and roles
`{patient: literal "a"}`. The analyzer claims it understood everything while
modelling a fraction, so `skipToCommandBoundary()` skips exactly what it was
told was consumed. **Driving the resync off `tokensConsumed` — the obvious
fix — is measured dead: that number is already the whole input.** The full table
and the two remaining candidate fixes are in `PARSER_NEXT_STEPS.md`; the short
version is that either confidence has to account for unmatched input, or the
engine has to verify the returned node against the span instead of trusting it.

It is the head of this queue, and it is a live shipped bug, not a refactor.

## Per-family disposition

Each row is one decision, not one per source.

| family | canonical side | why |
| ------ | -------------- | --- |
| `position` | **traditional** | semantic zeroes them; LSP hover/diagnostics and the `ast-equivalence` fingerprints both read positions. Semantic must carry real ones. |
| `semanticRoles-added` | **semantic** | strictly additive, and step 4 just proved the interchange layer wants exactly this — it reconstructs roles from positional args precisely because the engine AST lacks them. |
| `marker-in-args` | **semantic** | `default myVar to "x"`, `push url "/p"`, `replace url "/p" with title "T"` — traditional leaves the markers as bare identifier args. This is also the root cause of the role-binding defect filed during step 4 (`destination` binding to the word `on`), so converging here **deletes that defect** rather than needing a separate fix, exactly as predicted. |
| `implicit-me` | **undecided — cheapest to defer** | `blur`, `close`, `focus`, `open`, `reset`, `settle` with no target: semantic injects `me`, traditional leaves args empty and the runtime defaults at execution. One question: does the default belong in the AST or the runtime? Note the multilingual renderers already distinguish matcher-injected `me`, so precedent exists for tracking it. |
| `field-only-*` | **keep both, then prune in Arc 2** | `raw`/`fromQuery` (traditional) and `selector`/`selectorType`/`dataType` (semantic) are additive fields on the same nodes. No behaviour rides on the disagreement; Arc 2's vocabulary work is where they get reconciled. |
| `node-type` | **split — see below** | half is Arc 2 alias work, half is real. |

## `node-type` is half Arc 2, pulled forward

Of the 14 distinct transitions, these are **alias normalizations Arc 2 step 1
already names** (`CommandSequence` = `sequence`, etc.):

- `identifier → contextReference` (6 sources: `me`, `$g`, `:count`)
- `memberExpression → propertyAccess` (3), `possessiveExpression → propertyAccess` (1)
- `command → CommandSequence` (1)

**So converging the parse paths cannot be finished without doing part of Arc 2,
which the plan sequences AFTER Arc 1.** That is a plan-level finding, not a
detail: either Arc 2's "classify the strays" step moves ahead of this work, or
this work duplicates it.

The rest are genuine defects, and they are **not all on one side**:

| source | traditional | semantic | who is right |
| ------ | ----------- | -------- | ------------ |
| 20 `log 1 + 2 * 3 and true or false` | root `or`, correct precedence | root `+`, tail dropped | traditional |
| 21 `log "a" is not "b"` | `binaryExpression` | `literal "a"` | traditional |
| 26 `log 5 is between 1 and 10` | `betweenExpression` | `literal 5` | traditional |
| 22 `log [1, 2] and {a: 1}` | `binaryExpression` | `selector` | traditional |
| 25 `log the value of #inp as Int` | `asExpression` | `identifier` | traditional |
| 134 `open #popup as non-modal` | `asExpression` | `selector` | traditional |
| 40–42 `beep!` | name `beep!`, args kept | name `beep`, args dropped | traditional |
| 45/82 `blur on <input/>` | args[0] is an **`eventHandler`** — a misparse | `contextReference` | neither; investigate |
| 96/197 `hide <button/>` | args **empty** — query literal dropped | args[0] kept | semantic |
| 139 `pick match of "…" from text` | `args[0].name = "text"` | `"match"` | semantic (this is the filed pick range-role deferral) |
| 191/192 `settle` | `isBlocking: false` | `true` | semantic — `settle` waits |
| 216/219 `transition opacity to 0.5` | property as `string` node | as `identifier` | semantic, probably |
| 23 `` log `t ${1}` `` | value without backticks | value with backticks | traditional |
| 24 `log @data-x of me` | `binaryExpression` | `attributeAccess` | semantic, probably |

## Ordered queue

1. ~~**Close the silent-truncation class**~~ — **DONE 2026-08-30** (decided and
   implemented the same day; the full story is on the entry in
   `PARSER_NEXT_STEPS.md`). The engine now verifies rather than trusts: the
   adapter rejects any parse carrying semantic's own `unconsumed-input`
   diagnostic, and the resync became exact — `skipToCommandBoundary` is
   DELETED. Corpus effect: same 107 → 135, truncation-lost sources 8 → 0, and
   the fix subsumed most of the traditional-is-right rows in the table above.
   Two knock-ons for the queue below: the two "sem-only" render rows now fail
   honestly (they were truncations, see the correction above), and the
   `beep!`/precedence/`between`/`as` rows are now `same` — the node-type family
   below shrinks accordingly. Re-run the triage tool before working any row.
2. ~~**Markers out of `args`**~~ — **NOT EXECUTABLE AS WRITTEN** (measured
   2026-08-30). Two premises failed:

   - **There is no single "semantic shape" to converge onto.** Semantic is
     internally inconsistent about markers: `to` becomes `modifiers.to` for
     `default` and `send`, is DROPPED entirely for `scroll`, and `url` is
     dropped for `push`/`replace`. Converging requires first CHOOSING one
     canonical representation — which is Arc 2's job, not a mechanical port.
   - **Two-thirds of the marker surface never reaches semantic at all.**
     `toggle`, `add`, `remove`, `put`, `take`, `trigger`, `set` and `append`
     are on `skipSemanticParsing`, so only one parser ever runs and the paths
     already agree (markers in `args`, no roles). The 12 differing sources are
     just the six non-skip commands.

   So this row is a **third argument for pulling Arc 2 step 1 forward**, and it
   should be re-scoped after that decision rather than attempted first.

   **What WAS done instead**, because it was the part that turned out to be
   real and independent: the step-4 role-binding defect is FIXED (see
   `PARSER_NEXT_STEPS.md`). It was never a convergence problem — both paths
   agreed, both wrongly — and the claim in that filing that convergence would
   delete the fix was measured false. Nine commands bound a role to a bare
   marker word; six are fixed via `argSkipTokens` plus one core-side fix to
   `from-core.ts`'s explicit `set` case, one (`swap`) was scored and found NOT
   to be a defect, and two (`morph`, `pick`) are a deeper defect both paths
   share.
3. ~~**Decide the Arc 2 overlap**~~ — **DECIDED: pulled forward, and Arc 2
   step 1 is DONE** (2026-08-31; see the plan). The evidence was 12 of the 14
   remaining node-type differences being alias normalisation. Step 1 found the
   arc's premise list was mostly stale (1 of 9 hypotheses correct) and removed
   one genuinely dead kind. **The remaining alias work is the seven
   `RENAME_PAIRS` Arc 0 pinned** (`binaryExpression`/`binary`,
   `eventHandler`/`event`, …), which is Arc 2 step 2+, not step 1.
4. **Positions** — measured 2026-08-31, and it is **TWO defects, not one**.
   The brief assumed the traditional parser was the position ORACLE and only
   the semantic path needed teaching. Measured over the documented
   single-command examples: traditional is correct for **133 of 183**, and
   started LATE for the other 50 — its generic command path took
   `getPosition()` (the previous token, i.e. the last argument) as the
   command's own span.

   - **Defect (a): traditional's late spans — FIXED** (see
     `PARSER_NEXT_STEPS.md`). One site, 19 commands, 183/183 correct after.
     This had to come first: nothing can converge onto an oracle that is wrong
     for a quarter of its rows.
   - **Defect (b): the semantic path emitted zeros — FIXED at the COMMAND
     level.** `buildAST` emits no positions at all (nested args come back
     `undefined`; the command's `[0,0]` is `normalizeBuiltNode`'s placeholder),
     so there was nothing to offset — the information did not exist. The
     coverage gate from item 1 made it derivable instead: an adoption means the
     analyzer consumed `remainingInput` in FULL, so the command spans
     `[commandToken.start, lastConsumedToken.end]`. The two paths now agree
     exactly. **Effect: the `position` family fell from 242 sites / 79 sources
     to 38 / 12.**

     (End is the last consumed TOKEN, not the raw input length — measured:
     `log "x"   ` would otherwise report end 10 where traditional reports 7.)

   - **Still open: NESTED argument positions** (the residual 38 sites / 12
     sources). `buildAST` never produced them, and the few that do arrive — via
     the adapter's expression parser — are relative to each value's OWN
     substring rather than to the source, so there is no single offset to
     apply. Carrying them needs the semantic parser to track spans, which is a
     `packages/semantic` change. Filed, not faked.
5. **The residual real defects** — the table above, smallest first.
6. **`implicit-me`** last; it is the only family where neither side is
   obviously wrong.

Steps 2, 3 and 6 of Arc 1 stay blocked on this arc, as the plan says.

## The tool's blind spot, stated plainly

`tools/triage-parse-paths.ts` measures where the two paths DIFFER. It is
structurally incapable of seeing a defect they SHARE — and the step-4
role-binding defect was exactly that: `toggle .active on #panel` bound
`destination` to the literal word `on` on both paths, reaching AOT codegen, while
the triage reported the row as `same`. Anything on `skipSemanticParsing` (27 of
59 commands) can only ever report `same`, because only one parser runs.

**So a green convergence triage is not evidence of correctness.** Use the tool
to size the convergence work; use per-consumer audits (like the marker audit
that found this) to find defects. Same blind-spot class as the bare-surface gate
and the corpus-wrapper lesson: check the denominator first.

## What has NOT been measured

- **Whether confidence is meaningful anywhere else.** It still reports 1.0 for
  a prefix-parse — core's adoption gate now compensates, but every consumer
  reading the raw number (MCP, the bridge, thresholds tuned against it) is
  reading role coverage only. Pricing input coverage into the score is parked in
  semantic behind the `--diagnose-coverage` sweep. Nobody has run that sweep.

- Whether the truncation class reaches **runtime behaviour** in a browser, as
  opposed to the AST. The AST cannot evaluate what it does not contain, so this
  is near-certain, but it is inference, not measurement.
- The **multilingual** side. Every corpus row there is handler-wrapped and goes
  through `render(parse_en(en), L)`, so a truncating en parse would corrupt all
  24 languages at once. The R3 signal's "24-language firestorm means suspect the
  en parse first" inversion is the place to look. Not checked.
- Rows 45/82 (`blur on <input/>` parsing as an `eventHandler`), which look like
  a third defect belonging to neither path's design.
