# LSE for LLMs: Emission Guide

LSE is designed to be a reliable output format for LLM-driven tools that generate UI behavior or other imperative commands. This guide covers the two surface forms LLMs should emit, when to use each, and how to prompt for them reliably.

## TL;DR decision tree

```text
Is the LLM constrained to emit JSON?
│
├─ No (chat-style / freeform text)
│   └─ Use BRACKET SYNTAX: [toggle patient:.active destination:#button]
│
└─ Yes (function-calling API / structured output / tool use)
    └─ Use JSON WIRE FORMAT with compact shortcuts:
       { "action": "toggle", "roles": { "patient": { ... } } }
```

Both forms carry identical semantics. The choice is about how the LLM is wired, not about the underlying protocol.

## Which form, and why

### Bracket syntax (for LLMs emitting text)

**Use when:** your LLM is in a chat/completion mode and can emit freeform text (or a code block). This includes system-prompt-driven tools, chat-based agents, and any pipeline where the LLM's output is parsed from a text field.

**Why:** bracket syntax is roughly a third the token cost of the equivalent JSON form, and LLMs are measurably more reliable at producing it in practice — there's less machinery (`{`, `}`, `"` around every key, quoted values, nested object wrappers) for the model to get wrong.

**Example:**

```text
[toggle patient:.active destination:#button]
[on event:click body:[add patient:.highlight destination:me]]
[fetch source:/api/users destination:#user-list]
```

