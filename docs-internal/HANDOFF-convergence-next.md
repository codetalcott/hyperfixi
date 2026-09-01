# Handoff — parse-path convergence, next session

> Rewritten 2026-09-01 (second pass), after the semantic-span arc. The previous
> version — written after #1038–#1041 — is in git history; its item 1 is now
> done, and its stated ORACLE for that item was wrong. See "What the
> measurement falsified". Paste the block after the `---` into a fresh session.
> Everything above it is orientation.

## Where the arc stands

`docs-internal/HANDOFF-parse-path-convergence.md` is the original brief and
`ENGINE_MIGRATION_PLAN.md` the authority. **Thread A is closed. Thread B
item 5 is closed** (#1040). The four decision-free filings shipped (#1038), the
10 unchecked `node-type` rows were executed and all measured benign (#1039),
the reserved-word audit fixed three live defects (#1040/#1041), and **the
semantic-path position spans — the last big lever — are closed.**

Current triage (`cd packages/core && npx tsx tools/triage-parse-paths.ts`):
`same` 140 · `differ` 77 · trad-only 0 · sem-only 0 · both-fail 19 (all 19 =
the repo's own `metadata.examples`, gated — do not re-open). Families:
`semanticRoles-added` 77, `field-only-sem` 78/49, `field-only-trad` 68/18,
`marker-in-args` 13, `node-type` 2, `value` 2. **`position` is 0** (was 44
sites across 10 sources), and 16 sources are now fully explained by
`semanticRoles-added` alone (was 5).

**The structural work is done, and so is the metadata work that had a lever.**
What remains is listed under "The residual" below, and none of it is a defect
in the same sense.

## What the measurement falsified

The previous handoff said, of the position family: *"The oracle is the
traditional parse of the same source."* ~~It is not.~~ Once
`@lokascript/semantic` began reporting spans of its own, the two paths
disagreed — and on every disagreeing row it was the **traditional** side that
was wrong. Four defects, all live in the shipped parser, all read by LSP hover
and diagnostic ranges:

```text
get me.parentElement      memberExpression      [7, 20)  = "parentElement"
call myFunction()         callExpression        [16, 17) = ")"
log #target's innerHTML   possessiveExpression  [23, 32) = "innerHTML"
remove closest .item      callee identifier     [15, 20) = ".item"
copy my textContent       object identifier     [8, 19)  = "textContent"
clear :count              identifier            start 6, column 8
```

Root cause in all six: node builders take their span from `getPosition()`,
which reports the token consumed LAST. Correct for a leaf, wrong for anything
assembled out of other nodes — and wrong in mirror image for a synthesized
CHILD, which took a span belonging to its sibling. The sigil case is the same
error inside one node: `start` moved back over the `:` and `column` did not
follow, so the two fields indexed different characters.

The fix spans a composite from its leftmost component and re-derives
line/column from the corrected start (`Parser.spanFromLeftmost`, and
`lineColumnAt` now exported from the tokenizer so both readers of the
offset→position mapping share one definition). Pinned by
`composite-expression-spans.test.ts`, which asserts against the SOURCE TEXT
rather than against the other path — two parsers agreeing on a wrong offset is
a failure mode this arc has already hit.

The AST-equivalence gate did exactly its job here: it went red, the moved
fingerprints were the review artifact, and a main-vs-branch tree diff proved
all 41 moved leaf paths were `start`/`end`/`line`/`column` and nothing else
before the baseline was regenerated.

## The residual, precisely

`field-only-trad` 68 sites / 18 sources, in three groups. None is the same
class of defect as the spans, and none has an obvious lever:

1. **`raw` on literals** (14 sites / 13 sources). The traditional parser keeps
   the literal's source text (`"\"shift\""`, `"0.5"`); semantic drops it at
   `parseLiteralValue`. Carrying it means putting `raw` on `LiteralValue`,
   which the renderers and the fidelity scorers also read — a decision with a
   real blast radius, not a span fix. Not attempted.
2. **`object` / `property` children of member and possessive expressions**
   (4 sources). `me.parentElement` is ONE token, so the object `me` has no
   independent span to record; splitting it needs sub-token spans, which the
   tokenizer does not produce. Absent, not wrong.
3. **Mapper-built and materialized nodes** (`go back`'s `back`, `pick`'s
   `variant`/`count`/`rangeEnd`). `command-mappers.ts` hand-builds these from a
   role rather than through `convertValue`, so the chokepoint never sees them.
   Worth knowing: `pick first 3 of items` gives its `modifiers.variant` the
   span `[0, 4)` — that is `pick`, not `first` — so this group has a
   traditional-side defect of its own, of exactly the class fixed above. It is
   NOT a triage divergence (semantic emits nothing there), so no gate sees it.
   Filed in `PARSER_NEXT_STEPS.md`.

## What to do next, in order

1. **Put the "converged enough?" question to the owner.** The convergence
   detour was ordered 2026-08-30 to unblock Arc 1 steps 2/3/6. What remains is
   `semanticRoles-added` (deliberate enrichment, not a defect),
   `field-only-sem` (selector/dataType/modifiers enrichment, same),
   `marker-in-args` 13 (scoped as NOT executable until Arc 2 — semantic is
   internally inconsistent about markers), the residual above, and 4
   benign/inert rows. That is a defensible endpoint. Resuming the main line
   means Arc 2 continuation first (it also unblocks marker-in-args).
2. **Delete the legacy arms on the next minor version bump.** Measured
   2026-09-01: ZERO in-repo non-test producers of `contextReference` or
   `propertyAccess` nodes remain. Core's two dispatch arms in
   `parser/runtime.ts` and the two LEGACY types in semantic's expression-parser
   `types.ts` now serve only EXTERNAL hand-built ASTs (`buildAST` is public
   API) — the arm comments carry the measurement. A version-bump decision, not
   a code question.
3. **Thread B item 4 stays blocked** — its blocker has not moved; see the
   original brief.

## Findings worth carrying forward

- **Every convergence pass has found a live defect, including this one.** The
  span arc set out to fix the SEMANTIC path and ended up fixing the
  TRADITIONAL one in four places. The named oracle was the bug.
- **Drop each piece of the fix and re-measure.** The first cut stamped spans in
  BOTH `tokenToSemanticValue` methods (pattern-matcher and semantic-parser)
  *and* in `matchRoleToken`. Removing each stamp in turn changed nothing —
  identical triage, identical 9,806 semantic tests, and ja/ko/tr verb-final
  paths still correct — so both were deleted. One stamp, in
  `PatternMatcher.stampCaptureSpan`, carries the whole feature. A plausible
  second code path that measures dead is still dead.
- **A gate going red can be the gate working.** `ast-equivalence` is a
  refactor gate; a span fix is not a refactor. Prove the move is span-only
  (diff the parse trees against a `main` worktree, classify every differing
  leaf path) BEFORE regenerating, and put the classification in the PR.
- **An absent span beats a fabricated one.** A value materialized from a schema
  default gets none, because the word it stands for was never written;
  `@lokascript/semantic` emits no line/column at all, because it never sees the
  document those would index into. Both are asserted, not just documented.
- **`npm run <script> --prefix packages/X` resolves the prefix RELATIVE to the
  cwd.** Run from the repo root or use an absolute prefix.
- **Prettier on a glob will reformat files you did not touch.** `npx prettier
  --write packages/semantic/test/*.test.ts` reformatted 80 unrelated files.
  Name the files.
- Everything in the previous handoff's traps section still applies: rebuild a
  sibling package's dist before probing through core; mutation-test every gate
  and read WHICH row reddens; never `git stash` in this tree; the
  lint-typecheck guard scripts and the multilingual gate are required locally
  for any parser or `packages/semantic` change; never commit the regenerated
  `patterns.db` (and remember that `git checkout -- patterns.db` restores a
  possibly-stale committed copy — re-run `populate` before the next gate).

---

MISSION: continue the parse-path convergence arc.
`docs-internal/HANDOFF-convergence-next.md` is the brief;
`docs-internal/HANDOFF-parse-path-convergence.md` and
`docs-internal/ENGINE_MIGRATION_PLAN.md` are the background and authority.
Read this file's body first and do not re-derive what it marks as settled.

**#1038–#1041 and the semantic-span arc are landed.** Thread A, Thread B item 5,
and the position family are all closed. Do NOT redo: the vocabulary
convergence, the reserved-word fixes (`body`/`detail`/`sender`), the four
decision-free filings, the node-type row execution, or the span work — all
pinned and mutation-tested.

**Re-run the measurement before costing anything** — `cd packages/core &&
npx tsx tools/triage-parse-paths.ts`. Expect `same` 140 · `differ` 77 ·
`position` 0 · `node-type` 2 · both-fail 19. The tool is the authority, not
this paragraph.

**Start with the owner question** (item 1 in the body): the remaining `differ`
77 is enrichment plus a named residual, and that is a defensible endpoint for
the detour. Do not open `marker-in-args` or Arc 1 steps 2/3/6 before it is
answered. The legacy-arm deletion (item 2) rides the next minor version bump,
not a convergence PR.

A parser or `packages/semantic` change needs the multilingual gate run locally
before pushing, and the `lint-typecheck` guard scripts too. Do not commit the
regenerated `patterns.db`. Never `git stash` in this tree.

Every step is a measurement first, and it is allowed to falsify the step. On
2026-09-01 it falsified this file's own named ORACLE — the traditional parse
was wrong about spans in four places, not right — and it falsified two thirds
of the first fix as dead code. When it does, correct the doc in the SAME PR,
struck through in place.
