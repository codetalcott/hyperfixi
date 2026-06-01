# Pre-existing test failures — triage

> **Status: all triaged items resolved.** PR #237 fixed the stale tests; the
> follow-up below fixed the four genuine issues. Cross-session context (the
> 79%→82% parity arc, PRs #236/#237) is in the auto-loaded memory note
> `project-expression-parity-completion`.

A sweep (2026-05-31) of the failing vitest tests that existed on `main`,
unrelated to the expression-parity arc. PR #237 fixed the **stale tests** (where
the production behavior was correct/intentional and only the test expectation had
drifted). The follow-up fixed the genuine bugs and settled the design-ambiguous
cases.

## Fixed in PR #237 (stale tests — production behavior is correct)

| Test                                                   | Was                                                                   | Now                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `runtime.test.ts` "meaningful error messages"          | expected "Unsupported AST node type for evaluation"                   | "Unknown AST node type" (the canonical message in `runtime.ts:226`)                          |
| `runtime.test.ts` "missing context elements"           | expected "Invalid hide target"                                        | "no target specified" (the actual descriptive `hide` error)                                  |
| `plugin.test.ts` "unknown node type throws"            | regex `/Unsupported AST node type/`                                   | `/Unknown AST node type/`                                                                    |
| `element-resolution.test.ts` "no target element"       | ASCII hyphen `-`                                                      | em-dash `—` (matches the code)                                                               |
| `runtime-objectliteral.test.ts` ×3                     | set `context.variables` (a vestigial field the evaluator never reads) | populate `context.locals` (the field `evaluateIdentifier` resolves)                          |
| `class-manipulation.test.ts` "warn when var not found" | spied `console.warn`                                                  | spies `debug.command` (diagnostics route through the debug system, deliberately not console) |

## Fixed in follow-up (genuine issues)

### 1. `when` command-modifier guard now skips on falsy — real bug

`add .active to me when false` used to still add `.active`: the runtime guard
(`runtime/command-adapter.ts` — `mods.when || mods.where`) was correct, but the
**traditional command parsers** never attached the condition, so the statement
loop silently discarded the trailing `when <cond>` tokens.

**Fix:** `parseCommand()` (`parser/parser.ts`) is now a thin wrapper around
`parseCommandCore()` that, after the command-specific parse, consumes a trailing
`when` and attaches the parsed condition to `modifiers.when` (block commands with
a body are skipped). The runtime then evaluates it and skips on falsy.

**`where` is NOT an equivalent surface guard.** `where` is a real collection-
filter operator (binding power 28 in the pratt parser; `case 'where'` in
`parser/runtime.ts`), so `me where false` binds as a filter expression
(`collectionExpression`, operator `where`) during target parsing and never
reaches the guard position. Making `where` a trailing guard would break the
legitimate filter operator, so **`when` is the canonical command guard.** The
runtime still honors a hand-built / semantic `modifiers.where`; it is just
unreachable via the `<command> … where <cond>` surface.

The 9 synthetic unit tests (which built `{ type:'expression' }` nodes + a mock
evaluator the adapter no longer consults) were rewritten in
`runtime/conditional-modifiers.test.ts` to drive the **real parser + runtime**
end-to-end, including a test pinning the `when`-guard / `where`-filter
distinction so it isn't accidentally "re-fixed" into a regression.

### 2. `::name` explicit-global reads now fire `notifyGlobalRead`

`::name` parses to `{ type:'identifier', name, scope:'global' }`.
`evaluateIdentifier` (`parser/runtime.ts`) never inspected `node.scope`, so it
fired the global-read hook only on the `$name` path. Added an explicit-global
branch (before the locals lookup): when `node.scope === 'global'` and the global
exists, fire `notifyGlobalRead(name, context)` and return the value (falling
through to the normal lookups otherwise). Symmetric with the existing
`::name`-write path. Covered by `plugin.test.ts` "global read hook — `::name`".

### 3. `first of items` AST shape — decided: `callExpression`

`first of X` parses as a `callExpression` (`first(X)`), evaluated correctly by
the `first`/`last` case in `evaluateCallExpression`. The old test expected
`binaryExpression('of')` — **rejected as the canonical shape.** `first of X` is
positional/index access ("first element of X"), semantically distinct from
property-access `of` (`value of me` → `me.value`); the binary-`of` evaluator
treats the left side as a property path and would compute `items['first']`
(undefined). The "more honest" alternative is a dedicated `positionalExpression`
node (used by the hybrid parser), not binary `of` — out of scope for a test fix.
`parser.test.ts` updated to assert the `callExpression` shape, with a comment.

### 5. `dom-mutation.test.ts` — hang (whole-suite blocker) + 6 stale assertions

The file **hung indefinitely** (blocking any full `src/commands` run), masking
several stale assertions. Root cause of the hang: the test passed invalid
semantic position names (`start`/`end`) to `insertContentSemantic`. The valid
`SemanticPosition` vocabulary is `before / prepend / append / after / into`, so
`toInsertPosition('start')` returned `undefined`, which flowed into
`element.insertAdjacentHTML(undefined, …)` — that **hangs under happy-dom**
(a real DOM throws `SyntaxError`).

Fixes:

- **Helper hardening** (`commands/helpers/dom-mutation.ts`) — defense-in-depth so
  a bad position can never hang again: `toInsertPosition` now throws on an
  unknown name (its return type already promised a value), and `insertText`
  validates the position before calling `insertAdjacentHTML`/`insertAdjacentText`.
  No production caller passes dynamic positions, so this only converts a hang
  into a clear error.
- **Test fixes** (`dom-mutation.test.ts`, all 6 stale assertions, no production
  behavior changed):
  - position-name drift: `start`→`prepend`, `end`→`append`, `replace`→`into`
    (the `toInsertPosition` and `insertContentSemantic` cases);
  - `replace` semantics: the helper replaces a target's _content_ (`innerHTML`,
    the documented `into` behavior), so the three tests asserting the _element_
    was removed (`#target` becomes null) were corrected to assert
    content-replacement;
  - `removeElements` mix: an orphan (no parent) isn't removed, so the count is 1,
    not 2;
  - `swapElements`: `document.body` also holds the `beforeEach` `target` div, so
    the absolute-index assertions were rewritten as relative-order checks.

Result: 44/44 passing; the full `src/commands/helpers` directory now completes
instead of hanging.

**`swapElements` audit (follow-up).** `swapElements` is correct for normal cases
(same-parent adjacent/non-adjacent, cross-parent, same-element no-op) but **threw
an uncaught `HierarchyRequestError` for an ancestor/descendant pair** (moving a
node into its own subtree). Hardened to return `false` for nested pairs — same
graceful-failure contract as the orphan case — and added edge-case tests
(cross-parent, same-element, nested). Note: `swapElements` currently has **no
production callers** (the `swap`/`morph` command does _content_ swapping via the
morph adapter, not element-position swapping); it remains an exported helper, so
it was hardened rather than removed. Removal is a separate API-surface decision.

### 4. `start-view-transition` forwards `transitionName`

The parsed `transitionName` was discarded (`void input.transitionName`).
`withViewTransition(callback, options?)` (`lib/view-transitions.ts`) now accepts
an options object and maps `transitionName` to the View Transitions API `types`
(modern object form, with a safe fallback to the callback form for browsers that
only support it). `commands/animation/start-view-transition.ts` forwards
`{ transitionName }` when a name is present. Covered by the
`start-view-transition.test.ts` "wraps body in withViewTransition" test.
