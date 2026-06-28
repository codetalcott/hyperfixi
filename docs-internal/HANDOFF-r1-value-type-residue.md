# Handoff — HyperFixi multilingual: R1 value-type residue (the last open dimension)

You're continuing a long-running multilingual parse/fidelity effort in the hyperfixi
monorepo (`~/projects/hyperfixi`, branch `main`). **The R2 execution-divergence worklist is
fully closed** (see "What just shipped"). The one remaining multilingual dimension with real
headroom is **R1 role-fidelity** — specifically per-command value-TYPE mismatches in the hard
SOV/reorder languages. This is **Arc B** from the previous handoff: harder/structural, lower
ROI than the R2 work that's now done, but it's the only open band.

> Read `docs-internal/MULTILINGUAL_NEXT_STEPS.md` first — the dated notes at the TOP
> (2026-06-28f back through 2026-06-28b) are the current state. Then `packages/semantic/CLAUDE.md`
> and the repo-root `CLAUDE.md` "Multilingual parse rate ≠ fidelity" section.

## Current authoritative state (`browser-priority` gate)

Source of truth: `packages/testing-framework/baselines/multilingual-priority.json`
(its `timestamp`/`commit` fields stamp each regen). 24 langs × 154 patterns = 3696.

| Signal                        | Value                  | Notes                                                        |
| ----------------------------- | ---------------------- | ------------------------------------------------------------ |
| parse rate                    | **3696 / 3696 (100%)** | zero hard fails                                              |
| degenerate (fid < 0.5)        | **0**                  | band empty                                                   |
| lossy (0.5 ≤ fid < 1.0)       | **0**                  | band empty                                                   |
| avgFidelity (R0-recall)       | **1.000**              |                                                              |
| avgPrecision (R0 trust floor) | **0.972**              | hi 0.921 is the outlier (next bn 0.928)                      |
| avgRoleFidelity (R1)          | **0.9142**             | **the laggard / the work** (was 0.9125 pre-`halt the event`) |
| avgExecutionFidelity (R2)     | **1.000**              | 42-pattern curated subset                                    |

**R1 laggards (lowest first, post-`halt the event`):** hi 0.865 · ja 0.892 · ko 0.898 ·
qu 0.899 · bn 0.900 · uk 0.901 · tr 0.902 · pl 0.907. All SOV/reorder-heavy. R1 measures
`action.role:valueType` recall vs the en reference — a parse that keeps the verb but
**drops or mistypes a role**.

> **Shipped this arc (2026-06-28g): `halt the event` article skip.** The most consistent
> R1 residue signature was `halt.patient: en=literal → SOV=reference`. Grounding showed the
> **en reference was itself wrong** — `halt the event` captured the article `the` and dropped
> the event (`patient:literal="the"`), so every faithful translation mismatched it. Fixed in
> `skipNoiseWords` (pattern-matcher.ts): en now skips `the` before a valid reference word, and
> the non-en skip was extended from "before a SOV particle" to "before a particle OR a clause
> boundary (then/end/EOF) — never before a command verb" (preserving the §7y guard). Result:
> en + all 23 langs agree on `halt.patient:reference`; **R1 0.9125 → 0.9142, all 23 langs +,
> R0/precision unchanged.** Guard in `multilingual-roadmap-fixes.test.ts`. **Next R1 targets
> (re-grounded below):** the `repeat` loop-role garbage and the VSO `halt the event`
> verb-after residue.

## What just shipped (the R2 worklist campaign — all merged to main)

The wave-5 R2 execution-divergence worklist (9 items) is **fully closed**; R2 curated subset
grew **33 → 42**, all at fidelity 1.000:

- **#514 (wave 6)** — 6 of the 9 worklist items were **stale committed-DB artifacts**, not real
  divergences: re-grounding against a freshly `populate`d DB showed they already matched en in
  all 23 langs (subset 33 → 39). **Lesson: the committed `patterns.db` lags the dicts; always
  `npm run populate` before grounding.**
- **#515 (wave 7)** — `multiple-events` (`on click or keypress[...] toggle .active`): the `or`
  multi-event separator wasn't recognized in 7 langs. Fixed via a scoped or-clause excision
  pre-pass + ja `または`→or tokenizer fix + hi/bn OR_KEYWORDS (subset 39 → 40).
- **#516** — positional put `before`/`after` for 11 SVO/SOV langs (the position word is now
  captured as the put `manner` role); **R1 +0.004–0.008 across 11 langs**. Also fixed a
  parser-vs-renderer priority conflict (renderer `-before`/`-after` penalty).
- **#517 (wave 8)** — VSO put `before`/`after` (ar/tl/uk) via handcrafted high-priority VSO
  put-event patterns; `put-before`/`put-after` joined R2 (subset 40 → 42). Worklist closed.

## Your task: Arc B — R1 value-type residue burn-down

**Why it's the work:** R1 (0.9125) is the only non-maxed signal. It drifted up incidentally
(0.75 → 0.91 over many arcs) but has **never had a dedicated, convergent campaign**. The prior
handoff characterized the residue (UNVERIFIED — re-ground it) as per-command value-TYPE
mismatches, e.g.:

- `set.destination:property-path` — `#x.prop` mistyped in SOV reorders.
- `repeat` loop roles — `loopType` / `event` / `quantity` mistyped or dropped.
- `halt.patient` — en "the event" parses as a `literal` vs SOV as a `reference`.
  And **hi precision (0.921)** is the lowest — phantom-command sources in the hi profile (R0
  precision, a different signal from R1; worth a parallel look since hi is the worst on both).

**Suggested approach:**

