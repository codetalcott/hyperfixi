# Scope: foreign→English validity — the expression-internal translation gap

**Status:** Phases 1a, 1b, 3, **2**, **4**, **5 (the context globals
`document`/`window`/`detail`)**, and **6 (the `as` connective zh/hi + the `beep!` possessive
glue+leak)** shipped (foreign validity 90.7 % → **97.4 %**; see Phasing below). **The
vocabulary/expression work is DONE** — the 80 remaining pairs are per-row structural or
deliberately-blocked ambiguous exclusions, not lexicon-shaped. Current state + the remaining
families: `docs-internal/HANDOFF_foreign-validity-burndown.md`.
Companion to the foreign→English canonical-validity
gate (`packages/testing-framework/src/multilingual/foreign-canonical-validity.ts`,
baseline `baselines/foreign-canonical-validity.json`). The gate makes the number below
visible and ratcheted; this doc scopes the burndown so it can be prioritized against
the learn/book roadmap (per the business plan, engine hygiene is "when it's the focus,"
not drop-everything).

## The number

Foreign→English render validity across the 23 non-English priority languages:
**90.7 % (2,775 / 3,059)** authored translations render English the real
`hyperscript.org` parser accepts. The other **~9.3 % (284 (pattern, language) pairs
across 23 patterns)** render English it rejects. For a language toolchain this is the
gap between "trustworthy" and "mostly works" — an LLM agent can't tell which 9 % is
wrong, so the whole surface reads as unreliable.

## One root cause, not twenty

A triage of all 23 failing patterns (one representative language each) found the
failures are **not** a spread of independent renderer bugs — they are overwhelmingly
**one root cause: expression-internal vocabulary is never translated to English.**
The command STRUCTURE and role MARKERS translate fine (the fidelity ratchet scores
~1.0); but the *insides* of expressions, conditions, and possessives are captured as
opaque foreign text and emitted verbatim.

Representative renders (foreign → our "English"), with the leaked foreign word in bold:

| Pattern | Rendered "English" | Untranslated |
| --- | --- | --- |
| `two-way-binding` | `set … to "Hello, " + `**`لي قيمة`** | `my value` |
| `computed-value` | `… to ( the `**`قيمة من`**` #price `**`كـ`**` Number ) * …` | `value of … as` |
| `if-empty` | `if `**`me قيمة`**` is empty …` (also `me`, not `my`) | `value` |
| `input-mirror` | `put `**`my قيمة`**` into #preview` (parses valid, semantically wrong) | `value` |
| `focus-trap` | `if target `**`coincide`**` last <button/> `**`en`**` .modal …` | `matches`, `in` |
| `if-exists` | `if #modal `**`موجود`**` show #modal …` | `exists` |
| `modal-close-backdrop` | `if target `**`يطابق`**` .modal-backdrop hide …` | `matches` |
| `behavior-removable` | `… if it `**`it`**` "cancel" …` (copula `is`→`it`) | `is` (هو is ambiguous) |
| `last-in-collection` | `scroll to last <.message/> `**`destination`**` #chat` | `in` (see below) |

The Arabic/CJK cases surface as a hard `Unknown token: <char>` throw (the leaked word
is non-Latin); the Latin-script cases (`en`, `coincide`, `mi valor`) surface as a
parse error or a silently-wrong identifier.

### Why it happens (mechanics)

Two related mechanisms in `packages/semantic/src/parser/`:

1. **Expression values are captured as raw foreign text.** A value/condition role
   (`"Hello, " + my value`, `my value is empty`, `value of #price as Number`) is
   captured with `joinTokenText` (`semantic-parser.ts`), which joins the surface
   tokens. Keyword tokens contribute their `normalized` form, but ordinary
   identifiers/operators inside the expression pass through verbatim — and the
   normalized form of a **role marker** is the **role name**, not the English word.
   So `en` (Spanish "in") → `destination` (its role concept), not `in`; that is the
   `last-in-collection` `scroll to … destination #chat` bug — a mis-normalization at
   parse, not a render fallback.

2. **Expression-internal keywords have no foreign→English map.** `value`, `matches`,
   `exists`, `is empty`, `of`, `as`, the copula `is` — these are LokaScript vocabulary
   with per-language surface forms (`valor`, `coincide`, `موجود`, `من`, `كـ`), but the
   render path has no lexicon to map the parsed foreign surface back to the English
   keyword. Possessive property names (`my value` → `mi valor`) are the most common:
   the possessive *marker* translates (`mi`→`my`) but the *property* does not
   (`valor`→`value` is never applied).

