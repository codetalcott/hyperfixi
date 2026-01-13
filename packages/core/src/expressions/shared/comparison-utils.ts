/**
 * Comparison Utilities for Expression Evaluation
 *
 * Phase 2 Consolidation: Shared primitives for comparison operations
 * Used by comparison/ and logical/ expression categories
 *
 * Benefits:
 * - Unified comparison logic across all expression classes
 * - Consistent type coercion behavior
 * - Single source of truth for null/undefined handling
 */

import { toNumberOrNull } from './number-utils';

/**
 * Supported comparison operators
 */
export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | '===' | '!==';

/**
 * Compare two values using the specified operator
 * Handles type coercion consistently across all comparison expressions
 *
 * @param left - Left operand
 * @param right - Right operand
 * @param operator - Comparison operator
 * @returns Boolean result of comparison
 */
export function compareValues(
  left: unknown,
  right: unknown,
  operator: ComparisonOperator
): boolean {
  // Handle strict equality first (no coercion)
  if (operator === '===') {
    return left === right;
  }
  if (operator === '!==') {
    return left !== right;
  }

  // Handle null/undefined cases
  if (left == null || right == null) {
    return compareNullish(left, right, operator);
  }

  // Coerce to comparable values
  const [leftVal, rightVal] = coerceToComparable(left, right);

  switch (operator) {
    case '>':
      return leftVal > rightVal;
    case '<':
      return leftVal < rightVal;
    case '>=':
      return leftVal >= rightVal;
    case '<=':
      return leftVal <= rightVal;
    case '==':
      return compareEquality(left, right);
    case '!=':
      return !compareEquality(left, right);
    default:
      return false;
  }
}

/**
 * Handle comparisons involving null or undefined
 */
function compareNullish(left: unknown, right: unknown, operator: ComparisonOperator): boolean {
  const leftIsNullish = left == null;
  const rightIsNullish = right == null;

  // Both nullish
  if (leftIsNullish && rightIsNullish) {
    switch (operator) {
      case '==':
      case '>=':
      case '<=':
        return true;
      case '!=':
      case '>':
      case '<':
        return false;
      default:
        return false;
    }
  }

  // One nullish, one not
  switch (operator) {
    case '==':
      return false;
    case '!=':
      return true;
    case '>':
    case '<':
    case '>=':
    case '<=':
      return false; // Comparisons with null return false
    default:
      return false;
  }
}

/**
 * Compare two values for equality with type coercion
 * Mimics JavaScript's == behavior with some hyperscript-specific handling
 */
function compareEquality(left: unknown, right: unknown): boolean {
  // Direct equality
  if (left === right) {
    return true;
  }

  // Both are the same type
  if (typeof left === typeof right) {
    // String comparison
    if (typeof left === 'string') {
      return left === right;
    }
    // Number comparison (handles NaN)
    if (typeof left === 'number') {
      return left === right;
    }
    // Object comparison (reference equality already checked above)
    return false;
  }

  // Cross-type coercion

  // Number and string
  if (typeof left === 'number' && typeof right === 'string') {
    const rightNum = parseFloat(right);
    return !isNaN(rightNum) && left === rightNum;
  }
  if (typeof left === 'string' && typeof right === 'number') {
    const leftNum = parseFloat(left);
    return !isNaN(leftNum) && leftNum === right;
  }

  // Boolean coercion
  if (typeof left === 'boolean') {
    return compareEquality(left ? 1 : 0, right);
  }
  if (typeof right === 'boolean') {
    return compareEquality(left, right ? 1 : 0);
  }

  // Fallback: string comparison
  return String(left) === String(right);
}

/**
 * Coerce two values to comparable types
 * Returns [left, right] as numbers if both are numeric, else as strings
 *
 * @param left - Left operand
 * @param right - Right operand
 * @returns Tuple of comparable values (both numbers or both strings)
 */
export function coerceToComparable(
  left: unknown,
  right: unknown
): [number, number] | [string, string] {
  // Both are numbers
  if (typeof left === 'number' && typeof right === 'number') {
    return [left, right];
  }

  // Both are strings - try numeric comparison first
  if (typeof left === 'string' && typeof right === 'string') {
    const leftNum = parseFloat(left);
    const rightNum = parseFloat(right);
    if (!isNaN(leftNum) && !isNaN(rightNum)) {
      return [leftNum, rightNum];
    }
    return [left, right];
  }

  // Mixed types: try numeric coercion
  const leftNum = toNumberOrNull(left);
  const rightNum = toNumberOrNull(right);

  if (leftNum !== null && rightNum !== null) {
    return [leftNum, rightNum];
  }

  // Fallback to string comparison
  return [String(left), String(right)];
}

/**
 * Check if two values are equal (strict comparison)
 *
 * @param left - Left operand
 * @param right - Right operand
 * @returns true if values are strictly equal
 */
export function areStrictlyEqual(left: unknown, right: unknown): boolean {
  return left === right;
}

/**
 * Check if two values are equal (loose comparison with coercion)
 *
 * @param left - Left operand
 * @param right - Right operand
 * @returns true if values are equal after type coercion
 */
export function areLooselyEqual(left: unknown, right: unknown): boolean {
  return compareValues(left, right, '==');
}

/**
 * Check if left is greater than right
 */
export function isGreaterThan(left: unknown, right: unknown): boolean {
  return compareValues(left, right, '>');
}

/**
 * Check if left is less than right
 */
export function isLessThan(left: unknown, right: unknown): boolean {
  return compareValues(left, right, '<');
}

/**
 * Check if left is greater than or equal to right
 */
export function isGreaterThanOrEqual(left: unknown, right: unknown): boolean {
  return compareValues(left, right, '>=');
}

/**
 * Check if left is less than or equal to right
 */
export function isLessThanOrEqual(left: unknown, right: unknown): boolean {
  return compareValues(left, right, '<=');
}
