# Multilingual accuracy & reliability — next steps

> **Entry point, written 2026-06-16.** This is the _current_ forward-looking plan.
> The detailed session logs live in
> [CORRECTNESS_RELIABILITY_PLAN.md](CORRECTNESS_RELIABILITY_PLAN.md) (§7a–§7cc, §11),
> [MULTILINGUAL_ROADMAP.md](MULTILINGUAL_ROADMAP.md),
> [STRUCTURAL_ARCS_ROADMAP.md](STRUCTURAL_ARCS_ROADMAP.md),
> [MULTILINGUAL_BEHAVIORS_PLAN.md](MULTILINGUAL_BEHAVIORS_PLAN.md) and
> [BEHAVIORS_CONSOLIDATION_PLAN.md](BEHAVIORS_CONSOLIDATION_PLAN.md). Read this first,
> then dive into those for the per-arc detail.

## Where we are (2026-07-11 baseline `c5c884cc` · post R1-deferred-tail #638 · `browser-priority`)

> ## 🎉 THE LAUNCH BAR IS COMPLETE (session 14 / L7)
>
> All four bar items are reached and gate-held. The last blocking family —
> take-class spurious `for` ×6 — fell in the L7 drill; the residual `for` ×3
> (wait-payload behaviors) is below the ×5 bar threshold and stays on the
> post-launch track. Fidelity work from here is post-launch polish; the
> eight-signal ratchet holds the bar in CI.

Authoritative source: `packages/testing-framework/baselines/multilingual-priority.json`
(its `timestamp` + `commit` fields stamp each regen). 24 langs × 154 patterns = 3696.

