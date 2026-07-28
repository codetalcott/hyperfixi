# HANDOFF — command-arch Arc D: target-resolution consolidation

> **Arc brief, written 2026-07-28.** Detail for Arc D of
> [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md)
> (the queue holds one paragraph; this file is authoritative for the arc). Pure
> refactor, no intended behavior change. Model already proven: #792 extracted
> `commands/helpers/attribute-target.ts` and reused `property-target.ts`; both
> are now shared by set/append/prepend.
>
> **Status: not started.** Update the per-step status lines below as PRs land;
> when the arc completes, add one History line to the queue doc and stop
> updating this file.

## Objective

Three consolidations, one PR each, merged sequentially:

1. Delete `put.ts`'s private DOM-insertion copy in favor of
   `helpers/dom-mutation.ts`.
2. Extract the writable-target dispatch ladder (today duplicated between
   `set.ts` and `content/insertion-base.ts`) into
   `commands/helpers/write-target.ts`.
3. Put the selector-shape asymmetry (`#id` → element, `.cls` → array) behind
   one documented `resolveTargetElements()` API with shape-pinning tests.

## Current verified state (2026-07-28, working tree at `7cb80479`)

All line refs re-checked while writing this brief. They will drift — re-verify
anchors at the start of each implementation session (`grep -n` the symbol, don't
trust the number).

### Step 1 anchors — put's insertion copy

- `commands/dom/put.ts:275-312` — `private insertContent(...)`. Compared
  branch-by-branch against `helpers/dom-mutation.ts` (`insertContent` :103 →
  `insertReplace` :141 / `insertElement` :161 / `insertText` :189): **logic is
  identical** (replace: element → clear+append, string → `looksLikeHTML` →
  innerHTML/textContent; non-replace: same four element branches, same
  `insertAdjacentHTML`/`insertAdjacentText` split). The **only** divergence:
  the helper's `insertText` carries the happy-dom hang guard (invalid position
  → throw instead of hang, dom-mutation.ts:192-205); put's copy does not.
  Collapsing therefore *adds* defense-in-depth, changes nothing else. (Put is
  guarded upstream anyway — `mapPosition` :240 throws on unknown prepositions —
  so this is belt-and-braces, not a live-bug fix.)
- Position vocabulary: put's exported `InsertPosition` (:32) is value-identical
  to the helper's `ContentInsertPosition`. **No external importers** — grep for
  `InsertPosition` hits only put.ts and the helpers' own type. `parseInput` is
  the sole producer of `PutCommandInput` and `execute` the sole consumer, so
  changing the internal position representation is contained to put.ts.
- Recommended shape (what the queue doc intends): re-point `mapPosition` at
  `SemanticPosition` names (`into`→`into`, `before`→`before`, `after`→`after`,
  `at start of`→`prepend`, `at end of`→`append`) and call
  `insertContentSemantic` — the exact path append/prepend already use
  (`insertion-base.ts:229`). Keep `mapPosition`'s throw-on-unknown. Keep the
  `InsertPosition` type export as a deprecated alias of
  `ContentInsertPosition` rather than deleting a public type.

### Step 2 anchors — the duplicated writable-target ladder

- `commands/data/set.ts` — `parseInput` :76-229 plus
  `tryParseMemberExpression` :308. Rung order (order is load-bearing, comments
  in-file say why): **plugin node-writers** (`getRegisteredNodeWriter`, e.g.
  reactivity's `^count`) → **attribute** (`resolveAttributeWriteTarget`; must
  precede property/member or the computed-member path keys the write on the
  attribute's *current value*) → **property** (`resolveAnyPropertyTarget`,
  with the `*style` split) → **memberExpression/propertyAccess** → variable
  tail (scope tags `:name`/`global`).
- `commands/content/insertion-base.ts` — `parseInput` :100-159, a second copy
  of the same ladder minus plugin writers, plus two rungs set lacks:
  **selector-source** (keeps the selector *string* so a multi-match resolves at
  execute time, :119) and **bare-reference-name** (keeps the *name* so execute
  can read-modify-write the binding, :145).
- Extraction target: `commands/helpers/write-target.ts` returning a
  discriminated union that covers the superset of rungs. Both existing input
  types are already discriminated unions (`SetCommandInput`,
  `InsertionCommandInput` :56-63) — the helper's union should subsume them, and
  each command keeps its own execute-side switch. Preserve rung ORDER exactly;
  set keeps its plugin-writer rung first, insertion-base simply doesn't request
  it.

### Step 3 anchors — the selector-shape asymmetry

- `parser/runtime.ts:441` `evaluateSelectorSync` — unexported, **exactly one
  caller** (:337, inside `evaluateExpressionSync`). Async mirror
  `evaluateSelector` at :1634. Both implement the same deliberate rule: bare
  `#id` unwraps to `elements[0] ?? null`; query-form (`<#id/>`,
  `fromQuery: true`) and class/other selectors return the collection.
- **The asymmetry is upstream parity (IdRef → element vs QueryRef →
  ElementCollection), not a defect. Do not "fix" it.** The defect class is
  command-side code mishandling one of the two shapes — append's pre-#792
  `.cls` silent no-op, and the `unwrapCommandResult` `val[0]` collapse
  (`runtime-base.ts:121`) are the same bug from opposite ends. Step 3 =
  centralize the rule behind one documented API, pin BOTH shapes with unit
  tests, and migrate the sync/async pair together.
