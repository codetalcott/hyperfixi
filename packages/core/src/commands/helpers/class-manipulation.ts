/**
 * Class Manipulation Helpers - Shared utilities for CSS class operations
 *
 * Used by: add, remove, toggle commands
 *
 * These utilities handle:
 * - Parsing class names from various input formats
 * - Validating CSS class names
 * - Normalizing class names (removing leading dots)
 *
 * Bundle size savings: ~80 lines per command using these helpers
 */

/**
 * Parse class names from various input formats
 *
 * Handles:
 * - Single class: ".active" or "active"
 * - Multiple classes: "active selected" or ".active .selected"
 * - Array of classes: [".active", "selected"]
 *
 * @param classValue - Class value from AST (string, array, or unknown)
 * @returns Array of clean class names (no leading dots)
 */
export function parseClasses(classValue: unknown): string[] {
  if (!classValue) {
    return [];
  }

  if (typeof classValue === 'string') {
    // Split by whitespace and/or commas
    return classValue
      .trim()
      .split(/[\s,]+/)
      .map(cls => {
        const trimmed = cls.trim();
        // Remove leading dot from CSS selectors
        return trimmed.startsWith('.') ? trimmed.substring(1) : trimmed;
      })
      .filter(cls => cls.length > 0 && isValidClassName(cls));
  }

  if (Array.isArray(classValue)) {
    return classValue
      .map(cls => {
        const str = String(cls).trim();
        return str.startsWith('.') ? str.substring(1) : str;
      })
      .filter(cls => cls.length > 0 && isValidClassName(cls));
  }

  // Fallback: convert to string
  const str = String(classValue).trim();
  const cleanStr = str.startsWith('.') ? str.substring(1) : str;
  return cleanStr.length > 0 && isValidClassName(cleanStr) ? [cleanStr] : [];
}

/**
 * Validate CSS class name
 *
 * Class names must:
 * - Not be empty
 * - Not start with a digit
 * - Only contain letters, digits, hyphens, underscores
 *
 * @param className - Class name to validate
 * @returns true if valid CSS class name
 */
export function isValidClassName(className: string): boolean {
  if (!className || className.trim().length === 0) {
    return false;
  }

  // CSS class name regex: starts with letter/underscore/hyphen, then letters/digits/hyphens/underscores
  const cssClassNameRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
  return cssClassNameRegex.test(className.trim());
}

/**
 * Normalize a class name by removing leading dot if present
 *
 * @param cls - Class name that may have leading dot
 * @returns Class name without leading dot
 */
export function normalizeClassName(cls: string): string {
  const trimmed = cls.trim();
  return trimmed.startsWith('.') ? trimmed.substring(1) : trimmed;
}
