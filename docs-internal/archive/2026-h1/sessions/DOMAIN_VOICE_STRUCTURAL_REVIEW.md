# domain-voice structural review

**Date:** 2026-07-08 · **Status:** findings recorded; 2 framework fixes landed, the rest deferred
**Sibling:** [`DOMAIN_REVIEW.md`](./DOMAIN_REVIEW.md) (an earlier review of sql/bdd/jsx that predates the framework↔semantic bridge and never covered voice)

## Context

Extending `@lokascript/domain-voice` with the UI-behavior verbs (`toggle`/`add`/`remove`/`show`/`hide`,
sourced from the `@lokascript/semantic` profiles rather than hand-authored) required **three** adapters
to reuse semantic's reference command schemas:
[`invertRolePositions`, `acceptExpression`, `withMarker`](../../packages/domain-voice/src/schemas/behavior.ts).
Three adapters to reuse five schemas is a smell, so we investigated whether the package needs a
structural review. It does — but the review's main value is that **two of the three adapters
compensate for framework/semantic-level issues, not voice bugs.** This doc records the findings so they
aren't rediscovered, splits them by owner, and marks what was fixed vs deferred.

The behavior-verb work itself is correct (426 tests green) and shipped as-is; the adapters are honest,
well-commented glue.

## The three adapters, by root cause

| Adapter | Root cause | Owner |
|---|---|---|
| `invertRolePositions` | Framework pattern generator sorts role positions **descending** (higher = earlier); semantic reference schemas + semantic's own generator sort **ascending**. Literal inverses. | framework/semantic |
| `acceptExpression` | **No** framework-based domain tokenizer emits `selector`-typed values; semantic preserves `selectorKind`. | framework-wide gap |
| `withMarker` | Voice's own `SCHEMA_OWNED_MARKERS` suppresses destination markers; reused schemas relied on the profile default. | voice-specific (fine as-is) |

## Findings

### Framework-level

**F1 — Position-convention inversion, documented backwards in two places. → FIXED.**
The framework generator sorts role positions descending
([`pattern-generator.ts` `sortRolesByWordOrder`](../../packages/framework/src/generation/pattern-generator.ts), `b - a`);
every native framework domain authors that way (e.g. [`domain-sql` `get`](../../packages/domain-sql/src/schemas/index.ts)
carries an explicit "descending: higher = earlier" comment). Semantic's reference schemas and its own
sorter ([`role-positioning.ts`](../../packages/semantic/src/parser/utils/role-positioning.ts), `a - b`)
are the inverse (1-based, lower = earlier). This was "documented" in four places, **two of them wrong**:
[`DOMAIN_AUTHOR_GUIDE.md`](../../packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md) said "lower = earlier"
(and its worked example was authored ascending), and semantic's
[`command-schemas.ts` `RoleSpec`](../../packages/semantic/src/generators/command-schemas.ts) doc said
"higher = earlier". Neither warned that the two subsystems are opposites — the exact trap behind
`invertRolePositions`. **Fixed:** both docs now match their own code and cross-warn about the inversion.

**F2 — `format`/`tokens` generator inconsistency. → FIXED.**
In the framework generator, `buildTokens` ordered roles with `sortRolesByWordOrder` (descending) but
`buildFormatString` iterated **declaration** order. They disagreed for any schema whose declaration
order ≠ descending-position order — silently producing a `format` string that didn't match the tokens
(e.g. Japanese `type` rendered `を {patient} に {destination} 入力` in `format` while the tokens — and
actual Japanese — are `に {destination} を {patient} 入力`). `format` is display-only (the matcher reads
only `template.tokens`), so parsing was never wrong; the *documentation string* was. **Fixed:**
`buildFormatString` now sorts identically. Impact was purely cosmetic and verified format-only across
all 8 framework domains (60 golden blocks corrected, 0 token/extraction changes). Semantic has its own
generator, so the multilingual fidelity ratchet was untouched.

**F3 — Selector-typing gap (framework-wide). → DEFERRED (needs design).**
No framework-based domain tokenizer emits `selector`-kind tokens: `ExtractionResult` has no `kind`
field, and the base tokenizer always re-derives kind via `classifyToken`, which only returns
`keyword|literal|operator|identifier`
([`base-tokenizer.ts`](../../packages/framework/src/core/tokenization/base-tokenizer.ts)). So `.active`/
`#box` are `identifier`→`expression` in every domain, and the `selectorKind` (class/id/attribute) that
semantic preserves ([`semantic/src/types.ts` `SelectorValue`](../../packages/semantic/src/types.ts)) is
lost. Native domains hide this by declaring `expression` (the wildcard in `isTypeCompatible`) in
`expectedTypes`; the only roles authored as bare `['selector']` are semantic's reference schemas, which
is why reusing them needed `acceptExpression`. This also **defeats the framework's own determiner-skip**
(`skipNoiseWords` only fires before a `selector`-kind token
[`pattern-matcher.ts`](../../packages/framework/src/core/pattern-matching/pattern-matcher.ts)) — the
root cause of the brief's `click the submit button` capturing `the`.
_Possible direction (not decided):_ add an optional `kind` to `ExtractionResult` and honor it in the
base tokenizer, so a domain's CSS extractor can emit `selector`-typed tokens. Framework-wide + ratchet-
adjacent — deserves a deliberate pass, not a reactive one.