| Signal                         | Value                  | Notes                                                                                                                          |
| ------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| parse rate                     | **3696 / 3696 (100%)** | zero hard fails, holding                                                                                                       |
| degenerate passes (fid < 0.5)  | **0**                  | band cleared (#492/#493), holding                                                                                              |
| lossy passes (0.5 ≤ fid < 1.0) | **0**                  | band cleared (#495–#506), holding                                                                                              |
| faithful (fid = 1.0)           | **3696**               | every parsing pattern is faithful                                                                                              |
| avgFidelity (R0-recall)        | **1.000**              | saturated                                                                                                                      |
| avgPrecision (R0 trust floor)  | **0.9997**             | bar 3 reached L4 (0.9953); L7 → 0.9963; R3/R1 arcs → 0.9997 (min 0.9978)                                                       |
| avgMultisetRecall (R0 dupes)   | **1.000**              | signal added #632; last sub-1.0 row (qu behavior-resizable) cleared by #638's SOV if-seam work                                 |
| avgRoleFidelity (R1)           | **0.9919**             | bar 4 reached session 13 (0.9862); #637/#638 → 0.9919. SOV six now ≥ 0.9907 — lowest langs are th 0.9845 / ms / de / fr        |
| avgValueRecall (R3)            | **0.9967**             | signal added #634; F1–F8 burned down #635; residual = swap F6 wontfix + triaged rows (min 0.9906)                              |
| avgExecutionFidelity (R2)      | **1.000**              | 47-pattern curated subset fully reproduces en DOM effects                                                                      |

The eight-signal ratchet gate is fully wired (parse-rate · degenerate · R0-recall ·
R0-precision · R0-multiset-recall · R1 · R2 · R3) — see CLAUDE.md "Multilingual
parse rate ≠ fidelity".
**The launch bar is complete (all four items) — remaining fidelity work is the
post-launch track below.**

## LAUNCH BAR (adopted 2026-07-06, post session 8)

Target for the publicized launch — **not** R1 = 1.0 (that tail is asymptotic;
the SOV-six role-typing subtleties past this bar are invisible in demos and
normal usage). The bar, all four together:

1. **All en-facing parser gaps closed.** Every remaining en-noise inversion is
   a real English-parser bug (en `go back` / `add "content"` didn't parse
   until #588/#589) — user-visible to English users regardless of the metric.
2. **Every spurious family larger than ×5 cleared** — **REACHED session 14 (L7).**
   Full burn-down: ~~morph ×18~~ ✓L1, ~~for ×14~~ (transition half ✓L2;
   take-class ×6 ✓L7; residual wait-payload ×3 is <×5, post-launch),
   ~~add ×11 draggable~~ ✓L1, ~~default ×9~~ ✓L4 (+before ×1 qu bonus),
   ~~empty ×8~~ ✓L6, ~~call ×7~~ ✓L3, ~~on ×7 he~~ ✓L3, ~~transition ×6~~
   ✓L2, ~~breakpoint ×6~~ ✓L2 (+halt ×3 sibling). **Remaining: none.**
3. **avgPrecision ≥ 0.995** — **REACHED session 12: 0.9953.** The six-signal
   gate holds it from here.
4. **avgRoleFidelity ≥ 0.985** — **REACHED session 13: 0.9862.** The canonical
   `@attr` typing drill cleared add.patient ×18 + toggle.patient ×19 +
   set.destination ×7 in one step (44 entries, all three families were the
   same slot-dependent type divergence). The remaining big families
   (fetch.source:literal ×18, set.patient:literal ×16,
   bind.source:property-path ×14, render.style ×12) are now post-launch
   polish — the gate holds the bar from here.

Estimated **4–6 sessions** at the observed velocity (~30 A/B entries/session
across sessions 4–8, full discipline included). Sequencing:

| Session | Clusters                                                             | Bar signals moved         |
| ------- | -------------------------------------------------------------------- | ------------------------- |
| L1 ✓    | morph ×18 + draggable add fold+cleanup ×11 (#590 + session-9 PR 2)   | precision 0.9891 → 0.9910 |
| L2 ✓    | breakpoint ×6+halt ×3 + bn `for` transition-half ×5 + transition ×6  | precision 0.9910 → 0.9928 |
| L3 ✓    | on ×7 he/hi (#595) + call ×7 halt-verb-guard (session-11 PR 2)       | precision 0.9928 → 0.9939 |
| L4 ✓    | default-value full drill (24 langs: schema markers + \_-fold)        | precision 0.9939 → 0.9953 |
| L5 ✓    | canonical @attr typing (add/toggle patient + set.destination, ×44)   | R1 0.9838 → 0.9862        |
| L6 ✓    | empty ×8 both-sides drill (+hi add ×2 role-steal; same session)      | precision 0.9953 → 0.9957 |
| L7 ✓    | take-class for ×6: loop-head guard + bn marker — **BAR COMPLETE**    | precision 0.9957 → 0.9963 |

L1 actual precision movement (+0.0019 for 29 entries) ran well under the
table's ~0.997 sketch — the remaining seven >×5 families plus the tail carry
more of the gap than estimated; expect the ≥0.995 bar to need L2 AND L3 (and
possibly part of L4) rather than L1+L2 alone. L2 actual: +0.0018 for 20
entries (#592, #593, session-10 PR 3) — on the same slope; after L2 the
remaining >×5 inventory is default ×9, for ×9 (two sub-arcs, see bar item 2),
empty ×8, call ×7, on ×7 he, so L3+L4 must carry ~0.0022 to reach 0.995.
L3 actual: +0.0011 for 14 spurious + 10 missing entries cleared (#595 +
session-11 PR 2) — remaining >×5 inventory is default ×9 (en-noise inversion,
the L4 drill), for ×9, empty ×8, so L4 must carry ~0.0011 to reach 0.995.
L4 actual: +0.0014 for 10 spurious cleared (default ×9 + the qu before ×1
bonus from the ñawpaq_kaq underscore fold) — **the ≥0.995 bar is reached**;
remaining >×5 inventory is for ×9 and empty ×8 (bar item 2), and L5–L6 carry
the R1 bar (0.9838 → ≥0.985).
L5 actual: **+0.0024 for 44 R1-missing entries cleared in ONE parser-side
step** (the pre-probed add ×20 / toggle ×19 opposite-direction asymmetry was
indeed one root cause — slot-dependent `@attr` typing — and set.destination ×7
was the same bug in a third family; the two hi add entries that remain belong
to the empty-arc role steal). Zero honest dips, zero new A/B entries, census
identical — **the ≥0.985 R1 bar is reached**. Remaining launch work is bar
item 2 only: empty ×8 (transformer-side, pre-probed session 12) + for ×9
(take-class ×6 own-arc; wait-payload ×3 post-launch).
L6 actual (same session, PR 2): **empty ×8 + the hi add.patient ×2 role-steal
cleared in one both-sides drill** — precision 0.9953 → 0.9957, R1 0.9862 →
0.9863, zero new A/B entries (a qu ripple was caught by the A/B discipline and
fixed in the same increment: the healed render order let the shattering
`ch_usaq` fuse with `.error`; dict now emits the fused `chusaq` + qu kanqa
joined the surface-copula set). Remaining launch work: for ×9's take-class ×6
own-arc ONLY.
L7 actual (session 14, one drill): **take-class spurious for ×6 cleared,
i18n-side only** — precision 0.9957 → 0.9963, R1 0.9863 held, zero new A/B
entries (the full-corpus A/B diff was surgical: spurious `for` ×9 → ×3, no
other line changed). The splitter's `for` boundary was the root: hyperscript's
only statement-head `for` is `for <var> in <iterable>`, so a `for` with no
following `in` (take's `for me` target) now stays in-clause (isLoopHeadFor);
bn additionally needed its duration marker জন্য (which doubles as bn's `for`
loop keyword) suppressed for pronoun values in insertMarkers. No parse-side
change needed — with the phrase in-clause, all 24 take-parses align with en.
**With this, every spurious family >×5 is cleared: THE LAUNCH BAR IS
COMPLETE.**

**Post-launch track (ratchet-protected, not launch-blocking):** wait-payload
spurious for ×3 (bn draggable/sortable/resizable — the unconsumed or-run
payload), tr remove.patient block-walk leak, wait-line param leak ja,
language-grammar.ts drift guard, and the two standing R1 deferrals (pick
range-role modeling — Family F below; the reactive on.event rows). The
R1-arc Family D deferrals (event-debounce `${}` URL truncation,
form-submit-prevent fused-clause scramble, focus-trap condition-boundary
leak) and the qu-only tail were cleared by the R1 deferred-tail arc
(2026-07-11b, below); the SOV-six role polish and the R1 long tail
(fetch/render.style, qu set, or-run wait, beep/js/go/scroll/log/for) by the
R1 arc (2026-07-11, below). The eight-signal gate holds the bar — regressions
fail CI.

> **Update 2026-07-11b (R1 deferred-tail arc, branch `fix/r1-deferred-tail`
> — HANDOFF_r1-deferred-tail.md RESOLVED):** avgRoleFidelity ja 0.9938 →
> **0.9978**, bn 0.9938 / tr 0.9927 → **0.9962**, ko 0.9905 → **0.9946**,
> qu 0.9792 → **0.9936**, hi 0.9883 → **0.9907**. Four increments, sweeps
> green after each (parse 3696/3696, R2 1.0, R3 loss only swap-content F6),
> baseline regenerated + audited per increment:
>
> - **Family E (en-side, event-debounce ×6):** the URL extractor now carries
>   `${…}` interpolation spans whole (balanced braces; unclosed `${` keeps
>   the legacy whitespace cut), un-truncating the en reference. The en
>   enrichment exposed two masked co-causes, fixed in-increment: the SOV
>   `debounced at 300ms` head left `at 300ms` junk in the clause
>   (untranslated `at` tokenizes identifier — extractStandaloneModifiers now
>   skips one identifier preposition before a duration literal), and fused
>   matches captured native event words registered only in
>   eventNameTranslations as raw expressions (buildEventHandler now
>   canonicalizes an exact table hit to the English literal; tr additionally
>   registers boyutlandırma/kaydırma tokenizer keywords).
> - **Family H (render-side, form-submit-prevent ×6 + tr call):**
>   sovHaltCallFusedRule (shared factory, per-SOV-profile constants) splits
>   the swept `halt <operand> call <args>` patient blob at the language's
>   call verb and emits both commands verb-final joined by the
>   then-connective. halt.patient:reference everywhere; row confidence
>   0.5 → 1.0.
> - **Family G (two-sided, focus-trap ja/ko/qu):** transformBlockBody emits
>   the then-connective at the if-condition/branch seam (gated: SOV target +
>   positional-headed branch + no existing then), and ja/ko/qu register
>   their containment word (の中/안에/ukupi) as a whole keyword→`in` token —
>   split, the fragments broke the generated focus pattern's operand run,
>   and qu's stranded `pi` mis-read as the event marker. Bonus: the whole
>   ukupi realigned qu last-in-collection (scroll.destination).
> - **qu tail (5 rows):** single-quoted strings classify literal
>   (put.patient ×2, byte-identical to en); toggle-qu-patient-first-dest
>   covers the #636 verb-final render order (toggle-aria destination
>   byte-identical to en); go-qu-url-dest re-types the fronted `url "/page"`
>   pair as expression via ExtractionRule.transform — a documented field
>   that was never wired, now honored in applyExtractionRules; interior `_`
>   allowed in the qu keyword extractor's longest-first scan (gated to exact
>   entries) so the dict's k_iri/hatun_kay compounds tokenize whole —
>   window-resize now parses on.event:literal=resize + a clean
>   call.patient:expression (the junk source/destination roles are gone).
>
> **Deferred, with reasons (the standing R1 tail):**
>
> - **pick-text-range (Family F, all six):** the en reference itself is
>   degenerate (`pick.patient:expression="characters"` — the first WORD;
>   pickSchema models no range/source roles), so chasing SOV parity buys
>   nothing. The proper fix (pickSchema range roles + transformer render +
>   SOV pattern variants) RAISES the en denominator for all 24 languages —
>   the most expensive row in the tail for ×6 misses. Take it only if pick
>   matters for a demo; budget the full 24-language realignment.
> - **Reactive on.event rows (hi/ko when-value-changes +
>   when-multiple-changes, hi window-resize, qu announce-screen-reader +
>   on-custom-event-receive):** event-anchor guard machinery — the hottest
>   parser path; unchanged out-of-scope decision. (hi window-resize is the
>   आकार_बदलें `_`-split + बदलें→toggle homonym; the tr boyutlandırma
>   rename precedent applies if ever taken.)
> - **swap-content (bn/hi/qu/tr):** F6 wontfix, unchanged (§ R3 families
>   item 6).
>
> Residual per-language misses: ja 1 (pick) · bn/tr 2 (pick, swap) · ko 3
> (pick, on.event ×2) · qu 4 (pick, swap, on.event ×2) · hi 5 (pick, swap,
> on.event ×3).

> **Update 2026-07-11 (R1 role-fidelity arc, branch `fix/r1-role-fidelity-sov`
> — HANDOFF_r1-role-fidelity.md RESOLVED):** avgRoleFidelity qu 0.9522 →
> **0.9792**, ja/bn 0.9738 → **0.9938**, tr 0.9719 → **0.9927**, ko 0.9706 →
> **0.9905**, hi 0.9706 → **0.9883** — all arc targets (qu ≥ 0.97,
> ja/ko/tr ≥ 0.98) exceeded, stretch bn/hi included. Seven commits, gate
> green after each: `--triage-r1` preamble; Family A (trailing SOV
> with-options blob reclaimed as fetch/render style — the fused event
> patterns stranded it post-verb; + tr `ile` style marker); Family B (qu
> set oblique-`manta`-source pattern + the missing backtick branch in the qu
> string extractor — template literals shattered to ~12 fragments); Family C
> (tr/qu verb-final or-run wait patterns; first event → duration → the
> known-event relabel emits `event:literal`, en-parity); Family D ×4 (sigil
> refs + unconditional set patient↔destination marker swap in the fallback;
> fused `*-sov-simple` trailing-expression reclaim for js/go/scroll;
> optional-chaining `?`+`.prop` possessive fold — en type unchanged, full
> chain byte-identical across the six; verb-final `for-<lang>-sov-basic`
> binding heads). Key insight vs the handoff's hypothesis: most of the D
> tail was NOT a shared fallback-classifier root but fused-simple-pattern
> default-role drops (the Family A geometry) — fixed with reclaims/patterns,
> so no shared-classifier extraction is warranted.

Caveats: each en enrichment can mint honest-dip entries (bounded by the
census/A-B discipline; historically <1 session total), and this scopes the
fidelity grind only — docs/demo/npm-publish polish is separate scope.

> **Update 2026-07-06j (SESSION 14 = L7, one drill: take-class spurious for
> ×6 in this PR; avgPrecision 0.9957 → 0.9963; avgRoleFidelity 0.9863 held;
> A/B surgical — spurious for ×9 → ×3, zero other changes, zero new entries;
> census identical (3404); gate green; baseline regenerated. THE LAUNCH BAR
> IS COMPLETE.)**
>
> - **The shatter was `splitOnCommandBoundaries`, probed on both sides as
>   planned.** `for` is a command keyword (the loop), so the splitter cut
>   `take .active from .tab-button for me` at `for` and the join re-inserted
>   `then` — a dangling `then for me` clause in ALL 23 non-en renders, which
>   six SOV languages (bn/hi/ja/ko/qu/tr) then parsed as a spurious `for`
>   loop with patient "me" (the other 17 parsed it as inert junk). en itself
>   drops the `for me` phrase at the role level (takeSchema has no
>   target/beneficiary role) — that stays post-launch; aligning the 23 to
>   en's [on,take] multiset needed no en change, so no both-directions en
>   A/B was minted.
> - **The fix is the loop-head test:** hyperscript's only statement-head
>   `for` is `for <var> in <iterable>`, so a `for` with no `in` among the
>   tokens before the next command keyword is a role phrase (take's target,
>   a duration) and stays attached (`isLoopHeadFor`, source-locale-aware via
>   translateWord). Blast radius bounded by construction: `wait for X` and
>   `repeat for x in y` were already kept by the prev-token check, and real
>   loops satisfy the `in` test.
> - **bn needed one more step (the parse-side mirror surfaced render-side):**
>   bn is the only profile besides en with a `duration` role marker — জন্য,
>   which is ALSO bn's `for` loop keyword (deliberately findable by the SOV
>   verb-anchoring fallback for real loops). With the phrase in-clause, en's
>   `for`→duration lexical mapping made bn render `আমি জন্য`, re-minting the
>   spurious `for`. `insertMarkers` now suppresses a duration marker for
>   pronoun values (me/you/it — never time expressions), mirroring its
>   selector-shaped-event guard. `wait for transitionend` (`transitionend
>   জন্য`) and real durations (`300ms জন্য`) keep their marker.
> - qu bonus: with the phrase attached, qu's take parse now captures
>   destination=reference:"me" — the only language to capture the take
>   target at all (extra role, no A/B entry; semantically the most faithful).
> - 6 guards (4 stash-verified fails-without-fix + 2 both-ways negatives:
>   real bn loop keeps জন্য + then-split; wait/duration markers untouched).
>   i18n 924 tests green, typecheck clean.
> - **Launch-bar postscript: all four items reached and gate-held.** The
>   residual spurious `for` ×3 (wait-payload behaviors bn ×3) is below the
>   ×5 threshold and is the post-launch or-run payload arc, not this
>   mechanism.

> **Update 2026-07-06i (SESSION 13 = L6, drill 2 in the same session: the
> empty ×8 both-sides drill in this PR; avgPrecision 0.9953 → 0.9957;
> avgRoleFidelity 0.9862 → 0.9863 (the hi add ×2 role-steal rode along); A/B
> 10 cleared (8 spurious empty + 2 missing) / 0 new; census identical (3404);
> gate green; baseline regenerated.)**
>
> - **The displacement was the transformer's condition/body scan, exactly as
>   pre-probed — `empty` is itself a hyperscript command (v0.9.90).** The
>   body-start scans (`transformBlockBody` + `extractBlockStructure`'s unless
>   path) cut `if my value is empty add .error to me` at the first command
>   keyword — `empty`, right after the copula — so the adjective landed in the
>   add's argument zone. The fix is a shared copula guard
>   (`isPredicateAdjectivePosition`): a command-keyword candidate immediately
>   after a copula is a predicate adjective, never the body's first verb. The
>   healed SOV renders also reorder the then-branch correctly now (hi
>   `.error को जोड़ें` patient-first, was verb-first junk).
> - **The parse side needed the mirror: the SOV verb-lookup exception (built
>   for ko's old DISPLACED renders) re-split the healed `<copula> <predicate>`
>   adjacency** because खाली/boş/খালি double as the language's empty/null
>   COMMAND verb. `CONDITION_PREDICATES` is now excluded from that exception —
>   this alone also cleared behavior-sortable hi/tr (`if item is null` renders
>   condition-final खाली; null and empty share the word), which never needed a
>   render change. ko's real-verb-after-copula case still splits (locked by
>   test).
> - **qu ripple caught by the zero-new-entries A/B discipline:** the healed
>   order put qu's `ch_usaq` right before `.error`, and its tokenizer's
>   by-design `_` split let the `usaq` shard fuse into the add's patient
>   (`expression:"usaq.error"` — 2 NEW entries). Dict now emits the fused
>   `chusaq` (the qu tokenizer already recognized it, norm `null` — the #535
>   fused-forms route), and qu `kanqa` joined `CONDITION_COPULAS_SURFACE`
>   (the bn হয় / hi है / tr dir mechanism). Final A/B: zero new entries.
> - 13 guards across the two sides (6 i18n incl. a both-ways negative; 7
>   semantic incl. the ko displaced-verb lock), all stash-verified.
> - **Remaining launch-bar work (item 2): for ×9's take-class ×6 own-arc
>   only** — probe BOTH transformer and parse sides first; wait-payload
>   behaviors ×3 stay post-launch.

> **Update 2026-07-06h (SESSION 13 = L5, one drill: canonical `@attr` typing
> in the shared value-builder; avgRoleFidelity 0.9838 → 0.9862 — LAUNCH BAR
> item 4 (≥0.985) REACHED; avgPrecision 0.9953 held; A/B 44 missing cleared /
> 0 new; census identical (3404); gate green incl. R2; baseline regenerated.)**
>
> - **The add ×20 / toggle ×19 opposite-direction asymmetry was ONE bug, and
>   set.destination ×7 was its third face.** `@attr` tokens (kind
>   `identifier`) were typed per-slot: a slot whose expectedTypes included
>   `selector` hit the pattern-matcher's @→selector conversion; a LAX slot (no
>   expectedTypes — the generated event-role slots, and toggle-en-full's
>   patient) fell to the identifier→expression fall-through. Same token,
>   different type depending on which pattern captured it: add `@disabled`
>   en=selector / 18 langs=expression, toggle `@aria-expanded` the exact
>   opposite, set-attribute `@disabled` destination diverged ar/bn/hi/ja/ko/
>   tl/tr. The fix is ONE canonical rule in the shared value-builder
>   (`tokenToSemanticValue`): an `@`-prefixed identifier is ALWAYS a selector
>   (mirrors semantic-parser's own value path and the css-selector extractor).
>   The old conversion block is deleted; slots that expect only
>   `['reference','expression']` (bind's destination) still capture an @attr —
>   as the canonical selector — via a narrow @-gated compatibility rule in the
>   strict expectedTypes check. All 24 languages now byte-identical on
>   form-disable-on-submit, accordion-toggle, toggle-aria-expanded,
>   toggle-visibility, and set-attribute. 5 guards (3 stash-verified flips +
>   2 both-ways); 1 existing hi set-attribute test updated to the canonical
>   shape (was locked to the `.raw` expression reading).
> - **Not taken (post-launch tail):** add.destination:selector ×4 (bn/hi/ja/ko
>   — the SOV renders keep the en-ish `<button/> in me` phrase and the slot
>   captures the `me` adjacent to the destination particle; the bar is already
>   exceeded without it). toggle.destination ×2 (qu/th simple patterns drop
>   the destination). The remaining big R1 families (fetch ×18 two sub-arcs,
>   set.patient:literal ×16, bind ×14, render.style ×12) keep their own-arc
>   notes in the session-12 block below.
> - **Remaining launch work: bar item 2 only** — empty ×8 (bn/hi/tr,
>   transformer-side, pre-probed session 12 — see the L5 paragraph of the
>   handoff doc) + for ×9's take-class ×6 own-arc.

> **Update 2026-07-06g (SESSION 12 = L4, one drill: the default-value full
> drill in this PR; avgPrecision 0.9939 → 0.9953 — LAUNCH BAR item 3 (≥0.995)
> REACHED; probe mean R1 0.9838 held; A/B 10 spurious cleared / 0 new; census
> identical (3404); gate green; baseline regenerated.)**
>
> - **The default ×9 en-noise inversion cleared with all 24 languages aligned
>   in one step.** Three mechanisms, exactly as pre-probed: (1)
>   `defaultSchema.destination` admitted only `reference` — now the full
>   set-parallel list (selector/reference/expression/property-path, opting in
>   the possessive matchers) plus a complete 24-language markerOverride table
>   on BOTH roles (dict-driven: default renders de `zu` where set uses `auf`,
>   sw `kwa` vs `kwenye`; SOV destination markers ja を / ko 를 / tr i / hi को
>   mirror set's). en went from dropping the action (the wrong reference) to
>   `destination=property-path{me,@data-count} patient=literal:"0"`, and every
>   language matched byte-identically — zero honest dips, zero new A/B
>   entries. (2) ru/uk NULLed because their tokenizers split `_` by design
>   (по_умолчанию → по/_/умолчанию): the #592 hyphen-compound fold is now a
>   general shattered-compound fold (`tryMatchShatteredCompound`, seps `-` and
>   `_`, particle segments accepted — ru по / uk за lead their compounds). (3)
>   two profile↔dict keyword mismatches: qu default primary realigned to the
>   dict render `ñawpaq_kaq` (qallariy kept as alternative — NB the qu dict
>   uses qallariy for RESET), sw gained the bare `msingi` dict render. The qu
>   fix also cleared **spurious before ×1** (the ñawpaq shard read as
>   "first/before") — the drill's bonus entry. 9 guard tests (8
>   stash-verified); the lexicon-emit-mismatch allowlist self-flagged its two
>   now-parsing entries and was pruned.
> - **empty ×8 pre-probed for L5 (bn/hi/tr — transformer-side CONFIRMED):**
>   the SOV reorder DISPLACES the `is empty` predicate adjective into the
>   following command's argument zone — hi input-validation renders
>   `अगर मेरा मान है जोड़ें .error को खाली मैं में` (खाली after the add
>   patient; bn খালি / tr boş identical). Parse side: the displaced adjective
>   anchors `empty-{lang}-generated` AND STEALS a neighboring role (hi
>   patient=selector:".error" — the add's patient; bn/tr patient=reference:
>   "me"). The fix must be transformer-side (keep the predicate adjective
>   inside the condition clause when reordering); the parse side then needs
>   re-probing against the NEW renders + repopulate. behavior-sortable hi/tr
>   is the same mechanism inside a behavior body.
> - Remaining bar work: item 2 (for ×9 = take-class ×6 own-arc + wait-payload
>   behaviors ×3; empty ×8 above) and item 4 (R1 0.9838 → ≥0.985 via the big
>   R1-missing families). **Top-three R1 families pre-probed at session-12
>   close:** add ×20 and toggle ×19 are the SAME root cause in opposite
>   directions — `@attribute` type inference diverges between en's patterns
>   and the lax generated event-role slots (add `@disabled`: en=selector /
>   others=expression; toggle `@aria-expanded`: en=expression /
>   others=selector). One canonical `@attr` typing in the shared
>   value-builder could clear both (≈0.0012 R1 = the whole bar-4 gap); it
>   changes the en reference, so budget both-sides A/B + R2. The add SOV trio
>   (hi/ja/ko) also mis-captures destination (`reference:"me"` vs
>   `selector:"<button/>"`). fetch ×18 is two unrelated sub-arcs:
>   event-debounce is a template-literal shatter (`${my value}` breaks at the
>   space; en itself keeps a TRUNCATED source — an R0-invisible en value bug)
>   and fetch-with-\* pl/ru/uk ×12 mis-roles the with-tail (URL→patient,
>   source="method" junk — the #595 with-phrase family). Full detail in the
>   handoff doc.

> **Update 2026-07-06f (SESSION 11 = L3, two drills: #595 and this PR;
> avgPrecision 0.9928 → 0.9939, probe mean R1 0.9831 → 0.9838; A/B 14
> spurious and 10 missing cleared / 0 new across the two; census identical
> (3404); gate green; baseline regenerated per-PR.)**
>
> - **#595 — spurious on ×7 (he ×6 + hi ×1, two mechanisms as pre-probed).**
>   he: עם is the WITH/style marker but was ALSO an event alternative in five
>   places (event-he-when, keywords.on, eventHandler.keyword, eventMarker,
>   temporalMarkers) — the unconsumed with-tail after fetch-he/render-he
>   anchored a phantom second handler. עם removed from every event-anchoring
>   site; the tail now drops exactly like en's. Bonus: he render reclaims the
>   stolen `style` role (missing render.style ×14→×12). hi (install-behavior):
>   event-hi-bare grabbed the leading `Draggable` as the event and the SOV
>   verb-anchoring fallback fabricated a junk install body — the existing
>   bare-event guard's command PEEK extended from `reference` to non-event
>   `expression` leads; window-resize/worker-basic hi (junk renders that parse
>   ONLY via the bare anchor) stay byte-identical, census intact.
> - **PR 2 — spurious call ×7 was en-noise ×17-wide (bar item 1).** halt's
>   optional trailing patient swallowed the juxtaposed next verb
>   (`… halt call saveDocument()` → patient=literal:"call") in en AND 16 SVO
>   languages; the SOV seven split verb-first and kept call. New
>   pattern-matcher guard: a TRAILING optional role slot (nextPatternToken
>   undefined, threaded through groups) never captures a keyword whose
>   normalized form is a registered command action. All 24 languages now
>   capture call with the identical patient=expression:"saveDocument()" —
>   zero honest dips. The FINAL-slot scoping is load-bearing: an earlier
>   unscoped draft let ja's no-goal transition variant complete sloppily
>   (mid-pattern duration/style slots must capture-and-FAIL so the
>   verb-anchoring fallback reclaims goal+duration — locked by test).
> - **L4 pre-probed (default ×9 = an en-noise INVERSION, bar item 1):** en
>   itself parses `on load default my @data-count to "0"` WITHOUT the default
>   action (reference wrong); ar/bn/hi/it/ja/ko/th/tl/tr keep it but with
>   misaligned junk roles (ja/ko fused possessive patient=literal:"私の@data-count"
>   destination=literal:"0"; ar destination=property-path:"undefined"; it via
>   event-handler-it-full, roleless). The en enrichment (possessive +
>   property-path + to-marker) must land WITH the nine's role alignment — the
>   in-code NOTE at defaultSchema.destination stands, ~2 roles × 9 langs of
>   honest dips if en-only.
> - **morph-with-template missing ×7 re-probed post-he-drill (now ×12 across
>   render-template-with-data + morph-with-template, six SOV langs):** en's
>   style capture is real but value-truncated (`style=expression:"row"` — the
>   param NAME; `$data` dropped, a value bug invisible to R0/R1). The six need
>   to GAIN style:expression (SOV with-phrase capture), NOT en losing it —
>   en-side removal would delete genuine template-param info. L4+ scope.
> - **Hygiene flag:** `packages/semantic/src/parser/generated/language-grammar.ts`
>   is ~890 lines stale vs current profiles (regeneration produces real new
>   keyword entries; no CI drift guard exists). Deliberately NOT folded into
>   the L3 PRs (עם stays in the map either way — zero semantic overlap);
>   regenerate in its own increment, ideally with a drift guard.

> **Update 2026-07-06e (SESSION 10 = L2, three drills across #592, #593 and
> this PR; avgPrecision 0.9910 → 0.9928, probe mean R1 0.9831 held; A/B 20
> spurious cleared / 0 new across the three; census identical (3404); gate
> green; baseline regenerated per-PR.)**
>
> - **#592 — breakpoint ×6 + halt ×3 (en-noise, the #582 exit precedent as
>   diagnosed, plus a tokenization seam).** Roleless breakpointSchema
>   generated NO pattern (getDefinedSchemas filters zero-role schemas) →
>   `bareKeyword: true`. But the pre-probe showed the ms/sw/vi halt sibling is
>   a HYPHEN-COMPOUND shatter: tokenizers split `titik-henti` into word/-/word
>   and the tail word IS their halt primary (henti/simama/dừng) → spurious
>   halt via halt-\*-generated. Three aligned pieces rode along so en's
>   enrichment minted zero missing entries: a matchLiteralToken hyphen-run
>   fold (joins the run against hyphen-bearing expected keywords — 13
>   languages' breakpoint words are compounds); a matchRoleToken {action}-slot
>   fold (it's event-handler-it-full captures the verb as ONE token; shattered
>   `punto-interruzione` left a junk `punto` action); and
>   generateEventHandlerPatterns now SKIPS roleless schemas (every fused shape
>   hardwires a required patient — fusing swallowed the `then` connective as
>   junk patient). he profile got the en-loanword `breakpoint` alternative
>   (its i18n dict has no entry; the transformer passes en through).
> - **#593 — bn `for` transition-half ×5 (bn-side, as diagnosed).** bn renders
>   `over 300ms` as `300ms জন্য` and জন্য is ALSO bn's for-keyword; the
>   duration reclaim consumed the literal but left the postposition → phantom
>   roleless `for` in the compound split. consumeForPostposition (factored
>   from the wait-for reclaim's identical inline code) now runs after the
>   duration reclaim; parseBodyWithGrammarPatterns gained the zero-role
>   phantom-`for` drop parseBodyWithClauses already had (slide-toggle's body
>   walks the fused toggle head's path). Remaining for ×9 = take-class ×6
>   (en drops the `for me` phrase — en-facing gap — AND the transformer
>   renders it as a separate then-clause; own arc) and
>   draggable/sortable/resizable bn ×3 (wait-or payload leak, post-launch).
> - **PR 3 — transition ×6 (en-noise; NOT the feared splitter arc).**
>   slide-toggle's `transition *max-height over 300ms` was PARSE NULL in en
>   ISOLATION — no juxtaposition gap at all: the generated pattern requires
>   the `to {goal}` phrase this goal-less (valid) form omits. Making goal
>   optional is the documented skippable-group re-binding regression (schema
>   NOTE, do-not-repeat) — instead a new schema field `omitRoleVariants`
>   generates a SEPARATE lower-priority variant with the role omitted
>   entirely (no skippable group to re-bind). 18 languages now parse it via
>   transition-\*-generated-no-goal; the SOV six keep their lax captures;
>   fillSchemaDefaults aligns the destination default. Goal-ful forms locked
>   (en + es marker-language guard tests).
>   #590 morph ×18 role-layout swap and the draggable add ×11 brace-fold drill
>   in the session's second PR; avgPrecision 0.9891 → 0.9910, probe mean R1
>   0.9829 → 0.9831; A/B 29 spurious cleared / 0 new; census identical (3404);
>   gate green; baselines regenerated per-PR.)\*\*
> - **#590 — morph ×18.** en `morph #list to it` NULL in isolation (content
>   slot rejected `reference`) — but the schema ALSO carried its roles swapped
>   vs the i18n transformer's marking (element=patient を/를/i,
>   content=destination に/에/e — the SOV-lax captures follow the markers), so
>   admission-without-swap would have flipped spurious ×18 → missing ×36.
>   Swap + admission enriched en + 17 generated-path languages together;
>   morphMapper realigned (it executed element/content transposed);
>   a normalizeCommandRoles retype aligns the lax five's fused
>   positional+tag patient. Two downstream schema mirrors flagged by their
>   own drift guards in CI (both fixed in-PR): i18n COMMAND_PRIMARY_ROLES
>   (morph entry dropped) and hyperscript-adapter's generated syntax-table
>   (regenerated).
> - **draggable add ×11 (PR 2).** The brace-run fold
>   (`tryMatchBraceRunLiteral`): a depth-balanced `{ … }` identifier run folds
>   to ONE literal (nested `${…}` handled; `.{cls}` is one selector token —
>   locked). Fires for literal-accepting roles AND no-expectedTypes roles (the
>   handcrafted add-\*-full patient captured a lone `{`). The fold re-routed
>   ja/tr/bn/hi/qu onto their generated patterns — the feared SOV junk-role
>   cleanup shrank to ONE piece: ko 에서 removed from profile-wide destination
>   alternatives (it is the SOURCE primary; the wait-line tail `문서 에서`
>   satisfied add's destination group), with toggle's locative destination
>   keeping it per-command via #588 markerVariants (ko-idioms suite caught
>   the over-removal).
> - **L2 pre-probed — all en-noise:** bn জন্য (duration marker = for-loop
>   keyword) spawns phantom roleless `for` ×14; slide-toggle en drops the
>   juxtaposed no-`then` trailing transition ×6; breakpoint-command en drops
>   the roleless bare `breakpoint` (the #582 exit-bareKeyword precedent)
>   ×6 + the ms/sw/vi halt ×3 sibling. Full notes in the handoff session-9
>   block.

> **Update 2026-07-06c (SESSION 8: two spurious en-noise drills — #588 go ×21
> and the add repeat-times ×11 drill in #589; avgPrecision 0.9851 → 0.9891,
> probe mean R1 0.9829 held; A/B 32 spurious cleared / 0 new; census identical
> (3404); gate green throughout; baseline regenerated per-PR.)**
>
> - **#588 — go ×21 (en-noise, the pre-probe found THREE droppers).** The
>   go-en pattern required the `to` marker en's own render drops (`go back` —
>   PARSE NULL in isolation); he/zh dropped it too (the transformer marks
>   `back` with their PATIENT particle את/把 while go-url keeps על/到). Fix at
>   goSchema.destination: pattern-generator markerOverride branch honors
>   per-command `markerOptional` (en), default branch + extraction rules merge
>   per-command `markerVariants` as marker alternatives (he/zh) — the SOV
>   generators already did. All three enriched together, zero honest dips.
> - **add repeat-times ×11 (#589) — the "loop-body attachment" hypothesis
>   was WRONG.** en `add "hello" to me` is NULL in isolation — the patient
>   slot was selector-only and rejected every string literal (`repeat forever
toggle .pulse` composes fine, so the loop machinery was innocent).
>   addSchema.patient += 'literal' (transition/append precedent) enriched en +
>   12 generated-path languages together.
> - **Residue sharpened:** behavior-draggable add ×11 is a brace-run fold
>   (`{ left: ${…}px; }` shatters to ~12 identifier tokens; `.{cls}` is safe —
>   one selector token) that must land WITH the SOV junk-role cleanup (ja's
>   junk destination=`"draggable:move"` vs en's `me` default would flip
>   spurious ×11 into missing ×11). default ×9 needs the full per-language
>   drill: property-path admission fixes en only; the 13 dropping languages
>   fail on rendered markers + possessive folds (~26 honest dips if en-only —
>   in-code NOTE at defaultSchema.destination). morph ×18 untouched. Next up
>   otherwise: SOV halt ×6 (stretch), wait-line param leak (value-level).

> **Update 2026-07-06b (SESSION 7: the en remove.source drill + es/pt
> remove.patient gate — #586; probe mean R1 0.9825 → 0.9829, avgPrecision
> 0.9851 held; per-(lang,pattern) A/B 16 fixed / 0 new; parse-coverage census
> identical (3404); gate green; baseline regenerated.)**
>
> - **remove.source ×12 (en-noise, built as diagnosed).** The source slot
>   rejected the bare identifier (`item` types `expression`; slot expected
>   selector/reference) → `me` schema default. removeSchema source +=
>   'expression' enriched en AND the nine same-default languages together —
>   all 24 langs now capture `source:expression="item"`, zero honest dips.
>   Plus the bound-identifier literal→expression retype extended to `source`
>   (the SOV five typed `item` as bare literal).
> - **remove.patient es/pt — the mechanism was owner-first, not
>   property-first:** es/pt `de` is the profile POSSESSIVE marker (normalized
>   `source`), so tryMatchPossessiveSelectorExpression folded
>   `.{dragClass} de item` into a phantom property-path patient. New
>   marker-role collision gate, **deliberately source-only** — gating on any
>   declared role NULLed qu/tr bind patterns (qu `pa`/tr `ın` normalize
>   `destination`; caught by the coverage census, not the missing/spurious
>   A/B — a null parse just vanishes; census now part of the discipline).
> - **Residue sharpened:** tr remove.patient (`last .{dragClass}`) is a
>   block-walk leak — the repeat-block's `son` (tr `end`, ALSO positional
>   `last`; already in isEndKeyword) leaks into the next clause head. NOT a
>   keyword-set fix; a future walker arc.
> - **The four undrilled spurious families were all PROBED this session —
>   every one is an en-noise inversion (en drops the command; the flagged
>   languages parse it):** `go ×21` — en `go back` THROWS in isolation (the
>   go-en pattern requires the `to` marker; `go to top` parses); `default ×9`
>   — en `default my @data-count to "0"` THROWS in isolation (the en pattern
>   never matches the possessive+attr shape); `add ×22` — the one-line
>   `repeat 3 times add … to me` parses head-only in en (quantity+loopType,
>   body dropped; repeat-times + behavior-draggable); `morph ×18` — en drops
>   the then-chained `morph #target to it` after `render … with row: $data`
>   (the SOV six keep it; en's render also grabs a `style` role ja lacks —
>   check the with-phrase when drilling). Four separate en-side fixes; each
>   will need the who-passes-via-what pre-probe before enriching en (the
>   session-7 lesson: same-schema languages can enrich together). Next up
>   otherwise: SOV halt ×6 (stretch), wait-line param leak (value-level).

> **Update 2026-07-06 (SESSION 6: the two planned behavior drills — #583
> then-boundary if fold + #584 event-head param-phrase; probe mean R1 0.9825,
> baseline avgPrecision 0.9851; per-(lang,pattern) A/B 12 fixed / 0 new across
> both; gate green throughout; baselines regenerated per-PR.)**
>
> - **#583 — then-boundary if fold (behavior-resizable en-noise).** A
>   mid-clause `if … then … end` block was split at its `then` CONJUNCTION by
>   parseBodyWithClauses: the if-head landed clause-final (fold nulls, flat if
>   truncates the condition), the branch became the next clause, and the owed
>   `end` desynced the walk — en broke at the 3rd of 4 clamp ifs and dropped
>   everything after. Opener-KIND stack: while an `if` is open mid-clause, a
>   conjunction is block content, so the whole block reaches the #576 fold.
>   bn's spurious set/trigger/if flags at resizable were en deficits —
>   the fourth consecutive en-noise inversion.
> - **#584 — event-head param-phrase (behavior-sortable).** `pointerdown(clientY)`
>   tokenizes as 4+ tokens, so the SOV event-marker check never fired; the `)`
>   anchored as the event and the leaked keyword-led `私 から` run killed the
>   handler set (and unbound `item` broke add.destination). Fixed at the HEAD:
>   param-phrase consumption (→ parameterNames), WAITABLE_EVENT_WORDS
>   recognition (guarded: after the `event` KEYWORD it's a loop payload),
>   rendered-`from me` pair stripping (trailing + qu fronted; new hi source
>   markers), fused method-call paren folding (`target.closest("li")`), and a
>   `the`-skip before keyword-base property access. 9 entries fixed
>   (set.patient ×4 + add.destination ×5), 0 new.
> - **Residue sharpened (full detail in the handoff session-6 block):**
>   sortable `remove.source ×12` is EN-NOISE (en's source slot rejects the
>   bare `item` identifier and DEFAULTS to `reference:"me"` — schema default,
>   probed in isolation; fix en's slot, but first check which languages pass
>   via the same default); `remove.patient ×3` es/pt/tr is an
>   of-possessive/from-marker ambiguity (needs a schema gate, not a marker
>   change); the wait-line param leak (ja trigger.source junk literal) is the
>   body-side sibling of the #584 head fix — value-level only, invisible to
>   R0/R1.

> **Update 2026-07-05e (SESSION 5: the nested-behavior sub-parse drill — #582;
> probe mean R1 0.9812 → 0.9824, per-(lang,pattern) A/B 46 fixed / 0 new, gate
> green, baseline regenerated.)** Five aligned mechanisms at the behavior-body
> sub-parse seam — full detail in HANDOFF-r1-post-cluster-residue.md session-5
> block:
>
> - **`exit` bareKeyword** — roleless schemas generate NO pattern, so a
>   guard-clause `if item is null exit end` had an unparseable then-branch and
>   the fold rejected; the leftover predicate re-anchored as phantom `empty`
>   (behavior-sortable ar/id/sw/th ×4) and en itself dropped `exit` (bn/qu were
>   flagged "spurious exit" for parsing it correctly — en-noise again).
> - **ja/ko dict exit realign** 終了/종료 → profile primaries 退出/나가기 (the
>   historic exit/end collision words were inert identifiers when rendered).
> - **In-branch transition roles ×24 + qu standalone ×15** — verb-anchoring
>   path: destination→goal relabel (junk literal), patient literal→expression
>   retype, lone trailing TIME literal → duration reclaim.
> - **STRUCTURAL_NEVER_EVENT** — an event payload is never if/unless/else/end/
>   then (the SOV verb-first trigger swallowed the next clause's if-keyword).
> - **bn fold terminator** — শেষ (also bn positional `last`) now terminates
>   folds via normalized-form + selector-lookahead; bn conditionals no longer
>   swallow every trailing sibling.
> - **Residue sharpened:** behavior-sortable ja/ko `set` drop +
>   add.destination ×5 is an EVENT-HEAD param-phrase defect
>   (`pointerdown(clientY)` → event=")" + keyword-led `私 から` run discarded)
>   — needs an event-head fix, not body patching. hi/tr empty remainder is
>   transformer-side, unchanged.

> **Update 2026-07-05d (SESSION 4: the set/A2 drill + the spurious-`empty` copula
> drill — #580 + follow-up; probe mean R1 0.9778 → 0.9812, avgPrecision 0.984 →
> 0.9849; per-language A/B zero regressions across both; gate green throughout.)**
>
> - **#580 — set of-possessive + A2 operator-run assembly.** The re-probe re-scoped
>   the plan (the #579 lesson repeating): set-color-variable ×11 was an
>   of-possessive MARKER gap (10 genitive connectors invisible to the
>   normalized-form check; it/pl/ru/th/uk hand-crafted destination tokens missing
>   the property-path opt-in that set-es-full already had), plus a new Stage-2
>   SOV trailing-event guard (a position-0 command match must not swallow the
>   trailing event phrase). two-way-binding/computed-value DID need A2:
>   matchRoleToken assembles strictly-pairwise operator runs — which also fixed
>   the EN reference's own silent `+ my value` tail drop. 58 entries fixed;
>   ja/ko/tr/bn/hi +0.0084 R1 each.
> - **Copula drill — spurious `empty` ×28 → ×12, mechanism NOT inverted** (en was
>   right): 8 languages' rendered copulas tokenize as bare identifiers (fr est,
>   ru есть, pt é, uk є, tl ay, ms adalah, th เป็น) or normalize to another sense
>   (ar هو → `it`), so the condition split fired at the empty/null predicate,
>   which doubles as the empty COMMAND keyword → phantom `empty me`. New
>   CONDITION_COPULAS_SURFACE set, matched by surface value, gated to predicate
>   continuations so ar's pronoun reading still splits (`if it set …`).
> - **Residue (see HANDOFF-r1-post-cluster-residue.md session-4 block for
>   detail):** empty tr/hi/bn ×6 (transformer scrambles the predicate into the
>   then-branch) + behavior-sortable ×6 (nested behavior sub-parse); set/A2 qu
>   tail (mid-clause source phrase) + template-literal-list-build SOV six
>   (loop-body sub-parse vs enriched en); SOV halt ×6 re-probed and confirmed
>   (compound-level fronted-role re-association, untouched); NEW en-noise site:
>   behavior-resizable en drops an if + its 4 branch sets that bn now parses.

> **Update 2026-07-05c (SESSION 3: if.condition en-noise + the transition precision
> drill — #576 / #577; avgPrecision 0.976 → 0.984, every language up; probe mean R1
> 0.9771 → 0.9781 (#576) → 0.9768 (#577, reference-enrichment dip — see below); gate
> green throughout, invariants all holding.)**
>
> - **#576 — mid-clause if fold (if.condition ×14 en-noise).** parseClause now
>   mirrors the fused-body walker's fold hook: a flat-`if` matchBest result rewinds
>   and folds the whole `if … end` block via tryParseConditionalBlock, so the
>   condition captures as a full expression instead of truncating to its first token
>   (`if result is false` → `condition:reference="result"` was the en reference's
>   noise; translations were right all along). Collateral: focus-trap ko/qu,
>   behavior-removable js.patient ×6.
> - **#577 — transition family alignment (spurious ×66 → ×6, the largest precision
>   family, drilled for the first time).** The family was INVERTED: the "spurious"
>   languages parsed correctly; the en reference (and 8 more languages) dropped the
>   command. Five aligned fixes: schema patient admits expression+selector; goal
>   markerOverride table aligned to the i18n-rendered markers (11 languages);
>   sw `mpito` profile alternative; zh particle extractor now defers to longer
>   profile keywords (`过渡` was split by the aspect-particle `过` — cross-extractor
>   longest-match, a general fix); th/qu dict realignment to profile primaries
>   (เปลี่ยนผ่าน / pasay — the #569 precedent); #561-sibling trailing TIME-literal
>   reclaim for the SOV duration. 17 languages at full en role parity on the
>   transition patterns; zero-lossy verified action-level in all 24.
> - **R1-mean mechanics worth internalizing:** when a drill enriches the EN
>   reference (en now parses transition everywhere), mean R1 _dips_ until the
>   SOV tail matches the new entries — 0.9781 → 0.9768 here while precision
>   jumped +0.0076. Read precision and R1 together before judging a drill.
> - **Learned constraint (do not repeat):** making `transition.goal` optional to
>   catch the goal-less slide-toggle form clobbers goal+duration capture in every
>   marker language — the optional marker group lets the bare value re-bind by
>   particle metadata. The goal-less form stays residue.
> - **New residue from the drill:** slide-toggle goal-less spurious ×6 (SOV six);
>   transition.duration hi/qu (body sub-parse path, not the fused-event reclaim
>   site); behavior-removable transition roles bn/hi/ja/ko/qu/tr (nested behavior
>   sub-parse). Next targets otherwise unchanged: set/A2 cluster (~×46, largest R1
>   seam), SOV halt ×6 (fronted-role re-association), spurious `empty` ×28 /
>   `add` ×22 / `go` ×21 / `morph` ×18 / `default` ×9.

> **Update 2026-07-05 (R1 RESIDUAL TRIAGE FULLY HARVESTED + TWO RESIDUE SWEEPS — nine PRs
> #564–#569 / #571–#573 across three sessions; mean R1 0.9535 → 0.9771, every language up at every
> step, gate green throughout.)** The five-cluster triage in
> [HANDOFF-r1-residual.md](HANDOFF-r1-residual.md) landed in full, then its residue was swept via
> [HANDOFF-r1-post-cluster-residue.md](HANDOFF-r1-post-cluster-residue.md) — both handoffs carry
> per-PR status blocks with the A/B numbers and execution learnings; this is the index:
>
> - **#564 (cluster B)** — fetch `as json` responseType reclaim under fused SOV event patterns
>   (the trailing-role reclaim mechanism family: quantity #561 → responseType #564 → wait-event
>   #573).
> - **#565 (cluster A1)** — possessive render/parse symmetry: `getPossessiveReference` never read
>   `specialForms` render-side; inverted lookup + qu `chay`/`paq`. The set role-swap theory was NOT
>   needed — re-verify before applying it elsewhere. **A2 (expression-valued set patients) is still
>   open.**
> - **#566 (cluster C)** — event-anchor guard extended to fronted positional/possessive/
>   optional-chaining heads (the surviving hi tail of the #508 guard).
> - **#567 (cluster D)** — repeat loop-HEAD canonicalization for en + 23 langs: killed the en
>   reference's own `for-in` head noise (`event:literal="in"`/quantity). Biggest single-arc move:
>   mean 0.9555 → 0.9654, every language up.
> - **#568 (cluster E)** — the i18n transformer treats parenthesized expressions as opaque units in
>   grammar reorder (computed-value now renders intact in all 24 languages). Value-level fix —
>   R0/R1 flat by design (the known blind spot), the win is correct display text + R2 eligibility.
> - **#569 (residue item 1)** — sw as-marker is `kuwa`, not the if-homonym `kama`: the phantom-if
>   family cleared dict-side (sw avgPrecision 0.9855 → 0.9942).
> - **#572 (residue item 2)** — `foldFrontedWhileIntoRepeat`: the SOV fronted repeat-while head
>   merges into the repeat node; qu/tr while-keyword dict↔profile alignment. All six SOV languages
>   now match en role-for-role on repeat-while.
> - **#571 (residue item 3)** — en-reference noise sweep: for-body `add.destination` admits the
>   loop-binding expression (+ bound-identifier registry), `trigger` event names canonicalize to
>   `literal`. Diagnosed-but-deferred `wait for {event}` →
> - **#573 (residue sweep 2)** — send en-reference noise (destination dropped ×44, call-shaped
>   event truncated ×21), tell patient→destination relabel (×21), the full `wait for {event}` arc
>   (en head + WAITABLE_EVENT_WORDS relabel + SOV trailing reclaim + runtime `modifiers.for` — R2
>   honest), and the halt leaked-article verb-boundary (×74 → ×6, SOV exempt per §7y). Probe mean
>   0.9661 → 0.9771.
>
> **What's next** lives at the bottom of HANDOFF-r1-post-cluster-residue.md's status block: SOV
> halt ×6 (needs fronted-role re-association), `if.condition` ×14 (en drops the comparison — en
> noise), the set/A2 cluster (`set.destination:property-path` ×46 is the largest single family),
> behavior-sortable's nested-handler add.destination, and the untouched R0-precision spurious
> families (`transition` ×66, `empty` ×28, `add` ×22, `go` ×21, `morph` ×18).

> **Update 2026-07-04b (SOV LITERAL-ROLE-EXTRACTION ARC: COMPLETE — both R2 blockers fixed +
> joined; subset 45 → 47, R2 stays 1.0 in all 23 langs. #560 / #561 / #562.)** The arc planned in
> [HANDOFF-sov-literal-role-extraction.md](HANDOFF-sov-literal-role-extraction.md) landed in three
> stacked increments:
>
> 1. **`append-content` — body-clause marker lookup, event-clobber fix (#560).** The predicted
>    ko-works/ja-fails wedge was real and crisp: `buildMarkerToRoleLookup` let a later role's PRIMARY
>    marker overwrite an earlier role's entry, and every SOV profile's `event` roleMarker reuses a
>    value role's particle (ja `を`=patient, tr `i`=patient, bn `তে`=destination, ko `을`=patient). In
>    the Stage-3 SOV fallback the fronted content literal bound to a bogus `event` role and dropped at
>    runtime; **ko survived only because its corpus form uses the `를` ALTERNATIVE** (alternatives
>    never clobbered). Event markers now only fill gaps in that lookup (its single caller runs after
>    the event phrase is stripped, so an event binding there was never meaningful; qu's non-colliding
>    `pi` keeps its not-a-verb shield). A/B: 7 per-pattern deltas, ALL improvements (append-content
>    ja/tr/bn R1 0.75→1.0 + collateral form-disable-on-submit, beep-debug-expression gains), zero
>    drops. 23/23 langs now reproduce the en effect (was 20/23).
> 2. **`increment-by-amount` — trailing bare-quantity reclaim (#561).** The handoff's two-sided
>    question resolved as option (c), generic extraction: every fused event pattern ends at the verb
>    (SOV `-sov-patient-first`) or the primary role (**th `-vso` — th shares this root cause; it was
>    NOT a tokenizer issue**), stranding the transformer's post-verb bare amount; the #530 re-parse
>    can't reclaim it because the fronted patient is outside the [verb..boundary] slice (superset
>    guard, by design). `buildEventHandler` now reclaims a trailing bare NUMBER into the schema's
>    absent optional `quantity` role — gated to non-block actions (⇒ increment/decrement), numeric
>    tokens, and absent-quantity only (es/fr/pt/de #558 marker langs and positional it/zh capture it
>    upstream). Parse-level A/B: ZERO changes — expected and re-confirming the #555/#558 lesson:
>    `fillSchemaDefaults` injects `quantity:literal=1` into the role signature, so the value bug is
>    invisible to R0/R1; only R2 sees it. 23/23 langs now apply +10 (was 16/23).
> 3. **R2 wave 10 — both patterns join the curated subset (#562; 45 → 47, R2 stays 1.0, zero
>    executionFailures in all 23 langs).** Fixture adds `<ul id="list">` + `<div id="score">0</div>`
>    (appended LAST, indices preserved); membership + ja signature locks (ja locks the exact failure
>    class each fix closed); baseline regenerated against a fresh populate — avgRoleFidelity ticks up
>    from #560.
>
> The two "Remaining R2 gaps" bullets below marked ✔ RESOLVED. Still open from that list: the
> `set`-target ×5 rejections (heterogeneous), `default-value`, and the harness's document-order
> signature fragility.
>
> **Same-day follow-up: the R1 residual is freshly triaged** — see
> [HANDOFF-r1-residual.md](HANDOFF-r1-residual.md) (five grounded clusters: SOV `set` role-swap +
> property-path typing; fetch `as json` responseType under fused SOV; hi event-anchor on fronted
> positional/property-path phrases; the CORPUS-WIDE `repeat for-each` head noise — the en reference
> itself mis-parses; i18n transformer mangling of parenthesized expressions). It supersedes the
> 2026-06-17 Track-3 triage, which is now largely harvested (hi 0.683 → 0.915).

> **Update 2026-07-04 (R2 EXECUTION-COVERAGE SWEEP — the first systematic pass at "do the faithful
> parses actually EXECUTE correctly?" Now that R0 recall is saturated (fid 1.0, both bands 0), R2 is
> the un-mined dimension: only ~27% of the corpus was behaviorally verified. Three increments landed
> — one coverage wave + TWO real runtime bugs R0/R1 structurally cannot see. Plus a grounded map of
> the remaining R2 gaps.)** A discovery probe executed every non-subset, non-async pattern's **en**
> reference in jsdom, then scored all 23 translations against the en effect signature. Buckets:
> add-ready (en runs + all langs match), R2-finding (en runs, some langs diverge), ineligible (en
> errors/empty). Landed:
>
> 1. **Wave 9 — +3 coverage patterns (#554; subset 42 → 45, R2 stays 1.0).** `chained-access-possessive-dot`
>    (`set my.parentElement.style.display to …`), `hide-with-transition` / `show-with-transition`
>    (`hide me with *opacity` — SYNCHRONOUS strategies despite the name, no timer). All three already
>    execute faithfully in every language; pure coverage. The base fixture's clean add-ready fruit is
>    now EXHAUSTED (the probe found exactly these three).
> 2. **`increment/decrement … by N` runtime fix (#555).** R2-found: `increment #x by 10` applied **+1**
>    whenever the node came from the SEMANTIC parser. The AST carried the correct `by`/`quantity` value
>    (so R0/R1 were blind — it's an EXECUTION bug), and the drop was UNIFORM across languages (so R2's
>    translation-vs-en scoring was blind too — invisible until the en reference itself was checked for
>    absolute correctness). `parseNumericTargetInput` read the amount only from positional `args` (the
>    traditional-parser path); the semantic parser threads it through `modifiers.by`. Fix reads the
>    modifier. Restores correct amounts for **en + 12 languages**.
> 3. **Nested property-access runtime fix (#556).** R2-found: `put event.detail.message into #x` wrote
>    EMPTY text — a two-deep access on the event object resolved to undefined (`event.detail` worked;
>    `event.detail.message` did not). This made the curated `announce-screen-reader` cell a **FALSE R2
>    pass** (en + all 23 langs uniformly empty). Root cause: the semantic→AST builder FLATTENS a
>    multi-segment chain into ONE `propertyAccess` whose `property` is the dotted string
>    `"detail.message"`; `evaluatePropertyAccess` did a single `event["detail.message"]` lookup. Fix
>    splits on `.` and walks each segment. `announce-screen-reader` is now a TRUE pass in all 23 langs.
>
> **The R2 methodology lesson these two bugs teach:** R0 (action-set recall), R1 (role recall), and
> R2 (translation-vs-en effects) ALL score translations against the **en reference**. A bug that (a)
> lives below the parse (execution-only) AND (b) is uniform across languages is invisible to every one
> of them — the en reference is itself wrong, so every "faithful" translation faithfully reproduces the
> wrong effect. Catching these needs an **absolute** check of the en reference's DOM effect, which the
> R2 coverage sweep is the first thing to do. Expect more of this class as R2 coverage grows.
>
> **Remaining R2 gaps (grounded; each its own increment — NOT clean coverage adds):**
>
> - ✔ **RESOLVED (2026-07-04b: #558 marker langs + #561 SOV/th reclaim; joined in #562)**
>   **`increment-by-amount` 11-lang semantic gap** (would let it join the subset). My #555 runtime fix
>   made en + 12 langs correct, but EXPOSED that 11 langs don't carry `by N` into `modifiers.by` at
>   parse time — TWO causes: a **"by"-marker miss** in es (`por`)/de (`um`)/fr/pt (the amount is
>   stranded → quantity defaults to 1; es even mis-captures `quantity:1`), and an **SOV trailing-amount
>   drop** in ja/ko/hi/bn/tr/qu (the post-verb `10` isn't captured). A semantic command-schema / marker
>   arc.
> - ✔ **RESOLVED (2026-07-04b: #560 event-marker clobber fix; joined in #562)**
>   **`append-content` SOV divergence.** `append "<li>…</li>" to #list` drops the fronted content
>   patient in ja/tr (`append requires content` runtime error) and bn (silent no-op); ko/hi capture it
>   and work. A per-language SOV content-role-capture fix.
> - **`set`-target runtime rejections (×5).** `set command target must be a string or object literal`
>   on heterogeneous targets: `set the *--primary-color of #theme …` (CSS custom property via
>   of-possessive — ties to the #550 arc), `set previous <input/>.value …` (positional-selector
>   target), the trailing `set #list.innerHTML to $html` in `template-literal-list-build` (the
>   block-continuation arc), plus `beep!`/`breakpoint` debug forms. Not one root cause.
> - **`default-value`** (`on load default my @data-count …`) executes to no effect — the `default`
>   command / `on load` init path is a no-op in the harness; needs grounding.
>
> **Harness/workflow notes.** (1) The effect-signature keys elements by document-order index, which is
> fragile for innerHTML-changing patterns (element count shifts the keys) — `template-literal-interpolation`
> is a poor R2 fixture for this reason (a messy `text[${}]` en signature). A stable keying would unlock
> that class. (2) **After editing `core` (or any upstream package), do the FULL ordered rebuild
> (`test:multilingual:build-deps`) before `populate` + gate** — a partial rebuild left the DB in a
> transitional state that produced a broken zh `toggle-visibility` translation and a phantom gate
> failure (isolated: the same divergence appeared with the change reverted, and a clean full rebuild
> restored the correct translation). The CLAUDE.md "green suite against a stale dist is vacuously green"
> hazard applies to `populate`, not just vitest.

> **Update 2026-06-30e (Arc B R1 — `set-color-variable` `of`-possessive destination: GROUNDED, NOT a
> clean slice — a multi-front ARC with per-marker conflict risk. NO code change; precise root-cause map
> for a dedicated session.)** The leverage map's item 3(a) (`set.destination:property-path` on
> `set the *--primary-color of #theme to "#ff6600"`, ~11 langs miss it). The mechanism is
> `pattern-matcher.ts` `tryMatchOfPossessiveExpression` + `isOfPossessiveMarker` / `OF_POSSESSIVE_MARKERS`
> (currently only ms `daripada` / sw `ya` / vi `của` / zh `的`; the literal/normalized check also catches
> EN `of`, TL `ng`, and anything normalizing to `source`/`of`). **12 langs PASS** (de `von`, es/fr/pt `de`,
> id `dari`, ar `من` — all → `source`; he `of`; tl `ng`; ms/sw/vi/zh via the map). **11 langs FAIL**, and
> grounding the tokenization shows they fail for THREE different reasons — so a single "add the markers"
> change does NOT converge:
>
> 1. **Marker mis-normalizes to a CONFLICTING concept** (adding it as an of-marker risks breaking that
>    role/command): it `di`→`tell` (a command!), pl `z`→`style`, uk `з`→`style`, qu `pa`→`destination`,
>    tr `nin`→`destination`. These can't be blindly added to `OF_POSSESSIVE_MARKERS` — the of-possessive
>    matcher would then shadow real `style`/`destination`/`tell` uses. Needs careful gating (only when
>    flanked by two selectors in a property-path role, which the matcher already requires — so MAYBE safe,
>    but must be A/B'd per-marker for over-match).
> 2. **Bare possessive particle, no normalized form, but COMMON** (over-match risk in other patterns):
>    ja `の`, ko `의`, bn `র`, hi `का`, th `ของ`. `の`/`의` especially are high-frequency — adding them
>    needs a full per-pattern A/B for phantom property-paths elsewhere.
> 3. **Recognized but the matcher DOESN'T FIRE under the full set-command context** — the deepest one:
>    ru `из`→`source` IS accepted by `isOfPossessiveMarker`, yet ru still parses
>    `set{destination:selector="*--primary-color"}` and DROPS `из #theme в "#ff6600"` (the destination
>    role greedily binds the bare `*--primary-color` selector and the of-possessive never assembles; the
>    trailing `из`/`в` then dangle and the patient drops). pl/uk likely share this. This is a role-ordering
>    / source-confusion interaction in `matchRoleToken`, NOT a missing marker — independent of (1)/(2).
>
> **Recommendation:** if pursued, do it as a dedicated arc in THREE passes matching the three causes
> above, each with its own per-pattern A/B (the markers' conflicting normalizations make the precision
> ratchet the real gate here). Cause (3) (ru/pl/uk) should go FIRST — it's a matcher-ordering fix that may
> also unblock others, and it's the one that drops the WHOLE command (R1 0.33, the biggest per-lang loss).
> Also worth checking whether the i18n DICT is emitting a wrong `of`-marker for some (ru `из` = "from",
> pl `z` = "from/with" — ablative, not genitive; the genitive-correct fix might be a dict change, not a
> matcher change). NOT a single-PR slice.
>
> **Update 2026-06-30d (Arc B R1 — en `for` reference: drop the redundant `loopType:literal="for"`.
> LANDED. mean R1 0.9525 → 0.9531 (+0.0006); ALL 23 langs up (SVO +0.0007, SOV +0.0004), ZERO per-language
> AND ZERO per-pattern regressions. The clean broken-EN-reference slice inside the `template-literal-list-build`
> residue.)** Grounding the handoff's suggested "`set.destination` template-literal trailing-set-drop"
> arc (fresh `populate`) split it into THREE distinct root causes — only one is a clean slice:
>
> 1. **`for.loopType:literal` missed by ALL 23 langs — LANDED (this slice).** The `for` schema
>    (`command-schemas.ts` `forSchema`) has NO loopType role (unlike `repeat`, whose times/forever/until
>    variants are meaningful). But the en handcrafted `for-en-basic` set an extraction default
>    `loopType:literal="for"` — a role that merely DUPLICATES the action name and that no schema-generated
>    translation reproduces. en was the R1 outlier. Dropped it from BOTH en for-pattern paths
>    (`patterns/en.ts` `forEnglish` + `patterns/languages/en/control-flow.ts` `forEnglish`, kept in sync).
>    R2-safe: `command-mappers.ts` `forMapper` reads only patient+source. Per-pattern A/B (3404 entries):
>    **23 gains, 0 drops, all on `template-literal-list-build`** (the only `for`-pattern in the corpus).
>    Guard: `multilingual-roadmap-fixes.test.ts` "en `for` reference: no redundant loopType role". semantic
>    6397 green.
> 2. **`set.destination:property-path` missed by ALL 23 — STRUCTURAL trailing-set DROP, NOT landed.** The
>    handoff's "trailing-set-drop" is REAL but masked by action-dedup: en parses 3 sets (the trailing
>    `set #list.innerHTML to $html` → property-path), but es/de capture only **2** — the trailing set
>    AFTER the for-loop's `end then` is dropped (a block-continuation bug: the compound stops at the loop
>    `end`). This is entangled with the for-loop body parse (the for `end` boundary). A real structural
>    arc, NOT a slice.
> 3. **SOV for-body roles (`for.patient:expression`, `for.source:reference`, `set.patient:reference`)
>    missed by bn/hi/ja/ko/qu/tr — the repeat-for-each entanglement.** Under SOV reorder the for-loop body
>    `set` degenerates (ja `set` destination undefined; ko captures the whole `$html+\`…\``as`patient:literal`). The hard for-loop arc.
>
> **Bottom line:** the `template-literal-list-build` residue's only clean lever was the redundant en
> `for.loopType` (this slice). The trailing-set DROP (#2) and the SOV for-body (#3) are both structural —
> they need the for-loop body/block-continuation arc, which is the same `repeat-for-each` arc flagged
> below as the hardest remaining work. Don't re-attempt them as slices.
>
> **Update 2026-06-30c (Arc B R1 — `<ref>.<prop>` → property-path reclassification: LANDED, all four
> coupled fronts. mean R1 0.9497 → 0.9525 (+0.0028); ALL 23 langs up or flat, ZERO per-language AND
> ZERO per-pattern regressions. The 2026-06-30b arc — flagged below as "ATTEMPTED & REVERTED" because
> the EN-only slice regressed 5 langs — converges once the three coupled fronts land WITH it. R0
> 1.000 / precision 0.9747 flat / R2 1.000 / parse-rate 3696/3696.)** The 2026-06-30b spike's gating
> question — "can condition-position `event.X` stay expression while patient/destination flip to
> property-path?" — RESOLVED **yes**. The 06-30b note ruled it out by `expectedTypes` (both `put.patient`
> and `if.condition` omit `property-path`), but missed that it scopes cleanly by **role NAME**: the SOV
> window-keydown condition DOES route through `matchRoleToken` with `patternToken.role === 'condition'`
> (confirmed empirically — `tryMatchPropertyAccessExpression` has exactly one caller), so an
> `allowPropertyPath = patternToken.role !== 'condition'` flag at that call site keeps the condition an
> `expression` while every other role flips. EN's own `if event.X` is captured as a raw span (never
> routed through the matcher), so the en reference stays `expression` and the SOV condition now matches it.
>
> **The four coupled fronts (all required for zero regression; each independently verified):**
>
> 1. **F1 — EN `it.X`/`result.X` → property-path** (`pattern-matcher.ts`
>    `tryMatchPropertyAccessExpression`, both the fused-dot and operator-dot return points): when the
>    dotted base `isValidReference`, emit `createPropertyPath(createReference(base), props)` instead of
>    `{type:expression}`. **GAIN: de/es/ja + 15 others (18 langs) on `put.patient`/`set.patient`** —
>    they already render the possessive as property-path; en was the outlier. (+0.0034/lang on the 3
>    fetch patterns.)
> 2. **F2 — guard the fused-dot path against trailing method-calls.** The fused path consumed
>    `.`-selector props and returned BEFORE checking for a trailing `(`, so `target.closest("li")` →
>    property-path. Added `fusedIsMethodCall = peek().value.startsWith('(')` → stays expression.
>    **Protects behavior-sortable** (OFF-LIMITS) `set item to the target.closest("li")` from
>    regressing. (Verified load-bearing: without the guard that clause flips to property-path.)
> 3. **F3 — id/ms possessive keywords.** The i18n dict renders the reference `it` as id `miliknya` / ms
>    bare `nya` (not in the profiles' `possessive.keywords` — id had only `nya`/`dia`, ms had `-nya`
>    suffix / `dia`/`ia`). Without them id/ms `miliknya.error`/`nya.error` stayed `expression` and
>    NEWLY mismatched the flipped en reference — the exact −0.0038 regression the 06-30b EN-only slice
>    hit. Added `miliknya:'it'` (id) and bare `nya:'it'` (ms). The possessive matcher (`tryMatchPossessiveExpression`,
>    runs BEFORE the property-access matcher) then assembles the property-path. **id/ms +0.0014.**
> 4. **F4 — condition role exclusion** (the gating question above). ja/ko/qu `window-keydown` condition
>    stays `expression`. **No regression** (06-30b's −0.0017 ko/qu eliminated).
>
> **Grounding rigor (per the methodology — a green gate's 0.02 tolerance hides per-pattern drops):**
> ran a full per-(lang,pattern) R1 A/B (clean HEAD vs all-fronts, 3404 entries): **56 gains, 0 drops**
> (fetch-json/-error-handling/-with-headers × 18 langs each, +2 on `its-value-possessive-dot`). Plus a
> per-language baseline diff (every lang up or flat). Guard: `multilingual-roadmap-fixes.test.ts`
> "`<ref>.<prop>` → property-path reclassification" (11 cases, one per front + alignment; each fails
> if its front is reverted). semantic 6393 green.
>
> **Residue unchanged by this arc:** ko/qu render `put.patient` as `:selector` (`그것의.error`,
> `chaypaq.error`), NOT property-path — they neither gained nor lost (already mismatched both before
> and after). A separate, smaller residue (the SOV/qu possessive-dot → selector typing); not pursued
> here. The 06-30b leverage map below otherwise still stands.
>
> **Update 2026-06-30b (Arc B R1 — `<ref>.<prop>` → property-path reclassification: ATTEMPTED &
> REVERTED. A genuine high-value EN-outlier opportunity (+0.0016 mean R1, 18 langs +0.0030) that does
> NOT converge to zero-regression in one slice — it's a multi-front ARC. Plus a FRESH-DB leverage map
> that CORRECTS the stale-db handoff: `if-condition` is already fixed; new top residues surfaced.)**
> Mean R1 holds at 0.9497 (reverted). The most important output is the corrected map + the precise
> arc grounding below, so the next session doesn't re-discover it.
>
> **The fresh-DB leverage map (the 2026-06-30a/-06-29 counts were STALE-db — re-run after `populate`).**
> Ranking each EN `action.role:type` by how many of the 23 translations MISS it (a custom throwaway
> probe over the full priority corpus, fresh `populate`). Top NON-behavior residues:
>
> 1. **`repeat.event/loopType:literal` + `repeat.quantity:expression`** — only TWO patterns
>    (`repeat-for-each`, `stagger-animation`); the rest of the 123/89 counts are behaviors (OFF-LIMITS).
>    The two-sided `repeat for X in Y` arc (2026-06-30a) — CONFIRMED messy: EN mis-captures `in` as
>    phantom `event:literal`, drops the `.items` collection; es/de capture `.items` as
>    `destination:selector` + loop var as `loopType:expression`; ja/ko/hi degenerate (`loopType:reference=me`);
>    es/ja/ko even split a SEPARATE `for` node. R0 is fragile here (changing EN's action `repeat`→`for`
>    risks the hard R0 gate). Phase-1 (EN-only fix) yields ZERO R1 gain (R1 is recall of EN's roles —
>    fixing EN without aligning translations doesn't move it). Still the hardest arc.
> 2. **`if-condition` is ALREADY FIXED — DROP it from the priority list.** The handoff's "124×
>    if.condition fold" was a STALE-db artifact. Fresh DB: `if-condition` and `input-validation` fold
>    at **R1 = 1.00 across de/es/ja/ko/hi** (de `falls`, SOV `もし`/`만약`/`अगर` all fold the if/else
>    block; the `.active else` selector-gluing is gone). No residue here.
> 3. **`set.destination:property-path` (48)** — NEW, not in the stale handoff; NORMAL direction (EN
>    correct, align translations). GROUNDED this session — it's THREE distinct root causes, NOT a clean
>    slice: (a) `set-color-variable` (11 langs miss) — the `of`-possessive destination `*--primary-color
of #theme` isn't recognized in bn/hi/it/ja/ko/pl/qu/ru/th/tr/uk → they emit `destination:selector`
>    (the bare `#theme`), dropping the `*--primary-color` property; (b) `two-way-binding` + `computed-value`
>    (12, the SOV+bn cluster bn/hi/ja/ko/qu/tr) — the dotted destination `#greeting.innerText` mis-parses
>    under SOV reorder (`#greeting.innerText を … に 設定` → `destination:literal` or a scattered
>    `set{event:selector, source:selector, destination:literal}`); (c) `template-literal-list-build`
>    (22, near-universal) — the trailing `set #list.innerHTML to $html` AFTER the for-loop's `end then`
>    is DROPPED entirely (a block-continuation bug — the compound stops at the loop `end`), entangled
>    with the repeat-for-each arc. Each sub-problem is its own slice; (c) is the biggest single root
>    cause but structural.
> 4. **`put.patient` / `set.patient:expression` (40 + 37)** — the `<ref>.<prop>` arc, detailed below.
> 5. **`halt.patient:reference` (74; `form-submit-prevent` 23 non-behavior, rest behaviors)** — ground next.
> 6. **`send.destination:reference` (44; `socket-send` 23, `send-with-detail` 21)** — known hard arc (2026-06-30a).
>
> **The `<ref>.<prop>` → property-path attempt (REVERTED).** Grounding `put.patient:expression` (40×;
> `fetch-error-handling`, `fetch-with-headers`) showed the swap-style EN-OUTLIER shape: EN types
> `it.error`/`it.name` as `patient:expression`, but 21/23 translations type their possessive rendering
> (`su.error`, `sein.name`, `その.error`) as `patient:property-path`. Semantically `it.error` IS a
> property access → property-path; EN was the outlier (only `my.value` already went property-path, via
> the possessive keyword path; `it.X`/`result.X`/`event.X` fell through to a bare `expression`). The fix:
> in `pattern-matcher.ts` `tryMatchPropertyAccessExpression`, when the dotted base is a valid reference
> (`isValidReference`: it/me/you/event/result/target/body), emit `createPropertyPath(createReference(base),
props.join('.'))` instead of `{type:expression}` (a `buildPropertyAccessValue` helper at the fused-dot
> and operator-dot return points). `property-path` and `expression` are compatibility-EQUIVALENT in
> `isTypeCompatible` (both accepted wherever selector/reference/expression is) → **zero parse/R0
> rejection risk**. Result: **mean R1 0.9497 → 0.9512 (+0.0016), 18 langs +0.0030, R0/precision/R2 flat,
> parse-rate 3696/3696, gate GREEN.** But **5 langs REGRESSED** (real per-pattern drops, MEASURED
> before/after): violates the zero-regression bar even though the gate's 0.02 tolerance absorbed them —
> a textbook case of CLAUDE.md's "don't read a green gate as within noise."
>
> **Why it's a multi-front ARC, not a slice (precise, measured root causes):**
>
> - **id (−0.0038) / ms (−0.0038): dict↔profile possessive MISMATCH** on `fetch-error-handling`,
>   `fetch-json`, `fetch-with-headers`. The i18n transformer renders EN `it` as id `miliknya` / ms `nya`,
>   but the semantic profiles' `possessive.keywords` list only `nya`/`dia` (id) and `-nya`/`dia`/`ia`
>   (ms) — NOT the corpus forms. So `miliknya.error`/`nya.error` miss the possessive→property-path path
>   and stay `expression`; when EN flipped, they newly mismatched. FIXABLE (add `miliknya:'it'` to id,
>   bare `nya:'it'` to ms) — but bare `nya` is a common clitic → over-match risk; gate it.
> - **ko (−0.0017) / qu (−0.0017): `window-keydown` condition `event.ctrlKey`.** In ISOLATION both EN
>   and ja/ko parse `if event.ctrlKey` → `condition:expression` (the condition is a raw span, NOT routed
>   through the value-matcher). But in the FULL `window-keydown` (`on keydown[…] from window if
event.ctrlKey halt call …`) the SOV condition extraction DOES route `event.ctrlKey` through the
>   matcher → my change flips it to `property-path`, while EN's stays `expression` → mismatch. HARD:
>   needs condition-position exclusion or EN-condition alignment; can't be scoped by `expectedTypes`
>   (`put.patient` AND `if.condition` both omit `property-path` from their lists, relying on the
>   compatibility rule — so role-type scoping can't separate the gain position from the loss position).
> - **id/ms/vi: `behavior-sortable` (OFF-LIMITS) — the hard blocker.** EN's `target.closest("li")` is a
>   method call, but the fused-dot path (consumes `.`-prefixed selector tokens, returns BEFORE checking
>   for a trailing `(`) treats `.closest` as a property → my change flips `target.closest` →
>   property-path, mismatching the translation. Two problems: (a) it degrades an OFF-LIMITS behavior's
>   R1 (can't fix the behavior), and (b) it exposes a latent BUG — the fused-dot path should bail to
>   method-call handling when the next token is `(`.
>
> **The coupled clean version (for a future ARC phase, NOT this session):** EN `it.error`→property-path
>
> - guard the fused-dot path against method-calls + the 2 possessive profile additions (id/ms) +
>   condition-position exclusion for `event.X` (the hard part, ko/qu). All four are needed for zero
>   per-lang regression. The possessive-fix and the EN-fix are COUPLED — neither works alone (the
>   possessive fix alone would flip id/ms to property-path while EN is still expression → also a
>   regression). Worth ~+20 langs if it converges, but it's a real arc.
>
> **Update 2026-06-30a (Arc B R1 — residue map after the swap win; the clean contained slices are
> EXHAUSTED. NO code change — grounding + handoff. Mean R1 holds at 0.9497.)** After the swap
> EN-reference win (2026-06-29r), a fresh-DB leverage-map sweep + per-cluster grounding shows every
> remaining high-count R1 residue is either a multi-step ARC or low-value/messy. Each is grounded
> below with its ROOT CAUSE so the next session doesn't re-discover it. **The cheap wins are gone;
> what's left needs real arcs.**
>
> - **`send-with-detail` etc. (send.destination 44×) — ARC, NOT a slice (a no-op `send {event} to
{destination}` HEAD was tried and REVERTED).** Two of four send corpus shapes already parse the
>   destination (`send refresh to #widget`, `send hello to <form/>`). The two that DROP it (default
>   `me`) are: (a) `send update(value: 42) to #target` — the method-call event; (b) `send "hello" to
ChatSocket` — bare-identifier destination. ROOT CAUSE for (a): the `event` role DELIBERATELY
>   skips bare-call folding (`pattern-matcher.ts` ~L505, `skipBareCall = patternToken.role ===
'event'`) so `on pointerdown(clientX, clientY)` captures the event NAME not a call — which means
>   `send update(value: 42)`'s `(value: 42)` detail can't be consumed, so a `send {event} to {dest}`
>   HEAD never reaches `to`. Fixing send needs event-WITH-DETAIL parsing (capture `update` + consume
>   `(value: 42)` then match `to {dest}`) — a real arc touching the event-role boundary, distinct
>   from the `on`-handler param case. (b) is a `reference`-vs-`reference` non-mismatch — ChatSocket
>   isn't a selector — so it doesn't even contribute to the selector misses; ignore.
> - **`repeat-for-each` (event:literal 54× / loopType:literal 53× / quantity:expression 46× — the
>   top three) — TWO-SIDED ARC.** The EN reference is itself broken: `repeat for item in .items`
>   parses as `repeat{loopType:literal="for", event:literal="in", quantity:expression}` — the `in`
>   keyword is mis-captured as a phantom `event:literal`, and the loop variable + collection are
>   never captured. es/de capture `.items` as `destination:selector` (better!) but type loopType as
>   `expression` not `literal`; ja/ar are degenerate. Fixing it = fix the EN `repeat for X in Y`
>   parse FIRST (kill the phantom `event:literal="in"`, capture loopVariable + collection), THEN the
>   translations. Both sides are wrong → a genuine arc.
> - **`if-condition` (if.condition:expression 124× in the STALE-db map; structural) — ARC.** EN/es/ar
>   fold the `if/else` block (`conditional-X-folded`); de (V2 `wenn`) and SOV (ja/ko/hi) DON'T — the
>   conditional collapses to a flat `compound[remove, add]`, and SOV glues `else`/`end` onto the
>   preceding selector (`.active else` → `.activeelse`). A conditional-folding arc (the §2 cluster):
>   recognize the if-keyword + fold in the de/SOV body paths, and fix the SOV `else`/`end` tokenizer
>   gluing.
> - **`accordion-toggle` (toggle.destination:expression 115×) — ARC.** EN `toggle .open on closest
.accordion-item` has a positional `on closest X` destination expression the translations drop in
>   the event-handler body (fused-body family); `@aria-expanded` also mis-types patient:selector vs
>   en's patient:expression; es even splits into two `on` handlers.
> - **`set` cluster (set.destination/patient ~150× combined) — FRAGMENTED, three sub-problems.** ko
>   SOV destination↔patient role-SWAP (`#output.innerText 를 … 설정 "Hello" 에` → patient:selector +
>   destination:literal, mirrored); ms drops the set body entirely (English `to` untranslated, the
>   `tetapkan … to …` body fails); sw/qu translate set→`put` (weka/churay = put), an action-naming
>   divergence. No single clean slice.
> - **`wait-for-event` (wait.duration:literal 23×) — 3-WAY DISAGREEMENT, skip.** EN types the event
>   `transitionend` as `duration:literal`, de as `duration:expression`, ja as `duration:reference` —
>   no clear correct answer (and EN typing an event name as a "duration" is itself dubious).
> - **`for.loopType:literal` (23×) — LOW-VALUE.** EN's handcrafted `for-en-basic` sets a redundant
>   `loopType:literal="for"` extraction default (the for schema has NO loopType role); the generated
>   `for-<lang>-generated` doesn't, so translations miss it. Could align either way, but loopType=
>   "for" merely duplicates the action name — adding generator special-cases for a redundant role is
>   poor ROI. (If pursued: inject the default in `buildExtractionRulesWithDefaults` for `action==='for'`,
>   OR drop it from `forEnglish` — verify the for AST/createLoopNode doesn't depend on it for R2.)
>
> **Bottom line for the next session:** the contained translation-alignment + EN-reference slices are
> done (repeat cluster + swap). Pick ONE arc and give it a dedicated session with the full six-signal
> gate. Highest-value: **`repeat-for-each`** (top three residues, ~153 combined) or **`if-condition`
> folding** (124×) — both are EN-reference/structural fixes where the translations are partly right,
> so progress lifts many langs at once. Re-run the leverage map against a FRESH `populate` first (the
> committed `patterns.db` lags the dicts — the 2026-06-29q qu mis-exclusion and inflated stale-db
> counts both came from skipping that).
>
> **Update 2026-06-29r (Arc B R1 — en element-swap REFERENCE fix; mean R1 0.9467 → 0.9497 (+0.0029),
> ALL 23 langs up, ZERO regressions. The biggest single R1 win since the URL fix (#525) — and a NEW
> direction: fixing a broken EN REFERENCE where the translations were already correct.)** A
> fresh-DB leverage-map re-run (the committed `patterns.db` lags the dicts, so the map MUST run
> against a fresh `populate` — see 2026-06-29q) put `swap.destination:literal` + `swap.method:selector`
> (~46 combined) near the top, all from the one `swap-content` pattern. Grounding flipped the usual
> diagnosis: the EN reference is the BROKEN one. `swap #a with #b` is a method-less, `with`-marked
> element swap, but `swap-en-handcrafted` (`swap {method} {destination}`, prio 110) greedily binds
> `#a`→method and the bare word `with`→destination:literal, then DROPS `#b`. Every translation
> (de/es/ja/ko/…) parses `{destination:selector, patient:selector}` CORRECTLY — so R1 (recall vs the
> garbage en reference) scored them ~0 for swap. **Fix: a dedicated `swap-en-element` pattern
> (`swap {destination} with {patient}`, priority 120 > 110) in BOTH en pattern paths (patterns/en.ts
> `buildEnglishPatterns` — the registered/gate path — and patterns/languages/en/swap.ts — the
> builders.ts path; kept in sync). The required `with` literal means it only fires on the element-swap
> shape; `swap innerHTML #target` / `swap delete #item` (no `with`) still take the 110 method form.**
> en now parses `swap {destination:selector="#a", patient:selector="#b"}`, matching the schema AND
> every translation → R1 for swap-content jumps ~0 → 1.0 across the board. **ALL 23 langs gained
> (+0.0034 most; +0.0017 for ar/bn/hi/qu/tl/tr whose swap-content was already partly degenerate); R0
> 1.000 / precision 0.9747 flat / R2 1.000 (swap-content is NOT in the curated execution subset, so
> no R2 risk) / parse-rate 3696/3696.** semantic 6382 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "en element-swap reference" (5 cases: the en parse — fails
> without the fix — 3 translation-alignment, 1 method-form-unchanged control).
>
> **STRATEGIC NOTE — the remaining high-leverage R1 residues are BROKEN EN REFERENCES, not buggy
> translations.** This INVERTS the campaign's default direction (align translations toward en).
> Where en is the outlier and the translations already agree on the correct parse, fixing the EN
> reference aligns it TOWARD them and lifts R1 broadly (the methodology's "if EN is the outlier
> translations already agree against, great" case — the opposite of the abandoned trigger.event,
> where en was right). The fresh-DB leverage map's top remaining clusters are this shape:
> **`repeat-for-each`** (en mis-captures `in` as `event:literal`, never captures the loop variable or
> collection; es/de capture `.items` as destination correctly — but it's TWO-sided: translations are
> also imperfect (loopType:expression vs literal), so it's a real arc, fix en first); **`send-with-detail`**
> (send.destination:reference 44× — ground next); **`set` cluster** (ko SOV destination↔patient
> role-swap, ms drops the body, sw/qu translate set→put — fragmented). The structural `if.condition`
> fold (de V2 `wenn` + SOV `else`/`end` selector-gluing) and `accordion-toggle` (positional `on
closest X` destination) remain genuine arcs. **Next concrete slice candidate: `send-with-detail`
> (one pattern, 44×) — ground it (fresh DB!) to see if it's an en-reference fix like swap.**
>
> **Update 2026-06-29q (Arc B R1 — qu repeat-times HEAD (completes the SOV set); mean R1 0.9466 →
> 0.9467 (+0.0001), qu 0.9108 → 0.9142 (+0.0034), ZERO regressions. Lifts the SINGLE biggest
> laggard; the counted-loop (`times`) cluster is now closed across ALL parsing langs.)** #542
> EXCLUDED qu from the SOV repeat-times HEAD on the belief its corpus repeat verb was `kutichiy`
> (which normalizes to `return`). Grounding the leverage map exposed that as a STALE-DB artifact:
> the committed `patterns.db` lagged the dicts (the i18n qu dict already maps `repeat: 'kutipay'`),
> and a FRESH `populate` (what CI always does) emits `3 times ta ñitiy pi kutipay …` — `kutipay`
> normalizes to `repeat` (confirmed: qu repeat-forever/until-event already parse via it). So qu only
> needed the HEAD pattern. **Fix: add `['qu', 'times', 'ta']` to `SOV_REPEAT_TIMES` (`repeat.ts`).**
> The patient-first SOV body clause `3 times ta kutipay` (marker `ta`) then matches `repeat-qu-times`
> → quantity:literal=3 + loopType:literal="times", matching en; the `add` body survives. **qu +0.0034
> (the only changed lang — confirming the committed baseline already reflected `kutipay` for the
> rest, i.e. NOT a db-freshness artifact); R0 1.000 / precision 0.9747 flat / R2 1.000 / parse-rate
> 3696/3696.** semantic 6377 green. Guard: `multilingual-roadmap-fixes.test.ts` "SOV repeat-times
> fronted-count HEAD" gained a qu case (hardcoded `kutipay` corpus form; fails without the fix).
> **Methodology note for the next session:** a raw read of the COMMITTED `patterns.db` can lag the
> dicts — always `npm run populate` before grounding a per-language corpus claim, else you score a
> stale translation (this is how #542 mis-excluded qu). **Remaining repeat residue:** only the
> for-each two-sided EN-phantom (`repeat for X in Y` — the EN reference itself mis-captures `in` as
> `event:literal`, two-sided and riskier). **Next leverage targets (grounded, all structural — the
> easy R1 wins are exhausted at this depth):** `if.condition:expression` (124× — de V2 `wenn` + SOV
> fail to FOLD the if/else block in the handler body, SOV also glues `else`/`end` onto selectors;
> a conditional-folding arc); `toggle.destination:expression` (115× — accordion-toggle's positional
> `on closest X` destination dropped in the body); `set` cluster (ko SOV destination↔patient
> role-swap, ms drops the body, sw/qu translate set→put). `fetch.source:literal` (64×) is an
> action-naming divergence (dicts map fetch→holen/ambil/取得), not a clean fix.
>
> **Update 2026-06-29p (Arc B R1 — vi two-word-verb repeat-times HEAD fix; mean R1 0.9465 → 0.9466
> (+0.0001), vi 0.9641 → 0.9657 (+0.0017), ZERO regressions.)** Grounding CORRECTED the handoff
> theory (which blamed a mid-verb verb-finder landing): the vi tokenizer fuses the two-word verb
> `lặp lại` into a SINGLE keyword token (`value="lặp lại"`, `normalized="repeat"`), but
> `repeatTimesHead` (`repeat.ts`) SPLIT the verb on whitespace into two literal tokens
> (`['lặp','lại']`) — which never match the one fused token. So `repeat-vi-times` failed to match
> even STANDALONE (`lặp lại 3 lần` fell through to the generated positional repeat →
> `loopType:literal=3`, no quantity), and a fortiori in-handler (the block-body HEAD re-parse found
> no `-times` match to swap in). **Fix: match the verb as a SINGLE literal token (`{type:'literal',
value: verb}`) instead of splitting on whitespace.** For the 16 single-word verb-first langs this
> is byte-identical (one push either way); only vi changes. With it, `lặp lại 3 lần` matches
> `repeat-vi-times` (quantity:literal=3 + loopType:literal="times"), and the in-handler HEAD re-parse
> swaps it in — both matching en. **vi +0.0017 (the only changed lang); R0 1.000 / precision 0.9747
> flat / R2 1.000 / parse-rate 3696/3696; ZERO drops on the other 16.** semantic 6376 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "Counted-loop HEAD patterns" gained 2 vi cases (standalone +
> in-handler; both fail without the fix). **Remaining repeat residue:** the for-each two-sided
> EN-phantom (`repeat for X in Y` — the EN reference itself mis-captures `in` as `event:literal`, so
> it's two-sided and riskier — needs the EN reference fixed first), and the qu dict fix (`kutichiy`
> ↔ `repeat`, see 2026-06-29o). The counted-loop (`times`) cluster is now closed across every
> parsing lang except qu.
>
> **Update 2026-06-29o (Arc B R1 — SOV repeat-times fronted-count HEAD pattern; mean R1 0.9460 →
> 0.9465 (+0.0005), hi/bn +0.0034 · ja/ko/tr +0.0017, ZERO regressions. Lifts the five SOV
> laggards directly; qu excluded as a separate dict bug.)** SOV langs front the count ahead of a
> clause-final verb (`on click repeat 3 times …` → ja `3 times を クリック で 繰り返し それから …`),
> so the verb-FIRST counted-loop HEAD (#536, `{verb} [marker] {quantity} {countWord}`) can't apply.
> Grounding (throwaway probe + tokenization dump): inside the event handler the event is stripped
> first, so the body-clause re-parse sees the bare 4-token count phrase `{quantity} {countWord}
{objMarker} {verb}` (ja `3 times を 繰り返し`), but the generated positional repeat mis-binds the
> fronted count to `loopType:literal=3` and drops `quantity` (ja/ko/tr) — or produces a roleless
> repeat node (hi/bn). **Fix: a verb-LAST SOV HEAD pattern `repeat-<lang>-times` (`repeat.ts`,
> `repeatTimesHeadSOV`) shaped `{quantity} {countWord} {objMarker} {verb}` at priority 110 > the
> generated 100.** The verb token matches the repeat keyword by its NORMALIZED form (`repeat`), so
> it's robust to every conjugation/alternative; the object marker (ja `を` / ko `를` / tr `i` / hi
> `को` / bn `কে`) and count word (`times`, bn native `বার`) come verbatim from the corpus. Result
> matches en's `repeat{quantity:literal=3, loopType:literal="times"}` exactly: ja/ko/tr recover
> `quantity:literal` (loopType type was already literal but VALUE was the mis-bound number 3 — now
> corrected to "times"); hi/bn recover BOTH `quantity:literal` + `loopType:literal` (were roleless).
> **hi 0.9065→0.9098, bn 0.9217→0.9251, ja 0.9233→0.9250, ko 0.9202→0.9219, tr 0.9257→0.9274; R0
> 1.000 / precision 0.9747 flat / R2 1.000 / parse-rate 3696/3696.** semantic 6374 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "SOV repeat-times fronted-count HEAD" (6 cases — 5 in-handler
> corpus + 1 standalone; all 6 fail without the fix). **qu EXCLUDED (separate dict bug):** its corpus
> repeat verb `kutichiy` normalizes to `return`, not `repeat` (the qu profile lists `kutipay`/`muyu`),
> so it parses to a phantom `toggle` with no repeat node — fixing it needs the qu dict corrected
> (`kutichiy` ↔ `repeat`), a separate slice. **Remaining repeat residue:** vi two-word verb (`lặp
lại` — the verb-finder lands mid-verb so the in-handler HEAD doesn't fire), the for-each two-sided
> EN-phantom (`repeat for X in Y`), and the qu dict fix above.
>
> **Update 2026-06-29n (Arc B R1 — tr/hi/qu repeat-until-event completed via a single event fuse;
> mean R1 0.9457 → 0.9460 (+0.0003), hi/qu/tr +0.0019, ZERO regressions. Completes the
> repeat-until-event slice (the deferred half of 2026-06-29m).)** Grounding the 2026-06-29m
> deferral found the two problems were ONE root cause: the underscore-split mouse events
> (tr `fare_bas`/`fare_bırak`, hi `माउस_नीचे`/`माउस_ऊपर`, qu `rat_ñitiy`/`rat_huqariy`). The split
> handler event (`fare_bas`→"bas") broke the fused event-handler match, ROUTING the whole handler
> onto the compound/traditional body path — where the until-event recovery (2026-06-29m, in the
> fused-action path) never runs, so the repeat node came out EMPTY. **Fix: just fuse the events
> (the #535 route — dict emits `farebas`/`farebırak`/`माउसनीचे`/… + register the fused forms in the
> tr/hi/qu tokenizer EXTRAS).** That single change cascaded: the clean handler event re-routes the
> handler onto the fused-action path → the 2026-06-29m recovery fires → all three now match en's
> `repeat{event:literal="mouseup", loopType:literal="until-event"}` AND get the correct handler
> event (`mousedown`, fixing qu's prior `ñitiy`→click mis-capture). No buildEventHandler change
> needed. **hi/qu/tr +0.0019; R0 1.000 / precision flat / R2 1.000 / parse-rate 3696/3696.** Guards:
> `multilingual-roadmap-fixes.test.ts` "repeat-until-event recovery" gained tr/hi/qu cases +
> `grammar.test.ts` "tr/hi/qu fused … mouse events". With this, **repeat-until-event is faithful
> across all parsing langs**, and the repeat-cluster is largely burned down (times/forever/
> until-event all done). Remaining repeat residue: SOV repeat-times (fronted count), vi two-word
> verb, the for-each two-sided EN-phantom. (Latent: tr/hi/qu's OTHER underscore events —
> keydown/keyup/mouseenter/etc. — same fuse when a corpus pattern needs them.)
>
> **Update 2026-06-29m (Arc B R1 — repeat-until-event recovery; mean R1 0.9451 → 0.9457 (+0.0007),
> 12 langs, ZERO regressions. Broader than the SOV-only scope predicted — it generalizes to
> SVO/VSO.)** The fused event-handler captures the repeat verb but leaves the until-event clause
> `{event-kw} {event} {obj-marker} {until-marker}` (ja `繰り返し イベント マウス解放 を まで`, de
> `wiederholen bis ereignis mausoben`) unconsumed → the loop defaulted to `loopType:reference=me`
> AND the span broke into PHANTOM `event`/`until` body commands. **Fix (`buildEventHandler`,
> alongside the 2026-06-29l forever recovery, as an else-branch): when the token after the repeat
> verb is the event-kw (`normalized==='event'`), capture the NEXT token as `event:literal`, set
> `loopType:literal="until-event"` (matching the en reference), drop the SOV default-patient leak,
> and CONSUME the span to the next clause boundary (then/end/EOF) so the phantoms can't form.** The
> body (increment/wait, after the boundary) is still recovered by the trailing path. This is the
> targeted-recovery approach again (NOT the #537 re-parse — same `preservesFused`/length guards
> would block it). **Gains: bn/ja/ko +0.0019 (both roles), ar/de/fr/it/ms/pl/th/tl/vi +0.0010 —
> the recovery fires for any lang whose repeat-until-event routes through the fused-action path,
> not just SOV.** R0 1.000 / precision flat (the phantom `event`/`until` removal is also a latent
> precision win) / R2 1.000 / parse-rate 3696/3696. Guard: `multilingual-roadmap-fixes.test.ts`
> "repeat-until-event recovery" (5 cases incl. SVO de + VSO ar; failing-without-fix verified).
> **DEFERRED — tr/hi/qu** (NOT in the gain set): they route their repeat-until-event through a
> different (compound/traditional) parse path that doesn't reach the fused-action recovery, AND
> their event token is the #535-class underscore-split compound (`fare_bırak` / `माउस_ऊपर` /
> `rat_huqariy`; qu's until-marker `hayk_akama` is also split, and qu's mousedown `rat_ñitiy`
> mis-captures as the `click` event). A separate slice: fuse those compounds (dict + tokenizer)
> AND route their until-event through the recovery (or a SOV until-event HEAD pattern for the
> traditional path).
>
> **Update 2026-06-29l (Arc B R1 — SOV repeat-forever loop-keyword recovery; mean R1 0.9448 →
> 0.9451 (+0.0003), all 6 SOV langs (bn/hi/ja/ko/qu/tr) +0.0011, ZERO regressions. Lifts the SOV
> laggards directly.)** The verb-first SOV loop head `{repeat-verb} forever <body>` (ja `繰り返し
forever .pulse を 切り替え`) has its `forever` DROPPED by the fused SOV event pattern, so the loop
> defaults to `loopType:reference="me"` (the normalizeCommandRoles default-patient→primaryRole leak)
> while en is `loopType:literal="forever"`. **Grounding showed the general #537 re-parse mechanism
> does NOT fit here** — it fights two load-bearing guards: `preservesFused` (fused `reference` vs
> re-parse `literal` loopType) and `reparsed.length===1` (forever juxtaposes its body, no `then`).
> **So a CONTAINED fix instead** (`buildEventHandler`, at the fused-capture site): when the action
> is `repeat` and the token immediately after the verb is a `forever` keyword (en `forever` / native
> hi `हमेशा` / bn `চিরকাল`, all normalized to `forever` — recognized since #527), set
> `loopType:literal="forever"` AND **drop the SOV default-patient leak** (`delete roles.patient` —
> else, with loopType now occupied, it surfaces as a phantom `patient:reference=me` the en reference
> lacks; verified the phantom appears without the delete). The body (toggle/wait) is still recovered
> by the trailing-body path. **All 6 SOV langs match en's `repeat{loopType:literal="forever"}`
> exactly; SVO (es) unchanged (different path).** R0 1.000 / precision flat / R2 1.000 / parse-rate
> 3696/3696. Guard: `multilingual-roadmap-fixes.test.ts` "SOV repeat-forever loop-keyword recovery"
> (6 cases asserting loopType + no-phantom-patient + body-survives; failing-without-fix verified).
>
> **DEFERRED — SOV `repeat until event` (the other half of this slice).** Grounded as a genuine
> dedicated arc, NOT contained: (1) the until head `{verb} {event-kw} {event} {marker} {until}`
> (ja `繰り返し イベント マウス解放 を まで`) currently breaks into PHANTOM `event` + `until` commands
> (ja/ko/bn) or fails outright (tr/hi/qu), so it needs a SOV until-event HEAD pattern; (2) capturing
> it via the fused-body re-parse fights the SAME `preservesFused` reference-vs-literal guard as
> forever did (fused `loopType:reference=me` → re-parse `loopType:literal="until-event"`) — needs a
> principled relaxation allowing a default `reference:me` loopType to be replaced; (3) the event
> token itself is an underscore-split compound for tr/hi/qu/bn (`fare_bırak` / `माउस_ऊपर` /
> `rat_huqariy` / mouseup) — the #535-class fuse fix, per-lang. A multi-part arc.
>
> **Update 2026-06-29k (Arc B R1 — block-body-guard HEAD-only exception UNLOCKS in-handler
> repeat-times for the event-first langs; mean R1 0.9440 → 0.9448 (+0.0008), 11 langs +0.0017,
> ZERO regressions. The largest win of this continuation; delivers the unlock predicted in 2026-06-29j.)**
> #530/#532's fused-body re-parse SKIPS block-body actions (`repeat`/`if`/`for`/`while`/`unless`)
> because re-parsing `[verb..boundary]` would swallow their inline body (the #530 repeat-forever
> regression). But the counted-loop HEAD (`repeat {n} times`) is HEAD-ONLY — it stops after the
> count word — so for the event-first langs whose corpus `repeat-times` puts the loop in the FUSED
> event body (`en clic repetir 3 times entonces …` → fused `repeat{loopType:literal=3}`, the number
> mistyped as loopType, body dropped), the HEAD re-parse recovers `quantity:literal` +
> `loopType:literal="times"` without a body. **Fix (`buildEventHandler`, semantic-parser.ts): allow
> `repeat` to ENTER the re-parse block, and gate the swap on the re-parse matching a HEAD-ONLY
> pattern (`patternId` matches `/^repeat-.*-times$/`).** The body-swallowing GENERATED repeat (which
> matches `repetir forever alternar .pulse` → `quantity:literal="toggle"`, swallowing the toggle) is
> NOT a `-times` pattern, so the repeat-forever hazard stays excluded — VERIFIED: es/de in-handler
> repeat-forever keep `loopType="forever"` + the toggle body survives. **11 langs gain
> (de/es/fr/id/it/pl/pt/ru/sw/th/uk +0.0017); R0 1.000 / precision flat / R2 1.000 / parse-rate
> 3696/3696.** Guard: `multilingual-roadmap-fixes.test.ts` "Counted-loop HEAD patterns" gained 4
> in-handler cases + a repeat-forever hazard guard (failing-without-fix verified). **Residual:** vi
> (two-word verb `lặp lại`) — the verb-finder lands mid-verb so the HEAD doesn't match in-handler;
> ms net-neutral. SOV repeat-times (fronted count) still needs its own HEAD structure. The
> general block-body-HEAD-exception now also positions the SOV `repeat forever`/until-event capture
> (same mechanism, a HEAD-only SOV loop pattern) as the next repeat-cluster slice.
>
> **Update 2026-06-29j (Arc B R1 — `{verb} {quantity} times` counted-loop HEAD patterns for
> verb-first langs; mean R1 0.9435 → 0.9440 (+0.0004), ar/tl +0.0017, he/zh +0.0034, ZERO
> regressions. + a sharp scoping finding on the event-first majority.)** Mirrors the en
> `repeat {quantity} times` HEAD pattern (#521) for verb-first languages: a new per-language
> module (`packages/semantic/src/patterns/repeat.ts`, wired into `builders.ts`) emits
> `{verb} [marker] {quantity} {countWord}` (priority 110 > the generated positional repeat's 100),
> capturing `quantity:literal` + defaulting `loopType:literal="times"` and STOPPING after the count
> word so the body parses separately. The count word is taken verbatim from the corpus (most langs
> leave English `times`; th `ครั้ง`, vi `lần`, tl `beses`). Covers all verb-first langs
> (es/de/fr/it/pt/ru/uk/pl/ar/he/id/ms/sw/th/vi/tl/zh).
>
> **GROUNDING FINDING (sharp, load-bearing for the next session): only the verb-first-INPUT langs
> gain — ar/he/tl/zh.** The corpus `repeat-times` is always `on click repeat N times …`, i.e. the
> repeat sits in the EVENT-HANDLER BODY. For ar/he/tl/zh the repeat verb is at/near the input head,
> so it reaches the standalone command path and the HEAD pattern fires. For the event-first majority
> (es/de/fr/it/pt/ru/uk/pl/id/ms/sw/th/vi) the repeat is captured by the fused/generated
> event-handler body path, and **`repeat` is a BLOCK_BODY_ACTION whose fused-body re-parse is
> deliberately SKIPPED** (#530/#532's block-body guard — re-parsing a block-body clause would
> swallow its inline body). VERIFIED: es STANDALONE `repetir 3 times …` captures
> `quantity:literal`+`loopType:literal` perfectly, but es IN-HANDLER `en clic repetir 3 times …`
> still yields the phantom `loopType:literal=3`. So the event-first langs' HEAD patterns are correct
>
> - forward-looking but inert until the block-body unlock lands. **The unlock = a HEAD-only-aware
>   refinement of the block-body guard: allow the fused-body re-parse for a block-body action when the
>   re-parse is HEAD-only (consumes only up to the count/loop-keyword, leaving the body) — then the
>   repeat HEAD pattern fires in-handler and ~13 more langs gain `repeat.quantity:literal` +
>   `repeat.loopType:literal="times"`.** That is the next high-leverage repeat-cluster slice (also
>   unblocks the SOV `repeat forever`/until-event drops). R0 1.000 / precision flat / R2 1.000 /
>   parse-rate 3696/3696. Guard: `multilingual-roadmap-fixes.test.ts` "Counted-loop HEAD patterns"
>   (5 cases incl. the es standalone-vs-in-handler distinction; failing-without-fix verified).
>   **Also deferred:** SOV langs (ja/ko/tr/hi/bn/qu) front the count ahead of a clause-final verb —
>   a different HEAD structure.
>
> **Update 2026-06-29i (Arc B R1 — ru/uk FUSED event keywords (the underscore-split follow-up to
> 2026-06-29h); mean R1 0.9434 → 0.9435 (+0.0001), ru/uk +0.0010 each, ZERO regressions.)** The
> ru/uk i18n dicts emitted UNDERSCORE compounds for several events (`мышь_вниз` mousedown,
> `изменение_размера` resize, …) which the semantic tokenizer SPLITS on `_` (→ `мышь`+`_`+`вниз`),
> so the event typed as a bare expression — the on.event residue flagged in 2026-06-29h. **Fix
> (the #510 tr-resize route, two-package): the i18n dict now emits the FUSED form (`мышьвниз` /
> `изменениеразмера`; uk `мишавниз` / `змінарозміру`), registered in the ru/uk tokenizer EXTRAS.**
> Covers the two underscore-event patterns in the priority corpus — `repeat-until-event`
> (mousedown) and `window-resize` (resize) — so it completes BOTH the resize family (ru/uk were the
> non-Latin gap from 2026-06-29g) and mousedown. R0 1.000 / precision flat / R2 1.000 / parse-rate
> 3696/3696. Guards: `grammar.test.ts` "ru/uk fused … event keywords" (dict emits fused, no `_`) +
> `multilingual-roadmap-fixes.test.ts` "Event-keyword alignment" gained 4 ru/uk cases. **Latent
> (not in priority corpus, same fix when they get coverage):** the OTHER ru/uk underscore events
> (dblclick/mouseenter/mouseleave/mousemove/keydown/keyup/keypress/touchstart) are still
> underscore forms in the dict. **The `on.event` event-keyword-alignment seam is now essentially
> exhausted** — the remaining `on.event` misses are singletons (hi default-value/load) or the
> repeat until-event `repeat.event`/`repeat.loopType` capture (the repeat-cluster arc).
>
> **Update 2026-06-29h (Arc B R1 — `mousedown`/`mouseup` event-keyword alignment (continues
> 2026-06-29g); mean R1 0.9433 → 0.9434 (+0.0002), es/pt/ja/ko +0.0010 each, ZERO regressions.)**
> The `repeat-until-event` pattern (`on mousedown repeat until event mouseup …`) has TWO events:
> the handler event (`on mousedown`) and the loop until-event (`repeat until event mouseup`). The
> i18n dict emits native forms the profiles/tokenizers never listed (es `ratónabajo`/`ratónarriba`,
> pt `mouseBaixo`/`mouseCima`, ja `マウス押下`/`マウス解放`, ko `마우스다운`/`마우스업`), so the HANDLER
> event typed as `expression` instead of en's `on.event:literal="mousedown"`. **Fix: register
> `mousedown`/`mouseup` — es/pt via profile keyword, ja/ko via tokenizer EXTRAS (non-Latin, derive
> events in the tokenizer not the profile).** This lifts `on.event:literal` for all four (+0.0010
> each); precision flat, no new phantoms (ja's pre-existing `event.event` node from the
> until-event is unchanged). **The loop until-event (`repeat.event:literal="mouseup"`) is STILL
> dropped** — that's the separate repeat-cluster residue (the verb-final/SOV `repeat until event`
> structure drops the event), not this fix. R0 1.000 / precision flat / R2 1.000 / parse-rate
> 3696/3696 unchanged. Guard: `multilingual-roadmap-fixes.test.ts` "Event-keyword alignment" gained
> 4 mousedown cases (all 4 fail without the fix). **Remaining `on.event` residue:** ru/uk
> `mousedown`/`mouseup` SPLIT the underscore-compound (`мышь_вниз` → `мышь`+`_`+`вниз`) — a
> single-token tokenizer fix (same class as #510 tr `boyut_değiştir`); and the bigger
> `repeat.event`/`repeat.loopType` until-event capture is the repeat-cluster arc.
>
> **Update 2026-06-29g (Arc B R1 — `resize` event-keyword alignment (the 2026-06-28m audit
> follow-up); mean R1 0.9427 → 0.9433 (+0.0006), de/es/fr/it/pl/pt +0.0023 each, ZERO
> regressions.)** Re-grounding the post-#532 leverage map (NB: a raw-`parse()` map OVER-states any
> role with a schema DEFAULT — increment.quantity / wait.duration / repeat.quantity show phantom
> misses the gate's `fillSchemaDefaults` pass cancels; the genuinely-real non-behavior residues are
> halt.patient §7y, set.destination role-swap, send.destination call-split, ko/tr fetch) surfaced
> `on.event:literal` (24×). The dominant clean slice is the **`resize` event** in `window-resize`:
> the i18n dict emits a native verb (de `größeändern`, es/pt `redimensionar`, fr `redimensionner`,
> it `ridimensiona`, pl `zmieńrozmiar`) that the profiles never listed as the `resize` event, so
> it tokenized as a bare `identifier` → `event:expression` instead of en's `event:literal="resize"`.
> Exactly the 2026-06-28m mechanism. **Fix: add a `resize` event keyword to the 6 space-using Latin
> profiles** (`generators/profiles/{german,spanish,french,italian,polish,portuguese}.ts`). `resize`
> has no command homonym, so precision is flat (verified per-lang). **de/es/fr/it/pl/pt +0.0023;
> R0 1.000 / precision flat / R2 1.000 / parse-rate 3696/3696 unchanged.** Guard:
> `multilingual-roadmap-fixes.test.ts` "Event-keyword alignment" gained 6 resize cases
> (failing-without-fix verified: all 6 fail). **Remaining `on.event` residue (follow-up):** zh/ja/ko
> `resize` (`调整大小`/`マウス…`) need tokenizer EXTRAS (non-Latin, derive events in the tokenizer not
> the profile); `mousedown`/`mouseup` (repeat-until-event) align for es/pt/ja/ko but ru/uk SPLIT the
> underscore-compound (`мышь_вниз` → 3 tokens — a single-token tokenizer fix, same class as #510 tr).
>
> **Update 2026-06-29f (Arc B R1 — verb-FIRST event-head excision extends #530 to ar/tl; mean
> R1 0.9422 → 0.9427 (+0.0005), ar +0.0059 · tl +0.0059, ZERO regressions. ko/tr GROUNDED as a
> deeper, separate fix and DEFERRED.)** #530's fused-body re-parse skipped verb-FIRST fused
> patterns (`…-vso-verb-first`) outright (its guard #2): there the event head sits BETWEEN the
> verb and the trailing secondary clause, so the `[verb..clause-boundary]` slice RE-INCLUDES it
> and the standalone re-parse drops everything after the event. ar `fetch-event-ar-vso-verb-first`
> is exactly this: `احضر /api/user عند نقر كـjson` (`fetch /api/user on click as-json`) keeps
> `source` but drops `as {responseType}`. **Fix (in `buildEventHandler`, semantic-parser.ts):
> stop skipping verb-first; instead EXCISE the event head from the clause before re-parsing —
> the event TOKEN (located by `token.normalized === captured-event`, e.g. نقر→"click") plus an
> immediately-preceding `on`-marker keyword (`عند`, `kind==='keyword' && normalized==='on'`).** The
> standalone `fetch-ar` (markerlessFetch, `كـ` as-marker) then recovers `responseType:expression`.
> Excision is a NO-OP for every non-verb-first order (the event isn't inside `[verb..boundary]`),
> so the proven #530 path is byte-identical; and if the event token can't be located the swap is
> skipped (re-parsing with the event still inside is the #530 hazard). The block-body skip and the
> superset + strictly-more-roles guards are unchanged (qu's fronted-patient rail still holds).
> **tl (Tagalog, also verb-first VSO via `fetch-event-tl-vso-verb-first` + `fetch-tl`) gained
> identically — a bonus the handoff didn't predict.** R0 1.000 / precision flat / R2 1.000 /
> parse-rate unchanged; semantic suite green. Guard: `multilingual-roadmap-fixes.test.ts`
> "Fused event-handler body re-parses secondary role clauses" gained 2 ar responseType cases +
> 1 ar no-tail control (the 2 responseType cases fail without the fix; verified by stash).
>
> **ko/tr deferred — grounding corrected the handoff.** The handoff theorized ko/tr just need
> the clause "re-assembled from non-contiguous parts (fronted patient + verb + tail, minus the
> front event)". A standalone probe of the event-excised re-assembly disproved it: ko
> `/api/user 를 가져오기 json 로` and tr `getir /api/user json olarak` STILL parse to `source:literal`
> only — no responseType. Cause: the SOV standalone fetch pattern (`sovFetch`, `patterns/fetch.ts`
> ~L256) **deliberately OMITS responseType** ("its SOV surface marker varies per language: ja none,
> ko 로, tr olarak, hi के रूप में"). So ko/tr need TWO coordinated changes, not just a re-parse: (1)
> extend `sovFetch` with an optional trailing `{responseType} {asMarker}` clause per language, AND
> (2) SOV non-contiguous re-assembly in the fused body (the fronted source is BEFORE the event,
> outside `[verb..boundary]`). The superset guard keeps them regression-free today (the
> `[verb..boundary]`-only re-parse drops the fronted source → fails the superset check → no swap).
> A dedicated follow-up; (1) is the prerequisite and carries its own standalone-parse regression risk.
>
> **Update 2026-06-29e (Arc B R1 — fused-body fix LANDED; mean R1 0.9390 → 0.9422 (+0.0032),
> 13 langs +0.0059, ZERO regressions. The largest R1 win of the campaign since the URL fix.)**
> Supersedes 2026-06-29d (which reverted a single-site attempt): the fix DOES live in the
> action-fused re-parse (`buildEventHandler`), the earlier attempt just had the wrong VERB-finder.
> es fetch uses `fetch-event-es-vso` (verb-MEDIAL: `<event> buscar /api/user`), so the verb is NOT
> `all[pos-1]` (that's the already-consumed `source`); the original re-parse only checked pos-1, so
> it never fired. **Fix: find the verb by scanning BACK from the consumed region for the token whose
> normalized form is the captured action, reconstruct `[verb..clause-boundary]`, re-parse it through
> the command patterns, and swap in the richer node** — capturing the dropped secondary clauses
> (fetch's `as {responseType}` ×63, and more across the fetch family). Three guards make it
> zero-regression (each found via the gate / a clean before-after diff):
>
> 1. **block-body actions** (`repeat`/`if`/`for`/`while`/`unless`) skipped — their inline body is in
>    the same clause (`repeat forever toggle .pulse then …`), so re-parsing would SWALLOW the body
>    command (regressed repeat-forever in 17 langs on the first gate run).
> 2. **verb-FIRST fused patterns** (`…-vso-verb-first`, ar/ko/tr) skipped — the event head sits
>    BETWEEN the verb and the tail, so `[verb..boundary]` would re-include it (a separate residue).
> 3. **SUPERSET check** — swap only if every fused role reappears with the SAME value-type (mapping
>    the fused generic `patient` → the command's primaryRole, since `normalizeCommandRoles` relabels
>    later). This is the verb-FINAL SOV rail: qu `#score ta ñitiy pi yapachiy 10` has the patient
>    FRONTED (not in `[verb..boundary]`), so re-parsing `yapachiy 10` fills a DEFAULT `patient:me`;
>    the superset check rejects that swap (selector≠reference) and keeps the real `patient:selector`
>    (caught a qu −0.0017 on the second gate run; this guard zeroed it).
>
> **Result: de/es/fr/it/ms/pl/pt/ru/sw/th/uk/vi +0.0059, id +0.0028; R0 1.000 / precision 0.9743→
> 0.9744 (UP) / R2 1.000 / parse-rate unchanged.** semantic 6327 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "Fused event-handler body re-parses secondary role clauses"
> (6 cases incl. the qu superset rail + the repeat block-body rail; failing-without-fix verified —
> the 4 fetch cases fail). **Remaining fused-body residue (follow-ups):** verb-FIRST langs
> (ar/ko/tr) still drop secondary clauses (guard #2 — needs the event excised from the clause);
> `trigger.event` namespaced events and SOV `repeat` loop-keyword capture are still open (different
> shapes). The general lesson HELD: aligning the BODY parse toward the standalone Stage-2 parse is
> the right direction; the care is all in the three guards.
>
> **Update 2026-06-29d (Arc B R1 — fused-body fix ATTEMPTED (one bounded, gate-guarded cycle)
> and REVERTED; NO PR. Sharper scope for the next session.)** Implemented the "re-parse the full
> clause when it yields STRICTLY MORE roles than the fused capture" change at the action-fused
> re-parse site (`buildEventHandler`, semantic-parser.ts ~line 958, the original `roles.length===0`
> gate → `> Object.keys(roles).length`). Targeted verification showed **zero effect** on
> `fetch.responseType` in ANY language — so it was reverted (no benefit, delicate path). The reason
> sharpens the #528 picture: **the fused-body residue is MULTI-PATH, not one site.** Two distinct
> body parsers drop roles:
>
> 1. **action-fused path** (`buildEventHandler` line 930+, VSO/SOV fused `<cmd>-event-<lang>-vso`) —
>    the site I patched; but fetch in these langs doesn't even reach the swap (the re-parse via
>    `parseClause` doesn't recover responseType either).
> 2. **`parseBodyWithClauses` / `parseClause`** (line 1094 / 1295, the SVO/"traditional" body path) —
>    THIS is where es/de/fr fetch lose responseType. Proof: `parse('buscar /api/user como json …',
'es')` (no `on click` head, → `parseInternal` Stage 2) keeps `responseType`, but the SAME text
>    WITH the `en clic` head (→ `parseBodyWithClauses`) drops it. So `parseClause` uses a DEGRADED
>    matcher vs the full Stage-2 parse — the optional trailing `[como {responseType}]` group of the
>    hand-crafted `fetch-es` [105] pattern is not captured in the body path.
>
> The correct fix is to make the body-clause parser capture the SAME roles a standalone Stage-2
> parse of the identical clause would — likely by routing each split clause through the full
> command-match path rather than the trimmed `parseClause`. Both body paths carry load-bearing
> special-cases (§2 conditional fold, §452/§453 fused-body, js-block opacity, positional-`end`-noun,
> trailing-`unless` guard, verb-split), so this is a **dedicated arc with the full six-signal gate**,
> NOT a quick patch. (`forever` (#527) landed cleanly precisely because it rides the GENERATED
> repeat pattern's primary `loopType` slot — a primary role the body path DOES capture — whereas
> responseType/method/namespaced-event are SECONDARY clauses the body path trims.)
>
> **Update 2026-06-29c (Arc B R1 — KEY INSIGHT: the fused event-handler BODY path is a SHARED
> root cause of multiple residues; characterized, not yet fixed. NO PR — direction for the next
> session.)** Re-grounding after #527 (the forever win) put `fetch.responseType:expression` (63×,
> fetch-json / fetch-error-handling / fetch-do-not-throw) near the top of the non-behavior
> residues. It looked like a clean translation-side gap (EN captures `responseType`, every
> translation drops it) — the same winning direction as forever. But grounding revealed it is
> **the same fused-event-body problem that sank `trigger.event`** (2026-06-29 entry):
>
> - es **standalone** `buscar /api/user como json` → `fetch{source:literal, responseType:expression}`
>   ✓ (the hand-crafted `fetch-es` [105] pattern `buscar [de] {source} [como {responseType}]`
>   captures it perfectly; de/fr identical with `als`/`comme`).
> - es **inside an event handler** `en clic buscar /api/user como json entonces …` →
>   `fetch{source:literal}` ✗ — the `como json` responseType is DROPPED.
>
> Root cause: the fused VSO event-handler pattern (`<cmd>-event-<lang>-vso`, generated in
> `generators/event-handlers-vso.ts`) captures only the wrapped command's PRIMARY arg (a generic
> `{patient}`, relabelled to the command's primaryRole by `normalizeCommandRoles`) and leaves every
> SECONDARY role clause (`as {responseType}`, `via {method}`, fetch's whole tail; trigger's
> namespaced event; …) unconsumed. `buildEventHandler`'s re-parse only re-runs the full command
> patterns when the captured node has ZERO roles (semantic-parser.ts ~line 958) — fetch captured
> `source`, so the tail is handed to `parseBodyWithGrammarPatterns`, which finds no command in
> `como json` and drops it. So a command with ≥1 captured role but unconsumed secondary clauses
> loses those clauses **only in event-handler bodies** (the dominant corpus shape).
>
> **This single mechanism blocks: `trigger.event` (namespaced/identifier event), `fetch.responseType`
> (63×), and the SOV `repeat` loop-keyword capture (ja/ko/tr/bn/hi — the verb-first `繰り返し
{loopType}` pattern exists at prio 80 but the fused body never applies it).** A correct general
> fix — re-parse the FULL captured clause (verb → clause boundary) through the command patterns
> whenever a full re-parse yields MORE roles than the fused capture, not only when it yields zero —
> would unlock all three at once. It is DELICATE (the zero-role gate exists to avoid disrupting
> already-complete fused captures; the §2/§7y special-cases around it are load-bearing), so it
> wants a dedicated arc with the full six-signal gate, not a tail-of-session patch. **This is the
> highest-leverage next target — but a real arc, not a quick win.** (Behaviors remain the other
> large block, off-limits pending the source-migration. The remaining clean-ish vocab slices —
> `repeat N times` per-language HEAD pattern for `quantity:literal`, zh `重复 forever` HEAD pattern —
> are smaller and word-order-specific.)
>
> **Update 2026-06-29b (Arc B R1 — `repeat forever` loop-keyword recognition; mean R1
> 0.9382 → 0.9390 (+0.0008), 17 langs +0.0011, ZERO regressions).** The cleanest slice of the
> `repeat.loopType:literal` residue (123×). The i18n dict never translated `forever`, so the
> corpus leaves it the English word in most langs (`repetir forever`, `繰り返し forever`) and a
> native word in a few (ru `всегда`, vi `mãi mãi`, tl `magpakailanman`, ms `selamanya`, th
> `ตลอดไป`, bn `চিরকাল`, hi `हमेशा`). Unrecognized, the bare word typed `loopType:expression`
> (SVO) / `loopType:reference=me` (SOV) instead of EN's `:literal`. Fix: add the **corpus word**
> (English or native — taken verbatim from the corpus, so no guessing) as a `forever` keyword in
> each profile (`generators/profiles/*.ts`), next to `while`/`until`. The generated repeat
> pattern then types it `:literal`, matching EN — translations moving TOWARD the correct EN
> reference (the opposite of the abandoned `trigger.event` direction; this is why it is a clean
> win). **17 SVO/VSO langs gain (ar/de/es/fr/he/id/it/ms/pl/pt/qu/ru/sw/th/tl/uk/vi +0.0011); R0
> 1.000 / precision 0.9743 / R2 1.000 / parse-rate unchanged.** semantic 6321 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "repeat forever loop keyword recognized" (7 cases,
> failing-without-fix verified: 6 fail). **Excluded zh** (its generated repeat greedily grabs the
> body verb after `forever` as a phantom `quantity:literal` → a within-tolerance lossy flip; needs
> a HEAD-only `重复 forever` pattern — follow-up). **SOV langs ja/ko/tr/bn/hi recognize the keyword
> but their fused/SOV repeat pattern still drops it** (`loopType:reference=me` unchanged — no gain,
> no regression); capturing it is the SOV follow-up. **Next slices of the repeat residue:**
> `repeat N times` needs a per-language HEAD-only `repeat {quantity} times` pattern (the generated
> pattern grabs `N` as loopType, dropping `quantity:literal` — the `times` keyword alone doesn't
> restructure it); the for-each `repeat for X in Y` is the two-sided EN-phantom + SOV problem.
>
> **Update 2026-06-29 (Arc B R1 — `trigger.event:literal` investigated and ABANDONED as
> net-negative; NO PR. Negative result, documented so it is not re-attempted.)** Re-grounding
> the leverage map on fresh main (post-#525, mean R1 0.9382) ranked the top remaining
> `action.role:valueType` recall misses (aggregate over all 24 langs × all patterns):
> `repeat.event:literal` **138×**, `repeat.loopType:literal` **123×**, `halt.patient:reference`
> **74×**, `repeat.source:expression` **69×** (all behaviors), … `trigger.event:literal` **15×**,
> `if.condition:reference` 14×, `bind.source:property-path` 14×. The repeat cluster dominates but
> is the known two-sided for-each/until-event SOV work; behaviors (sortable 105 / draggable 81 /
> resizable 75 missed entries — the top three patterns) are off-limits (known-hard, migration
> pending). `trigger.event:literal` (15×) looked like the cleanest single-mechanism win, so it
> was the chosen target.
>
> **Root cause (correctly grounded):** `trigger init` — EN tokenizes `init` as a KEYWORD (it
> collides with the `init`-block keyword) → `tokenToSemanticValue` keyword branch → `createLiteral`
> → `trigger.event:literal`. All 15 other langs tokenize the (foreign) `init` as an `identifier`
> → `{type:'expression'}` → `:expression`. A pure value-type mismatch. The fused event-handler
> body path (`trigger-event-<lang>-vso`) captures the arg under the generic `patient` role, which
> `normalizeCommandRoles` relabels to `event` (send/trigger→event) — so the single correct
> coercion site is `normalizeCommandRoles` on the FINAL tree (the matchRoleToken role-site only
> covers standalone commands, NOT the fused body — verified: standalone `disparar init` coerced
> but `en cargar disparar init` did not).
>
> **Why it was abandoned (net-NEGATIVE R1 at every scoping, verified against a byte-identical
> clean-main baseline regen — so the deltas are real, not noise):**
>
> - Broad coerce (any non-`on` command event, simple identifier → literal): **mean R1 −0.0022, ALL
>   23 langs drop.** Cause: `send-with-detail` (`send update(value:42)`) — EN splits event=`update`
>   (simple → coerced literal) + detail, but every translation captures the whole call
>   `update(value:42)` as one expression (a call, never coerced). EN→literal vs translation→
>   expression = fresh 23-lang mismatch.
> - Scope to `trigger` only: **mean R1 −0.0007** (4 SOV gains, 19 drops). The drops are behaviors:
>   EN keeps the NAMESPACED `trigger draggable:start` → `:expression` (the `:` excludes it from the
>   simple-identifier regex), but translations STRIP the namespace to a bare `draggable` (a known
>   behaviors-migration parse gap) → simple → coerced to literal → mismatch.
> - Scope to `trigger` AND exclude inside-behavior nodes (`inBehavior` flag): **STILL mean R1
>   −0.0002** (15 gains, 8 persistent drops: ms/ru/th/tl/uk/vi −0.0015, bn/hi −0.0005). The drops
>   keep migrating as the scope narrows — other per-pattern translation event quirks beyond
>   behaviors. Not converging to a clean win.
>
> **Lesson (the load-bearing one):** R1 is recall of EN's role signature, so making the EN
> reference MORE correct (event name → literal) DROPS R1 wherever the translations parse the event
> differently (namespace-stripped, captured-as-call, left-as-identifier). Unlike the URL/event-
> keyword/bind wins — which aligned a translation-side TOKENIZER/DICT gap toward an already-correct
> EN reference — `trigger.event` would move the EN reference AWAY from buggy translations. The real
> fix is upstream **translation-side** event parsing (preserve the `:namespace` in behavior trigger
> events; split `update(value:42)` into event+detail like EN), which belongs to the behaviors-source
> migration, not an R1 coercion. **Deprioritize `trigger.event`** until those land. (The reusable
> insight: a value-type coercion is only a clean R1 win when EN is the OUTLIER that translations
> already agree against — here EN was the _correct_ one and translations disagreed in many ways.)
>
> **Other findings from this re-grounding (for the next session):** (1) The EN for-each reference
> `repeat for item in .items` produces a PHANTOM `event:literal=in` (the `in` iteration keyword
> mis-captured as an event) AND drops `.items` entirely — same greedy-generated-repeat bug PR #521
> fixed for `times`/`forever`. Removing the phantom is a candidate but measured net-zero (drops the
> `event` miss but the cleanest HEAD-only pattern that consumes `in .items` adds a `source`/
> `destination` miss the translations don't match — the two-sided for-each problem). (2) The
> `repeat.loopType:literal` (123×) residue is a **loop-keyword vocab gap**: the corpus leaves
> `forever`/`times` UNTRANSLATED in most langs (es `repetir forever`, ja `繰り返し forever`) — the
> es i18n dict has `while`/`until` but NOT `forever`/`times`, and `repeat-while` consequently parses
> `loopType:literal=while` correctly while `repeat-forever` degenerates to `loopType:reference=me`.
> Fixing it is two-sided (i18n dict + semantic profile per lang + corpus regen) — the real next big
> lever, but a dedicated multi-file arc.
>
> **Update 2026-06-28n (Arc B R1 — URL tokenization in 14 tokenizers; mean R1 0.9259 → 0.9382
> (+0.0122), the LARGEST single-PR win of the campaign by ~3×, 14 langs +0.0137–0.0218, ZERO
> regressions).** Re-grounding after #524 found the biggest remaining residue was
> **`fetch.source:literal` (188×, 19 langs)** — and it was a one-line-per-tokenizer gap, not a
> per-pattern problem. A fetch source URL (`/api/data`) tokenized as a bare `identifier` in 14
> space-using langs → the role typed `expression`, mismatching the en reference's `literal`.
> Root cause: those 14 tokenizers' `classifyToken` (`tokenizers/*.ts`) **lacked the
> `startsWith('/')|'./'|'http' → 'url'` line** that en/fr/hi/ja/ko/zh/ar/bn/qu/tr already
> carried (the working vs broken split matched the URL-line presence EXACTLY). Added the line to
> de/he/id/it/ms/pl/pt/ru/es/sw/th/tl/uk/vi. Lifts `fetch.source` across fetch-basic/-json/
> -with-method/event-debounce. **14 langs +0.0137–0.0218 (de/es/he/id/it/ms/pt/sw/th/tl/vi
> +0.0218; pl/ru/uk +0.0137); R0 1.000 / R2 1.000 / parse-rate 3696/3696 / precision all
> unchanged.** semantic 6314 green. Guard: `multilingual-roadmap-fixes.test.ts` "URL tokenization
> across space-using langs" (15 cases; failing-without-fix verified: 14 fail). **Method lesson
> (recurring this arc): the biggest R1 levers keep being shared mechanism gaps (a missing
> tokenizer line, a broken en reference, a dict/profile misalignment) masquerading as 188 separate
> drops — re-grounding the top aggregate drop to its single root cause each time has paid off far
> better than per-pattern fixes.** Remaining big aggregate drops (next candidates): `repeat.event`
> / `repeat.loopType` (the two-sided for-each/until-event SOV work, ~132+116×), `halt.patient:
reference` (70×, form-submit-prevent + behaviors), `set.destination:property-path` (47×, the
> trailing-`from` SOV role-swap), `send.destination:reference` (42×).
>
> **Update 2026-06-28m (Arc B R1 — cross-language event-keyword alignment sweep; mean R1
> 0.9218 → 0.9259 (+0.0041), the biggest single-PR MEAN win of the campaign, 8 langs +, ZERO
> regressions).** Grounding the new laggard (uk, after the bind cluster closed) found a
> **systemic dict/profile misalignment**: the i18n dict emits one event word but the semantic
> profile/tokenizer lists a different one, so the unrecognized word tokenized as a bare
> `identifier` and the event role typed as `expression` instead of `literal` (the `on.event`
> R1 residue). A sweep across the 6 common events found 10 misaligned (lang, event) pairs:
> **submit** uk `надсилання`; **load** es `cargar` / fr `charger` / it `carica` / ru `загрузка`
> / uk `завантаження` / ja `読み込み` (6 langs!); **change** fr `changer`; **input** pl `wejście`
> / id `masukan`. Fix: register each i18n-emitted form as an event alternative in the semantic
> profile (`generators/profiles/*.ts`) — or, for ja, the tokenizer EXTRAS
> (`tokenizers/japanese.ts`, which derives events there, not from the profile). `load` is purely
> an event (no command-collision risk); the verb forms (`cargar`/`charger`/`changer`) sit
> alongside existing verb alternatives (`modifier`, `someter`), so no precision hit (verified:
> precision flat in every lang). **uk +0.0200 (the laggard), es/fr/it/ru +0.0110, id/pl +0.0115,
> ja +0.0076; R0 1.000 / R2 1.000 / parse-rate 3696/3696 unchanged.** semantic 6299 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "Event-keyword alignment" (10 cases, failing-without-fix
> verified: all 10 fail). **Method lesson: a single language dominating the worst-pattern list
> across UNRELATED patterns (uk in 6) signals a systemic per-language cause, not 6 one-offs —
> grounding the common role-diff (`on.event:literal`→`expression`) found it in one pass.** A
> broader audit of i18n-emitted-vs-profile event words across ALL 24 langs (beyond the 6 events
> swept here) is a cheap follow-up — the same probe (`ev-sweep`) extends to keydown/keyup/focus/
> mouseover/etc.
>
> **Update 2026-06-28l (Arc B R1 — English split-`'s` possessive capture; hi CROSSES 0.90
> (0.8899 → 0.9034), 7 langs +0.0068, mean 0.9195 → 0.9218, ZERO regressions).** Completing the
> bind cluster surfaced ANOTHER **broken en reference**: `bind $color to #picker's value` parsed
> the source as a bare `#picker` selector, **dropping `'s value`** — because the en tokenizer
> splits the possessive clitic `'s` into two tokens (`'` + `s`) after a selector, which the
> single-token `'s` check in `tryMatchSelectorPropertyExpression`/`tryMatchPossessiveSelectorExpression`
> (pattern-matcher.ts) missed. ja/ko/qu/bn/tr/zh keep their possessive (の/의/…) whole and captured
> the full property-path, so the en reference dropping it capped `bind-explicit-property` /
> `bind-non-form-display` (en `bind.source:selector` vs SOV `property-path`). Two-line fix in the
> possessive matcher: (1) recognize the split `'` + `s` pair as the English possessive; (2) accept
> a `keyword` property after the English `'s` (vi's `value` → `giá trị` is a single KEYWORD token,
> not an identifier — without this vi REGRESSED -0.0034 as the only lang still capturing a bare
> selector; the keyword case lifted vi back to parity → zero net regression). **hi 0.8899 → 0.9034
> (crosses 0.90 — the first SOV lang to clear it!), ja/ko/qu/bn/tr/zh +0.0068 each, mean +0.0024;
> hi precision +0.0065; R0 1.000 / R2 1.000 / parse-rate 3696/3696 unchanged.** ALSO clears the
> hi bind-explicit-property/non-form-display (the possessive source now matches the bind pattern →
> the #522 bare-event command-peek succeeds → bind, not phantom-on). semantic 6289 green. Guard:
> `multilingual-roadmap-fixes.test.ts` "English split `'s` possessive captures the property" (4
> cases; failing-without-fix verified: 3 fail). **The bind cluster is now fully closed** (all 4
> patterns faithful across SOV langs). Methodology note: the vi -0.0034 was UNDER the 0.02 gate
> tolerance (gate would have passed) but was caught by a manual per-lang A/B diff — re-grounding
> before shipping matters even when the gate is green.
>
> **Update 2026-06-28k (Arc B R1 — hi `bind` two-part fix; hi 0.8764 → 0.8899 (+0.0135),
> the biggest single-LANGUAGE jump of the campaign, + hi precision +0.0075).** The doc's
> "bind is fragile, defer" framing was RIGHT about the mechanism but the fix turned out
> tractable with a tight gate. Two coordinated fixes (mirrors the doc's "two-part" prediction):
>
> 1. **i18n — hindiProfile `bind-to` verb-final rule.** ja/ko/zh/tr/bn already carried a
>    `bind-to` rule; **hi was the only SOV gap**, so the transformer emitted bind VERB-MEDIAL
>    (`$greeting को bind #name-input में`), which the generated verb-final SOV bind pattern
>    (`{destination} को {source} में bind`) never matched. The rule (roleOrder
>    `['patient','destination','action']`, like put-into/set-to) emits verb-final
>    `$greeting को #name-input में bind`.
> 2. **semantic — bare-event guard: prefer a command over a phantom REFERENCE event.** Even
>    verb-final, the fronted `$greeting` (a `$variable` **reference**) was grabbed by the
>    `event-<lang>-bare` pattern as the event → a phantom `on` handler (the bind.\* rf=0.00).
>    A reference can NEVER be an event name. Extended the existing bare-event guard
>    (`semantic-parser.ts`, the same one that handles the unknown-event SOV case): when the
>    bare capture is a `reference`, SOV extraction finds no real event, AND a command matches
>    the full stream (rewind via `tokens.reset(eventStart)` since matchBest re-consumes the
>    winner), prefer the command. Tightly gated — fires ONLY on a reference mis-anchor with a
>    matching command, so real bare events (`.active को क्लिक पर टॉगल`, custom identifiers) are
>    byte-identical (verified: 3 regression guards + gate).
>
> Result: **hi bind-auto-detect + bind-two-way 0.00 → 1.00** (the two with a simple `#selector`
> source). **hi-only** in the gate (ja/ko/qu/bn/tr already parsed bind via their existing rules);
> hi R1 +0.0135, **hi precision +0.0075** (the phantom-`on` command is gone), R0-recall 1.000 /
> R2 1.000 / parse-rate 3696/3696 unchanged, **zero regressions** (no other lang moved). Mean R1
> 0.9189 → 0.9195. semantic 6285 + i18n 893 green. Guards: `grammar.test.ts` "bind-to verb-final"
>
> - `multilingual-roadmap-fixes.test.ts` "SOV bind: bare-event guard prefers a command" (both
>   failing-without-fix verified). **Remaining bind residue (deferred, NOT hi-specific):**
>   `bind-explicit-property` / `bind-non-form-display` have a **possessive source** (`#picker's
value`, `#status's textContent`) that caps EVERY SOV lang at 0.50 (ja/ko/qu/bn/tr drop
>   `bind.source`; hi can't match the English-`'s` possessive at all → stays 0.00). That's a
>   possessive-source value-typing fix, cross-language, separate arc.
>
> **Update 2026-06-28j (Arc B R1 — en `repeat N times` / `repeat forever` HEAD-only
> patterns; R1 0.9164 → 0.9189, the biggest single R1 win yet, ALL 23 langs +).** The single
> largest R1 residue (`repeat.event:literal` 42× + `repeat.loopType:literal` 39×, all SOV langs)
> was grounded to a **broken en REFERENCE**, not an SOV deficiency — the same shape as the
> `halt the event` fix. The generated positional `repeat` pattern greedily captured the loop
> BODY into bogus roles: `repeat 3 times add "…" to me` → `loopType=3, quantity="times",
event="add"` (the body verb!), and the `add` command was **dropped entirely**. NO other
> language reproduces that `repeat.event:literal` garbage — they all DROP it (verified across
> hi/ja/ko/qu/bn/tr AND es/fr/de/pt/zh/it/ru) — so it dragged R1 down in every language. Fix:
> two **head-only handcrafted en patterns** (`repeat {n} times`, `repeat forever`, priority 110)
> that match ONLY the loop head and leave the body for the clause loop to parse — mirroring the
> existing `repeat until event {event}` pattern (the Explore-agent map confirmed: a head-only
> pattern at priority > the generated 100 lets the next clause-loop iteration recover the body
> as a sibling command). **+0.0011–0.0028 per lang, EVERY language up, mean 0.9164 → 0.9189;
> R0-recall 1.000 / precision 0.972 / R2 1.000 / parse-rate 3696/3696 all unchanged.** R2-safe
> by construction (no `repeat-*` pattern is in `EXECUTION_SUBSET`). Two facets made it land
> zero-regression: (a) en's own `add "<htmlLiteral>" to me` body ALSO fails to parse (an
> es-style add-literal gap), so `repeat-times` en gains NO body role → no regression for the
> SVO body-droppers; (b) `toggle .pulse` (selector patient) DOES parse, so `repeat-forever` en
> gains `toggle.*` which the SOV langs already capture → pure recall gain. Guard:
> `multilingual-roadmap-fixes.test.ts` "en repeat HEAD-only patterns" (3 cases, failing-without-fix
> verified: 2 fail). semantic 6280 + i18n 892 green.
>
> **Grounded-but-DEFERRED (this session re-grounded all three; the doc's old framing was partly
> wrong — re-read before coding):**
>
> - **`repeat for {var} in {coll}` / `stagger-animation` — the messy two-sided case (NOT shipped).**
>   A head-only `repeat-en-for-each` pattern was prototyped and **dropped**: it's net-zero on R1
>   (removing the en `event="in"` garbage is exactly offset by a NEW `repeat.source:selector`
>   guaranteed-drop no lang captures) and showed per-pattern noise on stagger (it/ru/uk to 0.38).
>   The real for-each gap is the **loopType value-TYPE disagreement**: en emits
>   `repeat.loopType:literal` ("for") while SOV emits `repeat.loopType:reference` (the loop var) —
>   a genuine two-sided alignment, lower ROI.
> - **`bind` (4 hi patterns) — CONFIRMED fragile, the doc was RIGHT.** Probed all three verb-final
>   hi forms (untranslated `bind`, translated `बाइंड`/`बांधें`): every one still produces a phantom
>   `on` handler (`actions=[bind, on]`, `bind.destination:literal`) vs ja's clean
>   `bind.destination:reference, bind.source:selector`. ja/ko/qu/bn/tr all parse the identical
>   token shape at r=1.00; hi alone mis-anchors the fronted `$greeting` as an event. Needs the
>   fragile SOV event-anchor work (HANDOFF-sov-event-anchor.md). hi-only, ~8 role-sig entries.
> - **`set.destination:property-path` (26×) — NOT clean value-typing; it's a ROLE-SWAP.** The
>   `two-way-binding` residue (`set #x.innerText to "…" + my value`, with a trailing `from #y`
>   source clause) parses in SOV with destination↔patient SWAPPED and a spurious `style` role —
>   because the trailing `from #firstName` source clause + the complex `+` value disrupt the SOV
>   set role assignment. A MINIMAL `set #x.innerText to "y"` types destination as property-path
>   correctly in all of en/hi/ja/ko — so it's the trailing-source-clause SOV reorder, not value
>   classification. Fragile (same family as bind's event-anchor).
>
> **Update 2026-06-28i (Arc B R1 — `set-to` verb-final rule; R1 0.9143 → 0.9164, the
> biggest single R1 win, all 5 SOV laggards +).** The `set` cluster — initially mis-diagnosed
> as a two-sided, intractable role-model problem (a tested `applySetRoleSwap` regressed SVO
> because the transformer's "backwards" set labels are load-bearing for SVO marker placement) —
> turned out to be the **same word-order issue as put/bind**: NO profile carried a `set`
> rule, so ja/ko/bn/tr/hi emitted set VERB-MEDIAL (`X को सेट Y में`), which the verb-final
> generated SOV set pattern (its `markerOverride` already aligns को→destination / में→value)
> never matched → set parsed to no/swapped roles. Added a `set-to` verb-final rule
> (`roleOrder: ['patient','destination','action']`) to the 5 SOV profiles — NO role change, SVO
> untouched. **+0.0073–0.0117 per laggard (ja +0.010, tr +0.012, ko +0.009, bn +0.010,
> hi +0.007); R0-recall 1.000 / precision 0.972 / R2 unchanged.** The rule carries an
> **inline-if guard**: a set whose value sweeps up a trailing `end` (`if … then set X to Y end`,
> destination parsed as `"minWidth end"`) is left verb-medial — verb-final reorder would push
> the set verb past `end` and drop the `if` (caught as a bn behavior-resizable faithful→lossy
> flip, then fixed). i18n suite 892 + semantic 6277 green; gate clean. Guard: `grammar.test.ts`
> "SOV Transformation — set-to verb-final" (5 verb-final + 5 inline-if cases, failing-without-fix
> verified). Lesson (again): test the put-style word-order rule FIRST before theorizing a deeper
> role-model fix — the swap was a red herring. Remaining set residue: finer value-type typing
> (property-path / @attr) at rf 0.5–0.75.
>
> **Update 2026-06-28h (Arc B R1 — hi `put-into` word-order rule; hi 0.8669, zero
> regressions).** Grounding the worst laggard (hi) after the `halt` fix surfaced a contained
> bug: the **hindiProfile was missing the `put-into` grammar rule** that every other SOV
> profile (ja/ko/tr/bn) carries. Without it, `put X into Y` fell through to a verb-MID default
> (`X को रखें Y में`) which the semantic parser mis-read (destination/patient swap/mistype —
> the put.\* R1 residue). Added the rule (mirrors ja's, `roleOrder:
['patient','destination','action']`) → hi emits the verb-final `X को Y में रखें` and parses
> faithfully. **hi-only** (other SOV langs already had it; qu works via its default),
> **hi 0.8646 → 0.8669 (+0.0023)**, R0/precision/R2 unchanged, i18n suite 882 + semantic 6277
> green. Guard: `grammar.test.ts` "Hindi Transformation (SOV) — put-into verb-final"
> (failing-without-fix verified).
>
> **Grounded-but-deferred next R1 arcs (re-ground before coding; all bigger/riskier):**
>
> - **`set` — FIXED 2026-06-28i (set-to verb-final rule; see the dated note above).** Was the
>   biggest cluster (~18 hi entries, 5 SOV langs). The first instinct — swap set's
>   patient↔destination labels on the en parse — was tested and REVERTED because it regressed
>   SVO (the "backwards" labels are load-bearing for SVO marker placement). The real cause was
>   the **same as put/bind: no profile had a `set` word-order rule, so ja/ko/bn/tr/hi emitted
>   set VERB-MEDIAL** (`X को सेट Y में`) which the verb-final generated SOV set pattern (whose
>   markerOverride already aligns को→dest / में→value) never matched. A `set-to` verb-final rule
>   on the 5 profiles fixed it (no role change, no SVO touch). The remaining set residue is
>   finer value-type typing (property-path / @attr) at rf 0.5–0.75.
> - **`bind` (4 hi patterns, rf 0.00) — two-part, hi-only.** hindiProfile also lacks a
>   `bind-to` rule (verb-mid); ADDING it fixes word order BUT the verb-final hi bind then still
>   mis-parses — the fronted `$greeting` is anchored as a bare `on` event (`को#name-input`
>   smushed into a literal destination): the **SOV event-anchor** path
>   (HANDOFF-sov-event-anchor.md). ja/ko parse the identical token shape correctly. Needs the
>   fragile event-anchor work; deferred.
> - **`repeat` (~24 hi entries, ALL langs) — deepest.** The **en reference itself is garbage**:
>   the schema positional pattern stuffs `repeat 3 times add …` into
>   `loopType=3, quantity="times", event="add"` (body verb captured as `event`); the AST mapper
>   reads `quantity`, so even execution is wrong. SOV side equally broken
>   (`loopType:reference="me"`). Two-sided structural rewrite (handcrafted per-form patterns
>   like the existing `until-event` ones, en + SOV) + re-baseline. Highest reward, highest risk.
>
> **Update 2026-06-28g (Arc B R1 — `halt the event` article skip; avgRoleFidelity
> 0.9125 → 0.9142, all 23 langs +, zero regressions).** First convergent burn-down of
> the R1 value-type residue. Grounding the `halt.patient` cluster (the most consistent
> cross-language signature: en `halt the event` → `patient:literal="the"`) showed the **en
> reference itself was wrong** — it captured the article `the` and dropped the event, so every
> faithful translation mismatched it. One defect, two facets in `skipNoiseWords`
> (`pattern-matcher.ts`):
>
> - **en:** `event` tokenizes as a `keyword` (not selector/identifier), so the existing
>   article-skip missed it. Added an en case: skip `the` before a valid reference word
>   (`isValidReference`) → `patient:reference="event"`. (`the default`, a non-reference, stays
>   `literal`; bare `halt` unchanged.)
> - **SVO/VSO:** the transformer leaks an untranslated `the` before the translated event word
>   (`the evento entonces …`); the pre-existing non-en skip only fired before a SOV **particle**,
>   so these kept `patient:expression="the"`. Extended the non-en skip to also fire before a
>   **clause boundary** (then/and/or/end/EOF) — but **never before a command verb**, preserving
>   the §7y guard (tr form-submit-prevent's `the olay çağır …` keeps `the`; body parse intact).
>
> Result: en + all 23 priority langs now agree on `halt.patient:reference` for halt-propagation.
> **avgRoleFidelity +0.0014–0.0029/lang** (SOV laggards hi/ja/ko/qu/bn/tr +0.0025–0.0029; every
> SVO/VSO +0.0014–0.0015), **R0-recall 1.000 and R0-precision 0.972 both unchanged**, semantic
> suite 6262 pass, gate `--regression` green. Guard: `multilingual-roadmap-fixes.test.ts`
> "`halt the event` skips the leaked article" (15 cases incl. the §7y verb-after invariant +
> `the default`/bare-`halt` controls; verified failing-without-fix: 8 fail). Remaining R1
> residue (now hi 0.8646 the laggard): the **`repeat` loop-role garbage** (en reference itself
> mis-parses `repeat N times`/`for X in Y` — body verb captured as `repeat.event`, biggest
> cluster, two-sided en+SOV structural fix) and the **SVO `halt the event` → still `expression`
> for VSO verb-after forms**. See HANDOFF-r1-value-type-residue.md.
>
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

## Input coverage — the confidence model's blind spot (opened 2026-07-09)

`scoreRoleCoverage` (`packages/semantic/src/parser/confidence-model.ts`) scores how many of
**the pattern's own** roles were filled, never how much of the **input** was consumed. A short
pattern that fills its roles scores 1.0 while its unmatched tail is discarded in silence.
Stages 0 and 0.5 of `parseInternal` are prior workarounds for exactly this; `fetch … with { … }`
was the third instance.

Landed as a **diagnostic only** — the parser emits an `unconsumed-input` warning-severity
diagnostic (surfaced as `compile(...).meta.warnings`); no score and no parse outcome changed.
Measure it with the read-only sweep, which never gates and never writes a baseline:

```bash
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --diagnose-coverage
```

**First measurement (2026-07-09, browser-priority, 3696 rows): 158 fire = 4.3%**, evenly spread
(SVO ~4.5–5.8%, SOV six ~1.9%). The samples were **not** benign residue — they were the same class
of defect, e.g. `eventsource ChatStream from /events on message put it into #messages end end`
matching `eventsource-en-generated` at **confidence 1.00** with the whole 11-token block body
dropped. `socket` and `worker` did the same. (Note those three, plus `live`/`intercept`, were the
schemas that warned `SCHEMA_NO_REQUIRED_ROLES` — zero required roles means role coverage is
hard-coded to 1.)

**Burn-down (complete): 158 → 0.** #628/#629 (the five body-dropping feature blocks) took it to
38; #630 (bind's possessive source, 7 languages) to 24; #632 (top-level command sequence) to 0.
Full attribution in `HANDOFF_top-level-command-sequences.md` (RESOLVED). Re-confirmed
**2026-07-11** on post-#638 `main` (`0a4c043f`), fresh ordered build + populate: **0 / 3696**
in all 24 languages.

~~**Deferred sub-task** (known limitation, explicitly not taken in the sequence arc): the
diagnostic fires only on the **Stage-2 plain-command path**.~~ **DONE — Arc C (2026-07-13,
`feat/arc-c-input-coverage`): floor → total.** Every `parseInternal` stage is now measured:
the body/segment parsers (`parseClause`, `parseBodyWithClauses`, `parseBodyWithGrammarPatterns`,
`buildEventHandler`'s fused tail) record each token run they discard into a per-parse coverage
frame; committed frames attach to the parse's node and hoist to the top node (the only surface
the sweep and `compile(...).meta.warnings` read), while speculative parse attempts (the `try*`
extractions, conditional folds, re-parse swaps) roll back on discard — so only committed parses
fire, per sub-stream (SOV/VSO segment re-tokenization accounts against its own segment), with
no double-count against the Stage-2 emission (mutually exclusive by control flow; locked by
tests). A residue filter keeps optional tokens silent: particles, conjunctions,
`then`/`end`/`else` boundaries (incl. `closesTrackedBlock`-annotated closers), role-marker
surfaces (multi-word markers split per token), and the leaked rendered as-postpositions
(hi `के रूप में`, tr `olarak`, qu `hina`) whose values the trailing reclaims already captured.

**Red→green probes** (Batch 3's three known-dropped constructs, locked in
`packages/semantic/test/input-coverage-stages.test.ts`): handler-wrapped
`repeat 3 times break end` / `continue` (en + qu render) parsed break-less at confidence 1.0
with ZERO diagnostics before; each now fires with the dropped span. Top-level forms fire
exactly ONCE (Stage-2 path — the no-double-count control). Two correct non-firings locked too:
the in-handler `if #a and #b log "ok"` folds faithfully (the and-conjunct drop is
top-level-only), and ja's in-handler break consumes every token (its defect is role fidelity,
not input coverage).

**Arc C sweep verdict (2026-07-13, browser-priority, fresh ordered build + populate):**
red side 0 / 3696 (the Stage-2-only floor, re-confirmed) → instrumented **676 / 3696 (18.3%)**
→ **670 / 3696 (18.1%)** after Batch 1 (the one pure-residue class: 6 rows firing ONLY the
leaked as-marker after their responseType was reclaimed — hi ×4, tr ×2 — verified row-by-row
before silencing). All 670 remaining firings are attributed; **none can be burned down inside
this arc**, because every one is a genuine construct-family drop whose fix changes parse
outcomes (forbidden here — diagnostic-only; the eight-signal ratchet stayed bit-stable).
Most map to families this file had already named:

| family (per-language rows) | rows | patterns | status |
| --- | --- | --- | --- |
| fetch options tail (`with {…}` / naked named-args) | ~~78~~ **0** | fetch-with-headers ×24, fetch-with-method ×18, fetch-with-method-body ×18, fetch-formdata ×18 | **RESOLVED — Arc E** (2026-07-13, naked named-arg fold ×24; release-bar stretch item 5 ✓) |
| def/behavior param phrases + handler-head qualifiers (`(clientX, clientY)`, `from <source>`, key-filters) | 102 | worker-basic ×24, behavior-sortable ×23, behavior-resizable ×21, modal-close-escape ×20, behavior-removable ×6, window-scroll ×3, window-keydown ×3, focus-trap ×2 | NEW — named here |
| event-modifier phrases NOT applied (`once`, `debounced/throttled at Nms` — probe: `eventModifiers` is null, the semantics are genuinely lost, en included) | 69 | window-resize ×23, event-debounce ×16, event-throttle ×16, event-once ×14 | NEW — named here; highest-leverage single fix |
| positional/range qualifier tails (`0 to 5 of #note`, `in closest <form/>`, `for me`) | 70 | pick-text-range ×23, take-class-from-siblings ×23, first-in-parent ×17, last-in-collection ×6, toggle-aria-expanded ×1 | pick = named R1 deferral (Family F); rest NEW |
| loop-head condition/keyword tails (`< 10`, `with index`, zh `forever`, id `_`-compound split) | 51 | repeat-while ×24, stagger-animation ×24, repeat-until-event ×2, repeat-forever ×1 | NEW — named here |
| SOV/en trailing in-me destination glue | 51 | form-disable-on-submit ×19 (en-symmetric!), input-validation ×6, fetch-loading-state ×6, tabs-basic ×5, tabs-content ×5, if-empty ×5, repeat-times ×5 | = named R3 family (§ value-bug families) |
| reactive `when … changes` heads | 48 | when-value-changes ×24, when-multiple-changes ×24 | = named reactive `on.event` deferral |
| set source-qualifier tails (`from #firstName` on bind rows) | 44 | two-way-binding ×22, computed-value ×22 | NEW — named here |
| show/hide style-capture (`with *opacity`) | 38 | show-with-transition ×19, hide-with-transition ×19 | = named Batch-3 leftover |
| go-url destination (`"/page"`) | 18 | go-url ×18 | = named Batch-3 leftover |
| swap with-phrase | 6 | swap-content ×6 | = named F6 (wontfix) |
| command-option tails, misc (render/morph `: $data` ×36 — **resolved by Arc E**, the render rows' naked with-pair folds via the same mechanism as fetch — `beep! <expr>` ×18, unless operator tail ×18, tell to-infinitive ×16, do-not-throw leak ×3, fetch-as id ×1+2, sw async vocab gap ×1) | ~~95~~ **59** | ~~render-template-with-data ×18, morph-with-template ×18,~~ beep-debug-expression ×18, unless-condition ×18, tell-command ×16, fetch-do-not-throw ×3, fetch-error-handling ×2, async-block ×1, fetch-json ×1 | NEW — named here; render/morph rows RESOLVED (Arc E) |

Nearly all families are **en-symmetric** (the en reference drops the same span, so R0/R1
never saw them — exactly the blind spot this diagnostic exists to expose). Full attribution
JSON + probe logs archived in the arc transcript; per-pattern detail reproducible via the
sweep. **Arc D's "all stages measured" precondition is MET.** Note for Arc D: at 18% corpus
firing rate, a naive coverage penalty would move MANY scores — the per-family table above is
the sizing input for how to phase it.

> **Arc E update (2026-07-13):** total 670 → **556 / 3696 (15.0%)**. Delta fully
> attributed: fetch options tail −78 (the arc target) + render naked with-pair −36
> (render-template-with-data ×18 + morph-with-template ×18 — that pattern's raw is a
> `render … with row: $data then morph …` line, so both rows are the same render class,
> folded by the same mechanism). Every OTHER pattern's fired-row count is bit-identical
> to the Arc C red table — no new families, no new firings (per-pattern diff in the arc
> transcript, `green-per-pattern.txt`).

**Diagnostic-only proof (2026-07-13):** `--regression` exit 0 on a fresh ordered build +
populate; `--save-baseline` attribution check ran, and every delta was benign or
pre-existing: timestamp/commit (expected), bundleSize 503726 → 508231 (the instrumentation
code itself), JSON array reflow (writer formatting), and ONE confidence value —
it `blur-element` 1 → 0.714 — which reproduces bit-for-bit on the COMMITTED parser with the
instrumentation stashed, i.e. pre-existing drift from the vocab Batches 1–4 profile changes
(confidence isn't a ratcheted signal, so those arcs never re-baselined). Zero deltas
attributable to Arc C; committed baseline restored untouched. Semantic suite 7082 green
(probes locked in `input-coverage-stages.test.ts`; `realtime-blocks` worker def-param firing
locked as a named finding), testing-framework 252 green.

Before turning this into a **scoring penalty** (which would move the baseline across all 24
languages, so it needs its own PR):

1. Thread consumed/total into `ConfidenceContext` — it currently has no token list, no input
   length, no consumed count. This changes the injectable `ConfidenceModel` contract.
2. Compute coverage for **all** stages, or the penalty asymmetrically biases pattern selection
   toward whichever stage isn't measured.
3. Re-run `--diagnose-coverage` and confirm the firings are genuine drops, not optional-token
   residue, per language.
4. ~~Fix the `SCHEMA_NO_REQUIRED_ROLES` commands first~~ — **precondition met** (#628/#629
   folded the five zero-required-role feature blocks' bodies); a coverage penalty no longer
   swings them.
5. Regenerate the baseline on a fresh dist + freshly `populate`d patterns.db, and confirm the
   eight-signal ratchet stays green.

If it lands well, re-evaluate whether Stages 0 / 0.5 can be simplified — they exist only because
this signal was missing.

### ~~Deferred~~ RESOLVED: multilingual `fetch … with { … }` (Part 2b)

**RESOLVED (2026-07-13, Arc E — `feat/arc-e-fetch-with`,
`docs-internal/HANDOFF_arc-e-fetch-with.md`).** The naked named-arg form is now captured
in ALL 24 languages in one change (the all-or-nothing R1 constraint below, honored):

- **Shared fold** (`packages/semantic/src/parser/naked-args-fold.ts`): a run of
  `key:value` pairs — comma- or space-separated, values single-token or depth-balanced
  `{…}`/`(…)` runs — folds to ONE object-literal-shaped expression raw
  (`{method:"POST", body:form}`), byte-identical across languages. Runs are rebuilt
  with offset-exact gaps, so tokenizer-shattered words re-fuse (qu `FormDa`+`ta` →
  `FormData`, hi `के_रूप_में`, zh `作`+`为` → `作为`).
- **Pattern-matcher hook**: the fold fires in fetch's expression-only `style` slot
  (en, incl. the `fetch-en-with-options-as` handcrafted pattern). The braced-run fold
  is untouched (braced captures stay byte-identical).
- **`tryAttachTrailingStyle` extended** (semantic-parser): prepositional `with`-markers
  (es `con` … ar `بـ`, zh `用`, tl `nang`, he `עם`); a continuation refold for the
  Slavic with/from collision (pl `z`/ru `с`/uk `з` — the pending key sits in `source`
  at reclaim time, the late relabel owns the shift); the postpositional SOV path now
  routes its run through the same fold (raw normalization; non-pair runs keep the
  legacy space-join byte-identical); and a post-style responseType attach consumes the
  trailing as-phrase (`as JSON` ×24, per-language as-marker surfaces from the corpus
  renders).
- **Meter**: fetch family 78 → 0; corpus total 670 → 556 (render naked with-pair −36,
  same mechanism — see the Arc C table update). Locked in
  `packages/semantic/test/fetch-with-options-multilingual.test.ts` (~100 tests ×24).

Original constraint, kept for the record: **the R1 role-fidelity ratchet scores every
language against the English reference parse.** Teaching English a role the other 23
lack _lowers_ their R1 — hence the single 24-language change + baseline regen.

## Colon-event-names follow-ups (opened 2026-07-10)

The colon-qualified event-name arc (`docs-internal/HANDOFF_colon-event-names.md`, resolved)
fixed nine of the ten multiset-recall rows via three stacked causes: the tokenizer
colon-split (framework `BaseTokenizer.mergeColonQualifiedNames`), hi/qu trigger
accusative markers (trigger schema `markerVariants`), and the ms `it.<command-verb>`
phantom possessive (COMMAND_ACTION_KEYWORDS guard in `tryMatchPossessiveExpression`).
CSS pseudo-class selectors (`#x:hover`, `.a:not(.b)`) also tokenize whole now, in all 24
languages including en (was split everywhere). Follow-up status:

1. ~~**R3 role-VALUE audit (highest leverage).**~~ **DONE** (2026-07-10, the R3 arc —
   `docs-internal/HANDOFF_role-value-audit.md`, resolved). Landed exactly as designed:
   `collectRoleValueSignature` walker in
   `packages/testing-framework/src/multilingual/fidelity.ts` (invariant-shaped values
   only — whole-surface code, no whitespace/`${` interpolation), live collection in
   `validators/parse-validator.ts`, `avgValueRecall` aggregation + per-pattern
   `valueRecallMissing` diagnostics in `orchestrator.ts`, console report section, and
   the `--regression` ratchet (drop > 0.02, both-sides-guarded). Signal **proven** by
   revert-validation: with `a7298b2e` (#633) reverted, R3 flags the ms/19-language
   `trigger.event=draggable` corruption rows that R0/R1 score perfect (avgValueRecall
   0.9861 → 0.9611). The first full sweep also surfaced six live value-bug families —
   see "R3-discovered value-bug families" below.

2. ~~**qu behavior-resizable style-sets (the one remaining multiset row).**~~
   **DONE** (2026-07-10, transformer-rendering arc —
   `docs-internal/HANDOFF_transformer-rendering.md`, resolved). The diagnosis
   held: rendering bug, not parser tolerance. The transformer's new
   trailing-`end` strip (`transformSingle` step 0a) renders each inline-if's
   inner set verb-final BEFORE the terminator (`… man churanay tukuy`), the
   conditional fold keeps the tail, and all 12 sets parse (multiset row gone,
   qu avgMultisetRecall back to 1.0). The `it.fails` flipped to a hard
   `toBe(12)`; the pre-arc render stays locked as `QU_RESIZABLE_LEGACY`
   (tolerance input, `>= 10` floor).

3. ~~**bn standalone trigger.**~~ **DONE** (2026-07-10, same arc). The predicted
   one-liner: `bn: ['কে']` added to the trigger schema's event `markerVariants`
   (`packages/semantic/src/generators/command-schemas.ts`), `it.fails` flipped to a
   full-capture assertion in `packages/semantic/test/draggable-patterns.test.ts`.
   Better than expected: bn's corpus rows were only multiset-1.0-faithful — R3 showed
   their behavior trigger-event VALUES were silently dropped
   (`behavior-draggable/resizable/sortable`), and the fix healed those rows too
   (bn avgValueRecall 0.917 → 0.958).

## R3-discovered value-bug families (opened 2026-07-10, burned down 2026-07-10)

The first R3 sweep surfaced 50 sub-1.0 instances across 18 patterns — all triaged
(probe transcript in the R3 arc), then burned down in the value-bug-families arc
(`docs-internal/HANDOFF_value-bug-families.md`, resolved). Per-family outcomes —
F1–F5 + F8 **fixed** (unit-locked in `multilingual-roadmap-fixes.test.ts` § "R3
value-bug families"), F6 **wontfix** (documented), F7 **re-filed**:

1. ~~**Connective swallowed as `increment.quantity`**~~ **FIXED** (ar/it/ms/pl/ru/
   uk/tl/vi × `repeat-until-event`/`repeat-while`). The generated patterns'
   trailing marker-less optional `{quantity}` slot captured the normalized
   connective (`quantity="then"` — increment by NaN at runtime). Fixed by a
   `matchRoleToken` guard: a keyword-kind token normalized `then` (or a
   non-positional `end`) is never a role value — optional slots skip and the
   schema default fills (`quantity=1`), required slots fail the pattern.
   Deliberately narrower than CLAUSE_BOUNDARY_KEYWORDS: `and` collides with the
   untranslated English pronoun `I` (pl `i`), and `end` keeps its
   positional-`last` reading before a selector. Also aligned the it/vi hand
   increment patterns' string `'1'` defaults to number `1` (they now win
   matchBest).
2. ~~**bn duration-glue**~~ **FIXED — two mechanisms, neither the tokenizer**
   (the handoff's hypothesis was wrong; the bn tokenizer splits fine).
   (a) `repeat-while` only: the reorder renders wait's object phrase as
   `200ms শেষ কে` (terminator INSIDE the phrase) and the SOV verb-anchoring's
   `processGroup` joined the pair whitespace-free into `duration="200msশেষ"`.
   Fixed by skipping stray terminator-shaped tokens during value accumulation
   (positional `শেষ <selector>` keeps its `last` reading via selector
   lookahead). The RENDER itself was fixed in the transformer-rendering arc
   (family 7 below): the trailing-`end` strip now emits `200ms কে অপেক্ষা শেষ`
   — the parser-side skip stays as the tolerance lock for the pre-arc shape.
   (b) The other five rows were family-1's mechanism: the generated verb-first
   wait's duration slot captured তারপর/শেষ (`duration="then"`/`"end"`) while
   dropping the real `2s/1s/100ms কে` prefix — fixed by the same
   matchRoleToken guard. bn should now sit at avgValueRecall 1.0.
3. ~~**SOV `in me` qualifier glue/drop**~~ **FIXED** (bn/hi/ja/ko/qu ×
   `form-disable-on-submit`). en's add/put schemas have no scope role, so the en
   reference DROPS `in me`; two SOV defects fixed to match: (a) put's
   verb-anchoring glue (`<button/>inme`) — `tokensToSemanticValue` now truncates
   a selector-LED group at a later `in` token; (b) add's fused-path drop
   (destination silently defaulted to `me` — the fronted patient sits outside
   the [verb..boundary] re-parse slice, so the superset gate rejects the swap
   and the postposed phrase was never reclaimed) — added the missing trailing
   DESTINATION/SOURCE reclaim on the fused path plus an `in`-qualifier skip in
   `tryAttachTrailingRole` (destination-strict, primary-marker-gated).
4. ~~**pl/ru/uk `fetch` URL mis-role**~~ **FIXED** (4 fetch patterns ×3 langs).
   Root cause: pl `z` / uk `з` are BOTH the profile's source and style markers
   (ru `с` is style-primary and a source-alternative), so the fused generic VSO
   event pattern bound the URL to `{patient}` (fetch has no patient role) and
   read the with-OPTIONS head as `source`. Fixed by a fetch-specific relabel in
   `normalizeCommandRoles` (patient + expression-typed source + empty style is
   schema-impossible except via this mis-parse → source→style, patient→source).
   Profile markers deliberately untouched (global blast radius).
5. ~~**hi `transition` duration drop**~~ **FIXED** (4 transition patterns). The
   handoff's `markerVariants` one-liner could not work (hi profile has no
   duration roleMarker; the match is the fused SOV 2-role pattern which ends at
   `{goal}`). Fixed in the trailing-DURATION reclaim: skip exactly one particle
   when a TIME-shaped literal directly follows it (`में 500ms` — the
   prepositional sibling of the bn `জন্য` postposition).
6. **`swap` role-binding flip — WONTFIX** (ar/bn/hi/ja/ko/qu/tl/tr ×
   `swap-content`, 8 rows, permanent R3 noise). en parses `swap #a with #b` as
   `destination=#a, patient=#b` (swapSchema: destination bare-marked svoPos 2,
   patient with-word svoPos 3); the SOV/VSO transformer marks `#a` accusative →
   the roles land flipped. Same role-type SET (R1-blind) and swap is
   runtime-symmetric for the element shape, so this is signature noise, not a
   behavior bug. Aligning would require flipping destination/patient across the
   en hand pattern + swapSchema for ALL SVO languages together AND auditing the
   ast-builder swap mapper / core runtime / renderer round-trip — deemed not
   worth the regression surface for zero runtime effect (decision 2026-07-10).
   The 8 rows stay visible in the R3 report; do NOT special-case the R3 walker.
   If a future arc flips it, regenerate the baseline and watch R1/R2.
7. ~~**qu/tr behavior trigger-event residue — RE-FILED to the transformer arc**~~
   **DONE** (2026-07-10, transformer-rendering arc —
   `docs-internal/HANDOFF_transformer-rendering.md`, resolved; all four
   `behavior-sortable` R3 rows gone). Fixed as a scoped render + parser-gap
   pair, NOT a blanket reorder (a full tr/bn canonicalOrder extension was
   tried first and re-rendered the whole corpus into shapes the parser can't
   bind — R3 exploded 12→39 rows; reverted):
   - (a) or-run wait lines: new i18n `wait-oblique-verb-final` rules (tr/qu
     profiles, gated to `duration`+`source`, no-event predicate) render
     `belge den … veya … bekle` / `qillqa manta … utaq … suyay` — the
     stranded run no longer leaks into the next trigger's event.
   - (b) tr repeat header: new i18n `repeat-until-event-verb-final` rule
     (predicate-gated to `repeat until event`) renders `kadar olay pointerup
     i belge den tekrarla`, matched semantic-side by the new
     `repeat-tr-until-head-verb-final` pattern (the post-verb variant stays
     for the legacy shape).
   - (c) terminator placement: the transformer's trailing-`end` strip
     (`transformSingle` step 0a) — see colon-event follow-ups item 2.
   - qu `sortable:start` needed a parser fix regardless of rendering: the qu
     corpus trigger shape matched NO pattern (only the greedy verb-anchoring
     fallback, which glued the next line's fronted `hayk_akama`); added
     `trigger-qu-event-first-verb-final` (position-0 match).
   - tr `remove.patient="last .{dragClass}"`: the loop's own `son` before a
     selector took the positional-`last` reading. The curated end-keyword
     sets (now shared via `parser/end-keywords.ts`) are audited to never be
     positional (tr last=`sonuncu`, qu last=`qhipa`), so `matchRoleToken` and
     `isStrayTerminator` now treat curated end words as structural
     unconditionally (dual-use bn `শেষ` keeps its selector lookahead).
   F7 locks flipped to hard asserts on the refreshed corpus fixtures; pre-arc
   shapes stay locked as `QU/TR_SORTABLE_LEGACY` tolerance inputs.
8. ~~**ms `repeat 3 kali` count swallowed**~~ **FIXED**. The `repeat-ms-times`
   HEAD's count word was left as English `times`, so `ulang 3 kali` fell through
   to the generated positional repeat (`loopType=3`, no quantity). Localized to
   `kali` (the th/vi/tl precedent).

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
5. ~~**Track 3 — R1 role-fidelity** triaged (2026-06-17)~~ **DONE** — the structural-SOV
   triage (hi 0.683 / qu 0.770 / bn 0.780) was burned down across the increment below, the
   launch-bar drills, and the dedicated R1 arcs (#637 + #638). The SOV six now sit at
   **≥ 0.9907** — they no longer trail the SVO languages (lowest are th 0.9845 / ms / de / fr).
6. ~~**The convergent next arc — SOV bare-command / event-anchor disambiguation.**~~ **DONE**
   (increment note below, 2026-06-17). The follow-on R1 work continued through #637/#638;
   standing R1 deferrals are pick range-role modeling (Family F) and the reactive `on.event`
   rows (see the post-launch track at the top of this doc).

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
> - **`tr window-resize`** — _(since resolved — tr parses 154/154 and the corpus holds 3696/3696
>   in the current baseline; kept for history)_ — was the lone remaining hard-fail (3695/3696). Compounded: (1) the i18n
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

### Current queue (2026-07-12, post #639) — session plan toward v2.8

The sequence above is fully resolved. Fidelity is at a high-water mark (all eight
ratchets green). v2.7.2 was published 2026-07-08 but **not publicized**; the target
is a solid, publicized release within ~10 days (**≈ 2026-07-22**). One arc ≈ one
session ≈ one PR. Arcs A/C/E fit the window; Arcs B/D are explicitly post-release
(both move the baseline or the confidence model — wrong risk profile days before a
publicized cut).

**Arc A — vocab `validate` + `dump` (new 2026-07-12; do first).** Per-language vocab
is hand-authored in five uncoordinated surfaces (~7,000+ entries): semantic profiles
(~2.3k), i18n dictionaries (~4k — `derive.ts::deriveFromProfile` exists but is unused),
command-schema `markerOverride` tables (~350), i18n grammar-profile markers (~200),
tokenizer EXTRAS + `eventNameTranslations` (~1.3k). Keywords are authored 2–5×, role
markers 3–4×, event names 3× — and the drift between them is the single most common
recent bug class (fused/split event keywords in PRs #533–#535, #540, #633; marker
collisions in #558, #560, #569, #586; render/parse symmetry in #565, #636, #638). Build:

- `validate` — cross-surface consistency check: profiles ↔ i18n dicts (keywords),
  profiles ↔ command-schemas ↔ grammar profiles (role markers), `eventNameTranslations`
  ↔ i18n `events` category, and every marker/keyword must classify as `keyword` in that
  language's tokenizer (lint R5 generalized from the nine domains to the core stack).
  Replace the dead `validate-dictionaries` npm script (target file missing). Wire into
  CI warn-first, then gate. Its disagreement ledger is the required input to Arc B.
- `dump` — one concept × language table view over the same data model (the
  `packages/semantic/editor/` profile-editor GUI is a candidate front-end).

Prior art: lint R5 caught 220 real profile↔tokenizer drift findings in the domain
packages on day one (#615). Lexicon end-state + domain-side history:
`docs-internal/FRAMEWORK_SEMANTIC_BRIDGE_PLAN.md` ("a single lexicon", the
`buildMarkerLookup` foothold).

> **Arc A first ledger (2026-07-12, tool landed warn-only):** **242 errors /
> 305 warns / 2410 infos** across 24 languages (247 on the very first sweep;
> Batch 0 below reclaimed 5) — the R5 pattern repeats. By class, none safely
> fixable inside the tool PR (every fix touches parse or render behavior →
> resweep discipline → its own PR):
>
> - **V1 ×94 (profile ↔ dictionary keyword conflicts)** — top concepts
>   `select` ×15, `reset` ×10, `into`/`submit`/`break` ×7. Real S1↔S3 drift;
>   this IS **Arc B's reconciliation input** (which translation wins decides
>   what `derive.ts` generates).
> - **V3 ×60 (dictionary events ↔ eventNameTranslations)** — the fused/split
>   event-word class again (es dict `teclaabajo` vs profile `tecla abajo`, de
>   `mausüber` vs `maus über`; keydown/keyup/mouseover/mouseout dominate).
>   The #533–#535/#540 arcs fixed the semantic side; the i18n dictionary side
>   was never reconciled. Burn-down candidate.
> - **V4 ×79 (vocab words that don't tokenize as keyword/particle)** — three
>   families: untranslated schema markers (`set.scope` marker `on` ×22 langs;
>   `push/replace.patient` marker `url` ×24 — English words in every language's
>   override table), per-language as/method render markers (`como`/`comme`/
>   `als`/`jako`/`как`/`sebagai`…), and singletons (de `um`/`an`, fr `par`/`en`,
>   ko `에게`, ar `بـ-`…). Needs an empirical probe first: does the pattern
>   matcher match markers by value regardless of token kind? If yes, some are
>   latent-only; if no, these are live parse gaps.
> - **V2 ×9 (grammar renders a marker the parse side doesn't know)** — the
>   event-role rows (ja `で`, tr `de/da`, bn `এ`, ko `할 때`) turned out to be a
>   **model limitation**, fixed in-arc (Batch 0): parse-side event markers also
>   live in `SOV_EVENT_MARKERS` / `SOV_EVENT_MARKER_PHRASES` (hardcoded in
>   `semantic-parser.ts`), now exported via `getSOVEventMarkers()` and loaded
>   as **surface #6** — those 5 rows cleared. The 9 survivors are genuine:
>   the style-role family (ar `بـ-`/`مع`, hi `साथ`, ja `と`, ko `와`/`과` — the
>   known R3 qualifier-glue class), en `as`(method)/`for`(duration), es
>   `hacia`(destination).
>
> **Batch plan for the burn-down** (~4 resweeps total, not per-finding):
> Batch 0 ✓ (in-arc: surface #6 + wildcard **class waivers** — `V1|*|*`-style
> keys with one reason, for honest gating before Arc B); Batch 1 = V4 probe
> (do markers match by value regardless of token kind?) + one semantic-side
> PR (as/method tokenizer keywords per the #638 containment-words precedent;
> translate-or-waive the untranslated `on`/`url` schema markers); Batch 2 =
> V3 event-word alignment in the i18n dictionaries (semantic side is
> authoritative post-#533–#540; corpus-coupled → one resweep); Batch 3 ✓ =
> V1 reconciled directly (probe-first, NOT deferred to Arc B — the per-concept
> table below is Arc B's input); Batch 4 ✓ = CI step flipped to gating.
>
> All four batches landed — the CI step is a GATE as of Batch 4 (see § "V1
> probe conclusion (Batch 3)" below).

> **V4 probe conclusion (Batch 1, 2026-07-12) — matcher marker semantics; governs
> Batches 2–3.** The pattern matcher consumes a pattern-literal (marker) token via
> `matchLiteralToken` → `getMatchType` (`pattern-matcher.ts`), which compares **raw
> `token.value` first** (exact, case-sensitive), then `token.normalized`, then stem
> (confidence ≥ 0.7); `token.kind` gates ONLY the last-resort case-insensitive branch
> (keyword-kind) and auxiliary consumption paths (event source-clause windows
> `pattern-matcher.ts:264/:915`, connective/curated-end guards `:564/:577`, the
> trailing-verb guard `:614`). Generated patterns carry the **native surface word**
> (schema `markerOverride[lang]` / `profile.roleMarkers` primary+alternatives) and
> handcrafted patterns carry it verbatim — so a marker word that classifies as
> `identifier` is still consumed as the marker wherever it appears as a pattern
> literal. **V4 is therefore Outcome A (latent) for every pattern-literal word, and
> Outcome B (live) only for render-only grammar alternatives with no parse-side
> literal.** Empirical probes (asserting on captured roles, one per family):
>
> - fr `par` / de `um` → `increment.quantity=10` captured ✓ (P1); en `over` →
>   `transition.duration=500ms` ✓ (P3); `on` → `set.scope=.tab`/`me` captured, es
>   tabs-aria row ✓ (P4); `url` → `push.patient` captured en+es ✓ (P5); es `como` →
>   `fetch.responseType=json`, role-identical to the en reference, via the
>   handcrafted fetch pattern's literal ✓ (P6); zh `时` → `event=click` via the
>   hardcoded `sovEventMarkers` path ✓ (P7); fr `en` → `repeat source=.items` ✓ (P9).
> - **es `hacia` (render-only destination alternative) was LIVE**: `agregar
>   .selected hacia #item` captured `destination=me` (schema default — silent drop);
>   `poner … hacia #output` returned null. **Fixed** by registering `hacia` in the es
>   semantic profile `roleMarkers.destination.alternatives` (the tokenizer derives
>   keywords from roleMarkers, so V4 cleared too; V2 es error cleared; red→green
>   test in `packages/semantic/test/multilingual-roadmap-fixes.test.ts`).
> - The other 78 V4s waived with per-family probe citations
>   (`packages/testing-framework/vocab-waivers.json`, 31 entries). Notables: the
>   send.destination overrides (de `an`, ko `에게`, tr `-e`) are **dead vocab** — the
>   transformer renders `zu`/`에` and tr `-e` shatters (live allomorphs already in
>   `markerVariants`); ar `بـ-`/`كـ-` are attach-notation artifacts (split to the
>   registered bare prefix); hi `साथ` is blocked on style-capture (below).
>
> **Discoveries logged (not fixed in Batch 1):**
>
> 1. **go-url destination drop, en included**: `go to url "/page"` parses to
>    `destination=expression:"url"` and DROPS `"/page"` — identically in en and es
>    (P5c/P5d), so fidelity 1.0 masks it corpus-wide (the en-reference-corruption
>    class; R3 silent because the value is a quoted string, not a bare URL token).
>    Candidate for the R3 value-bug families list: teach `go`'s patterns the `url
>    <literal>` idiom, then resweep — en denominator moves ×24.
> 2. **`show`/`hide` style role is uncaptured in EVERY language including en**
>    (`on click show #modal with *opacity` captures patient only). Another
>    en-denominator gap: hi `साथ` / ar render-style registrations are untestable
>    until style capture exists.
> 3. de `senden` tokenizes normalized→`submit` (last-wins keyword collision with
>    the send verb). Harmless today ONLY because literal matching is value-based;
>    a latent footgun if any path starts trusting `normalized` for verbs.
> 4. `set.scope` `on` / push-replace `url` stay English by design
>    (passthrough-alignment, CORRECTNESS §7bb). If a native-marker increment is ever
>    wanted, it must change render + schema override together (co-evolution) — its
>    own increment, not vocab hygiene.
>
> **Governance for Batches 2–3:** classification-only mismatches (word consumed as a
> pattern literal) are latent — waive or downgrade, don't register into profiles
> "for hygiene" (profile registration changes pattern GENERATION). Register into
> `roleMarkers[role].alternatives` only when the render side can emit a form the
> parse side has no literal for (the hacia class), and only as an alternative to an
> EXISTING marker entry. Optional structural follow-up: split V4's tier —
> marker-words-appearing-in-patterns → warn, profile keywords → error.

> **V3 probe conclusion (Batch 2, 2026-07-12) — captured-event failure mode; the
> broken-listener class is REAL but corpus-cold.** Batch 1's latency verdict does
> NOT extend to V3: event names are role VALUES, normalized (or not) by the
> **tokenizer's `{native, normalized}` keyword table** — `eventNameTranslations`
> (S5b) is the V3 reference and the render-path localization source, but it is
> partially **aspirational** (16 of the 60 rows' S5b-listed forms do not
> themselves round-trip: de `taste runter`/`maus über`, id `mouse masuk`, zh
> `鼠标进入`, sw `bonyeza chini` captures `click`, ar `تمرير الماوس` captures
> `scroll`, tr's own `fare_bas` shatters). "Semantic side is authoritative"
> therefore means **the tokenizer keyword table**, not the S5b list per se.
> Probed all 60 rows (corpus-shaped `toggle-class-basic` handler per language,
> asserting on the captured event value vs the en reference's `literal:"click"`
> / `literal:"change"` canonical):
>
> - **23 rows OK-NORMALIZED** — the dict form already captures the canonical
>   event (tokenizer knows it; e.g. sw `bonyeza`→`click` — corpus-hot in 106
>   rows — es `cambiar`→`change`, tr `farebas`→`mousedown`). V3 here is pure
>   reference-table misalignment → S5b alias, baseline-stable.
> - **37 rows BROKEN**, three failure shapes: (a) event role captured as
>   `expression:undefined` (garbage listener — de/fr/pt/ja fused forms, es
>   `teclaabajo`…), (b) **wrong event entirely** — sw `badilisha`→`toggle`
>   (change-event homonym with the toggle verb), sw `panya_juu`→`mouseup`
>   (dict shares one form for mouseup+mouseover; tokenizer deliberately maps it
>   to mouseup for the corpus row), zh `按键抬起`→`keydown` (prefix-shatter), qu
>   `yupana_ñitiy`→`click`, (c) verbatim/tail capture — tr `tuş_bas`→`bas`,
>   the literal broken-DOM-listener class (`addEventListener("bas")`).
> - **Ratchet visibility — confirmed blind spot:** parse rate non-null → blind;
>   R0 sees the action set → blind; R1 compares role TYPES (wrong-value rows
>   still `event:literal` → blind; the `expression:undefined` shape WOULD flip
>   the role type, but no such row is corpus-exercised in event position); R3's
>   invariant whitelist has colon-qualified event names only → plain names
>   blind. **R2 dispatches the EN reference's canonical event name against the
>   translated listener, so it catches every shape in this class** — it stayed
>   silent because its curated subset is `on click` + one `success`
>   CustomEvent: no blur/key*/mouse*/change trigger exists in the subset.
>   Queue candidate: admit one non-click bare-event pattern (e.g.
>   input-validation, `on blur`) to the R2 subset per language-facing arc.
> - **Why the live corpus never broke:** every bare-event corpus row renders
>   through a tokenizer-known form — de blur renders `defokussieren` because
>   `commands.blur` SHADOWS `events.blur` in the transformer's category order
>   (the dict `events` word `unscharf` was dead vocab), sw renders `kwenye
>   blur` (English passthrough), and the corpus's only mouseup row rides the
>   deliberate `panya_juu`→mouseup tokenizer mapping. The 37 broken forms are
>   all corpus-cold in event position; corpus keydown/keyup usage is
>   exclusively the filtered English form (`keydown[key=="Escape"]`).
> - **Resolution (zero waivers):** 23 alias-only rows (dict form works; add it
>   to `eventNameTranslations` — additive, render untouched, appended after
>   existing entries so first-wins localization canonicals are unchanged;
>   includes the two prefix-shatter-but-correct rows zh `按键按下` and id
>   `tekan_tombol`, kept in the dict because the "clean" alternatives collide —
>   bare `按键` is zh's keypress entry) + 37 dict fixes to probe-verified
>   round-tripping forms (S5b-listed where one round-trips: ja katakana,
>   es/fr/pt split forms, tr fused forms, qu `llave uray/hawa`, zh
>   `松键`/`鼠标移入`, sw `kubadilisha`/`lenga`/`blur`; tokenizer-registered
>   where S5b's own form is aspirational: de `taste unten`/`taste oben`/`maus
>   weg`/`maus drüber`, id `arahkan`/`tinggalkan`, sw `sogeza juu`; English
>   passthrough where no native exists: id keyup). 31 aliases total (23 + 8
>   companions for dict-fix forms not in S5b). Expected baseline movement:
>   ~none (no corpus render changes among the 37).
> - **Logged, out of scope (candidate next increments):** (1) id
>   `tekan_mouse`/`lepas_mouse` (dict mousedown/mouseup, corpus-live in
>   repeat-until-event) likely shatter to `tekan`→keydown — same class, not
>   V3-visible because S5b id lacks mousedown/mouseup keys (V3 only compares
>   covered events); an S5b-coverage check (V3c?) would surface it. (2) zh dict
>   mouseenter `鼠标进入` captures nothing (S5b lists it under mouseover) —
>   same gap. (3) R2 curated subset should admit one bare non-click event
>   pattern (e.g. input-validation, `on blur`) to close the structural blind
>   spot this probe exposed.

> **V1 probe conclusion (Batch 3, 2026-07-12) — verb/connective reconciliation;
> ledger 90 → 0 unwaived (38 dict fixes + 2 profile-alternatives + 50 waived) +
> Batch 4 gating flip.** All 90 rows probed with captured-ACTION and
> captured-VALUE assertions (never "it parses"): corpus-hot rows against the
> real corpus line vs the en reference of the same pattern; corpus-cold rows by
> rendering a concept-exercising en line through `GrammarTransformer` (the
> populate path) and parsing the render, with the profile form swapped into the
> same slot as the discriminator. Probe logs archived (before/after).
>
> - **Latent class confirmed but SMALLER than predicted (49 of 90).** The
>   corpus-hot connectives (`when` ×146 rows/lang, `into`, `then` ×53,
>   `until`, `while`, pl `click` ×106, tl `from` ×24 …) all parse identical to
>   the en reference — the dict side is the parse-authoritative form and the
>   PROFILE keyword is the misaligned copy (the exact inverse of V3's verdict).
>   For Arc B: **in the connective/particle families the dictionary should
>   win** the reconciliation.
> - **Live wrong-verb class (24 rows, all corpus-cold in the broken slot) —
>   Batch 2's wrong-verb shape, systemic:** the dict word doubled as a
>   DIFFERENT command's keyword. select ×15 (dict word = the pick keyword —
>   `pick-text-range` renders faithfully via the separate `pick` dict key, but
>   a bare select render parsed **null** in all 15); clone ×5 (dict word = the
>   copy verb → parsed action=copy); id close (tutup = hide), sw copy (nakili =
>   clone — the inverse!), vi prepend (thêm đầu shatters at thêm=add), qu open
>   (kichay = trigger). All dict-fixed to the profile primaries (probe-verified
>   red→green, `packages/testing-framework/src/vocab/batch3-roundtrip.test.ts`);
>   the pick/copy/hide/trigger keys keep their words, so no corpus render moved.
> - **Live wrong-EVENT class — the headline: es/pl/tr/vi `on submit` corpus
>   rows were broken in production while every ratchet stayed green.** The dict
>   events.submit word doubled as the send VERB, and the tokenizer keyword
>   table (the parse authority, per Batch 2) captured `on.event="send"` in the
>   live form-disable-on-submit / form-submit-prevent rows — a listener bound
>   to the wrong event. Invisible to R0/R1 (action set + role TYPE unchanged),
>   R3 (plain event names are not whitelist-invariant), and R2 (curated subset
>   has no submit trigger — third confirmation of that structural blind spot).
>   Dict-fixed to the profile primaries (envío/wysłaniu/gönderme/nộp/apaykachay
>   — each probe-verified to capture `"submit"` in the exact corpus slots; qu
>   kachay was context-flaky, capturing submit in one row and send in the
>   other). Same class corpus-cold: reset ×7 dict-fixed (it/ko/pl/pt/ru/uk/qu —
>   dict forms captured `on.event` as expression (broken listener) or a wrong
>   event (qu qallariy→"default"); profile verbs capture literal `"reset"`), qu
>   change (tikray→"toggle" → kambiay). S5b has **no reset key for any
>   language** (why V3 never saw the family); qu kambiay/apaykachay added as
>   appended S5b aliases per Batch 2 discipline.
> - **Ratchet-visibility verdict:** R0 WOULD flip on a corpus-exercised
>   wrong-verb parse — and that is precisely why none existed: every
>   corpus-exercised V1 row parsed faithfully, and every live break sat in a
>   corpus-cold slot (bare select/clone/close/copy/prepend/open commands,
>   reset events) or at the VALUE level (submit "send"), where no ratchet
>   looks. Corpus-green ≠ vocabulary-correct, verdict confirmed for verbs.
> - **Latent-by-absence class (10 rows):** `break` ×7 + qu `continue` + `and`
>   ×2 — **en itself** silently drops these (`repeat 3 times break end` parses
>   break-less in en and in every render; `if #a and #b …` drops the second
>   conjunct in en). No parse authority exists to reconcile against; Arc C
>   (unconsumed-input) territory. Dead-vocab subclass: qu on/async, id/tl into
>   underscore forms — the transformer never emits them in any corpus slot.
> - **Blocked rows (4):** ar/sw/tl reset — NO candidate round-trips (sw:
>   dict weka_upya→"put", profile anzisha-upya→"init", en passthrough→
>   expression; ar/tl: every form → expression). ja empty — dict-fix
>   unavailable (expressions.empty=空 feeds the corpus-hot `is empty` renders;
>   a commands-category addition would shadow it on render), and the
>   profile-alternative was probed and **reverted**: registering bare 空
>   injected a phantom `empty` action into the hot input-validation rows (an
>   R0-precision regression caught by the after-probe). ko/qu took the same
>   profile-alternative safely (비어있는/chusaq — hot rows clean, command slot
>   now parses).
> - **Batch 4 (same PR):** the 8 V2 survivors waived with named reasons (6
>   style-role rows blocked on show/hide style-capture; en method:as +
>   duration:for consumed as pattern literals, V4-probe mechanism —
>   schema-override↔render alignment queued), and the CI step flipped
>   **warn-only → gating** (release bar item 1 closes).
> - **Logged, out of scope:** (1) fr repeat-until-event corpus row captures
>   `on.event` mousedown as expression — fr dict mousedown `sourisappuyée` is
>   the fused class Batch 2 fixed elsewhere, invisible because S5b fr lacks
>   mousedown (the V3c coverage-gap family, more evidence). (2) The pick
>   literal-vs-expression HOT-ROLE-DIFFs (hi/ja/ko/tr/qu) are the standing pick
>   range-role deferral, untouched.
>
> **Per-concept reconciliation table (Arc B's input — which side won and why):**
>
> | Concept | Languages | Winner | Why |
> | --- | --- | --- | --- |
> | select | ar de hi id ja ko ms pl qu ru sw th tr uk vi | profile (dict-fixed) | dict word = pick keyword; bare select parsed null; profile verb parses; `pick` key separate so pick rows unmoved |
> | clone | bn hi th tl vi | profile (dict-fixed) | dict word = copy verb → action=copy |
> | close / copy / prepend / open | id / sw / vi / qu | profile (dict-fixed) | wrong-verb: tutup=hide, nakili=clone, thêm đầu→add, kichay=trigger |
> | reset | it ko pl pt ru uk qu | profile (dict-fixed) | dict form broke the listener (expression / wrong event); profile verb captures `"reset"` |
> | reset | ar sw tl | none (waived, blocked) | NO form round-trips (incl. en passthrough); tokenizer event coverage gap, V3c-adjacent |
> | submit | es pl tr vi qu | profile (dict-fixed) | dict word = send verb → event `"send"` captured LIVE in corpus form rows |
> | submit | id th | dict (waived) | kirim/ส่ง capture `"submit"` — profile envío-class words are the misaligned side |
> | change | qu | profile (dict-fixed) | tikray = toggle verb → event `"toggle"` |
> | change | id | dict (waived) | ubah captures `"change"` |
> | blur | it | profile (dict-fixed) | noun sfuocatura dropped command patient; verb round-trips both slots |
> | empty | ko qu | dict (profile-alternative added) | dict adjective renders the empty COMMAND; hacia-class registration; hot `is empty` rows unaffected (probed) |
> | empty | ja | none (waived, blocked) | bare 空 phantoms the hot expression rows if registered (probed + reverted); dict-fix shadowed |
> | when | ja ms th tl vi zh | dict (waived) | corpus-hot handler-opener ×146 rows/lang, parses identical to en |
> | while / until / then | fr sw zh / fr qu ru uk / ko qu | dict (waived) | corpus-hot, loopType/event/sequence captured identical to en |
> | into | bn de es id pt qu tl | dict-or-dead (waived) | put-destination renders via grammar role markers; dict word round-trips where it appears (bn তে) or never renders (id/tl underscore forms) |
> | click / input / from / event / before / after / throw / async / scroll | pl / th / tl / qu / qu / qu / qu / sw / it | dict (waived) | corpus-hot, value-verified where applicable (click R2-covered; อินพุต→"input") |
> | async / on | qu | dead (waived) | render keeps English `async` / uses the `pi` marker — dict word never emitted |
> | break / continue / and | fr hi id ms tl vi qu / qu / ar qu | none (waived) | no parse path in ANY language incl. en — Arc C unconsumed-input class |
>
> Ledger after Batch 3+4: **0 unwaived** (was 98 = V1 ×90 · V2 ×8). Waivers:
> 78 Batch-1 V4 class-waivers + 26 V1 + 8 V2 (all probe-cited,
> `packages/testing-framework/vocab-waivers.json`). CI vocab step is now a
> GATE.

**Arc B — `derive.ts` dictionary flip (own arc; baseline-coupled).** Reconcile Arc A's
profile↔dictionary disagreement ledger, then switch `i18n/src/dictionaries/index.ts`
to the generated path — killing the single largest duplication (~4k entries). Hand
edits that diverged from profiles will change rendered corpus translations, so this
moves the fidelity baseline: full resweep + old-vs-new attribution against the same
DB, same discipline as a parser arc. Do NOT start before Arc A's validator exists.

~~**Arc C — extend `unconsumed-input` to the remaining parse stages**~~ — **COMPLETE
(2026-07-13, `feat/arc-c-input-coverage`).** Per-segment coverage landed in the shared
body parsers (the funnel hypothesis held: one check covers event-handler, compound, and
SOV/VSO at once, with per-sub-stream accounting and speculative-parse rollback). The
floor rose 0 → 670/3696 (18.1%) after one residue batch; every firing attributed —
verdict + per-family table in § "Input coverage" above. Diagnostic-only proven
(`--regression` exit 0, committed baseline untouched, save-baseline deltas all benign
or pre-existing).

**Arc D — the `unconsumed-input` → confidence-penalty scoring change** — **all
preconditions now MET** (`SCHEMA_NO_REQUIRED_ROLES` fixed #628/#629; all stages
measured by Arc C, 2026-07-13). Five-step plan in § "Input coverage". Payoff:
re-evaluate whether `parseInternal` Stages 0 / 0.5 can be simplified. Sizing input:
the corpus fires at 18% — see the Arc C family table before pricing the penalty.

~~**Arc E — Part 2b: `fetch … with { }` ×23 + naked named-arg capture**~~ — **COMPLETE
(2026-07-13, `feat/arc-e-fetch-with`).** All 24 languages in one change + baseline
regen, per the R1 en-reference constraint. Fetch family firings 78 → 0 (render naked
with-pair −36 as a same-mechanism bonus); details in § Part 2b (RESOLVED) above.

**Standing deferrals (unchanged):** pick range-role modeling (Family F — only if
`pick` matters for a demo; raises the en denominator ×24), the reactive `on.event`
rows (event-anchor guard machinery), swap-content F6 (wontfix).

### v2.8 release bar (proposed 2026-07-12 · target ≈ 2026-07-22)

Modeled on the launch bar: few items, each measurable, each gate-held once reached.
The bar is the release definition; the arcs are the route. Split for the 10-day
window: items 1–4 are **must-have**, item 5 is the **stretch headline**.

1. **Vocab consistency green in CI** (Arc A `validate`) — 0 unwaived cross-surface
   disagreements (or every waiver named), replacing today's state where the only
   dictionary validator is a dead script. `dump` ships if time allows; Arc B's
   generated dictionaries are the durable fix but are post-release by design.
   **✓ MET (Batch 3+4, 2026-07-12): 0 unwaived, every waiver probe-cited, CI
   step gating.**
2. **Input coverage is total** (Arc C) — every `parseInternal` stage instrumented;
   `--diagnose-coverage` reports 0 firings corpus-wide or each residual is named.
   If new firings exceed what the window can burn down, naming them all still
   clears the bar (the launch-bar precedent: honesty over totality).
   **✓ MET (Arc C, 2026-07-13): all stages measured, 670 firings — every one
   attributed to a named family (table in § "Input coverage"); regression green,
   baseline untouched.**
3. **Fidelity floors held, not raised** — the eight-signal ratchet holds the
   2026-07-11 high-water marks (R1 ≥ 0.99, R3 ≥ 0.995, others saturated). No new
   fidelity bar item — the remaining tail is the named deferrals. This item is
   free unless Arcs A–C break something; it exists so the release notes can claim it.
4. **Release hygiene** — 0 critical Dependabot alerts on **shipped** packages
   (7 critical repo-wide today, shipped-path subset unknown → triage first; alerts
   confined to `experiments/`/`clients/` are waivable with a note);
   `pre-publish-check` workflow green; publish dry-run of the monorepo version bump.
5. **Stretch — `fetch … with { }` captured in all 24 languages** (Arc E) — the
   user-visible feature claim for the release notes. Take it only after 1–4 are
   locked; it needs a baseline regen, so it must not land in the final two days.
   **✓ MET (Arc E, 2026-07-13): braced + naked named-arg options captured ×24,
   fetch-family firings 78 → 0, ~100 locked tests, baseline regenerated + attributed
   — nine days before target.**

Re-baseline (`--save-baseline`) after each intentional fidelity change, regenerate against a
freshly `populate`d DB, and commit only the dicts/profiles + baseline (not `patterns.db`).
