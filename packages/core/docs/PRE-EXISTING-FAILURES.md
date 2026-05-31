# Pre-existing test failures — triage

> **Next session: start here.** This is the handoff/checklist for the remaining
> pre-existing test work. The "Fixed in this PR" section is done (PR #237). Pick
> up the **"NOT fixed — genuine issues for follow-up"** section, in this order:
> (1) the real `when`/`where` falsy-guard bug (`<command> when <falsy>` does not
> skip) + rewrite the 10 `conditional-modifiers` tests against real parsing;
> (2) wire `::name` global reads through `notifyGlobalRead`;
> (3) decide the `parser` `first of` AST shape; then `start-view-transition`.
> Cross-session context (the 79%→82% parity arc, PRs #236/#237) is in the
> auto-loaded memory note `project-expression-parity-completion`.

A sweep (2026-05-31) of the failing vitest tests that existed on `main`,
unrelated to the expression-parity arc. This PR fixes the **stale tests** (where
the production behavior is correct/intentional and only the test expectation had
drifted) and documents the rest — genuine bugs and design-ambiguous cases that
deserve focused follow-ups rather than a rushed batch fix.

## Fixed in this PR (stale tests — production behavior is correct)

| Test                                                   | Was                                                                   | Now                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `runtime.test.ts` "meaningful error messages"          | expected "Unsupported AST node type for evaluation"                   | "Unknown AST node type" (the canonical message in `runtime.ts:226`)                          |
| `runtime.test.ts` "missing context elements"           | expected "Invalid hide target"                                        | "no target specified" (the actual descriptive `hide` error)                                  |
| `plugin.test.ts` "unknown node type throws"            | regex `/Unsupported AST node type/`                                   | `/Unknown AST node type/`                                                                    |
| `element-resolution.test.ts` "no target element"       | ASCII hyphen `-`                                                      | em-dash `—` (matches the code)                                                               |
| `runtime-objectliteral.test.ts` ×3                     | set `context.variables` (a vestigial field the evaluator never reads) | populate `context.locals` (the field `evaluateIdentifier` resolves)                          |
| `class-manipulation.test.ts` "warn when var not found" | spied `console.warn`                                                  | spies `debug.command` (diagnostics route through the debug system, deliberately not console) |

## NOT fixed — genuine issues for focused follow-up

### `conditional-modifiers.test.ts` (10) — entangled with a real `when`/`where` bug

The 10 unit tests build synthetic `{ type: 'expression' }` condition nodes (cast
`as unknown as ASTNode`) and assume a mock evaluator handles the guard — an old
runtime API. The current runtime evaluates the guard via `evaluateAST`, which
rightly rejects the synthetic type. **But** a real end-to-end check surfaced a
genuine bug worth its own fix:

```
add .active to me when false   // still adds .active — the falsy guard does NOT skip
```

`when true` works (same as no guard), so the guard is effectively ignored.
Rewriting the 10 tests against real parsing would _expose_ this bug, not paper
over it. **Action: fix the `when`/`where` command-modifier guard (skip on falsy),
then rewrite these tests against real `<command> when <condition>` parsing.**

### `plugin.test.ts` "global read hook — `::name`" (1) — real feature gap

`::name` explicit-global reads don't fire the registered global-read hook
(`expected [] to include 'x'`). `notifyGlobalRead` fires for `$name` globals
(`evaluateIdentifier`) but the `::name` path isn't wired to it. **Action: route
`::name` reads through `notifyGlobalRead`.**

### `parser.test.ts` "first of" (1) — AST-shape design decision

`first of items` now parses as a `callExpression` (`first(items)`); the test
expects a `binaryExpression` with operator `of`. The behavior is correct
(`first of [10,20,30]` → 10); only the AST shape changed. Whether the canonical
shape should be a positional/binary node or a call is a design decision — left
for the owner rather than guessing.

### `start-view-transition.test.ts` (1) — needs investigation

"wraps body in withViewTransition when API supported" expects the options object
(`{ transitionName: 'fade' }`) as the 2nd argument to the view-transition call;
the command currently passes only 1 argument. Could be a small real gap or a
test expecting unimplemented behavior — investigate before changing.
