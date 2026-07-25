# Handoff: imperative verb forms — the efficient shape of the work

> **STATUS 2026-07-25 — DONE for es/pt/fr/ko, and the Arabic defect is fixed.**
> `25e2c3cc` (Arabic diacritic lookup) and `1fe571f3` (imperatives). Coverage went
> from es 1/15 · pt 0/15 · fr 0/15 · ko 0/15 to **15/15 in all four**.
>
> **This brief's central recommendation was wrong, and the correction is the
> useful part.** It said to promote normalizer-resolved words to `kind: 'keyword'`.
> Measured against that: **the token kind is not what blocks the match.** Forcing
> `kind='keyword'` alone still fails to parse; adding `stem`/`stemConfidence`
> alone succeeds. `PatternMatcher.getMatchType` compares a token against the
> pattern's NATIVE literal (`agregar`), so `normalized` — the English concept
> `add` — can never equal it, and the stem is the only field that can. The es/pt/fr
> extractors computed the stem and discarded it; turkish-keyword and korean-keyword
> already forward it. **Six lines across three files**, not a tokenizer rewrite.
>
> Promotion would also have been actively harmful: ~20 sites branch on
> `kind === 'identifier'`, including `tokenToSemanticValue` (a role value `agrega`
> would become the literal `"add"`) and the trailing-optional-slot skip (which
> drops any keyword whose concept is a command).
>
> Two more of this brief's claims did not survive:
> - **Korean needed nothing** — it already forwarded the stem and already parsed.
> - **Turkish's 10/15 is its PROFILE, not the normalizer** — `turkish.ts` lists
>   imperatives as `primary` (`ekle`, `kaldır`), which is the same declarative
>   mechanism the irregulars now use elsewhere.
>
> Arabic turned out to be unrelated to imperatives: the keyword map was indexed
> diacritic-insensitively but QUERIED exactly, so `بَدِّل` failed `isKeyword`, and
> the proclitic guard that exists to prevent exactly that handed it to the `ب` bi-
> preposition — `kind=particle normalized=with`, a wrong concept rather than a
> failed parse. Fixed at the lookup AND in `getMatchType`, which compares surfaces
> one layer later. 12 of 13 diacritized imperatives now parse; `أحضِر` differs by
> hamza (a letter, not an optional diacritic) and is correctly out of scope.
>
> **Turkish is DONE** (`d3927557` here, `6bac34c` on lokascript-learn's
> `fix/turkish-ascii-folding`). The folding was a bug, not a constraint: this
> package's own tr tokenizer already listed correct Turkish, and only the
> MISSPELLING parsed, so a Turkish learner typing their own language correctly got
> nothing. Corrected per-stem — vowel harmony means `kaldır`/`artır` take dotless
> `ı` through every inflection while `değiştir`/`göster`/`gönder` only need ğ/ş/ö
> — with the folded spellings kept as alternatives. **The downstream commit cannot
> merge until domain-learn publishes**: lokascript-learn keeps its own copy of the
> table and `dsl-bridge.test.ts` asserts the two agree.
>
> **Still open:** **de** (multi-word separable imperatives + `senden` shadowed by
> `submit`), and lokascript-learn's `parseAndCompare`, which should now work in
> more languages but has not been re-measured.

**Paste "The prompt" below into a fresh Claude Code session opened in `~/projects/hyperfixi`.**

Successor to items 2 and 3 of `HANDOFF-marker-paths-and-learn-aims.md`. Items 1
and 2's code work landed on branch `fix/per-pattern-parse-ratchet` (four
commits — see § What landed). This file is the remaining piece, and it exists
because **the obvious way to do it is roughly ten times the work of the right
way**, and that is not visible until you measure.

---

## The prompt

> `docs-internal/HANDOFF-imperative-forms.md` is the brief — read it fully.
>
> The task: make the imperative verb forms that `@lokascript/domain-learn`
> renders parse in `@lokascript/semantic`, so lokascript-learn's semantic
> fallback stops being dead code in 8 of 10 languages.
>
> Do NOT start by adding vocabulary. The brief has a measurement showing the
> normalizers already resolve about half these forms and the tokens are simply
> misclassified. Reproduce that measurement first, then do step 1 and
> re-measure before deciding how much of step 2 is left.
>
> Any tokenization change needs the vocab gate, then the multilingual
> `--regression` gate on a fresh populate, with the regenerated baseline in the
> same commit. Note the lossy ratchet is now tolerance 0 — a single faithful→
> lossy flip fails the gate, deliberately.

---

## Why this is not a vocabulary problem

The naive framing: domain-learn renders `agrega`, semantic's Spanish profile
knows `agregar`, so add `agrega` as a keyword alternative. Across 15 verbs × 10
languages that is **93 missing entries** (measured), and it drifts the moment
anyone adds a verb.

