#!/usr/bin/env node
/**
 * HyperFixi MCP Server
 *
 * Model Context Protocol server providing hyperscript development assistance.
 * Consolidates capabilities from ast-toolkit and patterns-reference packages.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Tool implementations
import { analysisTools, handleAnalysisTool } from './tools/analysis.js';
import { patternTools, handlePatternTool } from './tools/patterns.js';
import { validationTools, handleValidationTool } from './tools/validation.js';
import { lspBridgeTools, handleLspBridgeTool } from './tools/lsp-bridge.js';

// Resource implementations
import { listResources, readResource } from './resources/index.js';

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
  {
    name: '@hyperfixi/mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// =============================================================================
// Tool Handlers
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      ...analysisTools,
      ...patternTools,
      ...validationTools,
      ...lspBridgeTools,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Analysis tools (from ast-toolkit)
  if (name.startsWith('analyze_') || name === 'explain_code' || name === 'recognize_intent') {
    return handleAnalysisTool(name, args as Record<string, unknown>);
  }

  // Pattern tools (from patterns-reference)
  if (name === 'search_patterns' || name === 'translate_hyperscript' || name === 'get_pattern_stats') {
    return handlePatternTool(name, args as Record<string, unknown>);
  }

  // Validation tools
  if (name === 'validate_hyperscript' || name === 'suggest_command' || name === 'get_bundle_config') {
    return handleValidationTool(name, args as Record<string, unknown>);
  }

  // LSP Bridge tools
  if (name === 'get_diagnostics' || name === 'get_completions' || name === 'get_hover_info' || name === 'get_document_symbols') {
    return handleLspBridgeTool(name, args as Record<string, unknown>);
  }

  // Pattern tools with get_ prefix (after LSP tools to avoid conflict)
  if (name.startsWith('get_')) {
    return handlePatternTool(name, args as Record<string, unknown>);
  }

  return {
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// =============================================================================
// Resource Handlers
// =============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: listResources() };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  return readResource(uri);
});

// =============================================================================
// Server Startup
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('HyperFixi MCP server started');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
