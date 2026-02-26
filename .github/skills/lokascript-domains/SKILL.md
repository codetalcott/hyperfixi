---
name: lokascript-domains
description: 'Parses, compiles, validates, and translates multilingual DSL commands across 8 domains (SQL, BDD, JSX, todos, testing, LLM prompts, data flow, voice). Use when user works with domain-specific commands in any of 24 supported languages, or needs cross-domain compilation, HATEOAS workflows, or LSE training data generation.'
---

# LokaScript Domain DSLs

8 multilingual domain-specific languages built on the LokaScript framework. Each domain exposes `parse`, `compile`, `validate`, and `translate` MCP tools.

## When to Use

- User writes SQL, BDD scenarios, JSX, todos, or LLM prompts in natural language
- User needs to translate domain commands between languages (en, es, ja, ar, ko, zh, tr, fr)
- User asks to generate Playwright tests from BDD or behavior specs
- User wants to compile natural language to target code (SQL, JSX, reactive JS)
- User works with HATEOAS/Siren APIs via FlowScript commands
- User needs LLM training data or feedback loops for LokaScript Explicit Syntax
- User wants server route scaffolding from HTML fetch/htmx/fixi attributes

## Workflow

### 1. Identify the Domain

If the domain is obvious (e.g., "write a SQL query"), skip to step 2. Otherwise:

```
detect_domain({ input: "select name from users", language: "en" })
```

### 2. Validate the Input

**Always validate before compiling** to catch syntax errors early:

```
validate_sql({ query: "select name from users", language: "en" })
  => { valid: true, errors: [] }
```

### 3. Compile or Translate

Compile to target code:

```
compile_sql({ query: "select name from users", language: "en" })
  => "SELECT name FROM users"
```

Or translate between languages:

```
translate_sql({ query: "select name from users", from: "en", to: "ja" })
```

### 4. For Multi-Domain Input

Use cross-domain tools when input spans multiple domains:

```
compile_composite({ input: "select name from users\ngiven #button exists", language: "en" })
```

## Domains

| Domain           | Commands                                                     | Languages                      | `compile_{name}` Output            |
| ---------------- | ------------------------------------------------------------ | ------------------------------ | ---------------------------------- |
| **sql**          | SELECT, INSERT, UPDATE, DELETE                               | en, es, ja, ar, ko, zh, tr, fr | SQL query string                   |
| **bdd**          | GIVEN, WHEN, THEN                                            | en, es, ja, ar                 | Playwright test                    |
| **jsx**          | element, component, fragment                                 | en, es, ja, ar, ko, zh, tr, fr | JSX/React markup                   |
| **todo**         | add, complete, remove, list                                  | en, es, ja, ar, ko, zh, tr, fr | Structured operation object        |
| **behaviorspec** | given, when, then (pages)                                    | en, es, ja, ar, ko, zh, tr, fr | Playwright interaction test        |
| **llm**          | ask, summarize, analyze, translate                           | en, es, ja, ar, ko, zh, tr, fr | LLMPromptSpec JSON                 |
| **flow**         | fetch, poll, stream, submit, enter, follow, perform, capture | en, es, ja, ar, ko, zh, tr, fr | Reactive JS / HATEOAS WorkflowSpec |
| **voice**        | click, scroll, type, navigate                                | en, es, ja, ar, ko, zh, tr, fr | DOM interaction command            |

## MCP Tools

### Per-Domain (4 tools per domain)

Every domain generates 4 tools following the pattern `{operation}_{domain}`:

| Tool                 | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `parse_{domain}`     | Parse to semantic representation (action, roles, confidence) |
| `compile_{domain}`   | Compile to target code                                       |
| `validate_{domain}`  | Check syntax, returns `{ valid, errors[] }`                  |
| `translate_{domain}` | Translate between natural languages                          |

### Cross-Domain

| Tool                | When to Use                                   |
| ------------------- | --------------------------------------------- |
| `detect_domain`     | Domain is ambiguous -- auto-detect from input |
| `compile_auto`      | Quick one-shot: auto-detect domain + compile  |
| `parse_composite`   | Multi-line input spanning multiple domains    |
| `compile_composite` | Compile multi-line multi-domain input         |

### LLM Sampling

| Tool                | When to Use                                    |
| ------------------- | ---------------------------------------------- |
| `execute_llm`       | Compile LLM command + execute via MCP sampling |
| `ask_claude`        | Direct sampling shortcut                       |
| `summarize_content` | Summarize via sampling                         |
| `analyze_content`   | Analyze via sampling                           |
| `translate_content` | Translate via sampling                         |

### LSE Pipeline (LLM Round-Trip)

| Tool                   | When to Use                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| `lse_from_hyperscript` | Parse hyperscript (any of 24 languages) to LSE bracket + protocol JSON |
| `lse_to_hyperscript`   | Validate/compile LSE from an LLM response back to JavaScript           |

Typical round-trip: `lse_from_hyperscript` → LLM modifies LSE → `lse_to_hyperscript` → get compiled JS.

### LSE Training & Feedback

| Tool                        | When to Use                                       |
| --------------------------- | ------------------------------------------------- |
| `generate_training_data`    | Synthesize (natural_language, LSE) JSONL pairs    |
| `lse_validate_and_feedback` | Validate LSE input with structured error feedback |
| `lse_pattern_stats`         | Hit-rate statistics by command/language           |

### Server Routes

| Tool                     | When to Use                                          |
| ------------------------ | ---------------------------------------------------- |
| `extract_routes`         | Scan HTML for route declarations (fetch, hx-_, fx-_) |
| `generate_server_routes` | Generate Express/Hono/Django/FastAPI/OpenAPI code    |

## Common Mistakes

1. **Omitting `language` parameter** -- always pass it; defaults vary by domain
2. **Guessing the domain** -- use `detect_domain` when unsure rather than picking wrong tools
3. **Skipping validation** -- `compile_*` may produce incorrect output from malformed input; validate first
4. **Wrong tool granularity** -- `compile_auto` is convenient but less precise; prefer domain-specific tools when domain is known
5. **HATEOAS command order** -- `enter`/`follow`/`perform`/`capture` are sequential pipeline steps; order matters

## References

- [HATEOAS & FlowScript Runtime](./references/hateoas-flow.md) -- WorkflowSpec, Siren adapters, MCP dynamic tools
- [LSE Integration](./references/lse-integration.md) -- Training data, feedback loops, registry methods
- [Domain Examples](./references/domain-examples.md) -- Detailed examples for each domain
