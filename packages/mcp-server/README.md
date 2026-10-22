# @hyperfixi/mcp-server

MCP (Model Context Protocol) server for hyperscript and multilingual DSL development. A connection lists **14 tools** by default (**89** defined): the agent loop below, translation, and proof that a change kept its meaning. The rest come in eight [toolsets](#toolsets), listed when `LOKASCRIPT_MCP_TOOLSETS` names them: **84** with every toolset (the 5 MCP-sampling tools also need `LOKASCRIPT_MCP_LLM_TOOLS=1`). Plus **9 resources** and **9 prompts**.

## The agent loop

The headline use case: an LLM agent emitting hyperscript instead of free-form JavaScript, with every check done by a real parser, including the engine that runs the code — deterministic, instant, no LLM in the checker. The server advertises this loop via MCP `instructions`, so a connected agent gets it without reading docs:

1. **`validate_and_compile`** — parse the candidate into semantic IR with diagnostics; check the returned action/roles/trigger against intent.
2. **Repair** — apply the diagnostics and re-validate. `get_code_fixes` maps coded errors to concrete fixes; `get_command_docs` / `search_patterns` show correct usage. Failed results carry a next-step hint block.
3. **Use it** — once valid, the hyperscript goes in an `_="..."` attribute as is. (`compile_hyperscript`, which emitted JavaScript through the AOT compiler, retired with it in 4.0.)

To present code to a human, `translate_code` renders it in any of 24 languages via deterministic grammar transformation, `diff_behaviors` compares two snippets command by command and role by role, and `score_fidelity` scores a candidate against a reference — including across languages — naming exactly what is missing or hallucinated. See the repo-root [AGENTS.md](../../AGENTS.md) for a worked end-to-end example.

## Protocol Support

Built on the MCP TypeScript SDK v2 (`@modelcontextprotocol/server`) and serves **both protocol eras** on every stdio connection:

- **`2026-07-28` (stateless):** `server/discover` answered cold, `resultType` on every result, and cache hints (`ttlMs: 3600000`, `cacheScope: "public"`) on `tools/list`, `prompts/list`, `resources/list`, and `resources/read`.
- **Legacy (`initialize` handshake):** current clients (Claude Code, Claude Desktop) connect this way; nothing changes for them.

The five sampling tools (`ask_claude`, `summarize_content`, `analyze_content`, `translate_content`, `execute_llm`) depend on MCP sampling, which revision `2026-07-28` deprecates — they work on legacy-era connections whose client advertises the sampling capability and return a clear error elsewhere. **They are also opt-in:** they invoke a generic LLM, which a connected agent can do itself, so they are hidden from `tools/list` and refuse calls unless the server is started with `LOKASCRIPT_MCP_LLM_TOOLS=1`.

## Installation

### From Source

```bash
cd packages/mcp-server
npm install
npm run build
```

### Using npx

```bash
npx -y @hyperfixi/mcp-server
```

This installs the engine (`@hyperfixi/engine`) with the server, so English is checked by the
parser that runs it. (Until 7.5.0 the engine was an optional peer that `npx` left out: every
error only the engine catches came back `ok`, and only stderr said so.) A result whose engine
check could not run carries `ENGINE_CHECK_SKIPPED` (`info`), and `get_diagnostics` an
`engine-check-skipped` note.

## Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "lokascript": {
      "command": "node",
      "args": ["/path/to/hyperfixi/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Or if installed globally, with two [toolsets](#toolsets) listed besides the core tools:

```json
{
  "mcpServers": {
    "lokascript": {
      "command": "hyperfixi-mcp",
      "env": { "LOKASCRIPT_MCP_TOOLSETS": "domains,lse" }
    }
  }
}
```

## Core Tools (14)

What a default connection lists: the deterministic checks an agent cannot do for itself.

| Tool                       | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| `validate_and_compile`     | Parse to semantic IR with diagnostics; natural language also on the engine |
| `get_diagnostics`          | LSP-compatible diagnostics with positions; a fix for a misspelled command  |
| `get_code_fixes`           | Concrete fixes for each diagnostic code validate_and_compile emits         |
| `get_command_docs`         | Documentation for a specific hyperscript command                           |
| `get_expression_docs`      | Documentation for expression types                                         |
| `search_patterns`          | Search the pattern database by keyword or category                         |
| `translate_code`           | Translation in each language's word order, verified against the source     |
| `translate_to_english`     | Normalize non-English hyperscript to English + explicit syntax             |
| `get_keyword_translations` | Translations of a keyword across languages                                 |
| `list_supported_languages` | List all 24 languages with metadata                                        |
| `score_fidelity`           | Score a candidate against a reference: recall/precision/role/value signals |
| `diff_behaviors`           | Compare two inputs for semantic equivalence                                |
| `detect_domain`            | Auto-detect which domain DSL handles an input                              |
| `compile_auto`             | Auto-detect the domain and compile in one shot                             |

## Toolsets

Every other tool belongs to a toolset. `LOKASCRIPT_MCP_TOOLSETS` names the toolsets to list, comma-separated (`domains,lse`), or `all`; the server's startup line on stderr says which are on and warns about a name it does not know. Only the LIST changes: a tool answers a call by name whether or not it is listed. **84** with every toolset; the 5 MCP-sampling tools below also need `LOKASCRIPT_MCP_LLM_TOOLS=1`.

| Toolset    | Tools | What it holds                                                                 |
| ---------- | ----- | ----------------------------------------------------------------------------- |
| `domains`  | 26    | `parse_`/`compile_`/`validate_`/`translate_` for each domain DSL, composites  |
| `lse`      | 13    | LSE bracket syntax and protocol JSON: conversion, envelopes, feedback, data   |
| `grail`    | 5     | GRAIL condition/affordance workflows (reads `grail.yaml` in the server's dir) |
| `debug`    | 4     | Explain a handler; reason over debug snapshots you assemble                   |
| `editor`   | 3     | Completions, hover and document symbols (what the language server does)       |
| `analysis` | 9     | Complexity, metrics, intent, explanations, examples, suggestions              |
| `profiles` | 5     | Language profiles, role markers, schema validation, pattern stats             |
| `project`  | 5     | Scan a project for hyperscript and htmx, extract server routes, bundle advice |

Before toolsets (through 7.2.0) every tool was listed: 84 definitions, about 13k tokens in each client that loads them all, of which a month of sessions called 7.

### `domains` (26)

Each of the 6 domains exposes `parse_`, `compile_`, `validate_`, and `translate_` tools (6 × 4 = 24), and two tools read input that mixes domains:

| Tool                | Description                             |
| ------------------- | --------------------------------------- |
| `parse_composite`   | Parse multi-line input across domains   |
| `compile_composite` | Compile multi-line input across domains |

bdd's tools left with domains 4.2.0 and bdd itself with domains 5.0.0: behaviorspec reads its preconditions, actions and assertions. learn's left with domains 7.1.0: it moved into lokascript-learn, its only user, and its commanding sentence was `translate_code`'s. Language coverage comes in two tiers:

- **Bridge (11):** en, es, ja, ar, ko, zh, tr, fr, de, pt, ru
- **Classic (8):** en, es, ja, ar, ko, zh, tr, fr

| Domain         | Languages   | compile Output              |
| -------------- | ----------- | --------------------------- |
| `sql`          | Bridge (11) | SQL query string            |
| `todo`         | Bridge (11) | Structured operation object |
| `behaviorspec` | Classic (8) | Playwright interaction test |
| `llm`          | Bridge (11) | LLMPromptSpec JSON          |
| `flow`         | Bridge (11) | Reactive data flow JS       |
| `voice`        | Bridge (11) | DOM interaction command     |

### `lse` (13)

| Tool                           | Description                                                       |
| ------------------------------ | ----------------------------------------------------------------- |
| `lse_from_hyperscript`         | Parse hyperscript (24 languages) to LSE bracket + protocol JSON   |
| `lse_to_hyperscript`           | Validate and normalize LSE or protocol JSON returned by an LLM    |
| `validate_lse`                 | Validate LSE or protocol JSON without executing (pre-flight)      |
| `translate_lse`                | Translate LSE bracket syntax to natural language (24 languages)   |
| `convert_format`               | Convert between explicit bracket syntax and LLM JSON              |
| `validate_explicit`            | Validate bracket syntax without compilation (fast)                |
| `validate_protocol`            | Validate protocol JSON against the LSE 2.0 schema                 |
| `to_envelope`                  | Wrap a node/protocol in a transport envelope                      |
| `from_envelope`                | Unwrap an envelope back to a node/protocol                        |
| `lse_validate_and_feedback`    | Validate LSE and return machine-actionable correction hints       |
| `lse_pattern_stats`            | Pattern hit-rate stats: success by command/language, top failures |
| `lse_generate_with_correction` | Stateless LSE generation + self-correction loop (prompt/schema)   |
| `generate_training_data`       | Synthesize (natural language, LSE) pairs from schemas as JSONL    |

### `grail` (5)

Workflow orchestration over a `grail.yaml` in the server's working directory: evaluate conditions, plan dependency-ordered steps, and execute actions with precondition checks, cost-aware planning, and drift detection. See **[GRAIL.md](GRAIL.md)** for the schema and examples.

| Tool          | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `grail_check` | Evaluate conditions, show available/blocked affordances        |
| `grail_plan`  | Compute dependency-ordered plan for a goal affordance          |
| `grail_run`   | Execute an affordance with precondition and confirmation gates |
| `grail_info`  | Return full workflow graph (conditions, affordances, enables)  |
| `grail_list`  | List all condition and affordance names                        |

### `debug` (4)

Nothing in the engine emits a debug snapshot: the snapshot tools reason over one you assemble (the element, the command, the variables at a `breakpoint` or from `log`).

| Tool                     | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `debug_explain_handler`  | Break down an event handler step-by-step; flag issues and breakpoints |
| `debug_analyze_snapshot` | Explain a captured execution state and predict the next step          |
| `debug_suggest_fix`      | Analyze a snapshot where something went wrong; suggest causes + fixes |
| `debug_trace_variable`   | Trace how a variable changed across an execution-history snapshot set |

### `editor` (3)

| Tool                   | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `get_completions`      | Context-aware code completions (multilingual)           |
| `get_hover_info`       | Hover documentation for hyperscript elements            |
| `get_document_symbols` | Document outline (event handlers, behaviors, functions) |

### `analysis` (9)

| Tool                       | Description                                                   |
| -------------------------- | ------------------------------------------------------------- |
| `explain_code`             | Each step in the order it runs, with what it does             |
| `analyze_complexity`       | Calculate cyclomatic, cognitive, and Halstead metrics         |
| `analyze_metrics`          | Detect code smells, quality issues, and patterns              |
| `recognize_intent`         | Classify code purpose (dom-manipulation, form-handling, etc.) |
| `suggest_best_practices`   | Analyze code and suggest improvements                         |
| `search_language_elements` | Search commands, expressions, keywords, features, roles       |
| `suggest_command`          | Suggest the best command for a task (multilingual)            |
| `explain_in_language`      | Explain code with grammar rules, roles, and translations      |
| `get_examples`             | Get working code examples matching a task description         |

### `profiles` (5)

| Tool                        | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `get_language_profile`      | Full profile (keywords, markers, config)                     |
| `get_role_markers`          | Role markers (destination, source, patient, etc.)            |
| `compare_language_profiles` | Find translation gaps between languages                      |
| `validate_schema`           | Validate internal command schema definitions (not user code) |
| `get_pattern_stats`         | Get statistics about patterns and languages                  |

### `project` (5)

| Tool                     | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `scan_inventory`         | Scan a directory for hyperscript (`_=`), htmx (`hx-*`), fixi (`fx-*`) |
| `query_inventory`        | Search and filter within previously scanned inventory results         |
| `extract_routes`         | Scan HTML for route declarations (hyperscript, htmx, fixi)            |
| `generate_server_routes` | Generate Express/Hono/Django/FastAPI/OpenAPI scaffolding              |
| `get_bundle_config`      | Get recommended bundle configuration based on usage                   |

### MCP Sampling (5): opt-in via `LOKASCRIPT_MCP_LLM_TOOLS=1`

Not a toolset: hidden from the list AND refused when called unless the flag is set (see [Protocol Support](#protocol-support)).

| Tool                | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `ask_claude`        | Ask Claude a question via MCP sampling                 |
| `summarize_content` | Summarize text content                                 |
| `analyze_content`   | Analyze sentiment, entities, themes, tone, or keywords |
| `translate_content` | Translate text between natural languages               |
| `execute_llm`       | Execute LLM command in natural language (8 languages)  |

## Available Resources (5)

| URI                              | Description                  |
| -------------------------------- | ---------------------------- |
| `hyperscript://docs/commands`    | Command reference (markdown) |
| `hyperscript://docs/expressions` | Expression syntax guide      |
| `hyperscript://docs/events`      | Event handling reference     |
| `hyperscript://examples/common`  | Common patterns              |
| `hyperscript://languages`        | Supported languages (JSON)   |

## Supported Languages (24)

| Language       | Code | Word Order | Example               |
| -------------- | ---- | ---------- | --------------------- |
| English        | `en` | SVO        | `toggle .active`      |
| Japanese       | `ja` | SOV        | `.active を 切り替え` |
| Korean         | `ko` | SOV        | `.active 를 토글`     |
| Spanish        | `es` | SVO        | `alternar .active`    |
| Arabic         | `ar` | VSO        | `تبديل .active`       |
| Chinese        | `zh` | SVO        | `切换 .active`        |
| Turkish        | `tr` | SOV        | `.active değiştir`    |
| French         | `fr` | SVO        | `basculer .active`    |
| German         | `de` | SVO        | `umschalten .active`  |
| Portuguese     | `pt` | SVO        | `alternar .active`    |
| And 14 more... |      |            |                       |

## Development

```bash
npm run dev        # Development mode
npm test           # Run tests (420 tests)
npm run typecheck  # TypeScript validation
npm run build      # Build
```

## License

MIT
