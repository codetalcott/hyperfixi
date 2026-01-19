# Changelog

All notable changes to @hyperfixi/mcp-server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
npx @hyperfixi/mcp-server

# Configure in Claude Desktop
{
  "mcpServers": {
    "hyperfixi": {
      "command": "npx",
      "args": ["@hyperfixi/mcp-server"]
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
- Used extensively in HyperFixi development workflow
