/**
 * MCP Tools — Feedback Loop
 *
 * Thin wrappers around the framework's feedback module.
 * Provides LSE validation with structured feedback and pattern statistics.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { SchemaLookup, Diagnostic, CommandSchema } from '@lokascript/framework';

export const feedbackTools: Tool[] = [
  {
    name: 'lse_validate_and_feedback',
    description:
      'Validate LSE input and return structured feedback with machine-actionable hints, corrected examples, and schema context for LLM self-correction.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        input: {
          type: 'string',
          description: 'The LSE input to validate (bracket syntax, JSON, or natural language)',
        },
        format: {
          type: 'string',
          description:
            'Input format: explicit (default), json, protocol (full-fidelity v1.1/v1.2), envelope (v1.2 multi-node), or natural',
        },
        domain: {
          type: 'string',
          description:
            'Domain to validate against (flow, sql, bdd, llm, jsx, todo, behaviorspec, voice)',
        },
      },
      required: ['input'],
    },
  },
  {
    name: 'lse_pattern_stats',
    description:
      'Return pattern hit-rate statistics: success rates by command and language, top diagnostic failures, and outcome distribution.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domain: {
          type: 'string',
          description: 'Filter stats by domain (optional)',
        },
      },
    },
  },
];

export async function handleFeedbackTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  switch (name) {
    case 'lse_validate_and_feedback':
      return handleValidateAndFeedback(args);
    case 'lse_pattern_stats':
      return handlePatternStats();
    default:
      return {
        content: [{ type: 'text', text: `Unknown feedback tool: ${name}` }],
        isError: true,
      };
  }
}

// =============================================================================
// lse_validate_and_feedback
// =============================================================================

async function handleValidateAndFeedback(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const { buildFeedback, parseExplicit } = await import('@lokascript/framework');

    const input = args.input as string;
    if (!input) {
      return {
        content: [{ type: 'text', text: 'Missing required parameter: input' }],
        isError: true,
      };
    }

    const format =
      (args.format as 'explicit' | 'json' | 'protocol' | 'envelope' | 'natural') || 'explicit';
    const domain = args.domain as string | undefined;

    let action: string | undefined;
    let schemaLookup: SchemaLookup | undefined;
    const diagnostics: Diagnostic[] = [];

    // Load schemas for schema lookup if domain is specified
    if (domain) {
      const schemas = await loadDomainSchemas(domain);
      if (schemas) {
        schemaLookup = createSchemaLookup(schemas);
      }
    }

    if (format === 'explicit') {
      // parseExplicit throws on error
      try {
        const result = parseExplicit(input, { schemaLookup });
        if (result) {
          action = result.action;
        }
      } catch (e) {
        diagnostics.push({
          severity: 'error',
          message: e instanceof Error ? e.message : 'Parse error: invalid bracket syntax',
          code: 'parse-error',
        });
      }
    } else if (format === 'json') {
      try {
        const parsed = JSON.parse(input);
        action = parsed.action;
        if (!action) {
          diagnostics.push({
            severity: 'error',
            message: 'JSON missing required "action" field',
            code: 'missing-role',
          });
        }
      } catch {
        diagnostics.push({
          severity: 'error',
          message: 'Invalid JSON syntax',
          code: 'parse-error',
        });
      }
    } else if (format === 'protocol') {
      // Full-fidelity protocol JSON (v1.1/v1.2)
      try {
        const { validateProtocolJSON, fromProtocolJSON } = await import('@lokascript/framework');
        const parsed = JSON.parse(input);
        const protoDiags = validateProtocolJSON(parsed);
        for (const d of protoDiags) {
          diagnostics.push({ severity: d.severity, message: d.message, code: d.code });
        }
        if (protoDiags.filter(d => d.severity === 'error').length === 0) {
          const node = fromProtocolJSON(parsed);
          action = node.action;
        }
      } catch (e) {
        diagnostics.push({
          severity: 'error',
          message: e instanceof Error ? e.message : 'Invalid protocol JSON',
          code: 'parse-error',
        });
      }
    } else if (format === 'envelope') {
      // LSE v1.2 envelope: { lseVersion, nodes[], features? }
      try {
        const { isEnvelope, fromEnvelopeJSON, validateProtocolJSON } =
          await import('@lokascript/framework');
        const parsed = JSON.parse(input);
        if (!isEnvelope(parsed)) {
          diagnostics.push({
            severity: 'error',
            message: 'Not a valid LSE envelope: missing lseVersion or nodes',
            code: 'invalid-envelope',
          });
        } else {
          // Validate each node in the envelope
          for (let i = 0; i < parsed.nodes.length; i++) {
            const nodeDiags = validateProtocolJSON(parsed.nodes[i]);
            for (const d of nodeDiags) {
              diagnostics.push({
                severity: d.severity,
                message: `Node ${i}: ${d.message}`,
                code: d.code,
              });
            }
          }
          if (diagnostics.filter(d => d.severity === 'error').length === 0) {
            const envelope = fromEnvelopeJSON(parsed);
            action = envelope.nodes[0]?.action;
          }
        }
      } catch (e) {
        diagnostics.push({
          severity: 'error',
          message: e instanceof Error ? e.message : 'Invalid envelope JSON',
          code: 'parse-error',
        });
      }
    }

    // Map protocol/envelope formats to 'json' for buildFeedback (which only knows explicit/json/natural)
    const feedbackFormat: 'explicit' | 'json' | 'natural' =
      format === 'protocol' || format === 'envelope' ? 'json' : format;
    const feedback = buildFeedback(input, feedbackFormat, diagnostics, schemaLookup, action);

    return {
      content: [{ type: 'text', text: JSON.stringify(feedback, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Feedback tool error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// lse_pattern_stats
// =============================================================================

// Shared tracker instance for the MCP server lifetime
let _tracker: import('@lokascript/framework').PatternTracker | null = null;

async function getTracker(): Promise<import('@lokascript/framework').PatternTracker> {
  if (!_tracker) {
    const { PatternTracker } = await import('@lokascript/framework');
    _tracker = new PatternTracker(1000);
  }
  return _tracker;
}

/**
 * Get the shared PatternTracker instance (for recording events from other tools).
 */
