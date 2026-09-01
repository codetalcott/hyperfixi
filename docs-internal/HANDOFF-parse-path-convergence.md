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
> ### Landed 2026-08-31 — do not redo (#1023–#1026, then #1028–#1031)
>
> 1. ~~`hide <button/>` THROWS on the default path~~ — **#1023**, in
>    `packages/semantic`'s `convertSelector`. The filing's recommended fix site
>    was measured WRONG (core's adapter is one of four `buildAST` consumers;
>    the multilingual bundles and R2 validator bypass it) and its stated blocker
>    for the right site was measured false (`raw` is what keeps `make` working,
>    so one command-agnostic shape serves both meanings). Also closed the
>    query-literal half of old item 3.
> 2. ~~Item 6 — `implicit-me`~~ — **#1024**, owner DECIDED: the injected default
>    is **relocated, not duplicated** — held back from `args`/`modifiers` (the
>    SYNTAX surface) and kept on `semanticRoles` (the SEMANTICS surface). The
>    runtime stays the single executable home of every default. The class was
>    3× the family: 22 schema roles across 21 commands, most invisible to the
>    triage because they are on `skipSemanticParsing`. Mechanism already
>    existed — the matcher's `implicit: true` tag. (The "mark it in the AST"
>    route has a fossil: core's `implicitTarget` + `withImplicitTarget`, zero
>    callers, zero readers.)
> 3. **The `both-fail 19` bucket, opened for the first time** — **#1025**. All
>    19 are the repo's OWN `metadata.examples`, shipped in docs, MCP
>    `get_command_docs` and LSP hover, and nothing asserted any of the 205
>    parse. Now gated (`documented-examples.test.ts`), ratcheting both ways.
> 4. **The parser reports the input it discards** — **#1026**. `on click qqqq`
>    compiled to `ok: true` with an EMPTY handler and zero diagnostics; a typo
>    gave you a handler that silently does nothing. Five sites across TWO
>    functions now record it. Same commit fixed the shipped-sources gate to walk
>    `git ls-files` rather than the working tree.
>
> 5. **Thread A items 1 and 2 both closed, plus two follow-ons they turned up**
>    — **#1028** (`show`/`hide` keep their `in <scope>` and `when`), **#1029**
>    (`if <cond> then <cmd>` needs `end` only when input follows, and the
>    documented-examples gate now reads `errors`), **#1030** (`transition … to
>    <value>` keeps its CSS unit), **#1031** (the `install X on <target>` queue
>    item, corrected — it is a docs defect, not a parser bug). Detail on each is
>    in the numbered queue below and in `PARSER_NEXT_STEPS.md`.
>
> ### What is left, in the order I would take it
>
> **Two threads now.** Items 1–2 are the parser-correctness thread that came out
> of opening `both-fail`; items 3–5 are the original convergence thread. The
> first thread is live user-visible defects and is worth more per hour.
>
> 1. ~~**`examples/behaviors/recipes.html` — upstream ACCEPTS, we drop.**~~ —
>    **DONE.** `show`/`hide` were the THIRD `COMPOUND_COMMANDS` member with no
>    case in `parseCompoundCommand` (after `take` #859 and `process`), so they
>    took `parseRegularCommand`'s `parsePrimary()` loop, which parses one
>    operand and can see no operator: the `in` scope, the `when` filter and the
>    `with` strategy all fell off. Both halves were needed — the runtime treats
>    `when` on show/hide as a per-element FILTER (upstream `implicitLoopWhen`:
>    show the matches, HIDE the rest), NOT as `CommandAdapterV2`'s generic
>    one-shot guard, which would have left a correct AST and a page that still
>    never filters. Measured against the real engine with the input pre-filled:
>    hide set byte-identical to upstream for three search terms. Both shipped
>    gates moved the right way (`shipped-sources` allowlist 5 → 4; the execution
>    gate's `compared` 122 → 123, the handler returning to it exactly as its own
>    baseline note predicted). Full write-up in `PARSER_NEXT_STEPS.md`.
>
>    **Two things it taught, both mutation-measured.** (a) Adding the shipped
>    source to `compound-command-coverage.test.ts` did NOT redden that gate when
>    the dispatch case was deleted — a dropped TAIL still parses to one
>    correctly-named command WITH payload. The gate now re-compiles each probe
>    wrapped in `on click …`, because the parser reports unplaced input only
>    from inside a handler body. (b) `show`'s `data-original-display` restore
>    diverges from upstream (`block` vs `removeProperty`) and is PINNED by a
>    test, so it was filed, not silently changed.
> 2. ~~**The `recovered` false positive, which BLOCKS strengthening the new
>    gate.**~~ — **DONE.** Upstream requires `end` only when
>    `parser.hasMore()`; hyperfixi required it unconditionally, so
>    `if x > 5 then add .active` parsed exactly right and reported
>    `Expected 'end' after if block` anyway. Two tests had PINNED that
>    strictness as an explicit deferral ("That is a separate decision") — the
>    decision is made in the same commit, which is what those comments asked
>    for. `documented-examples.test.ts` now asserts a CLEAN parse; both blind
>    spots its own docblock confessed are closed and mutation-tested.
>
>    **This item's own estimate was wrong in three ways, all measured** (on
>    `main`, in a throwaway worktree, before touching anything):
>
>    - the delta is **19 → 30**, not 19 → 27;
>    - **11** additions, not 8, and **NOT all** the `if` false positive —
>      `blur on <input/>` / `focus on <input/>` are a different class;
>    - the allowlist **GREW**, it did not shrink. That is what strengthening a
>      gate blind to an entire band does first. Eleven documented examples had
>      been losing content in silence: 8 docs defects (upstream rejects them
>      too) and 3 parser gaps (upstream ACCEPTS) —
>      `transition left to 100px over 500ms` silently loses its DURATION,
>      `scroll to me smoothly` loses `smoothly`, and
>      `make a URL from "/path/", "…"` does not parse inside a handler at all.
>      Those three are the next parser work, filed with repros.
>
>    **The mechanical lesson generalises**: the parser reports discarded input
>    only from inside a handler body (#1026 wired five sites, all there), so a
>    parse-quality assertion on a BARE command source measures the wrong shape.
>    The same hole was found the same week in
>    `compound-command-coverage.test.ts` (#1028). Both gates now re-compile
>    wrapped.
>
>    ~~Still open from #1025's triage: **`install X on <selector>` is a parser
>    bug**~~ — **measured WRONG, and the reverse is true.** Upstream's `install`
>    is a FEATURE with no on-target clause at all, and rejects the selector
>    forms with the same complaint hyperfixi makes. The two forms that "parse"
>    are the broken ones: `install Draggable on me` yields `ok: true`, zero
>    diagnostics, and a phantom `eventHandler` for an event named `me` — while
>    installing on the current element, not on `me`. Corrected in
>    `PARSER_NEXT_STEPS.md`; the phantom-handler half is folded into the
>    existing "A trailing `on <target>` splits into a phantom event handler"
>    entry. **Third filing this arc whose recommendation aged worse than its
>    observation** — after the `hide <button/>` fix site and this item's own
>    19→27/8-additions estimate.
> 2b. **NEW, from #1029's strengthened gate — two parser gaps remain of the
>    three it found.** `transition left to 100px` was the third and is FIXED
>    (#1030). Still open, both upstream-VALID with a repro in
>    `PARSER_NEXT_STEPS.md`:
>    - `scroll to me smoothly` drops `smoothly`.
>    - `make a URL from "/path/", "…"` parses BARE and does not parse inside a
>      handler at all — a comma-separated argument list that survives at top
>      level and dies in a body points at the body loop, not at `make`.
>    - adjacent, found by #1030: `over 500 ms` (with a space) drops the `ms`.
>      The tokenizer joins `500ms` into one TIME token, but there is no time
>      POSTFIX expression to match upstream's `TimeExpression`.
> 3. **Residual item-5 rows** — the template-literal backticks
>    (`log \`t ${1}\``). The `value` family is 3 sites: that one, plus the two
>    `settle` `isBlocking` rows marked INERT below.
> 4. **Nested argument positions** (36 sites / 10 sources). Blocked on
>    `packages/semantic` tracking spans; filed, not faked.
> 5. **Arc 2 step 2+** — the seven `RENAME_PAIRS` Arc 0 pinned
>    (`binaryExpression`/`binary`, `eventHandler`/`event`, …). Step 1 is done
>    (#1018); this is the actual alias-normalisation work, and it is what 12 of
>    the 14 remaining `node-type` differences are.
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
> - **When local and CI disagree, READ THE LOG FIRST.** #1026 failed a gate in
>   CI that passed locally. I spent four wrong hypotheses on it — stale `dist`,
>   my invocation, a moved merge base, ESM-vs-CJS — before the log answered it
>   in one line. The cause was `examples/vite-plugin-multilingual/` being
>   GITIGNORED: the gate walked the working TREE, so it scored 10 files CI never
>   sees (183 local vs 173 CI). `git ls-files <path>` would have found it in
>   seconds, and CLAUDE.md already names the class ("working tree ≠ clean
>   checkout", #862/#863, two round-trips). GitHub will not release a job log
>   until the whole run finishes — wait for it rather than theorising against a
>   black box.
> - **A local/CI denominator gap is unfixable from an allowlist**, which is how
>   that one surfaced: WITH the entry the gate failed in CI as stale, WITHOUT it
>   it failed locally as new. When no allowlist state satisfies both, the
>   DENOMINATOR is the bug. The sibling `shipped-examples-execution` gate had
>   solved this since #862; the two silently disagreed for a year.
> - **`ok: true` is not evidence of comprehension, and a gate keyed on it is
>   weak.** The `documented-examples` gate was mutation-tested and FAILED its
>   behavioural row — adding `log }}} totally broken {{{` to a real command does
>   not redden it, because the parser drops the tail and the example still
>   "parses". That blind spot is now pinned as an assertion in the gate itself
>   rather than left implied.
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
> **#1023–#1026 and #1028–#1031 are landed. Thread A items 1 and 2 are DONE**
> — do not redo the `recipes.html` gap, the `if`-without-`end` false positive,
> the `transition` unit drop, or the `install X on <target>` triage. Read the
> queue below and start at **2b**, the two parser gaps #1029's strengthened gate
> found and left open.
>
> **Re-run the measurement before costing anything** —
> `cd packages/core && npx tsx tools/triage-parse-paths.ts`. On `7e4ec0a6`:
> same **139** · differ **77** · trad-only 0 · sem-only 0 · both-fail 19, with
> families `semanticRoles-added` 77, `field-only-trad` 194/43, `field-only-sem`
> 76/48, `node-type` 14, `marker-in-args` 12, `position` 36/10, `value` 3,
> `arity` 1. `implicit-me` is gone from the table. `same` moved 137 → 139 only
> because #1028 added two documented examples to the corpus — the tool is the
> authority, not this paragraph.
>
> **`both-fail 19` is now understood and is NOT parser gaps** — all 19 are the
> repo's own `metadata.examples`, triaged in `PARSER_NEXT_STEPS.md` and gated by
> `documented-examples.test.ts`. Do not re-open that bucket; read the filing.
>
> **The second gate set matters now.** A change touching the parser's recovery
> paths moves `shipped-sources-validity` and `shipped-examples-execution`, whose
> allowlists carry measured upstream verdicts. Both derive their corpus from
> `git ls-files` — keep it that way.
>
> Note the top-line `differ` has not moved through eight PRs, and that is
> expected: those fixes removed difference SITES from sources that still differ
> in metadata, and Thread A's fixes are defects both paths SHARED, which the
> triage cannot see at all. Read the family table, not the headline — the
> headline was misleading in step 5 too.
>
> **Three allowlists now carry measured upstream verdicts, and their current
> sizes are part of the state**: `documented-examples.test.ts` **29**,
> `shipped-sources-validity.json` **4**, `shipped-examples-execution.json`
> **33**. Two of the three ratchet DOWN only; the documented-examples list grew
> to 30 when #1029 taught it to read `errors` and is back to 29 after #1030.
>
> A parser change needs the multilingual gate run LOCALLY before pushing
> (~10 min): `npm run test:multilingual:build-deps` → `npm run populate --prefix
> packages/patterns-reference` → `cd packages/testing-framework && npx tsx
> src/multilingual/cli.ts --full --bundle browser-priority --regression`. Do not
> commit the regenerated `patterns.db`. Never `git stash` in this tree.
>
> Every step is a measurement first, and it is allowed to falsify the step.
> That habit produced everything of value in this arc. Across ten PRs it has
> killed a proposed fix, voided a queue item, scored 1 of 9 plan hypotheses
> correct, and — in the 2026-08-31 session alone — falsified **four** written
> claims: a filing's recommended fix site (the adapter is one of four `buildAST`
> consumers), a filing I had written myself an hour earlier (it named the wrong
> function), an oracle choice that inverted the answer on all 19 `both-fail`
> rows (`try { hs.parse() }` vs `parse().errors`), and a gate-walking bug a
> sibling gate had already fixed in #862. When it falsifies something, correct
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
