#!/usr/bin/env node
/**
 * HyperFixi MCP Server
 *
 * Model Context Protocol server providing hyperscript development assistance.
 * Consolidates capabilities from core/ast-utils and patterns-reference packages.
 */

import { createRequire } from 'node:module';
import { Server, type Tool } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import {
  captureFreshnessBaseline,
  freshnessSummary,
  staleAtStartup,
  staleSinceStartup,
  staleToolError,
} from './freshness.js';

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
import {
  getDebugPromptDefinitions,
  renderDebugPrompt,
  isDebugPrompt,
} from './prompts/debug-prompts.js';
import { getLSEPromptDefinitions, renderLSEPrompt, isLSEPrompt } from './prompts/lse-prompts.js';

// MCP Sampling tools (Layer 3)
import { samplingTools, handleSamplingTool } from './tools/llm-sampling.js';

// Cross-domain dispatcher tools
import { dispatcherTools, handleDispatcherTool } from './tools/dispatcher.js';

// IR conversion tools (explicit ↔ JSON)
import { irTools, handleIRTool } from './tools/ir-tools.js';

// Debug tools (AI-assisted debugging)
import { debugTools, handleDebugTool } from './tools/debug-tools.js';

// Template inventory tools
import { inventoryTools, handleInventoryTool } from './tools/inventory.js';

// Training data tools (LLM ↔ LSE)
import { trainingDataTools, handleTrainingDataTool } from './tools/training-data.js';

// Feedback loop tools (LLM ↔ LSE)
import { feedbackTools, handleFeedbackTool } from './tools/feedback-tools.js';

// LSE pipeline tools (LLM round-trip: hyperscript ↔ LSE)
import { lsePipelineTools, handleLsePipelineTool } from './tools/lse-pipeline.js';

// GRAIL tools (condition/affordance workflow)
import { grailTools, handleGrailTool } from './tools/grail-tools.js';

// LSE correction tool (stateless LLM-driven generation + self-correction)
import { lseCorrectionTools, handleLseCorrectionTool } from './tools/lse-correction.js';

const registry = createDomainRegistry();

// Resource implementations
import { listResources, readResource } from './resources/index.js';

// =============================================================================
// Server Setup
// =============================================================================

// Version tracks package.json so MCP clients report the real server version.
// set-version.cjs bumps every package.json on release; a hardcoded string here
// would silently drift (it sat at '1.0.0' through the entire 2.x line). The
// require path resolves the same in dev (src/), built (dist/), and installed
// (node_modules/@hyperfixi/mcp-server/) layouts.
const { version: pkgVersion } = createRequire(import.meta.url)('../package.json') as {
  version: string;
};

// The five MCP-sampling tools (ask_claude, summarize_content, analyze_content,
// translate_content, execute_llm) are generic LLM calls, not hyperscript
// tooling: a connected agent can already do all of them itself, they depend on
// a protocol feature deprecated in revision 2026-07-28, and listing them
// dilutes the server's actual offer (deterministic validate/compile/translate).
// Opt back in with LOKASCRIPT_MCP_LLM_TOOLS=1. Read once at module scope: the
// surface must not differ between the discover-probe and legacy instances
// serveStdio builds for one connection.
const LLM_SAMPLING_ENABLED = process.env.LOKASCRIPT_MCP_LLM_TOOLS === '1';

// Served as MCP `instructions` so every connected agent gets the loop without
// reading any docs. Keep in sync with AGENTS.md at the repo root.
const SERVER_INSTRUCTIONS = `Deterministic tooling for hyperscript (a compact DOM-behavior DSL) in 24 human languages. No tool here calls an LLM — every check is a real parser/compiler you can trust.

The core loop for GENERATING hyperscript:
1. validate_and_compile — parse your candidate into semantic IR with diagnostics; check the returned action/roles/trigger against your intent.
2. On failure: apply the diagnostics and re-validate. get_code_fixes maps error codes to concrete fixes; get_command_docs and search_patterns show correct usage.
3. compile_hyperscript — once valid, emit JavaScript. Or stop at valid hyperscript for an _="..." attribute.

To PRESENT code to a user, translate_code renders it in any of 24 languages via deterministic grammar transformation (word-order faithful, not LLM translation); translate_to_english normalizes foreign input. diff_behaviors checks two snippets for behavioral equivalence.

Prefer natural language input (code + language) for simple cases; use explicit bracket syntax ([toggle patient:.active]) or semantic JSON when you need unambiguous role control.`;

