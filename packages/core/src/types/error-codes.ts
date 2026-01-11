/**
 * Centralized Error Code Registry
 * Provides standardized error codes and message templates for all commands
 * Reduces bundle size by deduplicating error messages
 */

import type { ValidationError } from './unified-types';
import type { ExecutionError, ExecutionErrorContext } from './result';

/**
 * Standard error codes used across commands
 * Organized by category for better maintainability
 */
export const ErrorCodes = {
  // Execution failures (command-level)
  EXECUTION: {
    ADD_FAILED: 'ADD_EXECUTION_FAILED',
    GO_FAILED: 'GO_EXECUTION_FAILED',
    HIDE_FAILED: 'HIDE_EXECUTION_FAILED',
    PUT_FAILED: 'PUT_EXECUTION_FAILED',
    REMOVE_FAILED: 'REMOVE_EXECUTION_FAILED',
    SEND_FAILED: 'SEND_EXECUTION_FAILED',
    SHOW_FAILED: 'SHOW_EXECUTION_FAILED',
    TAKE_FAILED: 'TAKE_EXECUTION_FAILED',
    TOGGLE_FAILED: 'TOGGLE_EXECUTION_FAILED',
    TRIGGER_FAILED: 'TRIGGER_EXECUTION_FAILED',
    WAIT_FAILED: 'WAIT_FAILED',
    FETCH_FAILED: 'FETCH_FAILED',
    IF_FAILED: 'IF_EXECUTION_FAILED',
    ELSE_FAILED: 'ELSE_EXECUTION_FAILED',
    REPEAT_FAILED: 'REPEAT_EXECUTION_FAILED',
    SCROLL_FAILED: 'SCROLL_EXECUTION_FAILED',
  },

  // Validation failures (input-level)
  VALIDATION: {
    ADD_FAILED: 'ADD_VALIDATION_FAILED',
    GO_FAILED: 'GO_VALIDATION_FAILED',
    PUT_FAILED: 'PUT_VALIDATION_FAILED',
    REMOVE_FAILED: 'REMOVE_VALIDATION_FAILED',
    SEND_FAILED: 'SEND_VALIDATION_FAILED',
    TAKE_FAILED: 'TAKE_VALIDATION_FAILED',
    TOGGLE_FAILED: 'TOGGLE_VALIDATION_FAILED',
    TRIGGER_FAILED: 'TRIGGER_VALIDATION_FAILED',
    IF_FAILED: 'IF_VALIDATION_FAILED',
    ELSE_FAILED: 'ELSE_VALIDATION_FAILED',
    REPEAT_FAILED: 'REPEAT_VALIDATION_FAILED',
    GENERIC: 'VALIDATION_ERROR',
    // Partial template validation
    PARTIAL_LAYOUT_ELEMENT: 'PARTIAL_LAYOUT_ELEMENT',
    PARTIAL_DUPLICATE_SEMANTIC: 'PARTIAL_DUPLICATE_SEMANTIC',
    PARTIAL_METADATA_ELEMENT: 'PARTIAL_METADATA_ELEMENT',
  },

  // Operation failures (sub-operation level)
  OPERATION: {
    CLASS_ADD_FAILED: 'CLASS_ADD_FAILED',
    CLASS_REMOVE_FAILED: 'CLASS_REMOVE_FAILED',
    CLASS_TOGGLE_FAILED: 'CLASS_TOGGLE_FAILED',
    ATTRIBUTE_ADD_FAILED: 'ATTRIBUTE_ADD_FAILED',
    ATTRIBUTE_TOGGLE_FAILED: 'ATTRIBUTE_TOGGLE_FAILED',
    CSS_PROPERTY_TOGGLE_FAILED: 'CSS_PROPERTY_TOGGLE_FAILED',
    ELEMENT_HIDE_FAILED: 'ELEMENT_HIDE_FAILED',
    ELEMENT_SHOW_FAILED: 'ELEMENT_SHOW_FAILED',
    EVENT_DISPATCH_FAILED: 'EVENT_DISPATCH_FAILED',
    EVENT_TRIGGER_FAILED: 'EVENT_TRIGGER_FAILED',
    NAVIGATION_FAILED: 'NAVIGATION_FAILED',
    HISTORY_NAVIGATION_FAILED: 'HISTORY_NAVIGATION_FAILED',
    URL_NAVIGATION_FAILED: 'URL_NAVIGATION_FAILED',
    SCROLL_FAILED: 'SCROLL_FAILED',
    SCROLL_OFFSET_FAILED: 'SCROLL_OFFSET_FAILED',
    PROPERTY_TAKE_FAILED: 'PROPERTY_TAKE_FAILED',
    PROPERTY_PUT_FAILED: 'PROPERTY_PUT_FAILED',
    STYLE_ADD_FAILED: 'STYLE_ADD_FAILED',
    OPERATION_FAILED: 'OPERATION_FAILED',
    PARSE_FAILED: 'PARSE_FAILED',
    ARGUMENT_PARSE_FAILED: 'ARGUMENT_PARSE_FAILED',
  },

  // Resolution failures
  RESOLUTION: {
    TARGET_RESOLUTION_FAILED: 'TARGET_RESOLUTION_FAILED',
    SOURCE_RESOLUTION_FAILED: 'SOURCE_RESOLUTION_FAILED',
    RESOLUTION_FAILED: 'RESOLUTION_FAILED',
  },

  // Invalid input types
  INVALID: {
    CONTEXT_ELEMENT: 'INVALID_CONTEXT_ELEMENT',
    CLASS_NAME: 'INVALID_CLASS_NAME',
    ATTRIBUTE_NAME: 'INVALID_ATTRIBUTE_NAME',
    ELEMENT_REFERENCE: 'INVALID_ELEMENT_REFERENCE',
    POSITION: 'INVALID_POSITION',
    PROPERTY: 'INVALID_PROPERTY',
    PROPERTY_POSITION: 'INVALID_PROPERTY_POSITION',
    SELECTOR: 'INVALID_SELECTOR',
    TARGET_TYPE: 'INVALID_TARGET_TYPE',
    URL: 'INVALID_URL',
  },

  // Missing required values
  MISSING: {
    URL: 'MISSING_URL',
    ARGUMENTS: 'NO_ARGUMENTS',
  },

  // Not found / empty results
  NOT_FOUND: {
    ELEMENT: 'ELEMENT_NOT_FOUND',
    TARGET_ELEMENT: 'NO_TARGET_ELEMENT',
    TARGET_ELEMENTS: 'NO_TARGET_ELEMENTS',
    TARGET: 'TARGET_NOT_FOUND',
  },

  // No valid values
  NO_VALID: {
    ATTRIBUTES: 'NO_VALID_ATTRIBUTES',
    CLASSES: 'NO_VALID_CLASSES',
    CSS_PROPERTY: 'NO_VALID_CSS_PROPERTY',
  },

  // Context validation
  CONTEXT: {
    IF_INVALID: 'IF_CONTEXT_INVALID',
    ELSE_INVALID: 'ELSE_CONTEXT_INVALID',
    REPEAT_INVALID: 'REPEAT_CONTEXT_INVALID',
    REPEAT_COLLECTION_INVALID: 'REPEAT_COLLECTION_INVALID',
  },

  // Unsupported operations
  UNSUPPORTED: {
    CSS_PROPERTY: 'UNSUPPORTED_CSS_PROPERTY',
    HISTORY_API: 'HISTORY_API_UNAVAILABLE',
  },
} as const;

