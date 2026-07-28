# HANDOFF — command-arch Arc C: the command output contract

> **Arc brief, written 2026-07-28.** Detail for Arc C of
> [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md)
> (the queue holds one paragraph; this file is authoritative for the arc).
> Format follows [HANDOFF-command-arch-target-resolution.md](./HANDOFF-command-arch-target-resolution.md)
> (Arc D, complete).
>
> **Status: brief written, arc not started.** Next action: step 0.
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

Per-command, smallest PRs that are still reviewable. For each command in the
fall-through set, decide from the audit table:

- **sequence path already correct** → no code change; the fix arrives with step 3.
- **should set `it`, currently doesn't on either path** → add the self-assign.
- **should not touch `it`** → nothing.

Each PR flips the affected rows in the step-1 audit table, so the diff shows
exactly which `it` values changed. That is the review artifact.

### Step 3 — delete `unwrapCommandResult`, the loop, and the `:121` collapse

Delete the function, replace the two (by then one) call sites with nothing, and
retire `runtime.test.ts:950-986`'s six positive cases.

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
  back, every self-assigning command silently stops setting `it` — and, per
  Consequence 3, nothing in the suite would fail. Worth its own test.
- `export { X } from './f'` creates **no local binding** — relevant when moving
  `unwrapCommandResult`/`propagateCommandResult` between modules.
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
