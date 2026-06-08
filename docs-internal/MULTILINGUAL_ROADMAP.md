# Multilingual Parse-Rate Roadmap

> Living plan for bringing all 24 languages to ~100% semantic parse rate.
> **Supersedes the analysis in issue #259** (whose 278-instance / 3-bucket
> breakdown predates the 8 PRs below and no longer matches the baseline).
> Source of truth for "what's left" is the regenerated baseline, not #259.

_Last updated: after event-block `from`-source routing (`focus-trap` tr) — **all non-behavior failures cleared**. Caret-scope masking, @attr-in-selector-role, trailing-event block-wrap, custom-event SOV, property-path patient, Tier 1, Track 4, Track 1 (reactive) complete._

---

## Current state

Baseline: `packages/testing-framework/baselines/multilingual-priority.json`
(generated with `--bundle browser-priority`). Cross-language average **99.05%**
(up from 97.5% before Phase 1; Phases 1–4 + Track 4 + qu `install` + passthrough
batch + Tier 1 + property-path patient + custom-event SOV + trailing-event
block-wrap + @attr-in-selector-role + caret-scope masking + event-block from-source:
+69 instances). **24 failing pattern-instances remain — all of them Bucket B
behaviors. Every non-behavior pattern now parses in all 24 priority languages.**

| Rate | Languages                                          |
| ---- | -------------------------------------------------- |
| 100% | en, bn, hi, ja, ko, ms, qu, ru, th, tl, tr, uk, vi |
| 99%  | de/es/fr/id/pt (99.4), ar (99.4), sw (98.7)        |
| 97%  | it/pl/zh (97.4), he (97.4)                         |

The sub-100% languages now fail **only** Bucket B behaviors (below); their
non-behavior parse rate is 100%.

**0 non-behavior failing pattern-instances remain** (plus 24 Bucket B behaviors):

| Track                         | Instances | Nature                                                                           |
| ----------------------------- | --------- | -------------------------------------------------------------------------------- |
| **Bucket B — behaviors**      | 24        | Draggable/Sortable/Resizable/Removable defs don't parse (CI `continue-on-error`) |
| **Deep per-language grammar** | 0         | — cleared —                                                                      |

The remaining 24 are all `behavior-removable` (11: ar,de,es,fr,he,id,it,pl,pt,sw,zh),
`behavior-sortable` (5: he,it,pl,sw,zh), `behavior-draggable` (4: he,it,pl,zh),
`behavior-resizable` (4: he,it,pl,zh) — a **runtime** track (unimplemented
behaviors), not a parsing/i18n track. See Track 2.

> **Custom-event SOV cleared `on-custom-event-receive` (ko+qu) and, as a side
> effect, `window-resize` (qu+tr).** The SOV event extractor now accepts a bare
> (non-keyword) identifier in the event slot, gated by the event-marker particle
> (ja/tr/qu/bn) or an immediately-following command verb (ko). The qu/tr resize
> words (`hatun_kay` / `boyut_değiştir`) are real events absent from the native
> event dictionary, so they fell out for free. **+4 instances, 0 regressions**
> (full `browser-priority` regen). See Shipped → "Custom-event SOV slot".

> **The clean tokenizer token-split vein is now largely worked out** (Phases 1 & 4
> cleared `@`/`*`/`^`; Tier 1 the tag-less `<.class/>` selector). Every remaining
> non-behavior failure needs per-pattern transformer/parser/grammar work (see
> "Why the rest is hard"). There is no longer a uniform fix that clears a whole
> cluster.

---

## Shipped

### `is empty` predicate alignment — fidelity Root A partial (avgFidelity, 5 langs)

- **avgFidelity up for fr/id/pl/pt/zh (~+0.0026 each, +0.0006 cross-lang), 0 new
  failures, 0 fidelity regressions, degenerate count unchanged (223).** Each `if …
is empty …` handler in these languages now parses faithfully (`add,empty,if,on`)
  instead of dropping the condition predicate (`add,if,on`).
