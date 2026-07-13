# Handoff: vocab Batch 1 — the V4 probe, then one semantic-side marker PR

> **RESOLVED 2026-07-12** — probe verdict: Outcome A (matchLiteralToken matches
> pattern literals by raw `token.value` before kind) for every pattern-literal
> word; Outcome B (live) only for render-only grammar alternatives — es `hacia`
> confirmed live (destination silently defaulted to `me`) and fixed via
> `roleMarkers.destination.alternatives`. 78 remaining V4s class-waived with
> per-family probe citations. V4 unwaived 79 → 0; es V2 `hacia` cleared; ledger
> 242 → 162 unwaived. `--regression` exit 0 (no ratchet fired),
> `--diagnose-coverage` 0/3696. Full conclusion + discoveries (go-url
> destination drop in en, uncaptured show/hide style role, dead send.destination
> overrides): `MULTILINGUAL_NEXT_STEPS.md` § "V4 probe conclusion (Batch 1)".

## Context

Arc A (#642) landed the vocab-consistency CLI (`packages/testing-framework/src/vocab/`)
warn-only in CI. Current ledger: **242 errors** (V1 ×94 · V4 ×79 · V3 ×60 · V2 ×9).
The batch plan lives in `MULTILINGUAL_NEXT_STEPS.md` § "Arc A first ledger". This is
**Batch 1**: classify all 79 V4 errors with ONE probe, then clear them in ONE
semantic-side PR (fix or class-waive) — never per-finding.

Measure:

```bash
npm run test:multilingual:build-deps        # vocab CLI refuses on stale dist
cd packages/testing-framework
npx tsx src/vocab/cli.ts validate --check V4 --json /tmp/v4.json; echo "exit=$?"
```

## The probe (do FIRST — its answer classifies all 79 at once)

**Question: when a pattern's marker word classifies as `identifier` in the
tokenizer, does the pattern matcher still consume it as the marker (matching by
value/normalized), or does matching fail or degrade?**

Read the marker-consumption path in
`packages/semantic/src/parser/pattern-matcher.ts` (`matchTokenSequence` /
role-marker handling): what is compared — `token.value`, `token.normalized`,
`token.kind`? Note anywhere `kind` gates behavior (event anchoring, morphology,
normalization only applying to keyword-kind tokens).

Then probe empirically, one representative per family — **assert on captured
roles, never "it parses"**:

| family | probe | V4-flagged word |
| ------ | ----- | --------------- |
| schema quantity marker | fr `incrémenter #compteur par 2` → `increment.quantity` = 2? | fr `par` (also de `um`) |
| render destination marker | round-trip the es transformer output containing `hacia` | es `hacia` (also V2) |
| en duration marker | `transition opacity to 0 over 300ms` → `duration` captured? | en `over` |
| untranslated scope | which corpus rows exercise `set.scope` at all? then probe one non-en | `on` ×22 langs |
| untranslated patient | en `push url /x` + one translation | `url` ×24 langs |
| as/method render markers | round-trip an es/fr/pl render using `como`/`comme`/`jako` | ~20 words |

Prior evidence that kind DOES matter at least sometimes (cite in the analysis):
\#638 Family G had to register ja/ko/qu containment words as whole `in` keywords
because identifier-kind fragments broke generated patterns; sw `kama`/`kuwa`
(#569) was a keyword-collision fix.

**Outcome A (matcher matches by value; kind irrelevant on this path):** the V4
class is *latent*, not live. Decide per family: register anyway (normalization +
consistency) or class-waive (`V4|*|on`, `V4|*|url` — wildcard waivers landed in
Batch 0) with the probe's finding as the reason. Consider splitting V4's tier:
marker-words-in-patterns (warn) vs profile keywords (error).

**Outcome B (kind gates anything):** live parse gaps — fix by registration, with
a parse-level test per family proving the role captures (and fails without).

## The fix PR (same branch, after the probe)

- **Where to register matters:** prefer `profile.roleMarkers[role].alternatives`
  when the word IS a role marker (es `hacia` → destination alternatives — this
  also clears its V2 error); use tokenizer `EXTRAS` only for non-marker
  vocabulary. Registering in profiles changes pattern GENERATION — watch
  R0-precision (phantom captures) in the resweep.
- **`on`/`url` (46 of 79):** if the corpus never exercises those roles non-en
  AND the probe says latent → class-waive with reason; if exercised → translate
  via per-language `markerOverride`, possibly as its own increment.
- tr vowel-harmony allomorphs already live in `markerVariants` — don't
  double-register.
- Resweep discipline (semantic src changes): ordered build → fresh populate →
  `--diagnose-coverage` + `--regression`, real exit codes (no `| tail`), plus
  before/after vocab ledger. Baseline regen only if fidelity legitimately moves —
  attribute old-vs-new against the same DB, prettier the baseline.
- Never commit `patterns.db`.

## Definition of done

- The probe's answer (matcher marker semantics) written into NEXT_STEPS —
  it also governs Batches 2–3.
- V4 unwaived errors → **0** (registered or class-waived with the probe cited).
- es `hacia` V2 error cleared via the roleMarkers route, or explicitly deferred.
- Each registration family has a test proven to fail without the fix.
- `--regression` exit 0 (or delta attributed); vocab ledger before/after in the
  PR body.
