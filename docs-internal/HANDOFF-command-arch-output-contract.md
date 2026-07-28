# HANDOFF — command-arch Arc C: the command output contract

> **Arc brief, written 2026-07-28.** Detail for Arc C of
> [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md)
> (the queue holds one paragraph; this file is authoritative for the arc).
> Format follows [HANDOFF-command-arch-target-resolution.md](./HANDOFF-command-arch-target-resolution.md)
> (Arc D, complete).
>
> **Status: ARC COMPLETE (2026-07-28).** Steps 0 (#801), 1 (#802), 2 (#803 spec
> + #805 the `unless` fix) and 3 (#806) are all merged. **This file is now a
> record, not a plan — stop updating it**, except for the one open decision
> named at the end of the Status log. Read that log for per-step outcomes.
>
> **This brief REVISES the queue doc's Arc C plan.** The exploration that
> produced it measured something the queue's audit did not: `it` is set by
> **two independent mechanisms**, only one of which the queue describes, and the
> mechanism it describes is **redundant with the other in every case where it is
> correct**. Read [What changed](#what-changed-vs-the-queue-docs-plan) before
> following the queue's step 2/3 wording — the destination moved from "migrate
> ~25 commands to an envelope" to "delete the propagation loop".

## Verified state (2026-07-28, main `e9c579bb`, working tree clean)

Line refs will drift — re-verify by symbol (`grep -n`), not by number.

### The two mechanisms that set `it`

**Mechanism 1 — command self-assignment.** A command does
`Object.assign(context, { it: X })` inside its own `execute()`. It receives the
*typed* context, and the adapter copies the mutation back onto the real context
at `runtime/command-adapter.ts:338`
(`Object.assign(context, ContextBridge.fromTyped(typedContext, context))`).
**This works on every execution path.** ~20 commands use it.

**Mechanism 2 — runtime propagation via `unwrapCommandResult`.** The function is
`runtime/runtime-base.ts:75`; it sniffs the command's *return value* through
seven branches and ends with an unconditional array collapse at `:121`. It is
called from exactly two places, both of which are the same four-line loop:

| Call site | Path it governs |
| --------- | --------------- |
| `runtime/runtime-base.ts:1756` | event-handler bodies (`on click …`) |
| `dom/attribute-processor.ts:494` | the lazy `_="on …"` attribute stub, first event only |

**`executeCommandSequenceWithResult` (`runtime-base.ts:824`) — the `then`-joined
command sequence, and the path `hyperscript.eval` takes — does NOT unwrap at
all.** It accumulates `lastResult` and assigns `it` only for a `return` signal.
So mechanism 2 governs *one* of the two ways a command sequence runs.

### Consequence 1 — `it` already disagrees between execution paths

Measured by running each snippet twice — once as a `then`-joined sequence, once
as the body of an `on probe` handler — and reading `it` out through a `js(it)`
block. **18 of 29 probed commands disagree.** The interesting rows:

| Command | `it` in a `then` sequence | `it` in an event handler |
| ------- | ------------------------- | ------------------------ |
| `settle #x` | `<DIV>` (the element — settle.ts self-assigns) | `{element,settled,timeout,duration}` |
| `pick first 1 of [...]` | `Array(1)` (pick self-assigns) | `{selectedItem,sourceLength,sourceType,variant}` |
| `wait 1ms` | `null` | `{type,result,duration}` |
| `scroll to #x` | `null` | `{element,position,smooth}` |
| `push url "/x"` | `null` | `{url,title,mode}` |
| `go to #x` | `null` | `{result,type}` |
| `toggle .a on .item` | `null` | `<P>` — the **first** of two matched (`:121`) |
| `put "hi" into #x` | `null` | `<DIV>` (`:121`) |

The `settle` and `pick` rows are the sharpest statement of the defect: the
command **already set `it` correctly**, and the propagation loop then overwrote
it with the wrapper. Mechanism 2 is not filling a gap there; it is destroying a
correct value.

(A third group — `add`, `log`, `if`, `empty`, `remove`, `show`, `focus` — also
shows as "disagreeing", but for a different and **out-of-scope** reason: they
return void, so neither mechanism fires and `it` keeps its *initial* value, which
is `null` on the sequence path and the DOM event on the handler path
(`runtime-base.ts:1697`). That is an initial-value question, not a wrapper leak.
Do not fold it into this arc.)

### Consequence 2 — all seven sniffing branches are redundant

Every command that a branch was written for also self-assigns. Verified
line-by-line:

| Branch (`runtime-base.ts:75-122`) | Owner | Self-assigns at |
| --------------------------------- | ----- | --------------- |
| `result` + `wasAsync` | call | `execution/call.ts:104` |
| `result` + `executed` | js | `advanced/js.ts:134` |
| `lastResult` + `type` | repeat | `control-flow/repeat.ts:300` |
| `conditionResult` + `executedBranch` | if/unless | `control-flow/if.ts:150` |
| lone `value` | get | `data/get.ts:78` |
| `value` + `target` + `targetType` | set, append/prepend | `data/set.ts:247`, `content/insertion-base.ts:174` |
| `data` + `status` + `headers` | fetch | `async/fetch.ts:268` |

So mechanism 2 contributes **nothing correct**. What it contributes is the ~21
wrapper leaks and the `:121` collapse.

### Consequence 3 — the suite is blind to this mechanism

Stubbing `unwrapCommandResult` to `return undefined` unconditionally (i.e.
simulating the loop's deletion) and running the full core suite:

```text
Test Files  1 failed | 297 passed | 1 skipped (299)
     Tests  4 failed | 7735 passed | 128 skipped (7867)
```

The only four failures are `runtime.test.ts:950`'s **direct unit tests of the
function itself**. **Zero behavioral tests fail.** Read that precisely: it does
NOT mean deleting the loop changes nothing — the probe above shows `it` really
does change on the handler path. It means the 7738-test suite **cannot see this
arc's blast radius at all**, which is exactly why step 1 (the audit) must land
before any migration, and why the audit has to assert on `it` end-to-end rather
than on the function in isolation.

Residual gates that *could* see a change and that the local suite does not cover:
the Playwright bundle-compatibility matrix, the shipped-examples execution gate,
and the multilingual R2 execution ratchet. All three run in PR CI.

### The output-type inventory (corroborates the queue's figures)

Classifying every registered command's declared `execute` return type against the
seven branches yields **21 distinct fall-through output types** across ~24
commands (`signal-base` backs break/continue/exit; `push-url` backs
push-url/replace-url) — matching the queue doc's re-verified "21 distinct output
types / ~25 commands". Two accidental matches confirmed:

- **`MeasureCommandOutput`** `{result, wasAsync, element, property, value, unit}`
  hits branch 1 (`result`+`wasAsync`) by key-name accident. It happens to yield
  the right number, and measure also self-assigns (`animation/measure.ts:120`).
- **`DefaultCommandOutput`** `{target, value, wasSet, existingValue?, targetType}`
  hits branch 6 (`value`+`target`+`targetType`) by key-name accident.

One near-miss worth recording, because it is a fall-through hiding inside a
"matched" branch: **`RepeatCommandOutput.lastResult` is optional.** When absent,
`'lastResult' in obj` is false and the whole `{type, iterations, completed}`
wrapper becomes `it`.

## What changed vs. the queue doc's plan

The queue's step 2 says: migrate each command to either the
`{ target?, value, targetType }` envelope or a void return. The envelope half is
now known to be the wrong destination — **an envelope is only read by mechanism
2, which does not run on the sequence path.** Migrating a command to the envelope
makes it correct in event handlers and leaves it unchanged (still `null`) in a
`then` sequence, i.e. it preserves the path disagreement.

The void-return half is right, and for a better reason than the queue gives: a
void return removes mechanism 2 from the picture entirely, leaving self-assignment
as the single mechanism — which is the one that already works everywhere.

**Revised destination: delete `unwrapCommandResult` and its loop; make
self-assignment the sole `it` contract.** The migration is then per-command:
*does this command set `it` correctly on the sequence path today?* If yes, nothing
to do. If no and it should, add a self-assign. The probe says that second list is
short, and `toggle`/`put` are its main members — where the value mechanism 2
currently supplies is *already wrong-shaped* anyway, because `:121` collapses the
element list to its first element.

## The steps

### Step 0 — collapse the two propagation call sites (mechanical)

The four-line loop at `runtime-base.ts:1756` and `attribute-processor.ts:494` is
duplicated verbatim:

```ts
const val = unwrapCommandResult(result);
if (val !== undefined) {
  Object.assign(eventContext, { it: val, result: val });
}
```

Extract one exported helper (suggested: `propagateCommandResult(context, result)`
in `runtime/runtime-base.ts`, next to `unwrapCommandResult`) and call it from
both. Pure refactor, no behavior change. Its value is that steps 2 and 3 then
land **once** instead of twice — this is the *duplication hides which
implementation is the truth* disease the queue's preamble names, sitting inside
the arc meant to cure it.

Keep `unwrapCommandResult` exported: `runtime.test.ts:950` imports it directly,
and step 1's audit wants to classify with it.

### Step 1 — the audit, as a test (the arc's gate)

This is the landing that makes the rest safe, and per Consequence 3 it is the
**only** thing standing between step 2 and an unmeasured behavior change.

Shape:

1. **A ratchet on the command list.** `runtime.getRegistry().getCommandNames()`
   must equal the audit table's keys, both directions. A new command cannot be
   added without classifying it. (This is the arc's "derive, don't trust" — the
   registry is the source, the table is checked against it, neither is trusted
   alone.)
2. **Per command, both paths.** For each entry, run a representative snippet
   twice — once as a `then`-joined sequence, once as an `on probe` handler body —
   and record what `it` holds. The probe harness that produced the table above is
   the working model: read `it` out through a trailing
   `then js(it) window.__it = it end`.
3. **Assert the disagreement set explicitly**, rather than snapshotting a blob.
   A snapshot of 59 rows will be re-blessed on the first failure; an explicit
   `PATH_DISAGREEMENTS` set with a comment per entry will not.
4. **Classify the return shape** against the seven branches, so the ~21
   fall-throughs and the two accidental matches are named in code.

Commands that cannot run in jsdom (`go` to a URL, `fetch`, `breakpoint`,
`install`) get an explicit `skip` with a reason string, and the ratchet counts
skips — a silent omission is what this arc exists to prevent.

Expect step 1 to land RED-adjacent: it documents current behavior, including the
wrong parts. Every wrong row gets a comment saying it is wrong and which step
fixes it.

### Step 2 — make self-assignment the sole mechanism

**Revised 2026-07-28, after step 1 landed.** The original text gave a decision
*rule* and no decisions; the audit plus an upstream-parity pass turns it into a
table. The headline: **step 2 is nearly empty.** Almost every wrapper-leak
command's sequence-path value is already upstream-correct, so step 3's deletion
does the work. What remains is one bug fix and two judgment calls.

#### The oracle

For each command, the question "should this set `it`?" is answered by upstream
_hyperscript, whose commands assign `context.result` (the value `it` aliases)
only when they produce one. Reproduce the survey from a checkout of
`_hyperscript`:

```bash
cd _hyperscript/src/parsetree/commands
# each command class carries `static keyword = "…"`; check whether its body
# assigns ctx.result / context.result
grep -n 'static keyword\|\(ctx\|context\)\.result *=' *.js
```

Upstream commands that **do** set `result`: `wait` (event variant only),
`pick`, `render`, `measure`, `make`, `fetch`, `js`, `call`/`get`,
`increment`/`decrement`, `ask`/`answer`. Everything else — including `go`,
`scroll`, `settle`, `transition`, `start`, `beep!`, `toggle`, `put`, `take`,
`set`, `tell`, `send`/`trigger` — does **not**.

Note `wait`'s split, because it is the one that looks like a defect and isn't:
upstream sets `context.result = evt` inside the **event** listener
(`commands/events.js`, the `wait for click` variant) and never for
`wait 2s`. hyperfixi matches this already (`async/wait.ts` self-assigns the
event). The audit's `wait 1ms` row showing `null` on the sequence path is
therefore **correct**, not a gap.

#### The decision table

Every `defect:` row from the step-1 audit, with its step-2 action:

| Command | Upstream sets `result`? | hyperfixi sequence path | Step-2 action |
| ------- | ----------------------- | ----------------------- | ------------- |
| `wait` | yes — event variant only | `null` (time) / event (event) | **none** — already correct |
| `pick` | yes | `Array(1)` | **none** — already correct |
| `render` | yes | `<DIV>` | **none** — already correct |
| `go` | no | `null` | **none** |
| `scroll` | no | `null` | **none** |
| `start` | no | `null` | **none** |
| `beep` | no | `null` | **none** |
| `toggle` | no | `null` | **none** — do NOT add a self-assign |
| `put` | no | `null` (element path) | **none** — see note below |
| `copy` | not upstream (extension) | `null` | **none** |
| `push` / `replace` | not upstream (extension) | `null` | **none** |
| `settle` | **no** | ~~`<DIV>`~~ | **DECIDED** (#808) — self-assign removed; now `null`/Event |
| `transition` | **no** | ~~`<DIV>`~~ | **DECIDED** (#808) — self-assign removed; now `null`/Event |
| `unless` | not upstream (extension) | ~~AST node~~ | **FIXED** (#805) — now `null`/Event, matching `if` |

For all fourteen "none" rows the handler column is wrong and the sequence column
is right, so **deleting the loop in step 3 converges them onto the correct value
with no per-command change at all.** That is the payoff from the revised
destination: the envelope migration the queue originally prescribed would have
touched every one of these.

`put` note: `dom/put.ts` self-assigns `it` on its **variable** path only
(`put x into y`); the element path returns `HTMLElement[]` and assigns nothing.
The audit's `null` is that element path, and it matches upstream. Not an
inconsistency.

#### The one fix: `unless` — DONE (#805)

> Landed 2026-07-28 as its own PR, per the recommendation below. The fix:
> `parseInput` takes `raw.args[1]` (the parser's block node) exactly as `if`
> does, ignoring any stray else block; `executeCommandsOrBlock`'s single-value
> fallthrough and `executeCommands`' AST-node case now execute through
> `_runtimeExecute` instead of returning the body unexecuted; the unless-only
> `it` self-assign is gone. Regression gate: the end-to-end describe in
> `commands/control-flow/__tests__/unless.test.ts` (real parser, real runtime,
> DOM assertions). The audit's `unless` row now reads `null`/Event — identical
> to `if` — and the asserted disagreement count moved 29 → 30 (a fixed unless
> joins the initial-value non-goal family; the broken one "agreed" only because
> both paths held the same leaked node). One note for Arc E: the hybrid
> parser never had this bug — it desugars `unless` to `if not(...)` at parse
> time. The canonical class was the broken copy, the #792 pattern again.
> The diagnosis below is preserved as written.

The audit recorded `unless` leaving an AST node in `it`. Tracing it found a
larger bug: **`unless` never executes its body at all.**

- `control-flow/if.ts` `parseInput` sets `thenCommands = raw.args.slice(1)` for
  `unless` — an **array** — while the `if` path takes `raw.args[1]`, the block
  **node**.
- `executeCommandsOrBlock` routes a block node to `executeBlock` (which runs it
  through `_runtimeExecute`) and an array to `executeCommands`.
- `executeCommands` handles only entries with an `.execute` method or a
  function; anything else hits `else lastResult = cmd`, returning the raw node.
  A parsed AST block node has neither. So the body is **skipped** and the node
  is returned.
- `execute` then does `if (mode === 'unless') Object.assign(context, { it: result })`
  — an `unless`-only self-assign — which puts that node in `it`.

Verified: `unless false then add .ran to #probe end` leaves `#probe` without the
class, while `if true then add .ran to #probe end` adds it.

**Why the existing suite is green:** `control-flow/__tests__/unless.test.ts`
builds `thenCommands` from **mock objects carrying `.execute()`**, a shape the
parser never produces. The tests exercise the one branch of `executeCommands`
that works. Fixing this must include a test that goes through the real parser.

**This is a live user-facing bug in a shipped, documented command, and it is
only incidentally Arc C's.** Consider landing it as its own PR ahead of the arc
rather than inside step 2 — the `it` leak is a symptom, and the fix (route
`unless` through the same block path as `if`) is unrelated to the output
contract. The `unless`-only self-assign should go with it: once the body runs
through `executeBlock`, `unless` has no reason to set `it` when `if` does not.

#### The two judgment calls: `settle` and `transition` — DECIDED (#808): removed

> Landed 2026-07-28. Both self-assigns removed for upstream parity, decided on
> three measurements: zero in-repo reliance (examples, behaviors, compat
> suites, docs, their own metadata.examples); the element is re-nameable one
> clause later; and — decisive — the removal was only free while #806's
> both-paths-agree state was unreleased. The command-set rule is now uniform
> (`it` iff upstream sets `result`), with send/trigger recorded in the queue
> doc as the one open sibling. The discussion below is preserved as written.

Both self-assign the element, and upstream sets nothing. After step 3 the
sequence value is what both paths will hold, so this decides what `it` is after
`settle #x` — the element, or untouched.

Neither is obviously wrong: returning the element makes `settle #x then add .a to it`
work, which reads well and costs nothing. But it is a **deliberate divergence
from upstream**, and it is currently undocumented and untested as such. Decide
it explicitly and record it in the audit row either way. Note `measure` is the
precedent for a documented divergence being fine — upstream sets `result` there
too, so it is not evidence either way.

#### Working shape

Each PR flips the affected rows in the step-1 audit table, so the diff shows
exactly which `it` values changed. That is the review artifact.

### Step 3 — delete `unwrapCommandResult`, the loop, and the `:121` collapse — DONE (#806)

> Landed 2026-07-28. One thing the plan below did NOT anticipate, found while
> implementing and worth reading before touching `it`/`result` again: the loop
> wrote **both** `it` and `result`, while commands self-assign **only `it`**. So
> deleting it would have silently broken the `result` symbol inside handlers —
> `set x to 5 then put result into #probe` rendered `5` in a handler and nothing
> in a sequence, and `start view transition … then put result into #panel` is a
> *documented example* that depends on it. The fix was not a per-command
> migration but making `it` and `result` genuinely one slot resolved through
> either name (upstream's model: `result` canonical, `it` its alias) — four
> resolvers, no command touched. `resolveIdentifierSync` already did
> `context.it ?? context.result`; the registered expressions were the
> inconsistent copies.

Delete the function, replace the two (by then one) call sites with nothing, and
retire `runtime.test.ts:950-986`'s six positive cases (plus step 0's four
`propagateCommandResult` cases, which go with the helper).

**Per step 2's decision table, this step does most of the arc's work**: fourteen
commands whose handler-path `it` is wrong and whose sequence-path `it` is already
upstream-correct converge with no per-command change. Expect fourteen audit rows
to flip in this one PR — that is the intended shape, not a sign the change is too
big. The audit's asserted disagreement count (29 of 45) drops in the same diff.

**The `:121` array policy is decided here, and Arc D left it a pinned rule to
decide against.** Read `commands/helpers/__tests__/target-elements.test.ts` and
`parser/__tests__/selector-shape.test.ts` first. They pin:

- `#id` matched → the element; `#id` unmatched → `null`
- `.cls` → the collection **always**, including a single match (a one-element
  array, not the element) and no match (`[]`, not `null`)

`:121` violates that rule: it collapses **any** array to `val[0]`, so
`toggle .a on .items` leaves `it` as the first element — the same shape as
append's pre-#792 `.cls` no-op, and the exact asymmetry the pinned tests say is
deliberate at the *selector* end. **Recommended policy: no collapse.** A command
that yields an element list should surface the list; the `#id`→element unwrap
already happened at the selector layer, which is where the rule lives. Deleting
the function deletes the collapse, so step 3 gets this for free — but record the
decision explicitly rather than letting it fall out of the deletion, because
`toggle` and `put` are the two commands whose `it` visibly changes shape.

## Gates, per step

| Step | Suites | Command |
| ---- | ------ | ------- |
| all | quick validation | `npm run test:quick --prefix packages/core` |
| 0 | runtime + attribute-processor | `npm test --prefix packages/core -- --run src/runtime/ src/dom/` |
| 1 | the new audit test itself | added in the step-1 PR |
| 2, 3 | audit test (rows flip deliberately) + full core suite | `npm run test:quick --prefix packages/core` |
| 2, 3 | **Playwright compatibility matrix** — one of the few gates that can see an `it` change | `cd packages/core && npx playwright test src/compatibility/` (MUST run from packages/core) |
| 2, 3 | R2 execution subset + the other 9 ratchet signals | runs automatically in the PR's `multilingual-validation` CI job |

`npm run verify:reference` is NOT expected to fire — this arc adds and removes no
commands. If it does, something out of scope was touched.

## Non-goals (Arc C specifically)

- **The initial value of `it` in an event-handler body** (`runtime-base.ts:1697`
  sets it to the DOM event; the sequence path starts `null`). A real divergence,
  visible in the probe, and **not this arc** — it is about context construction,
  not command output. Record it; don't fix it here.
- `context.result` vs `context.it` aliasing. The loop sets both; commands mostly
  set only `it`. Out of scope unless step 2 makes it unavoidable.
- The hook registry's `afterExecute(hookCtx, result)` — it sees the raw return
  value, and should keep doing so. The wrapper is a legitimate *hook* payload;
  the defect is only that it reaches `it`.
- Command **input** parsing, the decorator statics (Arc B), the registration
  lists (Arc A), the four executors (Arc E), semantic mappers (Arc F).

## Session handling

- **One PR per step, merged into main before the next starts.** Stacked PRs get
  zero CI and still report clean (`ci.yml` fires only on PRs into main/develop).
- **Prefer a fresh session per step**; this file is the continuity mechanism.
- **Start-of-session protocol:** (1) read the queue doc's Arc C paragraph + this
  file; (2) `git log --oneline -5`; (3) re-verify line anchors by symbol;
  (4) cold tree → `npm install` first (`npm run build` is NOT dependency-ordered,
  root CLAUDE.md § Cold start); (5) baseline
  `npm run test:quick --prefix packages/core` BEFORE editing.
- **End-of-session protocol:** update the Status log below. If a step changes a
  later step's plan, edit that step's section here — this file is authoritative
  for the arc, per the queue's pointer-only rule.
- Core vitest wraps in `timeout 120`; **exit code 124 = success** (esbuild daemon
  hang, known issue).

## Risk register (arc-specific; the general one is in the queue doc)

- **The local suite cannot see this arc.** Consequence 3 is the single most
  important line in this brief. Never read a green `test:quick` as evidence that
  a step 2/3 change was behavior-neutral — it is evidence of nothing. The audit
  test from step 1 is the only local instrument.
- **`it` is read far from where it is written.** `parser/runtime.ts:386` and
  `:1264` resolve `it`/`its` and fall back to `context.result`. A change to what
  `it` holds surfaces in expression evaluation, not in the runtime.
- **Mechanism 1 depends on the adapter's write-back** at
  `command-adapter.ts:338`. If a future refactor stops copying the typed context
  back, every self-assigning command stops setting `it`. **CORRECTED
  2026-07-28 — this is well guarded, contrary to what this line first claimed.**
  Measured by disabling the write-back and running the suite: **23 tests fail
  across 7 files**, including ones that predate this arc (`def-execution`,
  `append`, `prepend`, `make`, `htmx-wire`, `runtime`). The original claim
  ("nothing in the suite would fail") was inferred from Consequence 3 rather
  than measured, and it was wrong — Consequence 3 is specific to the *return-value*
  mechanism. **Do not add a dedicated test for this; it would be redundant.**
- `export { X } from './f'` creates **no local binding** — relevant if the
  deleted propagation helpers are ever reintroduced elsewhere.
- The MCP server serves **stale dist** after rebuilds; a tool refusing with
  "serving STALE code" is the guard working — restart, don't debug.

## Status log

- 2026-07-28 — brief written; arc not started. The exploration behind it ran two
  experiments worth not repeating: the dual-path `it` probe (table under
  Consequence 1) and the stub-the-unwrap blast-radius run (Consequence 3). Both
  were run against main `e9c579bb` with a clean tree and reverted. Next action:
  step 0 PR.
- 2026-07-28 — **step 0 merged (#801)**. `propagateCommandResult(context, result)`
  in `runtime/runtime-base.ts` is now the single call site; 7738 → 7738 on the
  refactor, +4 tests pinning the `undefined` guard. Nothing surprising.
- 2026-07-28 — **step 1 merged (#802)** —
  `runtime/__tests__/command-output-contract.test.ts`, 85 tests. Notes for step 2:
  - **Snippets come from each command's own `metadata.examples`**, fixture-adapted.
    That was worth doing over hand-authoring: it is derive-don't-trust applied to
    the audit's own inputs, and it surfaced five commands whose documented example
    does not parse (see below).
  - **The harness must not sleep.** `settle`, `transition` and
    `start view transition` complete asynchronously; a fixed-sleep harness let a
    late completion write into the *next* command's row and produced a
    convincingly wrong table (transition's output appeared under `unless`). The
    committed harness waits on a per-run marker instead. If you extend the table,
    keep that property.
  - **45 of 59 commands exercised, 14 skipped with reasons.** The skip list is
    length-asserted so a migration cannot quietly demote an inconvenient row.
    **Five of the skips are latent parse defects, not environment limits**, and
    each deserves triage independent of this arc: `async` (`async do … end` →
    "Async command execution failed"), `default` (`default @data-theme to "light"`
    → "Invalid target type: object"), `process` (`process partials in <var>` →
    "expects partials keyword"), `pseudo-command` (no top-level form compiles),
    `take` (`take .item from <.item/> for #probe` → "Expected variable name").
    Every one of these is the command's *own documented example*, adapted only for
    the fixture. Candidates for `PARSER_NEXT_STEPS.md`.
  - **New defect found, and step 3 will NOT fix it:** `unless` leaves an **AST
    node** (`{type,commands,start,end,line,column}`) in `it` — on **both** paths,
    so it is not caused by the propagation loop. `unless` shares
    `ConditionalCommand` with `if`, and `if` leaves `it` alone on the same input.
    Belongs to step 2 and needs triage first.
  - **The headline number is asserted: 29 of the 45 exercised commands disagree
    between the two paths.** Step 3 should drive that down; nothing else should
    move it.
- 2026-07-28 — **step 2 specified** (docs only; no code). Ran an upstream-parity
  pass over `_hyperscript/src/parsetree/commands` to answer, per command, "should
  this set `it`?", and turned step 2 from a decision *rule* into a decision
  *table*. Two results worth carrying:
  - **Step 2 is nearly empty.** Fourteen of the fifteen `defect:` rows need no
    per-command change — their sequence-path value already matches upstream, so
    step 3's deletion converges them. The envelope migration the queue originally
    prescribed would have touched every one of them for no gain.
  - **`unless` is worse than the audit could see: its body never executes.**
    `parseInput` hands `unless` an *array* where `if` gets the block *node*, and
    `executeCommands` silently returns any entry lacking an `.execute` method —
    which a parsed AST node does. The `it` leak is that returned node. The
    existing `unless.test.ts` is green because it feeds **mock objects with
    `.execute()`**, a shape the parser never produces. This is a live bug in a
    shipped command and only incidentally Arc C's; it deserves its own PR ahead
    of the arc, with a test that goes through the real parser.
  - Two genuine judgment calls left open and named: `settle` and `transition`
    self-assign the element where upstream sets nothing.
- 2026-07-28 — **`unless` fix merged (#805)**, as its own PR ahead of the arc per
  the recommendation above. Body now executes on every surface form (then/end,
  bare, multi-command, in-handler); the unless-only `it` self-assign is gone;
  the executor's silent return-the-body-unexecuted fallthroughs now execute
  through `_runtimeExecute`. Regression gate: the end-to-end describe in
  `unless.test.ts` (real parser → real runtime → DOM assertions). Audit row
  flipped to `null`/Event = `if`; disagreement assert 29 → 30 (see the comment
  in the audit — the broken unless "agreed" only because both paths held the
  same leaked node). Four mock-based tests that pinned the broken contract were
  updated in the same PR. Finding for Arc E: the hybrid parser desugars
  `unless` to `if not(...)` and never had the bug — the canonical class was the
  broken copy, the #792 pattern again. **With this, step 2's remaining work is
  only the settle/transition judgment call; everything else is step 3.**
- 2026-07-28 — **step 3 merged (#806) — arc complete.** `unwrapCommandResult`,
  `propagateCommandResult` and both call sites are gone; `runtime.test.ts`'s ten
  direct tests and the audit's whole branch-classification section went with
  them (the mechanism they described no longer exists). Outcomes:
  - **All 14 defect rows flipped and the defect list is now empty.** Ten
    (`wait`, `go`, `push`, `replace`, `scroll`, `copy`, `beep`, `start`,
    `toggle`, `put`) leave `it` at its initial value, matching both upstream and
    their own sequence-path behaviour. Four — `settle`, `pick`, `render`,
    `transition` — **converged**: each had already assigned `it` correctly and
    the loop was overwriting it, so deletion alone fixed them. The step-2
    decision table predicted every one of these; **no command was migrated.**
  - **Path disagreements 30 → 26**, and the remainder are ALL the initial-value
    non-goal (`null` vs the DOM event, for void commands). No wrapper leaks
    remain. A new disagreement of any other kind now means a second propagation
    mechanism has grown back.
  - **The unplanned find:** the loop wrote both `it` AND `result`, while
    commands self-assign only `it` — so deleting it would have silently broken
    the `result` symbol in handlers (`set x to 5 then put result into #probe`
    worked in a handler and nowhere else; `start view transition … then put
    result into #panel` is a documented example that depends on it). Fixed by
    making `it`/`result` one slot resolved through either name — the
    `it`/`its`/`result` expressions plus the sync/async identifier resolvers and
    `render.ts` — rather than by touching ~20 commands. `resolveIdentifierSync`
    already did `context.it ?? context.result`; the registered expressions were
    the inconsistent copies. Four new tests in `runtime.test.ts` pin it,
    including inside a handler. One existing test
    (`references/index.test.ts`, "should return undefined when not set") pinned
    the OLD independence and was deliberately updated, with a second case added
    for the genuinely-both-unset path.
  - **Pre-existing defect found and pinned, NOT fixed:** `get` is invisible to
    the immediately-following command — `get 42 then put it into #probe` yields
    `''`, but insert any command between them and it yields `42`. Verified
    identical on main before this change, so it is a `get` sequencing bug, not
    an Arc C consequence. Pinned as a KNOWN DEFECT test in `runtime.test.ts` so
    the knowledge survives; it wants its own triage.
  - Core suite 7834 → 7795 (net −39: ~54 tests deleted with the mechanism, ~15
    added). Full CI green.
- 2026-07-28 — **the open decision closed (#808): settle/transition self-assigns
  removed** (upstream parity). Decided from measurement, not taste: zero in-repo
  reliance; in every released version the handler path delivered a wrapper, not
  the element, so no shipped cohort ever saw the behaviour being removed; and
  the removal was free only while #806 was unreleased. Audit rows flipped to
  `null`/Event, disagreement assert 26 → 28, seven unit pins flipped in place.
  Suite 7795 → 7795. **The arc is now fully closed.** The one recorded sibling —
  send/trigger's `it = event` where upstream sets nothing — is the queue doc's
  follow-up, deliberately not folded in here.
