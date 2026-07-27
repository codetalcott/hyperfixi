# Handoff: `parse()` success/errors consistency, and five malformed doc examples

Follow-ups from the 2.9.1 downstream-report arc (PRs #774–#783, merged 2026-07-27,
`main` @ `c0492d42`). Both items were surfaced by that work rather than fixed by it.

Everything below is verified against `main` as of this commit. The oracle throughout
is the real upstream engine, already wired up as
`loadCanonicalParser()` in
[canonical-validity.ts](../packages/testing-framework/src/multilingual/canonical-validity.ts) —
it loads `node_modules/hyperscript.org/dist/_hyperscript.esm.js` headlessly and
returns the grammar errors for a source. Use it; don't re-derive judgements by hand.

---

## Item 1 — `parse()` returns `success: true` with a non-empty `errors` array

### What's true today

The parser is deliberately resilient: it recovers from some malformed input and
returns a usable-but-degraded AST **plus** diagnostics. `ParseResult.errors` is even
documented as "All accumulated errors (resilient parsing)". So the state is
intentional; what is not intentional is that `success` says nothing about it.

```text
parse('put 1 2 3 into')  ->  success: true,  errors: [1 error]
parse('set')             ->  success: false, errors: [2 errors]
parse('toggle .active')  ->  success: true,  errors: []
```

`success: true` therefore means "an AST exists", not "the input was valid" — and
~213 non-test call sites across the monorepo check `.success`.

### What #780 already fixed, and what it left

PR #780 stopped the diagnostics being *lost*: `compileSync` now carries recovered
errors through, and `validate()` reports `valid: false` when any are present. The
two questions were split deliberately —

- `CompileResult.ok` — "did we produce something runnable?" **unchanged**, so
  resilient execution behaves exactly as before and no page that works today breaks.
- `ValidateResult.valid` — "is this correct?" now false on recovered errors.

See `packages/core/src/api/validate-surfaces-recovered-errors.test.ts`.

**What it did not do** is make `success` itself consistent. Every one of those ~213
call sites still reads a flag that can be `true` for malformed input. #780 patched
the two public surfaces that were visibly disagreeing; the underlying signal is
unchanged.

### Why this wasn't taken on

It is a semantics change to the parser's primary return value, and the blast radius
is the whole monorepo. There are at least three defensible designs and picking one
is a judgement call, not a refactor:

1. **Leave `success` alone, document it.** Rename nothing; state in the type that
   `success` means "AST produced" and that callers wanting validity must check
   `errors`. Cheapest, and arguably already true — but leaves a footgun with a
   misleading name.
2. **Make `success` mean "no errors".** Most honest reading of the name. Every
   currently-recovering call site starts seeing `success: false`, so each of the 213
   needs auditing for whether it wanted "runnable" or "valid". This is the big one.
3. **Add a third field** (`recovered: boolean`, or `severity`), leave `success` as
   "AST produced". Non-breaking, self-documenting, but adds surface area and does
   not stop anyone reading `success` and getting it wrong.

My weak preference is (3) then (1): (3) makes the distinction visible at the type
level without a 213-site audit, and (1) alone is too easy to ignore. But this is the
owner's call — do not treat that as decided.

### Where to start

- `packages/core/src/parser/parser.ts` — the `success: true` returns are at roughly
  lines 309, 418, 505, 535, 581 (they set `warnings` but never `errors`).
- `packages/core/src/types/core.ts:271` — the `ParseResult` interface.
- `packages/core/src/api/hyperscript-api.ts` — `compileSync` (~line 850) and
  `validate` (~line 1097), already updated by #780; whatever you do should stay
  consistent with them.
- `packages/language-server/src/server.ts:665,732` reads `result.errors` directly
  without consulting `success`, which is why the LSP was right when `validate()` was
  wrong. It is the existing precedent for "errors are the truth".

### Do not regress

The 22 tests in `validate-surfaces-recovered-errors.test.ts` and
`send-trigger-parity.test.ts` pin the current split. In particular, **`ok` must stay
true for a recovered parse** — making execution refuse degraded ASTs would break
pages that work today, and that is a separate (much bigger) decision.

---

## Item 2 — malformed hyperscript in the docs and examples

### Correcting the count: **five, not six**

The earlier "six" figure included one false finding. Fixing it first, so nobody
chases it:

**NOT a bug — `examples/events-and-dom/send-events.html:80,85`.** These sit inside
`<div class="code">` blocks: escaped source displayed *as documentation*
(`&lt;button _="on click send hello to &lt;form /&gt;"&gt;`). The regex sweep that
found them extracted from the escaped display text. The file's live attribute is
line 62, `_="on click send hello to #target-form"`, which is correct.

