# Handoff: vocab Batch 2 — V3 event-word alignment (i18n dictionaries ↔ eventNameTranslations)

## Context

Batch 1 (#643) resolved all 79 V4s (probe verdict + es `hacia` registration + 78
class-waivers) — verdict and governance in `MULTILINGUAL_NEXT_STEPS.md` § "V4
probe conclusion (Batch 1)". Ledger now: **162 unwaived** (V1 ×94 · V3 ×60 ·
V2 ×8). This is **Batch 2**: clear the **60 V3 errors** in ONE i18n-side PR.
(Batch 3 = V1 ×94 via Arc B `derive.ts` flip; Batch 4 = flip CI vocab step to
gating.)

The two surfaces:

- **S3 (render)**: `packages/i18n/src/dictionaries/{lang}.ts` → `events`
  category — what the transformer EMITS for event names in translations.
- **S5b (parse)**: `packages/semantic/src/patterns/event-handler.ts` →
  `eventNameTranslations` — the native→English mapping the parse side uses to
  normalize an event word back to the canonical DOM event.

V3 fires when S5b covers an event but does NOT recognize the dict's rendered
form (es dict `cambiar` vs S5b `cambio`). Breakdown: by language sw ×10, es ×9,
tr ×8, ja ×6, de ×5, fr ×5, ar ×4, id ×4, pt ×4, zh ×3, qu ×2; by event
keydown ×11, keyup ×11, mouseover ×10, mouseout ×8, blur ×6, focus ×3, rest ≤2.
Dominated by the fused/split class (de `mausüber` vs `maus über`) — the
#533–#535/#540 arcs standardized the SEMANTIC side; the dictionaries were never
reconciled. **Semantic (S5b) is authoritative.**

Measure:

```bash
npm run test:multilingual:build-deps        # vocab CLI refuses on stale dist
cd packages/testing-framework
npx tsx src/vocab/cli.ts validate --check V3 --json /tmp/v3.json; echo "exit=$?"
```

## The probe (do FIRST — classifies the failure mode for all 60)

Batch 1's verdict does NOT cover V3: that verdict was about pattern LITERALS
(matched by raw `token.value`, kind-irrelevant). Event names are **role
VALUES** — a different mechanism: the captured event value is normalized via
tokenizer keyword tables / `eventNameTranslations`, and an unrecognized form is
captured VERBATIM. Expected failure mode (verify, don't assume): the transformer
renders es `cambiar`, the parse captures `event=literal:"cambiar"`, the built
listener waits for a DOM event named `cambiar` that never fires — a REAL broken
listener that **no ratchet sees** (R1 compares role TYPES only; R3's invariant
whitelist has colon-qualified event names, not plain ones; R0 sees the action).

Probe one row per class, asserting on the captured event VALUE (en reference
captures `literal:"change"`):

1. Corpus exercise: which `pattern_translations` rows actually contain the
   flagged dict forms? (`sqlite3 packages/patterns-reference/data/patterns.db`,
   after a fresh `npm run populate`.) The fused keydown/keyup/mouseover forms
   very likely DO appear in corpus event handlers.
2. Parse a corpus-shaped handler with the dict form (de
   `bei mausüber …`, es `en cambiar …`) via `parseSemantic(text, lang)` — what
   event value is captured? Compare against the S5b-known form (de `maus über`,
   es `cambio`).
3. If the captured value is the raw native word → live-broken-listener class
   confirmed; also note whether R2 (execution, curated subset) covers any such
   row — if yes, why didn't it fire? (Curated subset may simply not include
   these events.)

## The fix PR (same branch, after the probe)

Per-row fork — decide by which form is the linguistically right RENDER:

- **Dict form is wrong/fused** (the `mausüber` class): fix the DICTIONARY to
  the S5b-known form. This changes rendered corpus translations → parse
  rate/fidelity CAN move (probably UP if the old form parsed degenerately) —
  corpus-coupled, hence the one-resweep discipline.
- **Dict form is a legit synonym** (ar `تركيز` vs `التركيز`): add it as an S5b
  ALIAS (additive parse-side entry in `eventNameTranslations`; render
  unchanged; baseline stable). V3's containment check clears either way.
- Genuinely unfixable rows (if any): waive with reason + probe citation —
  wildcard waiver keys are `check|lang|key` (see Batch 1 precedent in
  `packages/testing-framework/vocab-waivers.json`).

Traps (Batch 1 lessons + standing):

- **Dict edits move the baseline** — that is expected here, unlike Batch 1.
  Full resweep: ordered build → fresh `populate` → `--diagnose-coverage` +
  `--regression`. If fidelity legitimately improves, regenerate
  (`--save-baseline`) against the SAME freshly-populated DB, attribute
  old-vs-new per language in the PR body, prettier the baseline, commit
  dicts + baseline — **never `patterns.db`**.
- Real exit codes — no `| tail` on gate commands (use `pipestatus`/redirects).
- Rebuild i18n (and anything else touched) before the vocab CLI or any probe —
  it refuses on stale dist; `npx tsx` probes read src but the CLI + sweep read
  dist.
- Multi-word event forms (`maus über`, `tecla abajo`) are kept in the
  tokenizers' `multiWordKeywords` (marker concepts are excluded, event names
  kept) — verify the split form actually tokenizes as ONE keyword in that
  language before assuming the S5b form round-trips.
- **Domain ripple (new, from Batch 1's CI failure)**: semantic-side edits can
  trip lint R5 in domain packages with hand-authored tokenizers (bdd es
  `ES_KEYWORDS` had to learn `hacia`). S5b alias additions shouldn't surface
  there (R5 collects profile keywords/roleMarkers/schema markers, not
  eventNameTranslations), but if you touch semantic src at all, run the domain
  lint tests locally: bdd, behaviorspec, learn.
- i18n has its own ~900-test suite (`npm test --prefix packages/i18n`) with
  dictionary-coupled expectations — run it; also semantic + testing-framework
  suites.
- Prove at least one dict fix red→green at the parse level (captured event
  value flips from raw native word to the canonical form), per-class not
  per-row.

## Definition of done

- Probe verdict (captured-event failure mode + whether ratchets can see it)
  appended to `MULTILINGUAL_NEXT_STEPS.md` § Arc A ledger (Batch 2 entry).
- V3 unwaived errors → **0** (dict-fixed, S5b-aliased, or waived with probe
  cited).
- `--regression` exit 0, or delta attributed + baseline regenerated with
  old-vs-new per-language attribution in the PR body.
- Before/after vocab ledger in the PR body (start: 162 unwaived — V1 ×94 ·
  V3 ×60 · V2 ×8).
- i18n / semantic / testing-framework suites + domain lint green; CI green.

## Adjacent queue (NOT Batch 2 scope — don't drift)

Logged in NEXT_STEPS § "V4 probe conclusion": go-url destination drop (en
included — en-corruption class), uncaptured `show`/`hide` style role (blocks
hi/ar style registrations), dead send.destination overrides (de `an`, ko
`에게`, tr `-e`), the `on`/`url` translate-increment option, V4 tier-split
(marker-words-in-patterns → warn). V2 ×8 residue rides with the style-capture
work, not this batch.
