/**
 * Phase 7: Shared utility functions for MCP tools.
 *
 * Provides input validation and parameter extraction helpers
 * to prevent runtime errors from missing or invalid parameters.
 */

// =============================================================================
// Types
// =============================================================================

export interface ValidationError {
  content: Array<{ type: string; text: string }>;
  isError: true;
}

// =============================================================================
// Input Validation
// =============================================================================

/**
 * Validate that required parameters exist and are non-null.
 * Returns an error response if validation fails, null if all required params present.
 *
 * @example
 * const error = validateRequired(args, ['code', 'language']);
 * if (error) return error;
 */
export function validateRequired(
  args: Record<string, unknown>,
  required: string[]
): ValidationError | null {
  for (const param of required) {
    if (args[param] === undefined || args[param] === null) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: `Missing required parameter: ${param}`,
                required,
                received: Object.keys(args),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }
  return null;
}

/**
 * Validate parameter types match expected types.
 * Returns an error response if type mismatch, null if all types valid.
 *
 * @example
 * const error = validateTypes(args, { code: 'string', line: 'number' });
 * if (error) return error;
 */
export function validateTypes(
  args: Record<string, unknown>,
  schema: Record<string, 'string' | 'number' | 'boolean' | 'object'>
): ValidationError | null {
  for (const [param, expectedType] of Object.entries(schema)) {
    const value = args[param];
    if (value !== undefined && value !== null && typeof value !== expectedType) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: `Invalid type for parameter '${param}'`,
                expected: expectedType,
                received: typeof value,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }
  return null;
}

// =============================================================================
// Parameter Extraction
// =============================================================================

/**
 * Get string parameter with default value.
 * Returns empty string if value is not a string.
 */
export function getString(args: Record<string, unknown>, name: string, defaultValue = ''): string {
  const value = args[name];
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * Get boolean parameter with default value.
 * Returns default if value is not a boolean.
 */
export function getBoolean(
  args: Record<string, unknown>,
  name: string,
  defaultValue = false
): boolean {
  const value = args[name];
  return typeof value === 'boolean' ? value : defaultValue;
}

/**
 * Get number parameter with default value.
 * Returns default if value is not a number.
 */
export function getNumber(args: Record<string, unknown>, name: string, defaultValue = 0): number {
  const value = args[name];
  return typeof value === 'number' ? value : defaultValue;
}

/**
 * Get array parameter with default value.
 * Returns default if value is not an array.
 */
export function getArray<T>(
  args: Record<string, unknown>,
  name: string,
  defaultValue: T[] = []
): T[] {
  const value = args[name];
  return Array.isArray(value) ? value : defaultValue;
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Create a successful JSON response.
 */
export function jsonResponse(data: unknown): { content: Array<{ type: string; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Create an error response.
 */
export function errorResponse(error: string, details?: Record<string, unknown>): ValidationError {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            error,
            ...details,
          },
          null,
          2
        ),
      },
    ],
  };
}

// =============================================================================
// Refused translations
// =============================================================================

/**
 * What `@lokascript/semantic`'s `translate()` throws for a translation that
 * would lose part of the script (`LossyTranslationError`), as a tool reports
 * it: never under the key that carries a translation.
 */
export interface TranslationRefusal {
  refused: true;
  error: string;
  /** Which check saw the loss: truncation, read-back or invariant. */
  kind: string;
  /** What the translation would lose. */
  lost: string[];
  /** The output it would have returned: NOT the whole script. */
  partial: string;
}

/** The refusal an error carries, when it is semantic's `LossyTranslationError`. */
export function translationRefusal(error: unknown): TranslationRefusal | null {
  if (!(error instanceof Error) || error.name !== 'LossyTranslationError') return null;
  const e = error as Error & { partial?: unknown; loss?: { kind?: unknown; lost?: unknown } };
  if (typeof e.partial !== 'string') return null;
  return {
    refused: true,
    error: e.message,
    kind: String(e.loss?.kind ?? ''),
    lost: Array.isArray(e.loss?.lost) ? e.loss.lost.map(String) : [],
    partial: e.partial,
  };
}
