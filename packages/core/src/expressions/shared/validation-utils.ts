/**
 * Validation Utilities for Expression Evaluation
 *
 * Phase 2 Consolidation: Shared primitives for input validation
 * Used by all expression categories
 *
 * Benefits:
 * - Consistent validation across all expressions
 * - Reduces boilerplate in expression classes
 * - Standardized error messages and suggestions
 */

import type { ValidationResult, ValidationError } from '../../types/base-types';

/**
 * Create a successful validation result
 */
export function validResult(): ValidationResult {
  return {
    isValid: true,
    errors: [],
    suggestions: [],
  };
}

/**
 * Create a failed validation result with errors
 *
 * @param errors - Array of validation errors
 * @param suggestions - Optional suggestions for fixing the errors
 */
export function invalidResult(
  errors: ValidationError[],
  suggestions: string[] = []
): ValidationResult {
  return {
    isValid: false,
    errors,
    suggestions,
  };
}

/**
 * Create a validation error object
 *
 * @param type - Error type
 * @param message - Error message
 * @param suggestions - Optional suggestions
 * @param severity - Error severity (defaults to 'error')
 */
export function createError(
  type: ValidationError['type'],
  message: string,
  suggestions: string[] = [],
  severity: 'error' | 'warning' | 'info' = 'error'
): ValidationError {
  return { type, message, suggestions, severity };
}

/**
 * Validate that input is an object with left and right operands
 * Used by binary expressions (math, comparison, logical)
 *
 * @param input - Input to validate
 * @returns Validation result
 */
export function validateBinaryInput(input: unknown): ValidationResult {
  if (input === null || input === undefined) {
    return invalidResult(
      [createError('missing-argument', 'Input is null or undefined')],
      ['Provide an object with left and right operands']
    );
  }

  if (typeof input !== 'object') {
    return invalidResult(
      [createError('type-mismatch', `Expected object, got ${typeof input}`)],
      ['Provide an object with left and right operands']
    );
  }

  const obj = input as Record<string, unknown>;

  // Check for required properties - BOTH must be present
  if (!('left' in obj) || !('right' in obj)) {
    const missing = [];
    if (!('left' in obj)) missing.push('left');
    if (!('right' in obj)) missing.push('right');
    return invalidResult(
      [
        createError(
          'missing-argument',
          `Missing ${missing.join(' and ')} operand${missing.length > 1 ? 's' : ''}`
        ),
      ],
      ['Provide { left: value, right: value }']
    );
  }

  return validResult();
}

/**
 * Validate that input is an object with a single value operand
 * Used by unary expressions (not, negation, etc.)
 *
 * @param input - Input to validate
 * @returns Validation result
 */
export function validateUnaryInput(input: unknown): ValidationResult {
  if (input === null || input === undefined) {
    return invalidResult(
      [createError('missing-argument', 'Input is null or undefined')],
      ['Provide an object with a value operand']
    );
  }

  if (typeof input !== 'object') {
    return invalidResult(
      [createError('type-mismatch', `Expected object, got ${typeof input}`)],
      ['Provide an object with a value operand']
    );
  }

  const obj = input as Record<string, unknown>;

  if (!('value' in obj)) {
    return invalidResult(
      [createError('missing-argument', 'Missing value operand')],
      ['Provide { value: operand }']
    );
  }

  return validResult();
}

/**
 * Validate that a value is not null or undefined
 *
 * @param value - Value to validate
 * @param name - Name for error messages
 * @returns Validation result
 */
export function validateNotNull(value: unknown, name: string): ValidationResult {
  if (value === null || value === undefined) {
    return invalidResult(
      [createError('missing-argument', `${name} is ${value === null ? 'null' : 'undefined'}`)],
      [`Provide a value for ${name}`]
    );
  }
  return validResult();
}

/**
 * Validate that a value is a number
 *
 * @param value - Value to validate
 * @param name - Name for error messages
 * @returns Validation result
 */
export function validateNumber(value: unknown, name: string): ValidationResult {
  if (typeof value !== 'number') {
    return invalidResult(
      [createError('type-mismatch', `${name} must be a number, got ${typeof value}`)],
      [`Provide a numeric value for ${name}`]
    );
  }
  if (!Number.isFinite(value)) {
    return invalidResult(
      [createError('validation-error', `${name} must be a finite number, got ${value}`)],
      ['Provide a finite number (not Infinity or NaN)']
    );
  }
  return validResult();
}

/**
 * Validate that a value is a string
 *
 * @param value - Value to validate
 * @param name - Name for error messages
 * @returns Validation result
 */
export function validateString(value: unknown, name: string): ValidationResult {
  if (typeof value !== 'string') {
    return invalidResult(
      [createError('type-mismatch', `${name} must be a string, got ${typeof value}`)],
      [`Provide a string value for ${name}`]
    );
  }
  return validResult();
}

/**
 * Validate that a value is a boolean
 *
 * @param value - Value to validate
 * @param name - Name for error messages
 * @returns Validation result
 */
export function validateBoolean(value: unknown, name: string): ValidationResult {
  if (typeof value !== 'boolean') {
    return invalidResult(
      [createError('type-mismatch', `${name} must be a boolean, got ${typeof value}`)],
      [`Provide true or false for ${name}`]
    );
  }
  return validResult();
}

/**
 * Combine multiple validation results
 * Returns invalid if any result is invalid
 *
 * @param results - Array of validation results
 * @returns Combined validation result
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const errors: ValidationError[] = [];
  const suggestions: string[] = [];

  for (const result of results) {
    if (!result.isValid) {
      errors.push(...result.errors);
      suggestions.push(...result.suggestions);
    }
  }

  if (errors.length > 0) {
    return invalidResult(errors, suggestions);
  }

  return validResult();
}
