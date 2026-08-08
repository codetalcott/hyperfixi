# Handoff: vocab consistency — `validate` + `dump` (Arc A of the v2.8 bar)

## Context

Per-language vocabulary is hand-authored in **five uncoordinated surfaces**
(~7,000+ entries), and the drift between them is the single most common recent
bug class: fused/split event keywords (#533–#535, #540, #633), marker collisions
(#558, #560, #569, #586), render/parse symmetry (#565, #636, #638). Every one of
those cost a probe → fix → resweep → baseline arc. This arc builds the
authoring-time check that turns that class into a CI warning.

This is **v2.8 release-bar item 1** (NEXT_STEPS § "v2.8 release bar", target
≈ 2026-07-22). It is Arc A of the session plan; its output ledger is the
required input to Arc B (the `derive.ts` dictionary flip), which is
**post-release and NOT part of this arc** — do not flip any surface to
generated here.

Assessment + surface map: 2026-07-12 session. Lexicon end-state and the
domain-side precedent: `docs-internal/FRAMEWORK_SEMANTIC_BRIDGE_PLAN.md`
("a single lexicon"; `buildMarkerLookup` foothold; lint R5).

## The surfaces

| # | Surface | Where | Entries |
| - | ------- | ----- | ------- |
| S1 | Semantic language profiles (keywords, `roleMarkers`, `possessive`, `references`) | `packages/semantic/src/generators/profiles/*.ts` (24 files) | ~2,330 keywords + ~6 markers/lang. **Documented source of truth.** |
| S2 | Command-schema marker tables (`markerOverride`, `markerVariants`) | `packages/semantic/src/generators/command-schemas.ts` (36 tables) | ~350 |
| S3 | i18n dictionaries | `packages/i18n/src/dictionaries/*.ts` (24 files) | ~4,000. Hand-authored; `derive.ts::deriveFromProfile` exists but `index.ts` imports the hand files (derive utils only re-exported, `index.ts:158`). |
| S4 | i18n grammar profiles (role-marker `markers[]` forms, connectives, render rules) | `packages/i18n/src/grammar/profiles/index.ts` (single 1,435-line file) | ~203 marker forms |
| S5 | Tokenizer EXTRAS + event names | `packages/semantic/src/tokenizers/*.ts` (`initializeKeywordsFromProfile` + hand EXTRAS, ~1,056) · `packages/semantic/src/patterns/event-handler.ts:20` `eventNameTranslations` (13 langs, 239) | ~1,300 |

Already-generated links (do not re-check, but don't break):
profiles → vite-plugin (`packages/vite-plugin/scripts/sync-keywords.ts`),
profiles + grammar → corpus DB (`packages/patterns-reference/scripts/sync-translations.ts`),
profiles → domain patterns (framework bridge, `packages/framework/src/multilingual/builders.ts`).

## The check matrix (`validate`)

| Check | Pair | Finding condition | Tier |
| ----- | ---- | ----------------- | ---- |
| V1 keywords | S1 ↔ S3 | same concept key, **different translation** (normalized) | error |
| V1b coverage | S1 ↔ S3 | concept in S1 missing from S3 (or vice-versa where S3 category maps to a profile concept) | warn |
| V2 role markers | S1 `roleMarkers` ↔ S2 `markerOverride`/`markerVariants` ↔ S4 `markers[]` | a marker word present in one copy and absent from the others' **form sets** (containment, not 1:1 — see traps) | error |
| V3 event names | S5 `eventNameTranslations` ↔ S3 `events` category ↔ tokenizer EXTRAS event nominals | same English event, different native word | error |
| V3b coverage | S5 | language absent from `eventNameTranslations` (11 of 24 today) | info |
| V4 tokenizer classification | S1/S2/S4 words → that language's tokenizer | any keyword/marker that does not classify as `keyword` (lint R5 generalized from the nine domains to the core stack) | error |

R5 precedent: `packages/domain-toolkit/src/rules/keyword-classification.ts` —
on day one it found **220 real** profile↔tokenizer drift findings in the domain
packages (#615), zero waivers needed after fixes. Expect a comparable first
sweep here; that ledger is the deliverable, not a failure.

Also in scope: **retire the dead script** — `packages/i18n/package.json`
`validate-dictionaries` points at `scripts/validate-dictionaries.js`, which
does not exist. Point it (or a new script name) at the new tool;
`derive.ts` already exports a `validateDictionary` worth absorbing.

## The right lever

Host the CLI in **`packages/testing-framework`** (suggested:
`src/vocab/cli.ts`), beside the multilingual CLI — it already depends on both
`@lokascript/semantic` and `@lokascript/i18n`, has the tsx/CI wiring, and the
ensure-fresh stale-dist guard pattern to copy. Alternative considered and
rejected: extending `domain-toolkit` (its rules operate on `DomainVocabulary`,
not the core stack's profile shape) — reuse its R5 *logic*, not its host.

- `validate [--language xx] [--check V1..V4] [--json]` — prints per-language ×
  per-check counts + the disagreement ledger; exits non-zero only on
  `error`-tier findings **not** covered by the waiver file.
- Waivers: a committed `vocab-waivers.json` (finding key + one-line reason).
  Bar item 1 is "0 unwaived, every waiver named" — honesty over totality.
- `dump [--concept toggle] [--language xx] [--format md|tsv|json]` — the
  concept × language table over the same loaded model. Stretch within the arc;
  the `packages/semantic/editor/` profile-editor GUI is a candidate future
  front-end, not part of this arc.
- CI: add to the PR job set **warn-only** first (report in the job log); flip
  to gating in a follow-up PR once the first ledger is triaged. Do not gate
  red on day one.

## Traps

- **Comparison semantics, not string equality.** Markers have allomorphs
  (tr `markerVariants` exists because the transformer emits `ya` where the
  schema said `e`), multiword forms, and per-slot variants; S4 stores arrays of
  forms. Compare as normalized **form sets with containment**, and report the
  raw strings. Naive 1:1 equality will drown the ledger in false positives.
- **Direction of authority differs per pair.** S1 is the documented source of
  truth, but S3 legitimately holds render vocabulary S1 never needs — an
  S3-only entry is warn/info, an S1↔S3 *conflict* is an error. Encode the tier
  in the matrix, don't let "missing" and "wrong" share a severity.
- **Classify whole surface forms (V4).** The fused/compound lessons (qu `_`
  compounds #638, ja/ko/qu containment words, tr `enyakın`) mean V4 must run
  the tokenizer's real longest-match path on the whole marker/keyword string,
  not per-word — a split result IS the finding.
- **Fresh dists or src imports.** A CLI run against a stale `dist/` scores code
  that differs from the checkout (the qu unreproducible-baseline incident).
  Copy the multilingual CLI's refusal guard, or import src via tsx explicitly.
- **First sweep ≠ regression.** The initial ledger will be large (R5's was
  220). Triage into fix-now / waive-with-reason / Arc-B-input. Only V4 errors
  are usually fix-now (they mean a word cannot tokenize at all).
- **If goldens are added:** the pre-commit prettier hook reformats them —
  regenerate **then prettier** before any `git diff --quiet` byte-identity
  check (batch-4 lesson).
- **Never commit `patterns.db`**; this arc shouldn't touch it at all (no
  corpus resweep needed — validate is static analysis; the eight-signal gate
  is unaffected unless a fix-now finding changes a profile, in which case the
  standard resweep discipline applies).

## Measure

```bash
cd packages/testing-framework
npx tsx src/vocab/cli.ts validate --json > /tmp/vocab-ledger.json; echo "exit=$?"
npx tsx src/vocab/cli.ts dump --concept toggle
```

Before: no cross-surface check exists; `validate-dictionaries` is dead.
Deliverable numbers: findings per check per language, waiver count, and the
fix-now subset (expect V4 to dominate it).

## Definition of done

- `validate` implements V1–V4 with the tiering above; per-language and
  per-check filters; JSON ledger output.
- The dead `validate-dictionaries` script is replaced or removed.
- CI runs validate warn-only on PRs; the gating flip is a named follow-up.
- The first disagreement ledger is triaged: fix-now findings fixed (with the
  standard resweep if any profile changed), the rest waived with reasons or
  recorded as Arc B input in NEXT_STEPS.
- `dump` renders the concept × language table for at least keywords + role
  markers (stretch: events).
- NEXT_STEPS § "v2.8 release bar" item 1 checked off or its residual named.