/**
 * Standard error message templates
 * Use placeholders {0}, {1}, etc. for dynamic values
 */
export const ErrorMessages = {
  // Execution errors
  [ErrorCodes.EXECUTION.ADD_FAILED]: 'Failed to execute add command',
  [ErrorCodes.EXECUTION.GO_FAILED]: 'Failed to execute go command',
  [ErrorCodes.EXECUTION.HIDE_FAILED]: 'Failed to execute hide command',
  [ErrorCodes.EXECUTION.PUT_FAILED]: 'Failed to execute put command',
  [ErrorCodes.EXECUTION.REMOVE_FAILED]: 'Failed to execute remove command',
  [ErrorCodes.EXECUTION.SEND_FAILED]: 'Failed to execute send command',
  [ErrorCodes.EXECUTION.SHOW_FAILED]: 'Failed to execute show command',
  [ErrorCodes.EXECUTION.TAKE_FAILED]: 'Failed to execute take command',
  [ErrorCodes.EXECUTION.TOGGLE_FAILED]: 'Failed to execute toggle command',
  [ErrorCodes.EXECUTION.TRIGGER_FAILED]: 'Failed to execute trigger command',
  [ErrorCodes.EXECUTION.WAIT_FAILED]: 'Wait command failed',
  [ErrorCodes.EXECUTION.FETCH_FAILED]: 'Fetch command failed',
  [ErrorCodes.EXECUTION.IF_FAILED]: 'Failed to execute if directive',
  [ErrorCodes.EXECUTION.ELSE_FAILED]: 'Failed to execute else directive',
  [ErrorCodes.EXECUTION.REPEAT_FAILED]: 'Failed to execute repeat directive',
  [ErrorCodes.EXECUTION.SCROLL_FAILED]: 'Failed to execute scroll operation',

  // Validation errors
  [ErrorCodes.VALIDATION.ADD_FAILED]: 'Add command validation failed',
  [ErrorCodes.VALIDATION.GO_FAILED]: 'Go command validation failed',
  [ErrorCodes.VALIDATION.PUT_FAILED]: 'Put command validation failed',
  [ErrorCodes.VALIDATION.REMOVE_FAILED]: 'Remove command validation failed',
  [ErrorCodes.VALIDATION.SEND_FAILED]: 'Send command validation failed',
  [ErrorCodes.VALIDATION.TAKE_FAILED]: 'Take command validation failed',
  [ErrorCodes.VALIDATION.TOGGLE_FAILED]: 'Toggle command validation failed',
  [ErrorCodes.VALIDATION.TRIGGER_FAILED]: 'Trigger command validation failed',
  [ErrorCodes.VALIDATION.IF_FAILED]: 'If directive validation failed',
  [ErrorCodes.VALIDATION.ELSE_FAILED]: 'Else directive validation failed',
  [ErrorCodes.VALIDATION.REPEAT_FAILED]: 'Repeat directive validation failed',
  [ErrorCodes.VALIDATION.GENERIC]: 'Validation error',
  [ErrorCodes.VALIDATION.PARTIAL_LAYOUT_ELEMENT]: 'Partial contains layout element: {0}',
  [ErrorCodes.VALIDATION.PARTIAL_DUPLICATE_SEMANTIC]: 'Partial may create duplicate semantic landmark: {0}',
  [ErrorCodes.VALIDATION.PARTIAL_METADATA_ELEMENT]: 'Partial contains metadata element: {0}',

  // Operation errors
  [ErrorCodes.OPERATION.CLASS_ADD_FAILED]: 'Failed to add class to element',
  [ErrorCodes.OPERATION.CLASS_REMOVE_FAILED]: 'Failed to remove class from element',
  [ErrorCodes.OPERATION.CLASS_TOGGLE_FAILED]: 'Failed to toggle class on element',
  [ErrorCodes.OPERATION.ATTRIBUTE_ADD_FAILED]: 'Failed to add attribute to element',
  [ErrorCodes.OPERATION.ATTRIBUTE_TOGGLE_FAILED]: 'Failed to toggle attribute on element',
  [ErrorCodes.OPERATION.CSS_PROPERTY_TOGGLE_FAILED]: 'Failed to toggle CSS property',
  [ErrorCodes.OPERATION.ELEMENT_HIDE_FAILED]: 'Failed to hide element',
  [ErrorCodes.OPERATION.ELEMENT_SHOW_FAILED]: 'Failed to show element',
  [ErrorCodes.OPERATION.EVENT_DISPATCH_FAILED]: 'Failed to dispatch event',
  [ErrorCodes.OPERATION.EVENT_TRIGGER_FAILED]: 'Failed to trigger event on element',
  [ErrorCodes.OPERATION.NAVIGATION_FAILED]: 'Navigation failed',
  [ErrorCodes.OPERATION.HISTORY_NAVIGATION_FAILED]: 'History navigation failed',
  [ErrorCodes.OPERATION.URL_NAVIGATION_FAILED]: 'URL navigation failed',
  [ErrorCodes.OPERATION.SCROLL_FAILED]: 'Scroll operation failed',
  [ErrorCodes.OPERATION.SCROLL_OFFSET_FAILED]: 'Failed to scroll with offset',
  [ErrorCodes.OPERATION.PROPERTY_TAKE_FAILED]: 'Failed to take property from element',
  [ErrorCodes.OPERATION.PROPERTY_PUT_FAILED]: 'Failed to put property on element',
  [ErrorCodes.OPERATION.STYLE_ADD_FAILED]: 'Failed to add style to element',
  [ErrorCodes.OPERATION.OPERATION_FAILED]: 'Operation failed',
  [ErrorCodes.OPERATION.PARSE_FAILED]: 'Failed to parse input',
  [ErrorCodes.OPERATION.ARGUMENT_PARSE_FAILED]: 'Failed to parse arguments',

  // Resolution errors
  [ErrorCodes.RESOLUTION.TARGET_RESOLUTION_FAILED]: 'Failed to resolve target element',
  [ErrorCodes.RESOLUTION.SOURCE_RESOLUTION_FAILED]: 'Failed to resolve source element',
  [ErrorCodes.RESOLUTION.RESOLUTION_FAILED]: 'Element resolution failed',

  // Invalid input errors
  [ErrorCodes.INVALID.CONTEXT_ELEMENT]: 'Invalid context element',
  [ErrorCodes.INVALID.CLASS_NAME]: 'Invalid class name: "{0}"',
  [ErrorCodes.INVALID.ATTRIBUTE_NAME]: 'Invalid attribute name: "{0}"',
  [ErrorCodes.INVALID.ELEMENT_REFERENCE]: 'Invalid element reference',
  [ErrorCodes.INVALID.POSITION]: 'Invalid position: "{0}"',
  [ErrorCodes.INVALID.PROPERTY]: 'Invalid property: "{0}"',
  [ErrorCodes.INVALID.PROPERTY_POSITION]: 'Invalid property position',
  [ErrorCodes.INVALID.SELECTOR]: 'Invalid selector: "{0}"',
  [ErrorCodes.INVALID.TARGET_TYPE]: 'Invalid target type',
  [ErrorCodes.INVALID.URL]: 'Invalid URL: "{0}"',

  // Missing value errors
  [ErrorCodes.MISSING.URL]: 'Missing URL',
  [ErrorCodes.MISSING.ARGUMENTS]: 'No arguments provided',

  // Not found errors
  [ErrorCodes.NOT_FOUND.ELEMENT]: 'Element not found',
  [ErrorCodes.NOT_FOUND.TARGET_ELEMENT]: 'No target element found',
  [ErrorCodes.NOT_FOUND.TARGET_ELEMENTS]: 'No target elements found',
  [ErrorCodes.NOT_FOUND.TARGET]: 'Target not found: "{0}"',

  // No valid values
  [ErrorCodes.NO_VALID.ATTRIBUTES]: 'No valid attributes provided',
  [ErrorCodes.NO_VALID.CLASSES]: 'No valid classes provided to {0}',
  [ErrorCodes.NO_VALID.CSS_PROPERTY]: 'No valid CSS property provided',

  // Context errors
  [ErrorCodes.CONTEXT.IF_INVALID]: 'Invalid context for if directive',
  [ErrorCodes.CONTEXT.ELSE_INVALID]: 'Invalid context for else directive',
  [ErrorCodes.CONTEXT.REPEAT_INVALID]: 'Invalid context for repeat directive',
  [ErrorCodes.CONTEXT.REPEAT_COLLECTION_INVALID]: 'Invalid collection for repeat directive',

  // Unsupported operations
  [ErrorCodes.UNSUPPORTED.CSS_PROPERTY]: 'Unsupported CSS property: "{0}"',
  [ErrorCodes.UNSUPPORTED.HISTORY_API]: 'History API is not available',
} as const;

