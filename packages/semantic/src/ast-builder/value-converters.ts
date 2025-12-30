/**
 * Semantic Value to AST Node Converters
 *
 * Converts SemanticValue types to AST expression nodes.
 * Used by the AST builder to construct expression trees from semantic parsing results.
 */

import type {
  SemanticValue,
  LiteralValue,
  SelectorValue,
  ReferenceValue,
  PropertyPathValue,
  ExpressionValue,
} from '../types';

import {
  parseExpression,
  type ExpressionNode,
  type LiteralNode,
  type SelectorNode,
  type ContextReferenceNode,
  type PropertyAccessNode,
  type IdentifierNode,
  type ContextType,
  type SelectorKind,
} from './expression-parser';

// =============================================================================
// Value Converters
// =============================================================================

/**
 * Convert a SemanticValue to an AST ExpressionNode.
 *
 * @param value - The semantic value to convert
 * @param warnings - Optional array to collect warnings about potentially incorrect type choices
 * @returns The corresponding AST expression node
 */
export function convertValue(value: SemanticValue, warnings?: string[]): ExpressionNode {
  switch (value.type) {
    case 'literal':
      return convertLiteral(value);
    case 'selector':
      return convertSelector(value, warnings);
    case 'reference':
      return convertReference(value);
    case 'property-path':
      return convertPropertyPath(value, warnings);
    case 'expression':
      return convertExpression(value);
    default:
      // Exhaustive check
      const _exhaustive: never = value;
      throw new Error(`Unknown semantic value type: ${(_exhaustive as SemanticValue).type}`);
  }
}

/**
 * Convert a LiteralValue to a LiteralNode.
 */
export function convertLiteral(value: LiteralValue): LiteralNode {
  const result: LiteralNode = {
    type: 'literal',
    value: value.value,
  };

  // Only add dataType if defined (exactOptionalPropertyTypes)
  if (value.dataType) {
    return { ...result, dataType: value.dataType };
  }

  return result;
}

/**
 * Convert a SelectorValue to a SelectorNode.
 *
 * @param value - The selector value to convert
 * @param warnings - Optional array to collect warnings
 */
export function convertSelector(value: SelectorValue, warnings?: string[]): SelectorNode {
  // Warn if selector looks like a CSS property (starts with * followed by a letter/hyphen)
  // This catches cases like "*background-color" which should likely be a literal string
  if (warnings && value.value.startsWith('*') && /^[a-zA-Z-]/.test(value.value.slice(1))) {
    warnings.push(
      `Converted '${value.value}' to a CSS selector, but it looks like a CSS property name. ` +
      `CSS properties in commands like 'transition' should be literal strings, not selectors. ` +
      `Consider using expectedTypes: ['literal'] instead of ['literal', 'selector'] in the command schema.`
    );
  }

  return {
    type: 'selector',
    value: value.value,
    selector: value.value,
    selectorType: value.selectorKind as SelectorKind,
  };
}

/**
 * Convert a ReferenceValue to a ContextReferenceNode.
 */
export function convertReference(value: ReferenceValue): ContextReferenceNode {
  return {
    type: 'contextReference',
    contextType: value.value as ContextType,
    name: value.value,
  };
}

/**
 * Convert a PropertyPathValue to a PropertyAccessNode.
 * Recursively converts the object part.
 *
 * @param value - The property path value to convert
 * @param warnings - Optional array to collect warnings
 */
export function convertPropertyPath(value: PropertyPathValue, warnings?: string[]): PropertyAccessNode {
  return {
    type: 'propertyAccess',
    object: convertValue(value.object, warnings),
    property: value.property,
  };
}

/**
 * Convert an ExpressionValue (raw string) by parsing it with the expression parser.
 * This is the fallback for complex expressions that couldn't be fully parsed
 * at the semantic level.
 */
export function convertExpression(value: ExpressionValue): ExpressionNode {
  const result = parseExpression(value.raw);

  if (!result.success || !result.node) {
    // If parsing fails, return an identifier node with the raw value
    const identifier: IdentifierNode = {
      type: 'identifier',
      name: value.raw,
    };
    return identifier;
  }

  return result.node;
}

// =============================================================================
// Type Guards
// =============================================================================

export function isLiteralValue(value: SemanticValue): value is LiteralValue {
  return value.type === 'literal';
}

export function isSelectorValue(value: SemanticValue): value is SelectorValue {
  return value.type === 'selector';
}

export function isReferenceValue(value: SemanticValue): value is ReferenceValue {
  return value.type === 'reference';
}

export function isPropertyPathValue(value: SemanticValue): value is PropertyPathValue {
  return value.type === 'property-path';
}

export function isExpressionValue(value: SemanticValue): value is ExpressionValue {
  return value.type === 'expression';
}
