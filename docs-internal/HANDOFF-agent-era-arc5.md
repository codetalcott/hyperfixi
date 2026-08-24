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
