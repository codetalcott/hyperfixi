# HATEOAS-MCP Protocol: Server-Controlled Tool Spaces for LLM Agents

## Abstract

This document defines how HATEOAS (Hypermedia as the Engine of Application State) semantics map to the Model Context Protocol (MCP). The core insight: MCP's `tools/list_changed` notification is a HATEOAS mechanism. As an agent navigates hypermedia states, available MCP tools change dynamically. LLM clients see tools appear and disappear based on server state, without understanding the underlying API structure.

## 1. Motivation

Static MCP tool servers expose a fixed set of tools. An LLM sees all tools at all times and must rely on prompt engineering to avoid calling invalid ones. This is the equivalent of hardcoding every possible API call — fragile and insecure.

HATEOAS inverts this: the **server** controls what the client can do at each step by including or omitting affordances (actions, links) in its responses. Applied to MCP:

- Tools reflect the current application state
- Invalid operations are invisible, not just forbidden
- The server enforces business rules through affordance availability
- LLM agents navigate safely without understanding the full state machine

## 2. Concept Mapping

| HATEOAS Concept    | MCP Mechanism                         | Semantics                  |
| ------------------ | ------------------------------------- | -------------------------- |
| Siren entity       | MCP resource `siren://current/entity` | Current application state  |
| Siren action       | MCP tool `action__{name}`             | Available operation        |
| Siren link         | MCP tool `navigate__{rel}`            | Available navigation       |
| Entity class       | Tool description metadata             | State classification       |
| Action fields      | Tool `inputSchema` (JSON Schema)      | Operation parameters       |
| State transition   | `tools/list_changed` notification     | Tool set update            |
| 409 Conflict       | Tool result with prerequisite info    | Blocked operation          |
| Affordance absence | Tool absence                          | Forbidden operation        |
| Sub-entities       | MCP tool `fetch__{rel}`               | Fetchable nested resources |

## 3. Tool Naming Convention

Tools are named with a type prefix and the affordance identifier:

```
action__{action-name}     — Execute a Siren action
navigate__{link-rel}      — Follow a Siren link
subscribe__{link-rel}     — Open SSE/WS via link (rel contains "events"/"subscribe")
fetch__{entity-rel}       — Fetch a sub-entity by href
stop                      — Terminate the workflow
```

Multi-API deployments prefix with the API name:

```
orders__action__{name}
inventory__navigate__{rel}
```

## 4. Tool Schema Generation

Siren action fields map to JSON Schema `inputSchema`:

| Siren Field Type   | JSON Schema Type                         | Notes                                |
| ------------------ | ---------------------------------------- | ------------------------------------ |
| `text` (default)   | `{ type: "string" }`                     |                                      |
| `number` / `range` | `{ type: "number", minimum?, maximum? }` |                                      |
| `checkbox`         | `{ type: "boolean" }`                    |                                      |
| `email`            | `{ type: "string", format: "email" }`    |                                      |
| `hidden`           | `{ type: "string" }`                     | Included in schema, value pre-filled |
| `select`           | `{ type: "string", enum: [...] }`        | From field options                   |

Fields are `required` when `field.required === true` or `field.value === undefined`.

## 5. Lifecycle

### 5.1 Initial Connection

```
Client                          MCP Server (HATEOAS Workflow)
  │                                     │
  ├── initialize ─────────────────────► │
  │                                     │ → Start SirenAgent at entry point
  │                                     │ → Fetch entry entity
  │                                     │ → Convert affordances to tools
  ◄──────────────── tools/list_changed ─┤
  │                                     │
  ├── tools/list ──────────────────────►│
  ◄──────────────── [action__X, nav__Y] │
```

### 5.2 Action Execution (State Transition)

```
Client                          MCP Server
  │                                     │
  ├── tools/call action__create-order ─►│
  │   { status: "pending" }             │ → agent.executeAction("create-order", data)
  │                                     │ → Server returns new entity
  │                                     │ → Convert new affordances to tools
  ◄──────────────── tool result ────────┤ (action result)
  ◄──────────────── tools/list_changed ─┤ (new tool set)
  │                                     │
  ├── tools/list ──────────────────────►│
  ◄──────────────── [action__Y, nav__Z] │ (different tools!)
```

