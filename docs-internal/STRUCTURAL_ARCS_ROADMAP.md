# Per-language structural arcs roadmap (R2 execution tail)

> **Progress (S2 DONE — 32 → 25 execution cells):** the **S2 fused-event
> body-routing / compound-collapse arc is complete** (5 waves, semantic-only).
> It cleared **7 cells — zh ×5 and ms ×2, both languages now fully clear**:
> zh `当…时` circumfix folding the conditionals (if-condition/if-exists/if-matches),
> zh `匹配` matches operator (modal-close-backdrop), the ms put-with-`ia`
> marker-as-possessive bug (make-element), per-language `at end of` position-noun
> in the clause splitter (zh make-toast), and the at-end-connective-as-possessive
> bug (ms make-toast). avgExecutionFidelity 0.9551 → 0.9649. The make-toast
> survivors (hi/qu/uk) belong to **other** arcs (S6 SOV, qu tokenizer, uk
> string-truncation), not S2. Next leverage-first target: **S6 (hi)**.

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

### S2 — fused-event body routing / compound collapse ✅ DONE (5 waves)

- **Cells cleared (7):** if-condition/if-exists/if-matches (zh), modal-close-backdrop
  (zh), make-toast-element (zh, ms), make-element (ms). zh + ms now fully clear.
- **What it actually was (5 distinct mechanisms, not one):**
  1. **zh `当…时` circumfix** — the standard zh event wrapper leaked the trailing
     `时` into the body, pushing `如果` off clause-start so the conditional fold
     never ran (the whole `if … end` block collapsed to a flat `compound`). Added
     the `当 {event} 时 {body}` event pattern. Cleared the 3 English-condition
     conditionals.
  2. **zh `匹配` matches operator** — added to the zh profile (the §7r ko/ru/uk
     mechanism) so modal-close-backdrop's folded condition evaluates.
  3. **ms put-with-`ia` (marker keyword)** — `ke`→`destination` was read as a
     possessive property of `ia`(it); reject role-marker concept normalizeds as
     possessive property heads. Cleared make-element.
  4. **per-language `at end of` position noun** — zh `结束` (a keyword) triggered
     the clause splitter's `end`-break mid-phrase; generalized the position-noun
     guard to the PUT_AT_END at/of words. Cleared zh make-toast.
  5. **at-end connective as possessive** — ms `di` (an identifier at-end
     connective) was eaten as `ia`'s property; reject PUT_AT_END connective words
     as possessive property heads. Cleared ms make-toast.
- **Note vs original framing:** the predicted "zh/bn whole-body compound collapse"
  was really the `时`-leak (mechanism 1), and "ms drops the trailing clause" was
  two distinct possessive-greedy bugs (3 + 5), not one put pattern. bn was NOT a
  current S2 target (its only live cell is tabs-aria → S1). All 5 fixes are
  semantic-only, parse-level byte-identical, each gate-verified + baselined +
  lock-tested. See CORRECTNESS_RELIABILITY_PLAN.md §7x.

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

### S5 — zh compound-collapse conditionals (subsumed by S2) ✅ DONE

- **Cells:** if-condition (zh), if-exists (zh), if-matches (zh) — all cleared by
  S2 waves 1–2. **tr if-matches remains** (a separate then-branch issue, not zh
  compound-collapse — see the per-language tails).
- **Verdict:** folded into S2 as predicted; the zh share is cleared.

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

1. ✅ **(Task #10)** multi-word markers + dict underscore audit — DONE (#417).
2. ✅ **S2** fused-event body routing / compound collapse — **DONE** (5 waves,
   32→25; zh+ms fully clear; subsumes S5). See §7x.
3. **S6** hi SOV fronting + possessive-dot — highest single-language count (hi ×8).
   **← next.**
4. **S3** SOV `@attr`/`set` role-scramble.
5. **S4** SOV verb-final put + per-language tails — opportunistic.
6. **S1** en-reference-lossy tabs-aria — last; high-risk band-inversion, do only
   with a deliberate re-baseline.

**Cluster snapshot after S2 (25 cells):** hi ×8 (S6), qu ×6 (qu tokenizer),
tr ×3 (set-attribute, tabs-aria, if-matches), ja ×2 (put-content-basic, tabs-aria),
bn/id/it/ko/th/uk ×1. zh ×0, ms ×0.

## Stopping rule (carried from §9)

The R2 tail has diminishing returns: a session now clears ~1–2 hard cells at real
risk, while the same effort on **behaviors** (Track 2) removes a whole category
(49 degenerate passes). Treat S-arcs as opportunistic between the higher-leverage
tracks. Re-measure the cluster from the committed baseline before starting any arc
(`node -e` over `packages/testing-framework/baselines/multilingual-priority.json`
→ `executionFailures` per language) — it shifts every PR.
