# Handoff: burn down the R3-discovered value-bug families

> **RESOLVED 2026-07-10** (fix/r3-value-bug-families). F1–F5 + F8 fixed, F6
> wontfix'd, F7 re-filed to the transformer arc — per-family outcomes and the
> corrected root causes (F2 was NOT the tokenizer; F5's markerVariants
> hypothesis could not work; F4 was the fused VSO event pattern, not
> markerlessFetch) live in `docs-internal/MULTILINGUAL_NEXT_STEPS.md`
> § "R3-discovered value-bug families". Unit locks:
> `packages/semantic/test/multilingual-roadmap-fixes.test.ts` § "R3 value-bug
> families". Kept for the probe method + traps sections below.
>
> **For a fresh session.** Read this, then CLAUDE.md ("Multilingual parse rate ≠
> fidelity" — R3 is signal 8 — and "Running the multilingual `--regression` gate
> locally"), then `docs-internal/MULTILINGUAL_NEXT_STEPS.md` § "R3-discovered
> value-bug families". Branch from `main` at or after `0f562a50` (#634, the R3
> arc) — the signal, the report tooling, and the triage below all landed there.

## Why this arc

The R3 value-recall signal (#634) compares language-invariant role VALUES
(selectors, sigil refs, time literals, colon-qualified event names, URLs)
verbatim against the en reference. Its first sweep surfaced **50 sub-1.0
instances across 18 patterns** — all triaged with live probes into the families
below, all **baseline-recorded** (the ratchet only catches *further*
regressions; it will not push these down). Most are invisible to every other
signal: right actions, right role types, wrong value. Several have real runtime
consequences. Current floor: cross-language avgValueRecall **0.9861**
(authoritative numbers: `packages/testing-framework/baselines/multilingual-priority.json`).

Every family below was verified by parsing the actual corpus text and dumping
roles — the captures shown are real, not inferred.

## The families (probe evidence → suspected cause), in suggested order

### F1 — connective swallowed as `increment.quantity` (highest value)

- **Where:** ar/it/ms/pl/tl/vi × `repeat-until-event`; bn-excluded set
  it/ms/pl/ru/uk/vi × `repeat-while`. 14 instances, 8 languages.
- **Probe:** it `… incrementare #counter allora aspettare 200ms …` →
  `increment: patient="#counter"(selector) | quantity="then"(literal)`.
  pl identical (`wtedy` → `"then"`). en gets `quantity=1` via the schema
  default (`fillSchemaDefaults`); these languages capture the **normalized
  connective** as an explicit quantity.
- **Runtime:** increment by `"then"` — NaN-shaped. This is a live behavior
  divergence, not just a signature mismatch.
- **Suspect:** the SVO-generated increment pattern captures the trailing
  token into the optional `quantity` role with no numeric constraint. Look at
  the increment schema's quantity role (`command-schemas.ts` — compare how
  other numeric roles constrain `expectedTypes`/dataType) and at where
  generated patterns should treat normalized connectives (`then`) as
  stop-tokens for role capture. Note ru/uk fire only on `repeat-while` and
  ar/tl only on `repeat-until-event` — check both corpus renderings when
  verifying.

### F2 — bn duration-glue (single tokenizer, contained)

- **Where:** bn × 6 patterns: `repeat-until-event` (100ms), `repeat-while`
  (200ms), `repeat-forever` (1s), `copy-to-clipboard` (2s),
  `stagger-animation` (100ms), `tell-other-element` (200ms).
- **Probe:** bn repeat-while → `wait: duration="200msশেষ"(literal)` — the
  block terminator শেষ (end) glued onto the latin-digit token.
- **Suspect:** the Bengali tokenizer's character classification does not
  break at the latin/digit→Bengali script transition. Fix in
  `packages/semantic/src/tokenizers/` (bn); compare how other non-Latin
  tokenizers handle script-boundary breaks. bn currently sits at
  avgValueRecall 0.958 — this family is most of the residue.

### F3 — SOV `in me` qualifier glue/drop (hardest — hottest SOV path)

- **Where:** bn/hi/ja/ko/qu × `form-disable-on-submit`.
- **Probe:** en → `add.destination="<button/>"` + `put.destination="<button/>"`.
  ja/bn → `add: destination="me"(reference)` (the `<button/> in me` phrase
  LOST; destination fell back to the schema default) and
  `put: destination="<button/>inme"(selector)` — glued, whitespace elided,
  type still `selector` so **R1 scores the put perfect**.
- **Two sub-defects:** (a) the SOV reorder loses add's qualifier phrase
  entirely; (b) the CSS-selector extraction glues `<button/>` + untranslated
  `in me` into one token. Note the corpus renderings keep literal English
  `in me` inline — if the fix ends up touching corpus/renderer text, remember
  **corpus rewrites couple to the fidelity baseline** (memory:
  corpus-rewrites-couple-to-fidelity): resweep and inspect, don't trust exit 0.
- **Regression-sensitive:** this is the SOV event/role anchoring path that
  previous arcs treated carefully. Guard R0/precision/parse-rate.

### F4 — pl/ru/uk `fetch` URL mis-role

- **Where:** pl/ru/uk × `fetch-with-method`, `fetch-with-headers`,
  `fetch-with-method-body`, `fetch-formdata` (12 instances).
- **Probe:** pl `pobierz /api/form z method:"POST" body:form` →
  `fetch: patient="/api/form" | source="method"`. en →
  `fetch: source="/api/form" | style="method"`.
- **Suspect:** the Slavic *with*-preposition (`z`/`с`/`з`) is being read as
  the fetch `source` marker, displacing the URL into `patient`. Check the
  pl/ru/uk profile role markers vs the fetch schema (`patterns/fetch.ts` has
  the per-language pattern shapes; `sovFetch` precedent shows how markers were
  fixed for other languages). Partially R1-visible (role types differ), fully
  R3-visible. Runtime-relevant: the fetch target is wrong.

