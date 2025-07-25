# MCP Integration Example

This example demonstrates how to use the AST Toolkit MCP Server to provide hyperscript AST analysis capabilities through the Model Context Protocol.

## Overview

The MCP Server exposes the AST Toolkit's functionality as a standardized service that can be used by MCP-compatible clients (like Claude Desktop, VS Code, or custom applications).

## Features

### Available Tools

1. **analyze_complexity** - Calculate cyclomatic complexity, cognitive complexity, and Halstead metrics
2. **analyze_metrics** - Comprehensive code analysis including patterns and smells
3. **explain_code** - Generate natural language explanations of code structure
4. **find_nodes** - Search for specific AST nodes using predicates
5. **generate_template** - Create code templates based on intent descriptions
6. **recognize_intent** - Analyze code to understand its purpose
7. **quality_insights** - Generate quality insights and improvement suggestions
8. **benchmark_performance** - Performance benchmarking of AST operations
9. **traverse_ast** - AST traversal with visitor pattern

### Available Resources

1. **ast://examples/simple** - Simple hyperscript AST example
2. **ast://examples/complex** - Complex AST with multiple features
3. **ast://examples/massive** - Large AST for performance testing
4. **ast://documentation/api** - Complete API documentation
5. **ast://documentation/examples** - Usage examples and patterns

## Running the MCP Server

### Standalone Server

```bash
# Install dependencies
npm install

# Run the MCP server
npx tsx src/mcp/server.ts

# Or build and run
npm run build
node dist/mcp/server.js
```

### Command Line Options

```bash
# Show help
npx tsx src/mcp/server.ts --help

# Show version
npx tsx src/mcp/server.ts --version

# Enable debug mode
npx tsx src/mcp/server.ts --debug
```

## Integration Examples

### Using with Claude Desktop

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "ast-toolkit": {
      "command": "npx",
      "args": ["tsx", "/path/to/ast-toolkit/src/mcp/server.ts"],
      "env": {}
    }
  }
}
```

### Programmatic Usage

```typescript
import { createMCPServerWithHandlers } from '@hyperfixi/ast-toolkit';

const { server, handleMessage } = createMCPServerWithHandlers();

// Example: Analyze complexity of an AST
const response = await handleMessage({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "analyze_complexity",
    arguments: {
      ast: {
        type: "program",
        features: [/* your AST structure */]
      }
    }
  }
});

console.log(response.result);
```

### Custom Transport

```typescript
import { createASTToolkitMCPServer } from '@hyperfixi/ast-toolkit';

const server = createASTToolkitMCPServer();

// Initialize the server
await server.initialize({
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "my-client", version: "1.0.0" }
  }
});

// List available tools
const tools = await server.listTools({ method: "tools/list" });
console.log("Available tools:", tools.tools.map(t => t.name));

// Call a tool
const result = await server.callTool({
  method: "tools/call",
  params: {
    name: "explain_code",
    arguments: {
      ast: myAST,
      audience: "beginner",
      detail: "comprehensive"
    }
  }
});

console.log("Code explanation:", JSON.parse(result.content[0].text));
```

## Tool Usage Examples

### Complexity Analysis

```json
{
  "method": "tools/call",
  "params": {
    "name": "analyze_complexity",
    "arguments": {
      "ast": {
        "type": "program",
        "features": [...]
      }
    }
  }
}
```

Response:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"cyclomatic\": 3, \"cognitive\": 2, \"halstead\": {...}, \"summary\": \"...\"}"
  }]
}
```

### Code Explanation

```json
{
  "method": "tools/call",
  "params": {
    "name": "explain_code",
    "arguments": {
      "ast": {...},
      "audience": "intermediate",
      "detail": "detailed"
    }
  }
}
```

### Node Finding

```json
{
  "method": "tools/call",
  "params": {
    "name": "find_nodes",
    "arguments": {
      "ast": {...},
      "nodeType": "eventHandler"
    }
  }
}
```

### Template Generation

```json
{
  "method": "tools/call",
  "params": {
    "name": "generate_template",
    "arguments": {
      "intent": "Create a form submission handler with validation",
      "style": "comprehensive"
    }
  }
}
```

## Resource Usage Examples

### Getting AST Examples

```json
{
  "method": "resources/read",
  "params": {
    "uri": "ast://examples/complex"
  }
}
```

### Reading Documentation

```json
{
  "method": "resources/read",
  "params": {
    "uri": "ast://documentation/api"
  }
}
```

## Error Handling

The MCP server follows standard JSON-RPC error handling:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Error executing tool analyze_complexity: Invalid AST structure"
  }
}
```

Tool-specific errors are returned with `isError: true`:

```json
{
  "content": [{
    "type": "text",
    "text": "Unknown tool: invalid_tool_name"
  }],
  "isError": true
}
```

## Protocol Compliance

The server implements MCP protocol version `2025-03-26` with full support for:

- ✅ Tool listing and execution
- ✅ Resource listing and reading  
- ✅ Proper error handling
- ✅ JSON-RPC 2.0 compliance
- ✅ Progress notifications (for long-running operations)
- ✅ Proper capability negotiation

## Performance Considerations

- The server supports caching for expensive operations
- Large ASTs (>1000 nodes) are handled efficiently
- Batch processing is available for multiple ASTs
- Memory usage is optimized for long-running sessions

## Security

- The server operates in read-only mode by default
- No file system access beyond provided AST data
- All tool inputs are validated
- Error messages don't expose sensitive information

## Troubleshooting

### Server Won't Start
- Check Node.js version (requires 18+)
- Verify TypeScript compilation: `npm run build`
- Check dependencies: `npm install`

### Tool Errors
- Validate AST structure matches expected format
- Check tool parameter requirements
- Enable debug mode for detailed logging

### Performance Issues
- Use caching for repeated operations
- Consider batch processing for multiple ASTs
- Monitor memory usage with large ASTs

## Next Steps

1. Integrate with your MCP client
2. Explore all available tools and resources
3. Customize the server for your specific needs
4. Contribute improvements back to the project

For more information, see the [AST Toolkit documentation](../README.md).