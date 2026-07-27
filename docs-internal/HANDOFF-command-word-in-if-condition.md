# Handoff: a command-name word in a single-line `if` condition breaks the condition

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
command in command *position*.

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