### F5 — hi `transition` duration drop (likely small)

- **Where:** hi × `transition-opacity/transform/color`, `fade-out-remove`.
- **Probe:** hi `opacity को क्लिक पर संक्रमण 0 में 500ms …` →
  `transition: patient | goal=0 | destination` — **no duration role at all**
  (en has `duration="500ms"`). The `में` marker before `500ms` is not being
  read as transition's over/duration marker.
- **Suspect:** transition schema duration-role marker for hi — possibly the
  same `markerVariants` one-liner shape as the hi/qu/bn trigger fixes
  (`command-schemas.ts`, #588 machinery). R1-visible (role missing) but
  sub-threshold in aggregate; R3 pinpoints it.

### F6 — `swap` role-binding flip (decide: align or wontfix)

- **Where:** ar/bn/hi/ja/ko/qu/tl/tr × `swap-content` (8 instances, the
  single biggest pattern).
- **Probe:** en `swap #a with #b` → `destination="#a" | patient="#b"` (note:
  arguably backwards). ja `#a を … #b で` → `patient="#a" | destination="#b"`
  — the transformer marks `#a` accusative. Same role-type SET, so R1 is
  totally blind; runtime-benign (swap is symmetric).
- **Decision needed:** align the en swap schema's positional role mapping
  with the transformer's marking (moves the baseline; watch R1), or document
  as permanent noise. Don't special-case the R3 walker per-action — if
  wontfix, record the rationale in NEXT_STEPS and leave the rows visible.

### F7 / F8 — residue (optional)

- **F7:** qu misses `trigger.event=sortable:move`+`sortable:start`; tr misses
  `sortable:move` + `remove.patient=.{dragClass}` (`behavior-sortable`).
  Sibling of the FIXED bn accusative gap (#634) — but bn's fix was markers;
  qu/tr are likely reorder placement. Also adjacent to the open qu
  `behavior-resizable` side-quest (NEXT_STEPS § Colon-event-names follow-ups
  item 2, locked by `it.fails` in `multilingual-roadmap-fixes.test.ts`).
- **F8:** ms `ulang 3 kali …` → `repeat: loopType=3`, no `quantity` (en:
  `quantity=3, loopType="times"`). R1-visible; single row.

## Method (reuse this loop per family)

1. **Corpus text:** `sqlite3 packages/patterns-reference/data/patterns.db
   "SELECT raw_code FROM code_examples WHERE id='<pattern>'"` and
   `"SELECT language, hyperscript FROM pattern_translations WHERE
   code_example_id='<pattern>' AND language IN (…)"`.
2. **Probe:** a throwaway `.mts` file placed **inside
   `packages/testing-framework/`** (workspace module resolution; `.mts` so tsx
   allows top-level await), importing `MultilingualHyperscript` from
   `@hyperfixi/core/multilingual` + `fillSchemaDefaults` from
   `@lokascript/semantic`, walking `body/statements/thenBranch/elseBranch/
   branches/eventHandlers/initBlock` and printing
   `role=(value.value ?? value.raw ?? value.name)(type)` per command. End with
   `process.exit(0)` (tsx probes hang otherwise). Delete before committing.
3. **Fix + unit test** in `packages/semantic` (follow the
   `multilingual-roadmap-fixes.test.ts` / `draggable-patterns.test.ts`
   conventions; lock any gap you find-but-don't-fix with `it.fails`).
4. **Sweep feedback:** ordered build → populate → full sweep **without**
   `--regression`. The console "Role values (R3)" section lists every
   `pattern / lang / missing action.role=value` row — your fixed rows should
   vanish and no new rows appear. Per-pattern detail also serializes to
   `test-results/results.json` (`valueRecall`, `valueRecallMissing`; the roles
   themselves serialize as `{}` — never read those from JSON).

## Traps (all hard-won; do not relearn)

- **Sequence strictly:** src changes → `npm run test:multilingual:build-deps`
  → `npm run populate --prefix packages/patterns-reference` → sweep. The gate
  and `--save-baseline` REFUSE on any guarded package whose `src/` is newer
  than its dist. `git stash` bumps mtimes and trips it. Never pipe the gate to
  `tail`; redirect to a file and check `$?`.
- `semantic/dist` resolves `@lokascript/framework` at **runtime** — after
  touching framework, rebuild both or semantic tests throw
  `this.<fn> is not a function`.
- **Every fix here RAISES avgValueRecall** (and possibly avgRoleFidelity /
  avgPrecision) → the gate will NOT fail, but regenerate the baseline anyway
  (`--save-baseline` on a freshly populated db, then
  `npx prettier --write baselines/multilingual-priority.json`) so the ratchet
  floor rises with you. Commit the baseline, **never** `patterns.db`. One
  regen at the end is fine if the families land as one PR; per-PR if split.
- F3/F4 touch the hottest SOV/marker paths — watch parse-rate, precision, and
  the R2 execution rows in the sweep output, not just R3.

## Definition of done (suggested)

- F1–F5 fixed, each with unit tests; their R3 report rows gone.
- F6 decided (schema/renderer aligned **or** wontfix documented in
  NEXT_STEPS); F7/F8 fixed or explicitly re-filed.
- Full `--regression` gate green; baseline regenerated + prettier'd +
  committed; NEXT_STEPS § "R3-discovered value-bug families" updated with
  per-family outcomes; this handoff marked resolved in its header.
- Stretch target: cross-language avgValueRecall = 1.000 minus documented
  wontfixes (bn should reach 1.0 once F2 lands).