/**
 * Standard error suggestions for common error types
 */
export const ErrorSuggestions = {
  // Element resolution suggestions
  ELEMENT_NOT_FOUND: [
    'Check if target selector is valid',
    'Ensure elements exist in DOM',
    'Verify element has correct ID or class',
  ],
  INVALID_SELECTOR: [
    'Use valid CSS selector syntax like "#id", ".class", or "element"',
    'Check CSS selector syntax',
    'Use document.querySelector() test',
  ],
  NO_TARGET: [
    'Provide a valid target element',
    'Check if element exists',
    'Verify selector matches an element',
  ],

  // Class/attribute validation suggestions
  INVALID_CLASS: [
    'Use valid CSS class names',
    'Check for special characters',
    'Class names must start with letter, underscore, or hyphen',
  ],
  INVALID_ATTRIBUTE: [
    'Use valid HTML attribute names',
    'Check for special characters',
    'Attribute names must not contain spaces',
  ],
  NO_VALID_VALUES: [
    'Provide valid class names or attributes',
    'Check input syntax',
    'Ensure values are not empty',
  ],

  // Context suggestions
  CONTEXT_INVALID: [
    'Check if context element exists',
    'Verify context is properly initialized',
    'Ensure "me" reference is valid',
  ],

  // Navigation suggestions
  NAVIGATION_ERROR: [
    'Check if URL is valid and accessible',
    'Verify browser supports requested navigation',
    'Ensure History API is available',
  ],

  // Generic suggestions
  EXECUTION_FAILED: [
    'Check if element exists',
    'Verify element is not null',
    'Ensure element is still in DOM',
  ],
  VALIDATION_FAILED: [
    'Check argument types and syntax',
    'Ensure arguments match expected types',
    'Verify required arguments are provided',
  ],

  // Partial validation suggestions
  PARTIAL_LAYOUT: [
    'Remove layout elements (html, body, head) from partial response',
    'Return only content fragments, not full page HTML',
    'Check server endpoint is returning partial content',
  ],
  PARTIAL_SEMANTIC: [
    'Check if page already has this semantic landmark',
    'Consider if landmark is needed in partial or should be static',
    'Review partial content for duplicate header/footer/main/nav/aside',
  ],
} as const;

