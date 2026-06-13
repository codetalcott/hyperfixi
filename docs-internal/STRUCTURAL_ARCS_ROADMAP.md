# Per-language structural arcs roadmap (R2 execution tail)

> **Scope:** the **32 remaining R2 execution-failing cells** after the cheap
> dict/profile-alignment wins were exhausted (waves 12–16 + the multi-word
> keyword generalization, #411–#416). These are deep, structural, often
> per-language bugs — each its own mini-arc. This doc enumerates them, maps every
> failing cell to an arc, and gives a **triage rubric** so they can be picked off
> by leverage rather than ad hoc.
>
> **Context for sequencing:** per CORRECTNESS_RELIABILITY_PLAN.md §9, the R2
> structural tail is **lower ROI** than Track 2 (behaviors — 49 of 63 degenerate
> passes). Recommended order overall: **Task #10** (multi-word markers + dict
> underscore audit — unblocked, high-leverage) → **behaviors** (biggest single
> mass) → these structural arcs **opportunistically**, best-leverage first.

## Triage rubric

Score each arc on five axes (H/M/L), then rank by leverage-adjusted value.
`PRIORITY ≈ Yield + Leverage + Confidence + Unblocks − Risk`.

| Axis           | Meaning                                                                                                                  | High =           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| **Yield**      | R2 cells the arc can clear                                                                                               | more cells       |
| **Leverage**   | one fix → many languages (shared mechanism) vs one-lang tail                                                             | shared mechanism |
| **Confidence** | mechanism probed & understood vs speculative                                                                             | probed           |
| **Risk**       | blast radius: localized parser tweak (low) vs core-parser / **en-reference** change with baseline churn/inversion (high) | localized        |
| **Unblocks**   | enables other arcs / removes a category                                                                                  | yes              |

**Heuristics that fall out of the rubric:**

1. Prefer **shared-mechanism** arcs (clear N languages at once) over per-language tails.
2. Prefer **probed** mechanisms over speculative — measure-first before committing an arc.
3. **Defer en-reference-changing arcs** (they invert the gate band and churn the
   baseline) unless you're ready for a full re-record.
4. A 1-cell single-language tail is almost never worth a dedicated arc — batch
   tails opportunistically when already in that language's files.
5. Re-measure the cluster each PR (it shifts); this map is a snapshot at #416.

## The arcs (ranked) — cell map at HEAD `7a0769df`

### S2 — fused-event body routing / compound collapse ★ best shared lever

- **Cells (~7):** make-toast-element (ms, zh, uk), make-element (ms), modal-close-backdrop (zh), if-condition/if-exists/if-matches (zh) — the zh share overlaps S5.
- **Languages:** ms, zh, bn (latent).
- **Mechanism:** (a) ms drops the trailing `then …` clause because the standalone
  command fails to parse — the §10 **ms put-with-`ia`** bug (`letak ia ke …`).
  (b) zh/bn collapse the **whole event body into a single `compound`** (a
  higher-level event path) that bypasses the fold / grammar / at-end paths (§7n).
- **Layer:** `semantic-parser.ts` body routing + the ms put pattern.
- **Yield H · Leverage H (ms+zh+bn) · Confidence M (probed §7n/§7o) · Risk M-H
  (parser body routing) · Unblocks: collapses most of zh too.**
- **Verdict:** the single biggest structural lever. Tackle first among S-arcs.

### S6 — hi worst-language SOV fronting + possessive-dot ★ highest single-lang count

- **Cells (hi is in 8 total):** set-inner-html-possessive-dot, set-text-possessive-dot,
  set-style, set-attribute, halt-propagation, make-element, make-toast, tabs-aria.
- **Mechanism:** hi `into`-pattern (`में …`) matches before fallbacks; **fronted
  possessive captured as the event** (`मेरा.textContent … सेट …` → possessive
  becomes the event, body collapses); possessive-dot head assembly (§10 hi set-trio).
- **Layer:** `semantic-parser.ts` (hi event-pattern ordering) + possessive matcher.
- **Yield H (8) · Leverage L (one language) · Confidence M (probed §10) · Risk M ·
  Unblocks: no.**
- **Verdict:** big count but a per-language grind; several of its cells also belong
  to S1/S3, so partial credit comes from those. Do after S2.

### S1 — en-reference-lossy patterns (`set @attr … on <scope>`) ⚠ high-risk

