/**
 * Shared Utility Functions for Comparison Expressions
 * Eliminates duplicate toNumber() implementations across comparison classes
 *
 * Uses Expression Type Registry for consistent type checking and coercion.
 * Bundle size savings: ~60 lines by consolidating 4 duplicate implementations
 */

import { expressionTypeRegistry } from '../type-registry';

/**
 * Convert value to number with proper null handling
 * Uses Expression Type Registry for type checking and coercion
 * Returns null if conversion is not possible
 *
 * @param value - Value to convert to number
 * @returns The numeric value, or null if conversion failed
 */
export function toNumber(value: unknown): number | null {
  // Use registry to check if already a number
  const numberType = expressionTypeRegistry.get('Number');
  if (numberType?.isType(value)) {
    return value as number;
  }

  // Try registry coercion
  const coerced = expressionTypeRegistry.coerce<number>(value, 'Number');
  if (coerced !== null && Number.isFinite(coerced)) {
    return coerced;
  }

  // Fallback for boolean (registry may return 1/0)
  const boolType = expressionTypeRegistry.get('Boolean');
  if (boolType?.isType(value)) {
    return (value as boolean) ? 1 : 0;
  }

  return null;
}

/**
 * Check if value is a number using the type registry
 */
export function isNumber(value: unknown): boolean {
  const numberType = expressionTypeRegistry.get('Number');
  return numberType ? numberType.isType(value) : typeof value === 'number';
}

/**
 * Check if value is a string using the type registry
 */
export function isString(value: unknown): boolean {
  const stringType = expressionTypeRegistry.get('String');
  return stringType ? stringType.isType(value) : typeof value === 'string';
}

/**
 * Check if value is a boolean using the type registry
 */
export function isBoolean(value: unknown): boolean {
  const boolType = expressionTypeRegistry.get('Boolean');
  return boolType ? boolType.isType(value) : typeof value === 'boolean';
}