/**
 * Helper function to create standardized error objects
 * Reduces code duplication across commands
 */
export function createError(
  errorCode: string,
  customMessage?: string,
  placeholders?: (string | number)[],
  suggestions?: string[]
): ValidationError {
  // Get default message from registry
  let message: string = ErrorMessages[errorCode as keyof typeof ErrorMessages] || customMessage || 'Unknown error';

  // Replace placeholders if provided
  if (placeholders && placeholders.length > 0) {
    placeholders.forEach((value, index) => {
      message = message.replace(`{${index}}`, String(value));
    });
  }

  // Use custom message if provided
  if (customMessage) {
    message = customMessage;
  }

  // Determine error type based on code
  let type: ValidationError['type'] = 'runtime-error';
  if (errorCode.includes('VALIDATION')) {
    type = 'validation-error';
  } else if (errorCode.includes('INVALID')) {
    type = 'invalid-argument';
  } else if (errorCode.includes('MISSING') || errorCode.includes('NO_')) {
    type = 'missing-argument';
  } else if (errorCode.includes('PARSE')) {
    type = 'syntax-error';
  }

  // Determine severity based on error code pattern
  let severity: 'error' | 'warning' | 'info' = 'error';
  if (errorCode.includes('WARNING') || errorCode.includes('DEPRECATED')) {
    severity = 'warning';
  } else if (errorCode.includes('INFO') || errorCode.includes('HINT')) {
    severity = 'info';
  }

  return {
    type,
    message,
    code: errorCode,
    suggestions: suggestions || [],
    severity,
  };
}

