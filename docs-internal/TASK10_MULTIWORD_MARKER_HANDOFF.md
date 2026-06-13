# Task #10 handoff — multi-word marker keywords → retire compound lists → dict underscore audit

> **Status:** ready to start. Unblocked by #416 (the multi-word keyword
> tokenization keystone). One coherent arc, 3 phases, each gate-verified and
> shippable on its own. Start with Phase A (lowest risk, already unblocked).

## Objective

Finish the §7v/§7w "retire the underscore convention" work: make every language
write its multi-word keywords the **natural** way (real single word, or natural
spaced phrase), and delete the per-language hardcoded compound lists. This removes
both an authoring smell (`snake_case` in natural-language code) and a class of
latent parse bugs (most tokenizers split on the underscore character).

## What #416 already did (your foundation)

The framework base tokenizer now does **profile-driven longest-phrase multi-word
keyword matching** (`packages/framework/src/core/tokenization/base-tokenizer.ts`):

- `initializeKeywordsFromProfile` builds `multiWordKeywords` = the space-containing
  `profileKeywords`, **minus** anything whose normalized is in
  `MARKER_CONCEPT_NORMALIZEDS`.
- `tokenizeWithExtractors` calls `tryMultiWordKeyword` (after whitespace-skip,
  before the per-language extractors) — matches the longest multi-word profile
  keyword at a word boundary, emits ONE keyword token.

So **non-marker** multi-word keywords (verbs, control-flow, event names) already
tokenize naturally across all languages. The remaining work is the **marker**
concepts that were deliberately excluded, plus the dict cleanup.

## The blocker (why markers were excluded)

`MARKER_CONCEPT_NORMALIZEDS` excludes into/from/to/with/before/after/over/…

- role names (patient/destination/source/event/eventMarker/…). Reason: the
  **pattern matcher consumes markers as single tokens** (peek/advance one token,
  checked by `kind ∈ {particle, keyword, identifier}` and `.value`/`.normalized`
  — see `packages/semantic/src/parser/pattern-matcher.ts`, e.g. the source-clause
  matcher ~L228–247 and the generic marker matcher ~L692–707). When the first cut
  let markers into multi-word matching, two real regressions appeared:

* **id `ke dalam` (into)** — `ke dalam` matched as one `into` keyword token, which
  **shadowed the single-word `ke` destination marker** the generated put pattern
  expects (`put {patient} <ke> {dest}`). Put stopped parsing.
* **ko `할 때` (eventMarker)** — pre-empted the SOV event extraction
  (`trySOVEventExtraction`), breaking modal-close-backdrop + the #367 work.

**Key distinction to internalize:** there are TWO kinds of marker phrase.

1. **Overlap-conflict** (id `ke dalam`): a single-word marker (`ke`) already
   exists and the patterns use it; the multi-word _keyword_ form (`ke dalam`=into)
   is redundant and must NOT shadow it. → keep it out of multi-word matching.
2. **Genuinely multi-word marker** (hi `से पहले`=before, vi `vào trong`=into):
   there is NO single-word form; the marker IS the phrase. The pattern matcher
   must accept the multi-word token here. → needs the Phase-B fix.

Longest-first matching already disambiguates the two readings at the _token_
level (`से पहले`→before only when ` पहले` follows; else `से`→from). The gap is
purely on the _pattern-matcher_ side accepting a multi-word marker token.

## Phases

### Phase A — non-marker underscore audit (UNBLOCKED NOW, lowest risk)

Many dict `_` forms are NOT markers (events, verbs, compounds) and #416 already
makes their natural spaced forms tokenize. Migrate them now:

1. Enumerate every `_`-joined value in `packages/i18n/src/dictionaries/*.ts`
   whose normalized concept is **not** in `MARKER_CONCEPT_NORMALIZEDS`
   (e.g. hi events `डबल_क्लिक`, `माउस_नीचे`; any `X_Y` verb/event/compound).
2. For each, confirm the natural spaced form tokenizes to the right keyword
   (probe: `getTokenizer(lang).tokenize('X Y').tokens`), then change `X_Y`→`X Y`
   in the dict.
3. Per-language, gate-verify (no regression) and migrate in small batches.
   These are pure naturalness fixes (should be ~zero metric change), but some may
   be **latent bugs** (a `_` form that never tokenized → the corpus silently used
   a fallback); those will show as fidelity _improvements_.

