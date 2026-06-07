# Multilingual Parse-Rate Roadmap

> Living plan for bringing all 24 languages to ~100% semantic parse rate.
> **Supersedes the analysis in issue #259** (whose 278-instance / 3-bucket
> breakdown predates the 8 PRs below and no longer matches the baseline).
> Source of truth for "what's left" is the regenerated baseline, not #259.

_Last updated: after the qu `install` keyword-collision fix (`install-behavior` qu). Track 4 (method-call, event-body blocks, tl put before/after) and Track 1 (reactive) complete._

---

## Current state

Baseline: `packages/testing-framework/baselines/multilingual-priority.json`
(generated with `--bundle browser-priority`). Cross-language average **98.54%**
(up from 97.5% before Phase 1; Phases 1–4 + Track 4 + qu `install`: +39 instances).
**54 failing pattern-instances** remain (24 are Bucket B behaviors).

| Rate     | Languages                                   |
| -------- | ------------------------------------------- |
| 100%     | en, bn, hi, ja, ms, ru, th, uk, vi          |
| 98–99%   | qu (98.7), de/es/fr/id/pt (99.4), tr (98.7) |
| 96–98%   | it/pl/zh (97.4), ko (96.1), he/sw (96.8)    |
| laggards | **ar (94.8), tl (92.9)**                    |

**~30 non-behavior failing pattern-instances** remain (plus 24 Bucket B behaviors),
in two tracks (Track 1 reactive done):

| Track                         | Instances | Nature                                                                           |
| ----------------------------- | --------- | -------------------------------------------------------------------------------- |
| **Bucket B — behaviors**      | 24        | Draggable/Sortable/Resizable/Removable defs don't parse (CI `continue-on-error`) |
| **Deep per-language grammar** | ~30       | VSO event-at-end + `from`-source reorder, command modifiers, condition i18n      |

> **The clean tokenizer token-split vein is now largely worked out** (Phases 1 & 4
> cleared `@`/`*`/`^`; Phase 3a the English DOM events). Every remaining
> non-behavior failure needs per-pattern transformer/parser/grammar work (see
> Track 4 and "Why the rest is hard"). There is no longer a uniform fix that
> clears a whole cluster.

---

## Shipped

### qu `install` keyword-collision fix — `install-behavior` (+1)

- **1 instance, 0 regressions, avg 98.51% → 98.54%.** qu 98.1% → 98.7%.
- **Root cause (passthrough-alignment).** The i18n qu dictionary mapped
  `install` → `churay`, but `churay` is also qu for `put`/`set`, and the semantic
  qu profile expects `install` = `tarpuy` (`churay` = `put` there). So
  `install Draggable` transformed to `Draggable ta churay`, which the semantic
  parser read as a malformed `put` (no destination) and rejected. Changed the
  i18n qu dict to emit `tarpuy` (the specific "install/plant" verb already in the
  semantic profile) — this both aligns the two systems and removes the
  put/set/install overload. Verified `Draggable ta tarpuy` parses as `install`.
  Locked by a Quechua case in `grammar.test.ts`.
- **Reusable finding — the keyword-mismatch diagnostic.** A scan comparing each
  i18n dict's command verbs against the semantic profile's primary+alternatives
  surfaces many mismatches, but **most are latent** (the command isn't in the
  test corpus, or the parse survives via normalization/word-order). The qu
  `install` case was special: an _active collision_ (one i18n form, three
  commands) **and** in the corpus **and** failing. When mining this list for more
  wins, cross-reference against the actual failing patterns first.

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

### Phase 3a — event guards + English DOM event passthrough

- **3 instances, 0 regressions, avg 98.05% → 98.13%.** sw `blur-element`,
  `focus-trap`, `keydown-key-is-syntax`.