- Also in scope here: put's private `resolveTargets` :257 / `looksLikeCss` :331
  / `resolveEvaluatedAsElements` :318 vs insertion-base's `insertIntoSelector`
  :213 / `asElementList` :265 — a third duplication of "value → element list",
  including the shared "unmatched selector throws" contract
  (insertion-base :218 comments "Same contract as `put`"). Fold these into the
  same helper.
- **Arc C pairing (recorded decision needed).** The queue doc pairs this step
  with Arc C step 3 (the `:121` collapse is this asymmetry seen from the
  propagation end). If Arc C hasn't started when this step is reached: land
  step 3 with the shape-pinning tests and leave `:121` untouched, noting in the
  PR that the tests are the ratchet Arc C will build on — or hold step 3 until
  C step 3 is ready and land them together. Either is fine; record which in
  this file.

## Gates, per step

| Step | Suites | Command |
| ---- | ------ | ------- |
| all | quick validation | `npm run test:quick --prefix packages/core` |
| 1 | put suite | `npm test --prefix packages/core -- --run src/commands/dom/put.test.ts` (note: NOT under `__tests__/`) |
| 2 | set suites (4 files) + append/prepend | `npm test --prefix packages/core -- --run src/commands/data/__tests__/ src/commands/content/__tests__/` |
| 2 | element-scoped `:greeting` multiword case | `cd packages/core && npx playwright test src/compatibility/browser-tests/test-multiword-commands.spec.ts` (Playwright MUST run from packages/core) |
| 3 | new shape-pinning unit tests | added in the step-3 PR; both `#id` and `.cls`/`<#id/>` shapes, sync and async |
| all | R2 execution subset (+ the other 9 ratchet signals) | runs automatically in the PR's `multilingual-validation` CI job; local repro is in root CLAUDE.md § "Running the multilingual --regression gate locally" |

`npm run verify:reference` is NOT expected to fire — this arc adds no commands
and changes no command lists. If it fails, something out of scope was touched.

## Non-goals (Arc D specifically)

- **No behavior changes.** Any test that changes expectation is a stop-and-ask,
  not an update. (Exception: a test that asserts the happy-dom hang-guard's
  *absence* — none known — would flip from silent to throw; that's the helper's
  documented contract winning.)
- The `#id`/`.cls` shape rule itself — upstream parity, stays.
- `unwrapCommandResult` and the `:121` collapse — Arc C's, except via the
  recorded pairing decision above.
- The bundle-generator template copies of put/append logic — Arc E's.
- The four-executor duplication generally — Arc E's.
- Anything in `packages/semantic` mappers — Arc F's.

## Session handling

- **One PR per step, merged into main before the next starts.** Stacked PRs get
  zero CI and still report clean (`ci.yml` fires only on PRs into
  main/develop). These are core-code PRs, so the full CI matrix runs — that's
  the point, don't try to shortcut it.
- **Prefer a fresh session per step.** Each step is independently landable and
  this file is the continuity mechanism — a new session re-reads the queue doc
  + this brief and starts clean rather than dragging two PRs of context.
- **Start-of-session protocol:** (1) read the queue doc's Arc D paragraph +
  this file; (2) `git log --oneline -5` to see what's landed since; (3)
  re-verify this brief's line anchors by symbol, not number; (4) on a cold
  tree, `npm install` first, and remember `npm run build` is NOT
  dependency-ordered (root CLAUDE.md § Cold start); (5) baseline
  `npm run test:quick --prefix packages/core` BEFORE editing so a pre-existing
  red isn't attributed to the refactor.
- **End-of-session protocol:** update the Status line below (step, PR number,
  merged/open, surprises worth the next session's attention). If a step
  revealed something that changes a later step's plan, edit that step's section
  here — this file is authoritative for the arc, per the queue's pointer-only
  rule.
- Core vitest wraps in `timeout 120`; **exit code 124 = success** (esbuild
  daemon hang, known issue).
- If using lokascript MCP tools after rebuilding core: a tool refusing with
  "serving STALE code" is the freshness guard working — restart the server,
  don't debug the tool.

## Risk register (arc-specific; general one is in the queue doc)

- `export { X } from './f'` creates **no local binding** — relevant when moving
  `resolveTargets`-family helpers out of put.ts.
- Rung order in the write-target ladder is semantics, not style: attribute
  before property/member (set.ts:105-109's comment), plugin writers first,
  raw-AST resolution before evaluation (insertion-base's divergence-fix #792
  depends on it).
- Element content **moves** rather than copies across multi-element targets
  (insertion-base :227-228) — keep that comment with the code wherever
  insertion loops end up.
- put's `execute` returns `HTMLElement[]` (or `undefined` on the variable
  path) — one of Arc C's fall-throughs. Do not "improve" it here; Arc C owns
  the output contract, and changing it in a pure-refactor PR muddies both arcs.

## Status log

- 2026-07-28 — brief written; arc not started. Next action: step 1 PR
  (put `insertContent` collapse).