The through-line: **LokaScript translates at the command/role granularity, but an
expression is a leaf it treats as opaque.** Closing the gap means teaching the
expression layer the same bidirectional vocabulary the command layer already has.

## What has to translate

From the triage, the missing coverage is a bounded vocabulary, not arbitrary text:

- **Possessive property names** — `value`, `innerText`, `innerHTML`, `checked`, … (the
  single biggest family: `two-way-binding`, `if-empty`, `input-mirror`, `input-validation`,
  `computed-value`).
- **Comparison / existence operators** — `matches`, `is`, `is empty`, `exists`, `is not`,
  `contains` (`focus-trap`, `if-exists`, `modal-close-backdrop`, the `is`→`it` copula).
- **Expression connectives** — `of`, `in`, `as` (`computed-value`, `last-in-collection`).
- **Value/positional keywords inside expressions** — `value of X`, `last/first … in …`.

All of these already exist as per-language keywords for *command* parsing; they are
simply not consulted when rendering an expression back to English.

## Approach options

1. **Translate expression internals at parse time (capture → normalize to English).**
   When capturing an expression/condition value, tokenize it and map each keyword/
   operator/property token through the existing per-language keyword tables to its
   English form, keeping code-shaped tokens (selectors, `$vars`, string/number
   literals, member paths) verbatim. Pro: the stored value is already English, so
   render is unchanged and the AST-execution path benefits too. Con: touches the hot
   expression-capture path; must be careful not to translate inside string literals or
   code identifiers.

