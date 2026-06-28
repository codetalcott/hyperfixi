# Multilingual accuracy & reliability — next steps

> **Entry point, written 2026-06-16.** This is the _current_ forward-looking plan.
> The detailed session logs live in
> [CORRECTNESS_RELIABILITY_PLAN.md](CORRECTNESS_RELIABILITY_PLAN.md) (§7a–§7cc, §11),
> [MULTILINGUAL_ROADMAP.md](MULTILINGUAL_ROADMAP.md),
> [STRUCTURAL_ARCS_ROADMAP.md](STRUCTURAL_ARCS_ROADMAP.md),
> [MULTILINGUAL_BEHAVIORS_PLAN.md](MULTILINGUAL_BEHAVIORS_PLAN.md) and
> [BEHAVIORS_CONSOLIDATION_PLAN.md](BEHAVIORS_CONSOLIDATION_PLAN.md). Read this first,
> then dive into those for the per-arc detail.

## Where we are (2026-06-21 baseline · post #470 / #472 · `browser-priority`)

Authoritative source: `packages/testing-framework/baselines/multilingual-priority.json`
(its `timestamp` + `commit` fields stamp each regen). 24 langs × 154 patterns = 3696.

| Signal                         | Value                    | Notes                                                  |
| ------------------------------ | ------------------------ | ------------------------------------------------------ |
| parse rate                     | **3695 / 3696 (99.97%)** | 1 hard fail (`tr window-resize`); was 8                |
| degenerate passes (fid < 0.5)  | **9**                    | was 29 — `behavior-sortable` cluster cleared           |
| lossy passes (0.5 ≤ fid < 1.0) | **53**                   | was 94                                                 |
| faithful (fid = 1.0)           | **~3633**                | was ~3565                                              |
| avgFidelity (R0-recall)        | **0.993**                | was 0.985                                              |
| avgPrecision (R0 trust floor)  | **0.962**                | hi 0.837 is the outlier (next-lowest ja ~0.91)         |
| avgRoleFidelity (R1)           | **0.837**                | **still the laggard** (hi 0.717 · qu 0.770 · bn 0.780) |
| avgExecutionFidelity (R2)      | **1.000**                | curated subset fully reproduces en DOM effects         |

The six-signal ratchet gate is fully wired (parse-rate · degenerate · R0-recall ·
R0-precision · R1 · R2) — see CLAUDE.md "Multilingual parse rate ≠ fidelity".
**Direction now: stop adding gate signals; spend them down.**

