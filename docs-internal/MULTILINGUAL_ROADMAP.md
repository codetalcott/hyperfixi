# Multilingual Parse-Rate Roadmap

> Living plan for bringing all 24 languages to ~100% semantic parse rate.
> **Supersedes the analysis in issue #259** (whose 278-instance / 3-bucket
> breakdown predates the 8 PRs below and no longer matches the baseline).
> Source of truth for "what's left" is the regenerated baseline, not #259.

_Last updated: after Phase 1 `@attr`/`*style` tokenizer fix (ar/tl set-\* family). Track 1 (reactive) complete._

---

## Current state

Baseline: `packages/testing-framework/baselines/multilingual-priority.json`
(generated with `--bundle browser-priority`). Cross-language average **97.9%**
(up from 97.5% before Phase 1).

| Rate         | Languages                                   |
| ------------ | ------------------------------------------- |
| 100%         | en, bn, ms, ru, th, uk, vi                  |
| 99.4%        | de, es, fr, hi, id, pt                      |
| 97–99%       | ja (98.7), it/pl/tr/zh (97.4), he/qu (96.8) |
| 94–96%       | sw (95.5), ko (94.8)                        |
| **laggards** | **ar (92.9), tl (89.6)**                    |

**~76 failing pattern-instances** remain, now in two tracks (Track 1 reactive is done):

| Track                         | Instances | Nature                                                                          |
| ----------------------------- | --------- | ------------------------------------------------------------------------------- |
| **Bucket B — behaviors**      | 24        | Draggable/Sortable/Resizable/Removable not implemented (CI `continue-on-error`) |
| **Deep per-language grammar** | ~52       | Heterogeneous transformer/parser gaps, concentrated in tl / ar / ko             |

> **The clean keyword/marker-alignment vein is exhausted.** Every remaining
> non-behavior failure needs per-pattern transformer/parser/grammar work (see
> "Why the rest is hard"). There is no longer a uniform fix that clears a whole
> cluster the way #269–#272 did.

---

## Shipped

### issue #259 lineage (pre-this-arc)

- **#258** — reactive `bind` engine fix + Western batch (es/pt/fr/de/it).
- **#262** — Class-B `intercept`/`worker`/`eventsource` keywords (ja/ko/zh/tr/qu/bn/ar/he).
- **#263** — Class-B `bind` i18n grammar reconciliation (verb-final SOV rules; zh `把`-free custom; he custom; zh/he source markers).
- **#264** — possessive property paths for ja/ko (profile-aware possessive matcher).
- **#265** — possessive property paths for bn/qu (`bn: 'র'` marker; qu spaced `particle` + hyphen-tolerant matcher).
- **#266** — possessive property paths for tr (Turkish tokenizer word-boundary guard + spaced genitive).
- **#267** — reactive `bind` for ms/sw/th/tl (keyword + source-marker alignment).

### Track 1 reactive — complete (#269–#271), + Hebrew events (#272)

- **#269** — reactive stragglers: th/tl `intercept`/`worker`/`eventsource` keyword
  wiring + `socket-basic` for he/ru/th/uk/zh (English `socket` alias — the transformer
  emits `socket` verbatim and these profiles only carried the native form). **9 instances.**
- **#270** — `live` blocks (fr/it/pl/ru/sw/uk/vi). Not deep block-grammar after all:
  the i18n transformer emitted a `live` form the semantic profile didn't list
  (fr `vif`, it `vivo`, …). Added each as a semantic alternative; for sw/vi the
  emitted form was multi-token (tokenizer-splitting) so the i18n dict was changed to
  a single-token form (sw `mubashara`, vi `live`). **14 instances.**
