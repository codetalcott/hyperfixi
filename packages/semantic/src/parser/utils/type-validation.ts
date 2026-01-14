/**
 * Type Validation Utility
 *
 * Shared utilities for validating semantic value types against expected types.
 * Used by pattern-matcher to validate captured role values.
 */

import type { SemanticValue } from '../../types';

/**
 * Semantic value type strings.
 */
export type SemanticValueType = SemanticValue['type'];

/**
 * Check if a value type matches any of the expected types.
 *
 * The 'expression' type is treated as a wildcard that matches any value.
 * The 'property-path' type is compatible with selector, reference, and expression.
 *
 * @param actualType The actual type of the value
 * @param expectedTypes Array of expected types
 * @returns True if the type is compatible
 */
export function isTypeCompatible(
  actualType: SemanticValueType | string,
  expectedTypes: (SemanticValueType | string)[]
): boolean {
  // Empty expected types means any type is valid
  if (!expectedTypes || expectedTypes.length === 0) {
    return true;
  }

  // Direct match
  if (expectedTypes.includes(actualType)) {
    return true;
  }

  // 'expression' is always compatible (wildcard)
  if (expectedTypes.includes('expression')) {
    return true;
  }

  // 'property-path' is compatible with selector, reference, and expression
  if (actualType === 'property-path') {
    return expectedTypes.some(t => ['selector', 'reference', 'expression'].includes(t));
  }

  return false;
}

/**
 * Validate a semantic value against expected types.
 *
 * @param value The semantic value to validate
 * @param expectedTypes Array of expected types (empty means any type is valid)
 * @returns True if the value type is valid
 */
export function validateValueType(
  value: SemanticValue,
  expectedTypes?: (SemanticValueType | string)[]
): boolean {
  if (!expectedTypes || expectedTypes.length === 0) {
    return true;
  }

  return isTypeCompatible(value.type, expectedTypes);
}

/**
 * Check if a value is a CSS selector.
 */
export function isCSSSelector(value: string): boolean {
  return value.startsWith('.') || value.startsWith('#') || value.startsWith('<');
}

/**
 * Check if a value is a class name (starts with .).
 */
export function isClassName(value: string): boolean {
  return value.startsWith('.');
}

/**
 * Check if a value is an ID selector (starts with #).
 */
export function isIdSelector(value: string): boolean {
  return value.startsWith('#');
}

/**
 * Check if a value is a CSS property reference (starts with *).
 */
export function isCSSPropertyRef(value: string): boolean {
  return value.startsWith('*');
}

/**
 * Check if a value is a numeric value.
 */
export function isNumericValue(value: string): boolean {
  // Handle duration values (e.g., "100ms", "2s")
  const durationMatch = value.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
  if (durationMatch) {
    return true;
  }

  // Plain number
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
}

/**
 * Check if a value is a property name (identifier-like).
 */
export function isPropertyName(value: string): boolean {
  // Property names are identifiers (start with letter or _, contain alphanumeric)
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

/**
 * Check if a value is a variable reference (starts with :).
 */
export function isVariableRef(value: string): boolean {
  return value.startsWith(':');
}

/**
 * Check if a value is a built-in reference (me, you, it, etc.).
 */
export function isBuiltInReference(value: string): boolean {
  const builtIns = new Set(['me', 'you', 'it', 'result', 'event', 'target', 'body']);
  return builtIns.has(value.toLowerCase());
}
