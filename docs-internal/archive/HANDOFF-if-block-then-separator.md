# Handoff: `then` inside an `if` body silently hoists the body out of the conditional

> **RESOLVED.** Fixed in the `then`-as-command-separator change; this document is
> kept as history. Read the corrections below before trusting the triage in it.
>
> **What the fix was.** `parseIfCommand`'s two branch loops were replaced by one
> `parseIfBranchCommands` helper that consumes a separating `then` (and skips `--`
> comments), and the header-`then` consumption now checks the token instead of
> trusting the `hasThen` lookahead flag. `Parser.parseCommandBlock` (def / init /
> catch / finally) and `parseTellCommand` had the same missing-separator defect and
> were fixed alongside. Coverage:
> `packages/core/src/parser/__tests__/then-as-separator.test.ts` (parse shape) and
> `packages/core/src/api/if-body-then-execution.test.ts` (DOM effect).
>
> **Correction 1 — "suspect 1" was misdiagnosed.** The line-crossing lookahead is
> real but is NOT worth bounding, and bounding it was tried and rejected. The
> damage came from the *unconditional* `ctx.advance()` that trusted the flag; once
> that checks the token, a wrongly-set `hasThen` is harmless (it only feeds
> `isMultiLine`, and those shapes are multi-line anyway). A line bound would also
> reclassify the legitimate `then`-on-the-next-line form
> (`parser-integration.test.ts:381`). The single-line shapes it would newly reach
> are broken by an **independent** pre-existing defect in the implicit-multi-line
> scan: `if 1 is 1 log 'a'\nlog 'b'` already mis-nests with no `then` involved.
>
> **Correction 2 — the `infinite-scroll.html` recommendation (step 3) was wrong.**
> Its `end`s were balanced all along; there was no "genuinely missing `end`". Its
> entire hyperfixi error was a *second* gap in the same branch loop — `--` comments
> in an `if` body were not skipped, though every sibling body loop skips them. It
> came clean with no edit to the example. Upstream still rejects that file, but over
> the multi-line `make a <li>…</li>` element literal with `#{}` interpolation, which
> it does not support — so we are now more permissive there. Noted in the allowlist,
> not chased.
>
> **Still open:** `and` is not a command separator anywhere (the pratt parser
> absorbs it as a binary operator before any body loop sees it) — pinned as a KNOWN
> GAP in both test files. And `examples/drag-and-drop/sortable-list.html` (step 4)
> is untouched and still allowlisted.

Found by the shipped-sources validity gate added in #784. Everything below is
verified against `main` @ `fe478dd1` + that branch; the oracle is
`loadCanonicalParser()` in
[canonical-validity.ts](../../packages/testing-framework/src/multilingual/canonical-validity.ts)
(the real `hyperscript.org` engine, headless).

**Do not re-derive the triage.** The negative results in § "Ruled out" cost more to
find than the positive one.

---

## Severity: this is not a spurious diagnostic

The visible symptom is a bogus `Expected 'end' after if block` on a source whose
`end` is present. The actual damage is to the AST:

```hyperscript
on click
  if 1 is 2                        -- condition is FALSE
    get #u then log 'BODY RAN'
  end
  log 'after'
```

```
ok: true   errors: ["Expected 'end' after if block"]

eventHandler
 .commands
    command:if
     .args
        binaryExpression
        block            <-- EMPTY
    command:log          <-- 'BODY RAN', hoisted OUT of the conditional
    command:log          <-- 'after'
```

The `if` gets an **empty block** and its body becomes a **sibling** of the `if`. So
the conditional body runs **unconditionally**. And because `compileSync` returns
`ok: true`, this is the AST that actually executes — the page silently does the
wrong thing rather than failing.

