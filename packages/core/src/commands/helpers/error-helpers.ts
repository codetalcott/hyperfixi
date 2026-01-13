/**
 * Command Error Helpers
 *
 * Provides convenient factory functions for creating standardized errors
 * in command implementations. Uses the centralized ErrorCodes and ErrorMessages
 * to ensure consistency across all commands.
 *
 * Integrated from plugin-system package to standardize error handling in core.
 */

import {
  createError,
  getSuggestions,
  wrapError,
  ErrorCodes,
  ErrorMessages,
  ErrorSuggestions,
} from '../../types/error-codes';
import type { ValidationError } from '../../types/unified-types';
import type { ExecutionError } from '../../types/result';

/**
 * Create an error for a missing required argument
 * @param commandName The name of the command
 * @param argName The name of the missing argument
 * @returns A ValidationError with appropriate suggestions
 */
export function missingArgument(commandName: string, argName: string): ValidationError {
  return createError(
    ErrorCodes.MISSING.ARGUMENTS,
    `${commandName}: Missing required argument '${argName}'`,
    [],
    [
      `Provide the required '${argName}' argument`,
      `Check the ${commandName} command syntax`,
      ...ErrorSuggestions.VALIDATION_FAILED,
    ]
  );
}

/**
 * Create an error for an invalid target element
 * @param commandName The name of the command
 * @param selector The selector that failed to find an element
 * @returns A ValidationError with element resolution suggestions
 */
export function invalidTarget(commandName: string, selector: string): ValidationError {
  return createError(
    ErrorCodes.RESOLUTION.TARGET_RESOLUTION_FAILED,
    `${commandName}: Could not find target element '${selector}'`,
    [selector],
    [
      `Check if '${selector}' selector is correct`,
      'Ensure the element exists in the DOM',
      ...ErrorSuggestions.ELEMENT_NOT_FOUND,
    ]
  );
}

/**
 * Create an error for no target elements found
 * @param commandName The name of the command
 * @returns A ValidationError
 */
export function noTargetElements(commandName: string): ValidationError {
  return createError(
    ErrorCodes.NOT_FOUND.TARGET_ELEMENTS,
    `${commandName}: No target elements found`,
    [],
    ErrorSuggestions.NO_TARGET as unknown as string[]
  );
}

/**
 * Create an error for an invalid class name
 * @param commandName The name of the command
 * @param className The invalid class name
 * @returns A ValidationError
 */
export function invalidClassName(commandName: string, className: string): ValidationError {
  return createError(
    ErrorCodes.INVALID.CLASS_NAME,
    `${commandName}: Invalid class name '${className}'`,
    [className],
    ErrorSuggestions.INVALID_CLASS as unknown as string[]
  );
}

/**
 * Create an error for an invalid attribute name
 * @param commandName The name of the command
 * @param attrName The invalid attribute name
 * @returns A ValidationError
 */
export function invalidAttributeName(commandName: string, attrName: string): ValidationError {
  return createError(
    ErrorCodes.INVALID.ATTRIBUTE_NAME,
    `${commandName}: Invalid attribute name '${attrName}'`,
    [attrName],
    ErrorSuggestions.INVALID_ATTRIBUTE as unknown as string[]
  );
}

/**
 * Create an error for an invalid selector
 * @param commandName The name of the command
 * @param selector The invalid selector
 * @returns A ValidationError
 */
export function invalidSelector(commandName: string, selector: string): ValidationError {
  return createError(
    ErrorCodes.INVALID.SELECTOR,
    `${commandName}: Invalid selector '${selector}'`,
    [selector],
    ErrorSuggestions.INVALID_SELECTOR as unknown as string[]
  );
}

/**
 * Create an error for an invalid URL
 * @param commandName The name of the command
 * @param url The invalid URL
 * @returns A ValidationError
 */
export function invalidUrl(commandName: string, url: string): ValidationError {
  return createError(
    ErrorCodes.INVALID.URL,
    `${commandName}: Invalid URL '${url}'`,
    [url],
    ErrorSuggestions.NAVIGATION_ERROR as unknown as string[]
  );
}

