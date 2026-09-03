# HANDOFF — agent-era Arcs 1+2: MCP surface curation + AGENTS.md front door

> Brief for the first two arcs of
> [AGENT_ERA_ROADMAP.md](./AGENT_ERA_ROADMAP.md). Landed 2026-08-24 on the
> `claude/llm-agents-multilingual-niche-dp1s6v` branch (PR #914, with the
> roadmap itself).

## What shipped

**Arc 1 (MCP surface):**

- `packages/mcp-server/src/index.ts` now passes MCP `instructions` (the SDK's
  `ServerOptions.instructions`) describing the agent loop — every connected
  client gets the generate → `validate_and_compile` → repair →
  `compile_hyperscript` narrative at handshake, before reading any docs. The
  constant says to keep it in sync with root `AGENTS.md`.
- Loop-tool descriptions now cross-reference each other:
  `validate_and_compile` ("START HERE", names `get_code_fixes` /
  `get_command_docs` / `compile_hyperscript` as next steps),
  `compile_hyperscript` ("FINAL step"), `get_code_fixes` ("the repair half"),
  `translate_code` (review-surface framing, "deterministic, not LLM
  translation").
- Failed `compile_hyperscript` / `validate_and_compile` results append a
  second content block (`REPAIR_HINT` in `tools/compilation.ts`) naming the
  next step, so the repair path is in the *result*, not just the descriptions.
  `content[0]` stays pure JSON — additive, no consumer breakage.
- The five MCP-sampling tools (`ask_claude`, `summarize_content`,
  `analyze_content`, `translate_content`, `execute_llm`) are **opt-in**:
  hidden from `tools/list` and refused (with a pointer to the deterministic
  alternatives) unless the server starts with `LOKASCRIPT_MCP_LLM_TOOLS=1`.
  Gated in `index.ts` at both the list and call choke points — the
  `samplingTools` export and its tests are untouched. Rationale: generic LLM
  invocation is the connected agent's own ability; the tools also depend on
  MCP sampling, deprecated in protocol revision 2026-07-28.

**Arc 2 (front door):**

- Root **`AGENTS.md`**: why emit hyperscript (checkability, IR-vs-intent,
  behavioral diff, deterministic 24-language review rendering), the loop, a
  worked repair example, domain-DSL/AOT pointers, ground rules. Routes
  repo-contributor agents to CLAUDE.md.
- Root README: subtitle + "For LLM Agents" section + agent-ready bullet +
  AGENTS.md links. The human quickstart stays first — humans are still the
  first audience of a README; agents get their own file.
- `packages/mcp-server/README.md`: "The agent loop" section up top; sampling
  section marked opt-in.

## Decisions

- **`docs/AGENTS.md` was dropped** from the arc: root `AGENTS.md` + the
  README section + the package README cover both audiences; a third copy
  would drift.
- **Opt-in flag over removal** for the sampling tools: they work and are
  tested; the problem was prominence, not existence.
- The **"agent-optimized errors" audit is only partially done** — the hint
  block covers the two loop tools. A full pass over `validation.ts` /
  feedback error paths (does every coded error name its fix?) remains Arc 1
  residue; fold it into Arc 3, whose benchmark will measure exactly this.

## Verification

- `npm run typecheck --prefix packages/mcp-server` clean.
- `npm run test:check --prefix packages/mcp-server` green (the llm-sampling
  suite tests the exported definitions/arg-mapping, which the gate does not
  touch).
- The `AGENTS.md` worked example's result shapes were checked against the
  actual `CompilationService.validate()` / `.compile()` output.
