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
> string-truncation), not S2.
>
> **Progress (S6 6/8 — 25 → 19):** S6 (hi) then cleared **6 of its 8 cells** in two
> zero-regression waves — the set-family (set-text/inner-html/style/attribute) via a
> set markerOverride.hi alignment, and make-element/make-toast via a verb-medial hi
> put pattern. hi 8→2; only halt-propagation (blocked — leaked-`the` strip regresses
> tr) and tabs-aria (S1) remain.
>
> **Progress (qu DONE — 19 → 13):** the qu tokenizer arc then cleared **all 6 qu
> cells** in 3 waves — reference alignment to dict forms (4), `cheqaq`→true (1),
> and make-toast (single-quote strings + fused-body at-end guard + PUT_AT_END
> wiring) (1). The "accusative over-stripping" was an unknown-word artifact, not a
> particle bug. **Session total: 19 cells, 32 → 13.** Next: the deferred S1
> tabs-aria family (×5) or per-language tails.

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

## The arcs (ranked) — cell map progressed through session 23

> Original snapshot was HEAD `7a0769df` (#416, 32 cells). Updated through the
> S2 / S6 / qu arcs — see the per-arc status (✅/◑) and the current cluster
> snapshot below the ranked sequence (13 cells). Re-measure before any new arc.

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

### S6 — hi worst-language SOV fronting + possessive-dot ◑ 6/8 DONE (waves 1–2)

- **Cleared (6):** set-text/set-inner-html/set-style/set-attribute (wave 1 — the
  set schema gained markerOverride.hi {destination:`को`, patient:`में`}, which the
  transformer emits inverted from the hi profile defaults; the existing
  `set-event-hi-sov-2role-dest-first` pattern then matched). make-element +
  make-toast (wave 2 — added `put-hi-verb-medial` `{patient} को रखें {destination}
में`; the transformer emits put VERB-MEDIAL in fused-body then-clauses, which had
  fallen to `put-hi-bare` and grabbed the destination as the patient). Execution
  32→19 over the session (S2 + these); both waves zero-regression, baselined, lock-
  tested. See §7y.
- **Remaining (2), both DEFERRED:**
  - **halt-propagation** — needs the leaked English article `the` (`the घटना` =
    "the event", fronted to position 0) removed so `halt-event-hi-sov-patient-first`
    matches. A general leading-`the` strip WORKS for hi but **regresses
    tr/form-submit-prevent 4 actions → 1** (its leaked leading `the olay` is
    load-bearing for a fragile halt+call+if body parse). Needs either a hi-scoped
    strip (smell) or hardening tr's body parse first. Probed + reverted, not shipped.
  - **tabs-aria** — S1 (en-reference-lossy `set @attr … on <scope>`); high-risk
    band-inversion, do with a deliberate re-baseline.
- **Original cell list (hi in 8):** set-inner-html-possessive-dot, set-text-possessive-dot,
  set-style, set-attribute, halt-propagation, make-element, make-toast, tabs-aria.
- **Mechanism (re-probed session 23, NOT a single lever):** the hi transformer
  fronts the patient/target to position 0, BEFORE the event: `<role> को क्लिक पर
<verb> <value> में`. The priority-80 fallback `event-hi-bare` (`{event}`) then
  grabs that fronted token as the EVENT and the body collapses. Confirmed parses:
  - set-text/set-style/set-inner-html: event captured as the property-path
    `me.textContent` / `me.*background` (the fronted **destination** + trailing
    `<value> में` patient — NOT covered by `generateSOVPatientFirstEventHandlerPattern`,
    which is patient-first with no trailing value).
  - set-attribute: event captured as `@disabled` (fronted `@attr`).
  - halt-propagation: event captured as `the` — a leaked **English article**
    (`the घटना` = "the event"; dict/transformer left `the` untranslated).
  - make-element: matches `make-event-hi-sov-patient-first` (event=click OK) but
    the trailing `put it into #container` scrambles to patient=#container /
    dest=me (a role-swap, the S3 `set`-scramble class — distinct bug).
- **Why it's a grind:** each cell needs a DIFFERENT hi SOV event pattern (a
  destination-fronted-with-trailing-value pattern for the set-trio; an `@attr`-
  fronted pattern for set-attribute; the leaked-`the` fix for halt; a put role
  un-scramble for make-element). No single circumfix-style lever like S2 wave 1.
- **Layer:** `event-handlers-sov.ts` (new hi patterns) + `semantic-parser.ts`.
- **Yield H (8) · Leverage L (one language, ~4 distinct sub-fixes) · Confidence M
  (probed) · Risk M (SOV event patterns + en-reference-shared roles) · Unblocks: no.**
- **Verdict:** highest count but confirmed a per-language grind. Best entry point:
  a **destination-fronted-with-value SOV event pattern** for the set-trio (3 cells,
  the cleanest shared sub-lever). halt's leaked-`the` and set-attribute's `@attr`
  front are separate small fixes. make-element overlaps S3.

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

### S3 — SOV `@attr` / `set` role-scramble ◑ mostly absorbed

