# GRAIL — Workflow Orchestration for Claude-Native Agents

GRAIL (Graph-Representable Affordance and Intent Language) provides a stable 5-tool MCP interface for Claude to orchestrate multi-step workflows. Define conditions (what's true) and affordances (what can be done) in a `grail.yaml` file, and Claude can check state, plan dependency-ordered steps, and execute actions — all with precondition checks, cost-aware planning, drift detection, and confirmation gates.

## Quick Start

1. Create a `grail.yaml` in your project root (see [Schema Reference](#schema-reference))
2. Add `@hyperfixi/mcp-server` to your Claude MCP configuration
3. Claude sees 5 tools: `grail_check`, `grail_plan`, `grail_run`, `grail_info`, `grail_list`

## The Agent Workflow Loop

The recommended interaction pattern:

```
grail_check()          → evaluate all conditions, get truth vector
grail_plan(goal, truth) → compute dependency-ordered steps (instant with cached truth)
grail_run(action, truth) → execute an action with precondition checks
```

**Truth vector caching** is the key optimization: `grail_check` returns a `truth` object mapping condition names to booleans. Pass this to subsequent `grail_plan` and `grail_run` calls to skip re-evaluation (saves 30s+ per call on large projects).

## Tool Reference

### `grail_check`

Evaluate conditions and show available/blocked affordances.

| Parameter | Type     | Default | Description                                 |
| --------- | -------- | ------- | ------------------------------------------- |
| `only`    | `string` | all     | Comma-separated condition names to evaluate |

**Response:**

```json
{
  "cwd": "/path/to/project",
  "passing": [{ "name": "project.lint.passing", "description": "..." }],
  "failing": [{ "name": "project.tests.passing", "description": "...", "output": "..." }],
  "summary": "3 passing, 2 failing",
  "available": [{ "name": "run-lint", "title": "Lint All Packages", "cost": 1 }],
  "blocked": [{ "name": "run-tests", "title": "Run All Tests", "unmet": ["project.lint.passing"] }],
  "truth": { "project.lint.passing": true, "project.tests.passing": false }
}
```

### `grail_plan`

Compute a dependency-ordered plan to make a goal affordance feasible.

| Parameter | Type     | Required | Description                                                         |
| --------- | -------- | -------- | ------------------------------------------------------------------- |
| `goal`    | `string` | yes      | Affordance name to plan for                                         |
| `truth`   | `object` | no       | Pre-evaluated truth vector from `grail_check` (skips re-evaluation) |

**Response (feasible):**

```json
{
  "goal": "release-publish",
  "feasible": true,
  "phases": 3,
  "totalCost": 10,
  "steps": [
    {
      "action": "run-lint",
      "cmd": "npm run lint",
      "resolves": ["project.lint.passing"],
      "phase": 0,
      "cost": 1,
      "blocked_by": []
    },
    {
      "action": "typecheck",
      "cmd": "npm run typecheck",
      "resolves": ["project.typecheck.passing"],
      "phase": 0,
      "cost": 2,
      "blocked_by": []
    },
    {
      "action": "run-tests",
      "cmd": "npm test",
      "resolves": ["project.tests.passing"],
      "phase": 1,
      "cost": 3,
      "blocked_by": [{ "condition": "project.lint.passing", "needed_by": "run-tests" }]
    }
  ]
}
```

**Response (infeasible):**

```json
{
  "goal": "release-publish",
  "feasible": false,
  "reason": "unsatisfiable conditions",
  "unsatisfiable": ["project.versions.consistent"]
}
```

### `grail_run`

Execute a GRAIL affordance with precondition checks.

| Parameter   | Type      | Required | Description                                      |
| ----------- | --------- | -------- | ------------------------------------------------ |
| `action`    | `string`  | yes      | Affordance name to execute                       |
| `dry_run`   | `boolean` | no       | Preview without executing (default: false)       |
| `confirmed` | `boolean` | no       | Bypass confirmation gate (default: false)        |
| `truth`     | `object`  | no       | Pre-evaluated truth vector (skips re-evaluation) |

**Response (success):**

```json
{
  "action": "run-lint",
  "success": true,
  "cmd": "npm run lint",
  "exitCode": 0,
  "duration_ms": 4523,
  "output": "...",
  "effects": ["project.lint.passing"]
}
```

**Response (blocked):**

```json
{
  "action": "run-tests",
  "blocked": true,
  "unmet": ["project.lint.passing", "project.typecheck.passing"],
  "hint": "Run grail_plan('run-tests') to see what's needed"
}
```

**Response (needs confirmation):**

```json
{
  "action": "release-publish",
  "needsConfirmation": true,
  "message": "Are you sure you want to run release-publish?",
  "hint": "Re-run with confirmed=true to proceed"
}
```

**Drift detection:** After successful execution, GRAIL re-evaluates declared effects. If an effect is not true post-execution, a `driftWarnings` array is returned.

### `grail_info`

Return the full workflow graph (no parameters).

**Response:**

```json
{
  "domain": { "name": "hyperfixi" },
  "conditions": {
    "project.lint.passing": { "description": "ESLint passes across all workspaces" }
  },
  "affordances": {
    "run-tests": {
      "title": "Run All Tests",
      "preconditions": ["project.lint.passing", "project.typecheck.passing"],
      "effects": ["project.tests.passing"],
      "cost": 3,
      "cmd": "npm test"
    }
  },
  "enablesGraph": {
    "run-lint": ["run-tests"],
    "typecheck": ["run-tests", "build-packages"]
  }
}
```

### `grail_list`

List all condition and affordance names (no parameters).

**Response:**

```json
{
  "conditions": ["project.lint.passing", "project.typecheck.passing", "project.tests.passing"],
  "affordances": ["run-lint", "lint-fix", "typecheck", "run-tests", "build-packages"]
}
```

## Schema Reference

### `grail.yaml`

```yaml
version: '1.0' # Required. Schema version.

domain:
  name: string # Required. Domain identifier.
  description: string # Optional. Human-readable description.

entities: # Optional. For parameterized conditions/affordances.
  type: string # Entity type (e.g., 'packages')
  discover:
    type: glob # Discovery method
    pattern: string # Glob pattern (e.g., 'packages/*/package.json')
  context: # Template variables resolved from entity
    key: value # e.g., pkg_dir: '{cwd}/packages/{entity}'

conditions: # Required. List of evaluable conditions.
  - name: string # Unique identifier (dot-separated convention)
    description: string # Human-readable description
    eval:
      type: shell # Evaluation type (currently only 'shell')
      cmd: string # Shell command. Exit 0 = passing, non-zero = failing.
      cwd: string # Optional. Working directory (default: project root)
      timeout: number # Optional. Seconds (default: 30)

affordances: # Required. List of executable actions.
  - name: string # Unique identifier
    title: string # Optional. Human-readable title
    preconditions: string[] # Optional. Condition names that must be true
    effects: string[] # Optional. Conditions that become true after execution
    cost: number # Optional. Relative effort weight for planning (default: 1)
    confirm: string | boolean # Optional. Confirmation gate message
    action:
      type: shell # Action type (currently only 'shell')
      cmd: string # Shell command to execute
      cwd: string # Optional. Working directory
      timeout: number # Optional. Seconds (default: 120)
```

### Template Variables

Commands support `{variable}` placeholders resolved at runtime:

| Variable   | Value                                 | Example                                            |
| ---------- | ------------------------------------- | -------------------------------------------------- |
| `{cwd}`    | Project root (where grail.yaml lives) | `/home/user/myproject`                             |
| `{entity}` | Current entity name (from discovery)  | `core`                                             |
| Custom     | Defined in `entities.context`         | `{pkg_dir}` → `/home/user/myproject/packages/core` |

### Condition Naming Convention

Use dot-separated hierarchical names:

```
project.lint.passing        # Project-wide lint status
project.tests.passing       # Project-wide test status
pkg.built                   # Per-package build status
pkg.tests.passing           # Per-package test status
```

This enables the BFS planner's template effect detection (e.g., `order.status.{status}` automatically creates mutex groups where setting one value clears others).

## Writing Effective Conditions

Conditions are shell commands where **exit code 0 = true, non-zero = false**.

```yaml
# Simple: check a file exists
- name: pkg.built
  eval:
    type: shell
    cmd: 'test -d dist'

# Git status check
- name: project.clean.workdir
  eval:
    type: shell
    cmd: 'test -z "$(git status --porcelain)"'

# Run a linter
- name: project.lint.passing
  eval:
    type: shell
    cmd: 'npm run lint'
    timeout: 60
```

**Tips:**

- Keep condition checks fast (< 30s). Slow checks block the entire `grail_check` call.
- Conditions run in parallel (up to 8 concurrent). Design for parallel execution.
- Output is truncated to 500 characters. Include the most diagnostic info first.

## Writing Effective Affordances

```yaml
# No preconditions — always available
- name: lint-fix
  preconditions: []
  effects: [project.lint.passing]
  action:
    type: shell
    cmd: 'npm run lint:fix'
  cost: 1

# Depends on lint + typecheck
- name: run-tests
  preconditions: [project.lint.passing, project.typecheck.passing]
  effects: [project.tests.passing]
  action:
    type: shell
    cmd: 'npm test'
  cost: 3

# High-stakes: requires confirmation
- name: release-publish
  preconditions: [project.tests.passing, pkg.built]
  confirm: 'Publish all packages to npm?'
  action:
    type: shell
    cmd: 'lerna publish from-git'
  cost: 5
```

**Cost tuning:** The BFS planner prefers lower-cost paths. Set `cost` relative to execution time and risk:

- Fast/safe operations: cost 1 (lint, validate)
- Medium operations: cost 2-3 (typecheck, test, build)
- Slow/risky operations: cost 5+ (deploy, publish)

## Environment Variables

| Variable     | Description                                               |
| ------------ | --------------------------------------------------------- |
| `GRAIL_YAML` | Override path to grail.yaml (default: `{cwd}/grail.yaml`) |
| `GRAIL_CWD`  | Override working directory (default: `process.cwd()`)     |

## Architecture

```
grail.yaml
    │
    ▼
grail-yaml-loader.ts    ← Parse YAML, resolve templates
    │
    ▼
grail-registry.ts       ← Condition evaluation (shell), affordance execution, introspection
    │
    ▼
grail-tools.ts          ← 5 MCP tool handlers
    │
    ├─── @lokascript/planner   ← BFS planning (parseConditionMap, plan, applyEffects)
    │
    ▼
MCP Server              ← Exposes tools to Claude
```

The planner (`@lokascript/planner`) is a pure, zero-dependency BFS engine shared with the Siren hypermedia client. It handles cost-aware path selection, template effect resolution, and mutex prefix clearing.
