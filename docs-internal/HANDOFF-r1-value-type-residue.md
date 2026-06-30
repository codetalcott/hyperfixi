# Handoff — HyperFixi multilingual R1 (repeat-cluster closed; SOV repeat-times / vi / for-each next)

You're continuing a long-running multilingual parse-fidelity effort in `~/projects/hyperfixi`
(branch `main`). The remaining headroom is **R1 role-fidelity** — per-command
`action.role:valueType` recall vs the English reference. Everything is gated; the bar is
**zero-regression** (no signal drop, not even within the ratchet's cross-machine tolerance).

> **Read first:** `docs-internal/MULTILINGUAL_NEXT_STEPS.md` — the dated entries at the TOP
> (2026-06-29n back through 2026-06-29f) are the current state and the full reasoning trail
> for the most recent campaign (PRs #532–#540). Then repo-root `CLAUDE.md` "Multilingual parse
> rate ≠ fidelity" and `packages/semantic/CLAUDE.md`.

## Our workflow (standing approval)

**With this note I approve PR merge on CI green, and to continue to the next plan task on merge.**
For each slice: one focused PR → wait for CI → **merge on green** (squash, `--delete-branch`) →
`git checkout main && git pull --ff-only` to **sync** → start the next slice from fresh main.
(GitHub occasionally throws a transient GraphQL error on `gh pr merge`; just retry — the CI
result is unaffected.) Keep the `MULTILINGUAL_NEXT_STEPS.md` dated trail current per PR.

## Current state

Authoritative source: `packages/testing-framework/baselines/multilingual-priority.json`
(its `timestamp`/`commit` fields stamp each regen). **Mean R1 ≈ 0.9460** (23 translation langs;
en reference excluded). R0-recall 1.000 · R0-precision ≈ 0.974 · R2 execution 1.000 ·
parse-rate 3696/3696. Laggards (all SOV): hi 0.9065 · qu 0.9108 · ko 0.9202 · bn 0.9217 · ja 0.9233.
Last shipped: **#540** — tr/hi/qu repeat-until-event (event fuse). The **repeat-cluster is
substantially burned down**: `repeat-times` (verb-first #536 + in-handler #537), `repeat-forever`
(#538), `repeat-until-event` (#539 + #540) are all faithful across parsing langs.

## Next targets (from the re-grounded leverage map; GROUND each before coding)

1. **SOV repeat-times — fronted-count HEAD.** #536 added `{verb} {quantity} times` HEAD patterns
   for verb-first langs; SOV (ja/ko/tr/hi/bn/qu) front the count ahead of a clause-final verb
   (`3 times を … 繰り返し`), a different HEAD structure that #536 didn't cover. The block-body
   HEAD-only exception (#537) + the SOV recovery shape (#538/#539) are the relevant precedents.
2. **vi two-word-verb repeat** (`lặp lại`): #536's verb-finder lands mid-verb, so the HEAD doesn't
   match in-handler. Small, contained.
3. **repeat for-each** (`repeat for X in Y`): the two-sided EN-phantom case (en itself mis-parses
   `event:literal="in"` + drops the collection) — re-ground; prior attempts were net-zero.
4. After repeat: re-run the leverage map (a raw-`parse()` map OVER-states schema-DEFAULTED roles —
   increment.quantity / wait.duration / repeat.quantity are measurement artifacts the gate's
   `fillSchemaDefaults` cancels). Real non-behavior residues left: `halt.patient` (the §7y-excluded
   `the`-leak — needs an UPSTREAM i18n transformer fix, not an R1 coercion), `set.destination`
   role-swap, `send.destination` call-split. **Behaviors (sortable/draggable/resizable) are
   OFF-LIMITS** (source-migration pending).

## Methodology (load-bearing — every win this campaign came from it)

1. **GROUND before coding.** Trace the EXACT parse with a throwaway probe (`tools/`), then delete
   it. Standalone `parse()` vs the in-event-handler parse is the key diagnostic. Every theorized
   cause has been wrong until grounded (e.g. #540: two problems were one root cause — the split
   event re-routed the handler off the recovery path).
2. **Aligning TRANSLATIONS toward the correct EN reference** is the clean direction. Moving the EN
   reference toward buggy translations (the abandoned `trigger.event`) drops R1.
3. **Zero-regression, gate-verified.** After a change: rebuild ordered → re-populate → run the
   `--regression` gate; it must say "✓ No regression" with NO within-tolerance warning. Then
   `--save-baseline`, and diff the new baseline vs `git show HEAD:…baseline` per-language — every
   lang flat-or-up, no drops, precision/bands flat. (A per-lang diff caught sub-tolerance issues
   the gate's tolerance would have passed.)
4. **One focused, contained slice per PR.** Prefer a targeted recovery over relaxing a load-bearing
   guard. If a slice doesn't converge cleanly, **revert and document** — do not ship a
   within-tolerance regression.
5. Add a guard to `packages/semantic/test/multilingual-roadmap-fixes.test.ts` (and
   `packages/i18n/src/grammar/grammar.test.ts` for dict changes) and VERIFY it fails without the
   fix (stash the src change → run → restore). Run the full semantic suite (`npx vitest run`).

## Cold-start commands (Node 24 required — better-sqlite3 ABI)

```bash
export NVM_DIR=~/.nvm; . $NVM_DIR/nvm.sh; nvm use 24.18.0   # prefix each shell; PATH doesn't persist
npm install         # if a cold checkout

# Ordered build of the multilingual stack (NOT `npm run build` — that's unordered):
npm run test:multilingual:build-deps
# After editing packages/semantic (and/or i18n dicts): rebuild the touched packages + core's
# bundled multilingual dist, THEN populate (so the patterns.db provenance stamp is newest):
npm run build --prefix packages/semantic
npm run build --prefix packages/i18n            # only if you edited i18n (dicts/grammar/tests)
npm run build:multilingual-dist --prefix packages/core
npm run populate --prefix packages/patterns-reference

# The gate (from packages/testing-framework):
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
# intentional fidelity change → regenerate the baseline (commit it; do NOT commit patterns.db):
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --save-baseline
```

**Gotchas:** the gate REFUSES on a stale `dist/` (src newer than dist — note editing a package's
`*.test.ts` also bumps its src mtime, so rebuild that package before gating) or a stale
`patterns.db` stamp. **Do NOT commit your locally re-populated `patterns.db`** (commit only
dicts/profiles/tokenizers + baseline + docs). End commit messages with the Co-Authored-By trailer;
squash-merge PRs.

## Session log (PRs this campaign, newest first)

Mean R1 walked 0.9422 → 0.9460 across these, every PR zero-regression:

- #540 — tr/hi/qu repeat-until-event via split-event fuse (hi/qu/tr +0.0019)
- #539 — repeat-until-event recovery (12 langs; targeted, not the #537 re-parse)
- #538 — SOV repeat-forever loop-keyword recovery (6 SOV langs +0.0011)
- #537 — block-body-guard HEAD-only exception → in-handler repeat-times (11 langs +0.0017)
- #536 — `{verb} {quantity} times` HEAD patterns, verb-first langs (ar/tl/he/zh)
- #535 — ru/uk fused underscore event keywords (mousedown/mouseup/resize)
- #534 — mousedown/mouseup event-keyword alignment (es/pt/ja/ko)
- #533 — `resize` event-keyword alignment (de/es/fr/it/pl/pt +0.0023)
- #532 — verb-first fused event-handler body excises the event head (ar/tl +0.0059)
