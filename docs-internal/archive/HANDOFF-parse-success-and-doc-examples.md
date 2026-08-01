# Handoff: `parse()` success/errors consistency, and five malformed doc examples

Follow-ups from the 2.9.1 downstream-report arc (PRs #774–#783, merged 2026-07-27,
`main` @ `c0492d42`). Both items were surfaced by that work rather than fixed by it.

> **STATUS — both items are DONE** (branch `fix/doc-examples-and-parse-recovered`,
> 2026-07-27). Item 2: all five sources fixed and verified on both engines. Item 1:
> resolved as option (3), an additive `ParseResult.recovered`. The sweep is now a
> permanent gate. Two claims below were measured and found WRONG during the work —
> they are corrected in place and flagged **[CORRECTED]** so the record is not
> misleading; the reasoning built on them is left as written.
>
> Three things the work turned up that this note did not know:
>
> 1. **The sweep is incomplete for `examples/`.** Four more shipped sources parse
>    recovers-with-errors: `dialogs/native-dialog.html`,
>    `drag-and-drop/sortable-list.html`, `fetch-and-async/fetch-data.html`,
>    `fetch-and-async/infinite-scroll.html`. All four are allowlisted in
>    `baselines/shipped-sources-validity.json` with their upstream verdict.
>    `native-dialog.html` is a hyperfixi **parser defect** — upstream accepts it —
>    and it is worse than a bad diagnostic: the conditional body is hoisted out of
>    the `if` and **runs unconditionally**, at `ok: true`. Triage, minimal repro,
>    ruled-out hypotheses and the recommended order for all four are in
>    **[HANDOFF-if-block-then-separator.md](HANDOFF-if-block-then-separator.md)**.
> 2. **`examples/vite-plugin-test/` is gitignored and untracked** (`.gitignore:2`), so
>    finding #1 was never a shipped source. It is fixed on disk but cannot be
>    committed, and CI never sees it.
> 3. **`verify-engines.ts` had the same bug in a second place.** Its lokascript leg
>    gated on `compileSync().ok` while its upstream leg required zero errors, so
>    `set-color-variable` was stamped `engine: "lokascript"` for a source hyperfixi
>    does not cleanly accept either. Both legs now use the same bar.

Everything below is verified against `main` as of this commit. The oracle throughout
is the real upstream engine, already wired up as
`loadCanonicalParser()` in
[canonical-validity.ts](../../packages/testing-framework/src/multilingual/canonical-validity.ts) —
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

> **[CORRECTED] The 213 figure is wrong by more than an order of magnitude.** For the
> hyperscript `ParseResult` specifically it is **11 non-test sites, all inside
> `packages/core`, zero in any other package** (plus 332 test assertions). The other
> ~130 non-test `.success` reads belong to unrelated types — Zod `safeParse`, the
> `TypedResult` union in `expressions/**`, the semantic adapter's
> `SemanticParseAttempt`, testing-framework's own `ParseResult`. Nine of the 11 are the
> identical guard `if (!r.success || !r.node) throw` — runnable checks that are already
> correct under today's semantics. This makes option (2) far cheaper than priced below,
> but also less necessary; the decision recorded at the end still went to (3), because
> `ParseResult` is a **published** export (semver-major to redefine `success`) and
> because (2) would put the "`ok` must stay true" invariant on a hand-edit at
> `hyperscript-api.ts:861`. The real cost of (2) is re-verifying the 332 test
> assertions, not the 11 sources.

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

> **DECIDED (2026-07-27): (3) plus (1).** `ParseResult.recovered` is set in
> `Parser.parse()` — the single place `errors` is attached, so it cannot drift from it
> — and `success` is documented on the type as "AST produced, NOT a validity claim".
> `CompileResult.ok` is untouched, so the must-not-regress invariant holds by
> construction rather than by care.
>
> The audit also turned up **one live instance of #780's defect in a second surface**:
> the classic-i18n `compile()` shim (`browser-bundle-classic-i18n.ts:502-504`) copied
> the singular `error` and dropped `errors`, so it returned `{ success: true,
> errors: [] }` for input carrying a real diagnostic. Demo pages consume it
> (`examples/animation/color-cycling-debug.html:158`,
> `examples/multilingual/test-classic-i18n.html:178,191,192`). Fixed, with a guard
> verified to fail without the fix.

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

  > **[CORRECTED] Line numbers drifted, and the point is stronger than stated.** The
  > real reads are **729 / 732 / 754** (plus a second pair at 1317-1319). More to the
  > point, the server does not read `.success` *anywhere* — `grep` for it in
  > `packages/language-server/src/` returns nothing, as it does for
  > `mcp-server/src/tools/lsp-bridge.ts`. Both get it right by ignoring the flag
  > entirely, which is the cleanest statement of "errors are the truth".

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

