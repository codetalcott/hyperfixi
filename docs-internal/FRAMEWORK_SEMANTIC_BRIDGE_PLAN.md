# Framework ↔ Semantic Bridge Arc

**Status:** planned (2026-07-07) · follows the v2.6.0 multilingual launch
**Goal:** end the 8-vs-24 language drift — domain packages (and through them the MCP
servers) inherit the semantic stack's 24 language profiles instead of hand-authoring
grammar scaffolding per language.

## Context

The multilingual launch shipped 24 languages in `@lokascript/semantic` with
launch-bar fidelity (avgPrecision ≥ 0.995, avgRoleFidelity ≥ 0.985). The nine
`domain-*` packages are stuck at 8 languages (learn at 10) on a parallel,
hand-authored profile system. `packages/framework/src/multilingual/index.ts` has
carried a `TODO: Extract language profile templates from semantic package` since
the framework was extracted.

Adding a language to a domain today means authoring the **same language facts
three times** in three shapes:

1. a `PatternGenLanguageProfile` (`domain-sql/src/profiles/index.ts`)
2. a `createSimpleTokenizer` keyword list + `keywordExtras` + `keywordProfile`
   (`domain-sql/src/tokenizers/index.ts`)
3. `markerOverride: Record<lang, string>` on every schema role
   (`domain-sql/src/schemas/index.ts`)

…and most of that data (particles, adpositions, word order, tokenization
boundaries) already exists, better-curated and fidelity-tested, in
`KNOWN_PROFILES` (`packages/semantic/src/generators/known-profiles.ts`).

## Load-bearing facts (verified 2026-07-07)

- **Dependency direction:** `intent ← framework ← semantic`, `i18n → semantic`,
  every `domain-* → framework` (not semantic). `domain-toolkit → semantic`
  already (cycle-free precedent). **Framework can never import semantic.**
- **Structural assignability:** semantic's `LanguageProfile`
  (`packages/semantic/src/generators/profiles/types.ts`) is a structural
  **superset** of both shapes domains consume:
  - `PatternGenLanguageProfile` (`framework/src/generation/pattern-generator.ts`):
    `{code, wordOrder, keywords, roleMarkers?}` — assignable as-is.
  - `TokenizerProfile` (`framework/src/core/tokenization/base-tokenizer.ts:135`):
    `{keywords?, references?, roleMarkers?, possessive?}` — assignable as-is
    (usable directly as `createSimpleTokenizer({keywordProfile})`).
- **The real gap is vocabulary, not shape.** `generatePattern` looks up
  `profile.keywords[schema.action]`. Semantic keywords are the ~45 hyperscript
  verbs; `domain-sql` needs `select/insert/update/delete/get`. The domain must
  keep supplying per-language **keyword translations for its own verbs** — but
  nothing else.
- **Domain-reusable slice of a semantic profile:** `wordOrder`,
  `markingStrategy`, `roleMarkers`, `verb`, `tokenization`
  (particles/boundaryStrategy), `direction`, `script`, `usesSpaces`.
  Hyperscript-specific (excluded): `keywords`, `eventHandler`, `possessive`,
  `references`.
- **Prior art to follow:** `packages/semantic/src/types/unified-profile.ts`
  already converts between profile shapes (`toI18nProfile`,
  `markingStrategyToAdpositionType`). `patterns-reference/scripts/sync-translations.ts`
  is the canonical "iterate `KNOWN_PROFILES`, never hardcode languages" consumer.
