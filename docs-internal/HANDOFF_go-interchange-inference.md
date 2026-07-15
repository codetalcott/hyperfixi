# HANDOFF: `go` URL destination drop (traditional parser + interchange)

> ## ✅ RESOLVED — 2026-07-14 (Strategy A, two-layer fix)
>
> Both layers implemented and verified end-to-end. `go`'s destination now
> survives the traditional parser and binds as an interchange `destination` role
> (+ `method` for the `url` form). Full standard-hyperscript `go` grammar
> supported (`go [to] <expr> [in new window]`, `go back`; naked `/paths` and
> scheme URLs; deprecated `url`/scroll forms kept for back-compat). The runtime
> [go.ts](../packages/core/src/commands/navigation/go.ts) was **not** touched —
> it already supported every form.
>
> **Files:**
> - `packages/core/src/parser/command-parsers/navigation-commands.ts` (**new** —
>   `parseGoCommand`, a flat token-scan; reuses the now-exported
>   `parseBareURLPath` for naked-URL reassembly).
> - `packages/core/src/parser/parser-constants.ts` — `'go'` added to
>   `COMPOUND_COMMANDS`.
> - `packages/core/src/parser/command-parsers/utility-commands.ts` —
>   `parseBareURLPath` exported + parameterized with a terminator predicate;
>   `case 'go'` in `parseCompoundCommand`.
> - `packages/core/src/ast-utils/interchange/from-core.ts` — `case 'go'` in
>   `inferRoles` (handles all three producer shapes + `target` fallback).
> - Tests: `navigation-commands.test.ts` (**new**),
>   `go-roles.e2e.test.ts` (**new**), fixtures added to `from-core.test.ts`.
>
> **Verification:** end-to-end through the exact AOT adapter path
> (`compileSync(…,{traditional:true})` → `fromCoreAST` → `generateCommand`,
> fresh dist) — `go to /page` → `location.href="/page"`, `go back` →
> `history.back()`, `go to url "/dash"` → `location.href="/dash"`,
> `go to https://x.com` → correct. Suites green: core 7251, aot-compiler 618,
> intent 80, plus 151 new-test assertions; typecheck clean; browser bundle
> builds. **The diagnosis below is retained for context.**

