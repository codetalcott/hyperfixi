# Arc 2 brief — one typed AST

> Written 2026-09-01 on `10485310`, opening Arc 2 of
> [ENGINE_MIGRATION_PLAN.md](./ENGINE_MIGRATION_PLAN.md). The plan asks every
> arc to start with a brief that **re-measures the plan's own claims on the
> then-current tree**, because "three of the six command arcs found a plan
> claim false on measurement." This one found **four of seven**.
>
> Arc 1's convergence detour closed on 2026-09-01 (#1038–#1043), so steps 2, 3
> and 6 of Arc 1 are unblocked and Arc 2 step 1 is already done. Read the plan's
> Arc 2 section for intent; read this for the numbers.

## How to re-measure

```bash
cd packages/core && npx tsx tools/classify-ast-kinds.ts   # the kind universe
node scripts/check-type-escapes.cjs                       # from the repo root
cat packages/core/baselines/type-escapes.json             # per-directory counts
```

The tools are the authority. Every figure below is from them or from a `git
grep`, and each row says which.

## The plan's claims, scored

| # | Arc 2 claim | measured 2026-09-01 | verdict |
| - | ----------- | ------------------- | ------- |
| 1 | step 2: `parser-types.ts` has "per-kind interfaces for **20** kinds" | **15** kind interfaces (27 exported interfaces in the file) | ❌ **15, not 20** |
| 2 | step 2: it is "already camelCase, already matches the emitted names" | 13 of 15 are; `CommandSequence` and `Program` are **PascalCase** | ⚠️ **partly false** |
| 3 | step 2: "**61 files** import by them" | **119** files reference a distinctive kind name (48 non-test), 38 of those in `packages/core` | ⚠️ **higher — and it strengthens the conclusion** |
| 4 | step 2: "Positions are a **required** `{start,end,line,column}` (the parser always sets them)" | traditional leaves **24 of 857** incomplete; semantic-first **58 of 949** | ❌ **false — corrected in the plan by #1043** |
| 5 | step 3: "the local `type X = ASTNode & {…}` block (`runtime.ts:63-135`)" | **21** such types, lines **67–134** | ✅ **holds** |
| 6 | step 4: "the visitor/query/transformer modules are the **second-largest** `any` cluster" | `ast-utils` is **5th** at 157 — behind `features` 238, `commands` 235, `parser` 163, `compatibility` 161 | ❌ **5th, not 2nd** |
| 7 | step 5: commands are "where **most** of the 1,152 hatches live" | `commands` is **235 of 1,231** = **19%**; no directory holds a majority | ❌ **false, and the total moved** |

Claims 4, 6 and 7 all point the same way: **the plan's model of where the
difficulty lives is out of date.** It expected the work to concentrate in the
command layer; it is spread across `features` (238), `commands` (235),
`parser` (163) and `compatibility` (161), which together are 68%.

## The real shape of step 2

~~The union has to cover the **46 live kinds** the classifier reports (46 live ·
2 dead-but-annotated · 3 orphan-read · 3 phantom, over a 54-kind universe).
`parser-types.ts` defines **15** of them, so **31 kind interfaces do not exist
yet**. That is the actual size of step 2, and it is larger than "start from
`parser-types.ts`" implies.~~

**Corrected while building it.** Two errors in the paragraph above, both from
trusting the classifier's hand-maintained `KIND_UNIVERSE`:

- **The universe was missing five kinds.** `typeCheckExpression`,
  `collectionExpression`, `conditionalExpression`, `stringPostfix` and
  `blockLiteral` are each emitted by `pratt-parser.ts` or `parser.ts` and read
  by `evaluateAST`'s switch — live all along, and simply outside the scan. The
  set was seeded from `ast-vocabulary.test.ts` plus the plan's hypotheses and
  neither source listed them. Added; the tool now reports **51 live**, and it
  grew a `--live` flag because it could previously report everything except the
  positive list its readers actually needed.
