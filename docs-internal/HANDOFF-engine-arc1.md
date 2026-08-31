# Handoff — engine migration, Arc 1 (the engine / front-end boundary)

Paste the block below the `---` into a fresh session. Everything above it is
orientation for a human.

**Arc state:** steps 1, 4 and 5 DONE. Steps 2, 3 and 6 remain.
Step 5's measurement moved twice in one session, so it is quoted below with
both readings and a "re-measure first" instruction rather than a single number.

**One open decision is the owner's, not the next session's** — see
[The decision this arc now hangs on](#the-decision-this-arc-now-hangs-on).
A session that guesses it will do the wrong work competently.

**Provenance caveat.** Eight PRs (#1007–#1014) landed on `main` on 2026-08-30,
merged by the agent that wrote them, on the user's explicit instruction, with
no human review. The gates and a local multilingual run are the evidence.
**#1013 contains a one-word parser behaviour change** (`and` removed from
`skipToCommandBoundary`'s boundary list) that is worth a human read before it
is built on.

---

MISSION: continue `docs-internal/ENGINE_MIGRATION_PLAN.md` at Arc 1. Read that
plan first — it is the authority and this brief is its Arc 1 detail. Do not
re-derive anything in "What is already true" below.

## What is already true (measured 2026-08-30, do not re-derive)

**Arc 0 is complete** — five gates, all wired into CI's `lint-typecheck` and
the pre-commit hook, all shrink-only:

| Gate | Command | Baseline today |
| ---- | ------- | -------------- |
| type escapes | `npm run check:type-escapes` | 1,231 across 25 dirs |
| import direction | `npm run check:layering` | 14 upward edges, 874 conforming |
| front-end coupling | `npm run check:semantic-boundary` | 9 files, 7 static-value |
| node vocabularies | `vitest run src/parser/__tests__/ast-vocabulary.test.ts` | 25 full-parser kinds, 22 hybrid |
| parse fingerprints | `vitest run src/parser/__tests__/ast-equivalence.test.ts` | 233 sources, 218 unique |

Each has `:update` to regenerate and a `--test`/self-test. **Regenerate a
baseline only in the PR that earns the change** — a gate regenerated to go
green is a gate deleted with extra steps.

**Arc 6a is complete.** `src/context/`, `src/experimental/` and seven dead
interfaces are gone (5,801 lines). `registry/examples/` deliberately survives —
its only reference is inside a documentation template literal, and Arc 1 may
claim that tree.

**Arc 1 step 1 is complete.** The boundary is measured and gated. **7
static-value front-end imports across 9 files**, and four of those nine rows
are target-state and terminal (the three multilingual bundles and classic-i18n
import the front-end because that is what those bundles ARE). The real debt is
three files:

| File | Kind | Step |
| ---- | ---- | ---- |
| `api/hyperscript-api.ts` | 1 static-value + 2 dynamic | 2 |
| ~~`ast-utils/interchange/from-core.ts`~~ | ~~2 static-value~~ | **done — step 4** |
| `compatibility/eval-hyperscript.ts` | 1 static-value | falls out of 2 |

**Step 4 landed 2026-08-30 and corrected this table's arithmetic.** It did NOT
remove 2 of the 7 static-value imports — it MOVED them, to
`multilingual/schema-roles.ts`, which is on the target side of the ratchet. The
total is still **7**; two files remain on the wrong side, both step 2's.

**`parser/`, `runtime/`, `commands/`, `expressions/`, `types/` and `core/`
import the front-end NOWHERE**, and a test asserts it. Arc 1 is a handful of
files, not a sweep.

**Arc 1 step 5 is complete, and it is the reason this brief exists.** It
diffed semantic-first against traditional over the 233-source corpus. It moved
once already, when the `and` fix landed:

| | same | differ | trad-only | sem-only | both-fail |
| - | - | - | - | - | - |
| before the `and` fix | 107 | 105 | 2 | 2 | 17 |
| **current `main`** | 107 | **107** | **0** | **2** | 17 |

Read that carefully: **semantic-first is now a strict superset in
parseability** — everything traditional parses, plus the two
`render … with (…)` forms — while producing a *different AST* for 107 of the
216 sources both paths parse. The differences are structural, not cosmetic:
`contextReference` vs `identifier`, an added `semanticRoles` field, zeroed
positions, an injected implicit `me`, and prepositions kept out of `args`:

```
scroll to #top
  traditional: args [identifier "to", selector "#top"]
  semantic:    args [selector "#top"] + semanticRoles.destination
```

**Re-run this measurement before costing step 6.** The probe is ~50 lines
(parse each corpus source both ways, canonicalize, compare); it has already
moved once and will move again as the parser changes.

## The decision this arc now hangs on

The plan assumed removing semantic-first from English would be free or an
improvement. Step 5 measured that it is neither. So:

> **Which parse path should English use?**

Today `config.semantic` defaults `true`, so English goes through the front-end
first for the 32 commands not on `parseCommandCore`'s `skipSemanticParsing`
list. Step 2 (as written) removes the front-end from the library entry, which
would silently switch every Node consumer to the traditional AST — 107 shapes
changed and two sources that stop parsing.

Three coherent answers, and **this is the owner's call, not the session's**:

1. **Traditional is canonical for English.** Step 2 and step 6 proceed as
   written; the 107 diffs and the two lost `render` forms are accepted, and
   the `render … with (…)` gap moves to `PARSER_NEXT_STEPS.md` (where three of
   its four sibling rows already sit).
2. **Semantic-first is canonical for English.** Then Arc 1's goal is narrower
   than the plan says — the front-end stops being an *optional* dependency and
   the boundary work becomes about the module graph rather than the parse. Step
   6 is off the table.
3. **They must converge first.** The 107 diffs are triaged, the parser is
   taught the shapes worth keeping (prepositions out of `args` is plainly
   better), and step 6 becomes a real refactor. Most expensive, best endpoint.

Put this to the user before starting step 2 or 6. **Step 4 is unaffected by
the answer** and is the safe place to start.

## Recommended order

1. ~~**Step 4 first**~~ — **DONE 2026-08-30.** `fromCoreAST(node, { inferRoles })`;
   the schema-driven default is `schemaRoleInferrer` in
   `packages/core/src/multilingual/schema-roles.ts`, and the three consumers bind
   it at their module-load site so every downstream call stays one-argument.
   Two things it measured that the brief had wrong are recorded in the plan's
   step 4 and History; the one worth carrying forward is that the default
   supplies roles for **41 of the 43** role-bearing command names, so "the
   consumer can pass the default" is not optional politeness — omitting it is a
   cliff, and the AOT consumer now throws rather than degrade.

   It also found a **pre-existing** role-binding defect (traditional parse binds
   `destination` to the marker word `on` in `toggle .active on #panel`), filed in
   `PARSER_NEXT_STEPS.md`. **Do not fix it before the decision below** — it is an
   instance of the same `args`-shape gap, so option 3 would delete the fix.

2. **Then the decision**, then steps 2/3/6 accordingly. Nothing in this arc is
   unblocked by anything else now: **the decision is the gate.**

Arcs 2 and 3 are gated behind Arc 1 by the plan. Arc 7 was re-costed on
2026-08-30 and is now known to be **one file** (`expressions/logical/index.ts`)
rather than seven modules — re-read its step 1 before assuming it is worth
standing alone.

## Operational traps, all hit in one session

- **Every PR touches the plan's History section**, so sequential PRs conflict
  there. Resolve by keeping BOTH entries (drop the markers) — never pick a
  side. Expect to rebase each open branch after each merge.
- **`main` has `strict` branch protection**, so the second PR of a pair must
  rebase before merging. That is a feature: it forces the combination to be
  CI-tested. Do not fight it.
- **Merges are SQUASH merges**, so rebasing a branch stacked on a merged PR
  fails — git cannot see the squashed commits as applied. Extract the diff by
  commit range (`git diff <parent> <commit> -- <path>`) onto a fresh branch
  from `main` instead.
- **Stacked PRs get ZERO CI and still report clean** (`ci.yml` fires only on
  PRs into main/develop). Never open one.
- **Never `git stash` in this tree** — the user parks work there.
- **Do not commit a locally regenerated `packages/patterns-reference/data/patterns.db`.**
  `git checkout --` it before committing.
- A parser change needs the multilingual gate run LOCALLY before pushing:
  `npm run test:multilingual:build-deps` → `npm run populate --prefix
  packages/patterns-reference` → `cd packages/testing-framework && npx tsx
  src/multilingual/cli.ts --full --bundle browser-priority --regression`.
  It takes ~10 minutes and saves a CI round trip.

## The habit that produced everything of value here

Six of the plan's own claims were measured false in one session — the
benchmark premise for two arcs, the `parser/types.ts` deletion, the
static-import count, Arc 7's scope, and step 5's outcome twice. The plan is a
hypothesis, not a spec.

**Every arc's step 1 is a measurement, and it is allowed to falsify the arc.**
When it does, correct the plan in the same PR — struck through in place, never
silently — and say so in the commit message. Three separate filings in this
repo have already cost a session by being read as current.
