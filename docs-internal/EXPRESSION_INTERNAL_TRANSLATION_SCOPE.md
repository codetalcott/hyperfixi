# Scope: foreign→English validity — the expression-internal translation gap

**Status:** scoping / not started. Companion to the foreign→English canonical-validity
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
2. **Operators + copula.** `matches`/`is`/`exists`/`is empty`, and the `is`→`it`
   ambiguity (needs per-language disambiguation, e.g. Arabic `هو`). Clears the
   conditional families.
3. **Connectives + positional-in-expression.** `of`/`in`/`as`, `last/first … in …`.
   Clears `computed-value`, `last-in-collection`.
4. **Residual language-specific parse gaps** (not vocab): `swap-content` (ar `بـ#b`
   fusion), the sparse rows. Small, per-language.
5. **Leave deferred:** `pick-text-range` (named R1 deferral).

Each phase is gate-guarded (foreign-canonical-validity), fidelity-ratchet-guarded, and
en-gate-guarded, exactly like the en-render burndown (#699–#704). Target: 90.7 % →
high-90s, residual = named deferrals.

## Why there were no "quick wins"

The initial hypothesis was that a subset of the 23 were pure renderer bugs (role-marker
leaks) skimmable ahead of the deep work. Investigation disproved it: `last-in-collection`
is an expression mis-normalization (parse), `swap-content` is a language-specific fusion
(parse) — both the deep problem, not render fallbacks. There is no cheap tier to peel
off first; the gap is one coherent effort. That is itself the useful scoping result:
**don't budget this as a handful of PRs — budget it as the lexicon + a 4-phase burndown.**
