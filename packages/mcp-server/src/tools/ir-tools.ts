/**
 * IR Conversion Tools
 *
 * Lightweight tools for converting between explicit bracket syntax and LLM JSON
 * without full compilation. Uses @lokascript/framework/ir directly.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { SemanticNode } from '@lokascript/framework';
import {
  parseExplicit,
  renderExplicit,
  jsonToSemanticNode,
  semanticNodeToJSON,
  validateSemanticJSON,
  fromProtocolJSON,
  toProtocolJSON,
  validateProtocolJSON,
  toEnvelopeJSON,
  fromEnvelopeJSON,
  isEnvelope,
  fromInterchangeNode,
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
      'Convert between explicit bracket syntax, LLM JSON, and InterchangeNode AST without compilation. ' +
      'Provide `explicit` (bracket syntax), `semantic` (JSON), or `interchange` (InterchangeNode AST). ' +
      'Returns both explicit and protocol JSON formats for bidirectional use.',
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
            'Full-fidelity or LLM-simplified JSON to convert. ' +
            'Full-fidelity: { kind, action, roles, body?, statements?, chainType?, ' +
            'thenBranch?, elseBranch?, loopVariant?, loopBody?, loopVariable?, indexVariable?, ' +
            'catchBranch?, finallyBranch?, asyncVariant?, asyncBody?, arms?, defaultArm?, ' +
            'annotations?, diagnostics? }. ' +
            'LLM-simplified: { action, roles, trigger? }. ' +
            'Envelope: { lseVersion, nodes[], features? }.',
          properties: {
            kind: {
              type: 'string',
              enum: ['command', 'event-handler', 'compound'],
              description: 'Node kind (full-fidelity only)',
            },
            action: { type: 'string' },
            roles: { type: 'object' },
            trigger: { type: 'object', description: 'Event trigger (LLM-simplified only)' },
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
              enum: ['then', 'and', 'async', 'sequential', 'pipe'],
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
            catchBranch: {
              type: 'array',
              description: 'Catch branch commands (v1.2 try/catch)',
            },
            finallyBranch: {
              type: 'array',
              description: 'Finally branch commands (v1.2 try/finally)',
            },
            asyncVariant: {
              type: 'string',
              enum: ['all', 'race'],
              description: 'Async coordination variant (v1.2)',
            },
            asyncBody: {
              type: 'array',
              description: 'Async body commands (v1.2)',
            },
            arms: {
              type: 'array',
              description: 'Match arms — array of { pattern, body } (v1.2)',
            },
            defaultArm: {
              type: 'array',
              description: 'Default match arm commands (v1.2)',
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
      'Validate a full-fidelity protocol JSON node (v1.1/v1.2). Returns diagnostics for any structural issues.',
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
  {
    name: 'to_envelope',
    description:
      'Wrap one or more protocol JSON nodes into an LSE v1.2 envelope with version metadata and feature flags.',
    inputSchema: {
      type: 'object',
      properties: {
        nodes: {
          type: 'array',
          description: 'Array of protocol JSON nodes (or explicit bracket strings to parse first)',
        },
        version: {
          type: 'string',
          description: 'LSE version string (default: "1.2")',
        },
      },
      required: ['nodes'],
    },
  },
  {
    name: 'from_envelope',
    description: 'Unwrap an LSE v1.2 envelope into its constituent semantic nodes and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        envelope: {
          type: 'object',
          description: 'LSE envelope JSON: { lseVersion, nodes[], features? }',
        },
      },
      required: ['envelope'],
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
      case 'to_envelope':
        return handleToEnvelope(args);
      case 'from_envelope':
        return handleFromEnvelope(args);
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
    // Explicit → JSON (always produce full-fidelity protocol JSON)
    const node = parseExplicit(explicitInput);
    return jsonResponse({
      ok: true,
      explicit: renderExplicit(node),
      semantic: toProtocolJSON(node),
    });
  }

  if (interchangeInput) {
    // InterchangeNode AST → SemanticNode → both formats
    const input = interchangeInput as { type: string; [key: string]: unknown };
    if (!input.type || typeof input.type !== 'string') {
      return errorResponse('InterchangeNode must have a `type` string field.');
    }
    const node = fromInterchangeNode(input);
    return jsonResponse({
      ok: true,
      explicit: renderExplicit(node),
      semantic: toProtocolJSON(node),
    });
  }

  // JSON → Explicit
  const input = semanticInput as Record<string, unknown>;

  // Detect LSE envelope by presence of `lseVersion` field
  if (isEnvelope(input)) {
    const envelope = fromEnvelopeJSON(input as any);
    const results = envelope.nodes.map((node: SemanticNode) => ({
      explicit: renderExplicit(node),
      semantic: toProtocolJSON(node),
    }));
    return jsonResponse({
      ok: true,
      envelope: { lseVersion: envelope.lseVersion, features: envelope.features },
      nodes: results,
    });
  }

  // Detect full-fidelity protocol JSON by presence of `kind` field
  const isProtocol = 'kind' in input;

  if (isProtocol) {
    // Full-fidelity protocol JSON (v1.1/v1.2 fields)
    const diagnostics = validateProtocolJSON(input);
    const errors = diagnostics.filter(d => d.severity === 'error');
    if (errors.length > 0) {
      return jsonResponse({ ok: false, diagnostics: errors });
    }
    const node = fromProtocolJSON(input as any);
    return jsonResponse({
      ok: true,
      explicit: renderExplicit(node),
      semantic: toProtocolJSON(node),
    });
  }

  // LLM-simplified JSON (no `kind` — legacy { action, roles, trigger? })
  const diagnostics = validateSemanticJSON(input as any);
  const errors = diagnostics.filter(d => d.severity === 'error');
  if (errors.length > 0) {
    return jsonResponse({ ok: false, diagnostics: errors });
  }
  const node = jsonToSemanticNode(input as any);
  return jsonResponse({
    ok: true,
    explicit: renderExplicit(node),
    semantic: toProtocolJSON(node),
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

function handleToEnvelope(args: Record<string, unknown>): ToolResponse {
  const nodes = Array.isArray(args.nodes) ? args.nodes : undefined;
  if (!nodes || nodes.length === 0) {
    return errorResponse('Missing required parameter: nodes (non-empty array)');
  }

  // Each node can be a string (explicit syntax) or an object (protocol JSON)
  const semanticNodes = nodes.map((n, i) => {
    if (typeof n === 'string') {
      return parseExplicit(n);
    }
    if (typeof n === 'object' && n) {
      const diags = validateProtocolJSON(n as Record<string, unknown>);
      const errs = diags.filter(d => d.severity === 'error');
      if (errs.length > 0) {
        throw new Error(`Node ${i}: ${errs.map(e => e.message).join('; ')}`);
      }
      return fromProtocolJSON(n as any);
    }
    throw new Error(`Node ${i}: must be a string (explicit) or object (protocol JSON)`);
  });

  const version = typeof args.version === 'string' ? args.version : '1.2';
  const envelope = toEnvelopeJSON({ lseVersion: version, nodes: semanticNodes });

  return jsonResponse({
    ok: true,
    envelope,
  });
}

function handleFromEnvelope(args: Record<string, unknown>): ToolResponse {
  const envelope = typeof args.envelope === 'object' && args.envelope ? args.envelope : undefined;
  if (!envelope) {
    return errorResponse('Missing required parameter: envelope');
  }

  if (!isEnvelope(envelope as Record<string, unknown>)) {
    return errorResponse('Invalid envelope: must have `lseVersion` and `nodes` fields');
  }

  const result = fromEnvelopeJSON(envelope as any);
  const nodes = result.nodes.map((node: SemanticNode) => ({
    explicit: renderExplicit(node),
    semantic: toProtocolJSON(node),
  }));

  return jsonResponse({
    ok: true,
    lseVersion: result.lseVersion,
    features: result.features,
    nodes,
  });
}