That framing is wrong. Tokenize the imperatives directly:

```
es agrega       kind=identifier normalized=add     ← concept already resolved!
pt adicione     kind=identifier normalized=add
fr ajoute       kind=identifier normalized=add
de entferne     kind=identifier normalized=remove
ko 추가하세요    kind=identifier normalized=add  stem=추가

es muestra      kind=identifier normalized=-       ← genuinely unresolved
fr retire       kind=identifier normalized=-
ar أضِف          kind=identifier normalized=-
tr kaldir       kind=identifier normalized=-
```

**About half already carry the correct `normalized` concept and are still tagged
`identifier`.** The pattern matcher matches on `keyword` tokens, so the verb is
invisible to it and the whole sentence fails to parse — not for want of
vocabulary, but because a word the morphology already understood was classified
as an ordinary identifier.

The machinery for the correct behaviour exists and is unused:
`tryMorphKeywordMatch` in `packages/framework/src/core/tokenization/base-tokenizer.ts:772`
does exactly normalize → look up stem → emit a `keyword` token carrying
`stem`/`stemConfidence`. **It has zero callers.** Meanwhile 17 morphological
normalizers exist, are `setNormalizer`'d onto their tokenizers, and 17 of the 23
per-script keyword extractors already consult `this.context.normalizer` — they
just don't promote the result to a keyword.

## Measured 2026-07-25 — read this before designing anything

Two probes, both against a freshly populated DB.

**Blast radius on the corpus is nil.** Tokens across all 24 languages that are
`identifier` today AND already carry a `normalized` concept — i.e. exactly what
promotion would change — number **7, in 4 languages, out of ~24,000 tokens**
(de `ändert`, he `ש`, tl `nagbabago`, fr `cache`). The corpus is written in the
dictionary forms the parser already accepts, so promoting imperatives cannot move
it. Whatever the risk of this change is, it is not corpus churn.

**The win from promotion alone is large.** Of ~105 imperatives (15 verbs × 7
languages with morphology tables):

| lang | already | unlocked by promotion | needs rules | after step 1 |
| ---- | ------- | --------------------- | ----------- | ------------ |
| es   | 1       | **9**                 | 5           | 10/15        |
| ko   | 0       | **9**                 | 6           | 9/15         |
| fr   | 0       | **8**                 | 7           | 8/15         |
| pt   | 0       | **7**                 | 8           | 7/15         |
| de   | 2       | 3                     | 10 (5 multi-word) | 5/15   |
| ar   | 2       | 1                     | 12          | 3/15         |
| tr   | **10**  | 0                     | 5 (all ASCII-folded) | 10/15 |

Totals: **15 already · 37 unlocked by promotion alone · 53 still needing rules.**

**But the normalizer's output is NOT trustworthy enough to promote blindly.**
Two of the 37 "wins" are wrong, and chasing them found three defects that have
nothing to do with imperatives:

1. **Arabic diacritics misclassify, not merely fail to normalize.** `بدّل`
   tokenizes `kind=keyword normalized=toggle`; the diacritized `بَدِّل` tokenizes
   **`kind=particle normalized=with`** — a different token kind AND an unrelated
   concept. `arabic-normalizer.ts:55` strips harakat, but something claims the
   diacritized form before that runs. This kills the earlier guess in this brief
   that Arabic would "fall out for free": it has 12 residual, the worst of any
   language. **Fix this bug first and separately; it corrupts diacritized Arabic
   input generally, not just imperatives.**
2. **German `send` is already unreachable.** `de.send.primary = senden` and
   `de.submit.alternatives = Senden`, and submit wins — `senden` itself tokenizes
   `normalized=submit`. A pre-existing profile collision, surfaced here.
3. **French `cache` is a genuine imperative/identifier collision.** It is the
   correct imperative of `cacher`, and also a name real code uses for a variable.

So the mechanism must be **generate → review → pin**, not wire-and-trust: let the
normalizer DISCOVER the candidates (so nobody hand-writes 93 entries), have a
human review the ~37, and freeze the result in a pinning test in the style of
`schema-consistency.test.ts`'s markerVariants block. Review is bounded and
one-time; the pin forces the same review on anything added later. Blind promotion
would have shipped `بَدِّل → with`.

**Recommended scope: es, pt, fr, ko only** — 33 of the 37 wins, regular
morphology, no structural blockers. Skip **de** (5 of its residual are multi-word
separables a single keyword token cannot express, plus the send/submit collision),
**ar** (fix the diacritic misclassification first), and **tr** (needs no semantic
change at all — 10 of 15 already work and the other 5 are the downstream folding
bug).

