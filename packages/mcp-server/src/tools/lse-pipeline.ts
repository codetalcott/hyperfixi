/**
 * LSE Pipeline Tools
 *
 * End-to-end LLM round-trip pipeline:
 *   hyperscript → parse → SemanticNode → LSE bracket/JSON → LLM → LSE back → validate → compile
 *
 * Two tools:
 *   - lse_from_hyperscript: parse hyperscript (any of 24 languages) → LSE
 *   - lse_to_hyperscript: validate/compile LSE from an LLM response → JS
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { jsonResponse, errorResponse } from './utils.js';

// =============================================================================
// Types
// =============================================================================

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

// =============================================================================
// Tool Definitions
// =============================================================================

export const lsePipelineTools: Tool[] = [
  // ── Phase 7.5: LLM-Native LSE tools ──────────────────────────────────────
  {
    name: 'execute_lse',
    description:
      'Execute LSE bracket syntax directly. Parses the LSE, compiles to JavaScript, and returns ' +
      'the execution result. Use this when an LLM has generated LSE and you want to run it.',
    inputSchema: {
      type: 'object',
      properties: {
        lse: {
          type: 'string',
          description: 'LSE bracket syntax: [command role:value ...]',
        },
      },
      required: ['lse'],
    },
  },
  {
    name: 'validate_lse',
    description:
      'Validate LSE bracket syntax or protocol JSON without executing. Returns diagnostics ' +
      '(errors, warnings) and the normalized LSE. Use for pre-flight checks before execution.',
    inputSchema: {
      type: 'object',
      properties: {
        lse: {
          type: 'string',
          description: 'LSE bracket syntax to validate',
        },
        protocol: {
          type: 'object',
          description: 'Protocol JSON to validate (alternative to lse)',
        },
      },
    },
  },
  {
    name: 'translate_lse',
    description:
      'Translate LSE bracket syntax to natural language in a specified target language. ' +
      'Returns the natural-language hyperscript equivalent. Supports all 24 languages.',
    inputSchema: {
      type: 'object',
      properties: {
        lse: {
          type: 'string',
          description: 'LSE bracket syntax: [command role:value ...]',
        },
        language: {
          type: 'string',
          description: 'Target language code (e.g., en, ja, es, ko, ar, zh)',
        },
      },
      required: ['lse', 'language'],
    },
  },
  // ── Existing pipeline tools ───────────────────────────────────────────────
  {
    name: 'lse_from_hyperscript',
    description:
      'Parse hyperscript code (any of 24 languages) to LSE bracket syntax and protocol JSON. ' +
      'Use this to get a structured representation for LLM modification or cross-language translation. ' +
      'Returns both bracket syntax (human-readable) and protocol JSON (machine-readable).',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Hyperscript code in any supported language',
        },
        language: {
          type: 'string',
          description: 'ISO 639-1 language code (default: en)',
        },
        confidence: {
          type: 'number',
          description: 'Minimum confidence threshold for semantic parsing (default: 0.5)',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'lse_to_hyperscript',
    description:
      'Validate and optionally compile LSE bracket syntax or protocol JSON returned by an LLM. ' +
      'Returns validation diagnostics, the normalized LSE, and optionally compiled JavaScript. ' +
      'Use lse_validate_and_feedback for richer error feedback with correction hints.',
    inputSchema: {
      type: 'object',
      properties: {
        lse: {
          type: 'string',
          description: 'LSE bracket syntax: [command role:value ...]',
        },
        protocol: {
          type: 'object',
          description: 'Protocol JSON (alternative to lse). Must have `kind` field.',
        },
        compile: {
          type: 'boolean',
          description: 'Also compile to JavaScript (default: true)',
        },
      },
    },
  },
];

// =============================================================================
// Handler
// =============================================================================

export async function handleLsePipelineTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResponse> {
  try {
    switch (name) {
      case 'execute_lse':
        return await handleExecuteLse(args);
      case 'validate_lse':
        return await handleValidateLse(args);
      case 'translate_lse':
        return await handleTranslateLse(args);
      case 'lse_from_hyperscript':
        return await handleFromHyperscript(args);
      case 'lse_to_hyperscript':
        return await handleToHyperscript(args);
      default:
        return errorResponse(`Unknown LSE pipeline tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`LSE pipeline error: ${message}`);
  }
}

// =============================================================================
// lse_from_hyperscript
// =============================================================================

async function handleFromHyperscript(args: Record<string, unknown>): Promise<ToolResponse> {
  const code = args.code as string;
  if (!code || typeof code !== 'string') {
    return errorResponse('Missing required parameter: code');
  }

  const language = (args.language as string) || 'en';
  const minConfidence = typeof args.confidence === 'number' ? args.confidence : 0.5;

  // Step 1: Parse with the semantic parser (handles all 24 languages)
  const { parseSemantic } = await import('@lokascript/semantic');
  const parseResult = parseSemantic(code, language);

  if (!parseResult.node) {
    return jsonResponse({
      ok: false,
      error: 'Semantic parsing failed — no node produced',
      confidence: parseResult.confidence,
      language,
    });
  }

  if (parseResult.confidence < minConfidence) {
    return jsonResponse({
      ok: false,
      error: `Confidence ${parseResult.confidence.toFixed(2)} below threshold ${minConfidence}`,
      confidence: parseResult.confidence,
      language,
    });
  }

  // Step 2: Convert semantic AST → InterchangeNode → SemanticNode (framework IR)
  const { fromSemanticAST } = await import('@lokascript/semantic');
  const { fromInterchangeNode, renderExplicit, toProtocolJSON } =
    await import('@lokascript/framework');

  const interchangeNode = fromSemanticAST(parseResult.node as any);
  const semanticNode = fromInterchangeNode(interchangeNode as any);

  // Step 3: Render to both formats
  const explicit = renderExplicit(semanticNode);
  const protocol = toProtocolJSON(semanticNode);

  return jsonResponse({
    ok: true,
    lse: explicit,
    protocol,
    confidence: parseResult.confidence,
    language,
  });
}

// =============================================================================
// lse_to_hyperscript
// =============================================================================

async function handleToHyperscript(args: Record<string, unknown>): Promise<ToolResponse> {
  const lseInput = typeof args.lse === 'string' ? args.lse : undefined;
  const protocolInput =
    typeof args.protocol === 'object' && args.protocol ? args.protocol : undefined;
  const shouldCompile = args.compile !== false; // default true

  if (!lseInput && !protocolInput) {
    return errorResponse('Provide `lse` (bracket syntax) or `protocol` (JSON).');
  }

  const { parseExplicit, renderExplicit, toProtocolJSON, fromProtocolJSON, validateProtocolJSON } =
    await import('@lokascript/framework');

  let node;
  const diagnostics: Array<{ severity: string; code: string; message: string }> = [];

  if (lseInput) {
    // Parse bracket syntax
    try {
      node = parseExplicit(lseInput);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Invalid bracket syntax';

      // Build structured feedback for LLM self-correction
      try {
        const { buildFeedback } = await import('@lokascript/framework');
        const actionMatch = lseInput.match(/^\[\s*(\w+)/);
        const feedback = buildFeedback(
          lseInput,
          'explicit',
          [{ severity: 'error' as const, message: errorMessage, code: 'EXPLICIT_PARSE_ERROR' }],
          undefined,
          actionMatch?.[1]
        );
        return jsonResponse({ ok: false, feedback });
      } catch {
        // buildFeedback not available — fall back to flat diagnostics
        diagnostics.push({
          severity: 'error',
          code: 'EXPLICIT_PARSE_ERROR',
          message: errorMessage,
        });
      }
    }
  } else if (protocolInput) {
    // Validate + deserialize protocol JSON
    const protoDiags = validateProtocolJSON(protocolInput as Record<string, unknown>);
    const hasErrors = protoDiags.some((d: { severity: string }) => d.severity === 'error');

    if (hasErrors) {
      // Build structured feedback for protocol JSON errors
      try {
        const { buildFeedback } = await import('@lokascript/framework');
        const feedback = buildFeedback(
          JSON.stringify(protocolInput, null, 2),
          'json',
          protoDiags.map((d: { severity: string; message: string; code: string }) => ({
            severity: d.severity as 'error' | 'warning' | 'info',
            message: d.message,
            code: d.code,
          })),
          undefined,
          (protocolInput as Record<string, unknown>).action as string | undefined
        );
        return jsonResponse({ ok: false, feedback });
      } catch {
        // buildFeedback not available — fall back to flat diagnostics
        for (const d of protoDiags) {
          diagnostics.push({ severity: d.severity, code: d.code, message: d.message });
        }
      }
    } else {
      // No errors — still capture warnings
      for (const d of protoDiags) {
        diagnostics.push({ severity: d.severity, code: d.code, message: d.message });
      }
      node = fromProtocolJSON(protocolInput as any);
    }
  }

  if (!node) {
    return jsonResponse({ ok: false, diagnostics });
  }

  // Normalize: re-render to get canonical forms
  const normalizedLse = renderExplicit(node);
  const normalizedProtocol = toProtocolJSON(node);

  const result: Record<string, unknown> = {
    ok: true,
    lse: normalizedLse,
    protocol: normalizedProtocol,
    diagnostics,
  };

  // Optional: compile to JavaScript via the compilation service
  if (shouldCompile) {
    try {
      const { CompilationService } = await import('@lokascript/compilation-service');
      const service = await CompilationService.create();
      const compileResult = service.compile({ explicit: normalizedLse });
      result.js = compileResult.ok ? compileResult.js : undefined;
      if (!compileResult.ok && compileResult.diagnostics) {
        for (const d of compileResult.diagnostics) {
          if (d.severity === 'error') {
            diagnostics.push({
              severity: 'error',
              code: 'COMPILE_ERROR',
              message: d.message,
            });
          }
        }
      }
    } catch (e) {
      // Compilation service not available — not a fatal error
      result.js = undefined;
      result.compileNote = 'Compilation service unavailable';
    }
  }

  return jsonResponse(result);
}

// =============================================================================
// execute_lse (Phase 7.5)
// =============================================================================

async function handleExecuteLse(args: Record<string, unknown>): Promise<ToolResponse> {
  const lseInput = args.lse as string;
  if (!lseInput || typeof lseInput !== 'string') {
    return errorResponse('Missing required parameter: lse');
  }

  const { parseExplicit, renderExplicit, toProtocolJSON } = await import('@lokascript/framework');

  // Parse
  let node;
  try {
    node = parseExplicit(lseInput);
  } catch (e) {
    return errorResponse(`LSE parse error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Normalize
  const normalizedLse = renderExplicit(node);
  const protocol = toProtocolJSON(node);

  // Compile to JavaScript
  let js: string | undefined;
  try {
    const { CompilationService } = await import('@lokascript/compilation-service');
    const service = await CompilationService.create();
    const compileResult = service.compile({ explicit: normalizedLse });
    js = compileResult.ok ? compileResult.js : undefined;
  } catch {
    // Compilation service not available
  }

  return jsonResponse({
    ok: true,
    lse: normalizedLse,
    protocol,
    js,
    note: js
      ? 'Compiled successfully'
      : 'Compilation service unavailable — parsed and validated only',
  });
}

// =============================================================================
// validate_lse (Phase 7.5)
// =============================================================================

async function handleValidateLse(args: Record<string, unknown>): Promise<ToolResponse> {
  const lseInput = typeof args.lse === 'string' ? args.lse : undefined;
  const protocolInput =
    typeof args.protocol === 'object' && args.protocol ? args.protocol : undefined;

  if (!lseInput && !protocolInput) {
    return errorResponse('Provide `lse` (bracket syntax) or `protocol` (JSON).');
  }

  const { parseExplicit, renderExplicit, validateProtocolJSON } =
    await import('@lokascript/framework');

  const diagnostics: Array<{ severity: string; code: string; message: string }> = [];

  if (lseInput) {
    try {
      const node = parseExplicit(lseInput);
      const normalized = renderExplicit(node);
      return jsonResponse({
        valid: true,
        normalized,
        diagnostics: [],
      });
    } catch (e) {
      diagnostics.push({
        severity: 'error',
        code: 'PARSE_ERROR',
        message: e instanceof Error ? e.message : String(e),
      });
      return jsonResponse({ valid: false, diagnostics });
    }
  }

  if (protocolInput) {
    const protoDiags = validateProtocolJSON(protocolInput as Record<string, unknown>);
    const hasErrors = protoDiags.some((d: { severity: string }) => d.severity === 'error');
    return jsonResponse({
      valid: !hasErrors,
      diagnostics: protoDiags,
    });
  }

  return jsonResponse({ valid: false, diagnostics });
}

// =============================================================================
// translate_lse (Phase 7.5)
// =============================================================================

async function handleTranslateLse(args: Record<string, unknown>): Promise<ToolResponse> {
  const lseInput = args.lse as string;
  const language = args.language as string;

  if (!lseInput || typeof lseInput !== 'string') {
    return errorResponse('Missing required parameter: lse');
  }
  if (!language || typeof language !== 'string') {
    return errorResponse('Missing required parameter: language');
  }

  try {
    // Parse LSE to extract action and roles, build English equivalent, then translate
    const { parseExplicit, renderExplicit } = await import('@lokascript/framework');
    const { translate } = await import('@lokascript/semantic');

    const node = parseExplicit(lseInput);
    const normalized = renderExplicit(node);

    // Build English from the semantic node for translation
    // The explicit renderer in the semantic package can convert nodes → natural language
    const action = (node as any).action;
    const roles = (node as any).roles as Map<string, any> | Record<string, any>;
    const parts: string[] = [action];

    // Convert roles to English-style natural language
    const roleEntries = roles instanceof Map ? [...roles.entries()] : Object.entries(roles || {});
    for (const [role, value] of roleEntries) {
      const val = typeof value === 'object' && value !== null ? (value.value ?? value) : value;
      if (role === 'patient') {
        parts.push(String(val));
      } else if (role === 'destination') {
        parts.push('on', String(val));
      } else if (role === 'source') {
        parts.push('from', String(val));
      } else {
        parts.push(String(val));
      }
    }

    const english = parts.join(' ');
    const translated = translate(english, 'en', language);

    return jsonResponse({
      ok: true,
      language,
      translated,
      lse: normalized,
      english,
    });
  } catch (e) {
    return errorResponse(`Translation error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