- **Two coordinated fixes:**
  1. **i18n transformer** — the tokenizer split event guards on internal spaces
     (`keyup[key is 'Escape']` → `keyup[key` / `is` / `'Escape']`, mis-reading
     `is` as the action verb), and `translateMultiWordValue` translated keywords
     _inside_ `[...]` (`is` → sw `ni`). Made `tokenize()` bracket-aware and mask
     `[...]` guard spans from translation (verbatim, private-use sentinels).
  2. **framework base tokenizer** — registered the standard English DOM event
     names (`keyup`/`keydown`/`resize`/…) as universal `!has`-guarded fallbacks in
     `initializeKeywordsFromProfile`. The transformer passes these through
     verbatim (no native dictionary form), so non-English token streams treated
     them as bare identifiers and guarded handlers failed. Generalizes the
     per-language Hebrew registration from #272 to all 24 languages at once.
- **Verified safe:** full semantic suite (5260 pass; only the environmental
  `build-artifacts` `.d.ts` checks fail) and all 759 framework tests pass.
- **Remaining Phase 3 (deferred — genuinely deep, heterogeneous):**
  `event-key-combo` (ja/ko/qu/tr) and `repeat-until-event` (hi) need
  **event-handler-body block masking** (`if…end` / `repeat…end` inside a handler
  reorder into the role soup); `window-resize` (qu/tr) needs **event-modifier**
  handling (`from window debounced at 200ms`); `multiple-events` (ar) needs
  **`or`-conjoined events** in VSO; `on-custom-event-receive` (ko/qu) needs
  custom-event + `put…into me` reorder; `focus-trap` (tr) needs the body-block
  work too. Each is a separate transformer enhancement, not a shared fix.

### Phase 4 — caret variable token-split (ar/tl)

- **2 instances, 0 regressions, avg 98.13% → 98.19%.** ar/tl `caret-var-write`.
- **Root cause:** the `variable-ref` extractor kept `:local` / `$global` together
  but not `^caret`, so `^count` split into `^` + `count` and never filled a role
  (same class as Phase 1's `@`/`*`). Added `^` (identifier-start required, so the
  XOR operator `a ^ b` is never mis-extracted). Locked by a variable-ref.test.ts
  case. `caret-var-on-target` still fails — its `… on #host into me` destination
  reorders (separate issue, below).

### Track 4 — Scattered per-language remainder (deferred, ~deep)

After Phases 1–4 the non-behavior failures left are all genuinely deep, each its
own transformer/parser project (no shared lever remains):

> **`transition-*` / `window-resize` (the "modifier" cluster):** attempted and
> found to need a deliberate refactor (the `*style` patient is a selector the
> transition schema rejects; the `duration` role lands after the event clause).
> Full design in **[TRANSITION_MODIFIER_REFACTOR_PLAN.md](TRANSITION_MODIFIER_REFACTOR_PLAN.md)**
> — slated for its own session.

- **method-call / member-access — DONE (+5).** `my.value.toUpperCase()` /
  `my.getAttribute("data-id")` (ar/sw/tl). The possessive-dot matcher
  (`tryMatchPossessiveExpression`) expected the trailing call as a single `(...)`
  token, but the tokenizer splits it into `(` / args / `)`. Changed it to consume
  the call by balanced-paren count. The diagnostic detour: the bare semantic
  `parse()` fails this even in en, but the harness wraps in an event handler
  (`on input …`) whose body path parses it — so en passed all along and the fix
  was purely making ar/sw/tl's possessive path consume the split parens. Locked by
  possessive-value-fillers.test.ts.
- **event-handler block body — DONE (+5).** `event-key-combo` (ja/ko/qu/tr) +
  `repeat-until-event` (hi). `on <event> {if|repeat|…} … end` had its block body
  shredded across the event handler's roles by `parseEventHandler`. Added
  `tryTransformEventWithBlockBody` (i18n): mask the block, reorder the event head,
  transform the block as a self-contained unit (`transformBlockBody`), and emit
  **event-clause first, then block** — even in verb-first (VSO) languages, since
  the semantic parser only matches a block body after the event. Event heads with
  a `from <source>` modifier are excluded (the source/event ordering differs by
  word order and the existing path already parses them) — this keeps
  `window-keydown` / `focus-trap` unregressed. Locked by a grammar.test.ts case.
