# GRAIL Demo — Claude-Native Agent Workflow

This experiment demonstrates using GRAIL MCP tools to navigate the hyperfixi monorepo workflow. Claude acts as the agent, calling 5 stable tools to check conditions, plan actions, and execute steps.

## The Tools

| Tool          | What it does                                        |
| ------------- | --------------------------------------------------- |
| `grail_check` | Evaluate conditions, show available/blocked actions |
| `grail_plan`  | Compute ordered steps to reach a goal action        |
| `grail_run`   | Execute an action (with precondition checks)        |
| `grail_info`  | Show the full workflow graph                        |
| `grail_list`  | List all conditions and actions                     |

## The Agent Loop

```
Claude calls grail_check
  → "3 passing, 2 failing. run-lint available, release-publish blocked."

Claude calls grail_plan(goal: "release-publish")
  → "Phase 0: run-lint (cost 1), Phase 1: typecheck (cost 2), run-tests (cost 3),
     Phase 2: build-packages (cost 3), Phase 3: release-publish (cost 5)"

Claude calls grail_run(action: "run-lint")
  → "success, exit 0, 1.2s"

Claude calls grail_check
  → "4 passing, 1 failing. typecheck now available."

...repeat until goal is feasible...
```

## Run the Demo

```bash
# Show the workflow structure (no shell commands executed)
npx tsx experiments/grail-demo/demo.ts

# Run integration tests against the real grail.yaml
npx vitest run experiments/grail-demo/test/demo.test.ts
```

## Key Design: Stable Tools

The agent sees the same 5 tools regardless of workflow state. Only the _content_ of responses changes (which conditions pass, which actions are available). This avoids per-entity tool rebuilding and gives the agent a stable interface to reason about.

## Configuration

The tools read from `grail.yaml` at the repo root. Set `GRAIL_YAML` and `GRAIL_CWD` environment variables to point at a different config.
