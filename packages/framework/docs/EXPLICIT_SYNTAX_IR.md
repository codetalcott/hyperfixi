# The Explicit Syntax IR

The Explicit Syntax is a **language-agnostic, role-labeled intermediate representation** for imperative commands. It serves as the universal interchange format between LokaScript components.

```
[toggle patient:.active destination:#button]
[select patient:name source:users condition:age>25]
[ask patient:"summarize this" source:#article manner:bullets]
```

## Properties

| Property              | Description                                   |
| --------------------- | --------------------------------------------- |
| **Language-agnostic** | No word order, no particles, no prepositions  |
| **Self-documenting**  | Every value is labeled with its semantic role |
| **Machine-readable**  | Trivial to parse: `[action role:value ...]`   |
| **LLM-friendly**      | Structured enough for reliable generation     |
| **Human-readable**    | Developers can read and write it directly     |
| **Roundtrip-safe**    | `parse -> render -> parse` is identity        |
| **Domain-portable**   | Same format works for any domain's schemas    |
| **Diffable**          | Behavior comparison operates on explicit form |
| **Cacheable**         | Canonical form is the semantic cache key      |

## Universal Interchange

Every tool speaks the same language. The explicit syntax is the **protocol** between components, not just an internal representation.

```
Natural Language (24 languages)  ---+
Explicit Syntax IR                  +---> SemanticNode (Map<role, value>)
LLM JSON { action, roles }      ---+             |
                                                  v
                       compile / generate_tests / generate_component / diff
                                                  |
                        +-----------+-------------+------------+
                        v           v             v            v
                   JavaScript   Playwright   React/Vue/Svelte  ...
```

**Input paths:**

- `"toggle .active on #button"` (English) -> parser -> SemanticNode
- `"#button の .active を 切り替え"` (Japanese) -> parser -> SemanticNode
- `[toggle patient:.active destination:#button]` (Explicit) -> parser -> SemanticNode
- `{ action: "toggle", roles: { patient: ".active" } }` (LLM JSON) -> normalize -> SemanticNode

All arrive at the same canonical internal form.

## The Same Intent Across 6 Domains

The explicit syntax works identically for any imperative domain:

| Explicit Syntax                             | Domain       | Compiled Output                                     |
| ------------------------------------------- | ------------ | --------------------------------------------------- |
| `[select patient:name source:users]`        | SQL          | `SELECT name FROM users`                            |
| `[add item:milk list:groceries]`            | Todo         | `{"action":"add","item":"milk","list":"groceries"}` |
| `[ask patient:"summarize" source:#article]` | LLM          | MCP sampling prompt spec                            |
| `[given patient:#button condition:exists]`  | BDD          | Playwright assertion                                |
| `[element tag:div patient:app]`             | JSX          | `<div className="app" />`                           |
| `[given patient:page source:/home]`         | BehaviorSpec | Playwright test suite                               |

Each domain defines its own **command schemas** with roles, but they all share the same explicit syntax format and the same parsing/compilation pipeline.

## Three Equivalent Representations

Every intent can be expressed in three ways. All three normalize to the same `SemanticNode`:

### 1. Natural Language (24 languages)

```
English:  toggle .active on #button
Japanese: #button の .active を 切り替え
Spanish:  alternar .active en #button
Arabic:   بدّل .active على #button
```

### 2. Explicit Syntax (language-agnostic)

```
[toggle patient:.active destination:#button]
```

### 3. LLM JSON (machine-friendly)

```json
{
  "action": "toggle",
  "roles": {
    "patient": { "type": "selector", "value": ".active" },
    "destination": { "type": "selector", "value": "#button" }
  }
}
```

## Common Semantic Roles

| Role             | Meaning             | Example                        |
| ---------------- | ------------------- | ------------------------------ |
| `patient`        | What to act on      | `.active`, `name`, `#article`  |
| `destination`    | Where to put/target | `#button`, `#output`, `users`  |
| `source`         | Where to get from   | `#input`, `/api/data`, `users` |
| `condition`      | When/if constraint  | `age>25`, `exists`             |
| `quantity`       | How much/many       | `5`, `3 times`                 |
| `manner`/`style` | How (style/format)  | `fade`, `bullets`, `json`      |
| `method`         | Protocol/technique  | `GET`, `websocket`             |
| `event`          | Trigger             | `click`, `load`, `submit`      |

Each command defines which roles it accepts. Use `get_command_docs` to see the specific roles for any command.

## Cross-Domain MCP Tools

Three MCP tools leverage the explicit syntax for cross-domain operations:

- **`detect_domain`** -- Auto-detect which domain handles an input: `"select name from users"` -> `{ domain: "sql", confidence: 0.95 }`
- **`parse_composite`** -- Parse multi-line input where each line may belong to a different domain
- **`compile_auto`** -- Detect the domain and compile in one shot

Per-domain tools (`parse_sql`, `compile_bdd`, etc.) are auto-generated for all 6 domains.

## Building a New Domain

Any imperative domain -- any domain where you "do X to Y with Z" -- can be expressed in the explicit syntax. The `@lokascript/framework` package provides everything needed:

1. Define command schemas with `defineCommand()` / `defineRole()`
2. Add language profiles with keyword translations
3. Implement a code generator (`SemanticNode -> target code`)
4. Call `createMultilingualDSL()` -- you get parsing, validation, compilation, and translation in all configured languages

See [DOMAIN_AUTHOR_GUIDE.md](./DOMAIN_AUTHOR_GUIDE.md) for the complete walkthrough.