- **Still open here:** `focus-trap` (tr), `window-resize` (qu/tr) — event-block
  bodies _with_ a `from <source>` clause; need event-first + source ordering for
  VSO. `multiple-events` (ar) needs `or`-conjoined events.
- **put before/after — DONE (+2, tl).** Only tl failed (ar/es/en parse). Two
  causes: (1) tl's destination role-marker had no before/after alternatives, so
  the generated put pattern couldn't match a before/after target — added `bago`
  (before) / `matapos` (after) as destination alternatives, mirroring Arabic's
  قبل/بعد. (2) the i18n tl dict emitted `pagkatapos` for positional "after", which
  is _also_ tl "then" — switched it to the unambiguous `matapos` (matching the
  semantic profile). Locked by tagalog-idioms.test.ts.
- **`transition-*` `over <dur>` modifier** (ko/tl) — `over 500ms` modifier is
  dropped/misplaced in word-order reorder.
- **`scroll to last <sel> in …`** (last-in-collection; ar/tl) — `scroll to` +
  positional `last` + `in` source structure. (Tag-less `<.class/>` query selectors
  also tokenize whole now would help, but the structure is the real blocker.)
- **`unless <cond>`** (ar/tl) — the condition (`I match .disabled`) keeps English
  `I`/`match` and the `unless` block isn't reassembled.
- **`put … before/after`** (tl) — `after` → `pagkatapos` collides with `then`.
- **caret-var-on-target, announce-screen-reader (he/sw), set-color-variable,
  input-clear, form-disable-on-submit, multiple-events** — destination/compound
  reorder + article/`of`-possessive + `or`-events (see Phase 3 notes).

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

Track 1 (reactive) is **done** (#269–#271); Hebrew events done (#272); `js-inline`
block masking is **done** (Phase 2 — the old item 1 here was stale). What remains is
**not** quick — almost everything left is structural SOV/VSO body reordering. Pick
deliberately:

1. **Bucket B behaviors** (24, biggest lever) — separate **runtime** track. Note
   `behavior-removable`'s `raw_code` is the behavior _definition source_, which
   contains a **multi-line `js(me) … end`** block; Phase 2 only masked single-line
   `js`, so this needs multi-line-js masking inside `behavior` defs (deferred
   "Phase 5"). Not a cheap parse win.
2. **`transition-*`** (ko/tl, ~6) — **deeper than the refactor plan claimed** (see
   the ⚠️ update at the top of `TRANSITION_MODIFIER_REFACTOR_PLAN.md`): needs new
   post-verb-role SOV/VSO event-handler pattern variants, not a marker tweak.
   Multi-session, low ROI.
3. **`set-*` family** (ar/tl, ~10) — biggest non-behavior count but lowest value
   (en-parity degenerate match) and needs `@attr`/`*style` token handling in
   event-handler bodies.
4. **Scattered per-language** (caret, possessive-dot, announce, unless, multiple-events)
   — one pattern at a time; expect tokenizer/transformer work per item.

**Structural finding — custom events in SOV (`on-custom-event-receive`, ko/qu).**
`on hello put X into me` parses in SVO (en/es) but fails in ko: `on click …` passes
(`'Got it!' 를 클릭 넣다 나 에`) while `on hello …` fails (`… hello 넣다 …`) — the
_only_ difference is the event token. The SOV event-handler pattern's `{event}` slot
matches a **recognized event keyword** (클릭) but not an arbitrary identifier
(`hello`); SVO works because the leading `on`/`en` marker disambiguates. Fixing it
means letting the SOV `{event}` slot accept a bare identifier (over-match risk) — a
parser change, not a keyword fix.

**Keyword-mismatch mining (low-risk wins, mostly latent).** A diagnostic comparing
each i18n dict verb to the semantic profile's primary+alternatives surfaces dozens
of mismatches, but most are inert (untested command, or parse survives anyway). The
qu `install` win was the rare case that was an _active collision_ AND in the corpus
AND failing. Cross-reference any candidate against the live failing-pattern list
before investing.

Definition of done (unchanged from #259): all languages ≥ ~99% in the regenerated baseline.
Realistically the next ~10–15 points of parse-rate require the deep work above, not
more keyword wiring.
