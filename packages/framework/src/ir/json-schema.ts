/**
 * LLM JSON Schema Conversion
 *
 * Converts between the LLM JSON format (SemanticJSON) and SemanticNode.
 * Provides validation for LLM-generated input and bidirectional conversion.
 */

import type {
  SemanticNode,
  SemanticValue,
  SemanticRole,
  EventHandlerSemanticNode,
  CompoundSemanticNode,
} from '../core/types';
import {
  createCommandNode,
  createEventHandlerNode,
  createSelector,
  createLiteral,
  createReference,
  createExpression,
  createFlag,
} from '../core/types';
import type { SemanticJSON, SemanticJSONValue, IRDiagnostic } from './types';

// =============================================================================
// Validation
// =============================================================================

const VALID_VALUE_TYPES = new Set([
  'selector',
  'literal',
  'reference',
  'expression',
  'property-path',
  'flag',
]);

/**
 * Validate LLM JSON input structure.
 * Returns diagnostics (empty array = valid).
 */
export function validateSemanticJSON(input: SemanticJSON): IRDiagnostic[] {
  const diagnostics: IRDiagnostic[] = [];

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
          suggestion: 'Use: { "type": "selector", "value": ".active" }',
        });
        continue;
      }

      const v = value as SemanticJSONValue;
      if (!VALID_VALUE_TYPES.has(v.type)) {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_VALUE_TYPE',
          message: `Role "${role}" has invalid type "${v.type}".`,
          suggestion: 'Valid types: selector, literal, reference, expression, property-path.',
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
// JSON → SemanticNode
// =============================================================================

/**
 * Convert validated SemanticJSON to a SemanticNode.
 *
 * Returns a properly typed SemanticNode using the framework's factory functions.
 * If `trigger` is present, wraps the command in an event handler node.
 */
export function jsonToSemanticNode(input: SemanticJSON): SemanticNode {
  const roles = new Map<SemanticRole, SemanticValue>();

  if (input.roles) {
    for (const [role, value] of Object.entries(input.roles)) {
      roles.set(role as SemanticRole, convertJSONValue(value));
    }
  }

  // Event handler wrapping
  if (input.trigger) {
    // Set the event role
    roles.set('event' as SemanticRole, createLiteral(input.trigger.event, 'string'));

    // Build body as a single command node
    const bodyRoles = new Map(roles);
    bodyRoles.delete('event' as SemanticRole);
    const bodyNode = createCommandNode(input.action, bodyRoles);

    return createEventHandlerNode(
      'on',
      roles,
      [bodyNode],
      { sourceLanguage: 'json' },
      (input.trigger.modifiers as Record<string, unknown> | undefined) ?? {}
    );
  }

  return createCommandNode(input.action, roles, {
    sourceLanguage: 'json',
  });
}

// =============================================================================
// SemanticNode → JSON
// =============================================================================

/**
 * Convert a SemanticNode to SemanticJSON format.
 *
 * This is the inverse of jsonToSemanticNode(). For event handlers,
 * the event is extracted into the `trigger` field.
 */
export function semanticNodeToJSON(node: SemanticNode): SemanticJSON {
  if (node.kind === 'compound') {
    // Compound nodes: use first statement's action, flatten roles
    const compound = node as CompoundSemanticNode;
    if (compound.statements.length > 0) {
      return semanticNodeToJSON(compound.statements[0]);
    }
    return { action: 'compound', roles: {} };
  }

  if (node.kind === 'event-handler') {
    const eventNode = node as EventHandlerSemanticNode;
    const bodyAction = eventNode.body?.[0]?.action ?? node.action;
    const roles: Record<string, SemanticJSONValue> = {};

    // Convert body's roles (not the event handler's)
    if (eventNode.body?.[0]) {
      for (const [role, value] of eventNode.body[0].roles) {
        roles[role] = semanticValueToJSON(value);
      }
    }

    // Extract event from roles
    const eventValue = node.roles.get('event');
    const eventName = eventValue
      ? 'value' in eventValue
        ? String(eventValue.value)
        : 'raw' in eventValue
          ? eventValue.raw
          : 'unknown'
      : 'unknown';

    const result: SemanticJSON = {
      action: bodyAction === 'on' ? (eventNode.body?.[0]?.action ?? 'on') : bodyAction,
      roles,
      trigger: {
        event: eventName,
      },
    };

    if (eventNode.eventModifiers && Object.keys(eventNode.eventModifiers).length > 0) {
      result.trigger!.modifiers = eventNode.eventModifiers as Record<string, unknown>;
    }

    return result;
  }

  // Regular command
  const roles: Record<string, SemanticJSONValue> = {};
  for (const [role, value] of node.roles) {
    roles[role] = semanticValueToJSON(value);
  }

  return { action: node.action, roles };
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Convert a SemanticJSONValue to a SemanticValue.
 */
function convertJSONValue(value: SemanticJSONValue): SemanticValue {
  switch (value.type) {
    case 'selector':
      return createSelector(String(value.value), detectSelectorKind(String(value.value)));

    case 'literal':
      return createLiteral(
        value.value,
        typeof value.value === 'number'
          ? 'number'
          : typeof value.value === 'boolean'
            ? 'boolean'
            : 'string'
      );

    case 'reference':
      return createReference(String(value.value));

    case 'expression':
      return createExpression(String(value.value));

    case 'property-path':
      // Property paths in JSON are represented as dot-separated strings
      return createExpression(String(value.value));

    case 'flag':
      return createFlag(String(value.value), true);

    default:
      return createLiteral(String(value.value), 'string');
  }
}

/**
 * Convert a SemanticValue to a SemanticJSONValue.
 */
function semanticValueToJSON(value: SemanticValue): SemanticJSONValue {
  switch (value.type) {
    case 'selector':
      return { type: 'selector', value: value.value };

    case 'literal':
      return { type: 'literal', value: value.value };

    case 'reference':
      return { type: 'reference', value: value.value };

    case 'expression':
      return { type: 'expression', value: value.raw };

    case 'property-path':
      return {
        type: 'property-path',
        value: `${semanticValueToJSON(value.object).value}.${value.property}`,
      };

    case 'flag':
      return { type: 'flag', value: value.enabled };
  }
}

function detectSelectorKind(selector: string): 'id' | 'class' | 'attribute' | 'complex' {
  if (selector.startsWith('#')) return 'id';
  if (selector.startsWith('.')) return 'class';
  if (selector.startsWith('[')) return 'attribute';
  return 'complex';
}
