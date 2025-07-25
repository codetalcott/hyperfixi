#!/usr/bin/env node

/**
 * Standalone MCP Server for AST Toolkit
 * Can be run as a command-line MCP server
 */

import { createMCPServerWithHandlers } from './index.js';
import { JSONRPC_VERSION } from './types.js';

// ============================================================================
// Transport Layer
// ============================================================================

/**
 * STDIO Transport for MCP Server
 * Handles JSON-RPC communication over stdin/stdout
 */
class STDIOTransport {
  private handlers: { [method: string]: (message: any) => Promise<any> } = {};
  
  constructor() {
    this.setupStdio();
  }

  private setupStdio() {
    // Set up stdin to read JSON-RPC messages
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    
    process.stdin.on('data', (chunk: string) => {
      buffer += chunk;
      
      // Process complete JSON messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line.trim());
            this.handleMessage(message);
          } catch (error) {
            this.sendError(null, -32700, 'Parse error');
          }
        }
      }
    });

    process.stdin.on('end', () => {
      process.exit(0);
    });

    // Handle process termination
    process.on('SIGINT', () => {
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      process.exit(0);
    });
  }

  private async handleMessage(message: any) {
    const { method, id } = message;

    try {
      // Handle JSON-RPC requests
      if (method && this.handlers[method]) {
        const result = await this.handlers[method](message);
        
        if (id !== undefined) {
          this.sendResponse(id, result);
        }
      } else if (method) {
        this.sendError(id, -32601, `Method not found: ${method}`);
      }
    } catch (error) {
      this.sendError(id, -32603, error instanceof Error ? error.message : String(error));
    }
  }

  private sendResponse(id: any, result: any) {
    const response = {
      jsonrpc: JSONRPC_VERSION,
      id,
      result
    };
    
    this.send(response);
  }

  private sendError(id: any, code: number, message: string, data?: any) {
    const error = {
      jsonrpc: JSONRPC_VERSION,
      id,
      error: {
        code,
        message,
        ...(data && { data })
      }
    };
    
    this.send(error);
  }

  private send(message: any) {
    const json = JSON.stringify(message);
    process.stdout.write(json + '\n');
  }

  public registerHandler(method: string, handler: (message: any) => Promise<any>) {
    this.handlers[method] = handler;
  }
}

// ============================================================================
// Server Setup
// ============================================================================

/**
 * Main server initialization
 */
async function main() {
  try {
    // Create the AST Toolkit MCP server
    const { server, handleMessage } = createMCPServerWithHandlers();
    
    // Create STDIO transport
    const transport = new STDIOTransport();
    
    // Register message handlers
    transport.registerHandler('initialize', handleMessage);
    transport.registerHandler('tools/list', handleMessage);
    transport.registerHandler('tools/call', handleMessage);
    transport.registerHandler('resources/list', handleMessage);
    transport.registerHandler('resources/read', handleMessage);
    transport.registerHandler('ping', async (message: any) => {
      return {}; // Empty result for ping
    });

    // Log server startup (to stderr to avoid interfering with JSON-RPC)
    console.error('AST Toolkit MCP Server started');
    console.error('Protocol version: 2025-03-26');
    console.error('Server info: @hyperfixi/ast-toolkit v0.1.0');
    console.error('Listening for JSON-RPC messages on stdin...');
    
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

/**
 * Command line argument parsing
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    help: false,
    version: false,
    debug: false
  };

  for (const arg of args) {
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      case '--debug':
      case '-d':
        options.debug = true;
        break;
    }
  }

  return options;
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
AST Toolkit MCP Server

A Model Context Protocol server providing comprehensive AST analysis capabilities
for hyperscript code.

Usage:
  ast-toolkit-mcp [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version information  
  -d, --debug    Enable debug logging

The server communicates via JSON-RPC over stdin/stdout following the MCP protocol.

Available tools:
  - analyze_complexity: Calculate code complexity metrics
  - analyze_metrics: Comprehensive code analysis
  - explain_code: Generate natural language explanations
  - find_nodes: Search for specific AST nodes
  - generate_template: Create code templates
  - recognize_intent: Analyze code purpose
  - quality_insights: Generate quality insights
  - benchmark_performance: Performance benchmarking
  - traverse_ast: AST traversal with visitor pattern

Available resources:
  - ast://examples/simple: Simple AST example
  - ast://examples/complex: Complex AST example  
  - ast://examples/massive: Large AST for performance testing
  - ast://documentation/api: API documentation
  - ast://documentation/examples: Usage examples

For more information, visit: https://github.com/hyperfixi/ast-toolkit
`);
}

/**
 * Show version information
 */
function showVersion() {
  console.log('@hyperfixi/ast-toolkit MCP Server v0.1.0');
  console.log('Protocol version: 2025-03-26');
}

// ============================================================================
// Entry Point
// ============================================================================

if (require.main === module) {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  if (options.version) {
    showVersion();
    process.exit(0);
  }
  
  if (options.debug) {
    console.error('Debug mode enabled');
  }
  
  // Start the server
  main().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
  });
}

export { STDIOTransport, main };