- **#271** — `when` blocks (ar/he/ja/pl/qu/tr). `when <cond> changes <body> end`
  parses as an event-handler whose leading `when` conjunction must be recognized:
  pl pattern keyed on `gdy` vs emitted `kiedy`; qu/ar/he/tr had no/incomplete
  event-handler patterns (added prefix `{when} {event} {body}` patterns); ja needed
  the dict `when` form `とき`→`時` (`とき` starts with the particle `と`, which the
  char-tokenizer's particle extractor ate). **12 instances.**
- **#272** — Hebrew DOM event-name recognition. The he tokenizer knew Hebrew event
  names but not the English `load`/`resize`/`scroll`/`keydown`/`mousedown`/`mouseup`
  the transformer passes through verbatim. Registered them as he tokenizer extras.
  **14 instances** — he 85.7% → 94.8%, no longer a laggard.

Net so far this arc: **49 instances**, avg **96.2% → 97.5%**. The recurring winning
move was **passthrough-alignment**: when the i18n transformer emits a token verbatim
(English, or a form not in the profile), register that exact token on the semantic
side rather than "fixing" the transformer.

### Phase 1 — `@attr` / `*style` tokenizer fix (ar/tl `set-*` family)

- **17 instances, 0 regressions, avg 97.5% → 97.9%.** ar 87.0% → 92.9%, tl 84.4% → 89.6%.
- **One-line root cause, shared fix.** The semantic tokenizer's `CssSelectorExtractor`
  (`packages/semantic/src/tokenizers/extractors/css-selector.ts`) handled `# . [ <`
  but not `@` or `*`, so `@disabled` / `*opacity` / `*--primary-color` split into
  `@`+`disabled` etc. and never filled a role (exactly the bug the `$greeting`
  `variable-ref` extractor was written to avoid). Extended the extractor to keep
  `@[a-zA-Z_][\w-]*` and `*(?:--)?[a-zA-Z_][\w-]*` as single selector tokens.
  The `*` regex requires a letter/`_`/`--` immediately after `*`, so multiplication
  (`a * b`, `2 * 3`) and globs (`*.css`, `/api/*`) — always space/`.`-delimited in the
  corpus — are never mis-extracted.
- This is shared across all 24 languages but only flips ar/tl (every other language
  either passed already or routes `set` through a hand-crafted pattern / a different
  command). Cleared: `set-attribute`, `set-style`, `set-opacity`, `set-transform`,
  `default-value`, `tabs-aria`, `toggle-visibility`, `announce-screen-reader` (both
  ar/tl), plus a bonus ar `transition-color` (uses `*background-color`).
- **Roadmap note corrected:** the earlier "degenerate empty-body match" / "needs
  per-language @attr handling" framing was wrong. en parses the body fine; the bug was
  purely tokenizer-level token-splitting, fixable once in the shared extractor.
- **Still failing (→ Phase 4):** `set-color-variable` (`set the *--x of #y …` —
  untranslated article `the` + `of`-possessive) and `input-clear`
  (`<input/>.value` member access on a selector).

### Phase 2 — `js-inline` block masking (ja/ko/qu/tr)

- **4 instances, 0 regressions, avg 97.9% → 98.05%.**
- **Root cause:** the i18n transformer parsed `on click js console.log("from js") end`
  as one statement with action `js` and the JS body + `end` as the patient role, then
  reordered it — hoisting the raw JS ahead of the event
  (`console.log(...) 終わり を クリック で JS実行`).
- **Fix (`transformer.ts` → `tryTransformJsBlock`):** intercept `[on <event>] js <raw js> end`
  at the top of `transform()`, before any splitting. The raw JS body is masked behind an
  opaque placeholder so the surrounding event-handler head reorders normally; the
  placeholder is then replaced with `<translated js> <verbatim body> <translated end>`.
  Single-line only for now (multi-line js bodies — e.g. behavior `js(me) … end` — are
  handled with the Phase 5 behavior work). Locked in by a grammar.test.ts case.
- Correct output, e.g. ja: `クリック で JS実行 console.log("from js") 終わり`.

---

## Remaining work

### Track 2 — Bucket B behaviors (24)

`behavior-removable` (11), `behavior-sortable` (5), `behavior-draggable` (4),
`behavior-resizable` (4). These fail across many languages **and** are
pre-existing unimplemented behaviors (CI marks them `continue-on-error`).
This is a **runtime feature track** (implement the behavior), not a parsing/i18n
fix. Largest single pattern is `behavior-removable` (fails in 11 langs incl.
high-rate de/es/fr/it/pt) — worth checking whether it's a _parse_ issue (the
`install … removable` syntax) separable from the unimplemented-runtime issue.

### Track 3 — Deep per-language grammar (~52 remaining)

Concentrated in **tl (16)** and **ar (11)**; the rest scattered (ko 8, sw 7,
qu 5, he/qu 5, ja/tr 3–4, zh/it/pl 1–4). Recurring themes:

