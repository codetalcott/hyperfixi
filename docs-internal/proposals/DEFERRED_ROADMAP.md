# Deferred Roadmap

Items from the Semantic Schema Evolution proposal and Explicit Syntax IR vision that are intentionally deferred. Each includes rationale and prerequisites.

## Agent Role Activation

**What**: Enable `agent` as an active semantic role so commands can specify _who_ performs the action (`server fetch /api/data`, `claude summarize #article`).

**Why defer**: Requires a runtime identity model (what is a "server"? how does delegation work?). The role is already reserved in the schema but activating it changes the execution model fundamentally -- the same command could route to different runtimes.

**Prerequisites**: Clear use case with real users; agent-to-agent protocol design; multi-target runtime routing (below).

## Multi-Target Runtime Routing

**What**: A `MultiTargetRuntime` that automatically selects the execution target (JavaScript, SQL, REST, LLM) based on the agent role or capability detection.

**Why defer**: The `CrossDomainDispatcher` handles _domain_ routing (which DSL parses this input?), but _target_ routing (which executor runs the compiled output?) is a different problem. No existing user workflow requires this yet.

**Prerequisites**: Agent role activation; at least 2 domains that compile to different execution targets in production.

## State Machine Generator (XState)

**What**: Infer XState/statechart definitions from event handler patterns. Multiple `on click when <condition>` handlers would map to states and transitions.

**Why defer**: Requires new command schemas (`state`, `transition`, `guard`) and a fundamentally different analysis pass (multiple handlers -> single machine). No domain package exists for this yet.

**Prerequisites**: Demand from XState users; schema design for state/transition commands.

## Workflow Generator (Temporal)

**What**: Generate Temporal workflow definitions from sequential command patterns.

**Why defer**: Similar to state machines -- needs new vocabulary and execution model. Temporal's programming model (activities, signals, queries) doesn't map cleanly to the current role system.

**Prerequisites**: Schema design for workflow primitives; Temporal SDK integration.

## Additional Semantic Roles

| Role          | Purpose                                 | Why Defer                                   |
| ------------- | --------------------------------------- | ------------------------------------------- |
| `beneficiary` | Who benefits ("fetch data for user")    | No domain currently needs it                |
| `frequency`   | Repetition rate ("poll every 30s")      | Could use `quantity` with a duration type   |
| `constraint`  | Limitations ("fetch with timeout 5000") | Could be modeled as `condition` or `manner` |
| `fallback`    | Error recovery ("fetch or use cached")  | Requires control flow, not just roles       |

The schema system supports adding roles at any time. These should be added when a concrete domain needs them, not speculatively.

## GraphQL Generator

**What**: Map semantic commands to GraphQL queries/mutations.

**Why defer**: The REST/route generation via `@hyperfixi/server-bridge` covers the most common API patterns. GraphQL has a fundamentally different shape (nested queries, fragments) that doesn't map cleanly to flat role-based commands.

**Prerequisites**: A domain package for GraphQL schema description; resolver generation patterns.
