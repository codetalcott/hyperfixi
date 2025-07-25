# Hyperscript MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with powerful hyperscript development capabilities.

## Features

### Tools

1. **analyze_hyperscript** - Analyze hyperscript code for:
   - Syntax errors
   - Semantic issues
   - Optimization opportunities
   - Code metrics and complexity

2. **generate_hyperscript** - Generate hyperscript from natural language:
   - Describe behavior in plain English
   - Get valid hyperscript code
   - Support for multiple languages (ES, KO, ZH)

3. **convert_to_hyperscript** - Convert existing code:
   - jQuery to hyperscript
   - Vanilla JavaScript to hyperscript
   - React event handlers to hyperscript

4. **translate_hyperscript** - Translate between languages:
   - Spanish ↔ English
   - Korean ↔ English
   - Chinese ↔ English

5. **generate_tests** - Generate test suites:
   - Vitest tests
   - Jest tests
   - Playwright tests

### Resources

- **hyperscript://docs/commands** - Complete command reference
- **hyperscript://docs/expressions** - Expression syntax guide
- **hyperscript://examples** - Common patterns and examples
- **hyperscript://i18n/dictionaries** - Translation dictionaries

## Installation

```bash
npm install mcp-server-hyperscript
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hyperscript": {
      "command": "node",
      "args": ["/path/to/mcp-server-hyperscript/dist/index.js"]
    }
  }
}
```

## Example Interactions

### Analyzing Code
```
User: "Analyze this hyperscript code for issues"
Claude: *uses analyze_hyperscript tool*
Result: Detailed analysis with errors, warnings, and suggestions
```

### Generating Behaviors
```
User: "Generate hyperscript that validates an email field on blur"
Claude: *uses generate_hyperscript tool*
Result: 
on blur
  if my value matches /^[^@]+@[^@]+\.[^@]+$/
    remove .error from me
  else
    add .error to me
  end
```

### Converting jQuery
```
User: "Convert this jQuery to hyperscript: $('.btn').click(function() { $(this).toggleClass('active'); })"
Claude: *uses convert_to_hyperscript tool*
Result: on click from .btn toggle .active on me
```

### Multi-Language Support
```
User: "Translate this Spanish hyperscript to Korean"
Claude: *uses translate_hyperscript tool*
Result: Properly translated hyperscript
```

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

### Testing with Claude Desktop

1. Build the server: `npm run build`
2. Update Claude Desktop config to point to your local build
3. Restart Claude Desktop
4. Test the tools in a conversation

## API Reference

### Tool Schemas

All tools follow the MCP tool schema format:

```typescript
{
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
```

### Error Handling

All tools return structured error responses:

```json
{
  "content": [{
    "type": "text",
    "text": "Error: <error message>"
  }]
}
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT
