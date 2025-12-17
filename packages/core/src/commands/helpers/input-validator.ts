/**
 * Input Validation Helpers for Commands
 *
 * Phase 3 Consolidation: Shared validation utilities for command inputs
 * Used by toggle, add, remove, set, and other commands.
 *
 * Provides:
 * - Target array validation (non-empty, all HTMLElements)
 * - String array validation
 * - Type discriminator validation for discriminated unions
 * - Common validation patterns
 */

import { isHTMLElement, isElement } from '../../utils/element-check';

/**
 * Validation result with optional error message
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that a targets array is non-empty and contains only HTMLElements
 *
 * Common pattern in DOM commands that operate on target elements.
 *
 * @param targets - Array of potential target elements
 * @param commandName - Command name for error messages
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateTargetArray(input.targets, 'toggle');
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export function validateTargetArray(
  targets: unknown[],
  commandName: string = 'command'
): ValidationResult {
  if (!Array.isArray(targets)) {
    return {
      valid: false,
      error: `${commandName}: targets must be an array`,
    };
  }

  if (targets.length === 0) {
    return {
      valid: false,
      error: `${commandName}: no targets specified`,
    };
  }

  const nonElements = targets.filter(t => !isHTMLElement(t));
  if (nonElements.length > 0) {
    return {
      valid: false,
      error: `${commandName}: all targets must be HTMLElements`,
    };
  }

  return { valid: true };
}

/**
 * Type guard to validate targets array and narrow type
 *
 * Use this in if statements to narrow the type of targets.
 *
 * @param targets - Array to validate
 * @returns true if targets is a non-empty HTMLElement array
 *
 * @example
 * ```typescript
 * if (isValidTargetArray(input.targets)) {
 *   // targets is now typed as HTMLElement[]
 *   input.targets.forEach(el => el.classList.add('active'));
 * }
 * ```
 */
export function isValidTargetArray(targets: unknown[]): targets is HTMLElement[] {
  return (
    Array.isArray(targets) &&
    targets.length > 0 &&
    targets.every(t => isHTMLElement(t))
  );
}

/**
 * Validate a string array with optional minimum length
 *
 * Common pattern for validating class names, attribute names, etc.
 *
 * @param arr - Array to validate
 * @param fieldName - Field name for error messages
 * @param minLength - Minimum required length (default: 1)
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateStringArray(input.classes, 'classes', 1);
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export function validateStringArray(
  arr: unknown[],
  fieldName: string = 'array',
  minLength: number = 1
): ValidationResult {
  if (!Array.isArray(arr)) {
    return {
      valid: false,
      error: `${fieldName} must be an array`,
    };
  }

  if (arr.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must have at least ${minLength} item${minLength === 1 ? '' : 's'}`,
    };
  }

  const nonStrings = arr.filter(item => typeof item !== 'string');
  if (nonStrings.length > 0) {
    return {
      valid: false,
      error: `all ${fieldName} items must be strings`,
    };
  }

  // Also reject empty strings
  const emptyStrings = arr.filter(item => typeof item === 'string' && item.length === 0);
  if (emptyStrings.length > 0) {
    return {
      valid: false,
      error: `${fieldName} items cannot be empty strings`,
    };
  }

  return { valid: true };
}

/**
 * Type guard to validate string array and narrow type
 *
 * Validates that all items are non-empty strings.
 *
 * @param arr - Array to validate
 * @param minLength - Minimum required length (default: 1)
 * @returns true if arr is a string array with at least minLength non-empty items
 */
export function isValidStringArray(
  arr: unknown[],
  minLength: number = 1
): arr is string[] {
  return (
    Array.isArray(arr) &&
    arr.length >= minLength &&
    arr.every(item => typeof item === 'string' && item.length > 0)
  );
}

/**
 * Validate a discriminated union type field
 *
 * Used to validate the 'type' field in discriminated union inputs.
 *
 * @param type - Type value to validate
 * @param allowed - Array of allowed type values
 * @param commandName - Command name for error messages
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateTypeDiscriminator(
 *   input.type,
 *   ['classes', 'attribute', 'css-property'],
 *   'add'
 * );
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export function validateTypeDiscriminator<T extends string>(
  type: unknown,
  allowed: readonly T[],
  commandName: string = 'command'
): ValidationResult {
  if (typeof type !== 'string') {
    return {
      valid: false,
      error: `${commandName}: type must be a string`,
    };
  }

  if (!allowed.includes(type as T)) {
    return {
      valid: false,
      error: `${commandName}: invalid type '${type}', expected one of: ${allowed.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Type guard for discriminated union type field
 *
 * @param type - Type value to validate
 * @param allowed - Array of allowed type values
 * @returns true if type is one of the allowed values
 */
export function isValidType<T extends string>(
  type: unknown,
  allowed: readonly T[]
): type is T {
  return typeof type === 'string' && allowed.includes(type as T);
}

/**
 * Validate that a value is defined (not null or undefined)
 *
 * @param value - Value to check
 * @param fieldName - Field name for error messages
 * @returns Validation result
 */
export function validateDefined(
  value: unknown,
  fieldName: string
): ValidationResult {
  if (value === null || value === undefined) {
    return {
      valid: false,
      error: `${fieldName} is required`,
    };
  }
  return { valid: true };
}

/**
 * Type guard for defined values
 *
 * @param value - Value to check
 * @returns true if value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Validate that a value is a non-empty string
 *
 * @param value - Value to check
 * @param fieldName - Field name for error messages
 * @returns Validation result
 */
export function validateNonEmptyString(
  value: unknown,
  fieldName: string
): ValidationResult {
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `${fieldName} must be a string`,
    };
  }

  if (value.trim() === '') {
    return {
      valid: false,
      error: `${fieldName} cannot be empty`,
    };
  }

  return { valid: true };
}

/**
 * Type guard for non-empty strings
 *
 * @param value - Value to check
 * @returns true if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Combine multiple validation results
 *
 * Returns the first failed validation, or success if all pass.
 *
 * @param results - Array of validation results
 * @returns Combined validation result
 *
 * @example
 * ```typescript
 * const result = combineValidations(
 *   validateTargetArray(input.targets, 'add'),
 *   validateStringArray(input.classes, 'classes')
 * );
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

/**
 * Create a validator function for a specific command
 *
 * Returns a validator with the command name pre-filled for error messages.
 *
 * @param commandName - Command name for error messages
 * @returns Object with pre-configured validation functions
 *
 * @example
 * ```typescript
 * const v = createValidator('toggle');
 * v.targets(input.targets);  // Error: "toggle: no targets specified"
 * v.strings(input.classes, 'classes');
 * ```
 */
export function createValidator(commandName: string) {
  return {
    targets: (targets: unknown[]) => validateTargetArray(targets, commandName),
    strings: (arr: unknown[], fieldName: string, minLength?: number) =>
      validateStringArray(arr, fieldName, minLength),
    type: <T extends string>(type: unknown, allowed: readonly T[]) =>
      validateTypeDiscriminator(type, allowed, commandName),
    defined: (value: unknown, fieldName: string) =>
      validateDefined(value, fieldName),
    nonEmptyString: (value: unknown, fieldName: string) =>
      validateNonEmptyString(value, fieldName),
  };
}