### Voice-level

**V1 — Value model is all-`string`/`expression`; `selectorKind` lost for every verb. → DEFERRED.**
Consequence of F3 as it lands in voice: `.active`/`#box` are `expression`-typed for *every* selector
verb (click/focus/read/select/…), not just the new ones, and `VoiceActionSpec`
([`types.ts`](../../packages/domain-voice/src/types.ts)) flattens everything to strings. Acceptable for
the current page-control scope; a limitation if voice is meant to be a richer DOM-control DSL.

**V2 — 19 verbs parse, only 14 generate JS / render. → DEFERRED.**
[`voice-generator.ts`](../../packages/domain-voice/src/generators/voice-generator.ts) is a per-action
`switch` whose `default` emits a no-op comment; [`voice-renderer.ts`](../../packages/domain-voice/src/generators/voice-renderer.ts)
is another per-action switch with a `-- Unknown` default. The five behavior verbs parse (they're in
`allSchemas`) but hit both defaults — they produce no executable JS and don't round-trip through
`renderVoice`. (The protocol-JSON / explicit round-trip *does* cover them.) Real `classList` codegen +
renderer coverage is the natural next increment.

**V3 — Verb keywords double-authored (drift-prone). → DEFERRED → single-lexicon.**
The same verb keyword lives in `vocab/*` (parsing, 154 entries across 11 langs) **and** the renderer's
`COMMAND_KEYWORDS` (rendering, 154 entries), with no shared source — a mismatch only surfaces as a
round-trip test failure. Voice already did *half* the consolidation (its renderer derives *markers*
from schemas via `buildMarkerLookup`); the verb table is the remaining half. This is the
[single-lexicon aspiration](../FRAMEWORK_SEMANTIC_BRIDGE_PLAN.md) (bridge plan §"Vocab-authoring
ergonomics"), which **names domain-voice as the foothold to generalize**.

**V4 — Doc drift. → QUICK / OPTIONAL.**
domain-voice has no `CLAUDE.md`/`README`, and its `package.json` says "8 languages / 14 commands"
(actual: 11 languages / 19 schemas). Cheap to fix whenever.

### Already tracked — link, don't re-litigate

- **Single-lexicon consolidation** — [`FRAMEWORK_SEMANTIC_BRIDGE_PLAN.md`](../FRAMEWORK_SEMANTIC_BRIDGE_PLAN.md) §"Vocab-authoring ergonomics (backlog)"; voice is the named foothold. Covers V3.
- **`AbstractCodeGenerator`** — [`DOMAIN_REVIEW.md`](./DOMAIN_REVIEW.md) §4 (per-domain switch boilerplate), proposed, priority #7, unbuilt. Related to V2.
- **`compilation-service` `AbstractOperation` IR** — [`operations/types.ts`](../../packages/compilation-service/src/operations/types.ts) already defines `ToggleClassOp/ShowOp/HideOp/NavigateOp/FocusOp/HistoryBack/ForwardOp`, heavily overlapping voice's verbs, but is unconnected to the domain DSLs. A candidate backend for V2 if voice's codegen is ever consolidated.

## Prioritization

| Finding | Value | Risk / cost | When |
|---|---|---|---|
| F1 docs, F2 generator bug | High (prevents re-hitting the trap; corrects wrong output) | Low (docs + format-only) | **Done this pass** |
| V4 doc drift | Low | Trivial | Anytime |
| V2 codegen/renderer coverage | High (user-visible: verbs that parse should *do* something) | Medium (voice-local) | Next voice pass |
| V3 verb-keyword single-lexicon | Medium (kills drift) | Medium (voice-local; tracked) | With/after V2 |
| F3 selector-typing → V1 value model | High (fixes a class of bugs incl. `click the …`) | **Higher** (framework-wide, ratchet-adjacent) | Deliberate framework pass |

## Recommended sequence

1. **This pass (done):** F1 + F2 — cheap, safe, high-leverage; unblocks correct schema reuse.
2. **Next voice increment:** V2 (real `classList` codegen + renderer for the behavior verbs) then V3
   (fold the renderer verb table onto the schema/vocab source — extend voice's existing
   `buildMarkerLookup` foothold to verbs). Both voice-local, no ratchet exposure. V4 alongside.
3. **Separate framework pass (design first):** F3 — add extractor-provided token `kind` so domains can
   emit `selector`-typed values; this simultaneously restores the determiner-skip and lets voice drop
   `acceptExpression`. Framework-wide and ratchet-adjacent, so scope it deliberately, with full
   cross-domain + multilingual verification, not as a reactive change.

## What this pass changed

- **Fixed:** F1 (both position-convention docs corrected + cross-warned), F2 (`buildFormatString`
  sorts like `buildTokens`). Verified: framework 789 tests green; all 8 framework-domain goldens
  regenerated as **format-only** (0 token/extraction changes); every domain suite green; semantic
  behavior unchanged (comment-only edit → fidelity ratchet untouched).
- **Deferred with rationale:** F3, V1, V2, V3, V4 (above).
- **Untouched:** the behavior-verb work (ships as-is); voice's value model and codegen.