- **Root cause (recurring, per-language).** The semantic profile's `empty` keyword
  primary is the **verb** ("to empty/clear" — `vider`/`esvaziar`/`清空`/…), but the
  i18n transformer emits the **adjective** for the `is empty` emptiness check
  (`vide`/`vazio`/`空的`/…). The adjective was unregistered, so the predicate was
  dropped from the condition. Only `es` (`vacío`) was already aligned.
- **Fix.** Add the adjective as an `alternatives` entry on each profile's `empty`
  mapping (additive — the verb/clear-command still works; no collisions). 5 one-line
  profile edits.
- **Honest scope.** This is a **partial Root A** win and deliberately does **not**
  move the degenerate-pass count: these patterns were already ≥0.5 fidelity (above
  the degenerate threshold), so the fix lifts them 0.75→1.0 (avgFidelity) without
  clearing a degenerate pass. See the Track-5 note below — the tracked degenerate
  cases are the _fully-collapsed_ (<0.5) ones, which need deeper per-language work.
  Languages it/ru/uk/vi/th/sw also drop `empty` but additionally lose the body
  command, so the predicate alignment alone doesn't make them faithful (separate gap).
- Locked by `multilingual-roadmap-fixes.test.ts` ("`is empty` predicate alignment").

### Post-event then-chain capture — fidelity Root B (+9 faithful, first Track-5 fix)

- **Fidelity, not parse rate**: degenerate passes **232 → 223** (−9 degenerate→faithful),
  **0 new failures, 0 fidelity regressions, parse rate unchanged** (3672/3696). Locked
  by the fidelity ratchet (`--regression`). The 9: `fetch-loading-state` (ar, de, qu,
  sw, tl), `fetch-basic` (de, ja), `its-value-possessive-dot` (de, ja).
- **Root cause (semantic parser).** A fused VSO/SOV event pattern matches a
  command-first handler (`<cmd> on <event> then <cmd>…` — e.g. ar `أضف .loading …
عند نقر ثم احذف … ثم ضع …`) and captures the _first_ command, but the trailing
  `then`-chain is left unconsumed _without_ a `continues` marker. `buildEventHandler`
  only parsed the remainder when `continues:'then'` was captured, so the body
  collapsed to that first command and **every post-event command was silently dropped**
  — a non-null but degenerate parse.
- **Fix.** In `buildEventHandler`'s grammar-transformed branch, also parse the
  remainder when the next unconsumed token is a then-keyword (`hasTrailingThenChain`),
  not only when `continues` was captured. Additive and tightly gated: a lone
  command-first event (no trailing `then`) is unchanged, and only successfully-parsed
  commands are appended, so it can lift fidelity but never break an existing parse
  (confirmed: 0 regressions across the full 24-language corpus + 5313 semantic tests).
- **Honest caveat.** This is Root B only. Root A (the i18n transformer scrambling SOV
  `if … is …` conditions — `if-empty`/`input-validation`, the largest cluster) is
  untouched and is the next Track-5 target. `fetch-loading-state`/ar is now 0.80 not
  1.0 (its inner `fetch` body command is a separate AR-pattern gap).
- Locked by `multilingual-roadmap-fixes.test.ts` ("Post-event then-chain capture":
  ar body keeps remove/put; a lone command-first event keeps just its command).

### Event-block `from`-source routing — `focus-trap` tr (+1, completes the non-behavior track)

- **1 instance, 0 regressions, avg 99.05% (fix run vs committed baseline: exactly
  tr `focus-trap` flips `↑`, zero `↓`).** tr 99.4→100. **This was the last
  non-behavior failure** — every non-behavior pattern now parses in all 24
  priority languages.
