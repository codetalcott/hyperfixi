# @hyperscript-tools/mcp-server

MCP (Model Context Protocol) server for **original [\_hyperscript](https://hyperscript.org)** development.

Gives your AI assistant (Claude, Cursor, etc.) deep understanding of \_hyperscript — validation, completions, documentation, and code analysis — with **zero heavy dependencies**.

## Quick Start

### Claude Code / Claude Desktop

Add to your MCP configuration (`.mcp.json` or Claude Desktop settings):

```json
{
  "mcpServers": {
    "hyperscript": {
      "command": "npx",
      "args": ["@hyperscript-tools/mcp-server"]
    }
  }
}
```

### From source (this monorepo)

```json
{
  "mcpServers": {
    "hyperscript": {
      "command": "node",
      "args": ["mcp-server-hyperscript/dist/index.js"]
    }
  }
}
```

## Available Tools (11)

### Validation

| Tool                   | Description                               |
| ---------------------- | ----------------------------------------- |
| `validate_hyperscript` | Check code for syntax errors and warnings |
| `suggest_command`      | Suggest the best command for a task       |
| `get_code_fixes`       | Get fix suggestions for common errors     |

### LSP Bridge

| Tool                   | Description                                  |
| ---------------------- | -------------------------------------------- |
| `get_diagnostics`      | Errors, warnings, and hints for code         |
| `get_completions`      | Context-aware keyword completions            |
| `get_hover_info`       | Hover documentation for any keyword          |
| `get_document_symbols` | Extract event handlers, behaviors, functions |

### Documentation

| Tool                       | Description                               |
| -------------------------- | ----------------------------------------- |
| `get_command_docs`         | Detailed docs for any command             |
| `get_expression_docs`      | Docs for expressions (me, closest, etc.)  |
| `search_language_elements` | Search all commands, expressions, symbols |
| `suggest_best_practices`   | Code improvement suggestions              |

### Analysis

| Tool                 | Description                      |
| -------------------- | -------------------------------- |
| `analyze_complexity` | Estimate code complexity metrics |
| `explain_code`       | Natural language explanation     |
| `recognize_intent`   | Classify code purpose            |

## Resources

The server also exposes documentation as MCP resources:

- `hyperscript://docs/commands` — Command reference
- `hyperscript://docs/expressions` — Expression guide
- `hyperscript://docs/events` — Events reference
- `hyperscript://examples/common` — Common patterns

## What This Is NOT

This package is for **original \_hyperscript** (from [hyperscript.org](https://hyperscript.org)).

If you're using **HyperFixi** or **LokaScript** (the extended fork with multilingual support, custom bundles, and API v2), use `@hyperfixi/mcp-server` instead — it includes 22+ tools with compilation, multilingual translation, domain registries, and more.

## Dependencies

- `@modelcontextprotocol/sdk` — That's it. No parser, no runtime, no i18n packages.

All analysis is pattern-based, which means it works without installing \_hyperscript itself.