> Rewritten 2026-07-14 after verifying against **real** core parses (fresh
> dists). The **previous version of this doc misdiagnosed the bug** — it claimed
> a single interchange-inference gap against core args `[{id url},{lit /page}]`,
> a shape the real core parser never emits. The probe it was based on called
> `inferRolesFromSchema` with hand-fabricated args and was never checked against
> an actual `compileSync`. Corrected findings below.
>
> Pre-existing bug, NOT a regression from the pre-release arcs (#680–#683). The
> go-url arc (#680) fixed the SEMANTIC parse path and made this gap visible.
> Scope: **multi-layer** (traditional parser + interchange), not the small
> self-contained interchange tweak the old doc described. No fidelity-baseline
> coupling (the interchange path is not in the multilingual corpus).

## Symptom

`go to url "/page"` loses its destination (`/page`) in the interchange format
that the AOT compiler and downstream tools consume
(`packages/aot-compiler/src/compiler/core-parser-adapter.ts` →
`fromCoreAST`). Sibling forms `go /page` and `go back` are also affected.

## The bug is TWO layers, on TWO different parse paths

The AOT/interchange adapter calls
`hyperscript.compileSync(code, { traditional: true })`
([core-parser-adapter.ts:59](../packages/aot-compiler/src/compiler/core-parser-adapter.ts#L59)).
`traditional: true` **disables semantic parsing**
([hyperscript-api.ts:843](../packages/core/src/api/hyperscript-api.ts#L843)),
so `go` runs through the traditional parser — the layer that is broken first.

### Layer 1 — the traditional parser DROPS the URL (blocking layer)

Verified (2026-07-14, fresh dists, `compileSync(src, {traditional:true})`):

| source | core `args` | note |
| --- | --- | --- |
| `go to url "/page"` | `[{id to}, {id url}]` | **`"/page"` gone from the AST** |
| `go url "/page"` | `[{id url}]` | `"/page"` gone |
| `go /page` | `[{binaryExpression __ERROR__ / page}]` | bare path mis-parses |
| `go back` | `[{id back}]` | ok |
| `go to "/page"` | `[{id to}, {lit /page}]` | ok (string kept after `to`) |
| `send url "/page"` | `[{id url}, {lit /page}]` | **ok — `send` has a dedicated parser** |

Root cause: the generic command-arg loop
([parser.ts:3483-3538](../packages/core/src/parser/parser.ts#L3483)) only
continues to the next arg on a comma or a **continuation keyword**
(`into|from|to|with|by|at|before|after|over`). `url` is not one, so after
parsing `[to, url]` the loop hits a bare string literal with no continuation
context and **breaks, discarding `"/page"`**. `send`/`fetch` never reach this
loop — they are dispatched to dedicated command parsers earlier in
`parseCommandCore`. `go` has **no** dedicated traditional parser (there is no
`command-parsers/navigation-commands.ts`).

Because the URL is gone before interchange runs, **no `from-core.ts` change can
fix Layer 1.** The interchange layer even mis-binds the leftover: with args
`[{id to},{id url}]` the `to` marker matches and binds `destination: {id url}`
(the literal word "url"), which is wrong but non-empty.

### Layer 2 — interchange inference drops the destination even when the URL survives

On the SEMANTIC path (`traditional: false`) the URL **does** survive, but in
modifiers, not args:

```text
go to url "/page"  (traditional:false)  →
  { name:'go', args:[], modifiers:{ on:{lit "/page"}, method:{lit "url"} } }
```

`fromCoreAST` of that node still returns **no `roles`**: `inferRoles` falls to
its `default:` branch → `inferRolesFromSchema(goSchema, args:[], modifiers, …)`.
`goSchema`'s `destination` role has `markerOverride { en: 'to' }`, so:

- Pass 1 (marker scan) looks for a `to` key in modifiers/args — the modifier key
  is `on`, not `to` → no match.
- Pass 2 (target) — no `target`.
- Pass 3 (positional) **excludes** `destination` because it has a non-empty
  marker (`englishMarkers(destination) === ['to']`).

→ `roles = {}` → dropped. This is the real interchange gap (the old doc's
instinct), but the trigger is `modifiers.on` under-mapping, not the fabricated
`[{id url},{lit /page}]` arg shape.

Confirmed directly by feeding hand-built "ideal" shapes to `fromCoreAST`:
`[{id url},{lit /page}]`, `[{lit /page}]`, and `[{id back}]` all yield
`roles: undefined`; only the `target`-carried form (`go to /page` with a
trailing target) binds `destination`.

## Reproduce (the CORRECT probe — use this, not the old fabricated one)

```js
// ABSOLUTE dist paths; rebuild intent/semantic/core dists first
// (stale-dist pretest hooks do NOT fire for direct node/tsx).
const core = await import('<abs>/packages/core/dist/index.mjs');
const { hyperscript, fromCoreAST } = core;
for (const trad of [true, false]) {
  const res = hyperscript.compileSync('go to url "/page"', { traditional: trad });
  // find the { type:'command', name:'go' } node in res.ast, then:
  // console.log(trad, JSON.stringify(res.ast), JSON.stringify(fromCoreAST(goNode).roles));
}
```

Expect: `traditional:true` → args `[to,url]`, URL absent; `traditional:false` →
`modifiers.on = /page`, but `fromCoreAST(...).roles` empty.

## Fix strategies (choose scope; both real fixes are multi-file)

The 2026-07-14 session (this one) **deferred implementation** on purpose — the
release runbook (v2.8.0, publish 07-21/22) is active and this is bigger than a
release-week edit. Options for a focused post-release session:

- **(A) Scoped two-layer fix — tightest blast radius.**
  1. **Layer 1:** give `go` a dedicated traditional command parser (new
     `packages/core/src/parser/command-parsers/navigation-commands.ts`, wired
     into `parseCommandCore` alongside the `fetch`/`add`/`transition`
     dispatches). Emit the runtime-contract args
     ([go.ts:72-105](../packages/core/src/commands/navigation/go.ts#L72)):
     `['back']` → history; `['url', <urlExpr>]` → url nav; `[<bareUrl>]` →
     `/`-or-scheme nav; else scroll. Mirror `send`'s dedicated parser.
  2. **Layer 2:** interchange `case 'go'` in `from-core.ts` mapping the emitted
     args (and `modifiers.on`/`method` for the semantic path) → `destination`
     (+ `method`, an already-modeled interchange role — `put` emits it).
  Go-only; does **not** touch the generic arg loop or the AOT flag.

- **(B) AOT-reroute — less code, broader runtime-path change.**
  Add the Layer-2 interchange `case 'go'` (reads `modifiers.on`/`method` +
  `target`), AND stop the AOT adapter forcing `traditional: true` so the
  URL-preserving semantic parse feeds interchange. Risk: the flag change alters
  the AOT parse path for **every** command, not just `go` — audit before doing
  this.

Do NOT do interchange-only against `traditional:true`: the URL is already gone
at Layer 1, so it fixes nothing end-to-end.

## Verification (once implemented)

- End-to-end at the layer(s) you fix: core-parse `go to url "/page"`,
  `go back`, `go /page` via the SAME path the AOT adapter uses
  (`compileSync(code, {traditional:true})` for strategy A;
  `{traditional:false}` for strategy B) → `fromCoreAST(...)` → assert the
  interchange node carries the destination (and `method:'url'`).
- Runtime: if Layer 1 changes, assert `go.ts` still receives runtime-contract
  args (`['url','/page']` etc.) — existing tests in
  `packages/core/src/commands/navigation/__tests__/go.test.ts`.
- Interchange unit tests: `packages/core/src/ast-utils/interchange/from-core.test.ts`
  (hand-built `coreNode('command', {name:'go', …})` fixtures — mirror the `put`
  roles tests around line 968). **Match fixtures to REAL parser output**, not
  assumed shapes — that mismatch is what produced the old doc.
- Suites: `npm run test:check --prefix packages/core`,
  `npm test --prefix packages/intent -- --run`.
- No multilingual resweep needed (no semantic/i18n/dict changes) UNLESS you
  touch `goSchema` (e.g. adding `argSkipTokens`) — then re-run the
  `--regression` gate to confirm inert.

## Context you'd otherwise re-derive

- Runtime `go` contract ([go.ts:72-105](../packages/core/src/commands/navigation/go.ts#L72)):
  `args[0]==='back'` → history; args containing `'url'` → next arg is the URL;
  bare `/`-or-scheme arg → bare-url nav; else scroll. The runtime keys on
  evaluated STRING args (`'url'`, `'/page'`, `'back'`).
- #680 fixed the semantic side: generated url-variant patterns
  (`rolePrefixLiteralVariants` on `goSchema`,
  [command-schemas.ts:1720](../packages/semantic/src/generators/command-schemas.ts#L1720)),
  fused-path reclaims in `semantic-parser.ts`, and rewrote `goMapper`
  ([command-mappers.ts:510](../packages/semantic/src/ast-builder/command-mappers.ts#L510))
  to the args contract above. That path is `buildAST` (semantic → AST directly),
  which is NOT the `compileSync` semantic path that emits `modifiers.on` — don't
  conflate them.
- Probe hygiene: ABSOLUTE dist paths; rebuild intent/semantic/core dists first
  (stale-dist pretest hooks do NOT fire for direct `node`/`tsx`); schema-
  validation warnings on stderr are noise. And — the lesson of this doc — probe
  the **real** `compileSync` output, never hand-fabricated args.
