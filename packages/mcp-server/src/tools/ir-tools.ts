/**
 * IR Conversion Tools
 *
 * Lightweight tools for converting between explicit bracket syntax and LLM JSON
 * without full compilation. Uses @lokascript/framework/ir directly.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  parseExplicit,
  renderExplicit,
  jsonToSemanticNode,
  semanticNodeToJSON,
  validateSemanticJSON,
} from '@lokascript/framework';
import { jsonResponse, errorResponse } from './utils.js';

// =============================================================================
// Types
// =============================================================================

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

// =============================================================================
// Tool Definitions
// =============================================================================

export const irTools: Tool[] = [
  {
    name: 'convert_format',
    description:
      'Convert between explicit bracket syntax and LLM JSON without compilation. ' +
      'Provide either `explicit` (e.g., "[toggle patient:.active]") or `semantic` (JSON object). ' +
      'Returns both formats for bidirectional use.',
    inputSchema: {
      type: 'object',
      properties: {
        explicit: {
          type: 'string',
          description: 'Explicit syntax to convert: [command role:value ...]',
        },
        semantic: {
          type: 'object',
          description: 'LLM JSON to convert: { action, roles }',
          properties: {
            action: { type: 'string' },
            roles: { type: 'object' },
            trigger: { type: 'object' },
          },
        },
      },
    },
  },
  {
    name: 'validate_explicit',
    description:
      'Validate explicit bracket syntax without compiling. Returns parsed semantic representation and diagnostics. ' +
      'Faster than validate_and_compile since it uses only the framework IR layer.',
    inputSchema: {
      type: 'object',
      properties: {
        explicit: {
          type: 'string',
          description: 'Explicit syntax to validate: [command role:value ...]',
        },
      },
      required: ['explicit'],
    },
  },
];

// =============================================================================
// Handler
// =============================================================================

export async function handleIRTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResponse> {
  try {
    switch (name) {
      case 'convert_format':
        return handleConvertFormat(args);
      case 'validate_explicit':
        return handleValidateExplicit(args);
      default:
        return errorResponse(`Unknown IR tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`IR tool error: ${message}`);
  }
}

// =============================================================================
// Individual Handlers
// =============================================================================

function handleConvertFormat(args: Record<string, unknown>): ToolResponse {
  const explicitInput = typeof args.explicit === 'string' ? args.explicit : undefined;
  const semanticInput =
    typeof args.semantic === 'object' && args.semantic ? args.semantic : undefined;

  if (!explicitInput && !semanticInput) {
    return errorResponse(
      'Provide either `explicit` (bracket syntax string) or `semantic` (JSON object).'
    );
  }

  if (explicitInput) {
    // Explicit → JSON
    const node = parseExplicit(explicitInput);
    const json = semanticNodeToJSON(node);
    return jsonResponse({
      ok: true,
      explicit: renderExplicit(node),
      semantic: json,
    });
  }

  // JSON → Explicit
  const diagnostics = validateSemanticJSON(semanticInput as any);
  const errors = diagnostics.filter(d => d.severity === 'error');
  if (errors.length > 0) {
    return jsonResponse({
      ok: false,
      diagnostics: errors,
    });
  }

  const node = jsonToSemanticNode(semanticInput as any);
  return jsonResponse({
    ok: true,
    explicit: renderExplicit(node),
    semantic: semanticNodeToJSON(node),
  });
}

function handleValidateExplicit(args: Record<string, unknown>): ToolResponse {
  const explicit = typeof args.explicit === 'string' ? args.explicit : undefined;
  if (!explicit) {
    return errorResponse('Missing required parameter: explicit');
  }

  try {
    const node = parseExplicit(explicit);
    const json = semanticNodeToJSON(node);
    return jsonResponse({
      ok: true,
      semantic: json,
      diagnostics: [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          code: 'EXPLICIT_PARSE_ERROR',
          message,
        },
      ],
    });
  }
}