- **`set-*` family (ar+tl): MOSTLY DONE in Phase 1.** The `@attr` / `*style`
  token-splitting bug was fixed once in the shared `CssSelectorExtractor` (see
  Shipped → Phase 1). Remaining `set-*` stragglers are `set-color-variable`
  (article `the` + `of`-possessive) and `input-clear` (`<input/>.value` member
  access) — both deferred to the scattered Phase 4 work below, not the `@`/`*`
  token issue.
- **possessive-dot (`.`):** `get-attribute-possessive-dot`,
  `method-call-possessive-dot` (ar/sw/tl) — member-access `.` chains.
- **`caret`** (caret-var-write/on-target; ar/tl), **`transition-*`**
  (color/opacity/transform; ar/ko/tl), **`announce-screen-reader`** (ar/he/sw/tl —
  uses `set @role` + a compound body).
- **`js-inline` (ja/ko/qu/tr):** the transformer **mangles** the `js … end` block,
  reordering the JS source (`console.log(...) 終わり を クリック で JS実行`). The
  block body needs masking from word-order transformation.
- **`event-key-combo` (ja/ko/qu/tr):** complex SOV event + `keydown[key=="…"]` +
  conditional. `put-before`/`put-after` (tl) hit a keyword collision
  (`after`→`pagkatapos`, which is also tl's `then`).

**Approach if resumed:** these are individual transformer/parser fixes, not a
cluster sweep. Highest tractability-to-value is probably **`js-inline` block masking**
(one transformer fix, 4 langs) — but verify it's not just another degenerate match
first. The `set-*` family is the biggest count but the lowest value (best case is
en-parity degenerate matching).

### Why the rest is hard (investigation notes, this arc)

- The harness's success criterion is **non-null parse**, so some en patterns "pass"
  with a **degenerate empty-body** event-handler match (`set-@`/`*`). Replicating that
  for other langs is legitimate by the metric but low-value and fiddly.
- `@attr` / `*style` tokens are not handled by the language tokenizers in event-handler
  bodies; a simple-var body (`set $x to true`) parses where `set @disabled to true` does not.
- VSO/SOV event-handlers put the event at the end / reorder the body; combined with
  unparseable body tokens, the whole handler match fails (not just the body).

---

## Playbook (proven this session)

1. **Edit source** (semantic profiles `packages/semantic/src/generators/profiles/{lang}.ts`,
   schema `command-schemas.ts`, and/or i18n `packages/i18n/src/grammar/{transformer,profiles/index}.ts`).
2. **Rebuild** the packages you touched: `cd packages/<pkg> && npx tsup` (i18n, semantic),
   and `cd packages/core && npx rollup -c` (rebuilds `dist/multilingual` — needed because
   the harness parses via `@hyperfixi/core/multilingual`).
3. **Probe** before the full run — transform + parse a single pattern:
   ```js
   import { GrammarTransformer } from '@lokascript/i18n'; // (langs WITH grammar profile)
   import { parse } from '@lokascript/semantic'; // raw parse (no confidence gate)
   ```
   For langs WITHOUT an i18n grammar profile (currently **ms** — check
   `profiles` export in `i18n/src/grammar/profiles/index.ts`), generated text comes from
   keyword substitution derived from the **semantic** profile, not the transformer.
4. **Repopulate** the DB: from `packages/patterns-reference`, run
   `npm run db:init:force && npm run sync:translations` (skip `seed:llm` — it needs
   network and doesn't affect the harness's `pattern_translations`).
5. **Regenerate baseline:**
   `npm run test:multilingual --prefix packages/testing-framework -- --full --bundle browser-priority --save-baseline`
6. **Verify** the diff vs `HEAD` baseline: only intended langs/patterns flip, **zero `↓`**.
7. **Restore the binary DB** before committing: `git checkout packages/patterns-reference/data/patterns.db`
   — **do not commit it** (CI repopulates from source; committing semantic/i18n source is sufficient).
8. Run `npm test --prefix packages/i18n` and the semantic suite (the
   `build-artifacts.test.ts` `.d.ts` failures are environmental — they pass in CI).

---

## Gotchas (hard-won — read before resuming)

- **Verify via `MultilingualHyperscript.parse()` returning non-null**, not semantic's
  `parse()` confidence — that's the harness's success criterion.
- **Align the `bind` (and any reactive) source `markerOverride` to what the i18n
  transformer _emits_, not the dictionary's "to".** `add` has no override (permissive
  default); `bind` carries explicit per-language markers that silently reject a
  mismatched marker. Lessons: de `zu`, it `in`, sw `kwa` (not `kwenye`), ms `to`
  (no grammar profile → English prepositions survive), th `ใน`.
