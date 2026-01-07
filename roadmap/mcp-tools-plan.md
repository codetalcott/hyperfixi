# MCP Tools & Agent Skills for Hyperfixi

## Overview

HyperFixi provides two complementary approaches for LLM coding agent support:

1. **Agent Skills** - Static instruction files (SKILL.md) that teach agents how to write hyperscript
2. **MCP Server** - Dynamic tools for code analysis, pattern lookup, and validation

## Current Implementation Status

### Agent Skills ✅ COMPLETED

Location: `skills/hyperscript/`

Agent Skills follow the open standard adopted by VS Code, Cursor, GitHub Copilot, and OpenAI Codex.

**Files:**
- `SKILL.md` - Main skill definition with quick reference
- `references/commands.md` - Complete command reference (21 commands)
- `references/expressions.md` - Expression syntax guide
- `references/multilingual.md` - 22 language examples with keywords

**Key Features:**
- Works immediately with any agent that supports Agent Skills
- No server infrastructure required
- Covers all 21 commands, 6 blocks, and 22 languages
- Includes common patterns and troubleshooting

### MCP Server ✅ COMPLETED

Location: `packages/mcp-server/`

Consolidated MCP server with 15 tools and 5 resources.

**Tools (15 total):**

| Category | Tool | Description |
|----------|------|-------------|
| Analysis | `analyze_complexity` | Cyclomatic, cognitive, Halstead metrics |
| Analysis | `analyze_metrics` | Pattern detection, code smells, quality |
| Analysis | `explain_code` | Natural language explanations |
| Analysis | `recognize_intent` | Purpose classification |
| Patterns | `get_examples` | Few-shot examples for tasks |
| Patterns | `search_patterns` | Find patterns by description |
| Patterns | `translate_hyperscript` | Translate between 22 languages |
| Patterns | `get_pattern_stats` | Database statistics |
| Validation | `validate_hyperscript` | Syntax validation with errors |
| Validation | `suggest_command` | Suggest command for task |
| Validation | `get_bundle_config` | Vite plugin configuration |
| LSP Bridge | `get_diagnostics` | LSP-compatible diagnostics |
| LSP Bridge | `get_completions` | Context-aware completions |
| LSP Bridge | `get_hover_info` | Hover documentation |
| LSP Bridge | `get_document_symbols` | Document outline symbols |

**Resources (5):**
- `hyperfixi://docs/commands` - Command reference
- `hyperfixi://docs/expressions` - Expression guide
- `hyperfixi://docs/events` - Event handling
- `hyperfixi://patterns` - Common patterns
- `hyperfixi://languages` - 22 supported languages

### Python Scanner ✅ UPDATED

Location: `packages/hyperfixi-python/hyperfixi/scanner.py`

Updated to support 22 languages with:
- Language keyword detection for all 22 languages
- Regional bundle recommendations (western, east-asian, southeast-asian, south-asian, slavic)
- Support for Cyrillic, Devanagari, Bengali, Thai scripts

## Installation

### Claude Desktop

Add to config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hyperfixi": {
      "command": "node",
      "args": ["/path/to/hyperfixi/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### Build the Server

```bash
cd packages/mcp-server
npm install
npm run build
```

### Agent Skills

Agent Skills are automatically available in supporting editors when the `skills/` directory is present in your workspace.

## Architecture Decision: Skills + MCP

We chose to implement both approaches because they serve different purposes:

| Aspect | Agent Skills | MCP Server |
|--------|-------------|------------|
| **What** | Instructions/procedures | Dynamic tool definitions |
| **How** | SKILL.md files (static) | JSON-RPC server (dynamic) |
| **Adoption** | VS Code, Cursor, GitHub, Codex | Claude Desktop, custom clients |
| **Best for** | Teaching agents HOW to use tools | Providing WHAT tools are available |

**Key insight**: Skills teach agents the syntax and patterns, while MCP provides real-time validation and assistance.

## Usage Examples

### Using Agent Skills

Ask any compatible agent:
> "Generate hyperscript that toggles a dropdown menu on click"

The agent uses `skills/hyperscript/SKILL.md` to understand:
- Command syntax: `toggle .class on #element`
- Event handling: `on click ...`
- Common patterns from examples

### Using MCP Tools

Ask Claude with MCP server connected:
> "Validate this hyperscript and suggest improvements"

Claude uses MCP tools:
1. `validate_hyperscript` - Check syntax
2. `analyze_metrics` - Find code smells
3. `suggest_command` - Recommend alternatives

### Multi-Language Development

> "Translate this English hyperscript to Japanese"

Uses:
1. `translate_hyperscript({ code, from: 'en', to: 'ja' })`
2. Returns: `クリック で .active を トグル`

## Removed Components

### mcp-server-hyperscript (REMOVED)

The original `mcp-server-hyperscript/` directory has been removed. Use `packages/mcp-server/` instead.

## Future Enhancements

### Potential Additions

1. **Migration Tools** (low priority)
   - `jquery_to_hyperscript` - Convert jQuery
   - `react_to_hyperscript` - Convert React handlers

2. **Testing Tools** (medium priority)
   - `generate_tests` - Generate test suites
   - `validate_behavior` - Behavior validation

3. **Skillport Integration** (optional)
   - Bridge Agent Skills to MCP-only clients
   - `skillport add hyperfixi/hyperscript skills`

### Completed Phase 1 Checklist

- [x] Create Agent Skill (`skills/hyperscript/SKILL.md`)
- [x] Create command reference (`skills/hyperscript/references/commands.md`)
- [x] Create expression guide (`skills/hyperscript/references/expressions.md`)
- [x] Create multilingual examples (`skills/hyperscript/references/multilingual.md`)
- [x] Create consolidated MCP server (`packages/mcp-server/`)
- [x] Implement analysis tools (from ast-toolkit)
- [x] Implement pattern tools (from patterns-reference)
- [x] Implement validation tools
- [x] Implement LSP bridge tools
- [x] Update Python scanner for 22 languages
- [x] Deprecate old mcp-server-hyperscript

### Completed Phase 2 Checklist

- [x] LSP Bridge Tools (`get_diagnostics`, `get_completions`, `get_hover_info`, `get_document_symbols`)
- [x] Deprecation notice on old package
- [x] Update this roadmap

## Security Considerations

1. **Sandboxed Execution**: Code analysis runs in isolated environments
2. **Input Validation**: Strict validation of all MCP inputs
3. **No File System Access**: MCP server doesn't access files directly
4. **Rate Limiting**: Consider for public deployments

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Main project documentation
- [Agent Skills Specification](https://agentskills.io/specification)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [ast-toolkit README](../packages/ast-toolkit/README.md)
- [patterns-reference README](../packages/patterns-reference/README.md)
