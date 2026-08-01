# Handoff: vocab Batch 3 — V1 reconciliation (S1 profiles ↔ S3 dictionaries) + Batch 4 gating flip

## Context

Batch 2 (#644) cleared all 60 V3s (probe verdict + 37 dict fixes + 31 S5b
aliases, zero waivers) — verdict and mechanism in `MULTILINGUAL_NEXT_STEPS.md`
§ "V3 probe conclusion (Batch 2)". Ledger now: **98 unwaived** (V1 ×90 ·
V2 ×8). This is **Batch 3**: reconcile the **90 V1 keyword conflicts** in one
PR, then **Batch 4** in the same arc: flip the CI vocab step to gating once
unwaived hits 0.

**Scope guard — the `derive.ts` flip is NOT this arc.** The release bar
(NEXT_STEPS § "v2.8 release bar", item 1) puts Arc B's generated dictionaries
post-release by design. Batch 3's deliverable is the **per-concept
reconciliation ledger** (which side won and why — recorded in NEXT_STEPS as
Arc B's input) plus V1 → 0 unwaived. Do not touch
`i18n/src/dictionaries/index.ts` wiring.

The two surfaces:

- **S1 (parse)**: `packages/semantic/src/generators/profiles/{lang}.ts` →
  `keywords` — feeds tokenizer keyword derivation
  (`initializeKeywordsFromProfile`) AND pattern generation.
- **S3 (render)**: `packages/i18n/src/dictionaries/{lang}.ts` — what the
  transformer emits. V1 fires when the profile formSet (primary +
  alternatives, normed) does NOT contain the **first-category** dict hit
  (`findInDictionary` iterates categories in insertion order — commands
  first; the V1 message names the category that hit).

Breakdown: by concept `select` ×15, `reset` ×10, `into`/`submit`/`break` ×7,
`when` ×6, `clone` ×5, `until` ×4, `while`/`empty` ×3, `and`/`change`/`then`/
`async` ×2, `close` ×1; by language qu ×18 (heaviest), id/tl/vi ×6, sw/th ×5.
Two shapes visible in the messages: verb-synonym pairs (ar select `ظلل` vs
`اختر`, de `markieren` vs `auswählen`) and connective/particle pairs (bn into
`ভিতরে` vs `তে`, ar and `وأيضاً` vs `و`).

Measure:

```bash
npm run test:multilingual:build-deps        # vocab CLI refuses on stale dist
cd packages/testing-framework
npx tsx src/vocab/cli.ts validate --check V1 --json /tmp/v1.json; echo "exit=$?"
npx tsx src/vocab/cli.ts dump keywords --concept select   # concept × language table
```

## The probe (do FIRST — classifies the failure mode per family)

Neither prior verdict transfers wholesale: V4 was about pattern LITERALS
(latent — matched by raw token.value), V3 about event role VALUES (normalized
by tokenizer keyword tables). V1 keywords are **verbs and connectives**: the
dict word is what the transformer RENDERS; whether it parses back depends on
the tokenizer + generated patterns. Key prior evidence: the corpus is 100%
faithful today, and the corpus-hot connectives (`into`/`when`/`until`/`and`/
`then` renders) are everywhere in it — so their dict forms demonstrably parse.
That predicts a large **latent** class. Verify, don't assume:

1. Corpus exercise: which `pattern_translations` rows contain each flagged
   dict form (fresh `npm run populate` first)? Expect: connectives corpus-hot,
   `select`/`reset`/`clone`/`async`/`close` corpus-cold or absent.
2. Parse one corpus-shaped line per family via `parseSemantic(text, lang)`,
   asserting on the captured ACTION and roles vs the en reference — never "it
   parses" (Batch 2's `expression:undefined` and wrong-verb shapes are the
   failure modes to look for). E.g. does ar `اختر …` parse as action=select?
   Does de `auswählen` (also the dict's `pick` word — check homonyms) resolve
   to the right action?
3. Category-shadowing check per row: the V1 message names the dict category
   that matched (e.g. ar reset hits `dictionary.events` — the reset EVENT, not
   the command). Both `findInDictionary` and the transformer resolve
   first-category-wins (Batch 2's de blur evidence), so a V1 against a
   shadowed/dead entry is the dead-vocab class (Batch 1 de `an` precedent).
4. Note for the verdict: can any ratchet see a live V1 break? (A wrong-verb
   parse flips the ACTION → R0/fidelity WOULD see it if corpus-exercised —
   unlike V3. So corpus-hot rows being green is strong latency evidence.)

## The fix fork (per row, mirroring Batch 2 + Batch 1 governance)

- **Dict form parses correctly already** (expected majority) → latent table
  misalignment. Governance (Batch 1, standing): do NOT register into profiles
  "for hygiene" — profile keyword additions change tokenizer keyword sets AND
  pattern generation. Prefer **waive with probe citation** (wildcard
  `V1|lang|key` keys, `packages/testing-framework/vocab-waivers.json`), OR add
  the dict word to profile `alternatives` only where it is a genuine synonym
  worth parse coverage AND the probe shows the parse side currently lacks it.
- **Dict form does NOT parse / parses as the wrong action** → live
  render→parse break (the V3-broken analog) → fix the DICTIONARY to a
  probe-verified parseable form (corpus-coupled → resweep; baseline may
  legitimately move) — or, where the dict form is the linguistically right
  render and the tokenizer should know it, profile-alternatives route
  (semantic src → R5 domain ripple: bdd/behaviorspec/learn lint learned
  Batch 1's es `hacia`; expect the same for any profile keyword edit).
- **Dead/shadowed dict entry** (V1 hit in a category the transformer never
  uses for that concept) → align it to the profile form or waive as dead
  vocab, per Batch 1 precedent.

Record every decision in a per-concept reconciliation table (concept × lang ×
winner × why) appended to NEXT_STEPS § Arc A ledger (Batch 3 entry) — this
table IS Arc B's post-release input.

## Batch 4 (same arc, after V1 → 0)

1. Waive the 8 remaining V2s with named reasons (all triaged): the style-role
   family ar `بـ-`/`مع`, hi `साथ`, ja `と`, ko `와`/`과` — blocked on the
   show/hide style-capture gap (NEXT_STEPS § "V4 probe conclusion" discovery
   2); en `method:as` + `duration:for` — schema-override↔render alignment
   queued. Wildcard waiver keys are `check|lang|key`.
2. Flip `.github/workflows/ci.yml` "Vocab consistency (warn-only)" → drop
   `--warn-only` (and rename the step). The PR's own CI run proves the gate.
   Release bar item 1 closes here.

## Traps (Batch 1+2 lessons + standing)

- **Profile keyword edits are semantic-side behavior changes** (tokenizer +
  pattern generation) — probe before/after, run domain lint suites (bdd,
  behaviorspec, learn — R5 collects profile keywords), full resweep.
- **Dict edits move rendered corpus translations** — one full resweep at the
  end: ordered build → fresh `populate` → `--diagnose-coverage` +
  `--regression`, real exit codes (no `| tail`; capture `$?`). If fidelity
  legitimately moves, `--save-baseline` against the SAME freshly-populated DB,
  attribute old-vs-new per language in the PR body, prettier the baseline,
  commit dicts/profiles + baseline — **never `patterns.db`**.
- i18n has dictionary-coupled test expectations (Batch 2 hit
  `new-languages.test.ts` on sw focus) — expect a few for `select`/`reset`
  renames; update them with a one-line reason, don't loosen them.
- Homonym/collision check before ANY rename (Batch 2's sw `badilisha`
  event=toggle and zh `按键`=keypress lessons): grep the target word across
  the same dict's other categories and the tokenizer's keyword entries first.
- Rebuild before the vocab CLI or any dist-reading step — it refuses stale
  dist; `npx tsx` probes read src but the CLI + sweep read dist.
- V1's check is containment of the dict value in the profile formSet — either
  side can move to satisfy it; pick by the probe, not by hygiene.
- Prove at least one fix red→green per class at the parse level (captured
  action/roles), per-class not per-row; archive the before/after probe logs.
- lint-staged runs prettier on commit — diffs may reflow.

## Definition of done

- Probe verdict (latent-vs-live classification + ratchet-visibility note)
  appended to `MULTILINGUAL_NEXT_STEPS.md` § Arc A ledger (Batch 3 entry),
  with the per-concept reconciliation table (Arc B's input).
- V1 unwaived → **0** (fixed or waived with probe cited); V2 ×8 waived with
  named reasons.
- CI vocab step flipped to gating (Batch 4) and green on the PR.
- `--regression` exit 0, or delta attributed + baseline regenerated with
  old-vs-new per-language attribution in the PR body.
- Before/after vocab ledger in the PR body (start: **98 unwaived — V1 ×90 ·
  V2 ×8**; end: 0 unwaived, waiver count named).
- i18n / semantic / testing-framework suites + domain lint (bdd,
  behaviorspec, learn) green; CI green.

## Adjacent queue (NOT Batch 3/4 scope — don't drift)

Logged in NEXT_STEPS: id `tekan_mouse`/`lepas_mouse` shatter family (needs an
S5b-coverage check "V3c" to even surface), zh mouseenter `鼠标进入` dead
entry, R2 curated-subset admission of one bare non-click event pattern (e.g.
input-validation `on blur`), go-url destination drop (en-corruption class),
show/hide style-capture (unblocks the 6 style V2 waivers), V4 tier-split
(marker-words-in-patterns → warn), the `derive.ts` flip itself (post-release
Arc B).
