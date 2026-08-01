# Handoff — R1 residual triage (hi/qu/ko + corpus-wide clusters)

> **STATUS UPDATE (2026-07-04, same day): slices B → A1 → C are LANDED** (#564,
> #565, #566 — each with fail-without-fix guard tests, gate green, zero-regression
> per-(lang,pattern) A/B, baseline regen). Aggregate: **every laggard language up,
> none down** — hi +0.013, ko/qu +0.009, bn +0.008, ja/tr +0.003; corpus mean R1
> 0.9535 → 0.9555. Execution learnings for the next session:
>
> - **Cluster B** landed as a `responseType` sibling of #563's trailing-role
>   reclaim in `buildEventHandler`, gated on a RESPONSE_TYPE_WORDS loanword set +
>   schema-invalid-destination relabel (the ko `json 로` case). The reclaim-
>   mechanism family now covers quantity + responseType; further trailing-role
>   candidates should reuse it.
> - **Cluster A sub-cause 1** turned out to be UPSTREAM of the role-swap theory:
>   `getPossessiveReference` never read `specialForms` (render-side), so ko
>   `그것의.name` couldn't parse back and the whole set clause fell to the
>   scrambling fallback. Fixed by inverting specialForms in the lookup + qu
>   `chay: it` keyword + `paq`/`pa` connectors. The mapRoleForCommand swap-fix
>   theory was NOT needed for these patterns — re-verify before applying it
>   elsewhere. **A2 (still open):** expression-valued set patients
>   (`"Hello, " + my value`, two-way-binding) still fail the generated pattern's
>   {patient} role token — needs multi-token expression-run assembly in
>   matchRoleToken (greedy-capture risk; A/B per marker).
> - **Cluster C** landed in the matchRoleToken event-anchor guard (positional
>   keywords + profile possessive heads + `?.`-fused tokens). Note: the fresh
>   populate's hi first-in-parent translation leaks English `in closest` (the
>   fully-localized form appears in sweep context) — didn't matter for the fix,
>   but it's a transformer artifact worth knowing. **window-resize was
>   reassigned to cluster E** (its hi translation is scrambled — modifier words
>   reordered mid-sentence — not an anchor bug).
> - **Cluster D is LANDED** (same day, later session): repeat loop-HEAD
>   canonicalization — `for-in` / `while-head` / `until-head` patterns for en +
>   all 23 translations (packages/semantic/src/patterns/repeat.ts), plus two
>   parser enablers (head-only re-parse allowlist extended to the new ids; the
>   repeat default-patient leak `reference:me` dropped so the superset guard
>   can't block the swap, with schema-unsanctioned fused junk roles exempted).
>   en reference now emits `repeat{loopType, patient, source}` for for-loops
>   (killed the `event="in"`/`quantity` noise), `{loopType, condition}` for
>   while, and translations reproduce the until-event-from head (behaviors ×3).
>   A/B: **every language up, none down** — mean R1 0.9555 → 0.9654 (+0.0099,
>   biggest single-arc move; es/pt/ru/uk/id +0.012, sw +0.013, he +0.0125);
>   precision up-or-flat everywhere; parse 3696/3696; R2 1.0; gate green;
>   baseline regenerated against a fresh populate. Execution learnings:
>   the transformer's repeat-head emission is VERB-FIRST in every language
>   (even the SOV six) in handler context, but UNTIL-FIRST in statement context
>   (the behaviors' repeat line) — two surface shapes per SOV language; the
>   `in`-word normalization is wildly inconsistent across profiles (es
>   `en`→destination, pt `dentro`→into, fr `en`→identifier), so the heads are
>   surface-keyed tables like the `-times` heads, NOT normalized-keyword
>   patterns; standalone statement parses only try patterns at position 0 (no
>   skip-ahead), which is why qu needs the `hayk _ a` junk-prefix variant AND a
>   mid-clause variant (a preceding greedy verb-first trigger eats `hayk` in
>   the sortable body). Remaining repeat-family residue: SOV repeat-while
>   (fronted while-phrase parses as a separate `while` node — hi/qu miss
>   condition+loopType, ko condition; unchanged count vs before, needs the
>   fronted-guard machinery, not a head).
> - **Cluster E is LANDED** (same session as D): standalone parenthesized
>   groups are now fused into ONE token by the i18n transformer's tokenizer
>   (previously only ATTACHED `(` was tracked), so the interior `of`/`as`
>   keywords never reach the argument modifier map — the mangle (reorder
>   inside parens, event phrase embedded mid-expression, whole `* (…)` second
>   operand dropped in EVERY language) is gone. Interior keywords still
>   translate word-by-word IN ORDER: role values are re-split on whitespace by
>   translateMultiWordValue, and translateWord gained paren-stripping +
>   fused-group recursion (`($count or 0)` → tl `($count o 0)` — the old
>   operator-translation contract holds). computed-value now renders intact in
>   all 24 languages. R0/R1 metrics were expected NOT to move (the corruption
>   was value-level — the known R0/R1 blind spot); the win is correct
>   display-facing text + future R2 eligibility. One knowingly-accepted
>   residue: sw precision -0.0011 (well inside the 0.02 ratchet) because the
>   restored second operand carries a second `kama` ("as"), and the sw
>   SEMANTIC parser mis-reads standalone `kama` as `if` (a PRE-EXISTING
>   homonym family — event-debounce/fetch-with-headers/fetch-formdata already
>   show phantom sw `if`s; fix belongs parser-side or via a non-homonym sw
>   "as" word, the pl get/pobierz precedent).
> - **All five clusters from this triage are now landed.** Remaining known
>   residue: SOV fronted repeat-while (hi/qu condition+loopType, ko condition
>   — needs fronted-guard machinery), the sw `kama` homonym family above, the
>   `add.destination` en noise on for-body patterns (it/qu), and the smaller
>   singleton families listed at the bottom of this doc.

> **Written 2026-07-04**, immediately after the SOV literal-role-extraction arc
> (#560/#561/#562 — see [HANDOFF-sov-literal-role-extraction.md](HANDOFF-sov-literal-role-extraction.md)).
> This is the **fresh grounding** of what remains in R1 role fidelity now that the
> 2026-06-17 Track-3 triage (hi 0.683-era, literal-fronted event mis-anchoring) is
> largely harvested. Numbers below are from the **2026-07-04 baseline** (commit of
> #562) and a same-day probe against a fresh populate.

## Where R1 stands (2026-07-04 baseline)

Worst six: **hi 0.915 · qu 0.916 · ko 0.926 · bn 0.934 · tr 0.936 · ja 0.937**
(everything else ≥ 0.95; controls es 0.955-ish/it/de ~0.95–0.96). Parse rate 100%,
degenerate/lossy 0, R2 1.0 on the 47-pattern subset. R1 is the only dimension
with real headroom left.

Patterns with ≥1 missing role entry (out of 148 en references with role
signatures): **hi 41 · qu 40 · ko 38** vs controls **es 19 · it 19 · de 21**.
So roughly HALF of the laggards' miss-mass is corpus-wide (shared with the
controls) and half is SOV-trio-specific.

## Method (reproduce in ~2 min per language set)

Mirror the harness exactly — `MultilingualHyperscript.parse` →
`fillSchemaDefaults` → `collectRoleSignature` (fidelity.ts), recall vs the en
reference. Probe shape (place `.mts` inside `packages/testing-framework/`; end
with `process.exit(0)` — jsdom/core keep handles open):

```ts
import { MultilingualHyperscript } from '@hyperfixi/core/multilingual';
import { fillSchemaDefaults } from '@lokascript/semantic';
import * as FID from './src/multilingual/fidelity.ts'; // CJS interop: (FID as any).default ?? FID
import { getTranslationsByLanguage } from '@hyperfixi/patterns-reference';
// for each lang: for each pattern with an en reference signature,
//   missing = enSig.filter(e => !translationSig.has(e))
// aggregate missing entries into clusters; print worst patterns.
```

Full ordered rebuild + fresh populate first (see the previous handoff's recipe —
and remember `git checkout -- patterns.db` reverts to the stale committed copy;
re-populate after).

## The five clusters (ranked by leverage), each grounded by a parse drill

### Cluster A — SOV `set` role-swap + property-path typing (SOV-trio-specific, the biggest trio delta)

`set.destination:property-path` missing: **qu 6 · ko 5 · hi 4** (vs es 1 / it 2)
— fetch-json, set-color-variable, two-way-binding, computed-value,
template-literal-interpolation, template-literal-list-build; usually paired with
a `set.patient:*` miss (the pair = per-pattern R1 0.50).

Drill (`two-way-binding`, en `set #greeting.innerText to "Hello, " + my value`):

- en: `set{destination:property-path, patient:literal}`
- ko `#greeting.innerText 를 "Hello, " + 내 값 에 설정 …`:
  `set{patient:selector="#greeting.innerText", destination:literal="\"Hello, \"+내값", source:…}`

TWO independent defects visible in one parse:

1. **Role swap.** The transformer emits set's TARGET with the object particle
   (`를`/`को`/`ta`) and the VALUE with the dative (`에`/`में`/`man`). The SOV
   marker extraction maps 를→patient, 에→destination positionally.
   `mapRoleForCommand` (semantic-parser.ts) already documents the needed remap —
   "for set and put: patient marker is the destination, dest marker is the
   patient" — but only applies it when the first role is ALREADY TAKEN; in the
   normal path patient is free, so the swap never fires. Fix shape: make the
   remap schema-aware for `set`(/`put`?) rather than collision-triggered.
   ⚠️ Overlaps the 2026-06-30e of-possessive arc cause (3) (ru/pl/uk destination
   greedy-binding) — read that block first; one matcher-ordering fix may serve both.
2. **Value-type misclassification.** en splits `#greeting.innerText` into a
   `property-path`; the SOV path keeps it ONE selector token
   (`selector="#greeting.innerText"`). Even with roles un-swapped, the TYPE
   still mismatches (`selector` ≠ `property-path`). Fix lives in the SOV
   tokenizers / `tokensToSemanticValue` (`#id.prop` → property-path split),
   NOT in role mapping.

### Cluster B — `fetch … as json` responseType under fused SOV patterns (trio + ja/tr/bn; the "×63 residue")

`fetch.responseType:expression` missing ×3 in each of hi/qu/ko (fetch-json,
fetch-error-handling, fetch-do-not-throw); absent from es/it/de (their `como/als
json` marker patterns capture it). Same family as the code comment in
semantic-parser.ts ("fetch.responseType ×63" fused-body residue).

Drill (`fetch-json`, ko `… 가져오기 json 로 …`): the fused
`fetch-event-ko-sov-patient-first` binds the `json 로` tail as
**`destination:expression`** — right tokens, wrong role name (ko `로` maps to
style/destination in roleMarkers; `responseType` has no marker entry). The #530
re-parse can't fix it for the same reason as increment's quantity (fronted
source is outside the [verb..boundary] slice → superset guard rejects).

**Fix shape: the exact mechanism #561 proved** — extend the buildEventHandler
trailing-role reclaim (or the marker→role mapping) so a trailing
`{as-marker} {word}` / `{word} {style-marker}` pair fills an absent schema
`responseType`. Smallest slice, proven pattern, and it also relabels the
phantom `destination` (a precision win). Also fixes the trailing `set` clause's
patient (`그것의.name` → property-path) if done at the marker-lookup level? NO —
that's Cluster A's territory; keep the slices separate.

### Cluster C — hi event-anchor mis-fire on fronted POSITIONAL/PROPERTY-PATH phrases (hi-specific tail)

`on.event:literal` missing ×4 in hi only: default-value, window-resize,
first-in-parent, optional-chaining-possessive. This is the surviving 10% of the
old dominant cluster (was 22× at the 06-17 triage): the #508 event-anchor guard
covers fronted bare literals, but NOT fronted **positional phrases** or
**possessive property-paths**:

- `first-in-parent` hi `पहला <input/> में निकटतम <form/> को क्लिक पर फोकस` →
  `on{event:expression}` — the fronted `पहला <input/>` (a positional phrase)
  is captured AS THE EVENT; focus.patient defaults to `me`.
- `default-value` hi `मेरा @data-count को लोड पर डिफ़ॉल्ट "0" में` →
  `on{event:property-path}` — the fronted `मेरा @data-count` possessive is the
  event; the `default` body gets garbage roles (`destination:literal="कोलोड"`).

Fix shape: extend the #508 guard's "this cannot be an event" test to positional
keywords (`first`/`next`/`closest` normalized forms) and possessive/`@attr`
property-path heads. Check tl/bn for the same shape before scoping to hi.

### Cluster D — `repeat for X in Y` loop-head roles (CORPUS-WIDE, biggest total mass — and the EN REFERENCE IS NOISY)

The `repeat.loopType:literal`, `repeat.event:literal`, `repeat.quantity:expression`,
and `repeat.source:expression` entries are missing across **every probed language
including es/it/de** (es 6/6/2/3, hi 6/5/2/3, …): repeat-for-each,
stagger-animation, repeat-while, repeat-until-event,
behavior-draggable/sortable/resizable.

Drill (`repeat-for-each`, en `on click repeat for item in .items add .processed to item`):

- **en itself parses the head wrong**: `repeat{loopType:literal="for",
quantity:expression, event:literal="in"}` — `in` mis-captured as an _event_,
  the binding var as _quantity_. Every translation then "misses" entries that
  are en NOISE (they fail to reproduce a mis-parse). es binds
  `{destination:selector=".items", loopType:expression}`; ko collapses to
  `{loopType:reference=me}`.
- The i18n transformer also DROPS the `for` binder keyword in transit (known —
  see the bare-`repeat` recovery comment in parseClause).

Fix shape (two stages, own arc): (1) canonicalize the EN head parse
(`loopType:literal="for"`, `patient:identifier`, `source:selector|expression`;
kill the `event="in"`/`quantity` noise) — this CHANGES the reference, so R1
per-lang may transiently drop and the baseline must regen in the same PR;
(2) align the per-language repeat patterns/transformer emission. Highest total
R1 mass (moves all 24 langs), but baseline-churn-heavy — do it as a dedicated
arc, not a tail-end increment. `for.loopType` precedent: #549.

### Cluster E — i18n transformer MANGLES parenthesized/operator expressions (not a parser bug)

Drill (`computed-value`, en
`set #total.innerText to (the value of #price as Number) * (my value as Number)`):

ko translation is `#total.innerText 를 (the 값 의 #price 에 설정 입력 할 때
.quantity 에서 Number) 로` — the transformer **reordered INSIDE the
parentheses**, embedded the event phrase (`입력 할 때`) mid-expression, dropped
the whole `* (my value as Number)` second operand, and leaked English (`the`).
hi/qu identical shape. No parser change can recover roles from a corrupt
translation. Affected: computed-value, template-literal-\* (and any pattern with
parenthesized arithmetic/concat). Fix is TRANSFORMER-side: treat parenthesized
expressions as opaque units during grammar reorder
(`packages/i18n/src/grammar/transformer.ts`). Separate arc; also an R0-precision
and R2-eligibility blocker for those patterns.

## Smaller residue seen in the probes (don't chase in this arc)

`send.destination:reference` ×2 (send-with-detail, socket-send — every lang),
`wait.duration:literal`, `tell.destination:selector`, `trigger.event:literal`
singletons (every lang), `halt.patient:reference` ×4 (es/it/de only —
interestingly ABSENT in the SOV trio), `js.patient:expression`,
`render.style:expression` ×2 each (trio). Each is a singleton-family;
opportunistic only.

## Recommended sequencing

1. **B first** — smallest, mechanism proven by #561 (trailing-role reclaim),
   clears 3 patterns × ~6 langs plus a precision win.
2. **A second** — biggest SOV-trio delta (the set role-swap + property-path
   typing); read the 2026-06-30e of-possessive block first (shared machinery);
   the two sub-causes are separable PRs (swap fix, then tokenizer typing).
3. **C third** — hi tail (extend the #508 guard to positional/property-path heads).
4. **D as its own arc** — corpus-wide repeat-head canonicalization (en reference
   change + baseline regen in the same PR; highest mass, highest churn).
5. **E as its own arc** — transformer parenthesized-expression opacity.

## Working discipline (same as the last arc — it worked)

One increment per PR; full six-signal `--regression` gate + per-(lang,pattern)
A/B sweep per change (value-level bugs are invisible to R0/R1 — check R2/exec
probes too); guard tests that FAIL without the fix; regenerate the baseline only
on intentional fidelity change against a fresh populate; never commit
patterns.db. Validation footguns from last session are recorded in the
project memory (exit-code masking via `| tail`, stash-pop mtime staleness,
stale committed patterns.db, hanging tsx probes → `process.exit`).
