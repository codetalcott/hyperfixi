/**
 * MCP Tools — Feedback Loop
 *
 * Thin wrappers around the framework's feedback module.
 * Provides LSE validation with structured feedback.
 */

import type { Tool } from '@modelcontextprotocol/server';
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
            'Input format: explicit (default), json, protocol (full-fidelity protocol JSON), or natural',
        },
        domain: {
          type: 'string',
          description: 'Domain to validate against (flow, sql, llm, todo, behaviorspec, voice)',
        },
      },
      required: ['input'],
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

    const format = (args.format as 'explicit' | 'json' | 'protocol' | 'natural') || 'explicit';
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
    }

    // Map the protocol format to 'json' for buildFeedback (which only knows explicit/json/natural)
    const feedbackFormat: 'explicit' | 'json' | 'natural' = format === 'protocol' ? 'json' : format;
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
// Helpers
// =============================================================================

async function loadDomainSchemas(domain: string): Promise<readonly CommandSchema[] | null> {
  try {
    switch (domain) {
      case 'flow':
        return (await import('@lokascript/domains/flow')).allSchemas;
      case 'sql':
        return (await import('@lokascript/domains/sql')).allSchemas;
      case 'llm':
        return (await import('@lokascript/domains/llm')).allSchemas;
      case 'todo':
        return (await import('@lokascript/domains/todo')).allSchemas;
      case 'behaviorspec':
        return (await import('@lokascript/domains/behaviorspec')).allSchemas;
      case 'voice':
        return (await import('@lokascript/domains/voice')).allSchemas;
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