> Triage within Phase A: prioritize forms that appear in the **gate corpus**
> (they affect real parses) over decorative ones. Use the lexicon-emit-mismatch
> auditor (`packages/semantic/test/lexicon-emit-mismatch.test.ts`) and a corpus
> grep over `patterns.db` (`SELECT language, hyperscript FROM pattern_translations
WHERE INSTR(hyperscript, char(95)) > 0` — `char(95)` is the underscore) to find
> the live ones.

### Phase B — multi-word marker support in the pattern matcher (the keystone)

Make the marker-matching paths accept a multi-word marker **token** (the base
tokenizer already emits one if the marker is in `multiWordKeywords`). Two sub-steps:

1. **Decide the inclusion rule.** Remove from `MARKER_CONCEPT_NORMALIZEDS` only
   the concepts that are **genuinely multi-word with no single-word conflict** in
   the languages that need them (start with `before`/`after`/`until`, which are
   put-position modifiers, not destination markers). KEEP `into`/`from`/`to`/
   `destination`/`eventMarker` excluded for now (the id/ko overlap class) — or fix
   those via the marker matcher (below) before removing them.
2. **Teach the pattern matcher to accept the multi-word marker token.** The marker
   matchers compare `marker.normalized ?? marker.value` against the profile's
   roleMarker `primary`/`alternatives`. If the base tokenizer emits `से पहले` as
   one `before`-normalized keyword token, the matcher must recognize it where it
   expects the `before`/position marker. Verify the roleMarker→pattern wiring (the
   generated patterns in `packages/semantic/src/generators/`) treats the
   multi-word marker token the same as a single-word one.

> Measure-first: pick ONE genuinely-multi-word marker (hi `से पहले`=before) and
> drive it end-to-end (tokenize → pattern match → AST) before generalizing. The
> id `ke dalam` overlap is the hard case — leave `into` excluded unless you
> explicitly make the put pattern prefer the multi-word marker when present.

### Phase C — retire the hardcoded compound lists

Once A+B cover the phrases, delete:

- the hindi extractor's compound allowlist
  (`packages/semantic/src/tokenizers/extractors/hindi-keyword.ts`, the
  `[' के लिए', ' के साथ', …]` array + its space-walking branch);
- the vietnamese extractor's `multiWordPhrases` (~80 entries)
  (`packages/semantic/src/tokenizers/extractors/vietnamese-keyword.ts`).

Before deleting each entry, confirm the base mechanism covers it (it must be a
profile keyword, and either non-marker or handled by Phase B). Gate-verify after
each list. Watch for entries that are in the hardcoded list but NOT in the profile
(those would break — add them to the profile first).

## Method (unchanged repo discipline)

- **One mechanism per PR**, measure-first probe before editing, clean A/B on the
  same DB, lock test + regenerate baseline (`--save-baseline`), `patterns.db`
  never committed, prettier the baseline.
- **Gate:** from a cold/changed tree —
  ```
  npm run test:multilingual:build-deps
  npm run populate --prefix packages/patterns-reference
  cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
  ```
  Then `--save-baseline` (24-language list) after an intentional change; revert
  `patterns.db`; `npx prettier --write` the baseline before commit.
- **Also run** framework + semantic + i18n + all 8 domain suites (the base
  tokenizer is shared — `npm run test:check --prefix packages/<pkg>`).

## Gotchas

- `multiWordKeywords` is **case-sensitive** against the stored native form
  (mirrors `tryProfileKeyword`); the i18n dicts emit a fixed surface case.
- Lengths use UTF-16 code units consistently (don't `toLowerCase()` before
  slicing — German `ß` etc. change length).
- The base multi-word match runs BEFORE the per-language extractors, so the
  hardcoded lists are already mostly-dead for non-marker phrases; deleting them is
  safe only after confirming base coverage.
- Domains share the framework base tokenizer — they're unaffected today (no
  marker-eligible multi-word keywords), but re-run their suites after Phase B.

## Definition of done

- The hindi + vietnamese hardcoded compound lists are deleted.
- No `_`-joined keyword surface form remains in the dicts where a natural form
  parses (or the residue is documented as genuinely needing `_`).
- `MARKER_CONCEPT_NORMALIZEDS` is reduced to only the concepts that truly cannot
  be multi-word-matched (documented why).
- Gate green; all package suites green; lock tests added.