> **Update 2026-06-28f (R2 wave 8 — VSO ar/tl/uk fixed; put-before/after JOIN R2; the
> wave-5 worklist is CLOSED). subset 40 → 42.** The last residual from 2026-06-28e — `ar`,
> `tl`, `uk`, whose put is captured inline by the generated fused VSO event pattern (position
> word consumed as a plain destination marker → manner dropped → content inserted INTO the
> target) — is FIXED with handcrafted higher-priority (160) VSO put-before/after EVENT
> patterns (`vsoPositionalPutPatterns` in `event-handler.ts`): ar/tl verb-first
> (`{verb} {patient} <posWord> {dest} <evMarker> {event}`), uk event-first
> (`<evMarker> {event} {verb} {patient} <posWord> {dest}`). They match the position word as
> an explicit literal and record `manner`; the into-form stays on the generated pattern (its
> `في`/`sa`/`в` marker); the `-before`/`-after` id triggers the renderer's positional penalty
> so RENDER still prefers the into-form. **All 23 langs now match en for BOTH put-before and
> put-after; both join `EXECUTION_SUBSET` (40 → 42); R2 stays 1.000.** ar/tl/uk avgRoleFidelity
> +0.0027–0.0041, zero regressions; semantic suite 6262 pass; gate --regression green. Guard:
> the "Positional put `before`/`after`" block now covers all 14 langs (28 cases) + a wave-8
> execution lock (ar reproduces the en before/after offset). **The wave-5 R2 worklist (9
> divergences) is now fully closed**: 6 were stale-DB artifacts (#514), `multiple-events`
> (#515), put-before/after SVO+SOV (#516) + VSO (this). R2 subset 33 → 42.
>
> **Update 2026-06-28e (positional put `before`/`after` — 11 of 14 langs fixed; R1
> +0.004–0.008; VSO ar/tl/uk residual).** The last two wave-5 R2 divergences (`put-after`
> /`put-before`, `put "<p>New</p>" before/after me`) are a multi-family arc. The unifying
> root cause: the position word (`before`/`after` + translations) was not captured as the
> put command's `manner` role (what the AST-mapper turns into the DOM-insert modifier) —
> instead it was rendered into the destination (it/vi), mis-read as a `before`/`after`
> COMMAND in SOV (ja/ko/hi/bn/tr/qu), or split as a then-clause (tr `sonra` / bn `পরে`
> collided with `then`). A parallel **workflow** (5 family-design agents) produced the
> per-language pattern specs; implemented centrally:
>
> - **SVO (it, vi, ru, pl, th)** — handcrafted/priority-tuned put-before/after capturing
>   `manner` (it/vi added; ru/pl bumped; th added).
> - **SOV (ja, ko, tr)** — new verb-final put generators (`{patient} <posWord> {dest} … {verb}`),
>   priority 105 so the matcher wins before the SOV verb-anchoring fallback; **(hi, bn)** added
>   to their existing put functions.
> - **Tokenizer/collision fixes** — tr `sonra`→after (dropped the stale `sonra`→then EXTRA +
>   moved `then` to `ardından` in the dict & then-set); bn `পরে` removed from the then-set; qu
>   `ñawpaqpi`/`qhepapi` as single position-word tokens.
> - **Renderer** — extended the existing `-at-end`/`-at-start` render-only penalty to
>   `-before`/`-after` so the canonical into-form still wins RENDER selection (parse stays
>   priority-ordered) — a latent parser-vs-renderer priority conflict the high-priority
>   positional patterns exposed.
>
> Result: **11 of 14 langs** now parse `put before/after me` with `manner` captured;
> **avgRoleFidelity +0.004–0.008** across bn/hi/it/ja/ko/pl/qu/ru/th/tr/vi + precision gains,
> **zero regressions**, R2 still 1.000. Guard: `multilingual-roadmap-fixes.test.ts`
> "Positional put `before`/`after`" (22 cases, verified failing without the fix).
>
> **Residual blocking the R2 entry: `ar`, `tl`, `uk` (VSO).** Their put is captured INLINE by
> the generated fused VSO event pattern (`put-event-{ar,tl}-vso-verb-first-2role`,
> `put-event-uk-vso-2role`) — the position word (قبل/بعد, bago/matapos, до/після) is a
> destination-marker ALTERNATIVE, so it's consumed as the "into" marker and `manner` is lost
> (inserts INTO me → `+p[2]` + `Δ#btn` instead of before/after). Unlike SVO/SOV there is no
> body re-parse to reach a command-stage put-before pattern. Fixing it needs the VSO
> event-handler GENERATOR (`event-handlers-vso.ts`) to capture `manner` when the destination
> marker is a position word (or handcrafted high-priority VSO put-before/after `on` patterns).
> Once ar/tl/uk match, `put-before`/`put-after` can join `EXECUTION_SUBSET` (40 → 42).
>
> **Update 2026-06-28d (R2 wave 7 — multiple-events fixed; subset 39 → 40).** The first
> of the three genuinely-divergent wave-5 candidates is FIXED. `multiple-events`
> (`on click or keypress[key=="Enter"] toggle .active`) diverged in 7 languages
> (ja, ko, it, hi, tr, bn, qu): English handled the `or` multi-event conjunction in
> `buildEventHandler` (`extractOrConjunctionEvents`), but the per-language pattern paths did
> not — the SVO "full" patterns captured the translated `or` (`o`/`또는`/…) as a **phantom
> body command** (it → runtime "Unknown command: or"), and the SOV Stage-3 fallback mangled
> the clause (ko folded `또는keypress…할때` into an invalid CSS selector). Three root causes,
> all semantic-side:
>
> - **Tokenizer (ja)** — `または` (or) mis-split into `また`(→**and**!) + `は` because the
>   profile's `and` primary `また` is a 2-char prefix of the 3-char `または`. Added
>   `または`→`or` to the ja tokenizer EXTRAS so longest-match keeps it whole.
> - **OR_KEYWORDS (hi/bn)** — `या`/`অথবা` tokenize as bare identifiers; added their surface
>   forms to `OR_KEYWORDS` so the pre-pass detects them (qu `utaq` was already present).
> - **Parser (the unifier)** — a scoped **or-clause excision pre-pass** in `parseInternal`
>   (mirrors the VSO from-first normalization): excise `<or-word> <known-event> [filter]`,
>   re-parse the single-event handler every language already handles, then re-attach the
>   second event as `additionalEvents`. **Gated on a KNOWN event after the or-word**, so it
>   can NEVER fire on `or` inside an expression (`when $a or $b changes`, `($count or 0)`,
>   `if a or b` — the post-`or` token there is a variable/number, not an event; all three
>   verified untouched).
>
> Result: all 23 langs now match the en click effect; **R2 stays 1.000 (subset 39 → 40)**.
> Bonus, ZERO regressions: removing the phantom `or` lifts **avgPrecision** +0.0022 (it, bn,
> qu, tr) and the clean multi-event parse lifts **avgRoleFidelity** +0.0017 (bn, hi, ja, ko,
> qu, tr). Guards: `multilingual-roadmap-fixes.test.ts` "Multi-event \`or\` conjunction"
> (verified failing without the fix). **Two wave-5 divergences remain**: `put-after` /
> `put-before` (positional `put … after/before me`, 14 langs each, multiple root causes —
> `before`/`after` parsed as a command in SOV, position role lost in it/vi, wrong insert
> offset in ar/tl/uk).
>
> **Update 2026-06-28c (R2 wave 6 — subset 33 → 39; the wave-5 worklist was stale).**
> Re-grounding the wave-5 R2 worklist against a **freshly `populate`d** patterns.db (the
> committed db snapshot lags the current dicts) found that **six of its nine** candidates
> already match the en DOM effect in **all 23 priority languages** — their recorded
> divergences were artifacts of the stale committed db (e.g. its ms `next-element` carried an
> untranslated `to next`; a fresh populate emits `ke seterusnya`, which executes identically to
> en). Those six joined `EXECUTION_SUBSET` with **no parser/dict fix** (R2 stays **1.000**,
> subset 33 → 39): `next-element`, `toggle-aria-expanded`, `set-opacity`, `set-transform`,
> `accordion-toggle`, `caret-var-on-target`. The wave-5 worklist counts (next-element 1,
> toggle-aria-expanded 2, set-opacity 4, set-transform 4, accordion-toggle 6,
> caret-var-on-target 23) are all corrected to **0** here. **Methodology lesson (again):** the
> session-12 probe that built the worklist scored a STALE committed db — always `npm run
populate` before grounding R2. The **three genuinely-divergent** candidates remain the
> next-wave R2 worklist (re-grounded fresh-db divergent-lang counts):
>
> - **`multiple-events`** (7: ja, ko, it, hi, tr, bn, qu) — `on click or keypress[…]`: the `or`
>   multi-event separator isn't recognized (it: "Unknown command: or"; ko: the `또는keypress…`
>   run collapses into an invalid CSS selector; ja/hi/tr/bn/qu silently produce no effect).
> - **`put-after`** / **`put-before`** (14 each) — positional `put "<p>New</p>" after/before me`:
>   most langs error ("Unknown command: after", "put requires content and position", "put
>   requires arguments"); the few that execute (ar/vi/tl/uk) insert at the wrong offset (an
>   extra `Δ#btn` + `+p[2]` vs the en `+p[1]`).
>
> Each must be FIXED (not just recorded) before joining the subset, or it drops R2 below 1.0.
>
> **Update 2026-06-28b (R1 default-fill → 0.908; R2 wave 5).** Two more fixes:
>
> - **R1 schema default-fill (#512).** After Arc 4, the dominant remaining R1 drop was
>   DEFAULTED roles: the SVO pattern path materializes a schema role's `default` when
>   absent (toggle/add destination → me, increment/decrement quantity → 1) so en carries
>   it, but the SOV paths drop it (both default identically at runtime — a measurement
>   false-positive). A `fillSchemaDefaults` MEASUREMENT pass (parse-validator, on en +
>   every translation; NOT in `parse()`, which would pollute the renderer) lifts
>   **avgRoleFidelity 0.872 → 0.908** (per-SOV ~+0.04). R0/precision/R2 unchanged.
> - **R2 execution wave 5 (#513).** Added `remove-element` (`remove me`) — the only one
>   of ten fixture-eligible candidates that matched the en effect in **all 23 languages**,
>   so **avgExecutionFidelity stays 1.000** (subset 32 → 33). The other nine eligible
>   candidates have real per-language EXECUTION gaps (parse-faithful but executes
>   differently — exactly what R2 catches) and are the **grounded next-wave worklist**:
>   `next-element` (1 lang: ms) · `toggle-aria-expanded` (2: id,ms) · `set-opacity` (4) ·
>   `set-transform` (4) · `multiple-events` (6) · `accordion-toggle` (6) · `put-after` (14) ·
>   `put-before` (14) · `caret-var-on-target` (23, all). Each must be FIXED (not just
>   recorded) before it can join the subset without dropping R2 below 1.0 — the next
>   correctness arc beyond structural fidelity.
>
> Current authoritative state: parse rate **3696/3696 (100%)**, degenerate **0**, lossy
> **0**, avgFidelity **1.000**, avgPrecision **0.971**, **avgRoleFidelity 0.908**, R2
> **1.000** (33-pattern curated subset). Remaining R1 headroom (hi 0.852 · ja 0.880 the
> laggards) is per-command value-type mismatches (`set.destination:property-path`,
> `repeat` loop roles, `halt.patient` literal-vs-reference) — harder/structural, lower ROI.

> **Update 2026-06-28 (Arc 4 R1 landed + parse rate 100%).** Two follow-on fixes shipped:
>
> - **Arc 4 — SOV role-fidelity (#508).** A schema-driven primary-role normalization
>   (`normalizeCommandRoles` in `semantic-parser.ts`) relabels an SOV-fronted spurious
>   `patient` to the command's schema `primaryRole` for commands with no patient role
>   (fetch→source, wait→duration, send/trigger→event). **avgRoleFidelity 0.845 → 0.872**;
>   per-SOV-lang ~+0.04 (hi 0.757→0.801, bn 0.784→0.831, qu 0.785→0.826, ja/ko/tr similar).
>   R0/precision/execution + degenerate/lossy all unchanged; gate green, guarded.
> - **tr `window-resize` (#510).** The lone parse hard-fail, cleared: the i18n dict's
>   `boyut_değiştir` split on `_` → `değiştir`→`toggle` homonym destroyed the resize event; a
>   single-token `boyutlandırma` keeps it whole. **Parse rate 3695/3696 → 3696/3696 (100%)** —
>   zero failing patterns across all 24 priority languages. (Grounding corrected the handoff:
>   the fronted `debounced at 200ms` modifier was NOT a second blocker — the parser tolerates it.)
>
> Current authoritative state: parse rate **3696/3696 (100%)**, degenerate **0**, lossy **0**,
> avgFidelity **1.000**, avgPrecision **0.971**, **avgRoleFidelity 0.872**, R2 **1.000**.
> The 2026-06-21 table below is superseded. **R1/SOV role-fidelity is the only open headroom**
> (laggards now hi 0.801 · qu 0.826 · bn 0.831): the dominant patient→primaryRole mistype is
> fixed, and the remaining R1 drops are per-command value-TYPE mismatches (e.g.
> `send.destination` selector-vs-reference, `repeat` loop roles, `set.destination` property-path
> in SOV) — a smaller, lower-priority follow-on, not a single convergent defect. See Track 3.

> **Update 2026-06-27 (lossy tail CLEARED — both correctness bands now empty).** The
> degenerate band (→0, #492/#493) and the **lossy band (53 → 0, #495–#506)** are now BOTH
> empty: **every one of the 3695/3696 parsing patterns is faithful** (fid = 1.0). The lossy
> tail fell across a session-long sweep — th `trigger`/`send` (#495) · per-language
> `of`-possessive markers (#497) · `get-value` de/pl/zh (#498) · `form-submit-prevent` he/zh
> (#499) · `unless-condition` qu/vi/zh (#501) · vi `render` (#502) · qu `append` (#503) · zh
> `tell` (#504) · the ar/qu/sw loop-body + ko if-fold residue (#506) — almost all
> _localized-alignment_ fixes (a dict keyword, tokenizer split, or per-language role marker),
> with the methodology lesson holding throughout (the theorized "hottest-path body-parse" cause
> was wrong on all but the ko if-fold). Authoritative baseline (commit `12018416`,
> `browser-priority`): parse rate **3695/3696**, degenerate **0**, lossy **0**, faithful
> **3695**, avgFidelity **1.000**, avgPrecision **0.971**, **avgRoleFidelity 0.845** (still the
> laggard — hi 0.757 · bn 0.784 · qu 0.785 · ja 0.795 · ko 0.806), R2 **1.000**. The
> 2026-06-21 table below is superseded. **What remains is no longer a lossy band** — only the
> **R1/SOV role-fidelity burn-down (Track 3 / the convergent SOV event-anchor arc)** and the
> deferred **`tr window-resize`** hard-fail. Per-fix grounding + the remaining arcs are in
> [`HANDOFF-lossy-tail.md`](HANDOFF-lossy-tail.md).

> **Update 2026-06-26 (priority degenerate band → 0).** The last two priority
> degenerates are cleared (see
> [`HANDOFF-remaining-degenerate-singletons.md`](HANDOFF-remaining-degenerate-singletons.md)):
> **ko `window-scroll`** (semantic Stage-2 command-homonym event-head guard —
> `hasSOVEventMarkerHead`; the if/else body was a red herring, the blocker was Stage 2
> short-circuiting on the `스크롤` scroll-command homonym) and **tl `behavior-resizable`**
> (i18n tokenizer keeping an attached `(arg, list)` atomic so the VSO from-first reorder
> stops splitting `pointerdown(clientX, clientY)`; collateral: ar resizable 0.667→0.889).
> Priority gate: **degenerate 2 → 0**, lossy unchanged (32), parse-rate 3695/3696, zero
> regressions. Remaining multilingual work is the **lossy tail (Track 4)** and the **R1/SOV
> role-fidelity burn-down (Track 3)**, scoped (with Arc 1 — th `trigger`/`send` — empirically
> grounded) in the successor handoff
> [`HANDOFF-lossy-tail.md`](HANDOFF-lossy-tail.md). Note: the th lossy tail is NOT a
> "th-wide body-parse" issue as earlier theorized — it is th dropping the `event`-category
> commands (`trigger`/`send`) specifically; and the ar residual is narrower than the
> `measure`-drop framing now that #493 cleared the handler-head mangling (re-localize first).

> **Update 2026-06-17 (PR #445, behavior-removable he/zh).** The two he/zh
> `behavior-removable` hard fails are fixed (null → lossy: he 0.556, zh 0.667).
> Root cause was two stacked bugs: (1) the i18n transformer inserted a
> pre-positioned object marker before the behavior name in he/zh
> (`behavior את Removable` / `behavior 把 Removable`), which broke the semantic
> block parser's `tokens[1]` name detection; (2) `parseConditional` dropped the
> condition of block-style `if <cond>` (no inline `then`) in **all** non-English
> languages. The condition fix is cross-language, so it rippled positively:
> `behavior-removable` degen→lossy in 7 other langs, and draggable/resizable
> collapsed from ~23 → 8–9 non-faithful each. Zero regressions; avgFidelity and
> avgRoleFidelity up in every language. **All 8 remaining hard fails are now
> reactivity (Track 2).**

> **Update 2026-06-21 (PRs #470 + #472, `behavior-sortable` residuals — all three
> cleared).** The three remaining `behavior-sortable` residuals tracked in
> `HANDOFF-sov-sortable-residuals.md` (now complete) are fixed; `behavior-sortable`
> is faithful in every priority language except `th` (a pre-existing lossy, not one
> of the three). **Two of the three handoff diagnoses were wrong** — the real causes
> were simpler and both semantic-side:
>
> - **#470 — `exit`/`end` keyword collision (ja degenerate, de lossy).** The i18n
>   dict emits the `exit` command as a word the semantic end-keyword set ALSO listed
>   (ja `終了`, de `beenden`, ko `종료`; the real `end` is 終わり/ende/끝). Inside an
>   `if … exit … end` block the `exit` token decremented the body parser's
>   block-depth one step early, so the block's real `end` terminated the WHOLE
>   handler body — dropping every command after a following nested block. This was
>   the actual cause of "defect C — de (V2) sortable body" (NOT a V2 body-parse bug)
>   and of ja's degeneracy (the A2a verb-medial `set` it was blamed on survives via
>   `ml.parse` — it was never the gate blocker). Fix: `isEndKeyword` (ja/ko/de) +
>   the ja profile `end` alternatives no longer read the `exit` emission as `end`.
> - **#472 — ar VSO from-first `wait` clause (ar lossy).** The handoff guessed an
>   i18n-transformer mask-split / doubled clause; the real cause is the **ar
>   tokenizer** splitting `وثيقة` (document) at the proclitic `و` (`and`) → `و` +
>   `ثيقة`, where the spurious `and` conjunction became a clause boundary that
>   dropped the command — plus the generated `wait {duration}` pattern not anchoring
>   when the post-verb token is the source particle `من`. Fix: keep `وثيقة` whole
>   (proclitic-extractor `NON_PROCLITIC_WORDS`) + a hand-crafted `wait-ar-from-first`
>   pattern. The i18n transformer/dict output was clean — no transformer change.
>
> Net (priority gate): degenerate **10→9** (ja sortable was the only sortable
> degenerate), lossy **55→53**, parse-rate unchanged (3695/3696), zero regressions;
> guards in `multilingual-roadmap-fixes.test.ts`. The A2a/A2b SOV reorder defects the
> handoff theorized for sortable turned out NOT to gate it; whether they remain real
> for other patterns is untested (no longer sortable-blocking).

## The leverage map (what's actually non-faithful) — 2026-06-17

> **Snapshot — superseded by the 2026-06-21 baseline** (degenerate 9, lossy 53; see the
> "Where we are" table + the #470/#472 note above). The per-pattern counts below are the
> 2026-06-17 figures; in particular `behavior-sortable` (then 9 degen + 14 lossy) is now
> faithful in every priority lang but `th`. Kept as the historical cluster analysis.

Of the **131** non-faithful instances (29 degenerate + 94 lossy + 8 hard-fail),
two clusters dominate:

| Cluster                                                                         | degenerate | lossy | hard-fail |  total |   share |
| ------------------------------------------------------------------------------- | ---------: | ----: | --------: | -----: | ------: |
| **Behaviors** (removable/sortable/resizable/draggable + install)                |         18 |    47 |         0 | **65** | **50%** |
| **Reactivity** (bind-\* / live-\* / two-way / computed / intercept / window-\*) |          8 |     0 |         8 | **16** |     12% |
| **Control-flow** (`unless-condition` + then-chain bodies)                       |          1 |    10 |         0 |     11 |      8% |
| Long tail (get-value, tell-\*, set-color-variable, …)                           |          2 |    37 |         0 |     39 |     30% |

Per-pattern: `behavior-removable` 6 degen + 17 lossy (was 13 degen + 8 lossy + 2 hard) ·
`behavior-sortable` 9 degen + 14 lossy · `unless-condition` 1 degen + 8 lossy ·
`behavior-resizable` 1 degen + 8 lossy (was 21 lossy + 2 degen — the block-`if` fix) ·
`behavior-draggable` 8 lossy (was 23 lossy). **Hard fails were all reactivity** (ms `bind-*`×4,
sw `two-way-binding`/`computed-value`/`input-char-count`, tr `window-resize`); **PRs #446 + #447
cleared ms+sw (7 of 8)** — only `tr window-resize` remains (parse rate now **3695/3696**). See
the Track 2 increment notes below.

> **Read the behavior share through the implementation lens.** ~56 of the 94 behavior
> instances are the **Experimental 3** (Draggable/Sortable/Resizable) — the _only_ three
> behaviors implemented in **imperative JS** (`imperativeInstaller`) instead of compiled
> hyperscript `source`; the other 8 are source-compiled (audited 2026-06-16). But all three
> already ship a complete, faithful hyperscript `source` (e.g. `draggableSchema.source` is a
> real `repeat until event pointerup` / `wait for pointermove or pointerup` / `measure` impl).
> So this is a **runtime-capability** question, not a lane question — see Track 1.

## Plan — ranked by leverage

### Track 1 (top priority) — Behaviors: curate the showcase, fix the curated bug, harden the _system_

**The goal is not comprehensiveness.** We are not shipping a large behavior library —
the priority is **getting the behavior _system_ right**: a clear path for the user
community and LLM agents to write and install new behaviors, with the curated set as a
showcase of _what a behavior is_ and _what kinds hyperfixi enables_. The product decision
already exists in [`packages/behaviors/src/curation.ts`](../packages/behaviors/src/curation.ts):

- **Curated 5 (the supported story):** Toggleable, **Removable**, ClickOutside, Clipboard,
  AutoDismiss — real `on event → DOM action` inline scripts (the demonstration of "what is a behavior").
- **Optional 3:** FocusTrap, ScrollReveal, Tabs — primitives / nice-to-haves.
- **Experimental 3:** Draggable, Sortable, Resizable — labeled "stateful async components."
  **But each already ships a complete hyperscript `source`** and is the _only_ tier still
  executed via an **imperative JS** `install()` that bypasses that source. So the label is
  provisional: the boundary test is operational, not philosophical (see item 1).

**Constraint (user, 2026-06-16): no behavior may be implemented in imperative JS — all must
compile from hyperscript `source` (single source of truth).** Audit (2026-06-16): only
Draggable/Sortable/Resizable violate this (`imperativeInstaller`); the other 8 are clean.

The fix is to **eliminate imperative JS first**, then align curation, then invest in the system:

> **Status: item 1 DONE (2026-06-16, branch `feat/behaviors-no-imperative-js`).** Draggable /
> Sortable / Resizable now compile from `source`; `imperativeInstaller` under behaviors/ = 0.
> Required: parser CSS-interp whitespace fix (merged #440), `repeat until event … from <target>`
> resolution fix (core `repeat.ts`), and three source-idiom swaps (Resizable `*width`, Sortable
> `target.closest("li")`, `or pointerup` in the inner waits). Three runtime bugs surfaced en route
> — see **Runtime correctness follow-ups** below. Items 2 (`behavior-removable`) and 3 (the system)
> remain.

1. **Resolve the Experimental 3 to hyperscript `source` — fix-vs-cut is per-behavior and
   runtime-driven, not a blanket cut.** Each already has real source; the imperative installer
   exists because the runtime historically couldn't execute the source's advanced features.
   So, per behavior: (a) run its `source` and see what the runtime drops — Draggable needs
   `repeat until event pointerup`, `wait for pointermove or pointerup from document`, `measure
x/y`, and dynamic `add { left: ${…}px }` style templating; (b) if the runtime executes it,
   **delete the imperative `install()` and route through `source`** (same path as the curated 8)
   — this both honors the no-imperative-JS rule _and_ makes the multilingual fidelity follow for
   free (parse of one source); (c) **cut only** the behavior whose source genuinely can't execute
   without a runtime feature too costly to add — and even then, prefer fixing the feature, since
   it's likely shared (`repeat-until-event` is already a tracked gate pattern). Start with
   Draggable (we had it working before; richest source) as the bellwether for Sortable/Resizable.
2. ~~**Fix `behavior-removable` — it is CURATED, so its failures are real bugs.**~~ **DONE**
   (2026-06-17, PR #445). Was the only behavior with **hard** parse failures (he/zh null parse).
   Two stacked bugs, both fixed: (a) the i18n transformer inserted a pre-positioned object marker
   before the behavior name in he/zh (`behavior את Removable` / `behavior 把 Removable`), breaking
   the semantic block parser's `tokens[1]` name detection — fixed by `resolveNameTokenIndex`
   skipping a leading patient-marker token ([`block-parser.ts`](../packages/semantic/src/parser/block-parser.ts));
   (b) `parseConditional` dropped the condition of block-style `if <cond>` (no inline `then`) in
   **all** non-English languages — fixed in [`transformer.ts`](../packages/i18n/src/grammar/transformer.ts).
   he/zh now parse 154/154 (lossy: he 0.556, zh 0.667). The condition fix is cross-language, so it
   rippled: `behavior-removable` degen→lossy in 7 other langs, draggable/resizable ~23 → 8–9
   non-faithful each, avgFidelity + avgRoleFidelity up everywhere, zero regressions. It is still
   6 degen + 17 lossy (the body sub-parse drops `trigger`/`remove`/`halt` after the conditionals) —
   a faithful pass is future headroom, not a regression. Remaining behavior debt is now
   `behavior-sortable` (9 degen + 14 lossy) and the Experimental-3 source execution (item 1).

   > **Multilingual behavior fidelity is a PRIORITY (user, 2026-06-17).** The faithful-pass
   > headroom above is the next behavior arc, not optional.
   >
   > **⚠️ DIAGNOSIS CORRECTION (2026-06-19).** The earlier triage above — and
   > [`HANDOFF-transformer-behavior-fidelity.md`](HANDOFF-transformer-behavior-fidelity.md) — blamed
   > the **i18n `GrammarTransformer`** ("nested `if {…}` bodies flattened into a then-chain"). That
   > was reproduced via `MultilingualHyperscript.translate`, which is **`semantic.translate` =
   > parse→render**, a path the **fidelity gate does not use**. The gate measures the translations in
   > `patterns.db`, populated by `sync:translations` → the **i18n `GrammarTransformer.transform`**,
   > whose output is in fact **faithful** (precision **1.000** in every language — no flattening, no
   > dropped `js()`/`halt`/`transition`). The real loss is **pure recall in the SEMANTIC PARSER**:
   > parsing the (faithful) translation drops the handler-body commands that follow the first nested
   > `if`/`repeat` block — exactly the "body sub-parse drops `trigger`/`remove`/`halt` after the
   > conditionals" line above. **It is a parser bug, not a transformer bug.** Do NOT spend effort on
   > `transformer.ts` for this; the HANDOFF doc is superseded.
   >
   > **Increment DONE (2026-06-19, semantic parser).** Two stacked bugs in
   > [`semantic-parser.ts`](../packages/semantic/src/parser/semantic-parser.ts) `buildEventHandler`:
   > (a) the fused-pattern **fold-rewind guard** only saw a TOP-LEVEL conditional, but
   > `parseBodyWithClauses` wraps a multi-statement body in a `compound` — so the fold was missed and
   > the flat path dropped every command after the SECOND `end` (`trigger removable:removed`,
   > `remove me`); fixed to look inside the single-`compound` wrapper. (b) `isEndKeyword` rejected the
   > **English literal `end`** for curated langs (es `fin`, ja `終わり`, …), but a masked `js(…) … end`
   > block restores its terminator as English `end` → the conditional's depth tracker counted the js
   > body's `if` (+1) but not the js `end` (−1), unbalancing depth so the conditional over-consumed
   > the rest of the body; fixed to accept English `end` universally. Result: **behavior-removable
   > 0.667 → 0.889** across the clean SVO/other langs (es/fr/de/zh/it/id/ms/vi/ru/pl/he), per-language
   > avgFidelity +0.0014–0.0022, avgRoleFidelity up everywhere, **gate green, zero regressions**,
   > 6098 semantic tests pass. Regression guards in
   > [`multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
   > ("Multi-statement handler body with a js-bearing nested if").
   >
   > **Increment 2 DONE (2026-06-19, PR pending — js-block opacity).** Removed removable's last
   > non-SOV gap: the en reference parsed a phantom `return` (and a surplus `if`) from inside the raw
   > `js(me) … if (…) return "cancel"; … end` body — masked in translations, so they could never
   > match it (capped removable at 0.889). A standalone `js(…) … end` already parsed clean (the main
   > parser stops after the first command), but **nested** in a handler/conditional body the clause
   > loop split the block at its internal `end` and re-parsed the JS body through the command
   > patterns. Fix: `parseBodyWithClauses` now consumes a `js(…) … end` block as one opaque `js`
   > command (`consumeJsBlock` — first `end` closes it, same heuristic as the i18n js-mask), built
   > directly so the JS body never reaches `matchBest`. Applies to en + every translation (the `js`
   > keyword survives translation verbatim). Result: **behavior-removable now FAITHFUL (1.0) in 11
   > languages** (es/fr/de/it/id/ms/zh/vi/ru/pl/he); priority gate **lossy 93→84, degenerate 24→22**,
   > avgFidelity + avgRoleFidelity up, precision flat, **zero regressions** across all 8 js-using
   > behaviors; 6101 semantic tests pass. Guard:
   > [`multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
   > "js(…) … end blocks are opaque to the body parser".
   >
   > **Still open (each its own increment):** (1) **`behavior-sortable`** is unmoved — its loss is
   > `repeat`/`wait` inside a `repeat until event pointerup … end` block, BUT triage (2026-06-19)
   > shows the real blocker is the i18n transformer rendering `trigger sortable:start on me` as
   > `disparar sortable:start entonces en yo` (a spurious `then` + a stray `en yo` = "on me") right
   > before the loop block — the exact `trigger … on me` artifact `ON_TARGET_COMMANDS`
   > ([`transformer.ts`](../packages/i18n/src/grammar/transformer.ts)) deliberately leaves split. So
   > sortable is a **coupled transformer+parser** arc (clean the `trigger … on me` rendering AND
   > teach the body parser the loop-block fold), not a single-defect fix. (2) **SOV/VSO degeneracy**
   > (ja/ko/tr/qu/ar/tl) on both behaviors is the behavior-head/`init` reorder, a separate structural
   > problem (removable still degenerate in ar/qu/tl/tr). (3) ~~**pt/sw removable** lose `on`/`remove`/
   > `trigger` even as SVO~~ **DONE** (see Increment 3 below).
   >
   > **Increment 3 DONE (2026-06-19, PR pending — block-parser marker/opener homonym).** pt/sw were
   > the only SVO languages still lossy (0.625) on removable. Root cause: `parseBehaviorBlock`'s
   > depth tracker mis-counted the Portuguese dative marker `para` ("to", from `set triggerEl to me`
   > → `definir triggerEl para eu`) as the `for` LOOP opener — they share the surface form `para` in
   > pt — so depth never returned to 0 at the init's `end` and the init segment swallowed the entire
   > `on click` handler (`eventHandlers` empty; trigger/remove dropped). The tokenizer had already
   > resolved the ambiguity (it normalizes the marker to its role `destination`, not `for`); the
   > opener check ([`block-parser.ts`](../packages/semantic/src/parser/block-parser.ts) `isBlockOpener`)
   > now trusts that normalized role over the colliding surface form. A token with no normalized form
   > (a raw js-body `if`) still falls back to the surface match, preserving js-block depth balance.
   > Result: **pt + sw removable now FAITHFUL (1.0)** → removable faithful in **13** languages;
   > priority gate lossy 84→80, degenerate 22→20, avgFidelity + avgRoleFidelity up, precision flat,
   > zero regressions; 6103 semantic tests pass. Guard:
   > [`multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
   > "Block depth tracking ignores marker/opener homonyms".
   >
   > **Increment 4 DONE (2026-06-19, PR pending — sortable `trigger … on me` rendering).** The
   > "coupled transformer+parser" framing was **half wrong**: an isolation probe (replicating the
   > gate path — `maskSpans → GrammarTransformer → unmaskSpans`, then `ml.parse`) showed the parser
   > already folds a clean `repeat until event … end` block in a handler body (the SVO loss was NOT
   > a parser gap). The **sole** cause was the i18n transformer: `trigger X on me` / `send X on me`
   > were not in `ON_TARGET_COMMANDS`, so `splitOnCommandBoundaries` split at the locative `on`
   > (`trigger sortable:start` | `on me`) and the line-join re-inserted the target `then`
   > (`disparar sortable:start entonces en yo`); the dangling `then` glued the FOLLOWING
   > `repeat until event …` loop into a then-chain and dropped `repeat`/`wait`. Fix: add
   > `trigger`/`send` to `ON_TARGET_COMMANDS` ([`transformer.ts`](../packages/i18n/src/grammar/transformer.ts))
   > so `on <target>` stays attached (also flows through the SVO `buildArgumentModifierMap`
   > event→destination remap). The old "destabilises the parser" comment was stale (predated the
   > #452–#454 body increments). Result: **behavior-sortable lossy → FAITHFUL (1.0) in 13 SVO/other
   > languages** (es/fr/he/id/it/ms/pl/pt/ru/sw/uk/vi/zh); ko degenerate→lossy; bn/hi/th lossy→0.889.
   > Priority gate **lossy 80→68, degenerate 20→19**, parse-rate unchanged (3695/3696), avgFidelity +
   > avgRoleFidelity up, precision flat, **zero regressions**; 846 i18n tests pass + 8 new guards.
   > Guard: [`grammar.test.ts`](../packages/i18n/src/grammar/grammar.test.ts) "trigger/send `on
<target>` keeps its target — no spurious then (behavior-sortable)". removable byte-identical
   > (its `trigger removable:before/removed` carry no `on <target>`).
   >
   > **SOV/VSO arc — fully mapped (2026-06-19 deep diagnosis).** The handoff lumped this as one
   > "behavior-head/`init` reorder," but isolation probing (each command parsed alone, then the
   > init/handler sub-structures) shows it is **five separable defects**, NOT a deep SOV verb-final
   > gap. Every plain SOV handler command (`set`/`trigger`/`remove`/`add`/`halt`, chained, and
   > `trigger X on me`) parses faithfully — the loss is in **opener routing** + **control-flow body
   > parsing**, the documented dominant cluster:
   >
   > - **A — SOV behavior-final opener** (ja/ko/qu/tr): the `behavior` verb reorders block-final
   >   (`Foo(x) を behavior`), so `tryParseBlock` never routed it to `parseBehaviorBlock` →
   >   kind=compound/event-handler, behavior+init lost. **DONE (Increment 5 below).**
   > - **A2a — bare-`if` body command drop** (ja/ko/qu/tr): a standalone `if cond / cmd / end`
   >   (the behavior `init`) drops its body command (`set`). Root cause: `tryParseConditionalBlock`'s
   >   condition/then split (semantic-parser.ts) finds the then-branch via `tokensBeginCommand`,
   >   which (using bare `matchBest`) fails on a SOV verb-final command with a **bare-identifier
   >   patient** (`x を 設定 …`) — a selector patient (`.a を 追加 …`) is recognized, so `add` survives
   >   but `set` is swallowed into the condition. OPEN. **Prototype tried + rejected (2026-06-19):** a
   >   gated SOV copula-split (re-partition `condTokens` after the copula's predicate) is **clean
   >   (zero gate regressions)** but only recovers **ko** — `이다` normalizes to `is`, but ja `である`
   >   tokenizes to `で`+`ある` (and `で` IS the event marker — can't treat as copula), tr `dir`/qu
   >   `kanqa` don't normalize to a copula. Real fix needs per-language SOV copula normalization OR
   >   scan-from-end verb-final then-branch detection — materially larger/riskier than defect A.
   > - **A2b — command after a nested block dropped** (ja/ko/qu/tr): the SOV analogue of the
   >   merged #452/#453 fixes — the command right after a nested `if … end` in a handler body is
   >   dropped (`trigger removable:before`). `parseBodyWithClauses` SOV path. OPEN.
   > - **B — VSO/Austronesian handler-head** (ar/tl): opener IS recognized but the handler head
   >   leads with `from <target>` before the `on <event>` marker, so the handler isn't recognized.
   >   **DONE (Increment 6 below).**
   > - **C — de (V2) sortable body collapse**: opener + handler recognized, but the V2-reordered
   >   pointerdown body drops most commands. A separate V2 body-parse defect. OPEN.
   >
   > Plus sortable's **SOV trigger-drop tail** (bn/hi/th/ko miss `trigger`) — same A2b family.
   > Making ja/ko/qu/tr faithful needs **A + A2a + A2b** (sequenced); B and C are smaller arcs.
   >
   > **Increment 5 DONE (2026-06-19, PR pending — SOV behavior-final opener, defect A).**
   > [`tryParseBlock`](../packages/semantic/src/parser/block-parser.ts) now also detects a
   > `behavior` keyword past index 0 with a PascalCase name at index 0 (the SOV verb-final
   > declaration `Foo(x) <marker> behavior`), and `parseBehaviorBlock` takes the keyword index so
   > the name leads and the body starts past the (verb-final) keyword. ja/ko/qu/tr now parse as
   > `kind=behavior`: removable qu/tr **degenerate→lossy** (0.625), ja/ko lossy 0.5→0.625; sortable
   > qu→0.889, ko/tr→0.778, qu/tr **degenerate→lossy**. Priority gate **degenerate 19→15**, lossy
   > 68→65, parse-rate unchanged (3695/3696), execution 1.0, **zero regressions**; 6109 semantic
   > tests pass (+4 guards). NOT yet faithful — the residual is A2a (init `set`) + A2b (handler
   > `trigger`/`remove` after the nested blocks), the next two increments. ja sortable + ar/de/tl
   > unaffected by A (their causes are A2b-heavy / B / C). Guard:
   > [`multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
   > "SOV verb-final behavior declaration opener".
   >
   > **Increment 6 DONE (2026-06-19, PR pending — VSO from-first handler-head, defect B).** The VSO
   > transform fronts a handler's `from <source>` clause ahead of the `on <event>` marker
   > (`on click from triggerEl` → ar `من triggerEl عند نقر`, tl `mula_sa triggerEl kapag click`), so
   > no event pattern anchored on the leading source marker and the whole handler + body dropped
   > (the bare `on click` form parsed fine). The parse entry
   > ([`semantic-parser.ts`](../packages/semantic/src/parser/semantic-parser.ts)) now detects a
   > leading `source`-marker + a following `on`-marker (VSO-gated), moves the from-clause to AFTER
   > the event, and re-parses the normalized `on <event> from <source>` order (the order the SVO
   > event path already handles). The source is moved, not dropped, so role-fidelity is intact.
   > **removable ar+tl → FAITHFUL (1.0)** (were degenerate); **sortable tl → FAITHFUL**, sortable ar
   > degenerate→lossy 0.889 (residual: `wait` inside the repeat loop — A2b). Priority gate
   > **degenerate 15→11**, lossy 65→66 (the one ar-sortable flip), parse-rate unchanged (3695/3696),
   > execution 1.0, **zero regressions**; 6112 semantic tests pass (+3 guards). de sortable (C) +
   > ja/ko/qu/tr (A2a/A2b) unaffected. Guard:
   > [`multilingual-roadmap-fixes.test.ts`](../packages/semantic/test/multilingual-roadmap-fixes.test.ts)
   > "VSO from-first event-handler head".
   >
   > **Still open after Increment 6 (as understood 2026-06-19):** **A2a** (SOV bare-`if` body
   > `set`), **A2b** (SOV/VSO command after a nested block — the sortable ar `wait` + bn/hi/th/ko
   > trigger-tail + ja sortable), **C** (de V2 sortable body).
   >
   > **⚠️ SUPERSEDED for `behavior-sortable` (2026-06-21, PRs #470 + #472 — see the dated note at
   > the top of this file).** The sortable items above were misattributed. ja-sortable-degenerate
   > and de-sortable-lossy ("defect C") were BOTH the `exit`/`end` keyword collision (`終了`/`beenden`
   > read as `end`), not the A2a/A2b SOV reorders or a V2 body-parse — fixed in `isEndKeyword` (#470).
   > ar-sortable-`wait` was the ar tokenizer splitting `وثيقة` at the `و` proclitic + a missing
   > from-first `wait` pattern (#472), not the transformer. `behavior-sortable` is now faithful in
   > all priority langs but `th`. **A2a/A2b/C were never the gate blockers for sortable**; whether
   > A2a/A2b remain real defects for OTHER patterns (e.g. bn/hi/th/ko trigger-tail on other
   > behaviors) is untested — re-triage before assuming they're open.

3. **The actual priority — the authoring + install system for community & LLM agents:**
   - ~~**Authoring guide**~~ **DONE** (2026-06-16): `packages/behaviors/AUTHORING.md` — the
     canonical "what is a behavior / boundary test / how to write one / install + resolver /
     agent checklist" doc, for humans _and_ agents. Stale `core/BEHAVIORS.md` +
     `SORTABLE_BEHAVIOR_GUIDE.md` (old imperative architecture) replaced with redirects.
   - **Install path:** the resolver hook already works (`install X` → `_hyperscript.behaviors.resolve(X)`
     → compile-on-first-use, `packages/behaviors/src/behavior-resolver.ts`) — now documented in
     AUTHORING.md §7 as the public extension point.
   - **LLM-agent path (boundary _validator_) — SKIPPED for now** (decision 2026-06-16: too heavy
     for this stage of adoption). AUTHORING.md §9 already gives agents a boundary checklist; an
     MCP/programmatic validator that _enforces_ it (reject component-shaped behaviors) is deferred
     until adoption justifies the weight. Revisit when there's real third-party behavior authoring.

**Layer:** runtime (execute the Experimental-3 source + the Removable parse bug) + product
curation + DX/tooling (the system). **Owner docs:** `packages/behaviors/AUTHORING.md`,
MULTILINGUAL_BEHAVIORS_PLAN.md, BEHAVIORS_CONSOLIDATION_PLAN.md. **Audit cmd:** grep
`imperativeInstaller` under `packages/behaviors/src/behaviors/` — must reach 0.

### Track 2 — Reactivity: bring the multilingual parse path up to the runtime

> **htmx v4 syntax verified (2026-06-17, against four.htmx.org).** htmx v4 reactivity is the
> **`hx-live` extension only** — a JS-expression body re-run via a document-wide
> `MutationObserver` + `input`/`change` events + post-swap, with a `q()` selector proxy and
> `debounce`/`timeout`/`trigger`/`take`/`nextFrame` scope helpers — plus the separate `hx-sse`
> / `hx-ws` streaming extensions. **htmx v4 has NO `hx-bind`, `hx-computed`, two-way binding,
> or signals.** So of the gate's reactivity patterns, only **`live`** descends from htmx v4
> (`hx-live` → hyperfixi's `live … end`, with a hyperscript body instead of upstream's JS — a
> documented divergence). **`bind` / `computed` / `two-way` are hyperfixi-native reactivity
> DSL, not htmx v4.** The old "reactivity (htmx v4)" framing conflated the two; corrected here.
> (Possible follow-up unrelated to the gate: hyperfixi's SSE/WS compat uses the htmx-2-era
> `sse-connect`/`ws-connect` attribute names; htmx v4 ships these as the `hx-sse`/`hx-ws`
> extensions. Worth reconciling in the htmx-compat layer, but out of scope for the parse path.)

**Decision (settled): reactivity is in scope and must be supported in the multilingual path.**
This is a parser/profile build-out, not an exclusion.

> **Increment 1 DONE (2026-06-17, PR #446).**
> Recon disproved the "all 8 are reactive block shapes" framing: the 8 hard fails split three
> ways. Cleared the clean half:
>
> - **ms `bind`×4 (hard-fail → parse).** `bindSchema` source `markerOverride` had `ms:'to'`
>   (stale comment "no i18n grammar profile") but ms gained the Malay grammar profile, so the
>   transformer emits the dative `ke`. Pattern expected `to`, text had `ke` → NULL. Fixed
>   `ms:'to'`→`'ke'` (mirrors `id`) in `command-schemas.ts`.
> - **hi `bind`×4 + `intercept` (degenerate → faithful/improved).** The hi profile was missing
>   `bind` and `intercept` keywords entirely (English-literal emission, like `worker`/
>   `eventsource`); added them + a hi `bind` source marker (`में`).
>
> Result: parse rate **3688 → 3692/3696**, degenerate **29 → 24**, hi avgFidelity **+0.033**,
> gate green, **zero regressions**. Semantic suite 6099 green.

> **Increment 2 DONE (2026-06-17, PR pending — `feat/track2-sw-input-event`).** Cleared the
> sw `input` cluster (3 hard-fails: `input-char-count` / `two-way-binding` / `computed-value`).
> Root cause was NOT an event×`set` interaction (my first guess) but a dict↔tokenizer mismatch:
> the i18n transformer emits the Swahili `ingizo` for the `input` event, but the sw tokenizer
> only listed the English literal `input`, so `ingizo` tokenized as a bare **identifier**. After
> the homonymous on/into marker `kwenye` (normalized to `destination`), an unknown event +
> `set`-body became ambiguous → NULL (recognized events like `bonyeza`→click parsed fine; same
> handler with `add`/`put` survived). Fix: add `{ native: 'ingizo', normalized: 'input' }` to
> `tokenizers/swahili.ts` (same dict↔profile-alignment family as id `toggle`, qu/tl `get`).
> Result: sw 151 → 154/154, parse rate **3692 → 3695/3696**, gate green, zero regressions (sw
> precision −0.0012, within tolerance — the computed-value complex-expr phantom). Semantic 6099 green.

**Remaining: 1 hard fail + hi block cluster — precise diagnoses (deferred, each its own arc):**

1. **tr `window-resize` (the last hard-fail).** Two stacked issues. (a) The sw-style event-name
   gap, but worse: the i18n transformer emits `boyut_değiştir` for `resize`, and the tr tokenizer
   **splits on `_`** → `boyut` / `_` / `değiştir`, where `değiştir` alone normalizes to **`toggle`**
   (collision). So the resize event is destroyed, not just unrecognized. The click form
   (`tıklama`, single token) parses identically, so a single-token resize recognition is the core
   fix — but it needs the underscore-split resolved (cf. the `enyakın` fused-token fix), likely an
   i18n-side single-word resize emission + tr tokenizer entry. (b) Independently, the `debounced
at 200ms` event modifier is left untranslated and fronted by the SOV reorder. Both needed for
   the full gate pattern. 1 hard-fail, ~2 fixes — lower ROI than the hi block cluster.

   > **Data point (2026-06-21, ru/uk install-behavior).** The same underscore-split bit ru/uk
   > `install`: the profile's disambiguator `установить_пакет` / `встановити_пакет` was inert
   > because the ru/uk tokenizer splits on `_` → `установить` → `set` (install ≡ set homonym),
   > so `install-behavior` was degenerate. **Resolved WITHOUT touching the tokenizer** by giving
   > install a distinct single-token loanword (`инсталлировать` / `інсталювати`) in both the
   > semantic profile + i18n dict (degenerate 6 → 4, zero regressions). For tr `window-resize`,
   > the equivalent single-token route would be a non-underscore resize keyword that doesn't
   > collide with `toggle` — likely cleaner than teaching the tr tokenizer to keep `_`-compounds
   > whole. The `debounced at 200ms` modifier is the separate, harder half.

2. **hi `live-derived-value` / `live-multiple-deps` (degenerate); also `intercept` blocks.** The
   genuine **reactive block-shape** work: `live`/`intercept` (and `eventsource`/`socket`/
   `worker`) are `bareKeyword` blocks (`hasBody:true`), but `block-parser.ts` only handles
   `behavior`/`def`. In non-English the `live … end` / `intercept … end` block parses as a bare
   `on`, dropping the block action. Teach the block layer the bareKeyword block shape (mirrors
   the behavior/`def` structural layer).

**Layer:** (1) sw semantic parser/tokenizer · (2) i18n transformer (SOV event reorder + modifier
xlate) · (3) semantic block-parser (bareKeyword blocks). Start with (1) — most leverage, cleanest
scope.

> **Increment DONE (2026-06-21 — reactivity degenerate cluster, hi live + ms socket).**
> The "teach `block-parser.ts` the bareKeyword block shape" diagnosis above was
> **wrong** (methodology lesson #2 — verify the layer empirically). es/ja/zh already
> parse `live … end` / `socket … end` as a single `command` (the bareKeyword pattern
> matches at the command stage; `collectActions` doesn't descend into the body, so the
> dropped body costs no fidelity). The two degenerate causes were per-language and in
> two **different** layers:
>
> - **hi `live-derived-value` + `live-multiple-deps` (semantic parser).** The hi
>   bare-event pattern `event-hi-bare` (`{event}`, priority 80) runs at Stage 1 —
>   before the command stage — and its single event role anchored the fronted `लाइव`
>   (live) keyword, so the block parsed as a bare `on` + `put`, dropping `live`. Fix:
>   the event-anchor guard (`pattern-matcher.tokenLooksLikeEvent`) now rejects a token
>   whose normalized form is a bareKeyword block action (`live`/`socket`/`eventsource`/
>   `worker`/`intercept`, derived from the schemas), so it falls through to the command
>   stage where the `live` pattern wins. Same guard family as the existing selector/URL
>   rejection.
> - **ms `socket-basic` (i18n dict).** The ms dictionary was missing the `socket`
>   command entry, so the transformer emitted English `socket`; the semantic ms profile
>   expects native `soket`, so the token tokenized as a bare identifier and `put`
>   (`letak`) won as the head. Fix: add `socket: 'soket'` to the ms dictionary (mirrors
>   ja `socket: ソケット`). (The full `generate-i18n-dictionaries` regen would also pull
>   in 7 unrelated stale ms derived entries incl. a `replace`/`replaceUrl` collision —
>   deferred as a separate ms-dict resync.)
>
> Net (priority gate): degenerate **9 → 6**, hi avgFidelity 0.980 → 0.993 + avgPrecision
> 0.837 → 0.850, ms avgFidelity/avgPrecision +0.007, zero regressions; 6134 semantic +
> 855 i18n tests pass. Guards: `multilingual-roadmap-fixes.test.ts` "bareKeyword block
> keyword is not mis-anchored as a bare event (hi live)" + `grammar.test.ts` "Malay
> socket command translates to native soket" (both verified failing without the fix).
> The remaining reactivity item is `intercept`/`eventsource`/`worker` block coverage if a
> future corpus exercises them in a SOV/bare-event language — the same guard now protects
> them, but they're untested in the priority corpus.

### Track 3 — R1 role-fidelity burn-down (the untouched dimension)

**Why:** avgRoleFidelity **0.833** is the laggard, and it has _never had a dedicated
campaign_ — it drifted up incidentally from 0.7505 (first measured, #365) to 0.833 as a
side effect of other work. The worst languages are the hard SOV/reorder set:
**hi 0.683 · qu 0.770 · bn 0.780 · ko 0.788 · ja/tr 0.793**. R1 measures
`action.role:valueType` recall — a parse that keeps the verb but drops or mistypes a role.

**Action:** triage R1 on hi/qu/bn first (worst three). For each, dump the role-signature
diff vs the en reference per pattern and find the recurring mistype/drop (likely a
marker→role mapping or a value-type classification in the per-language profile). This is
profile/parser work — but targeting _roles_, not _presence_. New `--regression` won't flag
drift here until someone drives it; this is greenfield headroom.

> **Triage DONE (2026-06-17) — the dominant cause is STRUCTURAL SOV, not dict-alignment.**
> A per-pattern role-signature diff (`action.role:valueType` recall vs en) across hi/qu/bn
> found the same two signals dominate all three: **`on.event:literal`** (hi 22×) and
> **`fetch.source:literal`** (hi/qu/bn **13× each**), with `repeat.loopType`/`repeat.event`
> (~7× each lang) and `halt.patient:literal` (6×) behind them. These are **not** independent
> dict gaps — they trace to ONE SOV root cause: when the SOV reorder fronts a **literal or
> expression** (a URL, a `fn()` call), the parser mistakes it for the **event** (hi parses
> `fetch /api/data` → `/api/data को लाएं` as `on /api/data … fetch`; `on click call myFunction()`
> → `myFunction()` becomes the event), or fails to match the bare SOV command at all (qu
> `/api/data ta apamuy` and bn `/api/data কে আনুন` return **NULL**). The control case proves it:
> when the fronted element is a **selector** (`on click toggle .active` → `.active को क्लिक पर
टॉगल`) the parse is **R1-perfect**. So selector-fronted SOV works; literal/expression-fronted
> SOV is mis-anchored. This is the **same structural frontier** as the deferred `tr
window-resize` hard-fail and the SOV behavior reorders — NOT the R0 dict-alignment family.
>
> **Implication for sequencing.** The biggest remaining multilingual headroom — the last
> reactivity hard-fail (tr), the hi/qu/bn R1 laggard, and the SOV `fetch` NULLs — **converges on
> one arc: SOV bare-command / event-anchor disambiguation** (don't treat a fronted
> literal/expression as an event; match the bare `<obj> <marker> <verb>` SOV command for the
> qu/bn NULL cases). One focused structural fix could move all three at once — but it edits the
> hottest, most regression-sensitive parser path (every SOV language currently passing), so it
> deserves a dedicated arc with careful R0/precision/parse-rate guards, not a tail-end increment.
> The quick dict-alignment R1 wins are largely already harvested by the R0 arcs; what's left here
> is structural.

### Track 4 — Control-flow + long-tail lossy

> **DONE (2026-06-27) — the lossy band is empty (lossy → 0).** `unless-condition` (#501; three
> independent keyword/transform causes, NOT body-parse as framed) and the full long-tail
> (`fetch-do-not-throw` #481, `get-value` #498, `tell-*` #504, `set-color-variable` #497, `render`
> #502, `append` #503, the ar/qu/sw loop-body + ko if-fold residue #506) are all faithful. No
> control-flow / long-tail lossy passes remain in the priority corpus. Per-fix grounding:
> [`HANDOFF-lossy-tail.md`](HANDOFF-lossy-tail.md).

**Why:** `unless-condition` (8 lossy + 1 degen) is the largest non-behavior lossy pattern;
the docs' long-standing diagnosis is **control-flow body parsing** (`if`/`unless` headers +
then-chain `put`/`set` bodies collapsing). The rest is a singleton long tail
(`get-value` 4, `tell-*` 4, `set-color-variable` 4 — `fetch-do-not-throw` 5→0, cleared by the
fused-event if-block fold, PR #481).

**Action:** opportunistic, lower ROI than Tracks 1–2. Take `unless-condition` as the
representative and fix the enclosing block/then-chain collapse; the tail is per-pattern.
Defer the per-language R2 structural arcs (STRUCTURAL_ARCS_ROADMAP.md) — explicitly the
lowest-ROI remaining parse work.

### Track 5 — Reliability hygiene (do alongside, not after)

1. **Refresh stale headline numbers in the detailed docs.** _Partly done 2026-06-17:_ this
   file + a dated snapshot note added to CORRECTNESS_RELIABILITY_PLAN.md §1 and
   MULTILINGUAL_ROADMAP.md "Remaining work" pointing at the 06-17 baseline
   (lossy **94** / avgFidelity **0.985** / degenerate **29**). The prose bodies of those two
   docs still carry their original session-era figures inline — left as historical context,
   superseded by the dated snapshot + the baseline JSON (the authoritative source).
2. **Make `populate` deterministic.** CLAUDE.md flags the "minor residual jitter" on a few
   boundary patterns that forces the ratchet tolerances (3 lossy / 3 degen flips, 0.02 avg).
   A deterministic populate lets us tighten those tolerances toward 0 and trust the gate more.
3. **Consider an absolute fidelity floor**, not just a ratchet — once a language clears a
   threshold, ratchet the floor upward so it can't silently backslide within tolerance.
4. **hi precision follow-up.** hi avgPrecision **0.815** is a clear outlier (next-lowest ja ~0.91).
   The 2026-06-15 marker-disambiguation fix lifted it +0.016; more phantom-command sources
   remain in the hi profile. (Largely subsumed by Track 2 — the hi degenerate cluster is reactivity.)

## Runtime correctness follow-ups (core `_hyperscript`-compat — surfaced during Track 1a)

These are general core-runtime bugs (not multilingual) found while making the behavior
sources execute. The behaviors shipped via working idioms, so none are blocking — but each
is a real `_hyperscript` compatibility gap worth its own focused fix + test.

1. ~~**Top-level `on event(args)` doesn't bind event args.**~~ **DONE** (branch
   `fix/runtime-event-args-and-style`). The top-level parser emitted the destructure names as
   an untyped `params` field the runtime never read; now emits `args` (the field the runtime
   binds from + the behavior parser already uses). `on click(button)` etc. now bind.
2. ~~**`set my style.X` resolves to the read-only _computed_ style.**~~ **DONE** (same branch).
   The set member-assignment path now targets the writable inline `element.style` for
   `.style.<prop>` writes (reads unchanged). `set my style.width to "50px"` works; the
   Resizable `*width` idiom remains valid (not retrofitted — `*prop` is equally canonical).
3. **`closest <X/> to Y` positional returns null.** The positional `the closest <li/> to the
target` idiom yields null even when a match exists (`target.closest("li")` works). Lower
   priority — workaround is clean. Fix: the `closest <selector/> to <expr>` evaluator.

## Recommended sequence

1. ~~**Track 1a — eliminate imperative JS**~~ **DONE** (PRs #440–#442): Draggable/Sortable/Resizable
   compile from `source`; `imperativeInstaller` → 0. Runtime follow-ups #1 (event-args) + #2 (inline
   style) also **DONE** (#442); #3 (`closest`) deferred.
2. ~~**Track 1b — authoring guide**~~ **DONE** (#443, `packages/behaviors/AUTHORING.md`). The
   boundary **validator** is **skipped** for this stage (see item 3 above).
3. ~~**`behavior-removable` he/zh**~~ **DONE** (2026-06-17, PR #445). See Track 1 item 2.
4. ~~**Track 2 — reactivity in the multilingual parse path**~~ **7 of 8 hard-fails DONE**
   (PRs #446 ms `bind`×4 + hi keywords, #447 sw `input` event). Parse rate **3688 → 3695/3696**.
   Only `tr window-resize` remains — deferred as **structural SOV** (see Track 2 increment notes).
   The hi `live`/`intercept` bareKeyword block-shape work is the remaining genuine block-parser arc.
5. **Track 3 — R1 role-fidelity** triaged (2026-06-17): the laggard (hi 0.683 / qu 0.770 / bn 0.780)
   is **dominated by structural SOV mis-anchoring**, not dict-alignment (see the Track 3 triage
   note) — `on.event:literal` + `fetch.source:literal` are the top drops and both trace to "fronted
   literal/expression mistaken for the event / bare SOV command not matched."
6. **The convergent next arc — SOV bare-command / event-anchor disambiguation.** `tr window-resize`,
   the hi/qu/bn R1 laggard, and the SOV `fetch` NULLs are **one structural problem**. A focused arc
   here is now the highest-leverage remaining parser work — but it's regression-sensitive (hottest
   SOV path), so guard R0/precision/parse-rate carefully. Alternative if smaller wins are preferred:
   **Track 4** lossy long-tail (94 lossy ≫ the 1 remaining hard-fail).

> **Increment DONE (2026-06-17 — SOV event-anchor / bare-command).** The structural root cause
> (a fronted **literal / expression / URL** mis-anchored as the handler event in SOV reorders) is
> fixed. Five changes, all semantic-side, gate green (`--regression` exit 0), **zero regressions**:
>
> - **Event-anchor guard** ([`pattern-matcher.ts`](../packages/semantic/src/parser/pattern-matcher.ts)
>   `tokenLooksLikeEvent`) — the `event` role of an event-HANDLER pattern (`command === 'on'`) now
>   rejects selectors / URLs / `#@*`-punctuation / string-number literals, so a fronted `/api/data`
>   can't anchor a bare-event pattern. Scoped to `on` (send/trigger payloads keep literal events) and
>   parens-tolerant (the `when (<expr>) changes` reactive patterns capture an expression in `event`).
> - **Bare-call fold** (same file, `tryMatchBareCallExpression`) — folds `name(args)` (parens tokenize
>   as identifiers in the multilingual tokenizers) into one expression so a verb-final SOV role
>   captures `myFunction()` whole instead of stranding `( )`. Skipped for the `event` role
>   (`on pointerdown(clientX, clientY)` destructures params, not a call) and for DECLARATION commands
>   (`behavior`/`def`/`install` — `Draggable(dragHandle)` is a signature; folding it let a single-command
>   pattern shadow the faithful `behavior … end` block parse).
> - **SOV `fetch` command patterns** ([`patterns/fetch.ts`](../packages/semantic/src/patterns/fetch.ts)
>   `sovFetch`, ja/ko/tr/hi/qu/bn) — verb-final `{source} [<patient-marker>] <verb>` mapping the
>   patient-marked URL to `source` (the transformer marks `fetch <url>` with the object marker; mirrors
>   `fetch-zh-ba`). Standalone SOV `fetch /api/data` was NULL in all five marker langs → now faithful
>   (`fetch.source:literal`).
> - **qu/tr URL tokenization** (`classifyToken` in tokenizers/quechua.ts + turkish.ts) — `/path` → `url`
>   (was `identifier`→`expression`), so `fetch.source` types match the en `literal` reference.
> - **hi added to `SOV_EVENT_MARKERS`** (`पर`, [`semantic-parser.ts`](../packages/semantic/src/parser/semantic-parser.ts))
>   — hi was the only priority SOV lang without a Stage-3 SOV event-extraction fallback, so its
>   patient-first 2-role event handlers (e.g. `append-content` `{patient} को {event} पर {verb}
{destination} में`) had survived only via the now-removed bare-event mis-anchor. The fallback is
>   additive (Stage 3 runs only after Stages 1–2 fail; known-event gate + body re-parse).
>
> **Result:** **hi avgRoleFidelity 0.683 → 0.713 (+0.030)** — the worst R1 laggard, driven by the
> `on.event:literal` cluster (hi had no SOV fallback). hi avgPrecision +0.010, global avgPrecision
> +0.0015, avgFidelity flat, parse rate **3695/3696** (unchanged; the corpus fetch was already
> non-null — these are fidelity gains). Baseline regenerated. Semantic unit suite 6098 green.
> One unit test (`commands-scroll-push-replace-process` hi `replace`) added `hi` to its skip set: its
> hand-crafted `बदलें_यूआरएल` input underscore-splits (same root cause as the already-skipped tr/qu
> `_url` forms) and had only "passed" via the degenerate string-literal-as-event crutch the guard removes.
>
> **Still open (out of this increment):**
>
> - **`tr window-resize`** — the lone remaining hard-fail (still 3695/3696). Compounded: (1) the i18n
>   transformer emits `boyut_değiştir` for `resize`, which the tr tokenizer splits on `_` →
>   `değiştir`(→`toggle` collision); (2) the `debounced at 200ms` modifier is left untranslated and
>   fronted. Deferred — it needs an i18n single-token-resize emission + tr tokenizer fused-token entry
>   (cf. `enyakın`) **and** modifier translation, a high-risk multi-part change to the hottest path for
>   the single lowest-ROI pattern.
> - **Complex multi-clause SOV `fetch` — ✅ R0 set-drop resolved (PR #481, #480).**
>   `fetch-do-not-throw` (`fetch … as JSON do not throw then if it set $users to it end`) is now
>   **faithful in all priority langs** (was lossy in bn/hi/ja/ko/tr). #480 stripped the phantom
>   `throw`; #481 made the fused-event body **fold its trailing `if … end` block** and recover the
>   verb-medial `set` in the then-branch (`parseBodyWithGrammarPatterns`), and scoped the
>   verb-anchoring particle guard to known role markers so the `set`-value marker (`に`) no longer
>   anchors a phantom `into`. The same root-cause fold also cleared `fetch-error-handling`,
>   `form-disable-on-submit`, `modal-close-escape` (1→0 each) and `take-class-from-siblings` (2→1).
>   Any remaining qu/bn `fetch.source` **role-typing** slice (R1 — mis-typed `fetch.patient` via
>   verb-anchoring) is a separate matter; the `fetch`→`source` verb-anchoring remap tried earlier
>   proved **inert** on the corpus and was dropped.

Re-baseline (`--save-baseline`) after each intentional fidelity change, regenerate against a
freshly `populate`d DB, and commit only the dicts/profiles + baseline (not `patterns.db`).
