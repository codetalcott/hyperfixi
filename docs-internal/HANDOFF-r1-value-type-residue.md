# Handoff — HyperFixi multilingual R1 (fused-body residue, verb-first/SOV next)

You're continuing a long-running multilingual parse-fidelity effort in `~/projects/hyperfixi`
(branch `main`). The remaining headroom is **R1 role-fidelity** — per-command
`action.role:valueType` recall vs the English reference. Everything is gated; the bar is
**zero-regression** (no signal drop, not even within the ratchet's cross-machine tolerance).

> **Read first:** `docs-internal/MULTILINGUAL_NEXT_STEPS.md` — the dated entries at the TOP
> (2026-06-29e back through the 06-29 cluster) are the current state and the full reasoning
> trail. Then repo-root `CLAUDE.md` "Multilingual parse rate ≠ fidelity" and
> `packages/semantic/CLAUDE.md`.

## Current state

Authoritative source: `packages/testing-framework/baselines/multilingual-priority.json`
(its `timestamp`/`commit` fields stamp each regen). **Mean R1 ≈ 0.9422** (24 langs × 154
patterns). R0-recall 1.000 · R0-precision ≈ 0.974 · R2 execution 1.000 · parse-rate 1.000.
Last shipped: **#530** — the fused event-handler-body fix (the big one; see below).

## The next target: extend #530 to verb-first / SOV langs (ar, ko, tr)

**Background — what #530 did.** A fused event-handler pattern (`<event> {verb} {source}`,
e.g. `fetch-event-es-vso`) captures only the wrapped command's verb + PRIMARY arg and drops
every SECONDARY role clause — so `on click fetch /api as json` keeps `source` but loses
`as {responseType}` _inside a handler_, even though a standalone parse of the same clause keeps
it (the `fetch.responseType` ×63 residue). The fix lives in `buildEventHandler`
(`packages/semantic/src/parser/semantic-parser.ts`, the `actionValue && actionValue.type ===
'literal'` block, ~line 960): find the body verb by **scanning back** for the captured action,
reconstruct `[verb..clause-boundary]`, re-parse it through the command patterns, and swap in the
richer node — under three guards: (1) **block-body actions** (`repeat`/`if`/`for`/`while`/
`unless`) skipped (inline body would be swallowed); (2) **verb-FIRST fused patterns**
(`…-vso-verb-first`) skipped; (3) **superset** check — swap only if every fused role reappears
with the same value-type (mapping the fused generic `patient`→primaryRole), the verb-final-SOV
default-patient rail. Result: 13 langs +0.0059, zero regressions, semantic 6327 green.

