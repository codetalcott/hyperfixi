/**
 * Shared utility functions for MCP tools.
 *
 * Input validation and parameter extraction helpers.
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

export function getString(args: Record<string, unknown>, name: string, defaultValue = ''): string {
  const value = args[name];
  return typeof value === 'string' ? value : defaultValue;
}

export function getBoolean(
  args: Record<string, unknown>,
  name: string,
  defaultValue = false
): boolean {
  const value = args[name];
  return typeof value === 'boolean' ? value : defaultValue;
}

export function getNumber(args: Record<string, unknown>, name: string, defaultValue = 0): number {
  const value = args[name];
  return typeof value === 'number' ? value : defaultValue;
}

// =============================================================================
// Response Helpers
// =============================================================================

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