- **Already done (don't re-plan):** `extractValue` is consolidated in
  `@lokascript/intent` and re-exported by framework — no domain-local copies
  remain. domain-toolkit lint R6–R10 are implemented; only **R5** (profile
  keywords ⊆ tokenizer keywords) is missing, and its header comment is stale.

## Design decision: injection, not import

The bridge lives in **framework** as *pure functions with structural parameter
types* — no semantic import. Domains import the **data** (`KNOWN_PROFILES` or
per-language subpaths) from `@lokascript/semantic` (a new, cycle-free dep edge:
`domain → semantic → framework → intent`) and inject it into the framework
builders.

Rejected alternatives:

- *Move the 24 profiles' grammar slice down into framework* — cleanest layering
  on paper (framework already owns `BaseTokenizer`), but it churns the
  fidelity-ratchet-protected semantic stack right after launch and splits each
  profile's source of truth across two packages. Revisit only if the injected
  approach proves awkward.
- *Bridge inside domain-toolkit* — wrong audience; toolkit is dev-time lint,
  the bridge is runtime wiring.

## Deliverables

### Phase 0 — Bridge utilities in framework (1 PR)

New module `packages/framework/src/multilingual/` (replacing the placeholder):

- `GrammarProfileSlice` — structural type mirroring the domain-reusable slice
  (`code`, `wordOrder`, `roleMarkers?`, `markingStrategy?`, `tokenization?`,
  `verb?`, `direction?`, `script?`, `usesSpaces?`, `name?`, `nativeName?`).
  Any semantic `LanguageProfile` satisfies it without a cast; so do minimal
  hand-rolled fixtures (tests need no semantic dep).
- `DomainVocabulary` — what a domain authors per language, and *only* this:
  `{ keywords: Record<action, {primary, alternatives?}>, tokenizerKeywords?:
  string[], keywordExtras?: KeywordEntry[], roleMarkerOverrides?: … }`.
- Builders:
  - `buildPatternProfile(slice, vocab): PatternGenLanguageProfile` — domain
    keywords + slice grammar (wordOrder, roleMarkers).
  - `buildDomainTokenizer(slice, vocab): LanguageTokenizer` — wraps
    `createSimpleTokenizer`; auto-derives `direction`, particle keywords from
    `slice.tokenization.particles` + `slice.roleMarkers`, `keywordProfile` from
    the slice, and attaches `LatinExtendedIdentifierExtractor` when
    `slice.script === 'latin'` (R8 behavior by construction).
  - `buildLanguageConfig(slice, vocab, meta?): LanguageConfig` — the one-call
    path into `createMultilingualDSL`.
  - `deriveRoleMarkers(slice, roleMapping): Record<lang-role-marker>` — derive
    schema `markerOverride` defaults from `slice.roleMarkers` given a domain-role
    → semantic-role mapping (e.g. sql `source`→`source` ('from'/'から'),
    `destination`→`destination` ('into'/'に')); explicit `markerOverride`
    entries still win.
- Unit tests with inline fixture slices (en-like SVO, ja-like SOV particle,
  ar-like RTL VSO) asserting each builder's output shape and the
  `createSimpleTokenizer` wiring.

### Phase 1 — Pilot on domain-sql (1–2 PRs)

`domain-sql` is the exemplar: richest per-language machinery, its own
`IMPROVEMENT_PLAN.md` history, an MCP surface, and a renderer.

1. **Parity first.** Add `@lokascript/semantic` to domain-sql's deps. Snapshot
   the currently generated patterns (`generatePatternVariants` output) for all
   8 languages × all schemas → golden file. Rebuild the 8 existing languages
   through the bridge (domain authors only `vocab/{lang}.ts` with SQL verb
   translations). Assert generated patterns are **identical** to the golden
   snapshot (or reviewed-and-intended diffs only). Existing test suite (~122
   tests) must stay green untouched.
2. **Then expansion.** Add **de, pt, ru** via the bridge: each new language is
   one small vocab file (5 SQL verbs + connectives), no profile/tokenizer/marker
   authoring. Round-trip tests per language: parse native → `SemanticNode` →
   `renderSQL`, mirroring the existing 8-language test pattern.
3. Run domain-toolkit lint (including new R5, see Phase 3) over the bridged
   configuration.

Exit criterion: domain-sql supports 11 languages with net-negative per-language
authoring cost, tests green.

### Phase 2 — Fan out (batched PRs)

Mechanical migration of the remaining registered domains: **bdd, behaviorspec,
jsx, todo, llm, flow, voice**. Same recipe as the pilot (golden-snapshot parity
for existing 8 languages, then vocab-only expansion). Batch 2–3 domains per PR.

> **Status: complete (2026-07-07).** Batch 1 todo+llm (#609), batch 2 jsx+voice
> (#610), batch 3 bdd+behaviorspec (#611), batch 4 flow (#612) + learn (#613).
> All eight fan-out domains are at 11 languages except bdd/behaviorspec (8 —
> renderer/marker tables make expansion non-vocab-sized; see the vocab-tooling
> backlog below) and learn (10, its pre-existing set; patternProfile-only
> migration per the note below). Next: Phase 3 (registry, CI, drift guards).

Language expansion beyond the pilot's 11 is *demand-driven per domain* — the
bridge makes it a vocab-file-sized task, so we don't need to force 24×9 at once.
Recommended floor: bring every domain to the pilot's language set.

`domain-learn` is special (its `LearnLanguageProfile` wraps `patternProfile`
plus morphology tables the bridge doesn't cover): migrate only its
`patternProfile` construction; morphology stays hand-authored.

### Phase 3 — Registry, CI, and drift guards (1 PR)

- **domain-config** (`packages/domain-config/src/index.ts`): stop hardcoding
  `['en','es','ja','ar','ko','zh','tr','fr']` ×8 — each registration derives
  `languages` from the DSL's actual registered languages (expose/reuse
  `dsl.getSupportedLanguages()`). MCP servers pick this up automatically.
- **Wire `domain-learn`** into `createDomainRegistry()` + `DOMAIN_PRIORITY`
  (currently orphaned; the only 10-language domain).
- **Implement lint R5** in domain-toolkit (`rules/`): every
  `profile.keywords[*].primary`/alternatives must tokenize via the domain's
  tokenizer for that language — the exact drift a stale vocab file would cause
  under the bridge. Also refresh the stale "planned rules" header comment in
  `domain-toolkit/src/index.ts` (R6–R10 are implemented).
- **Add domains to CI**: include `domain-*` + `domain-toolkit` + `domain-config`
  in the `unit-tests` job of `.github/workflows/ci.yml` and the root
  `test:check` script; respect topological order (`check:ci-order` guards it).
  Add the new `domain-* → semantic` edges to the consumers' `pretest`
  ensure-fresh hooks (per root CLAUDE.md).

### Adjacent hygiene riding this arc (same seams, minimal extra scope)

From the 2026-07-07 architecture review — each rides the arc PR that already
touches its seam:

- **Rides Phase 0 (framework PR):** add `engines: {"node": ">=24"}` to root +
  stack package.json files and a repo `.nvmrc` (prevents the better-sqlite3
  `NODE_MODULE_VERSION` mismatch hit during the v2.6.0 release).
- **Rides Phase 1 (first semantic-consuming PR):** semantic exports two small
  query helpers — `getKeywordTranslations(keyword)` and
  `getRoleMarkers(lang, role)` — replacing the three hand-rolled copies in
  `mcp-server/src/tools/profiles.ts`, `language-server/src/server.ts`, and
  whatever the bridge would otherwise re-roll. (Migrate mcp-server/LSP callers
  in Phase 3 alongside the other MCP work.)
- **Standalone small PR within the arc (Phase 2 timeframe):**
  **grammar-types dedup** — i18n already depends on semantic, so delete
  `packages/i18n/src/grammar/types.ts`'s duplicated typology types +
  `joinTokens` and import semantic's canonical copy
  (`packages/semantic/src/types/grammar-types.ts`). Removes the
  "language-grammar.ts drift guard" item from the post-launch list outright.
  ⚠ i18n's transformer is inside the fidelity stack — run the full
  `--regression` gate on this PR.
- **Standalone small PR within the arc:** **i18n dependency footprint** — move
  `esbuild`, `vite`, `happy-dom` from `dependencies` to `devDependencies`;
  investigate narrowing the `@hyperfixi/core` runtime dep (a transform package
  should need intent types, not the whole engine). Verify with a clean
  `npm pack` + install of the tarball.

**Design note (end-state):** `GrammarProfileSlice` is deliberately the seed of a
future canonical "language pack" — a data-only leaf holding per-language grammar
facts, with semantic (parsing), i18n (generation), and framework/domains
(pattern-gen/tokenization) each projecting the slice they need. The existing
`unified-profile.ts` (`toI18nProfile`) is the half-built precedent. Full
consolidation is a post-arc (v2.7+) decision, made after the bridge reveals
which slice domains actually consume.

**Vocab-authoring ergonomics (backlog, surfaced authoring Phase 1–2):** hand-writing
`src/vocab/{lang}.ts` per domain is repetitive, and the same translation currently
lives in three unsynced places — `vocab` keywords, schema `markerOverride[lang]`,
and the renderer's `COMMAND_KEYWORDS`/`MARKERS` tables. A mismatch only surfaces as
a round-trip test failure. Two follow-ups:

- *Near-term — a vocab CLI:* `dump` (export a domain's vocab across all languages
  as one editable concept × language table), `scaffold` (generate a new-language
  vocab file from a template), and `validate` (every schema-marker word + vocab
  keyword must appear in that language's `tokenizerKeywords`, or it won't tokenize —
  the R5-adjacent lint).
- *Aspirational — a single lexicon:* one `concept → lang → translation` store as the
  source of truth, with vocab files, schema markers, and renderer tables all
  *generated* from it (kills the 3× authoring). This is the "language pack" end-state
  above, made concrete. Foothold already in the tree: `domain-voice`'s renderer
  derives markers from schemas via `buildMarkerLookup` instead of a parallel table —
  the pattern to generalize.

### Phase 4 (stretch, separate decision) — SOV/agglutinative rendering

Domains that render natural-language text back out (bdd/behaviorspec `render()`,
learn) would benefit from `joinTokens` + `canonicalOrder` (the i18n typology
shape, duplicated in `semantic/src/types/grammar-types.ts`) for Turkish/Quechua
suffix attachment. Not needed for parse-side language expansion — evaluate after
Phase 2 based on render-quality complaints.

## Verification

- **Framework:** new bridge unit tests; `npm test --prefix packages/framework`
  (~723 tests) green.
- **Pilot/fan-out parity:** golden-snapshot equality of generated patterns for
  all pre-existing languages, per domain — this is the "no silent behavior
  change" gate.
- **New languages:** per-language parse→render round-trip tests in each domain.
- **Fidelity ratchet:** the bridge must not perturb the semantic stack —
  `cd packages/testing-framework && npx tsx src/multilingual/cli.ts --full
  --bundle browser-priority --regression` stays green (semantic src untouched
  except public re-exports, so this should be vacuous; run it anyway on the
  Phase 1 and Phase 3 PRs).
- **MCP end-to-end (Phase 3):** `mcp-server` integration tests +
  `parse_sql`/`compile_sql` via a de/pt/ru input; `list_supported_languages`
  reflects derived (not hardcoded) sets.
- **Lint:** domain-toolkit R5–R10 green across all migrated domains.

## Risks

| Risk | Mitigation |
| --- | --- |
| Semantic profile markers tuned for hyperscript parsing mis-fit a domain's grammar (e.g. sql `where` has no semantic-role marker in some languages) | `deriveRoleMarkers` is a *default*; schema `markerOverride` remains authoritative where authored. Pilot parity snapshots catch regressions. |
| Heavier dep: domains pull `@lokascript/semantic` (nearley, tokenizers) | Domains import only profile data; semantic's per-language subpath exports (`./languages/{code}`) keep bundles tree-shakeable. MCP servers already load both. |
| Golden snapshots ossify accidental quirks of the old hand-authored profiles | Review diffs during pilot; intended improvements get a reviewed snapshot update, not a workaround. |
| `KNOWN_PROFILES` changes (fidelity work) silently shift domain patterns | That's the *feature* (single source of truth) — R5 lint + domain tests in CI turn silent shifts into visible failures. |

## Out of scope

- `mcp-multilingual-intent` publish/unprivatization (Priority 3; gated on the
  siren-mcp assessment — but Phase 3's derived languages remove its 8-language
  ceiling for free).
- Moving profile data out of semantic (rejected above; see the language-pack
  end-state design note for the eventual path).
- New domain packages; morphology generation for domain-learn.
- **Framework surface slimming** — extracting the prompts/training/feedback LLM
  subsystems and retiring the deprecated `ir/json-schema.ts` export. Worth doing
  before external consumers build against the current surface, but it's a
  public-API decision with its own consumer audit; separate proposal.
- **Package tier map** — a one-page core/supported/experimental/parked status
  doc for the 43 packages. Pure documentation; do any time, independent of this
  arc.
