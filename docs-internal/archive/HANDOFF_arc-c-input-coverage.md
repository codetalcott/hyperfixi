# Handoff: Arc C — extend `unconsumed-input` to the remaining parse stages (release bar item 2)

## Context

Release bar item 1 closed with vocab Batches 3+4 (#645): ledger 0 unwaived, CI
vocab step gating. **This arc is item 2**: "Input coverage is total — every
`parseInternal` stage instrumented; `--diagnose-coverage` reports 0 firings
corpus-wide or each residual is named." Source material: NEXT_STEPS § "Input
coverage — the confidence model's blind spot".

Current state: the `unconsumed-input` diagnostic fires **only on the Stage-2
plain-command path** (`semantic-parser.ts:1135`). The event-handler, compound,
and SOV/VSO stages re-tokenize sub-segments and expose no single consumed
count, so the sweep's current **0 / 3696 is a visible floor, not a total**.
The prior Stage-2 burn-down (158 → 0, #628–#632) proved every firing was a
real silent drop at confidence 1.0 — expect the same class here.

**Fresh evidence the uninstrumented stages hide real drops (Batch 3 probes,
2026-07-12):** `repeat 3 times break end` parses break-less **in en and every
language** with zero warnings; `if #a and #b log "ok"` drops the second
conjunct in en; qu bare `continue` parses null-then-silent in loop context.
All three route through body/compound paths the diagnostic cannot see. These
are your red-side probes — they exist today, cost nothing to reproduce, and
MUST fire once the instrumentation lands.

**Scope guard — the scoring PENALTY is Arc D, not this arc.** NEXT_STEPS'
five-step plan (thread consumed/total into `ConfidenceContext`, penalty,
baseline regen) explicitly requires all stages measured FIRST — that
measurement is this arc, diagnostic-only. Do not touch confidence scores,
parse outcomes, or the `ConfidenceModel` contract. The eight-signal ratchet
must stay bit-stable (`--regression` exit 0, committed baseline untouched).

## The shape of the work

All four stages funnel through `parseBodyWithClauses` / `buildEventHandler`
(`packages/semantic/src/parser/semantic-parser.ts` — body fold at :1230/:1374,
existing Stage-2 emission at :1135), so a **per-segment coverage check there
may cover them at once** (NEXT_STEPS' stated hypothesis — verify, don't
assume). Constraints:

- **No double-counting.** Stage 2 already fires for top-level tails; a
  per-segment check must not re-report the same tokens (one diagnostic per
  dropped span, deduped across stages).
- **SOV/VSO sub-segment re-tokenization** means consumed counts are per
  sub-stream — account per segment, not per outer stream.
- **Optional-token residue ≠ genuine drop** (NEXT_STEPS step 3): connectives,
  boundary markers (`end`/`fin`/`tukuy`), and role-marker particles the
  matcher legitimately skips must not fire. Classify per language before
  burning down; a residue class that can't be silenced cleanly gets NAMED,
  not suppressed silently.

## Measure

```bash
npm install                                   # cold tree only
npm run test:multilingual:build-deps          # ordered build (CLI refuses stale dist)
npm run populate --prefix packages/patterns-reference
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --diagnose-coverage; echo "exit=$?"
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression; echo "exit=$?"
```

Capture real exit codes — never `| tail` the command that carries the verdict.

## The probe (do FIRST)

1. Reproduce the three known-dropped constructs above via `parseSemantic` +
   `compile(...).meta.warnings` and confirm **zero** `unconsumed-input`
   diagnostics today (the red side — archive the log).
2. Land the instrumentation; the same probes must fire with the dropped span
   in the message (green side; add as tests — the Stage-2 arc's test
   conventions live near `semantic-parser`'s existing diagnostic tests).
3. Full sweep. Expect a NEW non-zero firing count (the floor rising is the
   point). Attribute every firing to a construct family per language before
   fixing anything — the 158→0 arc's discipline (attribution first, then
   batch burn-down, one resweep per batch, not per finding).

## Traps (standing + fresh)

- The vocab CI step is now a **GATE** — if you touch profiles/dicts (unlikely
  in this arc), `npx tsx src/vocab/cli.ts validate` must stay exit 0;
  waivers in `packages/testing-framework/vocab-waivers.json`.
- Batch 3 lesson (memory: profile-keyword-additions-phantom-risk): any profile
  keyword addition must be after-probed against ALL corpus-hot rows containing
  the word, not just the target slot — ja `空` injected a phantom `empty`
  action into hot `is empty` rows and had to be reverted.
- Diagnostic-only means the sweep metrics must not move: `--regression` exit 0
  AND a `--save-baseline` attribution check coming back byte-identical is the
  clean proof (then restore the committed baseline — Batch 3 did exactly this;
  don't commit a regen whose only delta is timestamp/commit).
- `npx tsx` probes read src; the CLI + sweep read dist — rebuild between edit
  and measure (`npm run build --prefix packages/semantic`); the stale-dist
  guard refuses, but only for the guarded packages.
- Never commit `patterns.db`. lint-staged reflows on commit.
- If new firings exceed the window, **naming them all still clears the bar**
  (launch-bar precedent: honesty over totality) — a named-residuals table in
  NEXT_STEPS § "Input coverage" is an acceptable end-state.

## Definition of done

- Every `parseInternal` stage measured by `--diagnose-coverage` (per-segment
  instrumentation in `parseBodyWithClauses`/`buildEventHandler` or equivalent,
  with no double-count on the Stage-2 path).
- Red→green: the break-in-loop / and-conjunct / in-handler-tail probes fire
  the diagnostic, locked as tests.
- Sweep verdict appended to NEXT_STEPS § "Input coverage" ("floor → total"):
  firing count, per-family attribution table, burn-down or named residuals.
- `--regression` exit 0, committed baseline untouched (byte-identical
  save-baseline check); semantic + testing-framework suites and typecheck
  green; CI green (vocab gate included).
- Arc D's precondition ("all stages measured") explicitly marked met in
  NEXT_STEPS § Arc C/Arc D.

## Adjacent queue (NOT this arc — don't drift)

Arc D (coverage → confidence penalty; own PR, baseline moves ×24); Arc E
(`fetch … with { }` ×24, release-bar stretch item 5); release-bar item 4
(dependency hygiene — parallelizable, independent of this arc); Batch 3
leftovers logged in NEXT_STEPS: R2 curated-subset admission of one bare
non-click event pattern, the V3c S5b-coverage check (fr `sourisappuyée`
mousedown evidence added in Batch 3), zh mouseenter dead entry, go-url
destination drop, show/hide style-capture (unblocks the 6 style V2 waivers),
Arc B `derive.ts` flip (post-release).