- **46 (now 51) was never the union's size.** Sixteen of those kinds are the
  HYBRID parser's vocabulary, which has its own typing in
  `parser/hybrid/ast-types.ts` and whose fate is Arc 5's. The union covers the
  **full-parser vocabulary: 30 kinds**.

`parser-types.ts` defines 15 of the 30 — but one of the 15 was **wrong**, which
is the finding that justifies the whole step. It declared
`UnaryExpressionNode.argument` as the operand field. Every reachable emitter
writes `operand`; the shape it described (`argument`, no `operand`) is produced
only by `ast-helpers.createUnaryExpression`, whose sole caller
`Parser.createUnaryExpression` **is never called**. A type describing a shape
nothing reachable emits, sitting unchallenged in the file the plan names as the
starting point.

That is why `ast/nodes.ts` ships with `union-conformance.test.ts`: it parses the
whole corpus and asserts every emitted kind is a member and every emitted FIELD
is declared. A fourth prose description of the AST would rot exactly like the
three it replaces. Mutation-verified, including against the historical
`argument`-not-`operand` shape.

Two structural facts that shape it:

- **`evaluateAST`'s switch covers 24 cases**, and 19 of them are full-parser
  kinds. Making it exhaustive
  (step 3) therefore surfaces ~22 kinds that reach the evaluator by some other
  route or not at all. Expect that list to be the interesting output of step 3,
  not a formality.
- **All four `ASTNode` definitions carry `[key: string]: unknown`** —
  `types/base-types.ts`, `ast-utils/types.ts`, `types/unified-types.ts`, and
  `parser/hybrid/ast-types.ts`. Step 6 removes it "last"; note that removing it
  from any ONE of them does nothing while the others are still assignable.

## Recommended order, given the above

1. **Write the 46-member union first, positions OPTIONAL.** Claim 4 is settled:
   a materialized schema default has no source text to point at, so a required
   position would force a fabricated one. If a narrower "authored node" type
   with a required position is wanted, that is a separate decision — do not
   smuggle it in.
2. **Take `parser` (163) before `commands` (235).** It is smaller, it is where
   the union is produced, and claim 7 means the commands work is not the
   majority it was planned as. ~~`features` (238) is the largest single cluster
   and the plan does not mention it at all — scope it explicitly before
   committing to an arc size.~~ **Scoped, and it is not Arc 2's.** `features` is
   mostly declared-dead code: `init.ts` and `predefined-behaviors/` were
   unexported AND unimported and were deleted outright (Arc 6a class), taking
   the cluster 238 → 180 with no typing at all; the six remaining families are
   the deprecated exports waiting on 4.0 (Arc 6b). Typing them would have been
   work on code slated for deletion.
3. **Leave `compatibility` (161) alone until Arc 5 is decided.** It is the
   hybrid/bundle producer tree, which Arc 5 may retire outright; typing it now
   risks being work the plan has already flagged as conditional.

## Traps

- **The AST-equivalence corpus is the gate and it must NOT move.** Arc 2 is
  types-only. If it goes red, the change was not a refactor — do not regenerate
  the baseline to make it green. (#1042 regenerated it legitimately, because a
  span FIX is a behaviour change; that is the exception, and it proved the move
  was span-only against a `main` worktree first.)
- **The escape-hatch ratchet is monotone down and is the progress meter.** It
  caught a single `as Record<string, unknown>` in #1042. Type the value; reach
  for `check:type-escapes:update` only when the hatch is genuinely required,
  and say why in the PR.
- **The seven incomplete-position producers are NOT Arc 2's to fix.** Fixing
  them changes parser output, which a types-only arc cannot contain. They are
  filed in [PARSER_NEXT_STEPS.md](./PARSER_NEXT_STEPS.md).
- `npm run <script> --prefix packages/X` resolves the prefix relative to the
  cwd. Run from the repo root.
- The local gate set misses six CI gates; see `CLAUDE.md`'s "FOUR classes of
  gate `test:check` does NOT cover". A types arc still needs the whole
  `lint-typecheck` job, because three of its guards are baselined ratchets.
