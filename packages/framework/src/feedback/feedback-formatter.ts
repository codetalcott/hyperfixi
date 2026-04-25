/**
 * Feedback Formatter
 *
 * Maps diagnostics to machine-actionable LSEFeedback with hints,
 * corrected examples, and schema context. Enables LLMs to self-correct
 * based on structured error information.
 */

import type { Diagnostic } from '../generation/diagnostics';
import type { CommandSchema } from '../schema/command-schema';
import type { SchemaLookup, SemanticJSON, SemanticJSONValue } from '../ir/types';
import { renderExplicit } from '../ir/explicit-renderer';
import { createCommandNode } from '../core/types';
import type { LSEFeedback, FeedbackDiagnostic, FixType } from './types';

// =============================================================================
// Public API
// =============================================================================

/**
 * Build structured feedback from diagnostics and optional schema context.
 *
 * @param input - The original input text
 * @param inputFormat - Format of the input
 * @param diagnostics - Error diagnostics from validation/parsing
 * @param schemaLookup - Optional schema lookup for generating hints and corrections
 * @param action - The attempted command action (if identifiable)
 */
export function buildFeedback(
  input: string,
  inputFormat: 'explicit' | 'json' | 'natural',
  diagnostics: readonly Diagnostic[],
  schemaLookup?: SchemaLookup,
  action?: string
): LSEFeedback {
  const hasErrors = diagnostics.some(d => d.severity === 'error');
  const feedbackDiagnostics = diagnostics.map(d => toFeedbackDiagnostic(d));
  const hints = generateHints(feedbackDiagnostics, schemaLookup, action);

  let schemaInfo: LSEFeedback['schema'] | undefined;
  let correctedExample: LSEFeedback['correctedExample'] | undefined;

  if (action && schemaLookup) {
    const schema = schemaLookup.getSchema(action);
    if (schema) {
      schemaInfo = extractSchemaInfo(schema);
      if (hasErrors) {
        correctedExample = generateCorrectedExample(schema);
      }
    }
  }

  return {
    accepted: !hasErrors,
    input: { format: inputFormat, text: input },
    diagnostics: feedbackDiagnostics,
    hints,
    ...(schemaInfo && { schema: schemaInfo }),
    ...(correctedExample && { correctedExample }),
  };
}

// =============================================================================
// Diagnostic Classification
// =============================================================================

/**
 * Map a framework Diagnostic to a FeedbackDiagnostic with fix type.
 */
function toFeedbackDiagnostic(d: Diagnostic): FeedbackDiagnostic {
  const fixType = classifyFixType(d);
  return {
    severity: d.severity,
    code: d.code || 'unknown',
    message: d.message,
    ...(d.suggestions?.[0] && { suggestion: d.suggestions[0] }),
    ...(fixType && { fixType }),
  };
}

/**
 * Classify a diagnostic into a machine-actionable fix type.
 */
function classifyFixType(d: Diagnostic): FixType | undefined {
  const code = (d.code || '').toLowerCase();
  const msg = d.message.toLowerCase();

  // Missing required role
  if (
    code.includes('missing-role') ||
    code.includes('missing_role') ||
    msg.includes('required role') ||
    msg.includes('missing role')
  ) {
    return 'missing_role';
  }

  // Invalid value type
  if (
    code.includes('invalid-type') ||
    code.includes('invalid_type') ||
    code.includes('type-mismatch') ||
    msg.includes('invalid type') ||
    msg.includes('expected type')
  ) {
    return 'invalid_type';
  }

  // Unknown command
  if (
    code.includes('unknown-command') ||
    code.includes('unknown_command') ||
    msg.includes('unknown command') ||
    (msg.includes('not recognized') && msg.includes('command'))
  ) {
    return 'unknown_command';
  }

  // Unknown role
  if (
    code.includes('unknown-role') ||
    code.includes('unknown_role') ||
    msg.includes('unknown role') ||
    (msg.includes('not recognized') && msg.includes('role'))
  ) {
    return 'unknown_role';
  }

  // Syntax error (catch-all for parse errors)
  if (
    code.includes('parse') ||
    code.includes('syntax') ||
    msg.includes('syntax error') ||
    msg.includes('parse error') ||
    msg.includes('unexpected')
  ) {
    return 'syntax_error';
  }

  return undefined;
}