This is also a worked example of why `ParseResult.recovered` (added in #784) exists:
`success`/`ok` are both true here.

## Minimal repro

```hyperscript
if 1 is 1
  get #u then log 'a'
end
```

- upstream `hyperscript.org`: **valid**
- hyperfixi: `Expected 'end' after if block`, body hoisted as above

The trigger is a **`then` used as a command separator inside the `if` body**.
Removing it — same structure, same `end` — parses clean and nests correctly.

In the shipped example that surfaced this
(`examples/dialogs/native-dialog.html`) the trigger is
`get #username then set username to it.value`.

## Ruled out

Each of these was tested and is **clean** in hyperfixi and valid upstream, so none
of them is the cause. Do not re-chase them:

| Shape | Result |
| ----- | ------ |
| `if <cond> then` + body + `end` | clean |
| `if <cond>` (no `then`) + body + `end` | clean |
| `if <cond>` (no `then`) + body + `else` + body + `end` | clean |
| `if <cond> then` + body + `else` + body + `end` | clean |
| the full native-dialog shape with the body's `then` removed | clean |
| nested `if` inside `if`, both with `then` + `end` | clean |

In particular the **optional `then` on the `if` itself is not the problem** — it
works in all six shapes above. The problem is specifically `then` *inside the body*.

## Two suspects — and the second is the important one

**Suspect 1 — the `hasThen` lookahead.**
[`parseIfCommand`](../../packages/core/src/parser/command-parsers/control-flow-commands.ts#L346),
lines 354-375, decides whether this is the explicit `if … then … end` form by
scanning forward for a `then`:

```ts
const maxThenLookahead = 500;
for (let i = 0; i < maxThenLookahead && !ctx.isAtEnd(); i++) {
  const token = ctx.peek();
  if (token.value === KEYWORDS.THEN) { hasThen = true; break; }
  if (token.value === KEYWORDS.END || … BEHAVIOR || DEF || ON) break;
  ctx.advance();
}
```

It stops at `end`/`behavior`/`def`/`on` but **not at a line boundary**, so it will
happily cross newlines into the body and bind a `then` that belongs to a body
command. An `if`'s own `then` must be on the condition's line; this scan does not
enforce that. Adding a line-boundary stop is the obvious first thing to try.

**Suspect 2 — block-body termination, and suspect 1 does NOT explain it.**
The bug **also reproduces when the `if` carries its own explicit `then`**:

```hyperscript
on click
  if 1 is 1 then
    get #u then set x to it
    log 'a'
  else
    log 'b'
  end
```

Here the lookahead finds the `if`'s own `then` first, so `hasThen` is set
correctly — yet it still fails. So there is a second mechanism, most likely in how
the block body decides where it ends.
[`isCommandTerminator`](../../packages/core/src/parser/token-predicates.ts#L350)
treats `then` as a terminator (correct for "where do this command's arguments
end?"), so the question to answer is whether that terminator is being consumed as
a *block* boundary somewhere rather than a *command* boundary.

**Start by explaining both shapes.** A fix that only addresses suspect 1 will look
right against `native-dialog.html` and still leave the explicit-`then` case broken.

## Constraint on the fix

Do not loosen the `end` requirement generally to make the error go away. There is a
**separate, independent** laxness difference: upstream tolerates an `if/then` with
**no `end` at all** at the end of a handler (`on click if 1 is 1 then log 'a'`),
which we reject. That is worth its own decision — it is a deliberate strictness
choice, not this bug — and conflating the two would mask the hoisting defect rather
than fix it.

## Verification harness

The gate from #784 is already the regression test:

```bash
npm run test:shipped-sources --prefix packages/testing-framework
```

Allowlist: `packages/testing-framework/baselines/shipped-sources-validity.json`.
The key embeds a sha1 of the source, so a fixed source stops matching, its entry
goes stale, and the third assertion **requires** you to remove it. The list can
only ratchet down.

Add unit coverage next to the existing control-flow tests as well — the gate proves
the shipped examples are clean, not that the parser is right.

Full suite before proposing the fix: `npm run test:check --prefix packages/core`
(7603 tests today). `if`-block termination is load-bearing.

## Recommended order for the four allowlisted sources

1. **`fetch-and-async/fetch-data.html`** — do first, it is free and independent.
   `log 'typeof it:', (typeof it)` uses `typeof`, which is JavaScript, not a
   hyperscript operator (upstream: `Expected ')' but found 'it'`). Pure authoring
   fix, no parser change.
2. **This defect** — one root cause, and the only one of the four where editing the
   example would be the *wrong* move. Fixing it is what makes step 3 tractable.
3. **`fetch-and-async/infinite-scroll.html`** — re-triage **after** step 2. It
   carries the same `Expected 'end' after if block` signature *and* a genuinely
   missing `end` (upstream rejects it too: `Expected 'end' but found 'on'`). Fixing
   the parser first tells you which part is really authoring error instead of
   guessing.
4. **`drag-and-drop/sortable-list.html`** — last; two unrelated bugs in one file.
   Upstream's is real and fixable: `set midpoint to box.top + box.height / 2` mixes
   `+` and `/` without parens, which hyperscript forbids (×2 occurrences) →
   `box.top + (box.height / 2)`. Hyperfixi's complaint is *different*
   (`malformed member access`) and will survive that fix — likely a further gap
   around the `add { prop: value; }` inline-style syntax. Confirm before editing, or
   you will fix the wrong thing.

Steps 2 and 4 are parser changes and belong in their own PR(s); #784 deliberately
changes no parser behaviour.

## Wider question worth asking

`native-dialog.html` shipped with its conditional body running unconditionally, and
nothing caught it. The gate catches it now, but only because someone parses these
files — there is still no test that *executes* a shipped example and asserts what it
does. The R2 execution ratchet does this for 47 curated corpus patterns
(`avgExecutionFidelity`); extending something like it to `examples/**` is the
natural follow-on, and is what would have caught this on behaviour rather than on a
diagnostic.