- **Root cause.** `on keydown[key=="Tab"] from .modal if … end` is an event handler
  with a guard, a `from <source>`, and an `if…end` block body. `tryTransformEventWithBlockBody`
  explicitly **excluded** event heads carrying `from`, so focus-trap fell to the
  generic path, which shredded the if-block across the handler's roles and left its
  inner keywords (`in`/`focus`/`first`/positional) **untranslated**. 23 languages
  still scraped a (degenerate) non-null parse from that garbage; tr's specific
  scramble didn't, so it failed.
- **Fix.** Route `from`-source heads through the block-body path **for SVO/SOV
  targets** — mask the block, emit the event clause (incl. the translated
  `from <source>`, which `parseEventHandler` reorders) first, then the transformed
  block. The block body's keywords now translate properly. **VSO targets (ar, tl)
  stay on the existing path**: there the event-first emission with a `from`-source
  reorders incorrectly and regressed `focus-trap`/`window-keydown` (confirmed by a
  full regen of the un-gated version: −4 in ar/tl), while the existing path already
  parses them. So the `from`-exclusion is now scoped to `wordOrder === 'VSO'`.
- **Honest caveat.** focus-trap parses **degenerately in all 24 languages** (the
  if-block body still isn't a clean focus/halt parse everywhere); this fix lifts tr
  to the same non-null parity the other 23 already had, rather than inventing a new
  hollow pass. A fully clean focus-trap (no leaked keywords, real block body across
  all langs) is a separate, larger transformer project.
- Locked by `grammar.test.ts` (tr routes through the block path — `odak` translated,
  event leads; ar stays on the existing path without throwing).

### Caret-scope masking — `caret-var-on-target` ar+tl (+2)

- **2 instances, 0 regressions, avg 99.05% (fix run vs committed baseline: exactly
  ar/tl `caret-var-on-target` flip `↑`, zero `↓`; no stale-DB artifact this time).**
  ar 98.7→99.4, tl 99.4→100.
- **Root cause (two sides).** `on click put ^count on #host into me` failed even in
  **English**: `^count on #host` reads a DOM-scoped `^count` variable from a
  specific element, but the **overloaded `on`** broke both layers. (1) The semantic
  `put` pattern had no notion of `^var on <selector>`, so the inner `on` left
  `into me` unmatched → NULL (the full handler only "passed" with a hollow
  empty body). (2) The i18n transformer's splitter/event-parser read the inner
  `on` as an event/command boundary, mangling the output (`ضع ^count عند نقر ثم في
أنا عند #host` — spurious `then`, scope stranded at the end, event lost).
- **Fix (two parts).**
  1. **Semantic matcher (`tryMatchCaretScopeExpression`).** Folds `^name on
<selector>` into one expression value, gated to `^`-prefixed identifier tokens
     followed by an `on`-marker (matched by raw value `on` or normalized
     `destination`, cross-language) and a selector — so `toggle .active on #button`
     (class-selector patient) is untouched. The trailing `into me` destination then
     matches; the en handler gets a real body.
  2. **Transformer masking.** `maskCaretScopes` hides the ` on <selector>` scope
     behind an opaque sentinel attached to `^name` before any split/reorder (the
     same shape as the js-block / string-literal masks), then `restoreCaretScopes`
     puts it back verbatim. The command reorders as if the patient were a single
     value; the event clause survives and `^count on #host` stays adjacent. `on`
     is kept English (passthrough-alignment — the matcher accepts it everywhere).
- Locked by `multilingual-roadmap-fixes.test.ts` (clean-en parse, real-body guard,
  `toggle … on #button` + scope-less `put` guards, ar/tl transformed forms) and
  `grammar.test.ts` (transform keeps the scope adjacent + event, no leftover
  sentinel, normal commands undisturbed). Only one corpus pattern carries a
  caret-scope, so the change is inherently narrow.

### `@attr` in selector roles — `form-disable-on-submit` ar+tl (+2)

- **2 instances, 0 regressions, avg 99.05% (fix run vs committed baseline: exactly
  ar/tl `form-disable-on-submit` flip `↑`, zero `↓`).** ar 98.1→98.7, tl 98.7→99.4.
- **Root cause.** `@disabled` tokenizes with kind **`identifier`**, not `selector`
  — and that kind is **load-bearing**: roles like bind's `@property`
  (expectedTypes `['reference','expression']`) rely on the identifier reading.
  Phase 1 kept `@attr`/`*style` as one token (fixing the `set` family) but left
  the kind as `identifier`, so `add`/`remove`/`toggle`, whose patient is
  `expectedTypes: ['selector']`, reject it: `add @disabled` failed outright (and
  `toggle @disabled` only "passed" via a permissive hand pattern that captured
  nothing). That bad `add @disabled` clause gated the whole form-disable body.
- **Fix.** In `matchRoleToken` (`pattern-matcher.ts`), when the candidate token is
  an `@`-prefixed `identifier` **and the role explicitly expects a `selector`**,
  convert it to an attribute selector. Gated on `expectedTypes.includes('selector')`
  so non-selector `@`-roles (bind's `@property`, etc.) are untouched. Combined with
  the trailing-event wrapper (below), the ar/tl form-disable body now parses.
- **A global token-kind reclassification was tried first and rejected** — making
  `@attr` a `selector` kind everywhere regressed 43 patterns (bind/js-inline/when/
  live/transition families read `@x` as a non-selector). The role-gated value
  conversion is the surgical version: provably additive (the new branch only fires
  for `@`-identifiers in selector roles; every other input hits byte-identical
  code), confirmed by an A/B probe (same DB, build toggled — flips only form-disable).
- **Methodology note.** The committed baseline can disagree with a fresh-DB harness
  run by tens of patterns (a flaky undercount surfaced here at 3624 vs 3669). Trust
  a controlled A/B probe over a single full-suite run; verify regressions against
  the committed baseline. Locked by `multilingual-roadmap-fixes.test.ts`
  (`add @disabled`, `remove @disabled`, a bind non-regression guard, and the ar/tl
  form-disable bodies).

### Trailing-event block-wrap — `unless-condition` ar+tl (+2)

- **2 instances, 0 regressions, avg 99.05% (full `browser-priority` regen: exactly
  ar/tl `unless-condition` flip `↑`, zero `↓`).** ar 97.4→98.1, tl 98.1→98.7.
- **Root cause.** SVO/VSO transforms put the event clause at the very end
  (`<body> عند <event>` / `<body> kapag <event>`). The per-command _fused_ event
  patterns (`toggle-event-ar-vso-…`) only cover simple bodies, so a **block** body
  (`unless <cond> toggle …`) wasn't wrapped and degraded to a hollow standalone
  command. Two gaps: ar/tl didn't recognize `unless` at all (ar `إلا إذا`
  **splits**, with `إذا`→`if`; tl `maliban_kung` was an unrecognized identifier),
  and there was no generic block+trailing-event wrapper.
- **Fix (two parts).**
  1. **Keyword.** Added `unless` to the ar/tl semantic profiles as a single token
     (`إلا` / `maliban_kung`); the i18n ar dict now emits single-token `إلا` (the
     two-word `إلا إذا` is split by the tokenizer). `keyword-collisions.test.ts`
     clean.
  2. **Parser — `tryTrailingEventExtraction` (new stage 1.5).** Recognizes a
     trailing `<on-marker> <event>` (gated to a recognized event keyword in the
     final position, so a trailing destination selector like `على #button` is
     never mistaken for an event), strips it, and parses the preceding tokens as
     the handler body. It runs only after the dedicated event patterns fail and
     returns null (falling through to the command stage unchanged) unless it finds
     a genuine trailing event whose body parses — so structurally it can only add
     parses, never break one. Result is en-parity: `on { unless(…) ; toggle(…) }`.
- Locked by `semantic/test/multilingual-roadmap-fixes.test.ts` (ar+tl block-wrap
  asserting the body keeps both `unless` and `toggle`, plus guards that a trailing
  destination selector and a plain command are left untouched).

### Custom-event SOV slot — `on-custom-event-receive` ko+qu (+ window-resize qu+tr) (+4)

- **4 instances, 0 regressions, avg 99.05% (full `browser-priority` regen: exactly
  ko/qu `on-custom-event-receive` + qu/tr `window-resize` flip `↑`, zero `↓`).**
  ko 99.4→100, qu 98.7→100, tr 98.7→99.4.
- **Root cause.** `trySOVEventExtraction` (the stage-3 fallback in
  `semantic-parser.ts`) only recognized built-in event keywords
  (`click`/`submit`/…) in the event slot. A custom event keeps its untranslated
  source identifier after the grammar transform — `on hello put 'Got it!' into me`
  → ko `'Got it!' 를 hello 넣다 나 에`, qu `… hello pi churay` — so `hello`
  surfaced as a bare `identifier` token and never filled the event slot; the whole
  handler failed (stages 1 & 2 already can't anchor a mid-stream event).
- **Fix.** A second pass accepts a bare identifier in the event slot, gated by the
  same structural cue the built-in path uses so a stray content identifier is never
  mistaken for an event: marker languages (ja/tr/qu/bn) require the event-marker
  particle right after the identifier (`hello pi`); marker-less Korean requires the
  identifier to sit immediately before the body's command verb (`hello 넣다`). The
  existing body re-parse is the final guard. Runs only after the event- and
  command-pattern stages already failed.
- **Bonus.** `window-resize` (qu/tr) flipped too: the qu/tr resize words
  (`hatun_kay` / `boyut_değiştir`) are the real event, just absent from the native
  event dictionary — the same gate now accepts them. (The `debounced at 200ms`
  modifier is still dropped, but the metric is non-null parse.)
- Locked by `semantic/test/multilingual-roadmap-fixes.test.ts` (ko+qu custom event,
  the 클릭 control, and a guard that a plain command body never becomes a phantom
  event handler).

### Investigated, then shipped — the full non-behavior track

> Every item once tracked in this section has now graduated to **Shipped**:
> `unless-condition`, `form-disable-on-submit`, `caret-var-on-target` (all ar+tl),
> and `focus-trap` (tr). With them, **all non-behavior pattern-instances parse in
> all 24 priority languages.** The remaining failures are exclusively Bucket B
> behaviors (Track 2 — a runtime track, not parsing/i18n). One enduring lesson
> recorded along the way: the `<selector> in <scope>` matcher once scoped here was
> **not** the form-disable blocker (`in me` was already tolerated; the real gate
> was `@attr` patient classification), and `focus-trap`'s positional
> `<sel> in <scope>` already parsed in command context — a reminder to verify the
> true blocker with a probe before building.

### Property-path patient — fused-dot member access (+2)

- **2 instances, 0 regressions, avg 99.00% → 99.05%.** he 97.4→97.4 (announce was
  he's last non-behavior; he/sw both clear it). Cleared `announce-screen-reader`
  (he+sw). Confirmed by a full `browser-priority` baseline regen (exactly these 2
  flip `↑`, zero `↓`).
- **Root cause.** `put event.detail.message into #x` fails even in **English** at
  the bare-command level: the tokenizer fuses the dotted path into a base token +
  `.`-prefixed _selector_ tokens (`event` + `.detail` + `.message`, since `.foo`
  looks like a class selector), and `tryMatchPropertyAccessExpression` only knew the
  un-fused `base . identifier` operator form. Added a fused-dot branch that folds a
  chain of `.prop` selectors into the property path.
- **The lever was NOT he/sw `set`.** Investigation found announce's `set …` clause
  and the `set … on <target>` mis-split are both _tolerated_ inside the event-handler
  compound (like `toggle .active on #host`, which already passes in he despite the
  split). The only hard blocker was the property-path patient in the `put` clause —
  so the he/sw `set`-marker alignment originally scoped for this item was unnecessary
  and was dropped (no baseline impact, avoids the `weka`=put verb-collision risk).
- **Regression guard.** The fused-dot branch is gated to identifier/reference bases
  (`PROPERTY_ACCESS_BASES`) so a command verb + class selector (`toggle .active`,
  AR `بدل .active`, the proclitic `وبدل .active`) is never swallowed as a property
  path. Locked by `semantic/test/multilingual-property-path-patient.test.ts`.

### Tier 1 parser features — positional / of-possessive / member-access (+6)

- **6 instances, 0 regressions, avg 98.84% → 99.00%.** ar 95.5→97.4, tl 96.1→98.1.
  Confirmed by a full `browser-priority` baseline regen (exactly these 6 flip `↑`,
  zero `↓`). Cleared `last-in-collection`, `set-color-variable`, `input-clear` (all ar+tl).
- **Unlike the passthrough batch, these are genuine parser features** — each fails
  even in English at the bare-command level (English only "passed" them via the
  degenerate empty-body event-handler match). VSO langs (ar/tl) require a parseable
  body, so the features had to be built for real; English gains real parsing too.
- **Tag-less query selector tokenization** (`css-selector.ts`). `<.message/>` /
  `<#id/>` / `<[attr]/>` split into `<` + `.message` + `/>`; the tag name is now
  optional in the extractor regex (lookahead still rejects `a < b`). Shared across
  all 24 languages.
- **Positional query expression** (`pattern-matcher.ts` `tryMatchPositionalExpression`).
  Matches `<positional> <selector> [<marker> <source>]` (`last <.message/> in #chat`,
  AR `آخر <.message/> في #chat`, TL `huli <.message/> sa_loob #chat`) as a single
  expression. Triggered only when the role starts with a positional keyword
  (first/last/next/previous/random), so other roles are untouched. `scroll`'s
  destination role gained `expression` in its expected types. Also folds a trailing
  `.prop` member access (`previous <input/>.value`).
- **`of`-possessive `set`** (`pattern-matcher.ts` `tryMatchOfPossessiveExpression`).
  `set <prop> of <owner> to <value>` (`*--primary-color of #theme`, AR `… من …`,
  TL `… ng …`) → property-path. **Gated to roles that opt into `property-path`** —
  only `set`'s destination does — so the `of`/source marker can never shadow a real
  source role on other commands (`get data from #input` is unaffected). The leaked
  untranslated `the` is absorbed by the existing `skipNoiseWords`.
- **tl `scroll` keyword alignment.** Transformer emits English `scroll`; semantic tl
  primary is `iscroll`. Added `scroll` as a tl alternative (passthrough-alignment).
- Locked by `semantic/test/multilingual-tier1-features.test.ts` (16 cases across
  en/ar/tl + regression guards).

### Passthrough-alignment batch — or-events + fetch/transition keywords (+11)

- **11 instances, 0 regressions, avg 98.54% → 98.84%.** ar 94.8→95.5, tl 92.9→96.1,
  ko 96.1→99.4. Confirmed by a full `browser-priority` baseline regen (exactly these
  11 patterns flip `↑`, zero `↓`).
- **`multiple-events` (ar, tl) — transformer fix.** `on click or keypress[…] toggle .active`
  hoisted `or keypress` ahead of the command because `parseEventHandler` read `or` as the
  action verb. Fixed by folding `or`-conjoined events into the event role value
  (`EVENT_CONJUNCTIONS`) so `<event1> or <event2>` translates and reorders as one event
  clause that lands at the end (VSO). The semantic parser already accepted the event-or
  clause at the end — only the i18n transformer needed the fix.
- **`fetch` (ko ×3) — keyword alignment.** The i18n ko dict emits `가져오기` for `fetch`,
  but the semantic ko profile's primary is the loanword `패치` (chosen to avoid colliding
  with `get`=얻다). `가져오기` ("bring/fetch") doesn't collide with `얻다`, so it's now a
  semantic `fetch` alternative. Cleared `fetch-with-method`, `fetch-with-method-body`,
  `fetch-formdata`.
- **`transition` (ko ×2, tl ×4) — keyword alignment.** ko: profile primary is loanword
  `트랜지션`; transformer emits `전환` ("switch/transition") — added as a semantic
  alternative (toggle uses `토글`, no collision). tl: transformer emitted `baguhin`, which
  is the semantic tl verb for **morph**; the semantic tl `transition` verb is `lumipat`,
  so the i18n tl dict now emits `lumipat` (morph keeps `baguhin_hugis`). Cleared
  `transition-color`/`transition-transform` (both), plus tl `transition-opacity` and
  `fade-out-remove`.
- **Why this batch and not the rest.** These were the failures where either the i18n
  transformer leaked the wrong token (the recurring **passthrough-alignment** lever) or a
  pure structural reorder bug existed — verifiable as single keyword/transformer edits with
  zero parser-surface change. The remaining 19 each need genuine parser/profile structure
  work (VSO requires a _parseable_ body — unlike en/ko, which pass via degenerate empty-body
  matches — so `set`-of-possessive, positional `last … in`, member-access, `unless` blocks,
  custom-event SOV slots, event modifiers, and he/sw `set`-pattern gaps must each be built
  out). Locked by `grammar.test.ts` (or-events + tl transition) and
  `semantic/test/multilingual-roadmap-fixes.test.ts` (ko fetch + transition).

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

### Track 5 — Parse fidelity (parse rate ≠ faithful) — NEW, tracked

The non-behavior parse rate hit 100% (all 24 priority languages), but that metric
counts a **non-null** parse, not a **faithful** one. A complex pattern can parse
non-null while dropping most of the source's commands. The clearest example is
`focus-trap`: nominally green in 24 languages, but the `if/focus/halt` body
collapses to a bare `if` / stray `from` in most — faithfully parsed in ~1 (English).

A structural **fidelity** signal now makes this visible
(`packages/testing-framework/src/multilingual/fidelity.ts`): for each translation,
the fraction of the English reference parse's command actions that survive (recall,
word-order agnostic). Passes below 50% fidelity are **degenerate passes**.

**Current state (committed baseline carries `avgFidelity` / `degeneratePasses`):**
~**223 degenerate-pass instances across ~51 patterns** (was 232; −9 from the
post-event then-chain fix below). Triage (`packages/testing-framework/tools/fidelity-triage.ts`)
confirmed the signal is **real** — these are genuinely dropped commands, not a
metric artifact — and isolated **two roots**: (A) the i18n **transformer** scrambles
SOV `if <subj> is <pred>` conditions, interleaving the following command into the
condition so the translated _text_ is broken (`if-empty`/ja, `input-validation`/ko
→ 0.00); (B) the semantic **parser** drops the post-event `then`-chain in
command-first (VSO/SOV) event bodies (`fetch-loading-state`/ar → 0.40). Root B is
**fixed** (below); Root A is partially addressed (the `is empty` predicate
alignment, below) but the bulk remains. The remaining clusters:

> **Key triage insight (don't expect quick degenerate-count wins from Root A).**
> Root A is **not one fix** — conditional parsing breaks _differently per language_
> and across three layers (i18n transformer / semantic profile keywords / parser
> condition-boundary), e.g. **de** `wenn`→`if` collides with `when` (and tests assert
> `wenn`); **fr/pt/id/zh/pl** drop the `empty` adjective predicate (fixed); **ar/ja/ko**
> fully collapse (transformer scrambles SOV `if <subj> is <pred>` _and_ the parser
> doesn't parse SOV conditional bodies). Crucially, the **degenerate-pass count only
> moves on the fully-collapsed (<0.5) cases** (ar/ja/ko/de) — the "close" cases
> (fr/pt/… at 0.75) lift avgFidelity but stay above the 0.5 threshold. And part of
> the `if-*` signal is **metric-entangled**: even the English reference shallow-parses
> `is empty` as the `empty` _command_, so the predicate match is convention, not deep
> fidelity. Net: Root A is a sustained, multi-PR, per-language effort; the big
> degenerate-count wins require the hard SOV transformer + parser conditional work.

The remaining clusters:

| Cluster                     | Examples (langs)                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| control-flow blocks         | `if-empty` (16), `if-exists` (13), `unless-condition` (4)                                 |
| fetch lifecycle / state     | `fetch-loading-state` (14), `fetch-with-headers` (6), `fetch-json` (5), `fetch-basic` (4) |
| async / streaming           | `async-block` (13), `socket-basic` (9), `eventsource`/`worker`                            |
| validation / forms          | `input-validation` (14), `form-submit-prevent` (9)                                        |
| positional / possessive-dot | `first-in-parent` (5), `its-value-possessive-dot` (4)                                     |
| event modifiers / behaviors | `event-debounce`/`event-once`, `behavior-*` (degenerate in the langs where they parse)    |

**How it's tracked (ratchet, not crash-project).** The `--regression` CI gate fails
when a **faithful** baseline pass becomes a **degenerate** pass (tolerance 3, mirroring
the parse-rate ±2pt tolerance). This prevents backsliding without demanding the 232 be
fixed at once. Improvements (fail → degenerate-pass, or degenerate → faithful) never
fail the gate. After an _intentional_ fidelity change, regenerate the baseline.

**How to resolve (gradually, after triage).**

1. **Validate the signal first.** Fidelity is a heuristic (action-set recall). Before
   "fixing" a cluster, confirm low scores mean genuinely lost commands, not a metric
   artifact (a language that legitimately uses fewer command nodes, or an English
   reference that itself parses oddly). Spot-check a sample per cluster.
2. **Highest leverage = block-body transform.** Most degenerate clusters share one
   root: the i18n transformer shreds/mistranslates a block body (the same class of bug
   the trailing-event wrapper #283, caret-mask #285, and focus-trap from-source #286
   each chipped at). A general "faithful block-body transform" (mask block → reorder
   head → transform body as a unit → translate inner keywords) would lift many clusters
   at once. Validate with the fidelity signal + a full regen (watch for the usual
   stale-DB / flaky-harness traps — see Gotchas).
3. **Prioritize by language-count × value.** `if-empty`/16, `fetch-loading-state`/14,
   `input-validation`/14, `async-block`/13 are the biggest.

Definition of done for this track: degenerate-pass count trends toward 0 with avg
fidelity → 1.0, gated by the ratchet so it never grows.

### Track 2 — Bucket B behaviors (24)

`behavior-removable` (11), `behavior-sortable` (5), `behavior-draggable` (4),
`behavior-resizable` (4). These fail across many languages **and** are
pre-existing unimplemented behaviors (CI marks them `continue-on-error`).
This is a **runtime feature track** (implement the behavior), not a parsing/i18n
fix. Largest single pattern is `behavior-removable` (fails in 11 langs incl.
high-rate de/es/fr/it/pt) — worth checking whether it's a _parse_ issue (the
`install … removable` syntax) separable from the unimplemented-runtime issue.

### Track 3 — Deep per-language grammar

> **Historical analysis below; the live remainder is the 11 in "Current state".**
> The Tier 1 batch cleared `last-in-collection`, `set-color-variable`, and
> `input-clear` (ar+tl); the passthrough batch cleared `multiple-events`,
> `fetch`, and `transition`. The notes here are kept as a record of approaches.

- **`set-*` family (ar+tl): DONE.** Phase 1 fixed the `@attr` / `*style`
  token-splitting in the shared `CssSelectorExtractor`; Tier 1 then cleared the two
  stragglers — `set-color-variable` (the `of`-possessive `set` matcher, with the
  leaked `the` absorbed by `skipNoiseWords`) and `input-clear` (member-access on a
  queried element). See Shipped → Tier 1.
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