// All list/read surfaces are static per process (tool/prompt/resource lists are
// compile-time literals; resources are static docs). One hour rather than
// "forever": a rebuild + restart may change them, and the freshness guard
// refuses calls in the window where a cached list could mislead.
const STATIC_SURFACE_CACHE = { ttlMs: 3_600_000, cacheScope: 'public' as const };

// serveStdio may invoke this factory more than once per connection (a
// server/discover probe instance is built optimistically and discarded when the
// client falls back to legacy initialize), so it must stay side-effect-free:
// registry construction and the freshness baseline live at module scope /
// main(), which also keeps them describing the process rather than a
// connection.
function buildServer(): Server {
  const server = new Server(
    {
      name: '@hyperfixi/mcp-server',
      version: pkgVersion,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      instructions: SERVER_INSTRUCTIONS,
      cacheHints: {
        'tools/list': STATIC_SURFACE_CACHE,
        'prompts/list': STATIC_SURFACE_CACHE,
        'resources/list': STATIC_SURFACE_CACHE,
        'resources/read': STATIC_SURFACE_CACHE,
      },
    }
  );

  // =============================================================================
  // Tool Handlers
  // =============================================================================

  server.setRequestHandler('tools/list', async () => {
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
        // Cast: the framework's MCPToolDefinition types inputSchema.properties
        // as Record<string, unknown>, wider than the SDK's JSONValue index —
        // the values are plain JSON Schema literals at runtime.
        ...(registry.getToolDefinitions() as unknown as Tool[]),
        ...(LLM_SAMPLING_ENABLED ? samplingTools : []),
        ...dispatcherTools,
        ...irTools,
        ...debugTools,
        ...inventoryTools,
        ...trainingDataTools,
        ...feedbackTools,
        ...lsePipelineTools,
        ...grailTools,
        ...lseCorrectionTools,
      ],
    };
  });

  server.setRequestHandler('tools/call', async request => {
    const { name, arguments: args } = request.params;

    // Freshness guard. This process resolved its workspace deps' dist/ at startup and Node
    // cannot un-cache them, so a rebuild leaves every answer below reflecting the PRE-rebuild
    // code — silently, which is this server's worst failure mode. Refuse instead, at the one
    // choke point every tool call passes through. See ./freshness.ts for why detect-and-refuse
    // rather than reload or bundle.
    const stale = staleSinceStartup();
    if (stale.length > 0) {
      return staleToolError(stale);
    }

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

    // IR conversion tools (explicit ↔ JSON, protocol validation, envelopes)
    if (
      name === 'convert_format' ||
      name === 'validate_explicit' ||
      name === 'validate_protocol' ||
      name === 'to_envelope' ||
      name === 'from_envelope'
    ) {
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

    // MCP Sampling tools (Layer 3 — invoke Claude via client). Off by default:
    // see LLM_SAMPLING_ENABLED above.
    if (
      name === 'ask_claude' ||
      name === 'summarize_content' ||
      name === 'analyze_content' ||
      name === 'translate_content' ||
      name === 'execute_llm'
    ) {
      if (!LLM_SAMPLING_ENABLED) {
        return {
          content: [
            {
              type: 'text',
              text:
                `${name} is disabled: the MCP-sampling tools are opt-in (set LOKASCRIPT_MCP_LLM_TOOLS=1 ` +
                `in the server's environment and restart). They invoke a generic LLM, which a connected ` +
                `agent can do itself. For hyperscript work use validate_and_compile / compile_hyperscript; ` +
                `for natural-language translation of CODE, use translate_code (deterministic, not an LLM).`,
            },
          ],
          isError: true,
        };
      }
      return handleSamplingTool(name, args as Record<string, unknown>, server, registry);
    }

    // Debug tools (AI-assisted debugging)
    if (name.startsWith('debug_')) {
      return handleDebugTool(name, args as Record<string, unknown>);
    }

    // Template inventory tools
    if (name === 'scan_inventory' || name === 'query_inventory') {
      return handleInventoryTool(name, args as Record<string, unknown>);
    }

    // Training data tools (LLM ↔ LSE)
    if (name === 'generate_training_data') {
      return handleTrainingDataTool(name, args as Record<string, unknown>);
    }

    // Feedback loop tools (LLM ↔ LSE)
    if (name === 'lse_validate_and_feedback' || name === 'lse_pattern_stats') {
      return handleFeedbackTool(name, args as Record<string, unknown>);
    }

    // LSE pipeline tools (LLM round-trip: hyperscript ↔ LSE, plus the LSE 2.0
    // LLM-native tools — all five are defined in lsePipelineTools and handled by
    // handleLsePipelineTool; the last three were advertised but unrouted here.)
    if (
      name === 'lse_from_hyperscript' ||
      name === 'lse_to_hyperscript' ||
      name === 'execute_lse' ||
      name === 'validate_lse' ||
      name === 'translate_lse'
    ) {
      return handleLsePipelineTool(name, args as Record<string, unknown>);
    }

    // GRAIL tools (condition/affordance workflow)
    if (name.startsWith('grail_')) {
      return handleGrailTool(name, args as Record<string, unknown>);
    }

    // LSE correction tool (stateless generation + self-correction loop)
    if (name === 'lse_generate_with_correction') {
      return handleLseCorrectionTool(name, args as Record<string, unknown>);
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

  server.setRequestHandler('prompts/list', async () => {
    return {
      prompts: [
        ...getLLMPromptDefinitions(),
        ...getDebugPromptDefinitions(),
        ...getLSEPromptDefinitions(),
      ],
    };
  });

  server.setRequestHandler('prompts/get', async request => {
    const { name, arguments: promptArgs } = request.params;
    const typedArgs = (promptArgs ?? {}) as Record<string, string>;

    if (isDebugPrompt(name)) {
      return renderDebugPrompt(name, typedArgs);
    }
    if (isLSEPrompt(name)) {
      return renderLSEPrompt(name, typedArgs);
    }
    return renderLLMPrompt(name, typedArgs);
  });

  // =============================================================================
  // Resource Handlers
  // =============================================================================

  server.setRequestHandler('resources/list', async () => {
    return { resources: listResources() };
  });

  server.setRequestHandler('resources/read', async request => {
    const { uri } = request.params;
    return readResource(uri);
  });

  return server;
}

// =============================================================================
// Server Startup
// =============================================================================

async function main() {
  // Snapshot the dist/ we actually loaded, BEFORE serving. Everything above has already
  // been imported by now, so this records the true "code I am running" — the per-tool-call
  // guard compares against it.
  captureFreshnessBaseline();

  // The snapshot cannot see a dist that was ALREADY behind its src at launch: nothing
  // changes while we run, so we would serve stale code forever and look healthy. Warn
  // rather than exit — the operator may simply be mid-edit, and a server that refuses to
  // start is worse than one that says why its answers may be wrong.
  const bornStale = staleAtStartup();
  if (bornStale.length > 0) {
    console.error(
      `⚠ MCP server started against a STALE dist/ in: ${bornStale.map(s => s.pkg).join(', ')} —\n` +
        `  src/ is newer than the built output, so answers will reflect the last build, not the\n` +
        `  checkout. Rebuild, then restart this server:\n` +
        bornStale.map(s => `    npm run build --prefix ${s.dir}`).join('\n')
    );
  }

  // serveStdio serves both protocol eras per connection: the stateless
  // 2026-07-28 revision (server/discover, no handshake) and the legacy
  // initialize dialect — legacy stays at its default 'serve' because current
  // clients (including Claude Code) still connect via initialize, and the
  // sampling tools only work on that era.
  serveStdio(() => buildServer());
  console.error(`HyperFixi MCP server started (${freshnessSummary()})`);
}

main().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