// =============================================================================
// Hint Generation
// =============================================================================

function generateHints(
  diagnostics: readonly FeedbackDiagnostic[],
  schemaLookup?: SchemaLookup,
  action?: string
): string[] {
  const hints: string[] = [];
  const schema = action && schemaLookup ? schemaLookup.getSchema(action) : undefined;

  for (const d of diagnostics) {
    if (d.severity !== 'error') continue;

    switch (d.fixType) {
      case 'missing_role': {
        if (schema) {
          const required = schema.roles
            .filter(r => r.required)
            .map(r => `'${r.role}' (${r.description}, type: ${r.expectedTypes.join('|')})`)
            .join(', ');
          hints.push(`Required roles for '${action}': ${required}`);
        } else {
          hints.push('Check that all required roles are present.');
        }
        break;
      }

      case 'unknown_command': {
        hints.push(
          `Command not recognized. Ensure you're using a valid command from the domain schema.`
        );
        break;
      }

      case 'unknown_role': {
        if (schema) {
          const validRoles = schema.roles.map(r => `'${r.role}'`).join(', ');
          hints.push(`Valid roles for '${action}': ${validRoles}`);
        } else {
          hints.push('Use only roles defined in the command schema.');
        }
        break;
      }

      case 'invalid_type': {
        hints.push(
          'Check value types: selectors start with #.[@*, strings use quotes, numbers are plain digits.'
        );
        break;
      }

      case 'syntax_error': {
        hints.push('Ensure bracket syntax: [command role:value ...]. No spaces around the colon.');
        break;
      }

      default: {
        if (d.suggestion) {
          hints.push(d.suggestion);
        }
      }
    }
  }

  // Deduplicate
  return [...new Set(hints)];
}

// =============================================================================
// Schema Info Extraction
// =============================================================================

function extractSchemaInfo(schema: CommandSchema): LSEFeedback['schema'] {
  const requiredRoles: string[] = [];
  const optionalRoles: string[] = [];
  const roleDescriptions: Record<string, string> = {};

  for (const role of schema.roles) {
    if (role.required) {
      requiredRoles.push(role.role);
    } else {
      optionalRoles.push(role.role);
    }
    roleDescriptions[role.role] = role.description;
  }

  return {
    action: schema.action,
    requiredRoles,
    optionalRoles,
    roleDescriptions,
  };
}

// =============================================================================
// Corrected Example Generation
// =============================================================================

function generateCorrectedExample(schema: CommandSchema): { explicit: string; json: SemanticJSON } {
  const roles = new Map<string, unknown>();
  const jsonRoles: Record<string, SemanticJSONValue> = {};

  for (const role of schema.roles) {
    if (!role.required) continue;
    const sample = sampleDefaultValue(role.role, role.expectedTypes[0] || 'expression');
    roles.set(role.role, toSemanticValue(sample));
    jsonRoles[role.role] = sample as SemanticJSONValue;
  }

  const node = createCommandNode(schema.action, roles as never);
  const explicit = renderExplicit(node);
  const json: SemanticJSON = { action: schema.action, roles: jsonRoles };

  return { explicit, json };
}

function sampleDefaultValue(
  roleName: string,
  expectedType: string
): { type: string; value: string } {
  switch (expectedType) {
    case 'selector':
      return { type: 'selector', value: `#${roleName}` };
    case 'expression':
      return { type: 'expression', value: `<${roleName}-value>` };
    case 'literal':
      return { type: 'literal', value: `<${roleName}-value>` };
    case 'reference':
      return { type: 'reference', value: 'me' };
    default:
      return { type: 'expression', value: `<${roleName}-value>` };
  }
}

function toSemanticValue(sample: { type: string; value: string }): {
  type: string;
  value: string;
  raw?: string;
  selectorKind?: string;
  dataType?: string;
} {
  switch (sample.type) {
    case 'selector':
      return { type: 'selector', value: sample.value, selectorKind: 'id' };
    case 'expression':
      return { type: 'expression', value: sample.value, raw: sample.value };
    case 'literal':
      return { type: 'literal', value: sample.value, dataType: 'string' };
    case 'reference':
      return { type: 'reference', value: sample.value };
    default:
      return { type: 'literal', value: sample.value, dataType: 'string' };
  }
}
