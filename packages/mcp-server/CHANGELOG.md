# Changelog

All notable changes to `@hyperfixi/mcp-server` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Dispatch:** `execute_lse`, `validate_lse`, and `translate_lse` were advertised
  in `ListTools` and implemented in `handleLsePipelineTool`, but the `CallTool`
  router only forwarded two of the five LSE-pipeline tools — the three LSE 2.0
  tools returned `Unknown tool` when called. All five now route.
- **Server version:** the MCP `serverInfo.version` was hardcoded to `1.0.0` for
  the entire 2.x line; it now reads from `package.json`, so it can't drift on
  release bumps.

### Changed

- README refreshed to match the implementation: tool count 80 → **107**,
  resources 5 → **9**, prompts 3 → **9**, domains 8 → **9** (adds `learn`),
  corrected per-domain language tiers, and documented previously-omitted tool
  families (debug, inventory, training-data, feedback, LSE pipeline/correction,
  and the three additional IR/envelope tools).

## [2.7.2] - 2026-07-08

Consolidated summary of the 2.x line (2.0.0 shipped 2026-02-11). Patch releases
tracked the monorepo-wide version; the highlights relevant to this package:

### Added

- **GRAIL workflow tools (5)** — `grail_check` / `grail_plan` / `grail_run` /
  `grail_info` / `grail_list` for Claude-native workflow orchestration.
- **LSE round-trip pipeline** — `lse_from_hyperscript`, `lse_to_hyperscript`,
  plus the LSE 2.0 LLM-native tools `execute_lse` / `validate_lse` /
  `translate_lse` (#624).
- **`learn` domain** — 9th domain DSL (language-learning sentence patterns),
  bringing generated domain tools to 36.
- **Cross-domain dispatch** — `detect_domain`, `compile_auto`, `parse_composite`,
  `compile_composite`.
- **AI-assisted debugging** (`debug_*`), **template inventory**
  (`scan_inventory` / `query_inventory`), and **training-data** / **feedback-loop**
  tools.
- IR/envelope tools `validate_protocol`, `to_envelope`, `from_envelope`.

### Changed

- Domain language coverage widened to the 11-language "bridge" set for
  sql/jsx/todo/llm/flow/voice (bdd/behaviorspec remain 8, learn is 10) via the
  bridge arc (#615).
- Domain registration extracted to the shared `@lokascript/domain-config`
  package; `domain-registry-setup.ts` is now a re-export shim.
- Package scope settled as `@hyperfixi/mcp-server` (engine packages publish under
  `@hyperfixi/*`, multilingual packages under `@lokascript/*`).

Tool count grew from 22 (1.0.0) to **107** across this line.

## [1.0.0] - 2025-01-19

### Added

- Model Context Protocol server for LLM integration
- 22 tools for hyperscript development assistance
- 5 resources for documentation and examples
- Full multilingual support (23 languages)
- LSP-compatible features (diagnostics, completions, hover info)
- Code analysis and complexity metrics
- Pattern database search and lookup
- Semantic parsing and translation
- Schema validation for command designs
- Language profile management
- Expression documentation
- Command documentation with usage examples
- Keyword translation lookup across languages
- Auto-fix suggestions for common errors
- Best practices recommendations
- Natural language intent recognition

### Tools Provided

1. `analyze_complexity` - Calculate cyclomatic, cognitive, Halstead metrics
2. `analyze_metrics` - Comprehensive code quality analysis
3. `explain_code` - Natural language explanations (beginner/intermediate/expert)
4. `recognize_intent` - Understand code purpose and classify patterns
5. `get_examples` - Few-shot learning examples for tasks
6. `search_patterns` - Pattern database queries
7. `translate_hyperscript` - Between-language translation
8. `get_pattern_stats` - Database statistics
9. `validate_hyperscript` - Syntax validation
10. `validate_schema` - Command schema validation
11. `suggest_command` - Best command recommendations
12. `get_bundle_config` - vite-plugin configuration
13. `parse_multilingual` - Parse any supported language
14. `translate_to_english` - Essential for LLM understanding
15. `explain_in_language` - Detailed explanations in target language
16. `get_code_fixes` - Auto-fix suggestions
17. `get_diagnostics` - LSP-compatible diagnostics
18. `get_completions` - Context-aware code completions
19. `get_hover_info` - Hover documentation
20. `get_document_symbols` - Extract symbols for outline view
21. `get_command_docs` - Command documentation
22. `get_expression_docs` - Expression documentation

### Resources Provided

1. Command registry - All available commands
2. Expression types - All expression types
3. Language elements - Searchable language features
4. Language profiles - Complete grammar rules
5. Supported languages - Metadata for 23 languages

### Usage

```bash
# Start server
npx @lokascript/mcp-server

# Configure in Claude Desktop
{
  "mcpServers": {
    "lokascript": {
      "command": "npx",
      "args": ["@lokascript/mcp-server"]
    }
  }
}
```

### Features

- Fully typed with TypeScript
- Comprehensive error handling
- Detailed logging for debugging
- LaunchAgent support for macOS
- Works with Claude Desktop, VSCode, and other MCP clients

### Performance

- Fast response times (< 100ms for most operations)
- In-memory pattern database for quick lookup
- Efficient semantic parsing with caching

### Compatibility

- MCP SDK 1.25+
- Node.js 18+
- Works with all MCP-compatible clients

### Notes

- This is the first stable 1.0 release
- API is stable and production-ready
- Used extensively in LokaScript development workflow
