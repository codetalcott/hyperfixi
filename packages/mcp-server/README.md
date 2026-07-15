# @hyperfixi/mcp-server

MCP (Model Context Protocol) server for hyperscript and multilingual DSL development. Provides **107 tools**, **9 resources**, and **9 prompts** spanning: GRAIL workflow orchestration, validation, compilation, analysis, patterns, LSP bridge, language profiles, code generation, route extraction, 9 domain DSLs, IR conversion, cross-domain dispatch, MCP sampling, AI-assisted debugging, template inventory, and the LSE round-trip pipeline.

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

## GRAIL Workflow Tools (5)

5 stable tools for Claude-native workflow orchestration: evaluate conditions, plan dependency-ordered steps, and execute actions with precondition checks, cost-aware planning, and drift detection.

| Tool          | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `grail_check` | Evaluate conditions, show available/blocked affordances        |
| `grail_plan`  | Compute dependency-ordered plan for a goal affordance          |
| `grail_run`   | Execute an affordance with precondition and confirmation gates |
| `grail_info`  | Return full workflow graph (conditions, affordances, enables)  |
| `grail_list`  | List all condition and affordance names                        |

See **[GRAIL.md](GRAIL.md)** for full documentation, schema reference, and examples.

## Available Tools

The **102** tools below, plus the **5** GRAIL tools above, total **107**.

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

### IR Conversion (5)

| Tool                | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `convert_format`    | Convert between explicit bracket syntax and LLM JSON |
| `validate_explicit` | Validate bracket syntax without compilation (fast)   |
| `validate_protocol` | Validate protocol JSON against the LSE 2.0 schema    |
| `to_envelope`       | Wrap a node/protocol in a transport envelope         |
| `from_envelope`     | Unwrap an envelope back to a node/protocol           |

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

### AI-Assisted Debugging (4)

| Tool                     | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `debug_analyze_snapshot` | Explain the current paused debugger state and predict the next step   |
| `debug_explain_handler`  | Break down an event handler step-by-step; flag issues and breakpoints |
| `debug_suggest_fix`      | Analyze a snapshot where something went wrong; suggest causes + fixes |
| `debug_trace_variable`   | Trace how a variable changed across an execution-history snapshot set |

### Template Inventory (2)

| Tool              | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `scan_inventory`  | Scan a directory for hyperscript (`_=`), htmx (`hx-*`), fixi (`fx-*`) |
| `query_inventory` | Search and filter within previously scanned inventory results         |

### Training Data (1)

| Tool                     | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `generate_training_data` | Synthesize (natural language, LSE) pairs from schemas as JSONL |

### Feedback Loop (2)

| Tool                        | Description                                                       |
| --------------------------- | ----------------------------------------------------------------- |
| `lse_validate_and_feedback` | Validate LSE and return machine-actionable correction hints       |
| `lse_pattern_stats`         | Pattern hit-rate stats: success by command/language, top failures |

### LSE Pipeline (5)

| Tool                   | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `lse_from_hyperscript` | Parse hyperscript (24 languages) to LSE bracket + protocol JSON |
| `lse_to_hyperscript`   | Validate/compile LSE or protocol JSON returned by an LLM        |
| `execute_lse`          | Parse LSE, compile to JS, and return the execution result       |
| `validate_lse`         | Validate LSE or protocol JSON without executing (pre-flight)    |
| `translate_lse`        | Translate LSE bracket syntax to natural language (24 languages) |

### LSE Correction (1)

| Tool                           | Description                                                     |
| ------------------------------ | --------------------------------------------------------------- |
| `lse_generate_with_correction` | Stateless LSE generation + self-correction loop (prompt/schema) |

### Domain DSL Tools (36)

Each of the 9 domains exposes `parse_`, `compile_`, `validate_`, and `translate_` tools (9 × 4 = 36). Language coverage comes in three tiers:

- **Bridge (11):** en, es, ja, ar, ko, zh, tr, fr, de, pt, ru
- **Classic (8):** en, es, ja, ar, ko, zh, tr, fr
- **Learn (10):** Bridge minus ru

| Domain         | Languages   | compile Output                    |
| -------------- | ----------- | --------------------------------- |
| `sql`          | Bridge (11) | SQL query string                  |
| `bdd`          | Classic (8) | Playwright test (Given/When/Then) |
| `jsx`          | Bridge (11) | JSX/React markup                  |
| `todo`         | Bridge (11) | Structured operation object       |
| `behaviorspec` | Classic (8) | Playwright interaction test       |
| `llm`          | Bridge (11) | LLMPromptSpec JSON                |
| `flow`         | Bridge (11) | Reactive data flow JS             |
| `voice`        | Bridge (11) | DOM interaction command           |
| `learn`        | Learn (10)  | Rendered sentence w/ morphology   |

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
