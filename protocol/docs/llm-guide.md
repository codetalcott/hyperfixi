# LSE for LLMs: Emission Guide

When building AI tools that generate UI behaviors, LSE bracket syntax provides a reliable,
structured format that is easy for LLMs to produce and for runtimes to execute.

## When to Emit LSE vs Natural Language

| Scenario                       | Recommended Format | Why                                 |
| ------------------------------ | ------------------ | ----------------------------------- |
| Multi-step behaviors           | LSE                | Unambiguous structure               |
| Cross-language targets         | LSE                | Language-independent                |
| Validated output needed        | LSE                | Machine-parseable, schema-validated |
| Single command, known language | Natural language   | Simpler for the user to read        |
| Exploratory / explanation      | Natural language   | More readable                       |

## LSE Bracket Syntax

```text
[action role:value role:value +flag ~negated-flag]
```

**Rules:**

1. Square brackets `[` `]` are required
2. Action (command name) comes first
3. Roles are `name:value` pairs separated by spaces
4. Flags use `+` (true) or `~` (negated)
5. Nesting uses `body:[...]` for event handlers, conditionals, loops
6. Values can be: selectors (`.class`, `#id`), literals (`'string'`, `42`), references (`me`, `it`)

## Examples

### Simple Commands

```text
[toggle patient:.active]
[add patient:.highlight destination:#output]
[put patient:'Hello World' destination:#message]
[set target::count patient:0]
[fetch source:/api/users destination:#user-list]
```

### Event Handlers

```text
[on event:click body:[toggle patient:.active destination:me]]
[on event:mouseenter body:[add patient:.hover destination:me]]
```

### Compound (multi-step)

```text
[on event:click body:[
  [add patient:.loading destination:me]
  [fetch source:/api/data destination:#results]
  [remove patient:.loading destination:me]
]]
```

### Conditionals

```text
[if condition:me.has(.active)
  then:[remove patient:.active destination:me]
  else:[add patient:.active destination:me]
]
```

## System Prompt Snippet

Use this in your LLM system prompt to teach it to emit valid LSE:

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

## MCP Tools

Three MCP tools are available for LLM integration:

### `execute_lse`

Execute LSE directly. Returns compiled JavaScript.

```json
{
  "tool": "execute_lse",
  "arguments": {
    "lse": "[toggle patient:.active destination:#menu]"
  }
}
```

### `validate_lse`

Validate LSE without executing. Returns diagnostics.

```json
{
  "tool": "validate_lse",
  "arguments": {
    "lse": "[toggle patient:.active]"
  }
}
```

### `translate_lse`

Translate LSE to natural language in any of 24 supported languages.

```json
{
  "tool": "translate_lse",
  "arguments": {
    "lse": "[toggle patient:.active destination:#button]",
    "language": "ja"
  }
}
```

## Wire Format (JSON)

For structured tool output, use the JSON wire format:

```json
{
  "version": "1.2.0",
  "node": {
    "kind": "command",
    "action": "toggle",
    "roles": {
      "patient": { "type": "selector", "value": ".active" },
      "destination": { "type": "selector", "value": "#button" }
    }
  }
}
```

See [wire-format.md](../spec/wire-format.md) for the complete specification and
[lse-wire-format.schema.json](../spec/lse-wire-format.schema.json) for the JSON Schema.

## Round-Trip Guarantee

LSE is designed for round-trip safety:

```
parse("[toggle patient:.active]") → SemanticNode → render() → "[toggle patient:.active]"
```

This means LLMs can confidently emit LSE knowing that:

1. The output is deterministic (same input always produces the same node)
2. The output is normalizable (rendering always produces canonical form)
3. Validation is cheap (parse + schema check, no execution needed)