2. **Bidirectional lexicon applied at render.** Keep the raw foreign expression in the
   value, and translate keyword tokens to English only in the renderer. Pro: isolated
   to the render path (parse untouched → fidelity ratchet can't move). Con: the
   AST-execution path still holds foreign expressions; duplicates tokenization at
   render.

Both need the same missing asset: **a single concept→language→surface lexicon** that
the expression layer can query bidirectionally. This is exactly the "single lexicon
(concept→lang→translation)" aspiration already noted for the framework↔semantic vocab
tooling — this effort is its most concrete, highest-value driver. Building it once
serves parsing, rendering, and the vocab-authoring backlog together.

**Recommendation:** option 1 (translate at parse), because it fixes both production
paths (the transpiler's foreign→English AND the semantic bundle's foreign→AST→execute)
with one change, and keeps the renderer simple. Gate it behind the lexicon so the
same table drives command and expression translation.

## Phasing (proposed)

1. **Lexicon + possessive properties.** Build/extend the bidirectional keyword lexicon;
   apply it to possessive property names first (`value`, `innerText`, …). Clears the
   largest family (~6 patterns × ~20 langs). Re-run the foreign gate; prune the cleared
   pairs from the allowlist.

   **1a — property-path possessives — SHIPPED.** The reverse property-name lexicon
   lives in `packages/semantic/src/parser/utils/expression-lexicon.ts` (surfaces copied
   from the i18n dicts by `packages/i18n/scripts/extract-property-lexicon.ts`, since
   semantic is upstream of i18n). `PatternMatcher.toEnglishProperty` normalizes the
   property HEAD in all four possessive matchers (of-, pre-nominal, post-nominal,
   selector-possessive), so `my valor`/`私の 値`/`#picker's قيمة` capture property
   `value`. Cleared **24 pairs** (`input-mirror` + `bind-explicit-property`, 12 langs
   each); foreign validity 90.7 % → **91.5 %** (2799/3059). Fidelity ratchet unmoved
   (property names aren't scored by R0–R3), so no multilingual-priority baseline regen.
   Note: `value` is the only property the i18n dicts translate today, so `innerHTML`/
   `textContent`/`checked` pass through as identity; the lexicon also carries
   `checked`/`length`/`disabled`/`hidden` for languages that translate them, ready for
   future corpus rows.

   **1b — property names inside RAW expressions — SHIPPED** (with Phase 3, below).
   `two-way-binding` (`"Hello, " + mi valor`), `input-validation` / `if-empty`
   (`mi valor is empty`), `computed-value` (`valor de #price como Number`) hold the
   property inside a captured raw-expression string, not a property-path node — so 1a
   doesn't reach them.

   Two seams fed those captures, not one: the conditional's `joinTokenText`
   (`semantic-parser.ts`, keyword → `normalized`, else verbatim) and the operator-run
   join (`pattern-matcher.ts`, **fully** verbatim, and missing the `.`-glue rule).
   Both now route through the shared `joinExpressionTokens` in
   `parser/utils/expression-lexicon.ts`.

   The possessive-pronoun fix reuses what already existed: **English's own profile
   declares `specialForms: { me:'my', it:'its', you:'your' }`**, so
   `getEnglishPossessiveAdjective` (beside `getPossessiveReference`, the inverse
   direction) reads it rather than hard-coding a table. References without an
   adjective (`result`/`event`/`target`/`body`) fall through to `'s`.

   **Translation is anchored, never blanket** — this is the load-bearing safety
   property, since a raw expression has none of the slot guarantees 1a relied on:
   a possessive is only read as one when a property head actually follows it. That
   requirement is not cosmetic — ms `ia` and qu `chay` are BOTH the possessive
   (`its`) and the bare reference (`it`), so translating on sight rewrote `if it`
   into the invalid `if its` and broke `fetch-do-not-throw` in both languages
   (caught by the gate's ADDED count, now 0).

2. **Operators + copula — SHIPPED (2026-07-16).** Worth **70 pairs**, not the ~130
   estimated here. Three pure-DATA PRs, no new mechanism: `matches` → 13 profiles (15
   pairs), `exists` → 13 profiles (13), `is` → 10 profiles (42, plus shrinking
   `CONDITION_COPULAS_SURFACE` 12 → 3 dead entries).

   The premise of this doc's "Approach options" was wrong in a useful way. Neither
   option was needed: `surfaceOf` (`expression-lexicon.ts`) already emits a token's
   normalized English form **iff it lexed as a keyword**, and `is` was already declared
   in `profile.keywords` for es/de/sw — precisely the languages that passed. So the gap
   was **missing profile data**, not a missing lexicon. A slot parameter would not have
   worked regardless: `es` is Spanish `is` but German `it`, a *language* axis, not a
   slot axis.

   Exclusions, each ambiguous with another sense (all cost real pairs): ar هو=`it`
   (also structurally impossible — `references` registers after `keywords` and
   overwrites), hi है=`has/have`, th เป็น=`as`; bn আছে=`has`, tl `may`/tr `var`=`has/have`.
3. **Connectives + positional-in-expression — SHIPPED** (with 1b). `of`/`as` and
   `last/first … in …`.

   - `of` is emitted **structurally** by an of-possessive anchor
     (`<property> <of-marker> <selector>` → `value of #price`), never by surface
     lookup: es spells `of` and `from` the same `de`, so a free-token translation
     would corrupt `from` clauses.
   - `as` comes from a generated `CONNECTIVE_LEXICON` with an **ambiguity guard**
     (a surface the language reuses for any other sense, in any dict bucket, is
     dropped) — th `เป็น` is both `as` and the copula `is`, and carrying it would
     have rewritten every Thai `is` condition.
   - The locative needed both a role-concept map and a generated `LOCATIVE_SURFACES`
     set, because the markers fail three different ways: es `en` normalizes to the
     ROLE NAME (`destination`), zh `在`/tr `içinde`/id `dalam` are not role markers at
     all and leaked verbatim, and pt `dentro` normalizes to English `into` (which the
     canonical parser rejects in this slot). No ambiguity guard is needed there — the
     slot fixes the sense.
4. **Residual language-specific parse gaps** (not vocab): `swap-content` (ar `بـ#b`
   fusion), the sparse rows. Small, per-language.
5. **Leave deferred:** `pick-text-range` (named R1 deferral).

Each phase is gate-guarded (foreign-canonical-validity), fidelity-ratchet-guarded, and
en-gate-guarded, exactly like the en-render burndown (#699–#704). Target: 90.7 % →
high-90s, residual = named deferrals.

## Where the burndown stands (after 1a + 1b + 3 + 2 + 4 + 5 + 6)

**97.4 % (2979/3059); 80 pairs across 19 patterns.** Phase 2 cleared 70; Phase 4 cleared
a further 30 (`no` 11, `references` drift 3, condition locative 16); Phase 5 cleared 7
(the `document` context global) plus 51 gate-invisible silent corrections; Phase 6 cleared 7
(the `as` connective zh/hi 2, the `beep!` possessive glue+leak 5).

**Both the vocabulary work and the expression-seam work are now finished.** No remaining
pair is lexicon-shaped, and the shared expression seam
(`packages/semantic/src/parser/utils/expression-lexicon.ts`) has no known call-site gap:
Phase 4 extracted the positional-run recognizer into it, and Phase 6 routed the SOV
fallback's value builder through it too (`tokensToSemanticValue`), so the last untranslated
leaf path is closed. What is left has **no shared root cause** — see
`docs-internal/HANDOFF_foreign-validity-burndown.md`:

| Family | pairs | kind |
| --- | --- | --- |
| `pick-text-range` | 23 | en-render; a whole wrong command schema (spike verdict below); ~3 arcs |
| structural / per-language parse damage | 23 | per-row: swap-content ar fusion, focus-trap ar/tl, id possessive tails, sparse rows |
| hi `है` + th `เป็น` | 10 | blocked — the copula slice's named ambiguous exclusions |
| `window` (uk/ar/th) | 3 | structural, NOT data — role misattachment / `من` leak / no-dict mangling |
| ja `空` (=empty) | 2 | phantom-blocked (`empty` is an ActionType AND a schema) |
| `computed-value` th | 1 | blocked — th `เป็น` is both `as` and copula `is` (id is separate structural) |
| singles | 11 | bn `এ`/`আছে`/`এর`/`অথবা`, hi `नहीं`/`बदলने`, ko `정`, ar `من`, zh `执行` |

**Phase 6 (2026-07-17)** cleared the `as` connective (zh/hi) and the `beep!` glue+leak, and —
consistent with this arc's pattern — corrected both of the handoff's fix-site claims: hi
`के_रूप_में` needed a `HindiParticleExtractor` yield-guard (the possessive particle `के` was
peeled before the EXTRAS entry could match), and `beep!` needed a source-adjacent `!`-glue in
the join (the canonical parser rejects the spaced `beep !`), not just the SOV fall-through
reroute. `joinExpressionTokens`'s possessive anchor was innocent throughout.

Full triage, with the reproduce recipe: `docs-internal/HANDOFF_foreign-validity-burndown.md`
§ "What is left". It was produced by rendering all pairs and clustering by the canonical
parser's actual complaint — **not** by inspection, which is how the previous estimate
(`~71 structural, no shared root cause`) got it wrong.

**Phase 5 was `document`/`window`/`detail`, and the handoff's own diagnosis of it was
wrong** (kept as a cautionary example in the handoff § 1): the fix was NOT `matchRoleToken`
"role capture" — that comparison confounded *registration* with *role*. The real cause was
the seven-name `DEFAULT_REFERENCES` Set (`packages/intent/src/ir/references.ts`); widening it
+ the `ReferenceValue` union + 20 profiles was pure data, zero logic change. `window`/`detail`
cleared 0 validity pairs (registered for drift reconciliation only). The real prize was the
51 silent corrections no gate sees (es `from documento` → `from document`), guarded by
`packages/semantic/test/context-globals-references.test.ts`.

The one plausibly-mechanical item inside the structural family: `form-submit-prevent` ar
needs the **registration ORDER** fixed (`profile.references` registers AFTER `keywords`,
so an ar `is` entry is silently overwritten) — not vocabulary.

**Shipped in Phase 4, so do not re-plan them:**

| Was | Now |
| --- | --- |
| `no` → `behavior-draggable` (20; "~13 realistic", ar/id/qu "dead on arrival") | DONE, 11 cleared. All three "DOA" languages worked (whole-token EXTRAS / multi-word keyword). bn was never lexical. |
| condition locative → `focus-trap` (19; "the ONLY code change left") | DONE, 16 cleared. Correct diagnosis; it omitted that anchor ORDER is load-bearing. |
| `references` drift ("needs a type change") | DONE, 3 cleared. **No type change** — the lookup was already case-insensitive and `*_EXTRAS` already supports alternates. Only 3 of the 16 "drifted" entries actually leaked. |

**Corrections to the record this doc previously got wrong:**

- **"~130 pairs, overwhelmingly one family"** — the copula cluster was 88 pairs (45 %),
  and Phase 2 in total was worth 70. 89 of the original 194 were structural.
- **"Context globals have zero reverse coverage"** — false, and the two corrections that
  followed it were ALSO each wrong (this line has now been wrong three times; treat it as the
  arc's canonical example of restating a figure without a probe). `body` is **24/24** via
  `profile.references`. The "`window` is 1; document worth ~1 pair, the LAST slice" claim was
  false. Its replacement — "document leaks in 14, window in 3, **17 together, the biggest
  actionable family, pure `references` data**" — was ALSO false, and is what Phase 5 measured
  and shipped against: the real numbers are **`document` = 7 validity pairs, `window` = 0,
  `detail` = 0** (Phase 5, 2026-07-17). The "17" counted rows where `document` merely
  *appears*; most had unrelated blockers. And it was NOT "pure `references` data" in the sense
  the line meant — the profile surface alone does nothing; the load-bearing half was widening
  `DEFAULT_REFERENCES` (`packages/intent/src/ir/references.ts`). `window`/`detail` cleared
  nothing and were registered for drift reconciliation only. The real win was 51 gate-invisible
  silent corrections. See the handoff § 1.
- **`pick-text-range` is not "range-role modeling"** — see the spike verdict in the
  handoff. The schema models a different command entirely, the vocabulary
  (`characters`/`items`/`start`/`end`/…) exists in **no** dictionary, and the corpus rows
  are themselves broken. The en fix clears **1** pair, not 24.
- **"The `references` lookup is case-sensitive, so this needs a type change"** — false, on
  both halves (Phase 4). `lookupKeyword`/`isKeyword` both `.toLowerCase()`
  (`packages/framework/src/core/tokenization/base-tokenizer.ts`; the cited case-sensitive
  lines are a comment in `tryMultiWordKeyword`, which only handles space-containing
  keywords). And `*_EXTRAS` already supports alternates, overriding profile entries. The
  de sub-family (`Ziel`/`ziel`) was never broken at all.
- **"de/fr/pt `if-exists` clear while still leaking `körper`/`ça`/`isso`"** — does not
  reproduce (Phase 4). All three render byte-identically to en. The cautionary example was
  fictional; the *lesson* it illustrated (a leaked operand can render as a syntactically
  valid identifier, so only R2 sees it) is real and was demonstrated instead by
  `modal-close-backdrop` ar/ja.
- **"ar/id/qu are dead on arrival for `no`"** — false for all three (Phase 4). Underscore
  compounds clear via a whole-token EXTRAS entry (longest-first beats the `_` split) and
  spaced phrases via the multi-word keyword walk. Both mechanisms already had in-repo
  precedent. **"The tokenizer splits it" is not a reason to give up.**

Known, accepted residuals in shipped code:

- **hi `के_रूप_में` never matches** — the tokenizer splits underscore-joined dictionary
  surfaces. Same class as id `tidak_ada`, qu `mana_kanchu`, tl `hindi_pinagana`. The
  dead entries are harmless (an unlisted surface passes through), but the class is real
  and also affects Phase 1a's `tl` property entries.
- **th `เป็น` is deliberately omitted** by the connective ambiguity guard (it is also
  the copula `is`). Correct conservatism, not an oversight.

## Corrected Phase 2 taxonomy (triage, 2026-07-16)

The phasing above left **49 pairs unassigned to any phase**. They are all Phase 2, and
they name three families the original list omits:

- `form-submit-prevent` (13) — pure copula `is` (`if result is false`). Its pass list is
  *exactly* the 9 languages carrying a `normalized:'is'` registration, plus `he` (whose
  dict has no `is` entry, so it authors literal English). `CONDITION_COPULAS_SURFACE`
  (`semantic-parser.ts`) already enumerates 12 of the 13 failing surfaces — a ready-made
  map, currently used only to suppress a condition split.
- `behavior-draggable` (20) — the operator **`no`** (`if no dragHandle`), which the
  Phase 2 list above omits. 19 dicts define `no:`; the 3 passers (he/th/vi) don't. +bn
  (a separate transformer scramble, Phase 4).
- `behavior-sortable` (16) — copula (13) + id underscore-split + ko/zh `document`.

**Three families to add to Phase 2:**

1. **`no`** — an existence/negation operator, sibling of `exists`/`is empty`.
2. **Context globals** (`document`, `window`, `body`) — **zero** reverse coverage today:
   no `normalized:'document'` registration exists anywhere in `packages/semantic`. Benign
   on Latin scripts (es leaks `documento` and still passes) but fatal on CJK/Arabic
   (`Unknown token: 文`).
3. **Underscore-joined dict surfaces** — see the hi note above.

## Why there were no "quick wins"

The initial hypothesis was that a subset of the 23 were pure renderer bugs (role-marker
leaks) skimmable ahead of the deep work. Investigation disproved it: `last-in-collection`
is an expression mis-normalization (parse), `swap-content` is a language-specific fusion
(parse) — both the deep problem, not render fallbacks. There is no cheap tier to peel
off first; the gap is one coherent effort. That is itself the useful scoping result:
**don't budget this as a handful of PRs — budget it as the lexicon + a 4-phase burndown.**
