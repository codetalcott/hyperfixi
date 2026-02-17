#!/usr/bin/env node
/**
 * Hyperscript MCP Server
 *
 * Model Context Protocol server for original _hyperscript development.
 * Provides validation, completions, documentation, and code analysis.
 *
 * Zero external dependencies beyond @modelcontextprotocol/sdk.
 * All tools use pattern-based analysis — no parser required.
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
import { validationTools, handleValidationTool } from './tools/validation.js';
import { lspBridgeTools, handleLspBridgeTool } from './tools/lsp-bridge.js';
import { languageDocsTools, handleLanguageDocsTool } from './tools/language-docs.js';
import { analysisTools, handleAnalysisTool } from './tools/analysis.js';

// Resource implementations
import { listResources, readResource } from './resources/index.js';

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
  {
    name: 'hyperscript-mcp',
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
    tools: [...validationTools, ...lspBridgeTools, ...languageDocsTools, ...analysisTools],
  };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  // Validation tools
  if (name === 'validate_hyperscript' || name === 'suggest_command' || name === 'get_code_fixes') {
    return handleValidationTool(name, args as Record<string, unknown>);
  }

  // LSP Bridge tools
  if (
    name === 'get_diagnostics' ||
    name === 'get_completions' ||
    name === 'get_hover_info' ||
    name === 'get_document_symbols'
  ) {
    return handleLspBridgeTool(name, args as Record<string, unknown>);
  }

  // Language documentation tools
  if (
    name === 'get_command_docs' ||
    name === 'get_expression_docs' ||
    name === 'search_language_elements' ||
    name === 'suggest_best_practices'
  ) {
    return handleLanguageDocsTool(name, args as Record<string, unknown>);
  }

  // Analysis tools
  if (name === 'analyze_complexity' || name === 'explain_code' || name === 'recognize_intent') {
    return handleAnalysisTool(name, args as Record<string, unknown>);
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

server.setRequestHandler(ReadResourceRequestSchema, async request => {
  const { uri } = request.params;
  return readResource(uri);
});

// =============================================================================
// Server Startup
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Hyperscript MCP server started (original _hyperscript mode)');
}

main().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
