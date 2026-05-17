# Parser Audit — `packages/core/src/parser`

**Date:** 2026-05-16
**Scope:** all `.ts` under `packages/core/src/parser/` (28,753 LOC across ~45 files including tests)
**Method:** static read, grep-driven caller analysis, `npm run test:check` after every inline change

---

## Summary table

| #   | Finding                                                                                       | Severity | Est. impact                                              | Status       |
| --- | --------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------- | ------------ |
| 1   | `console.log` in `parseSwapCommand`                                                           | P0       | 1 LOC                                                    | **applied**  |
| 2   | Commented-out `console.log` in `parseJsCommand`                                               | P0       | 2 LOC                                                    | **applied**  |
| 3   | 7 unused legacy precedence-chain methods                                                      | P1       | ~140 LOC + interface slim                                | **proposed** |
| 4   | `ParserContext` exposes ~13 methods with zero external callers                                | P1       | ~30 LOC of getContext bindings + interface decls + mocks | **proposed** |
| 5   | Named-parameter parsing duplicated in `async-commands` & `event-commands`                     | P1       | ~25 LOC                                                  | **proposed** |
| 6   | `parseNavigationFunction` signature mismatch (interface vs impl)                              | P1       | Interface decl bug                                       | **proposed** |
| 7   | Stale semantic-skip TODO (11+ commands never migrated)                                        | P2       | Doc/scope decision                                       | **proposed** |
| 8   | `HYPERSCRIPT_KEYWORDS` and `TOKENIZER_KEYWORDS` are different sets despite "superset" comment | P2       | doc + 1 set re-derive                                    | **proposed** |
| 9   | Silent catch blocks at `parser.ts:624`, `:716`                                                | P2       | breadcrumb logging                                       | **proposed** |
| 10  | Long functions in `control-flow-commands.ts`, `variable-commands.ts`, `event-commands.ts`     | P2       | refactor target                                          | **proposed** |
| 11  | 39 `any` casts in `runtime.ts`                                                                | P2       | type tightening                                          | **proposed** |
| 12  | `regex-parser.ts` / `full-parser.ts` look orphaned BUT are public subpath exports             | —        | none                                                     | **NOT dead** |

---

## A. Dead / vestigial code

### A.1 Seven precedence-chain methods are unused (P1, ~140 LOC + ParserContext slim)

In `parser.ts:705–875` there's a block flagged with the comment:

> Legacy expression chain methods (kept for reference, no longer called). These will be removed in a follow-up cleanup.

The comment is **partially wrong** — the methods are still bound onto `ParserContext` in `parser.ts:4286–…` and `command-parsers/control-flow-commands.ts:458` calls `ctx.parseLogicalAnd()`. So one of the eight is alive.

External-caller count via `ctx.parseXxx` / `context.parseXxx` (excluding tests):

| Method                | Callers                          | Action           |
| --------------------- | -------------------------------- | ---------------- |
| `parseAssignment`     | 0                                | delete           |
| `parseLogicalOr`      | 0                                | delete           |
| `parseLogicalAnd`     | 1 (control-flow-commands.ts:458) | **keep for now** |
| `parseEquality`       | 0                                | delete           |
| `parseComparison`     | 0                                | delete           |
| `parseAddition`       | 0                                | delete           |
| `parseMultiplication` | 0                                | delete           |
| `parseUnary`          | 0                                | delete           |