- **Remaining (2):** set-attribute (tr), set-style (id). The hi share (set-attribute,
  set-style) was cleared by **S6 wave 1** (the set markerOverride.hi alignment) and
  the qu share (set-attribute) by **qu wave 2** (`cheqaq`→true).
- **Mechanism (remaining):** id set-style is the two-word possessive PHRASE
  (`saya punya *background`); tr set-attribute is the SOV `@attr` fronting that the
  hi marker alignment did NOT generalize (tr has its own markers).
- **Layer:** `semantic-parser.ts` SOV + possessive-phrase matcher.
- **Yield L (2) · Leverage L (id/tr, distinct) · Confidence M · Risk M · Unblocks: no.**
- **Verdict:** mostly done via S6/qu; the id/tr residue is a 2-cell tail.

### S5 — zh compound-collapse conditionals (subsumed by S2) ✅ DONE

- **Cells:** if-condition (zh), if-exists (zh), if-matches (zh) — all cleared by
  S2 waves 1–2. **tr if-matches remains** (a separate then-branch issue, not zh
  compound-collapse — see the per-language tails).
- **Verdict:** folded into S2 as predicted; the zh share is cleared.

### S4 — SOV verb-final put

- **Remaining (1):** put-content-basic (ja). `"Done!" を 私 に 置く クリック で` —
  SOV verb-final put with a trailing event phrase; no wrapper covers that order.
  (The qu share was cleared by **qu wave 1** reference alignment — qu's structure
  `{patient} ta {dest} man {event} pi {verb}` already parsed once `noqa`→me resolved.)
- **Yield L (1) · Leverage L · Confidence M · Risk M.**
- **Verdict:** small; do opportunistically when in the SOV event-wrapper code.

### qu particle-tokenizer ✅ DONE (3 waves — qu 6→0)

- **Cleared (6):** modal-open, modal-close-button, modal-close-backdrop,
  put-content-basic (wave 1 — reference alignment to dict forms); set-attribute
  (wave 2 — `cheqaq`→true); make-toast (wave 3 — single-quote strings +
  fused-body at-end guard + PUT_AT_END wiring). Execution 19→13. See §7z.
- **What it actually was (NOT particle over-stripping):** the roadmap's "accusative
  over-stripping" (`punta`→`pun`+`ta`) was an UNKNOWN-WORD artifact — the qu profile
  carried formal spellings (me=ñuqa, target=ñawpaqman, body=ukhu, it=pay) the dict
  never emits (it emits noqa/punta/kurku/chay). Once `punta` is the profile's
  `target` reference it tokenizes whole; no particle-logic change was needed. The
  one genuine tokenizer fix was the string extractor (it rejected single quotes to
  avoid the glottalization apostrophe, breaking `'Saved!'`).
- **All semantic-only, zero regressions, baselined, lock-tested.**

### Per-language tails (batch opportunistically)

- it modal-close-button (body captured as DESTINATION not source — role-mislabel),
  th accordion-exclusive. ~2 cells, 1 each. (qu modal-close-button was cleared by
  the qu arc.)
- **Verdict:** not worth a dedicated arc; fix when already in that language's files.

## Ranked sequence (leverage-first)

1. ✅ **(Task #10)** multi-word markers + dict underscore audit — DONE (#417).
2. ✅ **S2** fused-event body routing / compound collapse — **DONE** (5 waves,
   32→25; zh+ms fully clear; subsumes S5). See §7x.
3. ◑ **S6** hi SOV fronting + possessive-dot — **6/8 DONE** (2 waves, 25→19; hi
   8→2). See §7y. Remaining hi: halt (blocked), tabs-aria (S1).
4. ✅ **qu tokenizer** — **DONE** (3 waves, 19→13; qu 6→0). See §7z.
5. **S3** SOV `@attr`/`set` role-scramble — mostly absorbed (S6 wave 2 hi put;
   qu wave 2 set-attribute). Remaining: tr/id set-attribute/set-style.
6. **S4** SOV verb-final put + per-language tails (it/th) — opportunistic.
7. **S1** en-reference-lossy tabs-aria (×5: bn/hi/ja/ko/tr) — last; high-risk
   band-inversion, do only with a deliberate re-baseline.

**Cluster snapshot after qu (13 cells):** tabs-aria ×5 (bn/hi/ja/ko/tr → S1),
tr ×2 (if-matches, set-attribute), id set-style, it modal-close-button, ja
put-content-basic, th accordion-exclusive, uk make-toast, hi halt-propagation.
zh ×0, ms ×0, qu ×0; hi ×2.

## Stopping rule (carried from §9)

The R2 tail has diminishing returns: a session now clears ~1–2 hard cells at real
risk, while the same effort on **behaviors** (Track 2) removes a whole category
(49 degenerate passes). Treat S-arcs as opportunistic between the higher-leverage
tracks. Re-measure the cluster from the committed baseline before starting any arc
(`node -e` over `packages/testing-framework/baselines/multilingual-priority.json`
→ `executionFailures` per language) — it shifts every PR.
