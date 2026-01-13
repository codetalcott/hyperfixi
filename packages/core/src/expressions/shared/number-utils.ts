/**
 * Number Utilities for Expression Evaluation
 *
 * Phase 2 Consolidation: Shared primitives for number operations
 * Used by mathematical/ and special/ expression categories
 *
 * Benefits:
 * - Breaks coupling between expression classes (e.g., SubtractionExpression no longer needs AdditionExpression)
 * - Consistent number handling across all expressions
 * - Single source of truth for type coercion
 */

/**
 * Convert unknown value to number with descriptive error context
 *
 * @param value - Value to convert
 * @param context - Description for error messages (e.g., "left operand")
 * @returns The numeric value
 * @throws Error if value cannot be converted
 */
export function toNumber(value: unknown, context: string): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`${context} must be a finite number, got ${value}`);
    }
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return 0;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      throw new Error(`${context} cannot be converted to number: "${value}"`);
    }
    return num;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (value === null || value === undefined) {
    return 0;
  }

  // Try valueOf for objects
  if (typeof value === 'object' && value !== null) {
    const primitive = (value as any).valueOf();
    if (typeof primitive === 'number' && Number.isFinite(primitive)) {
      return primitive;
    }
  }

  throw new Error(`${context} cannot be converted to number: ${typeof value}`);
}

/**
 * Try to convert value to number, return null if not possible
 * Non-throwing version for conditional logic
 *
 * @param value - Value to convert
 * @returns Number or null if conversion fails
 */
export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return 0;
    const num = parseFloat(trimmed);
    return isNaN(num) ? null : num;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (value === null || value === undefined) {
    return 0;
  }

  return null;
}

/**
 * Ensure a number is finite, throw descriptive error if not
 *
 * @param num - Number to validate
 * @param operation - Operation name for error messages (e.g., "division")
 * @returns The input number if finite
 * @throws Error if number is not finite
 */
export function ensureFinite(num: number, operation: string): number {
  if (!Number.isFinite(num)) {
    if (Number.isNaN(num)) {
      throw new Error(`${operation} resulted in non-finite value: NaN`);
    }
    throw new Error(
      `${operation} resulted in non-finite value: ${num > 0 ? 'Infinity' : '-Infinity'}`
    );
  }
  return num;
}

/**
 * Check if value is numeric (finite number or numeric string)
 *
 * @param value - Value to check
 * @returns true if value can be treated as a number
 */
export function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return false;
    return !isNaN(parseFloat(trimmed));
  }
  return false;
}

/**
 * Safely perform division with zero-check
 *
 * @param left - Dividend
 * @param right - Divisor
 * @param allowInfinity - If true, returns Infinity for division by zero (JS default)
 * @returns Result of division
 * @throws Error if dividing by zero and allowInfinity is false
 */
export function safeDivide(left: number, right: number, allowInfinity: boolean = true): number {
  if (right === 0) {
    if (allowInfinity) {
      return left === 0 ? NaN : left > 0 ? Infinity : -Infinity;
    }
    throw new Error('Division by zero');
  }
  return left / right;
}

/**
 * Safely perform modulo operation
 *
 * @param left - Dividend
 * @param right - Divisor
 * @returns Remainder of division
 * @throws Error if divisor is zero
 */
export function safeModulo(left: number, right: number): number {
  if (right === 0) {
    throw new Error('Modulo by zero');
  }
  return left % right;
}
