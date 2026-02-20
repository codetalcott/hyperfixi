/**
 * Cross-Domain Dispatcher MCP Tools
 *
 * Surfaces the CrossDomainDispatcher as MCP tools for auto-detecting
 * which domain handles input, parsing multi-line cross-domain input,
 * and compile-without-specifying-domain.
 */

import { CrossDomainDispatcher, type DomainRegistry } from '@lokascript/framework';
import { getString, getNumber, jsonResponse, errorResponse } from './utils.js';

// =============================================================================
// Types
// =============================================================================

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

// Lazy singleton — created on first use from the passed registry
let dispatcher: CrossDomainDispatcher | null = null;

function getDispatcher(registry: DomainRegistry): CrossDomainDispatcher {
  if (!dispatcher) {
    dispatcher = new CrossDomainDispatcher(registry, { minConfidence: 0.5 });
  }
  return dispatcher;
}

function serializeRoles(roles: Map<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of roles) {
    result[key] = value;
  }
  return result;
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const dispatcherTools = [
  {
    name: 'detect_domain',
    description:
      'Auto-detect which registered domain handles the input. Tries all domains (sql, bdd, jsx, todo, behaviorspec, llm, flow) and returns the best match by confidence score.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        input: {
          type: 'string',
          description: 'The natural-language input to classify',
        },
        language: {
          type: 'string',
          description: 'Language code (en, es, ja, ar, ko, zh, tr, fr). Default: en',
          default: 'en',
        },
      },
      required: ['input'],
    },
  },
  {
    name: 'parse_composite',
    description:
      'Parse multi-line input where each line may belong to a different domain. Skips blank and comment lines (//, --, #). Returns per-line results with domain, action, roles, and confidence.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        input: {
          type: 'string',
          description: 'Multi-line input text. Each non-blank line is matched to the best domain.',
        },
        language: {
          type: 'string',
          description: 'Language code (en, es, ja, ar, ko, zh, tr, fr). Default: en',
          default: 'en',
        },
      },
      required: ['input'],
    },
  },
  {
    name: 'compile_auto',
    description:
      'Auto-detect domain and compile in one shot. Returns compiled output along with the detected domain name.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        input: {
          type: 'string',
          description: 'The natural-language input to compile',
        },
        language: {
          type: 'string',
          description: 'Language code (en, es, ja, ar, ko, zh, tr, fr). Default: en',
          default: 'en',
        },
      },
      required: ['input'],
    },
  },
];

// =============================================================================
// Handler
// =============================================================================

export async function handleDispatcherTool(
  name: string,
  args: Record<string, unknown>,
  registry: DomainRegistry
): Promise<ToolResponse> {
  const input = getString(args, 'input');
  if (!input) return errorResponse('Missing required parameter: input');

  const language = getString(args, 'language', 'en');
  const dispatch = getDispatcher(registry);

  try {
    switch (name) {
      case 'detect_domain':
        return handleDetect(dispatch, input, language);
      case 'parse_composite':
        return handleParseComposite(dispatch, input, language);
      case 'compile_auto':
        return handleCompileAuto(dispatch, input, language);
      default:
        return errorResponse(`Unknown dispatcher tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`Dispatcher error: ${message}`);
  }
}

// =============================================================================
// Individual Handlers
// =============================================================================

async function handleDetect(
  dispatch: CrossDomainDispatcher,
  input: string,
  language: string
): Promise<ToolResponse> {
  const result = await dispatch.detect(input, language);

  if (!result) {
    return jsonResponse({
      domain: null,
      reason: 'No domain matched this input above the confidence threshold',
      input,
      language,
    });
  }

  return jsonResponse({
    domain: result.domain,
    action: result.node.action,
    roles: serializeRoles(result.node.roles),
    confidence: result.confidence,
    language,
  });
}

async function handleParseComposite(
  dispatch: CrossDomainDispatcher,
  input: string,
  language: string
): Promise<ToolResponse> {
  const result = await dispatch.parseComposite(input, language);

  return jsonResponse({
    statements: result.statements.map(s => ({
      line: s.line,
      input: s.input,
      domain: s.domain,
      action: s.node.action,
      roles: serializeRoles(s.node.roles),
      confidence: s.confidence,
    })),
    errors: result.errors,
    language,
    summary: {
      matched: result.statements.length,
      unmatched: result.errors.length,
      domains: [...new Set(result.statements.map(s => s.domain))],
    },
  });
}

async function handleCompileAuto(
  dispatch: CrossDomainDispatcher,
  input: string,
  language: string
): Promise<ToolResponse> {
  const result = await dispatch.compile(input, language);

  if (!result) {
    return jsonResponse({
      domain: null,
      ok: false,
      errors: ['No domain matched this input'],
      input,
      language,
    });
  }

  return jsonResponse({
    domain: result.domain,
    ok: result.ok,
    code: result.code ?? null,
    errors: result.errors ?? [],
    language,
  });
}
