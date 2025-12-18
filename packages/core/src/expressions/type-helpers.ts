/**
 * Shared Type Helper Functions for Expression System
 * Centralized type checking using Expression Type Registry
 *
 * This module eliminates duplicate type helper implementations across expression files.
 * All helpers use the Expression Type Registry for consistent type checking.
 *
 * @module expressions/type-helpers
 */

import { expressionTypeRegistry } from './type-registry';

// ============================================================================
// Basic Type Checking Functions
// ============================================================================

/**
 * Check if value is a string using the type registry
 * @param value - Value to check
 * @returns True if value is a string
 */
export function isString(value: unknown): boolean {
  const stringType = expressionTypeRegistry.get('String');
  return stringType ? stringType.isType(value) : typeof value === 'string';
}

/**
 * Check if value is a number using the type registry
 * @param value - Value to check
 * @returns True if value is a number
 */
export function isNumber(value: unknown): boolean {
  const numberType = expressionTypeRegistry.get('Number');
  return numberType ? numberType.isType(value) : typeof value === 'number';
}

/**
 * Check if value is a boolean using the type registry
 * @param value - Value to check
 * @returns True if value is a boolean
 */
export function isBoolean(value: unknown): boolean {
  const boolType = expressionTypeRegistry.get('Boolean');
  return boolType ? boolType.isType(value) : typeof value === 'boolean';
}

/**
 * Check if value is an object using the type registry
 * @param value - Value to check
 * @returns True if value is a non-null object
 */
export function isObject(value: unknown): boolean {
  const objectType = expressionTypeRegistry.get('Object');
  return objectType ? objectType.isType(value) : typeof value === 'object' && value !== null;
}

/**
 * Check if value is a function using the type registry
 * @param value - Value to check
 * @returns True if value is a function
 */
export function isFunction(value: unknown): boolean {
  const funcType = expressionTypeRegistry.get('Function');
  return funcType ? funcType.isType(value) : typeof value === 'function';
}

/**
 * Check if value is an array using the type registry
 * @param value - Value to check
 * @returns True if value is an array
 */
export function isArray(value: unknown): boolean {
  const arrayType = expressionTypeRegistry.get('Array');
  return arrayType ? arrayType.isType(value) : Array.isArray(value);
}

/**
 * Check if value is an Element using the type registry
 * @param value - Value to check
 * @returns True if value is a DOM Element
 */
export function isElement(value: unknown): boolean {
  const elementType = expressionTypeRegistry.get('Element');
  return elementType ? elementType.isType(value) : value instanceof Element;
}

// ============================================================================
// Type Conversion Functions
// ============================================================================

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

// ============================================================================
// Array-like Checking
// ============================================================================

/**
 * Check if value is array-like (can be iterated with indices)
 * Includes arrays, strings, NodeLists, and objects with 'length' property
 *
 * @param value - Value to check
 * @returns True if value is array-like
 */
export function isArrayLike(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  if (typeof value === 'string') return true;
  if (value && isObject(value) && 'length' in (value as object)) return true;
  return false;
}

// ============================================================================
// Type Inference
// ============================================================================

/**
 * Simple type inference for HyperScript values
 * This provides consistent type inference across expressions
 *
 * Note: This uses explicit checks rather than the type registry to ensure
 * consistent behavior across all expression implementations. The type registry's
 * ElementList check has edge cases with sparse arrays.
 *
 * @param value - Value to infer type for
 * @returns The HyperScriptValueType
 */
export function inferType(value: unknown): 'string' | 'number' | 'boolean' | 'element' | 'array' | 'object' | 'null' | 'undefined' | 'function' | 'unknown' {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof HTMLElement) return 'element';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'function') return 'function';
  if (typeof value === 'object') return 'object';
  return 'unknown';
}