/**
 * Helper to get standard suggestions for error code
 */
export function getSuggestions(errorCode: string): readonly string[] {
  if (errorCode.includes('NOT_FOUND') || errorCode.includes('ELEMENT')) {
    return ErrorSuggestions.ELEMENT_NOT_FOUND;
  }
  if (errorCode.includes('INVALID_SELECTOR')) {
    return ErrorSuggestions.INVALID_SELECTOR;
  }
  if (errorCode.includes('CLASS_NAME')) {
    return ErrorSuggestions.INVALID_CLASS;
  }
  if (errorCode.includes('ATTRIBUTE_NAME')) {
    return ErrorSuggestions.INVALID_ATTRIBUTE;
  }
  if (errorCode.includes('NO_VALID') || errorCode.includes('NO_TARGET')) {
    return ErrorSuggestions.NO_VALID_VALUES;
  }
  if (errorCode.includes('CONTEXT')) {
    return ErrorSuggestions.CONTEXT_INVALID;
  }
  if (errorCode.includes('NAVIGATION') || errorCode.includes('URL')) {
    return ErrorSuggestions.NAVIGATION_ERROR;
  }
  if (errorCode.includes('VALIDATION')) {
    return ErrorSuggestions.VALIDATION_FAILED;
  }
  return ErrorSuggestions.EXECUTION_FAILED;
}