**Proposal:** delete the 7 unused methods, prune them from `ParserContext.ExpressionParser` (`parser-types.ts:316–334`), `getContext()` bindings (`parser.ts:4286–…`), the mock (`__test-utils__/parser-context-mock.ts:275–323`), and the test assertions (`parser-context.test.ts:66–72`). Leaves `parseLogicalAnd` in place until its single caller is migrated to `parseExpressionPratt(<bp>)` (a separate, more delicate refactor — Pratt's binding-power table needs to be plumbed through).

**Risk:** Low. ParserContext is a structural interface; consumers shadow it via tests we own. Run `npm run typecheck --prefix packages/core` after pruning to catch any external callers.

### A.2 `regex-parser.ts` and `full-parser.ts` look orphaned but are public API

Both files are **public subpath exports** in `packages/core/package.json`:

- `./parser/regex` → `dist/parser/regex-parser.{js,mjs,d.ts}` (lines 83–86)
- `./parser/full` → `dist/parser/full-parser.{js,mjs,d.ts}` (lines 53–56)

Rollup entries are configured in `rollup.config.mjs:82–83`. Internally only commented-out `browser-bundle-modular.ts` imports them. **Do not delete** — they are the documented modular-runtime parsers per `parser-interface.ts:5–10`.

If undocumented/unwanted externally, that's a v3 API decision, not a parser cleanup. Out of scope for this audit.

### A.3 `hybrid/` directory is alive

`HybridParser` is imported by 7 generated bundles (`browser-bundle-{hybrid-complete,minimal-generated,animation-generated,forms-generated,textshelf-{profile,minimal}}.ts`) and `hybrid-parser.ts` wraps it for the public `./parser/hybrid` subpath. Keep.

The hybrid AST types in `hybrid/ast-types.ts` (116 LOC) intentionally duplicate names from the main `types.ts` so the hybrid bundle can tree-shake free of the full type surface. **Working as intended.**

---

## B. Code smells

### B.1 ✅ Stray `console.log` in `parseSwapCommand` — REMOVED

Was at `command-parsers/dom-commands.ts:322`:

```ts
console.log('[PARSER DEBUG] parseSwapCommand called');
```

Removed inline. Test suite still green (`npm run test:check`).

### B.2 ✅ Commented-out debug log in `parseJsCommand` — REMOVED

Was at `command-parsers/utility-commands.ts:579–580` (a 2-line `// Debug logging for development` header + a long commented `console.log`). Removed inline.

### B.3 Stale TODO in semantic-skip allowlist (P2)

`parser.ts:3225–3264` maintains a hardcoded `skipSemanticParsing: string[]` of ~17 commands that fall through to traditional parsing. The leading comment says:

```ts
// TODO: Add semantic parsing support for these commands
// - 'wait' has complex multiline 'or' continuation and 'from' clauses
// - 'repeat' has nested command blocks and 'until event X from Y' syntax
// ...11 more...
```

Status assessment:

- Most of these (wait, repeat, for, set, put, increment, decrement, if/unless, make, measure, trigger, halt, remove, exit, return, closest, js, tell) have non-trivial syntax tied to upstream `_hyperscript` quirks. Migrating them to semantic is a multi-PR initiative, not a sprint.
- The `✅ 'call'/'get' now supported` line at :3262 suggests the list does get pruned over time.

**Proposal:** either link this TODO to a tracking issue / project memory entry, or convert the comment into a stable "design note" explaining that these commands keep traditional parsing on purpose. Right now it reads as a known-debt list that's been silent for ages, which is misleading.

### B.4 Silent `catch {}` blocks (P2)

Two truly silent catches:

- `parser.ts:624–628` — discarding the body of an arrow function the parser already flagged as an error. Recovery is intentional, but a `debug.parse('arrow body discarded:', ...)` line would help when diagnosing follow-on parse errors.
- `parser.ts:716–720` — same pattern in the legacy `parseAssignment` chain. If A.1 is acted on, this block disappears with the method.

The catch at `parser.ts:2374–2393` already uses `debug.parse(...)` — good. The catch at `parser.ts:2348–2356` returns a structured `{ targetFailed: true }` flag and is consumed by the caller — also good.

### B.5 Long functions worth extracting (P2)

These are not bugs but readability/testability targets:

| Location                                                              | Length  | Suggestion                                                      |
| --------------------------------------------------------------------- | ------- | --------------------------------------------------------------- |
| `command-parsers/control-flow-commands.ts` `parseRepeatCommand` block | 260 LOC | Extract iterator-binding parse + body parse                     |
| `command-parsers/control-flow-commands.ts` `parseIfCommand` block     | 211 LOC | Extract condition-token collection (the `parseLogicalAnd` site) |
| `command-parsers/variable-commands.ts` `parseSetCommand` block        | 165 LOC | Extract target parsing                                          |
| `command-parsers/async-commands.ts` `parseWaitCommand` block          | 133 LOC | Extract `wait for event` vs `wait <duration>` arms              |
| `command-parsers/event-commands.ts` `parseTriggerCommand`             | 131 LOC | Extract named-param body (see C.1)                              |

### B.6 Type laxness in `runtime.ts` (P2, ~39 `any`)

`runtime.ts` (1,062 LOC, the **AST execution engine**, technically distinct from the parser proper) carries ~39 uses of `any`:

- `unwrapTypedResult(result: any): any` (line 102)
- `const n = node as any` (line 138) — discriminated-union narrowing escape hatch
- `context as any` casts in arithmetic evaluation (lines 269–271, 361–383)

The right fix is a proper `RuntimeValue` union plus a `BinaryOp = '+' | '-' | …` table — not appropriate for this audit. The memory note about three evaluator paths (`runtime.ts` canonical vs. `expression-parser.ts` legacy vs. `base-expression-evaluator.ts`) is the larger context here.

### B.7 Magic lookahead at `parser.ts:3184` (P2)

```ts
const currentToken = this.current > 0 ? this.tokens[this.current - 1] : this.tokens[0];
```

The `this.current > 0` guard reads as if it's protecting against `current === 0`, but `this.tokens[0]` is then used as a fallback that may still be undefined if the token list is empty. Add a length guard or document the invariant.

---

## C. Duplication & reduction opportunities

### C.1 Named-parameter parsing duplicated (P1, ~25 LOC)

The same `checkpoint = savePosition(); if checkIdentifierLike(); advance(); if check(':') advance; else restorePosition;` pattern appears at:

- `command-parsers/event-commands.ts:74–90` (in `parseTriggerCommand`) — output: `objectLiteral` AST node wrapping a `{key, value}` pair
- `command-parsers/async-commands.ts:230–246` (in `parseInstallCommand`) — output: `{name?: string, value: ASTNode}` record

The lookahead/backtrack logic is identical; only the result-shape differs.

**Proposal:** extract to `helpers/parsing-helpers.ts`:

```ts
// Returns { name: string | undefined, value: ASTNode }
export function parseMaybeNamedArgument(ctx: ParserContext): { name?: string; value: ASTNode };
```

Callers then format the result into their respective AST shapes. **~25 LOC saved, 1 unit-tested helper instead of 2 lookahead patterns.**

### C.2 `CommandNodeBuilder` boilerplate at 15 sites (P2, ~30–45 LOC)

The pattern `CommandNodeBuilder.fromIdentifier(id).withArgs(args).endingAt(ctx.getPosition()).build()` appears at 15+ call sites. Adding a `buildCommand(ctx, id, args)` convenience would save ~3 lines × 15 sites. **Low impact, defer.**

### C.3 Command-name dispatch ladder at `parser.ts:3284–3346` (P2, ~10 LOC)

8 special-case `if (commandName === 'X')` checks plus the compound-command fallback. A `Map<string, (ctx, token) => CommandNode>` dispatch would shave ~10 LOC and make the special-case set self-documenting. **Low impact, defer.**

### C.4 `HYPERSCRIPT_KEYWORDS` vs `TOKENIZER_KEYWORDS` (P2, comment fix)

`parser-constants.ts:264` defines `HYPERSCRIPT_KEYWORDS` (30 entries). `parser-constants.ts:510` defines `TOKENIZER_KEYWORDS` (52 entries) with a comment claiming it is a "superset" of the former. **It is not** — `HYPERSCRIPT_KEYWORDS` contains `matches`, `contains`, `every`, `without`, `first`, `last` which are absent from `TOKENIZER_KEYWORDS`.

The two serve different roles (tokenizer scanning vs. validation), so they don't need to merge. **Fix:** update the comment, or derive `TOKENIZER_KEYWORDS` from `HYPERSCRIPT_KEYWORDS ∪ <tokenizer-only set>` so the relationship is explicit.

---

## D. Subsystem health

### D.1 ParserContext exposes large unused surface (P1, ~30 LOC)

`ParserContext.ExpressionParser` (`parser-types.ts:305–371`) declares 17 expression-parsing methods. External caller counts:

| Method                  | callers |
| ----------------------- | ------- |
| `parseExpression`       | 25      |
| `parsePrimary`          | 30      |
| `parseCSSObjectLiteral` | 1       |
| `parseLogicalAnd`       | 1       |
| **all 13 others**       | **0**   |

Same story for `ASTFactory` (`parser-types.ts:264–297`):

| Method             | callers |
| ------------------ | ------- |
| `createIdentifier` | 9       |
| **9 others**       | **0**   |

The 13 unused expression methods + 9 unused AST-factory methods (~22 methods) carry:

- Interface declarations in `parser-types.ts`
- `.bind(this)` lines in `parser.ts getContext()` (~22 lines)
- `vi.fn()` stubs in `__test-utils__/parser-context-mock.ts`
- "API exists" assertions in `parser-context.test.ts`

**Proposal:** keep them as `private` methods on `Parser` (their internal callers in parser.ts still need them — e.g. `parseEventHandler` is called from `parser.ts:252, 312, 393`), but remove from the public `ParserContext` interface and from `getContext()`. Net: ~30–50 LOC across 4 files; cleaner intent.

**Latent bug discovered while auditing:**
`parser-types.ts:351–352` declares `parseNavigationFunction(): ASTNode`, but the implementation at `parser.ts:3472` is `parseNavigationFunction(funcName: string)`. Nothing calls it through the interface, so the lie has no functional impact — but the interface and impl have drifted. Confirms this method shouldn't be on the public interface.

### D.2 Error reporting is sparse (P2)

`ctx.addError` is called from command parsers in only ~8 places total: 4 in `dom-commands.ts`, 2 in `utility-commands.ts`, 1 each in `variable-commands.ts` and `control-flow-commands.ts`. Most failure paths silently return partial nodes. The Pratt parser fares better; most failures inside `parseExpressionPratt` produce diagnostics.

**Proposal:** systematic pass to add error reporting at command-parser failure paths. Out of scope here.

### D.3 Tokenizer single-pass (P2)

`tokenizer.ts` (1,141 LOC) is a single-pass lexer. The keyword tables it consumes live in `parser-constants.ts` (good — no duplication). The file is long but well-organized by scan-state. Not flagged for refactor; sized appropriately for its job.

---

## Quick wins applied

```diff
--- a/packages/core/src/parser/command-parsers/dom-commands.ts
+++ b/packages/core/src/parser/command-parsers/dom-commands.ts
@@
 export function parseSwapCommand(ctx: ParserContext, identifierNode: IdentifierNode) {
-  console.log('[PARSER DEBUG] parseSwapCommand called');
   const args: ASTNode[] = [];
```

```diff
--- a/packages/core/src/parser/command-parsers/utility-commands.ts
+++ b/packages/core/src/parser/command-parsers/utility-commands.ts
@@
   const rawSlice = ctx.getInputSlice(jsCodeStart, jsCodeEnd);
   const code = rawSlice.trim();
-
-  // Debug logging for development
-  // console.log('[parseJsCommand] jsCodeStart:', ...);
```

Verification: `npm run test:check --prefix packages/core` → `Core: PASS (6200+ tests)`.

Net inline reduction: **3 LOC removed across 2 files.**

---

## Proposed follow-ups (ordered by ROI)

### F1. Delete 7 unused precedence-chain methods + slim ParserContext (P1, ~140 LOC, ~30 LOC interface)

Touches: `parser.ts` (700–875, 4286–…), `parser-types.ts` (305–371, 264–297), `__test-utils__/parser-context-mock.ts` (275–323), `parser-context.test.ts` (66–72). Risk: low; one-file-at-a-time, `typecheck` will catch external consumers. Estimated effort: 1–2 hr. Best PR boundary: standalone.

### F2. Extract `parseMaybeNamedArgument` helper (P1, ~25 LOC)

Touches: `helpers/parsing-helpers.ts` (new export), `event-commands.ts`, `async-commands.ts`. Tests already exist for both commands. Risk: low. Estimated effort: 30 min. Best PR boundary: standalone, or bundle with F1 as a "parser slim" PR.

### F3. Resolve semantic-skip TODO state (P2)

Convert `parser.ts:3225` TODO into either a tracking issue or a stable design note. Decide whether to migrate `call`/`get`-style commands further. Risk: scope decision, not code. Estimated effort: 30 min discussion + write-up.

### F4. Fix `parseNavigationFunction` interface signature (P1, 1 LOC)

If F1 is acted on, this disappears (the method gets removed from `ParserContext` entirely). Otherwise, fix `parser-types.ts:351` to match the impl: `parseNavigationFunction(funcName: string): ASTNode`.

### F5. Add `debug.parse(...)` to silent catches at `parser.ts:624, 716` (P2, 2 LOC)

Bundle with F1 (the second one disappears with the legacy block).

### F6. Long-function extraction across control-flow/variable/event command parsers (P2)

Pick one parser at a time; each ~30–60 min of careful extraction with tests. Reduces cognitive load on the largest parsers but no net LOC change.

### F7. Reconcile `HYPERSCRIPT_KEYWORDS` vs `TOKENIZER_KEYWORDS` (P2, ~10 LOC)

Either update the misleading comment or derive `TOKENIZER_KEYWORDS = new Set([...HYPERSCRIPT_KEYWORDS, ...TOKENIZER_ONLY])` so the relationship is enforced. Low impact.

### F8. Runtime `any` cleanup (P2)

Out of scope for the parser audit — belongs with the broader evaluator-consolidation work tracked in memory.

---

## What was checked but not flagged

- **Circular imports**: none found.
- **Barrel re-exports**: minimal; `helpers/`, `command-parsers/` have none.
- **Deep relative paths** (`../../../`): none in parser/.
- **`hybrid/` duplication**: intentional for tree-shaking.
- **Test coverage**: command-parsers/**tests** ratio is healthy (~1:0.5–1:1 LOC).
- **Token state management**: three patterns (check+advance, save/restore, peek-only) used consistently per case. No churn.
- **Sole Pratt expression parser**: clean design, no recursive-descent shadow.
