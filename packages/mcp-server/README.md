# @hyperfixi/mcp-server

MCP (Model Context Protocol) server for hyperscript development assistance. Provides 22 tools and 5 resources for code analysis, pattern lookup, validation, semantic parsing, language documentation, and LSP-compatible features with full multilingual support.

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
      "args": ["/path/to/lokascript/packages/mcp-server/dist/index.js"]
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

## Available Tools (22)

### Validation Tools

| Tool                   | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| `validate_hyperscript` | Validate syntax with semantic analysis, detect errors and warnings   |
| `suggest_command`      | Suggest the best command for a task                                  |
| `get_bundle_config`    | Get recommended Vite plugin configuration                            |
| `parse_multilingual`   | Parse hyperscript in any supported language with confidence scoring  |
| `translate_to_english` | Translate hyperscript from any language to English                   |
| `explain_in_language`  | Comprehensive code explanation with grammar, roles, and translations |

### Pattern Tools

| Tool                    | Description                      |
| ----------------------- | -------------------------------- |
| `get_examples`          | Get few-shot examples for a task |
| `search_patterns`       | Search pattern database          |
| `translate_hyperscript` | Translate between 13 languages   |
| `get_pattern_stats`     | Get database statistics          |

### Analysis Tools

| Tool                 | Description                                       |
| -------------------- | ------------------------------------------------- |
| `analyze_complexity` | Calculate cyclomatic, cognitive, Halstead metrics |
| `analyze_metrics`    | Comprehensive code analysis                       |
| `explain_code`       | Natural language code explanation                 |
| `recognize_intent`   | Classify code purpose                             |

### LSP Bridge Tools

| Tool                   | Description                              |
| ---------------------- | ---------------------------------------- |
| `get_diagnostics`      | LSP-compatible error/warning diagnostics |
| `get_completions`      | Context-aware code completions           |
| `get_hover_info`       | Hover documentation                      |
| `get_document_symbols` | Document outline symbols                 |

### Language Documentation Tools

| Tool                       | Description                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| `get_command_docs`         | Get documentation for a specific hyperscript command                  |
| `get_expression_docs`      | Get documentation for expression types                                |
| `search_language_elements` | Search across all language elements (commands, expressions, keywords) |
| `suggest_best_practices`   | Analyze code and suggest improvements                                 |

## Available Resources (5)

| URI                              | Description                   |
| -------------------------------- | ----------------------------- |
| `hyperscript://docs/commands`    | Command reference (markdown)  |
| `hyperscript://docs/expressions` | Expression syntax guide       |
| `hyperscript://docs/events`      | Event handling reference      |
| `hyperscript://examples/common`  | Common patterns               |
| `hyperscript://languages`        | 13 supported languages (JSON) |

## Example Usage

### Validate Code

```
User: Validate this hyperscript: on click put 'hello into #output

Claude: [uses validate_hyperscript]
The code has an error: Unbalanced single quotes
```

### Suggest Commands

```
User: What hyperscript command should I use to show a modal?

Claude: [uses suggest_command]
Use the `show` command: show #modal with *opacity
```

### Get Examples

```
User: Show me examples of toggle patterns

Claude: [uses get_examples]
Here are examples:
- on click toggle .active
- on click toggle .open on #menu
```

### Translate

```
User: Translate "on click toggle .active" to Japanese

Claude: [uses translate_hyperscript]
Japanese: クリック で .active を トグル
```

### Parse Multilingual Code (Phase 5)

```
User: Parse this Korean hyperscript: .active 를 토글

Claude: [uses parse_multilingual with language: 'ko']
{
  "success": true,
  "confidence": 0.95,
  "command": {
    "name": "toggle",
    "roles": { "patient": ".active" }
  }
}
```

### Translate to English (Phase 5)

```
User: What does this Japanese code mean? #button の .active を 切り替え

Claude: [uses translate_to_english with sourceLanguage: 'ja']
English: toggle .active on #button
```

