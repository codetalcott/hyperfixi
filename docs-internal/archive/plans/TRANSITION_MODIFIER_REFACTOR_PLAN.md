# Transition / Command-Modifier Refactor Plan

> Scoped design for the deferred Track 4 "modifier" cluster
> (`transition-*`, `window-resize`). Written after the Phases 1–4 + Track 4 arc
> (baseline avg **98.51%**). This is the work that resisted a focused fix and
> needs a deliberate, well-verified refactor in its own session.
>
> Source of truth for "what's failing" is the regenerated baseline
> (`packages/testing-framework/baselines/multilingual-priority.json`), not this doc.

---

## ⚠️ Investigation update (supersedes "Root-cause findings" below)

A hands-on probing session (via the real harness path: `maskSpans` →
`GrammarTransformer` → `MultilingualHyperscript.parse`) found the original
root-cause analysis **partly wrong** and the work **deeper than estimated**:

1. **ko `opacity` (literal patient) does NOT parse standalone.** `transition-opacity`
   / `fade-out-remove` "pass" in the baseline only because of the trailing
   `then remove me` (a compound where `remove me` parses). Strip the `then` and
   even the clean-literal ko transition is `null`. So the metric is hollow there.
2. **The goal-marker mismatch is NOT "minor" — but fixing it doesn't help either.**
   i18n maps the English `to` to the **`destination`** role globally
   (`ENGLISH_MODIFIER_ROLES.to = 'destination'`), so for ko it emits the
   destination particle `에`. The semantic transition schema calls that slot
   **`goal`**. Aligning markers (schema `goal.markerOverride.ko`, or adding a
   profile `goal` marker — only `transition` uses `goal`, so zero blast radius)
   changes **nothing**, because of the real blocker:
3. **THE REAL BLOCKER — structural.** The generated SOV/VSO event-handler pattern
   (`generateSOVPatientFirstEventHandlerPattern` in
   `packages/semantic/src/generators/event-handlers-sov.ts`) is
   `{patient} {marker} {event} {marker} {verb}` — it **ends at the verb**. It has
   no slots for transition's `goal` / `destination` / `duration`, which the i18n
   transformer emits **after** the verb (`… 전환 0 에 500ms`) because those roles
   aren't in the language's `canonicalOrder` (they land in the `remainingOrder`
   tail, after the event clause). So those trailing tokens are always
   unmatched leftovers; ko `으로`/`에서` only ever "matched" via a fragile
   secondary path, never the transition pattern itself.
4. **The patient-type widening (`expectedTypes: ['literal','selector','identifier']`)
   is correct but inert for the metric.** It makes `transform`/`*background-color`
   behave exactly like `opacity` in the SOV pattern's patient slot, but the
   leftover-token problem above means no end-to-end outcome changes (verified:
   broad 23-lang probe still fails exactly ko/tl color+transform).
5. **i18n has no per-command role lever** — `to`→`destination` is global, so the
   transition body can't be cleanly re-marked there without touching every
   command that uses `to` for an element destination (`add .x to #el`).

**Corrected scope:** landing `transition-*` requires **new post-verb-role
SOV/VSO event-handler pattern variants** in the generator (emit
`… {verb} {goal} {goal-marker} [{duration}]`) reconciled with the i18n output,
verified for zero regression across all SOV/VSO languages — a genuine
multi-session refactor, **not** the ~6-instance drive-by the metric implies.
The June-2026 session deliberately **deferred** this (poor ROI vs. risk) after
confirming the above, and instead shipped a tractable win elsewhere
(qu `install` collision). The findings below (1–3) are the original, partly
inaccurate analysis — kept for history; trust this block over them.

## Target failures

| Pattern                | Langs  | raw_code                                                       |
| ---------------------- | ------ | -------------------------------------------------------------- |
| `transition-color`     | ko, tl | `on click transition *background-color to "blue" over 500ms`   |
| `transition-transform` | ko, tl | `on click transition transform to "scale(1.2)" over 300ms`     |
| `transition-opacity`   | tl     | `on click transition opacity to 0 over 500ms then remove me`   |
| `window-resize`        | qu, tr | `on resize from window debounced at 200ms call adjustLayout()` |

~7 instances. `transition-*` is the tractable core; `window-resize` is harder
(stacked `from window` + `debounced at 200ms` modifiers) and may stay deferred.

## Why it's two systems (read first)

The multilingual harness parses **DB translations**, produced by the **i18n
GrammarTransformer**, then parsed by the **semantic** parser. A pattern only
passes when _both_ agree on the surface form:

- **i18n** (`packages/i18n/src/grammar/`): `profiles/index.ts` gives each language
  a `canonicalOrder: SemanticRole[]` and a `markers` array
  (`{ form, role, position }`). `reorderRoles` orders roles by `canonicalOrder`
  and **appends any role not listed** (the `remainingOrder` tail);
  `insertMarkers` adds the per-role marker. `over` → `duration` role lives in
  `ENGLISH_MODIFIER_ROLES` (`constants.ts`).
- **semantic** (`packages/semantic/src/generators/`): `command-schemas.ts`
  `transitionSchema` (≈ line 1371) defines roles with `svoPosition`/`sovPosition`
  and `markerOverride: { <lang>: '<marker>' }`. The pattern generator builds the
  matchable template from this.

A fix must change **both** so the emitted marker/position matches the expected
marker/position, per language.

## Root-cause findings (from probing this session)

