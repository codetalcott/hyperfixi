# Handoff: a single-line `if` swallows the following line into its block

> **RESOLVED 2026-07-27.** Fixed in `parseIfCommand`'s implicit-multi-line scan:
> once the FIRST command is found on the `if`'s own line, the scan now stops the
> moment it leaves that line, so a later-line command can no longer set
> `hasImplicitMultiLineEnd`. The deliberate missing `break` is preserved — the
> scan still runs past the same-line first command to find a same-line
> `else`/`end`.
>
> Coverage: 11 parse-shape cases in
> `packages/core/src/parser/__tests__/then-as-separator.test.ts` (describe: *a
> single-line if does not swallow the following line*) and 5 DOM-effect cases in
> `packages/core/src/api/if-body-then-execution.test.ts` (describe: *a command
> after a single-line if runs regardless of the condition*). 10 of the 16 fail
> against the unfixed parser; the other 6 are guards that must pass in both
> states.
>
> **The `hasThen` residual is also fixed** (same branch, follow-up commit): a
> single-line `if` whose *following* line contained a body `then` was still
> swallowed, because that lookahead crosses newlines. See "Why the `then` fix did
> not touch it" below — the re-evaluation it calls for was done, and the answer is
> a **first-command** bound (a header `then` always precedes the body), not the
> `commandToken.line` bound #785 rejected, which would break the legitimate
> `then`-on-the-next-line header form.
>
> A separate, unrelated defect in the same function was found during this work and
> is now the top of the queue:
> [HANDOFF-command-word-in-if-condition.md](HANDOFF-command-word-in-if-condition.md).

Found while fixing the `then`-as-command-separator defect
(`HANDOFF-if-block-then-separator.md`). **Independent of it** — this reproduces
with no `then` anywhere — and it survived that fix untouched. Everything below is
verified against `fix/then-as-block-body-separator`; the oracle is
`loadCanonicalParser()` in
[canonical-validity.ts](../packages/testing-framework/src/multilingual/canonical-validity.ts)
(the real `hyperscript.org` engine, headless).

---

## Severity: a command that must always run silently does not

This is the **mirror image** of the `then` defect. That one hoisted a conditional
body OUT of its `if`, so it ran unconditionally. This one pulls an unconditional
command IN, so it stops running when the condition is false.

```hyperscript
if 1 is 2 add .a to #t     -- single-line if, condition FALSE
add .b to #t               -- sibling; must run regardless
```

```
ok: true   errors: ["Expected 'end' after if block"]

command:if
 .args
    binaryExpression
    block
       command:add   <-- .a
       command:add   <-- .b   <-- SWALLOWED into the block
```

Executed in jsdom with that false condition, **neither** class is applied.
`add .b to #t` never runs. Upstream runs it.

Same `ok: true` + recovered-error shape as the `then` defect, so `compileSync`
callers see success and the page quietly does the wrong thing.

## Minimal repro

```hyperscript
if 1 is 1 log 'a'
log 'b'
```

- upstream `hyperscript.org`: **valid** — `log 'b'` is a sibling of the `if`
- hyperfixi: `Expected 'end' after if block`, and `log 'b'` lands inside the block

Confirmed upstream-valid in all four shapes tested: bare two-line, inside an
`on click` handler, with a true condition, and with a false one.

## Ruled out

| Shape | Result |
| ----- | ------ |
| `on click if 1 is 2 log 'a'` (single-line, nothing after) | clean, correct |
| `on click if 1 is 2 then log 'a' end` + next line | clean, correct — `log 'b'` stays a sibling |
| any shape involving a body `then` | fixed separately; not this |

So the trigger is precisely: **an `if` in its single-line form (no `then`, no
`end`) with any command on a following line.** The explicit `then … end` form is
unaffected, which is the workaround.

It scales — three trailing lines are all swallowed, not just one.

## Where it is

[`parseIfCommand`](../packages/core/src/parser/command-parsers/control-flow-commands.ts),
the implicit-multi-line lookahead (the `hasImplicitMultiLineEnd` scan, immediately
after the `hasThen` scan). Its stated rule is right:

> Only check the FIRST command's line position. If the first command is on a
> DIFFERENT line than `if`, it's multi-line; if on the SAME line, it's single-line.

The bug is that the scan does not **stop** once it has answered that question. It
finds `log 'a'` on the `if`'s own line, correctly declines to set
`hasImplicitMultiLineEnd`, and then — because that branch has no `break` — keeps
walking. It reaches `log 'b'` on the next line, sets the flag, and breaks. So the
"FIRST command" rule is defeated by the second command.

The comment at that site even says `// Don't break - continue scanning to find
'else' or 'end' on same line`, which is the deliberate reason the `break` is
absent: it wants to catch `if x > 3 set y to 1 else set y to 2 end`. Any fix has
to keep that case working — the scan needs to distinguish "still looking for a
same-line `else`/`end`" from "already found a same-line first command, so stop
considering later-line commands."

## Why the `then` fix did not touch it

Bounding the `hasThen` lookahead to the `if`'s own line was considered and
rejected during that work, specifically because of this defect: the line bound
would route *more* inputs down this already-broken path, converting one silent
wrong answer into a different silent wrong answer. See the comment at the
`hasThen` scan. **Fix this first**; then re-evaluate whether the lookahead bound
buys anything.

## Constraint on the fix

Do not reach for "make the single-line form require `end`". Upstream supports the
bare single-line `if`, it is used in shipped examples, and the strictness question
is separate — the same trap the `then` handoff warned about.

## Verification harness

No shipped example currently trips this, so the shipped-sources gate is **not**
the regression test here — it would pass a broken fix. Write the coverage first:

```bash
npm run test:check --prefix packages/core
```

Add cases beside the existing ones in
`packages/core/src/parser/__tests__/then-as-separator.test.ts` (parse shape) and
`packages/core/src/api/if-body-then-execution.test.ts` (DOM effect). Assert
**structurally and behaviourally** — asserting `success`/`ok` proves nothing, both
are already true against the bug. The behavioural assertion is the one that
matters: false condition, sibling command must still run.

Keep the guards those files already carry; `if`-block termination is load-bearing
(7629 tests).
