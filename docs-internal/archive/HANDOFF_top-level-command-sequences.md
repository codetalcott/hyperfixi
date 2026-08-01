# Handoff: a top-level command SEQUENCE is truncated to its first command

> **RESOLVED 2026-07-10** — executed the same day this doc was written, in its
> prescribed order, as two PRs (the doc itself was never committed at the time;
> it lands now as historical record):
>
> | bug | fix | outcome |
> | --- | --- | ------- |
> | **B** — possessive source | `5bb46a82` (#630) | `bindSchema.source.expectedTypes` + `property-path`; `isBareWordPropertyHead` bare-identifier head in `tryMatchOfPossessiveExpression`; ar genitive `لـ` in `OF_POSSESSIVE_MARKERS`. Firings 38→24 (exactly the 14). avgRoleFidelity +0.006536 in exactly ar/de/es/fr/id/pt/sw, byte-identical elsewhere. Tests `bind-possessive-source.test.ts` (28/42 fail without fix). |
> | **A** — top-level sequence | `129a9b1a` (#632) | Stage-2 remainder guard → `tryTopLevelCommandSequence` → `parseBodyWithClauses`, additive (>1 command or fall through), after the SOV trailing-event guard, excluding `BLOCK_BODY_ACTIONS`. Firings 24→0. Phantom fidelity proven: baseline regen moved every prior signal by exactly zero → added the **avgMultisetRecall** ratchet (signal 5), which immediately surfaced the colon-event-names family (→ #633, `HANDOFF_colon-event-names.md`). Tests `top-level-command-sequence.test.ts` incl. all-24 bind-two-way table (29 assertions fail without fix). |
>
> **Re-verified 2026-07-11** on post-#638 `main` (`0a4c043f`), fresh ordered
> build + populate: `--diagnose-coverage` **0 / 3696** in all 24 languages;
> `--regression` exit 0 on all eight ratchets; both arc test files 76/76;
> en juxtaposed + es then-chained `bind…bind` → `compound [bind, bind]`;
> es `bind $color a valor de #picker` → `source:property-path` with owner
> `#picker` intact.
>
> **Deferred** (recorded in `MULTILINGUAL_NEXT_STEPS.md` § input coverage):
> extending `unconsumed-input` beyond the Stage-2 plain-command path
> (event-handler/compound/SOV/VSO stages) — 0 firings is a visible floor, not
> a total. Still open, unchanged: Part 2b (`fetch … with {}` ×23) and the
> unconsumed-input → confidence-penalty scoring change (its precondition is
> now met).

## Context

Direct follow-on to #628/#629, which fixed the five body-dropping feature blocks
(`live`/`eventsource`/`socket`/`worker`/`intercept`) and drove the `unconsumed-input`
diagnostic from **158 firings (4.3%) → 38 (1.0%)** of the 3696-row corpus.

All 38 remaining firings are `bind`. **`bind` is not the bug.** It is the only corpus row
shaped like a top-level command sequence, so it is the only thing the diagnostic can see.

Two independent defects hide behind those 38. The arithmetic is exact:

|                                      | rows                                              | languages | = firings |
| ------------------------------------ | ------------------------------------------------- | --------- | --------- |
| **A** — top-level sequence truncated | `bind-two-way`                                    | all 24    | 24        |
| **B** — possessive source dropped    | `bind-explicit-property`, `bind-non-form-display` | 7         | 14        |
|                                      |                                                   |           | **38**    |

---

## Bug A — `parseInternal` has no top-level program layer for plain commands

A command sequence parses correctly **inside** any block, and is truncated to its first
command at **top level**. Verified against merged `main`:

```text
                                          inside a handler        top level
add .a to #x then add .b to #y            [on, add, add]  ✓       [add]       ✗
bind $n to #a bind $n to #b               [on, bind, bind] ✓      [bind]      ✗
```

Everything that routes through `parseBodyWithClauses` (event-handler bodies, `def`, `live`,
behavior handlers) already splits both **`then`-chained** and **juxtaposed** sequences
correctly. Nothing routes a *top-level* sequence there.

### Why the existing stages miss it

- **Stage 2** (`semantic-parser.ts`, the plain-command stage) matches the first command and
  `return`s. Everything after it is dropped, and the `unconsumed-input` diagnostic is the
  only trace.
- **Stage 4** (`tryCompoundCommandParsing`) is only reached when Stage 2 finds *no* match.
  Stage 2 matched, so Stage 4 never runs.
- **Stage 0.5** (`tryParseProgram`, `block-parser.ts`) exists for exactly this shape, but
  bails unless **every** segment parses as an event-handler
  (`if (!parsed || parsed.kind !== 'event-handler') return null;`). A program of plain
  commands falls straight through.

### The right lever

**Not** `tryCompoundCommandParsing` — it requires a `then`/`else` keyword
(`if (!hasThenKeyword && !hasElseKeyword) return null;`), and the English corpus row is
**juxtaposed**: `bind $name to #input-a bind $name to #input-b`. Only the *translations*
insert a conjunction (es `entonces`, fr `alors`). A then-only fix passes 23 languages and
fails English.

**Use `parseBodyWithClauses`.** It already handles both forms — that is why the same input
parses inside a handler.

There is a precedent for the guard shape, in Stage 2 itself: the **SOV trailing-remainder
guard** (`semantic-parser.ts`, `commandMatch.consumedTokens < tokens.tokens.length` +
`wordOrder === 'SOV'` → prefer event extraction). Generalize that: when Stage 2 leaves a
remainder and the remainder begins a command, prefer a clause-based body parse. Like every
other guard in that stage, it must be **additive** — return null and fall through unless the
remainder genuinely parses, so a real single command is byte-identical to today.

### Ratchet: this is PHANTOM fidelity, again

Do not trust the baseline here. Today every language drops the second `bind` **identically**,
so the signatures agree and the row records fidelity 1.0:

```text
en : [bind.destination:reference, bind.source:selector]
es : [bind.destination:reference, bind.source:selector]   ← identical
```

Action multiset is `[bind]` on both sides. **R0-recall, R0-precision and R1 are all blind to
this drop.** It is the same trap as the five body-blocks: a row that parses nothing looks
perfectly faithful.

Consequence: the moment English captures both commands, its reference becomes `[bind, bind]`
and every language that still drops one falls to recall 0.5 → **lossy**, ×23, against a
tolerance of 3. So this is an all-24-languages change or nothing.

The good news: the translations **do** contain both binds
(`bind $name a #input-a entonces bind $name a #input-b`), so a `parseBodyWithClauses` route
should capture both everywhere at once. Verify per-language before regenerating.

### It is user-facing, and the two parsers disagree

This is not corpus-only. Measured on merged `main` for `add .a to #x then add .b to #y`:

```text
core   hyperscript.compileSync(...)  → [add, add]   ✓
semantic  parse(..., 'en')           → [add]        ✗
```

The exposure is the **multilingual path** — `hyperfixi.execute(src, lang)` /
`translate(...)` → `bridge.parseToAST` → `parseSemantic` → `parse()` → Stage 2 — which drops
the second command.

Why nobody has tripped over it in English: core's `compileSync` only consults the semantic
parser for commands absent from `skipSemanticParsing` (`parser.ts`), and that list already
holds most of the chainable ones (`add`, `put`, `set`, `toggle`, `remove`, `increment`, …).
`bind`/`live` never reach it either — they are dispatched earlier as registered *features* by
`@hyperfixi/reactivity`. So the English single-language path is largely shielded by accident,
and the divergence surfaces through the multilingual entry points. Confirm which commands
actually route to `parseSemantic` before scoping the blast radius.

---

## Bug B — possessive `source` collapses to the property name in 7 languages

`bind $color to #picker's value`. English captures a `property-path`; the seven languages
that render the possessive as `<prop> <preposition> <selector>` capture only the property
word and **drop the selector**:

```text
en : bind.source:property-path      ✓
ja : bind.source:property-path      ✓   (SOV `の` possessive works)
es : bind.source:expression         ✗   value = "valor"; `de #picker` unconsumed
```

Affected (all render `<prop> <prep> <sel>`): **ar, de, es, fr, id, pt, sw**

```text
ar   اربط $color إلى قيمة لـ #picker
de   bind $color zu wert von #picker
es   bind $color a valor de #picker
fr   bind $color à valeur de #picker
id   bind $color ke nilai dari #picker
pt   bind $color para valor de #picker
sw   bind $color kwa thamani ya #picker
```

Rows: `bind-explicit-property`, `bind-non-form-display`. (`bind-auto-detect` has no
possessive and does not fire.)

**Unlike Bug A, R1 sees this** — `bind.source:property-path` vs `bind.source:expression` is a
role-signature miss, so it is part of the residual ~0.98 `avgRoleFidelity` gap rather than an
invisible drop. That makes it independently measurable, smaller, and a good candidate to land
first. It is a `bind`-pattern / possessive-extraction fix, not a parser-architecture change;
compare how other commands consume `<prop> de <sel>` (the `of`-possessive machinery, and
`profile.possessive`).

---

## Suggested order

1. **Bug B first.** Self-contained, R1-visible (so the ratchet can prove it), no phantom
   fidelity, no cross-language cliff. It should move `avgRoleFidelity` up in exactly those 7
   languages and nowhere else.
2. **Bug A second**, as its own PR. It is an architecture change to `parseInternal` plus an
   all-24-language baseline move, and it deserves the same attribution discipline the
   feature-block arc needed.

---

## Traps (all of these cost real time in #627/#628/#629)

- **A green ratchet proves nothing on a phantom row.** Before/after per-row signatures, not
  the gate verdict. `computeFidelity` returns `undefined` for an empty reference, and an
  identical drop across all languages yields recall 1.0.
- **Attribute every baseline delta.** Measure old-parser-vs-new-parser against the **same**
  DB (`git stash push -- packages/semantic/src`, re-measure, `git stash pop`). The committed
  baseline has been stale before: #628 discovered ~0.006 of un-regenerated R1 drift left by
  #627, sitting under the 0.02 tolerance.
- **Check the real exit code.** `… --regression | tail -3` masks it (the pipeline exits with
  `tail`'s 0), and the gate's stale-dist *refusal* then reads as a pass. Redirect to a file
  and `echo $?`.
- **`git stash` bumps mtimes**, tripping the gate's src-newer-than-dist guard. Rebuild
  (`npm run check:fresh`) after any stash round-trip.
- **`--save-baseline` writes unformatted JSON.** Run
  `npx prettier --write baselines/multilingual-priority.json` or half the diff is churn.
- **Do not commit the regenerated `patterns.db`.** CI re-populates from `init-db.ts`.
- **Prove the test fails without the fix.** Assert on the captured commands and the action
  set — never on "does it parse". It parses, at confidence 1.0.

## Measure

```bash
npm run test:multilingual:build-deps                     # ordered build (required)
npm run populate --prefix packages/patterns-reference    # fresh patterns.db + stamp
cd packages/testing-framework
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --diagnose-coverage
npx tsx src/multilingual/cli.ts --full --bundle browser-priority --regression > /tmp/gate.log 2>&1
echo "exit=$?"
```

Baseline: **38 fire = 1.0%** (24 × Bug A + 14 × Bug B). `Multilingual Validation` is now a
**required** status check on `main`, so the ratchet actually gates.

## Definition of done

- A top-level command sequence — juxtaposed *and* `then`-chained — parses to every command,
  in all 24 languages, at top level and unchanged inside blocks.
- `bind $color to #picker's value` captures a `property-path` source in all 24 languages.
- `--diagnose-coverage` reaches **0** firings, or each remaining firing is named and explained.
- Multilingual `--regression` exits 0, or the baseline is regenerated with the fidelity delta
  **attributed** (old-vs-new parser, same DB) in the PR body.
- Existing per-row fidelity for `bind-two-way` is shown to have been *phantom* before, not
  regressed after.

## Known limitation — 1.0% is a floor, not a total

`unconsumed-input` instruments **only the Stage-2 plain-command path**. The event-handler,
compound, SOV and VSO stages re-tokenize sub-segments and expose no single consumed count, so
a drop inside them reports `unconsumed=no`. Extending the diagnostic to those stages is a
legitimate sub-task and **would raise the 38**. Treat 1.0% as the visible floor.

Related, still open (from `HANDOFF_body-block-drops.md`):

- **Part 2b**: 23-language `fetch … with { }` patterns + naked-named-arg capture.
- **The scoring change**: turning `unconsumed-input` into a confidence penalty. Its stated
  precondition — fixing the `roles: []` commands — is now **met** (#628/#629). Once it lands,
  re-evaluate whether Stages 0 / 0.5 of `parseInternal` can be simplified; they exist only
  because this signal was missing.
