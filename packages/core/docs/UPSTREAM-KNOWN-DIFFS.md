# Upstream `_hyperscript` parity — known differences

This records the places where HyperFixi **intentionally** diverges from upstream
`_hyperscript`, plus the structural reasons some upstream expression tests can't
pass through our browser-parity harness. None of these are bugs; they are
deliberate semantics choices or harness artifacts. They show up as failures in
`src/compatibility/browser-tests/expressions.spec.ts` and should **not** be
"fixed" by contorting the engine — change this document if a decision changes.

The harness pass-rate floor is `EXPRESSION_PASS_RATE_FLOOR` in
[`expressions.spec.ts`](../src/compatibility/browser-tests/expressions.spec.ts).
It only ratchets up; the gap between it and 100% is mostly the items below.

## Intentional semantic divergences

### `as Values` on a checkbox → boolean (not the value string)

Upstream converts a checked checkbox to its `value` attribute. HyperFixi's
`getInputValue` (`src/expressions/conversion/index.ts`) returns the boolean
`checked` state for checkboxes — this is unit-tested and deliberate (a checkbox
models a boolean, and `input as Values` over a form is more useful with real
booleans than value strings). Affects ~3 upstream `asExpression` cases
("converts an input element into Values", "converts checkboxes into a Value",
"converts a complete form into Values").

**Decision: keep checkbox → boolean.** Do not flip silently.

### bare `in` → boolean membership (not an intersection array)

Upstream `1 in [1, 2, 3]` returns the intersection `[1]`. HyperFixi keeps `in`
/ `is in` as a **boolean** membership test (`1 in [1,2,3]` → `true`), which is
what the comparison operators and the vast majority of user code expect. Affects
the `in.js` "query return values" / "null value in array" cases.

**Decision: keep boolean `in` / `is in`.**

### Error-message text is not matched verbatim

A few upstream tests assert exact error strings, e.g. `typecheck` "Typecheck
failed!" and "You must parenthesize logical/math operations with different
operators". HyperFixi raises equivalent errors with different wording. Matching
the exact text has no user value and would couple us to upstream phrasing.

**Decision: accept as known-diff; do not match upstream error text.**

## Deferred feature

### `typecheck` postfix `X : Type` syntax

Upstream supports a postfix `:` typecheck (`'foo' : String`, `null : String!`).
HyperFixi already implements the `X is a Type` form; the `:` variant is deferred
because `:` collides with object-literal (`{k: v}`) and ternary syntax, and the
remaining payoff is partly the error-message parity above. Not planned unless a
concrete need appears.

## Harness artifacts (product is correct; the test shape can't observe it)

These upstream tests consume results in a way our async runtime can't satisfy
through the compatibility shim. The equivalent **awaited** behavior is correct
and covered by `src/compatibility/expression-parity-phaseb.test.ts` and unit
suites.

- **Synchronous `_hyperscript(expr) === el`** — e.g. several
  `relativePositionalExpression` / `positionalExpression` / `closest` cases
  compare the result of `_hyperscript(...)` to an element _synchronously_.
  HyperFixi evaluates asynchronously; the sync fast-path (`evaluateExpressionSync`
  in `runtime.ts`) covers pure values but not DOM-collection queries by design.
  The parse + evaluation are correct (awaited `run`-based equivalents pass).
- **Fire-and-forget `_hyperscript("set …")`** — `attributeRef` / `possessive`
  `set`/`put` cases call the command without awaiting, then read immediately.
  Lifting them needs synchronous _command_ execution (commands mutate state), a
  deliberately out-of-scope architectural change. The write paths themselves are
  correct (see the Track A guards).
- **`_hyperscript.config.conversions` in the harness sandbox** — the 2 custom-
  converter cases register on `_hyperscript.config` inside the harness test-body
  sandbox, where `_hyperscript.config` isn't exposed. The product API
  (`hyperfixi.config.conversions` + dynamic resolvers) is implemented and guarded
  (Track E); only the harness plumbing is missing.
