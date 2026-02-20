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
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
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
import { routeTools, handleRouteTool } from './tools/routes.js';

// Domain registry — auto-generates tool definitions and dispatches tool calls
import { createDomainRegistry } from './tools/domain-registry-setup.js';
import { isMultiStepBDD, handleBDDMultiStep } from './tools/bdd-extras.js';
import {
  isMultiLineBehaviorSpec,
  handleBehaviorSpecMultiLine,
} from './tools/behaviorspec-extras.js';

// MCP Prompts (Layer 2)
import { getLLMPromptDefinitions, renderLLMPrompt } from './prompts/index.js';

// MCP Sampling tools (Layer 3)
import { samplingTools, handleSamplingTool } from './tools/llm-sampling.js';

// Cross-domain dispatcher tools
import { dispatcherTools, handleDispatcherTool } from './tools/dispatcher.js';

// IR conversion tools (explicit ↔ JSON)
import { irTools, handleIRTool } from './tools/ir-tools.js';

const registry = createDomainRegistry();

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
      prompts: {},
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
      ...routeTools,
      ...registry.getToolDefinitions(),
      ...samplingTools,
      ...dispatcherTools,
      ...irTools,
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

  // Cross-domain dispatcher tools
  if (
    name === 'detect_domain' ||
    name === 'parse_composite' ||
    name === 'compile_auto' ||
    name === 'compile_composite'
  ) {
    return handleDispatcherTool(name, args as Record<string, unknown>, registry);
  }

  // IR conversion tools (explicit ↔ JSON)
  if (name === 'convert_format' || name === 'validate_explicit') {
    return handleIRTool(name, args as Record<string, unknown>);
  }

  // Domain tools — registry handles standard operations,
  // extras handle multi-step/multi-line extensions
  if (registry.canHandle(name)) {
    const typedArgs = args as Record<string, unknown>;

    // Multi-step BDD scenarios (comma/newline-separated)
    if (name.endsWith('_bdd') && isMultiStepBDD(typedArgs)) {
      return handleBDDMultiStep(name, typedArgs) as any;
    }

    // Multi-line BehaviorSpec scenarios (indented test blocks)
    if (name.endsWith('_behaviorspec') && isMultiLineBehaviorSpec(typedArgs)) {
      return handleBehaviorSpecMultiLine(name, typedArgs) as any;
    }

    // Standard single-step: registry handles parse/compile/validate/translate
    // Cast needed: MCPToolResponse uses readonly props vs SDK's mutable types
    const result = await registry.handleToolCall(name, typedArgs);
    if (result) return result as any;
  }

  // ServerBridge route tools
  if (name === 'extract_routes' || name === 'generate_server_routes') {
    return handleRouteTool(name, args as Record<string, unknown>);
  }

  // MCP Sampling tools (Layer 3 — invoke Claude via client)
  if (
    name === 'ask_claude' ||
    name === 'summarize_content' ||
    name === 'analyze_content' ||
    name === 'translate_content'
  ) {
    return handleSamplingTool(name, args as Record<string, unknown>, server);
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
// Prompt Handlers (Layer 2)
// =============================================================================

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: getLLMPromptDefinitions() };
});

server.setRequestHandler(GetPromptRequestSchema, async request => {
  const { name, arguments: promptArgs } = request.params;
  return renderLLMPrompt(name, (promptArgs ?? {}) as Record<string, string>);
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