## The two steps, in this order

### Step 1 — classify a normalizer-resolved word as a keyword

One shared change in the keyword-extractor path (or by routing those extractors
through `tryMorphKeywordMatch`). It unlocks every verb the existing rules already
handle, in all 13 languages whose extractors consult the normalizer, and it
generalizes past the 15 verbs domain-learn happens to use.

**Re-measure before doing anything else.** The residual list after step 1 is the
real scope of step 2, and it will be far shorter than 93.

Blast radius is real: this changes tokenization for 13 languages, so expect the
multilingual corpus to move. That is what the gates are for — and note the lossy
ratchet is now tolerance 0, so a single faithful→lossy flip fails.

### Step 2 — fill the residual, per language

Only what step 1 leaves behind. Known shapes, from the measurement:

- **es/fr/pt** — irregular imperatives the rules miss (`muestra`, `ve`, `retire`,
  `montre`, `remova`). The Spanish normalizer already has
  `{ ending: 'a', stem: 'ar', type: 'imperative' }` at
  `morphology/spanish-normalizer.ts:73`, so this is rule extension, not a table.
- **ko** — the polite-imperative suffixes (`-세요`, `-하세요`, `-으세요`). Regular;
  a suffix rule, not 15 entries.
- **ar** — all 13 differ from the known keyword **only by harakat**
  (`أضِف` vs `أضف`). `arabic-normalizer.ts:55` already strips
  `[ً-ْٰ]`, so this should fall out of step 1 for free. If it does
  not, that is a wiring bug, not missing vocabulary.
- **de** — the hard case, and the one to do last. Separable-verb imperatives are
  MULTI-WORD (`füge hinzu`, `schalte um`, `lege fest`, `rufe ab`), which a
  single-token keyword cannot express. Worse, `get` and `fetch` both render
  `rufe ab`, so they would collide — `validateKeywordCollisions` will say so.
  Decide the multi-word representation before writing anything.
- **tr — do NOT put these in semantic.** The six tr forms are ASCII-folded
  (`kaldir`, `goster`, `degistir`, `gonder`, `artir`) while semantic's profile has
  the CORRECT Turkish (`kaldır`, `göster`, …). Adding the folded spellings would
  write incorrect Turkish into the parser. The bug is in domain-learn's
  `morphologyTable`, which emits the folded form — and fixing that changes
  `renderLearn` output, which is frozen without the owner's agreement. **Raise it;
  don't route around it.**

## What this actually fixes downstream

`shared/exercises/validation.ts:75-81` in lokascript-learn parses BOTH the
student's answer and the expected one, and returns null if either fails — so the
"Correct! (different word order)" path cannot fire. Measured against the shipped
surfaces: `en 5/5 · ja 4/5 · ko 3/5 · zh 3/5 · tr 2/5 · es 1/5 · ar 1/5 · de 1/5 ·
fr 0/5 · pt 0/5`. Note this needs the STUDENT side to parse too, which is why
"build the expected node directly" does not solve it.

## What landed already (branch `fix/per-pattern-parse-ratchet`)

- `d8d71105` — R5 per-pattern parse ratchet; lossy ratchet 3 → 0. Verified by
  inducing #763's regression: green before, red after, naming `he/go-back`.
- `76e0c3b0` — `schemaMarkerAlternatives()` as the single definition of a
  marker's alternatives; fixes tr `set`'s dative allomorphs in bare commands.
- `1c868ee5` — shared `CssSelectorExtractor`; four domain DSLs stopped
  truncating `.active`/`#button` to `.`/`#`.
- `442f5e4d` — ja/ko `get`/`fetch` take the ablative, not the patient particle.

Item 3 of the parent brief (language priorities) is deferred until this lands —
it was explicitly gated on the domain-learn aims question, which resolved to
**(A): domain-learn is a generator**. Under (A) the priority question is mostly
content authoring; pt ranks #2 in the draft with 4 content files, the thinnest of
all ten, and id/vi/hi remain new-language work.

## Gates

```bash
cd packages/testing-framework && npx tsx src/vocab/cli.ts validate   # first, ~1s
npm run test:multilingual:build-deps
npm run populate --prefix packages/patterns-reference                # REQUIRED after any semantic rebuild
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression
```

Two traps worth repeating because both cost time in this arc:

- **`populate` again after every semantic rebuild.** The gate refuses with
  "patterns.db is STALE" otherwise, and the refusal exits 1 — easy to misread as
  a real failure.
- Downstream lokascript-learn: overlay `node_modules`, **include `framework`**,
  expect 1781 pass / 0 fail, restore the backups, revert the `AUDIT.md` that
  `bun test` writes.