- **Stale-DB / baseline catch-up:** a committed baseline can lag source because CI's
  `multilingual-validation` gates on _regressions only_ (improvements pass silently).
  Always `db:init:force` + regen to see true state; a refresh alone can flip already-fixed
  patterns (seen with vi in #262-era, qu in #265-era).
- **Possessive `'s`** is handled by `tryMatchPossessiveSelectorExpression` in
  `pattern-matcher.ts`: it reads the profile's `possessive.marker` (particle/punctuation),
  restricts the property to an _identifier_ (so `#button の .active` isn't mis-read),
  and strips a leading hyphen for agglutinative markers (qu `-pa`). Non-Latin markers
  (の/의/র) split off the selector automatically; **Latin markers must be spaced**
  (`'particle'` type in the i18n `POSSESSIVE_MARKERS`, e.g. qu/tr) or they glue to the selector.
- **Turkish tokenizer** greedily prefix-matched short suffix markers (`de`/`te`/…) inside
  content words (`değer`→`de`+`ğer`); fixed with a word-boundary guard in
  `tokenizers/extractors/turkish-keyword.ts`. Watch for similar in other agglutinative langs.
- **Keyword collisions:** run `packages/semantic/test/keyword-collisions.test.ts` after
  adding keywords (caught tr `bağla`=bind/connect, bn `যুক্ত`). When no collision-free
  native verb exists, keep the English form as primary (tr/qu `bind`).
- **Don't run `generate:language-assets`** for focused batches — it syncs all drift into
  one unreviewable diff. Hand-edit the specific entries.
- **Passthrough-alignment (the #269–#272 winning move):** when the transformer emits a
  token verbatim — English (`socket`, `load`), or a dictionary form the semantic profile
  doesn't list (`vif`, `kiedy`) — register **that exact token** on the semantic side
  (profile alternative, tokenizer extra, or event-handler pattern literal). Don't "fix"
  the transformer. Probe the actual transform output first; assumptions about what it
  emits are often wrong.
- **Char-tokenizer particle greediness (ja/th/zh):** a keyword that starts with a
  particle (ja `とき` starts with `と`) gets eaten by the particle extractor. Prefer a
  single-token form with no leading particle (ja `時`), set via the i18n dict.
- **Multi-token keywords don't tokenize (vi/sw and most char-langs):** the tokenizer
  splits on hyphen/space, so `trực tiếp` / `moja_kwa_moja` never match. Use a single-token
  emitted form (English loanword, or a one-word native synonym already in the profile).
- **Degenerate empty-body matches:** an en pattern can "pass" (non-null) while its body is
  unparsed (`set @attr` inside `on click …`). Before chasing such a pattern in another
  language, check whether en actually parses the body — if not, the win is hollow.

---

## Suggested sequencing for fresh sessions

Track 1 (reactive) is **done** (#269–#271); Hebrew events done (#272). What remains is
**not** quick — pick deliberately:

1. **`js-inline` block masking** (ja/ko/qu/tr, 4) — single transformer fix to mask the
   `js … end` body from word-order reordering. Most tractable of the deep set; verify it
   isn't a degenerate match first.
2. **`set-*` family** (ar/tl, ~10) — biggest count but lowest value (en-parity degenerate
   match) and needs `@attr`/`*style` token handling in event-handler bodies.
3. **Bucket B behaviors** (24) — separate **runtime** track; implement
   Draggable/Sortable/Resizable/Removable, then revisit the `install … <behavior>` parse.
4. **Scattered per-language** (caret, transition-\*, possessive-dot, announce) — one
   pattern at a time; expect tokenizer/transformer work per item.

Definition of done (unchanged from #259): all languages ≥ ~99% in the regenerated baseline.
Realistically the next ~10–15 points of parse-rate require the deep work above, not
more keyword wiring.
