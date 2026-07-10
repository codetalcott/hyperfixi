# Handoff: a colon-qualified custom event name is split by every non-en tokenizer

> **RESOLVED 2026-07-10** (branch `fix/colon-qualified-event-names`). The tokenizer
> split was real but was only one of THREE stacked causes behind the ten flagged rows:
>
> 1. **Tokenizer colon-split** (this doc's diagnosis) — fixed by a colon-qualifier
>    merge post-pass in framework `BaseTokenizer.tokenizeWithExtractors`
>    (`mergeColonQualifiedNames`), inherited by all 24 tokenizers (Arabic's
>    `tokenizeWithExtractors` override routes through it explicitly). CSS
>    pseudo-classes (`#x:hover`, `.a:not(.b)`) — split even in en — also fixed, in
>    `CssSelectorExtractor` (user-approved scope extension).
> 2. **hi/qu trigger marker mismatch** — the corpus marks trigger's event
>    accusatively (`को`/`ta`) but the profiles' event marker is the on-handler one
>    (`पर`/locative `pi`), so the fused line STILL fell to the on-handler reading (hi)
>    or failed (qu). Fixed via trigger-schema `markerVariants` (#588 machinery).
> 3. **ms phantom possessive** — `… ke ia` + next line `ukur y` read `ia ukur` as
>    `it.measure`, swallowing the measure. Fixed by a COMMAND_ACTION_KEYWORDS guard on
>    the possessive property head in `tryMatchPossessiveExpression`.
>
> Result: hi/ja/ko/ms `avgMultisetRecall` 0.99934 → **1.0**; qu 0.99884 → 0.99950.
> The en reference and every per-pattern baseline entry stayed byte-identical.
> Remaining: qu `behavior-resizable`'s two style `set`s (i18n reorder places `tukuy`
> before the verb-final tail — NOT a tokenizer issue), the bn standalone trigger gap,
> and the proposed R3 role-value audit — all tracked in
> `docs-internal/MULTILINGUAL_NEXT_STEPS.md` ("Colon-event-names follow-ups").

## Context

Surfaced by the **multiset-recall ratchet** (R0-recall-multiset), added alongside the
top-level command-sequence fix — the first signal able to see a *dropped duplicate*
command. It flagged ten rows that every prior signal scored a perfect 1.0:

| row                   | languages     | multiset recall |
| --------------------- | ------------- | --------------- |
| `behavior-draggable`  | hi ja ko ms qu | 0.9375         |
| `behavior-resizable`  | hi ja ko ms   | 0.9615          |
| `behavior-resizable`  | qu            | 0.8846          |

These are **pre-existing** — verified byte-identical before and after the bind-possessive
and top-level command-sequence fixes, across all 24 languages. They are **not** a
duplicate-command bug, despite being found by a duplicate-counting signal. They are one
root cause with word-order-dependent symptoms.

---

## Root cause

`:name` is hyperscript's **local-variable sigil**. A custom event name such as
`draggable:start` therefore looks like `draggable` followed by the local variable
`:start`. Only the **English** tokenizer keeps it whole:

```text
en   trigger[keyword]  draggable:start[identifier]              ✓ whole
ms   cetuskan[keyword] draggable[identifier]  :start[identifier]   ✗ split
ja   draggable[identifier] :start[identifier] を[particle] 引き金[keyword]  ✗ split
ko   draggable[identifier] :start[identifier] 를[particle] 트리거[keyword]  ✗ split
qu   draggable[identifier] :start[identifier] ta[particle] kichay[keyword]  ✗ split
```

Reproduce:

```bash
node --input-type=module -e "
const { tokenize } = await import('./packages/semantic/dist/index.js');
for (const [l, s] of [['en','trigger draggable:start'],['ms','cetuskan draggable:start']])
  console.log(l, tokenize(s, l).tokens.map(t => t.value + '[' + t.kind + ']').join('  '));
"
```

## Symptoms diverge by word order

`behavior-draggable`'s handler body is `trigger draggable:start` … `measure x` …
`trigger draggable:move` … `trigger draggable:end`. English captures three triggers with
the right names. The others do not:

```text
en  triggers: ["draggable:start", "draggable:move", "draggable:end"]
ms  triggers: ["draggable",       "draggable",      "draggable"]      ← names TRUNCATED
ja  triggers: ["x",               "draggable:move"]                   ← one LOST, one WRONG
ko  triggers: ["x",               "draggable:move"]
qu  triggers: ["x",               "draggable:move"]
hi  triggers: ["x",               "draggable:move"]
```

- **ms (verb-first)**: `trigger` captures `draggable` and the orphaned `:start` dangles
  into the next clause, where it swallows `ukur x` (`measure x`). Hence: three triggers
  (right count, **wrong values**) and one **missing `measure`**.
- **hi/ja/ko/qu (verb-final)**: the object-marked role (`を`/`를`/`को`/`ta`) captures
  `:start` rather than the compound name; one `trigger` is lost outright and the *next*
  trigger mis-captures `x` (the `measure` operand). Hence: one **missing `trigger`**.
- **qu `behavior-resizable`** additionally loses two `set`s — likely the same cascade,
  worth confirming separately rather than assuming.

Note `draggable:move` survives everywhere. Only the triggers adjacent to a following
command are corrupted, which is consistent with an orphaned `:start` / `:end` token
being re-consumed by the neighbouring clause.

## Why no existing signal saw it

The ms case is the sharp one: the trigger **count** is right and the role signature is
right (`trigger.event:literal` either way). Only the **value** is wrong —
`draggable` instead of `draggable:start`. Every ratchet signal compares actions and role
*types*, never role *values* (values are legitimately translated, so they cannot be
compared cross-language directly). So:

- R0-recall / R0-precision / R1: blind to the ms value corruption entirely.
- R0-recall-multiset: sees it only via the **side-effect** (the swallowed `measure`).
- R2 (execution): `behavior-*` rows are not in `EXECUTION_SUBSET`.

**This is a value bug that the harness structurally cannot see.** The dropped commands
are the tip; a corpus-wide audit of role *values* against the en reference (comparing
only the language-invariant ones — selectors, `:`/`$` refs, numbers, custom event names)
would be a genuinely new signal (R3?) and is probably the higher-leverage follow-up.

---

## Suggested approach

The fix belongs in the **tokenizers**, not the parser. A colon that is *immediately
preceded by an identifier character* is a qualifier, not a variable sigil:
`draggable:start` is one token; a leading `:start` (after whitespace or at input start)
is a local-variable reference.

- Look for the English rule that already does this and lift it into `BaseTokenizer`
  (`packages/semantic/src/tokenizers/base.ts`) so all 24 inherit it, rather than
  patching 23 tokenizers.
- Beware the two other `:` uses: `on click(x): …`? (none), and the CSS pseudo-class in
  selectors (`#x:hover`), which tokenizes inside a selector token and must stay whole.
- `packages/semantic/src/tokenizers/english.ts` is the reference behaviour.

## Definition of done

- `tokenize('trigger draggable:start', lang).tokens` yields one identifier
  `draggable:start` in **all 24 languages**; a bare `:start` still tokenizes as a
  local-variable reference.
- `behavior-draggable` / `behavior-resizable` capture three triggers with the **correct
  names** in all 24 languages, and lose no `measure` / `set`.
- `avgMultisetRecall` returns to 1.000 for hi/ja/ko/ms/qu (a rise never fails the
  ratchet; regenerate the baseline and attribute it).
- A test asserting on the trigger **role values**, not just the action set — that is the
  only thing that would have caught this.

## Traps

- **`--diagnose-coverage` will not show this.** It instruments only the Stage-2
  plain-command path; these drops happen inside behavior/handler bodies. It reads 0
  firings today and will still read 0 while the bug is live.
- **The action-set assertion is not enough.** ms has the right action counts for
  `trigger`; assert the captured event names.
- Standard multilingual traps still apply — see CLAUDE.md, "Running the multilingual
  `--regression` gate locally": real exit codes (never pipe `--regression` to `tail`, it
  masks the gate's stale-dist *refusal* as a pass), `git stash` bumps mtimes and trips
  the src-newer-than-dist guard, `prettier --write` the regenerated baseline, and don't
  commit `patterns.db`.
