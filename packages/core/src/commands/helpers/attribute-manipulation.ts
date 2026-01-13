/**
 * Attribute Manipulation Helpers - Shared utilities for HTML attribute operations
 *
 * Used by: add, remove, toggle commands
 *
 * These utilities handle:
 * - Detecting attribute syntax (@attr, [@attr], [@attr="value"])
 * - Parsing attribute name and value from expressions
 *
 * Bundle size savings: ~50 lines per command using these helpers
 */

/**
 * Check if string is attribute syntax
 *
 * Detects:
 * - Bracket syntax: [@attr="value"] or [@attr]
 * - Direct syntax: @attr
 *
 * @param expression - Expression to check
 * @returns true if attribute syntax
 */
export function isAttributeSyntax(expression: string): boolean {
  const trimmed = expression.trim();

  // Bracket syntax: [@attr="value"] or [@attr]
  if (trimmed.startsWith('[@') && trimmed.endsWith(']')) {
    return true;
  }

  // Direct syntax: @attr
  if (trimmed.startsWith('@')) {
    return true;
  }

  return false;
}

/**
 * Parse attribute name and value from expression
 *
 * Supports:
 * - [@attr="value"] → { name: "attr", value: "value" }
 * - [@attr] → { name: "attr", value: undefined }
 * - @attr → { name: "attr", value: undefined }
 *
 * @param expression - Attribute expression to parse
 * @returns Object with name and optional value
 * @throws Error if invalid attribute syntax
 */
export function parseAttribute(expression: string): { name: string; value?: string } {
  const trimmed = expression.trim();

  // Handle bracket syntax: [@attr="value"]
  if (trimmed.startsWith('[@') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(2, -1); // Remove [@ and ]
    const equalIndex = inner.indexOf('=');

    if (equalIndex === -1) {
      // No value: [@attr]
      return { name: inner.trim() };
    }

    // Has value: [@attr="value"]
    const name = inner.slice(0, equalIndex).trim();
    let value = inner.slice(equalIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    return { name, value };
  }

  // Handle direct syntax: @attr
  if (trimmed.startsWith('@')) {
    return { name: trimmed.substring(1).trim() };
  }

  throw new Error(`Invalid attribute syntax: ${expression}`);
}

/**
 * Parse attribute name only from expression
 *
 * Supports:
 * - [@attr] → "attr"
 * - @attr → "attr"
 *
 * This is a convenience function for commands that only need the name.
 *
 * @param expression - Attribute expression to parse
 * @returns Attribute name
 * @throws Error if invalid attribute syntax
 */
export function parseAttributeName(expression: string): string {
  return parseAttribute(expression).name;
}

/**
 * Parse attribute with guaranteed value (defaults to empty string)
 *
 * Supports:
 * - [@attr="value"] → { name: "attr", value: "value" }
 * - [@attr] → { name: "attr", value: "" }
 * - @attr → { name: "attr", value: "" }
 *
 * This is a convenience function for commands that need a value (add command).
 *
 * @param expression - Attribute expression to parse
 * @returns Object with name and value (never undefined)
 * @throws Error if invalid attribute syntax
 */
export function parseAttributeWithValue(expression: string): { name: string; value: string } {
  const result = parseAttribute(expression);
  return { name: result.name, value: result.value ?? '' };
}
