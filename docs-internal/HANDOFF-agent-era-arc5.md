# HANDOFF — agent-era Arc 5 slice 1: the verified-translation badge

> Brief for Arc 5 of [AGENT_ERA_ROADMAP.md](./AGENT_ERA_ROADMAP.md). Slice 1
> landed 2026-08-24; slice 2 (the editor command) is design-noted, not started.

## What shipped

- **`CompilationService.translate()` self-verifies.** After rendering, the
  output is scored as candidate against the input as reference via
  `scoreFidelity()` — the arc-4 cross-language pairwise scorer — and the full
  report rides on the response as `verification`. Contract points:
  - **Advisory:** a verification that fails to parse never flips the
    translation's `ok`, and its diagnostics stay inside `verification` (a
    test pins that they never leak into the translate response).
  - **Opt-out:** `verify: false` on the request skips it (two extra parses
    per call is the default cost; callers in a hot loop can decline).
  - `verification.faithful === true` is the badge: every one of
    actionRecall / multisetRecall / precision / roleFidelity / valueRecall
    is exactly 1.0.
- **`translate_code` MCP tool** carries the field automatically (its result
  is the service response serialized); its description now instructs agents
  to present the badge alongside any translation shown to a user for review.
- Probe-verified en→ko, en→ja, en→ar all faithful 1.0 (including invariant
  values: `#panel` survives into `#panel 에 .active 을 토글`).

Three new tests in `compilation-service/src/service.test.ts` (faithful badge,
opt-out, advisory isolation); suite 57/57.

## Slice 2 — the editor command (not started, deliberately)

"Show this handler in my language" is a real multi-package feature, not a
data-layer flag:

- `packages/vscode-extension` is an **LSP client** + debugger; language
  features come from `@lokascript/language-server` over LSP. Neither has any
  translation surface today (verified by inspection).
- The design when it's sliced: a custom LSP request (working name
  `lokascript/translateWithVerification`) on the language server, backed by
  the same `translate()` call — the badge data is already in the response —
  plus an extension command rendering translation + badge (hover or virtual
  document), plus editor-host testing this repo does not currently have.
- Until then, the review surface exists through MCP: an agent presenting code
  to a user calls `translate_code` and shows the badge.

## Slice 2 (same day): the editor command

Shipped as designed, three layers:

1. **`scoreNodes` moved to `@lokascript/semantic/fidelity`** (from
   compilation-service's `scoring/score.ts`, which now re-exports it) so the
   language server and the service share one scorer — the same no-drift move
   as the arc-4 shim.
2. **`lokascript/translateWithVerification`** custom LSP request
   (`packages/language-server/src/translate-with-verification.ts` +
   registration in server.ts after the connection is created — the first
   attempt registered before the `const connection` declaration, a TDZ trap).
   The semantic namespace is a handler PARAMETER, mirroring `resolveMode()`'s
   probe pattern: hyperscript-mode bundles shim `@lokascript/semantic` to an
   empty module, and the handler returns a clean "hyperscript mode" error
   there. Verification is advisory, exactly as in slice 1. Five unit tests,
   including the shimmed-away and unparseable-rendering paths.
3. **`LokaScript: Show in My Language`** command in `lokascript-vscode`:
   selection (or current line) → target language from the new
   `lokascript.reviewLanguage` setting or a QuickPick over the 24 languages →
   Markdown preview beside the editor: rendered code, then the badge
   (✓ verified structurally exact / ⚠ not fully faithful with the exact
   missing/spurious lists / ⚠ unverified), then the source line.

**The bundling trap, twice:** both extensions bundle the language server from
source with an alias on `@lokascript/semantic`, and esbuild applies a package
alias to subpaths — so `@lokascript/semantic/fidelity` was remapped under the
alias target and failed to resolve. Fixed with a longest-match alias in each:
`lokascript-vscode` maps the subpath to the real `semantic/src/fidelity.ts`;
`vscode-extension-hyperscript`'s shim build maps it to the real file too
(pure, zero-dep, no language data — harmless in a hyperscript-only build,
and the root shim still makes the handler degrade).

**Known gap:** no editor-host integration tests (none exist in the repo for
either extension); the handler is unit-tested, the command layer is
typecheck- and bundle-verified.

## Also in this PR

The roadmap gained a **Standing deferrals** section consolidating the three
deferred-with-trigger items (A/B run, standalone fidelity package, and the
remote/HTTP transport idea salvaged from `@lokascript/mcp-multilingual-intent`
— the private package moved out with the domain family in #909, whose five
tools are all subsumed by today's mcp-server).

## Verification

- compilation-service: 57/57 in service.test.ts; full suite in the PR run.
- mcp-server: description-only change to translate_code (no contract change —
  the tool already serialized the whole service response).
