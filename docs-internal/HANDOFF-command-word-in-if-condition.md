# Handoff: a command-name word in a single-line `if` condition breaks the condition

> **RESOLVED 2026-07-27** (same PR as the two swallow fixes, #786) for every
> shape below. `parseIfCommand` no longer decides structure by asking "is this
> token spelled like a command?" in isolation — the three sites that did (the
> `hasThen` scan, the implicit-multi-line scan, the single-line condition loop)
> now use command **position**:
>
> 1. **The condition is never empty** → the first token after `if`/`unless` is
>    never the body. The condition loop's first expression parse is unguarded;
>    the form-detection scans exempt the first token (`isBodyCommandStart`).
> 2. **A token right after an operator is an operand** → `OPERAND_INTRODUCERS`
>    (`is`, `not`, comparison/arithmetic ops, …) in the same helper covers
>    `if x is set …`.
> 3. **A newline without `then` breaks a command chain** → the `hasThen` scan
>    stops at a command starting a LATER line; same-line commands and their
>    joining `then`s bind the body (upstream keeps then-joined commands in the
>    body).
>
> **A cautionary episode is recorded below** (§ "How the first fix attempt made
> it worse"): the first version of the two swallow-fix bounds used the raw
> name-test and *regressed five upstream-valid shapes vs main* — caught only by
> branch-vs-main probing, because no in-repo source uses command-word
> conditions, so **every gate stayed green through all of it**.
>
> Coverage: the `a command-name word in the condition does not break the if` and
> chain-rule guard blocks in
> `packages/core/src/parser/__tests__/then-as-separator.test.ts`, and the
> command-word/then-joined DOM block in
> `packages/core/src/api/if-body-then-execution.test.ts`. 12 of the 14 cases
> fail against the pre-repair parser.
>
> **Residual, low, open in [PARSER_NEXT_STEPS.md](PARSER_NEXT_STEPS.md):** a
> command-word in a mid-condition position that is neither first nor
> operator-preceded (e.g. after a possessive: `if x's set is 3` + newline body)
> can still mislead the form scans. The operand list is extensible for cheap
> wins (`'s`, `the`, `my`, `of` — positions that can never precede a command),
> but the fix that removes the heuristics entirely is **expression-first
> condition parsing**: parse the condition via `parseExpression()` from token
> zero, then classify the form from what follows. Viable — the pratt parser
> accepts command-word operands (`add is 3` parses cleanly, probe P1).

Found 2026-07-27 while fixing the implicit-multiline `if` defect
([HANDOFF-implicit-multiline-if.md](HANDOFF-implicit-multiline-if.md)).
**Independent of it** — it reproduces before and after that fix, and the fix only
changed which of two wrong answers you get at top level. The oracle is
`loadCanonicalParser()` in
[canonical-validity.ts](../packages/testing-framework/src/multilingual/canonical-validity.ts)
(the real `hyperscript.org` engine, headless); upstream accepts every source
below.

---

## Severity: in a handler, the `if` disappears and its body runs unconditionally

The trigger is a **single-line `if`/`unless` whose condition STARTS with a bare
identifier that is also a command name** — `log`, `set`, `add`, … Two different
failures depending on where it sits:

**Inside an event handler — silent, and the dangerous one:**

```hyperscript
on click if log is 3 add .a to #target     -- `log is 3` is FALSE
```

```
ok: true   errors: ["Unexpected token: is at line 1, column 17"]

eventHandler
  command:log     <-- the condition's first word, promoted to a command
  command:add     <-- the if's BODY, now an unconditional sibling
```

The `if` node is **gone**. Verified in jsdom: clicking applies `.a` even though
the condition is false. Same silent `ok: true` + recovered-error shape as #785
and the implicit-multiline defect — the third member of that family.

**At top level — loud:**

```hyperscript
if log is 3 add .a to #t
```

fails fatally with `Expected condition after if/unless` (`success: false`,
`__ERROR__` node). `hyperscript.eval` of that source throws
`Compilation failed: Expected condition after if/unless`.

## Where it is

The **single-line** condition loop in
[`parseIfCommand`](../packages/core/src/parser/command-parsers/control-flow-commands.ts)
(the `else` branch of `if (isMultiLine)`, the `while` guarded by
`!ctx.checkIsCommand() && !ctx.isCommand(ctx.peek().value)`).

The loop's job is to consume condition tokens and stop at the command that starts
the body. It decides that purely by asking "is this token a command name?", which
cannot distinguish a command from an identifier that merely shares its spelling.
With `log` as the first condition token the guard is false immediately, the loop
runs zero times, `conditionTokens` is empty, and it throws
`Expected condition after if/unless`.

Note this is the same class of question the two lookaheads above it get wrong in
their own ways, and the same `checkIsCommand()` heuristic. A real fix probably has
to consult the expression parser rather than a name-set — a command name is only a
command in command *position*. (The landed fix approximates command position with
two structural facts — see the RESOLVED header; the full expression-first version
remains the queued follow-on.)

## How the first fix attempt made it worse

The two swallow-fix bounds (the implicit-scan line bound and the first version of
the `hasThen` bound, which broke at the **first command token**) were built on the
same raw name-test this defect lives in. Result, measured by branch-vs-main
single-file probes: **five upstream-valid shapes that parsed cleanly on `main`
regressed on the PR branch**, four loudly and one silently:

| # | Shape | main | first-attempt branch | Cause |
| - | ----- | ---- | ------------------- | ----- |
| A | `if log is 3` ⏎ body ⏎ `end` | clean | fatal | implicit-scan line bound |
| B | `if log is 3 then` ⏎ body ⏎ `end` | clean | fatal | first-command `hasThen` bound |
| C | `if x is set then` ⏎ body ⏎ `end` | clean | fatal | first-command `hasThen` bound |
| C2 | `if x is set` ⏎ `then` body ⏎ `end` | clean | fatal | first-command `hasThen` bound |
| D | `if c add .a to #t then add .b to #t` | both conditional | `.b` unconditional — **silent** | first-command `hasThen` bound |

They regressed because `main`'s scan bugs had been accidentally *rescuing*
command-word conditions: misclassifying these shapes as multi-line routed the
condition through `parseExpression()`, which handles command-word operands fine.
Correct bounds + a name-test = the underlying defect exposed on new routes.

Two lessons worth keeping:

1. **Every gate was green through all of it** — 7600+ unit tests, the
   10-signal multilingual ratchet, the workspace suite. No in-repo source or
   corpus pattern puts a command-word in an `if` condition, so the gates are
   structurally blind here. The only detector was probing candidate shapes
   **branch-vs-main** (single-file `git checkout main -- <file>` swap) against
   the upstream oracle.
2. **A bound built on a broken classifier inherits the breakage.** The repair
   was not a third patch around `checkIsCommand()` but replacing the question
   it answers (spelling → position).

## Ruled out

| Shape | Result |
| ----- | ------ |
| `if x is 3 add .a to #t` (ordinary identifier) | clean, correct |
| `if 3 is log add .a to #t` (command word NOT first) | clean, correct |
| `if it.log is 3 …`, `if my.log is 3 …` (property path) | clean, correct |
| `if log is 3 then add .a to #t end` (explicit `then … end`) | clean, correct |
| `if log add .a to #t` (bare, no comparison) | same fatal error |
| `unless log is 3 add .a to #t` | same fatal error (shares parseIfCommand) |

The explicit `then … end` form is unaffected, which is the workaround — it routes
through `parseExpression()` instead of this loop.

## Verification harness

No shipped example trips this, so the shipped-sources gate is **not** the
regression test — it would pass a broken fix. Write coverage first, beside the
existing cases in
`packages/core/src/parser/__tests__/then-as-separator.test.ts` (parse shape) and
`packages/core/src/api/if-body-then-execution.test.ts` (DOM effect).

Assert **structurally and behaviourally**. For the handler shape `success`/`ok`
are already true against the bug, so they prove nothing; the assertion that
matters is that the `if` node still exists and that its body does NOT run on a
false condition.
