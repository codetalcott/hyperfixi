# @hyperfixi/mcp-server

MCP (Model Context Protocol) server for hyperscript and multilingual DSL development. Provides **80 tools**, 5 resources, and 3 prompts across 11 categories: validation, compilation, analysis, patterns, LSP bridge, language profiles, code generation, route extraction, 8 domain DSLs, IR conversion, and MCP sampling.

## Installation

### From Source

```bash
cd packages/mcp-server
npm install
npm run build
```

### Using npx

```bash
npx @hyperfixi/mcp-server
```

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

Or if installed globally:

```json
{
  "mcpServers": {
    "lokascript": {
      "command": "hyperfixi-mcp"
    }
  }
}
```

## Available Tools (80)

### Validation & Semantic Tools (8)

| Tool                   | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `validate_hyperscript` | Check hyperscript for syntax errors and role warnings            |
| `validate_schema`      | Validate internal command schema definitions (not user code)     |
| `suggest_command`      | Suggest the best command for a task (multilingual)               |
| `get_bundle_config`    | Get recommended bundle configuration based on usage              |
| `parse_multilingual`   | Parse hyperscript in any of 24 languages with confidence scoring |
| `translate_to_english` | Normalize non-English hyperscript to English + explicit syntax   |
| `explain_in_language`  | Explain code with grammar rules, roles, and translations         |
| `get_code_fixes`       | Get auto-fixes for specific error codes                          |

### Compilation & Code Generation (6)

| Tool                   | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `compile_hyperscript`  | Compile to optimized JavaScript (natural language, explicit, or JSON input) |
| `validate_and_compile` | Parse to semantic IR with diagnostics (no JS output)                        |
| `translate_code`       | High-fidelity translation with SVO/SOV/VSO grammar transformation           |
| `generate_tests`       | Generate Playwright behavior tests from hyperscript                         |
| `generate_component`   | Generate React, Vue, or Svelte component from hyperscript                   |
| `diff_behaviors`       | Compare two inputs for semantic equivalence                                 |

### Analysis (4)

| Tool                 | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `analyze_complexity` | Calculate cyclomatic, cognitive, and Halstead metrics         |
| `analyze_metrics`    | Detect code smells, quality issues, and patterns              |
| `explain_code`       | Plain English explanation for beginner/intermediate/expert    |
| `recognize_intent`   | Classify code purpose (dom-manipulation, form-handling, etc.) |

### Pattern Lookup (4)

| Tool                    | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `get_examples`          | Get working code examples matching a task description          |
| `search_patterns`       | Search pattern database by keyword or category                 |
| `translate_hyperscript` | Translate keywords between 24 languages (pattern substitution) |
| `get_pattern_stats`     | Get statistics about patterns and languages                    |

### LSP Bridge (4)

| Tool                   | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `get_diagnostics`      | LSP-compatible diagnostics with line/column positions   |
| `get_completions`      | Context-aware code completions (multilingual)           |
| `get_hover_info`       | Hover documentation for hyperscript elements            |
| `get_document_symbols` | Document outline (event handlers, behaviors, functions) |

### Language Documentation (4)

| Tool                       | Description                                             |
| -------------------------- | ------------------------------------------------------- |
| `get_command_docs`         | Documentation for a specific hyperscript command        |
| `get_expression_docs`      | Documentation for expression types                      |
| `search_language_elements` | Search commands, expressions, keywords, features, roles |
| `suggest_best_practices`   | Analyze code and suggest improvements                   |

### Language Profiles (5)

| Tool                        | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `list_supported_languages`  | List all 24 languages with metadata               |
| `get_language_profile`      | Full profile (keywords, markers, config)          |
| `get_keyword_translations`  | Translations of a keyword across languages        |
| `get_role_markers`          | Role markers (destination, source, patient, etc.) |
| `compare_language_profiles` | Find translation gaps between languages           |

### IR Conversion (2)

| Tool                | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `convert_format`    | Convert between explicit bracket syntax and LLM JSON |
| `validate_explicit` | Validate bracket syntax without compilation (fast)   |

### Route Extraction (2)

| Tool                     | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `extract_routes`         | Scan HTML for route declarations (hyperscript, htmx, fixi) |
| `generate_server_routes` | Generate Express/Hono/Django/FastAPI/OpenAPI scaffolding   |

### Cross-Domain Dispatch (4)

| Tool                | Description                                |
| ------------------- | ------------------------------------------ |
| `detect_domain`     | Auto-detect which domain handles an input  |
| `compile_auto`      | Auto-detect domain and compile in one shot |
| `parse_composite`   | Parse multi-line input across domains      |
| `compile_composite` | Compile multi-line input across domains    |

### MCP Sampling (5)

| Tool                | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `ask_claude`        | Ask Claude a question via MCP sampling                 |
| `summarize_content` | Summarize text content                                 |
| `analyze_content`   | Analyze sentiment, entities, themes, tone, or keywords |
| `translate_content` | Translate text between natural languages               |
| `execute_llm`       | Execute LLM command in natural language (8 languages)  |

### Domain DSL Tools (32)

8 domains, each with `parse_`, `compile_`, `validate_`, `translate_` tools:

| Domain         | Languages                      | compile Output                    |
| -------------- | ------------------------------ | --------------------------------- |
| `sql`          | en, es, ja, ar, ko, zh, tr, fr | SQL query string                  |
| `bdd`          | en, es, ja, ar                 | Playwright test (Given/When/Then) |
| `jsx`          | en, es, ja, ar, ko, zh, tr, fr | JSX/React markup                  |
| `todo`         | en, es, ja, ar, ko, zh, tr, fr | Structured operation object       |
| `behaviorspec` | en, es, ja, ar, ko, zh, tr, fr | Playwright interaction test       |
| `llm`          | en, es, ja, ar, ko, zh, tr, fr | LLMPromptSpec JSON                |
| `flow`         | en, es, ja, ar, ko, zh, tr, fr | Reactive data flow JS             |
| `voice`        | en, es, ja, ar, ko, zh, tr, fr | DOM interaction command           |

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
npm test           # Run tests (375 tests)
npm run typecheck  # TypeScript validation
npm run build      # Build
```

## License

MIT