/**
 * Wrap an existing error with additional context for error chain preservation.
 * Creates a new ExecutionError that links to the original error as its cause.
 *
 * @param code - Error code from ErrorCodes registry
 * @param message - Human-readable error message
 * @param cause - The original error that caused this failure
 * @param context - Additional context for debugging
 * @returns A structured ExecutionError with error chain
 *
 * @example
 * ```typescript
 * try {
 *   await fetchData();
 * } catch (e) {
 *   throw wrapError(
 *     ErrorCodes.EXECUTION.FETCH_FAILED,
 *     'Failed to fetch user data',
 *     e,
 *     { command: 'fetch', element: '#user-data' }
 *   );
 * }
 * ```
 */
export function wrapError(
  code: string,
  message: string,
  cause: Error | ExecutionError,
  context?: ExecutionErrorContext
): ExecutionError {
  return {
    code,
    message,
    cause,
    ...(context && { context }),
  };
}

/**
 * Check if an error is an ExecutionError (has code and message).
 */
export function isExecutionError(error: unknown): error is ExecutionError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as ExecutionError).code === 'string' &&
    typeof (error as ExecutionError).message === 'string'
  );
}

/**
 * Get the cause from an error (handles ES2022 Error.cause).
 */
function getErrorCause(error: ExecutionError | Error): unknown {
  if (isExecutionError(error)) {
    return error.cause;
  }
  // Handle ES2022 Error.cause property (may not exist on older targets)
  return (error as Error & { cause?: unknown }).cause;
}

/**
 * Get the full error chain as an array for debugging.
 * Traverses the cause chain and returns all errors in order.
 *
 * @param error - The top-level error
 * @param maxDepth - Maximum chain depth to traverse (default: 10)
 * @returns Array of errors from newest to oldest
 */
export function getErrorChain(
  error: ExecutionError | Error,
  maxDepth: number = 10
): Array<ExecutionError | Error> {
  const chain: Array<ExecutionError | Error> = [error];
  let current: unknown = getErrorCause(error);
  let depth = 0;

  while (current && depth < maxDepth) {
    if (current instanceof Error || isExecutionError(current)) {
      chain.push(current);
      current = getErrorCause(current);
    } else {
      break;
    }
    depth++;
  }

  return chain;
}

/**
 * Format an error chain for logging/display.
 *
 * @param error - The top-level error
 * @returns Formatted string showing the error chain
 */
export function formatErrorChain(error: ExecutionError | Error): string {
  const chain = getErrorChain(error);
  return chain
    .map((e, i) => {
      const prefix = i === 0 ? 'Error' : `Caused by`;
      const code = isExecutionError(e) ? ` [${e.code}]` : '';
      return `${prefix}${code}: ${e.message}`;
    })
    .join('\n  ');
}
