# Handoff: the R1 role-fidelity arc (SOV six — qu first, then ja/ko/tr)

> **RESOLVED 2026-07-11** (branch `fix/r1-role-fidelity-sov`). All targets
> exceeded: qu 0.9522 → **0.9792** (target ≥ 0.97); ja 0.9738 → **0.9938**,
> tr 0.9719 → **0.9927**, ko 0.9706 → **0.9905** (targets ≥ 0.98); stretch
> bn 0.9738 → **0.9938**, hi 0.9706 → **0.9883**. Families A/B/C fully
> cleared; Family D: four increments landed (D1 sigil refs + set marker
> swap, D2 fused-simple trailing-expression reclaim, D3 optional-chaining
> possessive fold, D4 verb-final for-binding heads), remainder deferred with
> per-entry reasons — see "Family D outcomes" at the end of this doc.
> Regression gate green after every family; baseline regenerated.
>
> **For a fresh session.** Read this, then CLAUDE.md ("Multilingual parse rate ≠
> fidelity" and "Running the multilingual `--regression` gate locally"), then
> `docs-internal/HANDOFF_transformer-rendering.md` (RESOLVED — its method and
> traps carry over verbatim, especially the "scoped fixes, not blanket reorder"
> lesson and the full-body-probe discipline). Branch from `main` **after PR
> #636** merges (it landed the wait/repeat render fixes and the curated-end
> guards; the `--triage-r1` tool lands as this arc's preamble commit).

## Why this arc

R1 (role fidelity: recall of the en reference's `action.role:valueType` set,
per pattern, averaged per language) is the last broad fidelity signal below
~0.99. The SOV six lag the corpus; the 2026-07-10 baseline
(`packages/testing-framework/baselines/multilingual-priority.json`):

| lang | avgRoleFidelity | misses | patterns hit |
| ---- | --------------- | ------ | ------------ |
| qu   | **0.9522**      | 33     | 27           |
| hi   | 0.9706          | 19     | 18           |
| ko   | 0.9706          | 19     | 18           |
| tr   | 0.9719          | 20     | 18           |
| bn   | 0.9738          | 17     | 16           |
| ja   | 0.9738          | 17     | 16           |

qu sits ~2 points below its own cohort, so the arc is **qu to ≥ 0.97 first**,
with the shared-family fixes lifting ja/ko/tr toward ~0.98 on the way. bn and
hi were triaged too (2026-07-10): they share Family A and the Family D tail
almost line-for-line, so the cohort fixes lift all six.

## The triage tool (new in #636's follow-up — run this first, trust it)

```bash
npm run test:multilingual:build-deps        # the tool warns on stale dists
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority \
  --triage-r1 --languages qu,ko,ja,tr
```

`--triage-r1` (`src/multilingual/tools/triage-r1.ts`) itemizes every missing
`action.role:type` entry vs the en reference, clustered, with the entries the
language captured INSTEAD for the same action (the mistype pairing). It uses
the exact gate pipeline (`ParseValidator` → `fillSchemaDefaults` →
`collectRoleSignature` → Set recall), so its per-language averages reproduce
the committed baseline to 4 decimals — a fix that moves the triage moves the
signal.

## The miss families (2026-07-10 triage, verbatim clusters)

### Family A — `with`-options blob dropped: `fetch.style` / `render.style` (ALL four, 6 misses each)

- `fetch.style:expression` ×4 in every language: `fetch-with-method`,
  `fetch-with-headers`, `fetch-with-method-body`, `fetch-formdata`.
- `render.style:expression` ×2 in every language:
  `render-template-with-data`, `morph-with-template`.
- **No "captured instead" pairing** — the options blob (`with method:"POST"
  body:…` / `with {…}`) vanishes from the SOV parse entirely; en captures it
  as `style:expression`.
- 24 misses across the four languages — the single largest family, and the
  best effort-to-lift ratio in the arc (~+0.01 per language by itself).
- Suspect the SOV fetch/render patterns (see `sovFetch` in
  `packages/semantic/src/patterns/fetch.ts`, added in the 2026-06-17
  increment) simply have no trailing/fronted options group. Check where the
  i18n transformer puts the `with`-phrase in SOV renders first (probe the
  render, then the parse — pull the actual corpus text from patterns.db).

### Family B — qu `set` possessive/property-path mis-rolling (qu ONLY, 7 misses)

- `set.patient:expression` ×4: `two-way-binding`, `computed-value`,
  `template-literal-interpolation`, `template-literal-list-build`.
- `set.destination:property-path` ×3: same patterns minus list-build.
- Captured instead: `set.destination:literal`, `set.patient:literal`,
  `set.patient:selector`, `set.source:selector` — the qu parse finds A set
  but scrambles which side is the property-path destination and which the
  expression value.
- This family is most of qu's gap below the cohort. Probe the qu renders of
  `two-way-binding`/`computed-value` (possessive `noqaq …`/`X ın Y` analogues
  — qu possessive config in `packages/semantic/src/generators/profiles/quechua.ts`)
  against the qu set patterns; the transformer-rendering arc's paired
  render+pattern method applies.

### Family C — tr/qu or-run wait junk (2 misses each; the #636 leftover)

- `wait.event:literal` missing in `behavior-sortable` + `behavior-resizable`;
  captured instead `wait.duration:expression` (the `duration=")"` junk).
- The renders are now CORRECT verb-final (`belge den pointermove(clientY)
  veya pointerup(clientY) bekle` — #636); no tr/qu wait pattern matches the
  or-run + from-phrase shape, so the verb-anchoring fallback bins the run as
  a junk duration.
- **Key scoping fact:** R1 is a Set recall of TYPES. The en reference for the
  or-run wait captures ONLY `wait.event:literal` (first event; it drops the
  or-alternatives and the source itself). Parity therefore needs a tr/qu wait
  pattern that captures ANY event as `event:<literal>` — e.g.
  `[{source} den] {event} veya <event2> bekle`-shaped. **Do NOT "improve" the
  en reference parse instead** — en defines the denominator for all 24
  languages, and raising it (capturing both events + source) would instantly
  drop R1 everywhere until every language catches up (the R3 en-firestorm
  note's R1 analogue).

### Family D — the SOV-cohort ×1 type-mistype tail (~10 families, one miss per language each)

Same entries recur across ja/ko/tr/qu (each is ONE fix exercised four ways;
check bn/hi too):

| missing (vs en)                | captured instead              | pattern                       |
| ------------------------------ | ----------------------------- | ----------------------------- |
| `js.patient:expression`        | `js.patient:reference`        | js-inline                     |
| `go.destination:expression`    | `…:reference` / `…:literal`   | go-url                        |
| `log.patient:property-path`    | `log.patient:expression`      | optional-chaining-possessive  |
| `pick.patient:expression`      | `…:literal` (+qu extras)      | pick-text-range               |
| `scroll.destination:expression`| `…:reference` / `…:selector`  | last-in-collection            |
| `set.destination:reference`    | `set.destination:literal`     | beep-debug-expression         |
| `fetch.source:literal`         | `fetch.source:expression`     | event-debounce                |
| `halt.patient:reference`       | (dropped / `…:expression`)    | form-submit-prevent           |
| `for.patient` + `for.source`   | `for.*:literal`               | template-literal-list-build   |
| `focus.patient:expression`     | `…:reference` / `…:selector`  | focus-trap                    |

These are value-TYPE classification drifts (tokenizer/`tokensToSemanticValue`
typing differs from en's), not structural drops. Cheap individually IF the
root is a shared classifier; expensive if each is bespoke. Triage the top 3–4
(js-inline, go-url, optional-chaining, event-debounce) before committing to
the tail — a shared-root fix here pays ×4–×6 (all SOV languages at once).

### Explicitly OUT of scope

- **swap-content** (`swap.destination:selector` ×1 in tr/qu): the F6 wontfix
  family (NEXT_STEPS § R3 families item 6, decision 2026-07-10). The tr/qu R1
  rows are the same root; do not chase without reopening that decision.
- **ko `on.event` ×2** (`when-value-changes`, `when-multiple-changes`) and
  **qu `on.event:expression` ×2**: reactive `when (<expr>) changes` heads —
  they abut the event-anchor guard machinery (hottest path); take them only
  if Family D's method happens to cover them.

## Where the code lives

- **Triage:** `packages/testing-framework/src/multilingual/tools/triage-r1.ts`
  (`--triage-r1`); signatures in `src/multilingual/fidelity.ts`
  (`collectRoleSignature` — `action.role:type`, `STRUCTURAL_ACTIONS` excluded,
  schema defaults materialized by `fillSchemaDefaults` before collection).
- **SOV patterns:** `packages/semantic/src/patterns/*.ts` (fetch.ts has the
  `sovFetch` precedent; wait.ts, set.ts) + generated patterns from
  `packages/semantic/src/generators/` profiles.
- **Verb-anchoring fallback + role typing:**
  `packages/semantic/src/parser/semantic-parser.ts`
  (`parseSOVClauseByVerbAnchoring`, `extractRolesFromMarkedTokens`,
  `tokensToSemanticValue`) and `pattern-matcher.ts` (`matchRoleToken`,
  curated-end guards from #636 — do not undo).
- **Renders:** probe with `GrammarTransformer` per the transformer-rendering
  handoff; corpus text via
  `sqlite3 packages/patterns-reference/data/patterns.db "SELECT hyperscript
  FROM pattern_translations WHERE code_example_id='…' AND language='…'"`.

## Method (inherited from the transformer-rendering arc — it worked)

1. **Triage first, per family**: re-run `--triage-r1` (add `--languages
   bn,hi` for the cohort check); pick the family, pull the corpus renders,
   parse the FULL bodies (fragments parse differently than in-body — probe
   with `semanticParser.parseStatements` or full-behavior `parse`, dumping
   `metadata.patternId` to see which pattern actually matched).
2. **Scoped fixes only**: per-command patterns / i18n rules, never blanket
   canonicalOrder or global reorder changes (see the resolved handoff's
   R3-12→39 post-mortem). Keep pre-arc shapes parseable (legacy tolerance
   locks) when a render changes.
3. **Never touch the en reference to gain R1** — it moves every language's
   denominator at once (Family C note).
4. After each family: ordered build → `populate` → re-run `--triage-r1` (the
   family's rows must vanish, no new rows in ANY language) → full sweep
   WITHOUT `--regression`, read every signal (R0/precision/multiset/R2/R3 —
   a pattern-side fix can change which pattern WINS a match and shift value
   captures).
5. Lock each fixed family with unit tests on corpus-shaped inputs (the
   `multilingual-roadmap-fixes.test.ts` conventions; `it.fails` for known
   residue).
6. `--regression` green → `--save-baseline` on a freshly populated db →
   prettier the baseline → audit the diff line-by-line → commit baseline,
   **never patterns.db**.

## Traps

- All of the transformer-rendering handoff's traps (stale dists — prettier
  in lint-staged bumps src mtimes at commit, rebuild before sweeping; tsx
  probes need `process.exit(0)`; probes run with cwd inside the package).
- `--triage-r1` warns on stale dists rather than refusing — heed the warning;
  the numbers describe the BUILT parser.
- R1 is Set-based: a fix that captures a role the en reference ALSO captures
  but with a repeated entry gains nothing; and R1-parity ≠ correctness — a
  captured-but-wrong VALUE moves R3, so watch both.
- Family A touches fetch — `fetch` patterns interact with the F4 pl/ru/uk
  mis-role relabel (`normalizeCommandRoles`) and the sovFetch patterns;
  regression-test those unit locks.
- The hottest-path warning stands: pattern-priority changes can flip which
  pattern wins on OTHER corpus rows. The full-sweep read (not exit code) is
  the guard.

## Definition of done

- qu avgRoleFidelity ≥ 0.97; ja/ko/tr each ≥ 0.98 (stretch: bn/hi lifted by
  the cohort families too).
- Families A and B fully cleared (triage rows gone); C cleared for tr/qu;
  D cleared for whichever entries share roots (documented outcome per entry,
  fixed or explicitly deferred with reason).
- No drops in any other signal (parse-rate, R0 fidelity/precision/multiset,
  R2, R3) in the full sweep; `--regression` green.
- New unit locks per fixed family; baseline regenerated + prettier'd +
  audited + committed (never patterns.db); this handoff marked resolved and
  NEXT_STEPS updated.

## Family D outcomes (arc close-out, 2026-07-11)

Probing overturned the shared-classifier hypothesis for most of the tail: the
big entries were **fused `*-sov-simple` default-role drops** (the Family A
geometry — argument stranded after the verb), not `tokensToSemanticValue`
mistypes. Per-entry ledger:

| entry (vs en)                   | outcome  | how / why |
| ------------------------------- | -------- | --------- |
| `set.destination:reference` (beep-debug) | **fixed** (D1) | sigil-ref branch in `tokenToSemanticValue` + unconditional set patient↔destination marker swap in `mapRoleForCommand` (set's surface order is dest-first; put untouched) |
| `js.patient:expression` (js-inline) | **fixed** (D2) | `tryAttachTrailingExpressionRole` — code run to clause boundary, split verb fragments (ja `実行`) trimmed |
| `go.destination:expression` (go-url) | **fixed** (D2) | same reclaim — run to the postpositional destination marker (primary surface only); fused default-`me` patient leak dropped |
| `scroll.destination:expression` (last-in-collection) | **fixed** (D2) | same reclaim as go |
| `log.patient:property-path` (optional-chaining-possessive) | **fixed** (D3) | possessive chain consumer now folds `?` + `.prop` links; en's TYPE (denominator) unchanged, its property string carries the full chain, byte-identical across all six |
| `for.patient:expression` + `for.source:reference` (template-literal-list-build) | **fixed** (D4) | verb-final `for-<lang>-sov-basic` heads for the SOV six (action `for`, en's for-en-basic roles); the fallback had shredded the head on the in/object particles |
| `fetch.source:literal` (event-debounce) | **deferred** | the en reference itself truncates the interpolated URL at the space inside `${my value}` (`source:literal="/api/search?q=${my"`); SOV captures junk `}`. Root is the URL extractor splitting inside `${…}` — a tokenizer fix that would also change the en value (R3-visible in all 24). Follow-up: teach the url extractor `${…}` spans, then realign |
| `pick.patient:expression` (pick-text-range) | **deferred** | the en reference is degenerate (`patient:expression="characters"` — first word only; pick's range roles aren't modeled). Chasing SOV parity against a junk denominator buys nothing; proper fix models pick's roles in the schema + transformer render |
| `halt.patient:reference` (form-submit-prevent) | **deferred** | transformer scrambles `halt the event` + `call validateForm()` across the fused event clause (tr binds validateForm() to halt and event to call; ja strands `the イベント` clause-initial). Render-side fix — a transformer-rendering follow-up, not a parse-side patch |
| `call.patient:expression` (form-submit-prevent tr / window-resize qu) | **deferred** | same root as halt above (fused-clause scramble) |
| `focus.patient:expression` (focus-trap) | **deferred** | the positional focus operand (`first <button/> in .modal`) leaks into the preceding if-CONDITION — SOV renders have no boundary marker between condition and command. Conditional-fold boundary geometry, adjacent to the event-anchor guard machinery (the "hottest path" warning) |
| `swap.destination:selector` (swap-content) | **out of scope** | F6 wontfix (NEXT_STEPS § R3 families item 6) — unchanged decision |
| ko/qu/hi reactive `on.event` rows (when-value-changes etc.) | **out of scope** | per this handoff's scoping — event-anchor guard machinery |

Residual per-language misses after the arc: bn/ja 4, tr 5, ko 6, hi 7, qu 13
(qu carries the qu-only put/toggle/scroll oddities plus the out-of-scope
rows). No "extract shared classifier" refactor is warranted — the increments
did not converge on the assembler logic (most fixes were reclaims/patterns,
not classifier branches).