/**
 * Create an error for invalid context (e.g., no 'me' element)
 * @param commandName The name of the command
 * @returns A ValidationError
 */
export function invalidContext(commandName: string): ValidationError {
  return createError(
    ErrorCodes.INVALID.CONTEXT_ELEMENT,
    `${commandName}: Invalid execution context - no element reference`,
    [],
    ErrorSuggestions.CONTEXT_INVALID as unknown as string[]
  );
}

/**
 * Create an error for a failed operation
 * @param commandName The name of the command
 * @param operation The operation that failed (e.g., 'add class', 'set attribute')
 * @param reason The reason for failure
 * @returns A ValidationError
 */
export function operationFailed(
  commandName: string,
  operation: string,
  reason?: string
): ValidationError {
  const message = reason
    ? `${commandName}: Failed to ${operation} - ${reason}`
    : `${commandName}: Failed to ${operation}`;

  return createError(
    ErrorCodes.OPERATION.OPERATION_FAILED,
    message,
    [],
    [
      `Check if the target element supports this operation`,
      `Verify element is not read-only or disabled`,
      ...ErrorSuggestions.EXECUTION_FAILED,
    ]
  );
}

/**
 * Create an error for argument parsing failure
 * @param commandName The name of the command
 * @param details Details about the parsing failure
 * @returns A ValidationError
 */
export function parseError(commandName: string, details: string): ValidationError {
  return createError(
    ErrorCodes.OPERATION.ARGUMENT_PARSE_FAILED,
    `${commandName}: Failed to parse arguments - ${details}`,
    [],
    [
      'Check the argument syntax',
      `Review the ${commandName} command documentation`,
      ...ErrorSuggestions.VALIDATION_FAILED,
    ]
  );
}

/**
 * Create an execution error that wraps an underlying cause
 * @param commandName The name of the command
 * @param message Error message
 * @param cause The underlying error
 * @returns An ExecutionError with error chain
 */
export function executionError(
  commandName: string,
  message: string,
  cause?: Error
): ExecutionError {
  // Determine the appropriate error code based on command name
  const codeKey = commandName.toUpperCase() + '_FAILED';
  const code =
    (ErrorCodes.EXECUTION as Record<string, string>)[codeKey] ||
    ErrorCodes.OPERATION.OPERATION_FAILED;

  // Create a placeholder error if no cause provided
  const errorCause = cause ?? new Error(`${commandName}: ${message}`);

  return wrapError(code, `${commandName}: ${message}`, errorCause, {
    command: commandName,
    suggestions: getSuggestions(code) as string[],
  });
}

/**
 * Create an error for unsupported operations
 * @param commandName The name of the command
 * @param feature The unsupported feature
 * @returns A ValidationError
 */
export function unsupportedFeature(commandName: string, feature: string): ValidationError {
  return createError(
    ErrorCodes.UNSUPPORTED.CSS_PROPERTY,
    `${commandName}: Unsupported feature '${feature}'`,
    [feature],
    [
      'Check browser compatibility for this feature',
      'Consider a fallback approach',
      'Verify the feature is supported in the current environment',
    ]
  );
}

/**
 * Convert any thrown value to a proper Error object
 * Useful in catch blocks where the caught value might not be an Error
 */
export function toError(thrown: unknown): Error {
  if (thrown instanceof Error) {
    return thrown;
  }
  if (typeof thrown === 'string') {
    return new Error(thrown);
  }
  if (typeof thrown === 'object' && thrown !== null) {
    const obj = thrown as Record<string, unknown>;
    if ('message' in obj && typeof obj.message === 'string') {
      return new Error(obj.message);
    }
  }
  return new Error(String(thrown));
}

/**
 * Helper to throw a ValidationError as an Error
 * Useful when you need to throw in expression position
 */
export function throwValidation(error: ValidationError): never {
  const err = new Error(error.message);
  (err as any).code = error.code;
  (err as any).type = error.type;
  (err as any).suggestions = error.suggestions;
  throw err;
}
