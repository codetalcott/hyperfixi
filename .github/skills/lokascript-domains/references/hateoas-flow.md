# HATEOAS & FlowScript Runtime

## HATEOAS Commands

The flow domain includes 4 HATEOAS-specific commands that form a sequential pipeline for navigating Siren APIs:

```
parse_flow({ pipeline: "enter /api", language: "en" })
parse_flow({ pipeline: "follow orders", language: "en" })
parse_flow({ pipeline: "perform createOrder with #checkout", language: "en" })
parse_flow({ pipeline: "capture as orderId", language: "en" })
```

| Command   | Purpose                               |
| --------- | ------------------------------------- |
| `enter`   | Enter a Siren API at a root URL       |
| `follow`  | Follow a named link relation          |
| `perform` | Execute a Siren action with form data |
| `capture` | Store a response value for later use  |

HATEOAS commands work in all 8 languages. Order matters -- they describe a sequential workflow.

## WorkflowSpec Compilation

`compile_flow` produces a `WorkflowSpec` intermediate representation from HATEOAS commands.

## Runtime Adapters

| Export                        | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `toWorkflowSpec(specs)`       | Compile FlowSpec[] to WorkflowSpec IR                      |
| `toSirenGrailSteps(spec)`     | Convert WorkflowSpec to siren-grail step format            |
| `executeWorkflow(spec, opts)` | Execute via siren-grail OODAAgent (requires `siren-agent`) |

## MCP Dynamic Tools

The `McpWorkflowServer` wraps a Siren API as an MCP server with dynamic tools:

| Export                    | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `McpWorkflowServer`       | Wrap Siren API as MCP server with dynamic tools     |
| `actionsToTools(actions)` | Convert Siren actions to `action__{name}` MCP tools |
| `linksToTools(links)`     | Convert Siren links to `navigate__{rel}` MCP tools  |
| `entityToTools(entity)`   | Convert full Siren entity to MCP tool set           |

`tools/list_changed` fires on every state transition -- Siren affordances drive the LLM's available tools.
