# Per-language structural arcs roadmap (R2 execution tail)

> **Progress (announce-screen-reader — the deferred S1 follow-up — LANDED):**
> the R2 subset gains its first non-click, event-reading cell and it passes
> 24/24 on arrival (subset 31 → 32, avgExecutionFidelity stays 1.0000). This was
> an EXPANSION, not a tail-clearing — the tail was already 0 (§7bb). Two fixes,
> neither the body split §7bb suspected: (1) `buildAST` bound the custom `on
success` event (carried as an `expression` role, like `htmx:*`) to the `click`
> default — now reads `expression.raw`; (2) the execution validator gained a
> per-cell `PATTERN_TRIGGER` ({event, detail?}) so a `success` `CustomEvent` with
> `event.detail.message` can fire the handler. The `set @attr … on <scope>` plumb
> (S1) did the heavy lifting; the event name + property path are code, preserved
> verbatim across all 24 languages. See CORRECTNESS_RELIABILITY_PLAN.md §7cc.

> **Progress (S1 tabs-aria ×5 — 5 → 0 — ARC COMPLETE):** the deferred
> en-reference band-inversion arc is done. `set @attr to V on <scope>` now
> captures the `on`-scope across the whole stack: a new `scope` SemanticRole +
> optional role on `setSchema` (passthrough marker `on` in every language); the
> core `SetCommand` applies the attribute to every scope-matched element
> (`modifiers.on`, defaulting to `me`); the i18n transformer keeps `on <scope>`
> attached and positions it per word order (`transformSetWithScope`); and the
> SOV/VSO event-handler generators carry an optional trailing `[on {scope}]`
> group (`appendOptionalScope`). **The en reference flipped from the lossy
> `aria-selected=true on #btn` to the scoped `aria-selected=false on .tab ×2 +
aria-selected=true on #btn`, and ALL 24 languages reproduce it** — the band
> inversion was absorbed in the same PR (no language left lossy), so the gate is
> green with NO new execution failures. **avgExecutionFidelity 0.9930 → 1.0000;
> R2 execution cluster → 0.** Baseline regenerated; 8 lock tests added
> (`multilingual-roadmap-fixes.test.ts`). See CORRECTNESS_RELIABILITY_PLAN.md §7bb.
>
> **The R2 execution tail is now fully cleared (0 cells).** Next R2 move per the
> stopping rule: switch to behaviors (Track 2). The §10.6 excluded
> `set @attr … on <sel>` family is re-qualified — the set-scope runtime/parse
> gap that excluded it is closed.