1. Triage hi / ja / ko first (the worst three). For each, dump the per-pattern
   `action.role:valueType` signature diff vs the en reference and find the **recurring**
   mistype/drop. The win is one or two systemic causes, not 50 one-offs.
2. Expect the cause to be a marker→role mapping or a value-type classification in the
   per-language profile/tokenizer — but **do not assume**: every theorized cause this project
   has had was wrong until reproduced.
3. This edits the hottest, most regression-sensitive SOV parser path. Guard R0/precision/
   parse-rate carefully; a role-type change can shift other patterns.

**Optional lower-priority follow-ups (not R1):**

- **Render quality of positional put before/after-nodes.** #516/#517 made the _into-form_ win
  RENDER selection (so the canonical round-trip is preserved), which means a before/after
  _node_ currently renders back as the into-form (position lost on render — same accepted
  tradeoff as `-at-end`). Parsing is 100% correct; only `semantic.render`/`translate` output of
  a before/after node is lossy. Fix would need the renderer to select positional patterns when
  the node carries `manner` (the role scoring in `explicit/renderer.ts` is priority + role
  match; manner isn't a role token). Gate doesn't measure this (it uses the i18n transformer).
- **hi avgPrecision 0.921** phantom-command sources (R0 precision).

## METHODOLOGY (non-negotiable — every theorized cause this project has had was wrong)

1. **GROUND before coding.** Reproduce via the gate path: `ml.parse(translation, lang)` over the
   `patterns.db` translations, diff the role/`valueType` signature vs the en reference. Do NOT
   theorize the root cause — reproduce it. The R1 metric is `collectRoleSignature` in
   `packages/testing-framework/src/multilingual/fidelity.ts` (`action.role:valueType`, only on
   non-structural-action nodes — the event-handler's own event role is NOT counted).
2. **Throwaway probe** under `packages/patterns-reference/scripts/` (jsdom globals +
   `import { MultilingualHyperscript } from '@hyperfixi/core/multilingual'`; inline
   `collectActions`/`collectRoleSignature` from `testing-framework/.../fidelity.ts`). **DELETE it
   after** (untracked probe files left in `src/` show up in the diff — keep the tree clean).
3. **Re-ground the worklist.** The R2 campaign proved the committed DB lags the dicts — if you
   inherit any "list of N divergent patterns," re-measure it against a fresh `populate` before
   trusting it.

## ENVIRONMENT + GATE WORKFLOW (gotchas that cost real time)

- **Node 24:** `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24`. `better-sqlite3`
  works under it. **The shell does NOT persist between Bash calls — re-source nvm each time.**
- **The gate REFUSES a stale dist or stale DB.** After editing a `src` package: rebuild it
  (`npm run build --prefix packages/<pkg>`) — or the whole multilingual stack
  (`npm run test:multilingual:build-deps`) — AND re-populate
  (`npm run populate --prefix packages/patterns-reference`) before running the gate. A rebuild
  bumps dist mtimes, which re-triggers the DB staleness check, so **rebuild THEN populate** (in
  that order) or the gate refuses.
- **Vitest semantic/i18n tests import from `../src`** (transpiled on the fly), so a guard can be
  verified failing-without-fix by `git stash`-ing only the `src` files and re-running — no
  rebuild needed. (The gate, by contrast, runs the built dist.)
- **Gate run** (from `packages/testing-framework`):
  `npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression`
  After an intentional fidelity change: replace `--regression` with `--save-baseline`, commit
  the new baseline. It refuses unless the stack is built + DB freshly populated.
- **`patterns.db` is NOT committed** (CI repopulates). It's modified by `populate`; restore it
  before committing: `git checkout -- packages/patterns-reference/data/patterns.db`. Commit
  only the dicts/profiles/patterns + the regenerated baseline.
- The R1 ratchet fires on a per-language **avgRoleFidelity drop > 0.02**; improvements are free.
  Re-baseline to lock gains.

## PR CONVENTIONS (also cost real time)

- One defect/arc per PR, branch off `main`. **Guards required + verified failing-without-fix**
  (semantic → `packages/semantic/test/multilingual-roadmap-fixes.test.ts`; i18n →
  `packages/i18n/src/grammar/grammar.test.ts` or the relevant test).
- **Run the FULL semantic suite before pushing** (`npm run test:check --prefix packages/semantic`)
  — a role/parse change can break render/round-trip tests. (That's how a renderer regression was
  caught in #516: a high-priority pattern shadowed the canonical render form.)
- A **prettier pre-commit hook reformats staged files** — expect it; the change stays intact.
- **Auto-merge is disabled; admin-merge denied.** Branch must be up-to-date with main:
  `gh pr update-branch <n>` if behind, wait for CI, then
  `gh pr merge <n> --squash --delete-branch`. CI ≈ 6 min build + ~3 min parallel jobs;
  poll `gh pr checks <n>` (the `Multilingual Validation` job is the real R2/fidelity gate).
- After merging, `git checkout main && git pull` before the next branch.

## Optional: multi-agent workflow

The R2 put arc used a `Workflow` (5 parallel per-family design agents) to produce per-language
pattern specs, then implemented centrally with tight build-verify loops. Worktree agents have
**no node_modules/dist** (can't build), so the pattern was: gather complete grounding data
centrally → fan out **pure-reasoning design agents** (read-only, given the data) → implement +
verify centrally. Useful for R1 if you triage many languages in parallel; the central
build-verify loop is where the real correctness work happens (agents can't run the gate).

Start by reading `MULTILINGUAL_NEXT_STEPS.md`, then ground hi's R1 residue end-to-end (dump the
per-pattern `action.role:valueType` diff vs en) before touching code.
