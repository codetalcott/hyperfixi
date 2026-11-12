/**
 * IR Conversion Tools
 *
 * Lightweight tools for converting between explicit bracket syntax and
 * protocol JSON without full compilation. Uses @lokascript/framework/ir directly.
 */

import type { Tool } from '@modelcontextprotocol/server';
import type { SemanticNode } from '@lokascript/framework';
import {
  parseExplicit,
  renderExplicit,
  fromProtocolJSON,
  toProtocolJSON,
  validateProtocolJSON,
  fromInterchangeNode,
} from '@lokascript/framework';
import { jsonResponse, errorResponse, encodeNode } from './utils.js';

const WRITERS = { renderExplicit, toProtocolJSON };

/** Both forms of a node; `ok` unless neither form can carry it. */
function encoded(node: SemanticNode): Record<string, unknown> {
  const e = encodeNode(node, WRITERS);
  return { ok: e.explicit !== undefined || e.semantic !== undefined, ...e };
}

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
      'Convert between explicit bracket syntax, LLM JSON, and InterchangeNode AST without compilation. ' +
      'Provide `explicit` (bracket syntax), `semantic` (JSON), or `interchange` (InterchangeNode AST). ' +
      'Returns both explicit and protocol JSON formats for bidirectional use. ' +
      'Tip: use lse_from_hyperscript to parse natural hyperscript into LSE first, then pipe its output here.',
    inputSchema: {
      type: 'object',
      properties: {
        explicit: {
          type: 'string',
          description: 'Explicit syntax to convert: [command role:value ...]',
        },
        interchange: {
          type: 'object',
          description:
            'InterchangeNode AST object (from core or semantic parser). ' +
            'Must have a `type` discriminant field (e.g., "command", "event", "if", "repeat", etc.).',
          properties: {
            type: { type: 'string', description: 'Node type discriminant' },
          },
        },
        semantic: {
          type: 'object',
          description:
            'Protocol JSON to convert. `kind` is optional (defaults to "command"). ' +
            '`trigger` is convenience sugar that wraps a command in an event handler. ' +
            'Full form: { kind?, action, roles, trigger?, body?, statements?, chainType?, ' +
            'thenBranch?, elseBranch?, loopVariant?, loopBody?, loopVariable?, indexVariable?, ' +
            'annotations?, diagnostics? }.',
          properties: {
            kind: {
              type: 'string',
              enum: ['command', 'event-handler', 'compound'],
              description: 'Node kind (optional, defaults to "command")',
            },
            action: { type: 'string' },
            roles: { type: 'object' },
            trigger: {
              type: 'object',
              description:
                'Convenience sugar: wraps command in event handler. ' +
                '{ event: string, modifiers?: object }',
            },
            body: {
              type: 'array',
              description: 'Event handler body commands (event-handler nodes)',
            },
            statements: {
              type: 'array',
              description: 'Chained commands (compound nodes)',
            },
            chainType: {
              type: 'string',
              enum: ['then', 'and', 'async', 'sequential'],
              description: 'Chain operator (compound nodes)',
            },
            thenBranch: {
              type: 'array',
              description: 'Then-branch commands (v1.1 conditional)',
            },
            elseBranch: {
              type: 'array',
              description: 'Else-branch commands (v1.1 conditional)',
            },
            loopVariant: {
              type: 'string',
              enum: ['forever', 'times', 'for', 'while', 'until'],
              description: 'Loop variant (v1.1 loop)',
            },
            loopBody: {
              type: 'array',
              description: 'Loop body commands (v1.1 loop)',
            },
            loopVariable: {
              type: 'string',
              description: 'Loop iteration variable name (v1.1 loop)',
            },
            indexVariable: {
              type: 'string',
              description: 'Optional loop index variable name (v1.1 loop)',
            },
            annotations: {
              type: 'array',
              description: 'Metadata annotations — array of { name, value? } (v1.2)',
            },
            diagnostics: {
              type: 'array',
              description:
                'Type constraint diagnostics — array of { level, role, message, code } (v1.2)',
            },
          },
        },
      },
    },
  },
  {
    name: 'validate_explicit',
    description:
      'Validate explicit bracket syntax like `[toggle patient:.active]` without full compilation. Faster than validate_and_compile. Use ONLY for bracket syntax input, not natural language hyperscript.',
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
  {
    name: 'validate_protocol',
    description:
      'Validate a protocol JSON node (v1.1/v1.2). Returns diagnostics for any structural issues.',
    inputSchema: {
      type: 'object',
      properties: {
        json: {
          type: 'object',
          description: 'Protocol JSON node to validate (must have `kind` field)',
        },
      },
      required: ['json'],
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
      case 'validate_protocol':
        return handleValidateProtocol(args);
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
  const interchangeInput =
    typeof args.interchange === 'object' && args.interchange ? args.interchange : undefined;
  const semanticInput =
    typeof args.semantic === 'object' && args.semantic ? args.semantic : undefined;

  if (!explicitInput && !interchangeInput && !semanticInput) {
    return errorResponse(
      'Provide `explicit` (bracket syntax), `interchange` (InterchangeNode AST), or `semantic` (JSON).'
    );
  }

  if (explicitInput) {
    // Explicit → JSON (always produce protocol JSON)
    const node = parseExplicit(explicitInput);
    return jsonResponse(encoded(node));
  }

  if (interchangeInput) {
    // InterchangeNode AST → SemanticNode → both formats
    const input = interchangeInput as { type: string; [key: string]: unknown };
    if (!input.type || typeof input.type !== 'string') {
      return errorResponse('InterchangeNode must have a `type` string field.');
    }
    const node = fromInterchangeNode(input);
    return jsonResponse(encoded(node));
  }

  // JSON → Explicit
  const input = semanticInput as Record<string, unknown>;

  // Unified protocol JSON path (kind optional, trigger accepted)
  const diagnostics = validateProtocolJSON(input);
  const errors = diagnostics.filter(d => d.severity === 'error');
  if (errors.length > 0) {
    return jsonResponse({ ok: false, diagnostics: errors });
  }
  const node = fromProtocolJSON(input as any);
  return jsonResponse(encoded(node));
}

function handleValidateExplicit(args: Record<string, unknown>): ToolResponse {
  const explicit = typeof args.explicit === 'string' ? args.explicit : undefined;
  if (!explicit) {
    return errorResponse('Missing required parameter: explicit');
  }

  try {
    const node = parseExplicit(explicit);
    const json = toProtocolJSON(node);
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

function handleValidateProtocol(args: Record<string, unknown>): ToolResponse {
  const json = typeof args.json === 'object' && args.json ? args.json : undefined;
  if (!json) {
    return errorResponse('Missing required parameter: json');
  }

  const diagnostics = validateProtocolJSON(json as Record<string, unknown>);
  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');

  return jsonResponse({
    ok: errors.length === 0,
    errors,
    warnings,
  });
}