### Explain Code in Detail (Phase 6)

```
User: Explain this Korean code in detail: .active 를 토글

Claude: [uses explain_in_language with sourceLanguage: 'ko']
{
  "command": {
    "name": "toggle",
    "description": "Toggle a class or attribute on/off",
    "category": "dom-class"
  },
  "roles": {
    "patient": {
      "value": ".active",
      "description": "The class or attribute to toggle",
      "required": true
    }
  },
  "grammar": {
    "wordOrder": "SOV",
    "direction": "ltr"
  },
  "keywords": {
    "toggle": { "primary": "토글", "alternatives": ["전환"] }
  }
}
```

## Supported Languages

The MCP server supports hyperscript in 21+ languages:

| Language    | Code | Example               |
| ----------- | ---- | --------------------- |
| English     | `en` | `toggle .active`      |
| Japanese    | `ja` | `.active を 切り替え` |
| Korean      | `ko` | `.active 를 토글`     |
| Spanish     | `es` | `alternar .active`    |
| Arabic      | `ar` | `تبديل .active`       |
| Chinese     | `zh` | `切换 .active`        |
| Portuguese  | `pt` | `alternar .active`    |
| French      | `fr` | `basculer .active`    |
| German      | `de` | `umschalten .active`  |
| Turkish     | `tr` | `.active değiştir`    |
| And more... |      |                       |

## Tool Dependencies & Fallback Behavior

Each tool has different package requirements. All tools work without optional packages by using built-in fallbacks:

| Tool                       | Required Package                  | Fallback Behavior                   |
| -------------------------- | --------------------------------- | ----------------------------------- |
| `validate_hyperscript`     | -                                 | Full functionality (built-in)       |
| `suggest_command`          | -                                 | Full functionality (built-in)       |
| `get_bundle_config`        | -                                 | Full functionality (built-in)       |
| `parse_multilingual`       | `@lokascript/semantic`            | Returns error (no fallback)         |
| `translate_to_english`     | `@lokascript/semantic`            | Returns error (no fallback)         |
| `explain_in_language`      | `@lokascript/semantic`            | Returns error (no fallback)         |
| `analyze_complexity`       | `@lokascript/ast-toolkit`         | Simple regex-based metrics          |
| `analyze_metrics`          | `@lokascript/ast-toolkit`         | Simple regex-based metrics          |
| `explain_code`             | `@lokascript/ast-toolkit`         | Pattern-based explanation           |
| `recognize_intent`         | `@lokascript/ast-toolkit`         | Pattern-based intent detection      |
| `get_examples`             | `@hyperfixi/patterns-reference`   | Built-in example patterns           |
| `search_patterns`          | `@hyperfixi/patterns-reference`   | Built-in pattern search             |
| `translate_hyperscript`    | `@lokascript/semantic`            | Returns error (no fallback)         |
| `get_pattern_stats`        | `@hyperfixi/patterns-reference`   | Basic statistics                    |
| `get_diagnostics`          | `@lokascript/semantic` (optional) | Regex-based diagnostics             |
| `get_completions`          | `@lokascript/semantic` (optional) | English-only completions            |
| `get_hover_info`           | -                                 | Built-in documentation              |
| `get_document_symbols`     | -                                 | Regex-based extraction              |
| `get_command_docs`         | `@hyperfixi/patterns-reference`   | Built-in command docs               |
| `get_expression_docs`      | `@hyperfixi/patterns-reference`   | Returns error (needs migration)     |
| `search_language_elements` | `@hyperfixi/patterns-reference`   | Built-in search                     |
| `suggest_best_practices`   | -                                 | Full functionality (built-in rules) |

### Installation Options

**Minimal (validation only):**

```bash
npm install @hyperfixi/mcp-server
```

**Recommended (full features):**

```bash
npm install @hyperfixi/mcp-server @lokascript/semantic @lokascript/ast-toolkit @hyperfixi/patterns-reference
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

## License

MIT
