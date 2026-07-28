# HANDOFF — command-arch Arc D: target-resolution consolidation

> **Arc brief, written 2026-07-28.** Detail for Arc D of
> [COMMAND_ARCHITECTURE_NEXT_STEPS.md](./COMMAND_ARCHITECTURE_NEXT_STEPS.md)
> (the queue holds one paragraph; this file is authoritative for the arc). Pure
> refactor, no intended behavior change. Model already proven: #792 extracted
> `commands/helpers/attribute-target.ts` and reused `property-target.ts`; both
> are now shared by set/append/prepend.
>
> **Status: all three steps implemented (2026-07-28).** Step 1 merged (#796);
> steps 2 (#797) and 3 landed behind it. See the Status log at the bottom for
> per-step outcomes and the two decisions this arc had to record. When the arc
> completes, add one History line to the queue doc and stop updating this file.

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
- **CORRECTION (found while implementing, 2026-07-28).** The
  `resolveEvaluatedAsElements` / `asElementList` pair is **not** a duplication —
  the two differ in two observable ways:
  1. **Mixed array.** put FILTERS (`[el, 'junk']` → `[el]`, writes into `el`);
     append/prepend REJECT, so the value stays an Array target and the content
     is pushed into it (upstream's dispatch order).
  2. **Array-likes.** put gates on `instanceof NodeList`; insertion-base
     duck-types `length` + `item`, so it accepts an HTMLCollection and put does
     not.
  Unifying them is therefore a behavior change, not a refactor. They were moved
  into the shared module as `toElementListFiltered` / `toElementListStrict` —
  adjacent, documented, and both pinned by tests — with the divergence left
  intact. **Whether to reconcile them is an open decision, not an oversight**;
  it wants its own change with its own gate. `looksLikeCss` turned out to be
  put-only (nothing else in core defines an equivalent), so it stayed in put.
- **Arc C pairing — DECIDED 2026-07-28: landed step 3 alone.** Arc C had not
  started when step 3 was reached, so step 3 shipped with the shape-pinning
  tests and left `unwrapCommandResult`'s `:121` collapse untouched. Those tests
  (`commands/helpers/__tests__/target-elements.test.ts`) are the ratchet Arc C
  step 3 builds on — in particular the two cases a "simplifying" change breaks
  first: `#id` unmatched → `null` while `.cls` unmatched → `[]`, and a
  single-match `.cls` staying a one-element array rather than collapsing to the
  element. Arc C step 3 now has a pinned rule to decide the `:121` policy
  against instead of inheriting it.

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

## What the arc left behind

Three helper modules under `commands/helpers/`, each the single definition of a
rule that used to exist in two or three places:

| Module | Defines | Consumers |
| ------ | ------- | --------- |
| `dom-mutation.ts` (pre-existing) | content insertion at a position | put, append, prepend |
| `write-target.ts` (step 2) | the writable-target **rung order** | set, append, prepend |
| `target-elements.ts` (step 3) | the selector **shape rule**, the query contract, both list coercions | `parser/runtime.ts` (sync + async), put, append, prepend |

Two new test files are the gates: `write-target.test.ts` (11 cases, rung order
and rung opt-in) and `target-elements.test.ts` (20 cases, both selector shapes
and both coercions).

## Status log

- 2026-07-28 — brief written; arc not started. Next action: step 1 PR
  (put `insertContent` collapse).
- 2026-07-28 — **step 1 merged (#796)**, full CI green. Surprise worth carrying:
  the put suite asserts `input.position` ~42 times, so re-pointing `mapPosition`
  at `SemanticPosition` names (which the brief prescribes) churns the test file.
  Those are white-box assertions on the input's internal spelling — every
  DOM-outcome expectation was left untouched, so this is not the "test changes
  expectation → stop and ask" case the non-goals mean. `InsertPosition` was kept
  as a deprecated alias of `ContentInsertPosition` rather than deleted; it is
  publicly re-exported from `commands/index.ts`.
- 2026-07-28 — **step 2 opened (#797)**. The two ladders overlapped less than
  the brief's line-anchors suggest: #792 had already shared the attribute and
  property RUNGS, so what was actually duplicated was the **order** around them
  plus the rung-selection. `resolveWriteTarget` therefore takes opt-in flags
  (`nodeWriters`, `selectorSource`, `styleSplit`, `bareReference`) rather than
  merging the tails — set's evaluated-value tail (object literal, "the X of Y"
  string, CSS shorthand, possessive string, element, element array) has no
  counterpart in insertion-base and stayed in set.
- 2026-07-28 — **step 3 implemented** (branched on #797; rebase onto main once
  that merges). Two decisions recorded above: the Arc C pairing (landed alone,
  tests are C's ratchet) and the `toElementListFiltered`/`toElementListStrict`
  divergence (preserved and documented rather than unified — see the CORRECTION
  under step 3's anchors).
- **Open follow-up left by this arc:** decide whether put's and append/prepend's
  element-list coercions should agree. It is the only Arc D item deliberately
  not closed, it is a behavior decision rather than a refactor, and both
  behaviors are now pinned by tests so either direction is a visible change.
