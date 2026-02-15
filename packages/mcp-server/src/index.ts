#!/usr/bin/env node
/**
 * HyperFixi MCP Server
 *
 * Model Context Protocol server providing hyperscript development assistance.
 * Consolidates capabilities from core/ast-utils and patterns-reference packages.
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
import { languageDocsTools, handleLanguageDocsTool } from './tools/language-docs.js';
import { profileTools, handleProfileTool } from './tools/profiles.js';
import { compilationTools, handleCompilationTool } from './tools/compilation.js';
import { sqlDomainTools, handleSQLDomainTool } from './tools/sql-domain.js';
import { bddDomainTools, handleBDDDomainTool } from './tools/bdd-domain.js';
import { jsxDomainTools, handleJSXDomainTool } from './tools/jsx-domain.js';
import { routeTools, handleRouteTool } from './tools/routes.js';

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
      ...languageDocsTools,
      ...profileTools,
      ...compilationTools,
      ...sqlDomainTools,
      ...bddDomainTools,
      ...jsxDomainTools,
      ...routeTools,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  // Analysis tools (from core/ast-utils)
  if (name.startsWith('analyze_') || name === 'explain_code' || name === 'recognize_intent') {
    return handleAnalysisTool(name, args as Record<string, unknown>);
  }

  // Pattern tools (from patterns-reference)
  if (
    name === 'search_patterns' ||
    name === 'translate_hyperscript' ||
    name === 'get_pattern_stats'
  ) {
    return handlePatternTool(name, args as Record<string, unknown>);
  }

  // Validation tools
  if (
    name === 'validate_hyperscript' ||
    name === 'validate_schema' ||
    name === 'suggest_command' ||
    name === 'get_bundle_config' ||
    name === 'parse_multilingual' ||
    name === 'translate_to_english' ||
    name === 'explain_in_language' ||
    name === 'get_code_fixes'
  ) {
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

  // Profile inspection tools
  if (
    name === 'get_language_profile' ||
    name === 'list_supported_languages' ||
    name === 'get_keyword_translations' ||
    name === 'get_role_markers' ||
    name === 'compare_language_profiles'
  ) {
    return handleProfileTool(name, args as Record<string, unknown>);
  }

  // Compilation service tools
  if (
    name === 'compile_hyperscript' ||
    name === 'validate_and_compile' ||
    name === 'translate_code' ||
    name === 'generate_tests' ||
    name === 'generate_component' ||
    name === 'diff_behaviors'
  ) {
    return handleCompilationTool(name, args as Record<string, unknown>);
  }

  // SQL domain tools
  if (
    name === 'parse_sql' ||
    name === 'compile_sql' ||
    name === 'validate_sql' ||
    name === 'translate_sql'
  ) {
    return handleSQLDomainTool(name, args as Record<string, unknown>);
  }

  // BDD domain tools
  if (
    name === 'parse_bdd' ||
    name === 'compile_bdd' ||
    name === 'validate_bdd' ||
    name === 'translate_bdd'
  ) {
    return handleBDDDomainTool(name, args as Record<string, unknown>);
  }

  // JSX domain tools
  if (
    name === 'parse_jsx' ||
    name === 'compile_jsx' ||
    name === 'validate_jsx' ||
    name === 'translate_jsx'
  ) {
    return handleJSXDomainTool(name, args as Record<string, unknown>);
  }

  // ServerBridge route tools
  if (name === 'extract_routes' || name === 'generate_server_routes') {
    return handleRouteTool(name, args as Record<string, unknown>);
  }

  // Pattern tools with get_ prefix (after LSP, language-docs, and profile tools to avoid conflict)
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
  console.error('HyperFixi MCP server started');
}

main().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