> **Progress (R2 structural tails batch 2 — 10 → 5):** the five remaining
> non-S1 cells were each cleared as a localized, probed-before-edit,
> gate-green, zero-regression fix (avgExecutionFidelity 0.9860 → **0.9930**).
> **Only the S1 tabs-aria ×5 cluster remains** (the deferred en-reference
> band-inversion). The five:
>
> - **tr set-attribute** — TWO compounding bugs. (1) `doğru` ("true") was in the
>   tokenizer's POSTPOSITIONS set ("towards") and classifyToken checks
>   POSTPOSITIONS before isKeyword, so the boolean tokenized as `kind='particle'`
>   — which `tokenToSemanticValue` has no case for, so the set patient rejected
>   it. (2) The i18n transformer emits the dative under vowel harmony (`e` for
>   quoted strings, `-ya` for `doğru`); markerOverride is a single string so the
>   tr set patterns carried only `e`. Removed `doğru` from POSTPOSITIONS + wired
>   the schema's `markerVariants` into the SOV two-role generators (new
>   `resolveRoleMarker` helper) + added tr dative allomorphs to set's patient.
> - **ja put-content-basic** (S4) — the event phrase trails the verb (`"Done!" を
私 に 置く クリック で`); no SOV two-role variant covered event-LAST order, so
>   it fell to the bare command pattern (runs at execute() time, before the click
>   → invisible). Added `generateSOVTwoRoleEventLastEventHandlerPattern`.
> - **id set-style** (S3) — the dict renders "my" as the two-word `saya punya`
>   ("I have"); the connector `punya` between the possessor (saya→me) and the
>   property broke the possessive matcher. Added a `connectors` field to
>   `PossessiveConfig` (id: `punya`) skipped after the possessor keyword.
> - **tr if-matches** — the folded-`if` condition extraction truncated at the
>   first token that begins a command; in SOV the then-verb is clause-final, so
>   `match .disabled durdur` spuriously matched a verb-last halt pattern and cut
>   the condition `I match .disabled` down to `I`. (ja/ko/hi escaped only because
>   their halt pattern happened not to match the span — the same English `I match`
>   leaks into every language.) Added a `CONDITION_OPERATORS` guard: an operator
>   is never a command head, so don't truncate at one.
> - **hi halt-propagation** (the §7y-blocked one) — hi fronts the halt patient to
>   position 0 with a leaked English article (`the घटना को क्लिक पर रोकें …`); the
>   patient role grabbed only `the`, the marker `को` failed, and the halt fell to
>   a BARE halt (stops the handler). `skipNoiseWords` now skips a leaked `the`
>   before `the <ref-noun> <marker>`. The §7y tr/form-submit-prevent regression
>   is **avoided** by the 2-token gate: `the olay çağır …` has the ref noun
>   followed by a VERB (not a marker), so `the` is left intact. en excluded
>   entirely (authored `the`, not a leak) — en reference byte-identical.
>
> **Cluster after batch 2 (5 cells):** tabs-aria ×5 (bn/hi/ja/ko/tr → S1). All
> other languages clear. S1 is the en-reference-lossy arc — the en `set`
> reference drops its trailing `on`-scope modifier even in English. Defer to a
> dedicated band-inversion with a full re-record. See
> CORRECTNESS_RELIABILITY_PLAN.md §7aa.

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
>
> **Progress (R2 tails batch — 13 → 10):** three independent per-language tails
> cleared, each a localized one-mechanism fix (avgExecutionFidelity 0.9818 →
> 0.9860), all probed-before-edit, gate-green, lock-tested:
>
> - **uk make-toast-element** — the Ukrainian CyrillicKeywordExtractor char class
>   includes the apostrophe (internal letter: п'ять, об'єкт), so `canExtract`
>   matched the OPENING quote and `'Saved!'` tokenized as `'Saved`+`!`+`'`,
>   scrambling the fused put body. Reject a LEADING apostrophe in `canExtract`
>   (never word-initial in Ukrainian). The predicted "string-truncation" cause was
>   right; the mechanism was the keyword extractor, not the string extractor (the
>   inverse of the qu fix).
> - **it modal-close-button** — hand-crafted `remove-it-full`/`-simple` labeled the
>   trailing `da {X}` group `destination`; the removeMapper reads `source` only, so
>   `rimuovere .x da corpo` removed from `me`. Aligned to `source` (matches every
>   other language; the format string already said `{target}`). zh's hand-crafted
>   remove patterns share the `destination` label but zh's corpus matches its
>   _generated_ `source` pattern, so zh was left untouched.
> - **th accordion-exclusive** — hand-crafted th add patterns were redundant +
>   harmful (no-dest `add-th-simple` at prio 100 ABOVE with-dest at 95; the
>   with-dest used `position: 3` extraction that can't span a multi-token
>   positional). Removed them; the generated marker-based patterns route the
>   destination through `tryMatchPositionalExpression` (like en).
>
> Two surface "tokens-look-fine" cells (it/th) were actually pattern role/priority
> bugs, not dict gaps — probe the role map, not just the tokenizer. Remaining R2
> tails are higher-effort: **id set-style** (two-word possessive _connector_
> `saya punya` — needs possessive-matcher or transformer work), **ja
> put-content-basic** (S4 SOV verb-final put), **tr if-matches** (conditional
> condition `I match .x` malformed), **tr set-attribute** (SOV `@attr` fronting),
> **hi halt-propagation** (blocked, §7y), and **tabs-aria ×5** (S1, deliberate
> re-baseline).

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
- **Remaining (2):**
  - **halt-propagation** — ✅ **CLEARED (batch 2, §7aa).** The §7y "leaked-`the`
    strip regresses tr" blocker was solved with a 2-token gate: skip the leaked
    `the` only before `the <ref-noun> <marker>` (a fronted patient). tr
    form-submit-prevent's `the olay çağır …` has a VERB after the ref noun, so
    `the` is left intact — no regression. The note below is the original framing.
  - **tabs-aria** — still S1 (the only remaining hi cell).
  - **(historical)** halt-propagation — needs the leaked English article `the` (`the घटना` =
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

### S1 — en-reference-lossy patterns (`set @attr … on <scope>`) ✅ DONE

- **Cleared (5):** tabs-aria (bn, hi, ja, ko, tr) — and the band-inversion
  casualties it would have created (es/fr/de/zh/vi/it/pt/ru/tl/ar/qu, which were
  passing via shared en-lossiness) were ALL fixed in the same PR, so **all 24
  languages** reproduce the scoped reference. avgExecutionFidelity 0.9930 → 1.0000.
- **What it actually was (a 4-layer scope plumb, not just an en parse change):**
  1. **`scope` SemanticRole + setSchema role** — optional, marker `on` in every
     language (passthrough-alignment), svo/sov position 3. The set mapper routes
     it to `modifiers.on`.
  2. **Core `SetCommand`** — `set @attr` applies to every element the scope
     resolves to (`resolveTargets`, defaulting to `[me]`); `resolveElements` made
     cross-realm/missing-global safe (`isNodeList`).
  3. **i18n transformer** — `transformSetWithScope` keeps `on <scope>` attached
     (dedicated splitter guard, since `set` is excluded from `ON_TARGET_COMMANDS`)
     and positions it per word order: appended at clause end for verb-first
     orders + verb-medial SOV event handlers; verb-LAST repositioning for SOV
     standalone then-clause sets; before a clause-final verb for qu.
  4. **Pattern capture** — the hand-crafted set patterns + the SOV/VSO two-role
     event-handler generators gained an optional trailing `[on {scope}]` group
     (`withTrailingScope` / `appendOptionalScope`, gated on the scope role → no-op
     for put).
- **Band inversion absorbed:** the en effect signature changed (lossy → scoped),
  but because every language was fixed in the same PR, the `--regression` gate vs
  the OLD baseline showed NO new execution failures — the previously-lossy passers
  now pass against the scoped reference, and the 5-cluster improved. Baseline
  regenerated to record the gains. See CORRECTNESS_RELIABILITY_PLAN.md §7bb.
- **Unblocks:** re-qualifies the §10.6-excluded `set @attr … on <sel>` family.

### S3 — SOV `@attr` / `set` role-scramble ✅ DONE

- **Closed (batch 2):** tr set-attribute (`doğru`-as-particle in POSTPOSITIONS +
  dative allomorph via `markerVariants` wired into the SOV two-role generators);
  id set-style (two-word possessive connector `punya` via `PossessiveConfig.connectors`).
  The hi + qu shares were already cleared (S6 wave 1 / qu wave 2). See §7aa.
- **(historical)** Remaining (2): set-attribute (tr), set-style (id). The hi share (set-attribute,
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

### S4 — SOV verb-final put ✅ DONE

- **Closed (batch 2):** ja put-content-basic via
  `generateSOVTwoRoleEventLastEventHandlerPattern` (`{roles} {verb} {event}
{eventMarker}`) — the event phrase trails the verb. The qu share was cleared by
  qu wave 1. See §7aa.
- **(historical)** Remaining (1): put-content-basic (ja). `"Done!" を 私 に 置く クリック で` —
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

### Per-language tails (batch opportunistically) ✅ DONE

- **R2 tails batch:** it modal-close-button, th accordion-exclusive, uk make-toast.
- **R2 batch 2:** tr if-matches (CONDITION_OPERATORS — don't truncate the folded-if
  condition at an operator; SOV verb-last halt patterns spuriously matched the
  `match .disabled <verb>` span). See §7aa.
- **Verdict:** all cleared opportunistically while in each language's files, exactly
  per the rubric heuristic #4.

## Ranked sequence (leverage-first)

1. ✅ **(Task #10)** multi-word markers + dict underscore audit — DONE (#417).
2. ✅ **S2** fused-event body routing / compound collapse — **DONE** (5 waves,
   32→25; zh+ms fully clear; subsumes S5). See §7x.
3. ◑ **S6** hi SOV fronting + possessive-dot — **6/8 DONE** (2 waves, 25→19; hi
   8→2). See §7y. Remaining hi: halt (blocked), tabs-aria (S1).
4. ✅ **qu tokenizer** — **DONE** (3 waves, 19→13; qu 6→0). See §7z.
5. ✅ **S3** SOV `@attr`/`set` role-scramble — **DONE** (hi via S6 wave 2 + qu wave
   2; tr set-attribute + id set-style via batch 2). See §7aa.
6. ✅ **S4** SOV verb-final put — **DONE** (qu via wave 1; ja put-content-basic via
   batch 2's event-last wrapper). Per-language tails (it/th) cleared in R2 tails
   batch; tr if-matches + hi halt-propagation cleared in batch 2.
7. ✅ **S1** en-reference-lossy tabs-aria (×5: bn/hi/ja/ko/tr) — **DONE** (band
   inversion absorbed; all 24 langs reproduce the scoped reference;
   avgExecutionFidelity → 1.0000; cluster → 0). See §7bb.

**Cluster snapshot after qu (13 cells):** tabs-aria ×5 (bn/hi/ja/ko/tr → S1),
tr ×2 (if-matches, set-attribute), id set-style, it modal-close-button, ja
put-content-basic, th accordion-exclusive, uk make-toast, hi halt-propagation.
zh ×0, ms ×0, qu ×0; hi ×2.

**Cluster snapshot after R2 tails batch (10 cells):** tabs-aria ×5
(bn/hi/ja/ko/tr → S1), tr ×2 (if-matches, set-attribute), id set-style, ja
put-content-basic, hi halt-propagation. Cleared this batch: uk make-toast, it
modal-close-button, th accordion-exclusive. it ×0, th ×0, uk ×0; id ×1, ja ×1,
tr ×2, hi ×2 (halt + tabs-aria), bn/ko ×1 (tabs-aria).

**Cluster snapshot after R2 structural tails batch 2 (5 cells):** tabs-aria ×5
(bn/hi/ja/ko/tr → S1) — **all that remains**. Cleared this batch: tr
set-attribute, ja put-content-basic, id set-style, tr if-matches, hi
halt-propagation. id ×0, ja ×0, tr ×0 except tabs-aria; hi ×1 (tabs-aria only).
avgExecutionFidelity 0.9860 → 0.9930. The next R2 move is S1 (deliberate
band-inversion) — or, per the stopping rule, switch to behaviors (Track 2).

## S1 — tabs-aria ×5: DONE (band inversion absorbed)

> **Resolved.** The arc below described the deferred plan; it was executed as
> described (with the band inversion absorbed in-PR — see the progress note at
> the top of this file and CORRECTNESS_RELIABILITY_PLAN.md §7bb). The R2
> execution tail is now 0 cells. The historical framing is kept below.

The en reference is itself lossy: `on click set @aria-selected to "false" on .tab
set @aria-selected to "true" on me` parses to two `set` commands that BOTH drop
their `on <scope>` modifier (verified: en AST has destination=@aria-selected,
patient=false/true, no scope), so both write `#btn` and the net visible effect is
`aria-selected=true` on `#btn`. The five translations only reach the first set
(`aria-selected=false`) and then error/drop the second, so they don't even match
the lossy en effect.

A real fix is two-layer: (1) teach the core/semantic `set` to capture `… on
<scope>` (a scope modifier or third role) so the en reference becomes
`aria-selected=false on .tab` + `aria-selected=true on me` — **this inverts the
gate band** (today's en effect signature changes, and every language re-compares
against the new reference); then (2) per-language scope capture. Because step 1
churns the en reference and the whole execution baseline, this must be a dedicated
arc done with `--save-baseline` immediately after, not bundled with zero-regression
tail work. Until then it stays the documented R2 floor.

## Stopping rule (carried from §9)

The R2 tail has diminishing returns: a session now clears ~1–2 hard cells at real
risk, while the same effort on **behaviors** (Track 2) removes a whole category
(49 degenerate passes). Treat S-arcs as opportunistic between the higher-leverage
tracks. Re-measure the cluster from the committed baseline before starting any arc
(`node -e` over `packages/testing-framework/baselines/multilingual-priority.json`
→ `executionFailures` per language) — it shifts every PR.
