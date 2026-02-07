/**
 * LLM JSON input validation.
 *
 * Validates structured semantic JSON from LLM output and converts
 * it to a SemanticNode compatible with the semantic package.
 */

import type { SemanticJSON, SemanticJSONValue, Diagnostic } from '../types.js';

// =============================================================================
// Validation
// =============================================================================

const VALID_VALUE_TYPES = new Set(['selector', 'literal', 'reference', 'expression']);

/**
 * Validate LLM JSON input structure.
 * Returns diagnostics (empty = valid).
 */
export function validateSemanticJSON(input: SemanticJSON): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Action is required and must be a string
  if (!input.action || typeof input.action !== 'string') {
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_ACTION',
      message: 'Field "action" is required and must be a string.',
      suggestion: 'Provide a command name like "toggle", "add", "set", etc.',
    });
    return diagnostics; // Can't proceed without action
  }

  // Roles validation
  if (input.roles && typeof input.roles === 'object') {
    for (const [role, value] of Object.entries(input.roles)) {
      if (!value || typeof value !== 'object') {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_ROLE_VALUE',
          message: `Role "${role}" must be an object with "type" and "value" fields.`,
          suggestion: `Use: { "type": "selector", "value": ".active" }`,
        });
        continue;
      }

      const v = value as SemanticJSONValue;
      if (!VALID_VALUE_TYPES.has(v.type)) {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_VALUE_TYPE',
          message: `Role "${role}" has invalid type "${v.type}".`,
          suggestion: `Valid types: selector, literal, reference, expression.`,
        });
      }

      if (v.value === undefined || v.value === null) {
        diagnostics.push({
          severity: 'error',
          code: 'MISSING_VALUE',
          message: `Role "${role}" is missing the "value" field.`,
        });
      }
    }
  }

  // Trigger validation (optional)
  if (input.trigger) {
    if (!input.trigger.event || typeof input.trigger.event !== 'string') {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_TRIGGER',
        message: 'Trigger "event" is required and must be a string.',
        suggestion: 'Use an event name like "click", "mouseover", "keydown".',
      });
    }
  }

  return diagnostics;
}

// =============================================================================
// Conversion to SemanticNode
// =============================================================================

/**
 * Convert validated SemanticJSON to a SemanticNode-compatible object.
 *
 * Returns a plain object matching the SemanticNode interface from
 * @lokascript/semantic, using ReadonlyMap for roles.
 */
export function jsonToSemanticNode(input: SemanticJSON): unknown {
  const roles = new Map<string, unknown>();

  if (input.roles) {
    for (const [role, value] of Object.entries(input.roles)) {
      roles.set(role, convertJSONValue(value));
    }
  }

  // Event handler wrapping
  if (input.trigger) {
    // Set the event role
    roles.set('event', { type: 'literal', value: input.trigger.event, dataType: 'string' });

    // Build body as a single command node
    const bodyNode = {
      kind: 'command' as const,
      action: input.action,
      roles: new Map(roles),
    };
    // Remove event from body roles
    bodyNode.roles.delete('event');

    return {
      kind: 'event-handler',
      action: 'on',
      roles,
      body: [bodyNode],
      eventModifiers: input.trigger.modifiers ?? {},
    };
  }

  return {
    kind: 'command',
    action: input.action,
    roles,
  };
}

/**
 * Convert a SemanticJSONValue to a SemanticValue-compatible object.
 */
function convertJSONValue(value: SemanticJSONValue): unknown {
  switch (value.type) {
    case 'selector':
      return {
        type: 'selector',
        value: String(value.value),
        selectorKind: detectSelectorKind(String(value.value)),
      };
    case 'literal':
      return {
        type: 'literal',
        value: value.value,
        dataType:
          typeof value.value === 'number'
            ? 'number'
            : typeof value.value === 'boolean'
              ? 'boolean'
              : 'string',
      };
    case 'reference':
      return { type: 'reference', value: String(value.value) };
    case 'expression':
      return { type: 'expression', raw: String(value.value) };
    default:
      return { type: 'literal', value: String(value.value), dataType: 'string' };
  }
}

function detectSelectorKind(selector: string): string {
  if (selector.startsWith('#')) return 'id';
  if (selector.startsWith('.')) return 'class';
  if (selector.startsWith('[')) return 'attribute';
  return 'complex';
}
