# Handoff — parse-path convergence, next session

> Rewritten 2026-09-01 EOD, after #1038–#1041 (the previous version of this
> file, written after #1034–#1036, is in git history; everything it recorded
> as open is now either done or restated below). Paste the block after the
> `---` into a fresh session. Everything above it is orientation.

## Where the arc stands

`docs-internal/HANDOFF-parse-path-convergence.md` is the original brief and
`ENGINE_MIGRATION_PLAN.md` the authority. **Thread A is closed. Thread B
item 5 is closed** (#1040 — the owner delegated the spelling decision; the
semantic emitters converged on the core vocabulary). The four decision-free
filings shipped (#1038), the 10 unchecked `node-type` rows were executed and
all measured benign (#1039, pinned by `node-type-alias-parity.test.ts`), and
the reserved-word audit that fell out of item 5 fixed three live defects —
bare `body`, `detail`, and `sender` all resolved to nothing on the identifier
path (#1040/#1041, pinned by `reserved-context-words.test.ts`).

Current triage (`cd packages/core && npx tsx tools/triage-parse-paths.ts`):
`same` 140 · `differ` 77 · trad-only 0 · sem-only 0 · both-fail 19 (all 19 =
the repo's own `metadata.examples`, gated — do not re-open). Families:
`semanticRoles-added` 77, `field-only-trad` 272/54, `field-only-sem` 78/49,
`marker-in-args` 13, `position` 44/10, `node-type` **2**, `value` 2.

**The structural work is done.** `node-type` 2 = the checked-benign real
disagreements (`open … as non-modal`, `transition opacity to 0.5`, both
dispositioned in #1036). `value` 2 = the inert `settle` rows. `arity` empty.
What remains is metadata-grade, plus one family waiting on Arc 2.

## What to do next, in order

1. **Semantic-path position spans — the one big remaining lever.** The
   `position` family (44/10) and `field-only-trad`'s
   start/end/line/column (54 sources) are the SAME defect: the semantic
   builder stamps `start 0, end 0, line 1` (`normalizeBuiltNode` defaults)
   instead of real spans. #1020 fixed the top-level command spans and filed
   the residual: NESTED arg positions need `packages/semantic` to track
   spans through the matcher/builder. The oracle is the traditional parse of
   the same source. Landing this closes most of `differ` 77 and improves
   error ranges/LSP for every language.

2. **Then put the "converged enough?" question to the owner.** The
   convergence detour was ordered 2026-08-30 to unblock Arc 1 steps 2/3/6.
   After positions, what remains is `semanticRoles-added` (deliberate
   enrichment, not a defect), `marker-in-args` 13 (scoped as NOT executable
   until Arc 2 — semantic is internally inconsistent about markers), and the
   4 benign/inert rows. That is a defensible endpoint. Resuming the main
   line means Arc 2 continuation first (it also unblocks marker-in-args).

3. **Delete the legacy arms on the next minor version bump.** Measured
   2026-09-01: ZERO in-repo non-test producers of `contextReference` or
   `propertyAccess` nodes remain (grep + kind classifier). Core's two
   dispatch arms in `parser/runtime.ts` and the two LEGACY types in
   semantic's expression-parser `types.ts` now serve only EXTERNAL
   hand-built ASTs (`buildAST` is public API) — the arm comments carry the
   measurement. Deleting them is a version-bump decision, not a code
   question.

4. **Thread B item 4 stays blocked** — its blocker has not moved; see the
   original brief.

## Findings worth carrying forward

- **Every convergence pass has found a live defect, including the
  convergence itself.** Item 5's rename exposed that bare `body` was
  resolved ONLY by the retired contextReference arm — the traditional path
  had classed the BUTTON on `add .x to body` all along. The **agent-bench
  phrasing ratchet** (`packages/testing-framework/src/agent-bench/`) is what
  caught it (`correct → warned-wrong`) after 8,100 core tests and eleven
  multilingual signals stayed green. Treat that ratchet as a first-class
  behavioral tripwire for parser work.
- **Audit the CLASS, not the instance.** `body`'s siblings on upstream's
  reserved-word list (`detail`, `sender`) had the identical gap; found by a
  one-hour probe. `meta`/`locals` were left unresolved deliberately
  (upstream-internal, no documented usage).
- **The "equal difference under a new name" trap is real.** The first cut of
  item 5 turned `copy my textContent` into a NEW transition
  (`memberExpression→possessiveExpression`); re-running the triage caught
  it, and the pronoun-base rule closed it (space-form `my`/`its`/`your`
  folds to memberExpression upstream and trad; `event's`/`bob's` stay
  possessive — all measured). Re-run the triage after every emitter change.
- **The AST-equivalence gate pins the TRADITIONAL parse only**
  (`parse(source, {})`), so semantic-emitter changes correctly do not move
  it. Its coverage for the semantic side is the semantic suite plus the
  triage and the two parity files.
- **`npm run <script> --prefix packages/X` resolves the prefix RELATIVE to
  the cwd.** Run from the repo root or use an absolute prefix — a wrong-cwd
  invocation fails with ENOENT and a pipeline that swallows it will happily
  measure a STALE dist (this bit once this session; the triage numbers were
  briefly from the pre-fix build).
- Everything in the previous handoff's traps section still applies: rebuild
  a sibling package's dist before probing through core; mutation-test every
  gate and read WHICH row reddens; never `git stash` in this tree; the
  lint-typecheck guard scripts and the multilingual gate are required
  locally for any parser or `packages/semantic` change; never commit the
  regenerated `patterns.db`.

---

MISSION: continue the parse-path convergence arc.
`docs-internal/HANDOFF-convergence-next.md` is the brief;
`docs-internal/HANDOFF-parse-path-convergence.md` and
`docs-internal/ENGINE_MIGRATION_PLAN.md` are the background and authority.
Read this file's body first and do not re-derive what it marks as settled.

**#1038–#1041 are landed.** Thread A and Thread B item 5 are closed. Do NOT
redo: the vocabulary convergence, the reserved-word fixes
(`body`/`detail`/`sender`), the four decision-free filings, or the
node-type row execution — all pinned and mutation-tested.

**Re-run the measurement before costing anything** — `cd packages/core &&
npx tsx tools/triage-parse-paths.ts`. Expect `same` 140 · `differ` 77 ·
`node-type` 2 · both-fail 19. The tool is the authority, not this paragraph.

**Start with semantic-path position spans** (item 1 in the body) — the last
big lever, already filed with an oracle. Then put the "converged enough?"
question to the owner (item 2) before touching Arc 1 steps 2/3/6 or
`marker-in-args`. The legacy-arm deletion (item 3) rides the next minor
version bump, not a convergence PR.

A parser or `packages/semantic` change needs the multilingual gate run
locally before pushing, and the `lint-typecheck` guard scripts too. Do not
commit the regenerated `patterns.db`. Never `git stash` in this tree.

Every step is a measurement first, and it is allowed to falsify the step.
On 2026-09-01 it falsified a filing's fix site, a triage family's name, my
own first possessive rule, and — via the agent-bench ratchet — the
assumption that 8,100 green tests meant the convergence was behaviorally
neutral. When it does, correct the doc in the SAME PR, struck through in
place.