**Method note for whoever re-runs this:** a raw-text regex over `.html` cannot tell a
live attribute from a code sample. Either parse the HTML and read attributes via the
DOM, or skip any match inside a `<pre>`/`<code>`/`.code` block. Expect other false
positives of this shape in any sweep that doesn't.

### The five real ones

Each verified twice: the current source produces hyperfixi errors, and the proposed
fix parses clean. Upstream's verdict is given because it diagnoses the root cause
more precisely in several cases.

| # | Location | Problem |
| - | -------- | ------- |
| 1 | `examples/vite-plugin-test/index.html:65` | `has` is not an operator, and the `if` has no `end` |
| 2 | `packages/core/docs/LOCAL_VARIABLES_GUIDE.md:520` | `put` with no target |
| 3 | `packages/core/docs/LOCAL_VARIABLES_GUIDE.md:521` | same |
| 4 | `packages/core/docs/README.md:55` | `{id}` is not interpolation — needs `${id}` |
| 5 | `patterns.db` id `set-color-variable` | `*--css-var` is not supported syntax |

**1 — `examples/vite-plugin-test/index.html:65`**

```diff
-  on click if me has .active then remove .active else add .active
+  on click if me matches .active then remove .active else add .active end
```

Two defects. `has` is not a hyperscript operator (upstream: `Expected 'end' but
found 'has'`) — the membership operator is `matches`, or `I match`. And the `if`
block is unterminated (ours: `Expected 'end' after if block`). Both engines accept
the replacement.

**2 & 3 — `packages/core/docs/LOCAL_VARIABLES_GUIDE.md:520-521`**

```diff
-  on click set :count to 1 put :count
+  on click set :count to 1 then put :count into #out
```

`put` requires a target keyword. Both engines say so, nearly identically. Pick a
target id that exists in the surrounding example — `#out` is a placeholder.

**4 — `packages/core/docs/README.md:55`** (a multi-line attribute spanning lines 54–56)

```diff
   _="on showProduct(id)
-       fetch /products/{id} and put it into me
+       fetch /products/${id} and put it into me
        then remove .hidden from me"
```

`{id}` is not interpolation syntax — it parses as an object literal, which is why
ours reports `Expected ':' after property name in object literal`. `${id}` is
correct and, since #776, is carried whole into the URL and emitted as a
`templateLiteral` so it actually interpolates.

Note the two engines fail here for *different* reasons. Upstream reports
`Unexpected Token : and`, because `and` as a command separator is a **hyperfixi
extension upstream does not have** — it is used throughout our docs
(`fetch /content and put it into #target`) and is not a defect. Do not "fix" the
`and`; only the interpolation is wrong.

**5 — `patterns.db`, pattern id `set-color-variable`**

```diff
-  on click set the *--primary-color of #theme to "#ff6600"
+  on click call #theme.style.setProperty("--primary-color", "#ff6600")
```

This is a **feature gap, not a typo**. Upstream accepts `set *color of #x to "red"`
but rejects `*--primary-color` — the `*` style-property prefix does not extend to CSS
custom properties in either engine. `setProperty` is accepted by both.

Two options, and this one needs a decision rather than a patch:

- **Rewrite the pattern** to the `setProperty` form (above). Cheapest; the pattern
  keeps demonstrating "set a CSS variable" with syntax that works.
- **Implement `*--var` support** and keep the pattern as the motivating case. Larger,
  diverges from upstream, and needs its own design.

Changing a pattern is not free: `patterns.db` rows feed the multilingual corpus, so
edit the seed in
[init-db.ts](../packages/patterns-reference/scripts/init-db.ts), re-run
`npm run populate --prefix packages/patterns-reference`, and expect the multilingual
baseline to move — regenerate it with `--save-baseline` and commit the result, per
the root CLAUDE.md procedure. The other four are plain doc edits with no such
coupling.

### Re-running the sweep

The triage that produced this list: for every hyperscript source in `examples/`,
`docs/`, `packages/core/docs/` and `patterns.db`, parse with hyperfixi; where
`success === true` **and** `errors` is non-empty, ask upstream for a second opinion.
Upstream accepting means *we* have a false positive; upstream rejecting means the
source is genuinely malformed.

That sweep is worth keeping as a gate once these five are fixed — it is what caught
both the `send`-vs-`trigger` divergence and the `parseTriggerCommand` hang in #780,
and neither was reachable from the existing suites. Currently it lives only in a
scratchpad script; promoting it to `packages/testing-framework` with an allowlist of
known-acceptable rows would stop this class regressing. Note it needs
`loadCanonicalParser`, so it is Node-only and cannot run in a browser suite.

### Expected end state

After the five fixes, the sweep should report **zero** sources where hyperfixi
recovers-with-errors — meaning `validate()` returns `valid: true` for every example
we ship. That is a much better invariant to gate on than the current "six known
exceptions".