> **[CORRECTED] This file is not a shipped source.** `examples/vite-plugin-test/` is
> gitignored (`.gitignore:2`) and untracked, so the fix applies on disk but cannot be
> committed, and neither CI nor the new gate ever sees it. The diagnosis above is
> right; only its status as one of "five real ones" is not. The tracked count is four.

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
[init-db.ts](../../packages/patterns-reference/scripts/init-db.ts), re-run
`npm run populate --prefix packages/patterns-reference`, and expect the multilingual
baseline to move — regenerate it with `--save-baseline` and commit the result, per
the root CLAUDE.md procedure. The other four are plain doc edits with no such
coupling.

> **DECIDED (2026-07-27): a third option — keep the `of`-possessive, swap the
> property.** `on click set the *background-color of #theme to "#ff6600"`, verified
> valid on both engines. Neither listed option was right, because this row turns out
> to be the corpus's **only exerciser of the selector-head branch** of
> `tryMatchOfPossessiveExpression` (`semantic/src/parser/pattern-matcher.ts:1525`) —
> and `pattern-matcher.ts:2382` names `set-color-variable` when justifying its
> `source`-only marker gating. The `setProperty` rewrite would have dropped that from
> 24-language corpus coverage to three hardcoded unit tests, while adding nothing
> (`call-function` already covers the `call` shape). Retitled, since it no longer
> demonstrates a custom property.
>
> **Baseline impact was nil**: the regenerated baseline moves only `bundleSize` and
> the stamps. Not one per-pattern metric changed. Translations are auto-generated
> (`translation_method DEFAULT 'auto-generated'`), so no hand-authoring was needed.
>
> **The R4 warning above was backwards, and worth understanding.** This row's en code
> was upstream-*invalid*, so it was silently EXCLUDED from both canonical-validity
> denominators. Making it valid *adds* it: the en-side went 133 → **134** checked,
> 134 valid, allowlist still empty; the foreign R4 gate passes with no new invalid
> pairs. Making a corpus row valid can therefore only ever grow those denominators —
> the risk is new exposure, not regression.

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

> **DONE, and the count was not zero.** The gate is
> `packages/testing-framework/src/multilingual/shipped-sources-validity.ts` +
> `.test.ts`, allowlist in `baselines/shipped-sources-validity.json`, npm script
> `test:shipped-sources`. It sweeps **454 sources, 408 clean, 4 allowlisted** — the
> four `examples/**` findings listed at the top of this note, none of which this
> handoff knew about. The corpus half did reach zero: `set-color-variable` was the
> only recovers-with-errors row in all 164.
>
> Three scoping decisions worth knowing before touching it:
>
> - **Only `ok:true`-with-errors is gated.** `ok:false` is a much larger and mostly
>   legitimate class (non-English sources needing the multilingual path, plugin syntax
>   whose feature is not installed, deliberate "this does not work" snippets). Gating
>   it would drown the signal, and an outright failure is loud anyway.
> - **Bare `hyperscript`-fenced blocks are excluded.** In this repo they are
>   overwhelmingly syntax *notation* (`send <event> to <target>`), which no parser can
>   accept. Only `_=`/`hx-live` attributes and `<script type="text/hyperscript">`
>   bodies are collected, from `.html` files and from `html`-fenced blocks in `.md`.
> - **CI needed a new path filter.** The `code` filter excludes `**/*.md`, `docs/**`
>   and `examples/**` — exactly the trees this gate walks — so a step in `unit-tests`
>   would never have run on a docs/examples-only PR, i.e. never on the diffs most
>   likely to introduce the bug. There is now a narrow `docsources` filter (the gate's
>   three roots) which also un-gates `build`, plus a small dedicated job.
>
> The method note above is now enforced structurally rather than by discipline:
> extraction goes through the DOM via `extractHyperscriptFromMarkup`, exported from
> `@hyperfixi/patterns-reference` and shared with `verify-engines.ts` so the two
> cannot drift. Escaped text in a `<pre>`/`.code` block decodes to a text node, never
> an attribute, so the `send-events.html` false-positive class is unreachable.