### 5.3 Navigation

```
Client                          MCP Server
  │                                     │
  ├── tools/call navigate__orders ─────►│
  │                                     │ → agent.followLink("orders")
  │                                     │ → Fetch linked entity
  │                                     │ → Convert new affordances
  ◄──────────────── tool result ────────┤ (entity summary)
  ◄──────────────── tools/list_changed ─┤
```

### 5.4 Blocked Operation (409 Conflict)

```
Client                          MCP Server
  │                                     │
  ├── tools/call action__ship-order ───►│
  │                                     │ → agent.executeAction("ship-order")
  │                                     │ → Server returns 409 Conflict
  │                                     │ → Body contains offered actions
  │                                     │ → Convert offered actions to tools
  ◄──────────────── tool result ────────┤ { blocked: true,
  │                                     │   reason: "Order must be validated",
  │                                     │   prerequisite: "validate-order" }
  ◄──────────────── tools/list_changed ─┤ (now includes validate-order)
```

The LLM sees the block reason and the newly available tool. It can choose to call the prerequisite or take a different approach — the server guides but doesn't force.

## 6. MCP Resources

The server exposes the current entity as a readable resource:

| URI                      | Description                        |
| ------------------------ | ---------------------------------- |
| `siren://current/entity` | Full Siren entity JSON             |
| `siren://current/url`    | Current entity URL                 |
| `siren://history`        | Navigation history (array of URLs) |

Resources update on every state transition. Clients can read them to understand current state without calling tools.

## 7. FlowScript Integration

FlowScript provides the natural-language surface for defining HATEOAS workflows:

```
-- English (SVO)
enter /api
follow "orders"
perform "create-order" with form #checkout
capture as orderId

-- Japanese (SOV)
/api に 入る
"orders" を 辿る
#checkout で "create-order" を 実行
orderId として 取得
```

These compile to a `WorkflowSpec` — an ordered list of steps that the MCP server executes:

```json
{
  "entryPoint": "/api",
  "steps": [
    { "type": "navigate", "rel": "orders" },
    { "type": "action", "action": "create-order", "dataSource": "#checkout" },
    { "type": "capture", "as": "orderId", "path": "properties.id" }
  ]
}
```

## 8. Security Model

HATEOAS provides security by construction:

1. **No URL exposure** — The LLM never sees raw URLs; only action/link names
2. **Server-controlled scope** — Only available affordances become tools
3. **Business rule enforcement** — The server withholds actions when preconditions aren't met
4. **Audit trail** — Every tool call maps to a Siren action with known semantics
5. **Progressive authorization** — The server can require additional credentials mid-workflow by offering an "authenticate" action

## 9. Comparison with Static MCP Tools

| Aspect             | Static MCP             | HATEOAS-MCP                  |
| ------------------ | ---------------------- | ---------------------------- |
| Tool list          | Fixed at startup       | Changes every step           |
| Invalid operations | Tools exist but fail   | Tools don't exist            |
| State management   | Client-side            | Server-driven                |
| URL knowledge      | LLM sees all URLs      | LLM sees action names        |
| Business rules     | Prompt engineering     | Server enforcement           |
| Prerequisites      | Client must know graph | Server reveals incrementally |

## 10. Future: Goal Pursuit Protocol

The `pursue` keyword (deferred to v2) would add backward-chaining goal resolution:

```
enter /api → follow "order" {id} → pursue "ship-order"
```

The MCP server would implement pursuit internally:

1. Attempt the goal action
2. On 409, add offered action to a pursuit stack
3. Execute offered action, pop from stack
4. Retry goal
5. Repeat until success or max depth

The LLM client would see this as a single long-running tool call with progress updates, or as a sequence of tool-list changes if it needs to provide data for intermediate steps.