See [Bracket syntax format](#bracket-syntax-format) below for the full syntax.

### JSON wire format (for LLMs emitting structured output)

**Use when:** your LLM is constrained to emit JSON — for example, OpenAI function calling, Anthropic tool use, or any structured-output API where the model's output is validated against a JSON schema.

**Why:** when you're already inside a JSON channel, the wire format drops into the existing infrastructure. You get schema validation for free, and the wire format has several compact shortcuts designed to keep LLM emission concise.

**Compact example (uses all three shortcuts — see [Compact shortcuts](#compact-shortcuts) below):**

```json
{
  "action": "toggle",
  "roles": {
    "patient": { "type": "selector", "value": ".active" }
  },
  "trigger": { "event": "click" }
}
```

This is semantically identical to the verbose form:

```json
{
  "kind": "event-handler",
  "action": "on",
  "roles": { "event": { "type": "literal", "value": "click" } },
  "body": [
    {
      "kind": "command",
      "action": "toggle",
      "roles": { "patient": { "type": "selector", "value": ".active" } }
    }
  ]
}
```

The compact form is roughly half the tokens. Conformant parsers accept both forms.

See [JSON wire format](#json-wire-format) and [Compact shortcuts](#compact-shortcuts) below.

### When NOT to use LSE

LSE is not always the right choice. Prefer natural language when:

| Scenario                          | Use instead          |
| --------------------------------- | -------------------- |
| Single command in a chat response | Plain prose          |
| Explanatory / teaching content    | Natural language     |
| Non-imperative content            | Markdown, plain text |
| Open-ended creative output        | Unconstrained text   |

LSE is for **imperative command output that will be parsed and executed or inspected by a machine.** If the human is the final consumer, LSE is overkill.

## Bracket syntax format

```text
[action role:value role:value +flag ~negated-flag]
```

**Rules:**

1. Square brackets `[` `]` are required
2. Action (command name) comes first
3. Roles are `name:value` pairs separated by spaces
4. Flags use `+name` (enabled) or `~name` (disabled)
5. Nesting uses `body:[...]` for event handlers, conditionals, loops
6. Values can be: selectors (`.class`, `#id`), literals (`'string'`, `42`, `true`), references (`me`, `it`, `result`)

### Examples

**Simple commands:**

```text
[toggle patient:.active]
[add patient:.highlight destination:#output]
[put patient:'Hello World' destination:#message]
[set target::count patient:0]
[fetch source:/api/users destination:#user-list]
```

**Event handlers:**

```text
[on event:click body:[toggle patient:.active destination:me]]
[on event:mouseenter body:[add patient:.hover destination:me]]
```

**Compound (multi-step):**

```text
[on event:click body:[
  [add patient:.loading destination:me]
  [fetch source:/api/data destination:#results]
  [remove patient:.loading destination:me]
]]
```

**Conditionals:**

```text
[if condition:me.has(.active)
  then:[remove patient:.active destination:me]
  else:[add patient:.active destination:me]
]
```

### System prompt snippet (bracket syntax)

```text
When generating UI behavior, emit LSE (LokaScript Explicit Syntax) bracket notation.

Format: [action role:value ...]
- Actions: toggle, add, remove, show, hide, put, set, get, fetch, wait, send, log
- Roles: patient (what), destination (where to), source (where from), condition (filter)
- Values: .class, #id, 'string', 42, true, me, it, result
- Flags: +flag (true), ~flag (false)
- Nesting: body:[...] for event handlers

Examples:
  [toggle patient:.active destination:#menu]
  [on event:click body:[add patient:.highlight destination:me]]
  [fetch source:/api/users destination:#user-list]
  [if condition::count>0 then:[show patient:#results] else:[hide patient:#results]]
```

The role vocabulary shown above (`patient`, `destination`, `source`, `condition`) is the **UI-behavior vocabulary** — the reference vocabulary used by hyperscript. If your domain uses a different vocabulary (SQL, JSX, BDD, etc.), substitute the appropriate role names. See [vocabularies.md](vocabularies.md) for the full catalog.

## JSON wire format

The wire format is a single JSON representation with optional shortcuts for compactness. Both verbose and compact forms are conformant and produce the same semantic node.

### Minimal command

```json
{
  "action": "toggle",
  "roles": {
    "patient": { "type": "selector", "value": ".active" },
    "destination": { "type": "selector", "value": "#button" }
  }
}
```

This is a complete, valid LSE node. `kind` defaults to `"command"` when absent, so you don't need to include it for single commands.

### Event handler (verbose form)

```json
{
  "kind": "event-handler",
  "action": "on",
  "roles": { "event": { "type": "literal", "value": "click" } },
  "body": [
    {
      "kind": "command",
      "action": "toggle",
      "roles": { "patient": { "type": "selector", "value": ".active" } }
    }
  ]
}
```

### Event handler (compact form with `trigger` sugar)

```json
{
  "action": "toggle",
  "roles": { "patient": { "type": "selector", "value": ".active" } },
  "trigger": { "event": "click" }
}
```

See [Compact shortcuts](#compact-shortcuts) below for the complete list.

### Value shapes

| Value type | JSON shape                                                        |
| ---------- | ----------------------------------------------------------------- |
| selector   | `{ "type": "selector", "value": ".active" }`                      |
| literal    | `{ "type": "literal", "value": "hello", "dataType": "string" }`   |
| literal    | `{ "type": "literal", "value": 42, "dataType": "number" }`        |
| literal    | `{ "type": "literal", "value": true, "dataType": "boolean" }`     |
| literal    | `{ "type": "literal", "value": "500ms", "dataType": "duration" }` |
| reference  | `{ "type": "reference", "value": "me" }`                          |
| expression | `{ "type": "expression", "raw": "x + 1" }`                        |
| flag       | `{ "type": "flag", "name": "primary-key", "enabled": true }`      |

See [wire-format.md](../spec/wire-format.md) for the complete specification of all value shapes, node kinds (command, event-handler, compound, conditional, loop), and v1.2 features (annotations, diagnostics, match arms, async variants).

## Compact shortcuts

The wire format has three optional shortcuts designed to keep LLM-emitted JSON concise. All shortcuts are part of the canonical format — parsers MUST accept both verbose and compact forms. Renderers SHOULD emit verbose form by default (for maximum interoperability).

### Shortcut 1 — Optional `kind`

The `kind` field defaults to `"command"` when absent:

```json
{ "action": "toggle", "roles": { "patient": { "type": "selector", "value": ".active" } } }
```

Equivalent to:

```json
{
  "kind": "command",
  "action": "toggle",
  "roles": { "patient": { "type": "selector", "value": ".active" } }
}
```

Event handler (`kind: "event-handler"`) and compound (`kind: "compound"`) nodes still require explicit `kind` — their distinct structural requirements (`body`, `statements`) can't be inferred.

### Shortcut 2 — `trigger` sugar

The `trigger` field on a command node wraps it in an event handler. When `trigger` is present, the node is treated as an event handler regardless of `kind`:

```json
{
  "action": "toggle",
  "roles": { "patient": { "type": "selector", "value": ".active" } },
  "trigger": { "event": "click", "modifiers": { "once": true } }
}
```

This is roughly half the tokens of the verbose event-handler form, with identical semantics. It's the most common place LLMs benefit from a compact shortcut.

### Shortcut 3 — Value shorthand forms

Expression and flag values accept shorthand forms:

| Value type | Verbose form                                                 | Compact form                                 |
| ---------- | ------------------------------------------------------------ | -------------------------------------------- |
| Expression | `{ "type": "expression", "raw": "x + 1" }`                   | `{ "type": "expression", "value": "x + 1" }` |
| Flag       | `{ "type": "flag", "name": "primary-key", "enabled": true }` | `{ "type": "flag", "value": true }`          |

When the flag name is carried by the role key itself, the compact flag form is much more concise:

```json
{
  "action": "column",
  "roles": {
    "name": { "type": "literal", "value": "id" },
    "primary-key": { "type": "flag", "value": true }
  }
}
```

### System prompt snippet (JSON wire format)

```text
When generating UI behavior, emit LSE (LokaScript Explicit Syntax) as JSON.

Schema:
  {
    "action": "<command-name>",
    "roles": { "<role-name>": { "type": "<value-type>", "value": "..." } },
    "trigger": { "event": "<event-name>" }   // optional — wraps in event handler
  }

- Omit "kind" — it defaults to "command"
- Use "trigger" to attach an event handler instead of wrapping manually
- Value types: selector, literal, reference, expression, flag
- Actions: toggle, add, remove, show, hide, put, set, get, fetch, wait, send, log
- Roles: patient (what), destination (where to), source (where from), condition (filter)

Examples:
  { "action": "toggle", "roles": { "patient": { "type": "selector", "value": ".active" } } }
  { "action": "toggle", "roles": { "patient": { "type": "selector", "value": ".active" } }, "trigger": { "event": "click" } }
  { "action": "fetch", "roles": { "source": { "type": "literal", "value": "/api/users" }, "destination": { "type": "selector", "value": "#list" } } }
```

## Multi-node documents (envelope format)

For LSE documents containing multiple top-level nodes (e.g., a file with several event handlers), wrap the nodes in an envelope:

```json
{
  "lseVersion": "1.2.0",
  "nodes": [
    {
      "action": "toggle",
      "roles": { "patient": { "type": "selector", "value": ".active" } },
      "trigger": { "event": "click" }
    },
    {
      "action": "fetch",
      "roles": { "source": { "type": "literal", "value": "/api/users" } },
      "trigger": { "event": "load" }
    }
  ]
}
```

Single-node documents do NOT need the envelope — the bare node is valid LSE on its own.

## Validation

Both surface forms validate against the same schemas:

- **Bracket syntax:** the ABNF grammar at [spec/lokascript-explicit-syntax.abnf](../spec/lokascript-explicit-syntax.abnf)
- **JSON wire format:** the JSON Schema (Draft 7) at [spec/lse-wire-format.schema.json](../spec/lse-wire-format.schema.json)

All four reference parsers (TypeScript, Python, Go, Rust) accept both forms. The conformance test fixtures in [test-fixtures/](../test-fixtures/) include a dedicated `llm-simplified.json` suite (13 cases) that exercises the compact JSON shortcuts.

## Round-trip guarantee

LSE is designed for round-trip safety:

```text
parse("[toggle patient:.active]") → SemanticNode → render() → "[toggle patient:.active]"
```

This means LLMs can confidently emit LSE knowing that:

1. The output is deterministic (same input always produces the same node)
2. The output is normalizable (rendering produces a canonical form)
3. Validation is cheap (parse + schema check, no execution needed)

Within the JSON wire format, the round-trip guarantee applies to the verbose form. Compact shortcuts **parse** correctly but typically **render** back in the verbose form (parsers accept compact; renderers emit verbose by default). This means:

```text
compact_json → parse → node → render → verbose_json → parse → node  ✓ (same semantic)
```

If you need strict round-trip identity in the JSON channel, emit verbose form. If you need minimum token cost, emit compact form.

## Related tooling

The following are not part of the protocol layer — they live in the hyperfixi application layer — but they're commonly used with LLM emission and worth knowing about.

### MCP tools (hyperfixi)

The hyperfixi MCP server exposes tools that accept LSE:

- **`execute_lse`** — execute LSE directly via the hyperfixi runtime
- **`validate_lse`** — validate LSE without executing, return diagnostics
- **`translate_lse`** — translate LSE bracket syntax to natural language in any of 24 supported languages

All three accept bracket syntax input. See the hyperfixi docs for invocation details.

### `<lse-intent>` custom element (hyperfixi)

The `@hyperfixi/intent-element` package provides a `<lse-intent>` custom element that accepts protocol JSON (inline or from a `src` attribute) and executes it. Useful for shipping LLM-generated UI behavior without a full framework.

See `packages/intent-element/` for details.