export async function getSharedTracker(): Promise<import('@lokascript/framework').PatternTracker> {
  return getTracker();
}

async function handlePatternStats(): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    const tracker = await getTracker();
    const summary = tracker.getSummary();

    const text =
      summary.totalEvents === 0
        ? 'No pattern events recorded yet. Events are recorded as LSE inputs are validated.'
        : JSON.stringify(summary, null, 2);

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Pattern stats error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

async function loadDomainSchemas(domain: string): Promise<readonly CommandSchema[] | null> {
  try {
    switch (domain) {
      case 'flow':
        return (await import('@lokascript/domain-flow')).allSchemas;
      case 'sql':
        return (await import('@lokascript/domain-sql')).allSchemas;
      case 'bdd':
        return (await import('@lokascript/domain-bdd')).allSchemas;
      case 'llm':
        return (await import('@lokascript/domain-llm')).allSchemas;
      case 'jsx':
        return (await import('@lokascript/domain-jsx')).allSchemas;
      case 'todo':
        return (await import('@lokascript/domain-todo')).allSchemas;
      case 'behaviorspec':
        return (await import('@lokascript/domain-behaviorspec')).allSchemas;
      case 'voice':
        return (await import('@lokascript/domain-voice')).allSchemas;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function createSchemaLookup(schemas: readonly CommandSchema[]): SchemaLookup {
  const map = new Map<string, CommandSchema>();
  for (const s of schemas) {
    map.set(s.action, s);
  }
  return {
    getSchema(action: string) {
      return map.get(action);
    },
  };
}