**The follow-up (guard #2 + the SOV gap).** Three langs still drop secondary clauses, and they
are HARDER than the event-first case #530 handled — they need per-word-order clause surgery:

- **ar** (`fetch-event-ar-vso-verb-first`): verb-first, event in the MIDDLE
  (`احضر /api/user عند نقر كـjson`). The `[verb..boundary]` clause re-includes the `عند نقر`
  event tokens — must be **excised** before re-parsing. (Fragile: multi-token events, marker
  detection.)
- **ko / tr** (`fetch-event-{ko,tr}-sov`): event-FIRST SOV, patient FRONTED before a late verb.
  The superset guard already keeps them regression-free, but capturing `responseType` needs the
  clause **re-assembled from non-contiguous parts** (fronted patient + verb + tail, minus the
  front event).

Approach: ground each word order with a trace probe BEFORE coding (every theorized cause this
campaign has been wrong until grounded). Likely a per-pattern-shape excision: identify the event
marker + event token(s) (the fused match captured `event` via `match.captured.get('event')`) and
rebuild the command clause without them. Verify on `fetch-json` first, then the whole fetch
family. **Gate after every step; if it doesn't converge cleanly, revert and document — do not
ship a within-tolerance regression.** Expected upside ≈ +0.0008 mean (3 langs × the fetch family).

## Other open residues (from the re-grounded leverage map, post-#530)

- `repeat.event:literal` (138×) and `repeat.source:expression` (69×) — mostly the **behaviors**
  (sortable/draggable/resizable), which are OFF-LIMITS (known-hard, source-migration pending),
  plus the for-each `repeat for X in Y` two-sided EN-phantom problem.
- `repeat.loopType:literal` remainder — SOV langs (ja/ko/tr/bn/hi) recognize `forever` (#527) but
  their fused/SOV repeat pattern drops it (same fused-body family as above); `repeat N times`
  needs a per-language HEAD `repeat {quantity} times` pattern for `quantity:literal`.
- `trigger.event:literal` (15×) — ABANDONED (#526): net-negative because it would move the EN
  reference AWAY from the (differently-buggy) translations. Do NOT re-attempt without fixing the
  upstream translation-side event parsing first.
- `set.destination:property-path` (48×), `send.destination:reference` (44×),
  `render.style:expression` (44×) — un-triaged; ground before assuming.

## Methodology (load-bearing — this campaign's wins all came from it)

1. **GROUND before coding.** Trace the EXACT parse with a throwaway probe in
   `packages/testing-framework/tools/` or `packages/semantic/tools/` (then delete it). Standalone
   `parse()` vs the in-event-handler parse is the key diagnostic.
2. **The clean R1 direction is aligning TRANSLATIONS toward the correct EN reference** (URL,
   event-keyword, forever, fused-body wins). Moving the EN reference instead (trigger.event)
   drops R1 wherever translations disagree. If EN is the outlier translations already agree
   against, great; otherwise stop.
3. **Zero-regression, gate-verified.** After a change: rebuild ordered, re-populate, run the
   `--regression` gate; it must say "✓ No regression" with NO within-tolerance warning. Then
   `--save-baseline`, and diff the new baseline vs `git show HEAD:…baseline` per-language —
   every lang flat-or-up, no drops. Isolate any drop to the exact pattern with a before/after
   per-pattern R1 diff (stash the fix, rebuild, dump, restore, diff).
4. **Guard, don't broaden.** Each #530 regression got a precise guard, not a revert.
5. Add a guard test to `packages/semantic/test/multilingual-roadmap-fixes.test.ts` and VERIFY it
   fails without the fix (stash → run → restore). Run the full semantic suite (`test:check`).

## Cold-start commands (Node 24 required — better-sqlite3 ABI)

```bash
# better-sqlite3 is built for Node 24; the gate/populate need it.
nvm use 24.18.0     # or: export NVM_DIR=~/.nvm; . $NVM_DIR/nvm.sh; nvm use 24.18.0
npm install         # if a cold checkout (links workspaces, installs bins)

# Ordered build of the multilingual stack (NOT `npm run build` — that's unordered):
npm run test:multilingual:build-deps
# After editing packages/semantic: rebuild it AND core's bundled multilingual dist, in order,
# THEN populate (so the patterns.db provenance stamp is newest and the gate won't refuse):
npm run build --prefix packages/semantic
npm run build:multilingual-dist --prefix packages/core
npm run populate --prefix packages/patterns-reference

# The gate (from packages/testing-framework):
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
# intentional fidelity change → regenerate the baseline (commit it; do NOT commit patterns.db):
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --save-baseline
```

Gotchas: the gate REFUSES on a stale `dist/` (src newer than dist) or a stale `patterns.db`
stamp — rebuild dists first, populate last. `parse()` via `@hyperfixi/core/multilingual` uses
core's bundled dist; `parse()` from `@lokascript/semantic` source (via tsx) uses live source —
they can disagree if you forget to rebuild core's multilingual dist. Do NOT commit your locally
re-populated `packages/patterns-reference/data/patterns.db` (commit only dicts/profiles +
baseline). End commit messages with the Co-Authored-By trailer; squash-merge PRs; the user's
standing instruction this campaign was "merge on green, then continue."

## Session log (PRs this campaign, newest first)

Mean R1 walked 0.9195 → 0.9422 across these, every PR zero-regression:

- PR #530 — fused-body secondary roles (+0.0032, 13 langs)
- PR #529 / #528 — fused-body characterization (docs)
- PR #527 — `repeat forever` keyword (+0.0008, 17 langs)
- PR #526 — trigger.event abandoned (docs)
- PR #525 — URL tokenization (+0.0122, the largest single win)
- PR #524 — event-keyword alignment
- PR #523 — en split-`'s` possessive
