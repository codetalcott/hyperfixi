# HANDOFF — agent-era Arc 4: fidelity extraction, without the package

> Brief for Arc 4 of [AGENT_ERA_ROADMAP.md](./AGENT_ERA_ROADMAP.md). Landed
> 2026-08-24.

## The reshape

The roadmap filed Arc 4 as "carve out `@lokascript/fidelity`". Before starting,
the owner asked whether a new package would add confusion; the audit said yes:
**27 published packages across three scopes** (+2 unscoped extensions), twelve
packages just deleted (#909), and every published package carries permanent
rows in the six hand-maintained CI lists. The realistic first consumers are all
in-repo (MCP server, CI ratchets, agent-bench); a package for a hypothetical
external audience is speculative packaging, and promotion later is mechanical
while retirement is not. Decision: **extract without publishing anything new.**

## What shipped

1. **`packages/semantic/src/fidelity.ts`** — the scorers, moved verbatim from
   testing-framework (header updated to name the new home). Flat entry
   following the `./core` pattern: tsup entry (CJS+ESM) + `./fidelity` export
   map + d.ts via `build:types`. Zero imports before, zero after.
2. **`packages/testing-framework/src/multilingual/fidelity.ts`** is now a
   re-export shim of the full surface. Every in-repo consumer (orchestrator,
   parse-validator, triage tools) keeps its import path, and the 27-test
   fidelity suite now exercises the extracted module *through* the shim —
   drift between the two is structurally impossible.
3. **`CompilationService.scoreFidelity()`** (`src/scoring/score.ts` +
   service method beside `diff()`): normalizes reference + candidate (any
   input format; sides may be different languages), runs the scorers, returns
   `{ scores: { actionRecall, multisetRecall, precision, roleFidelity,
   valueRecall }, missingActions, spuriousActions, missingRoles,
   missingValues, faithful }` with side-tagged diagnostics on parse failure.
   `valueRecall` is `undefined` when the reference carries no invariant
   values (nothing to compare — not vacuously 1.0).
4. **`score_fidelity` MCP tool** in the compilation tool family (now 7; server
   total 108), named in the MCP `instructions`, AGENTS.md, and the mcp-server
   README. Positioning vs `diff_behaviors`: identical-or-not vs
   how-faithful-and-what-drifted.
5. `docs/FIDELITY.md` now points at the importable module.

## Probe-verified behaviors (also unit-tested, 6 new tests in service.test.ts)

- identical pair → `faithful: true`, all signals 1.0
- dropped second command → recall 0.67, `missingActions: ["put"]`,
  `missingValues: ["put.destination=#output"]`, precision stays 1.0
- hallucinated command → recall 1.0, precision 0.67, `spuriousActions:
  ["toggle"]`
- **silently rewritten target** (`#panel` → `#other`) — every signal 1.0
  except valueRecall 0.5, `missingValues: ["toggle.destination=#panel"]`.
  This is the intent-mismatch class Arc 3b's diagnostics cannot see, now
  checkable pairwise.
- cross-language (en reference, ko candidate) → faithful 1.0 — the
  translation-verification claim, live.
- unparseable side → `ok: false` with `[candidate]`-tagged diagnostics.

## Where the boundary deliberately sits

- Execution equivalence (R2-style jsdom) stays in testing-framework/agent-bench
  — structural scoring must not drag browser-automation deps into production
  consumers. If pairwise execution-checking is ever wanted on the service, it
  needs its own optional-dependency design.
- The standalone package is *deferred, not rejected*: the subpath boundary is
  the promotion-ready seam. Trigger: a named external consumer.

## Verification

- semantic: typecheck clean; build emits dist/fidelity.{js,cjs,d.ts} (the
  export-validation CI gate checks the new subpath resolves).
- testing-framework: fidelity suite 27/27 through the shim; typecheck clean.
- compilation-service: 54/54 in service.test.ts (6 new).
- mcp-server: compilation suites 63/63 (tool-count contracts updated 6 → 7).
- Full test:check sweeps + push validation in the PR.