1. **`*style` patient is a selector, schema only accepts `literal`.**
   Since the Phase 1 tokenizer fix, `*background-color` / `*opacity` tokenize as
   `kind: 'selector'`. `transitionSchema.patient.expectedTypes` is `['literal']`,
   so the SOV pattern rejects it. Naively adding `'selector'` triggers the schema
   validator's own advisory (`SCHEMA_*` → "Remove 'selector' from expectedTypes")
   **and still didn't parse via the SOV generator** — so the generator's
   patient-type handling needs to genuinely accept a selector here, not just the
   `expectedTypes` list. This is why `opacity` (a literal patient) is fine but
   `*background-color` / (and `transform`, which also tripped) are not.

2. **`duration` role has no marker outside en, and lands after the event.**
   `transitionSchema.duration.markerOverride` is `{ en: 'over' }` only. In i18n,
   no profile lists `duration` in `canonicalOrder`, so `reorderRoles` appends it
   to the very end — _after_ the event clause in an event handler. Result (tl):
   `baguhin opacity sa 0 kapag click 500ms` — `500ms` dangles after `kapag click`,
   and `over` is dropped entirely (no duration marker to emit).

3. **Goal-marker mismatch (minor, ko).** i18n emits the generic destination
   marker `에` for transition's "to", but `transitionSchema.goal.markerOverride.ko`
   was `으로`. (Aligning to `에` only helps `opacity`, which already passed — so
   not worth doing alone, but fold it into the refactor for consistency.)

## Proposed approach (phased, verify each step against the full baseline)

### A. Semantic schema — accept `*style` patient + per-language duration marker

- `transitionSchema.patient`: accept selector-kind values for the property.
  Likely needs a change in the **pattern generator / role-type matcher**, not
  just `expectedTypes` (the validator pushes back on `'selector'`). Investigate
  where `SCHEMA_*` validation lives and how a role can legitimately accept "a CSS
  property that may tokenize as `*selector` or `literal`" — possibly a dedicated
  `style-property` expected type, or a generator special-case for `transition`.
- `transitionSchema.duration.markerOverride`: add ko/tl/qu/tr/ja/… forms for
  `over` so the generated pattern expects `<over-marker> <dur>`.
- Align `goal.markerOverride.ko` to the i18n-emitted `에` (passthrough-alignment).

### B. i18n transformer — place `duration` in the command body, with a marker

- Add `duration` to `canonicalOrder` for the affected profiles **immediately
  after `destination`/`goal`** (not at the end), so it stays inside the command
  body rather than trailing the event. ⚠️ `canonicalOrder` is shared by every
  pattern in that language — this is the high-risk edit. Prefer the smallest
  change that works (e.g. insert `duration` right after `destination`), and
  consider whether a targeted placement rule is safer than editing the array.
- Add a `duration` marker (`over` translation) to each affected profile's
  `markers`, matching the semantic `markerOverride` from step A.

### C. (Optional, harder) `window-resize`

- `from window` (source) + `debounced at 200ms` (event modifier) stack on the
  event. `debounced at` is an **event modifier**, distinct from the command
  `duration`. Likely needs event-modifier passthrough in the transformer +
  semantic recognition. Recommend deferring unless A/B generalize to it.

## Verification protocol (do not skip)

1. Rebuild `i18n` + `semantic` (`npx tsup --no-dts`) and `core` (`npx rollup -c`,
   for `dist/multilingual`).
2. **Probe with the harness's masking** — ad-hoc `GrammarTransformer.transform()`
   is NOT representative; the harness applies `maskSpans`/`unmaskSpans`
   (`packages/patterns-reference/src/sync/span-mask.ts`) first. Run probes from
   inside `packages/patterns-reference` and replicate:
   ```ts
   const { masked, spans } = SM.maskSpans(code);
   const t = SM.unmaskSpans(new GrammarTransformer('en', lang).transform(masked), spans);
   const node = await ml.parse(t, lang); // ml = MultilingualHyperscript
   ```
   (Use `await import('./src/sync/span-mask.ts')` — a static named import trips a
   tsx ESM quirk.) Note `ml.parse` (harness path) ≠ bare semantic `parse()`; the
   bare form fails many event-wrapped patterns that the harness passes.
3. `db:init:force` + `sync:translations` (in `packages/patterns-reference`), then
   regenerate the baseline:
   `npm run test:multilingual --prefix packages/testing-framework -- --full --bundle browser-priority --save-baseline`
4. **Diff against the pre-change baseline — require zero `↓` regressions** across
   ALL 24 languages (canonicalOrder edits have a wide blast radius).
5. Restore the binary DB (`git checkout packages/patterns-reference/data/patterns.db`)
   — never commit it.
6. Run the `semantic` suite (the `build-artifacts.test.ts` `.d.ts` failures are
   environmental) and `i18n` grammar tests; add regression tests for the new
   transition forms.

## Risk / go-no-go

- **Highest risk:** editing `canonicalOrder` (step B) — it governs word order for
  every pattern in a language. Budget time for per-language baseline diffing.
- **Medium:** the schema patient-type change (step A) — could affect `transition`
  parsing in already-passing languages; verify ar/en/es/de etc. stay green.
- If step A's selector-patient change can't be made without broad fallout, an
  alternative is a **hand-crafted `transition` pattern per language** (like the
  `set`/`put` hand-crafted patterns in `packages/semantic/src/patterns/`), which
  sidesteps the generator/validator but adds per-language pattern files.

## Expected payoff

~5 `transition-*` instances (ko ×2, tl ×3) → avg ≈ 98.5% → ~98.6–98.7%, taking
tl toward ~95% and ko toward ~97%. `window-resize` (+2) only if step C lands.
Small absolute gain for non-trivial risk — sequence it deliberately, not as a
drive-by.