- **Cells (~5):** tabs-aria (bn, hi, ja, ko, tr). Also gates the excluded
  set-attribute@scope family.
- **Mechanism:** the **en reference itself is lossy** — `set @aria-selected to "x"
on .tab set … on me` drops the `on <scope>` modifier even in English (two sets,
  no scope). Translations diverge by capturing the 2nd set's roles differently.
- **Layer:** TWO layers — fix the **en parse** (`on <scope>` capture) first, which
  **inverts the gate band** (today's passers become failers), then per-language.
- **Yield M (5) · Leverage M · Confidence H (probed §7g/§10.5) · Risk **H** (en
  reference change → baseline re-record) · Unblocks: re-qualifies the @attr family.**
- **Verdict:** defer unless ready for a deliberate band-inversion + full re-baseline.

### S3 — SOV `@attr` / `set` role-scramble

- **Cells (~5):** set-attribute (hi, qu, tr), set-style (hi, id).
- **Mechanism:** SOV reorder fronts `@attr`/possessive; set's attr/value/scope
  roles scramble. id set-style is the two-word possessive PHRASE (`saya punya
*background`). hi/tr are SOV fronting.
- **Layer:** `semantic-parser.ts` SOV + possessive-phrase matcher.
- **Yield M (5) · Leverage M (hi/qu/tr/id) · Confidence M · Risk M · Unblocks: no.**
- **Verdict:** medium; overlaps S6 (hi) and the qu tokenizer arc.

### S5 — zh compound-collapse conditionals (overlaps S2 root)

- **Cells (~4):** if-condition (zh), if-exists (zh), if-matches (zh, tr).
- **Mechanism:** zh whole event body → single `compound`, bypassing the
  conditional fold (the same root as S2's zh share). tr if-matches is a separate
  then-branch issue.
- **Verdict:** **fold into S2** — fixing the zh compound-collapse clears these too.
  Not a separate arc; listed so the cells are accounted for.

### S4 — SOV verb-final put

- **Cells (2):** put-content-basic (ja, qu). `"Done!" を 私 に 置く クリック で` —
  SOV verb-final put with a trailing event phrase; no wrapper covers that order.
- **Yield L (2) · Leverage L · Confidence M · Risk M.**
- **Verdict:** small; do opportunistically when in the SOV event-wrapper code.

### qu particle-tokenizer (overlaps Task #10)

- **Cells (qu is in 6):** modal-close-backdrop, modal-close-button, modal-open,
  put-content-basic, set-attribute, make-toast.
- **Mechanism:** qu accusative-particle over-stripping — `punta` (target) →
  `pun`+`ta` (the `ta` particle); plus the body-word/`_` issues.
- **Layer:** qu tokenizer (particle logic). **Best folded into Task #10's
  tokenizer work** (same layer, same language).
- **Yield M (some of qu's 6) · Leverage L (qu) · Confidence M · Risk M (qu finicky).**
- **Verdict:** address inside Task #10.

### Per-language tails (batch opportunistically)

- it modal-close-button (body captured as DESTINATION not source — role-mislabel),
  th accordion-exclusive, qu modal-close-button. ~3 cells, 1 each.
- **Verdict:** not worth a dedicated arc; fix when already in that language's files.

## Ranked sequence (leverage-first)

1. **(Task #10)** multi-word markers + dict underscore audit — also clears qu
   tokenizer cells. _Unblocked now; see TASK10_MULTIWORD_MARKER_HANDOFF.md._
2. **S2** fused-event body routing / compound collapse — biggest shared lever
   (ms + zh + bn; subsumes S5).
3. **S6** hi SOV fronting + possessive-dot — highest single-language count.
4. **S3** SOV `@attr`/`set` role-scramble.
5. **S4** SOV verb-final put + per-language tails — opportunistic.
6. **S1** en-reference-lossy tabs-aria — last; high-risk band-inversion, do only
   with a deliberate re-baseline.

## Stopping rule (carried from §9)

The R2 tail has diminishing returns: a session now clears ~1–2 hard cells at real
risk, while the same effort on **behaviors** (Track 2) removes a whole category
(49 degenerate passes). Treat S-arcs as opportunistic between the higher-leverage
tracks. Re-measure the cluster from the committed baseline before starting any arc
(`node -e` over `packages/testing-framework/baselines/multilingual-priority.json`
→ `executionFailures` per language) — it shifts every PR.
