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
 * Check if a class name is a dynamic expression (e.g., `{cls}` or `{myVar}`)
 *
 * Dynamic classes are resolved at runtime by evaluating the expression
 * against the execution context.
 *
 * @param className - Class name to check
 * @returns true if this is a dynamic class expression
 */
export function isDynamicClass(className: string): boolean {
  const trimmed = className.trim();
  return /^\{[^}]+\}$/.test(trimmed);
}

/**
 * Extract the expression from a dynamic class (e.g., `{cls}` → `cls`)
 *
 * @param className - Dynamic class name with braces
 * @returns The expression inside the braces, or the original if not dynamic
 */
export function extractDynamicExpression(className: string): string {
  const trimmed = className.trim();
  const match = trimmed.match(/^\{(.+)\}$/);
  return match ? match[1].trim() : trimmed;
}

/**
 * Validate CSS class name
 *
 * Class names must:
 * - Not be empty
 * - Not start with a digit
 * - Only contain letters, digits, hyphens, underscores
 *
 * Note: Dynamic class expressions ({var}) are considered valid and
 * will be resolved at runtime.
 *
 * @param className - Class name to validate
 * @returns true if valid CSS class name or dynamic expression
 */
export function isValidClassName(className: string): boolean {
  if (!className || className.trim().length === 0) {
    return false;
  }

  const trimmed = className.trim();

  // Dynamic class expressions are valid (resolved at runtime)
  if (isDynamicClass(trimmed)) {
    return true;
  }

  // CSS class name regex: starts with letter/underscore/hyphen, then letters/digits/hyphens/underscores
  const cssClassNameRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
  return cssClassNameRegex.test(trimmed);
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

/**
 * Context interface for resolving dynamic classes
 * Matches the shape of ExecutionContext for locals/globals lookup
 */
export interface ClassResolutionContext {
  readonly locals: Map<string, unknown>;
  readonly globals: Map<string, unknown>;
}

/**
 * Resolve dynamic class names from execution context
 *
 * Dynamic classes use `{varName}` syntax and are resolved at runtime
 * by looking up the variable in the execution context.
 *
 * @param classes - Array of class names (may include dynamic expressions like `{cls}`)
 * @param context - Execution context with locals/globals maps
 * @returns Array of resolved class names (empty strings filtered out)
 */
export function resolveDynamicClasses(
  classes: string[],
  context: ClassResolutionContext
): string[] {
  return classes
    .map(cls => {
      if (isDynamicClass(cls)) {
        const varName = extractDynamicExpression(cls);
        // Look up in locals first, then globals
        const value = context.locals.get(varName) ?? context.globals.get(varName);
        if (value !== undefined && value !== null) {
          return String(value);
        }
        // If variable not found, return empty string (class won't be applied)
        console.warn(`Dynamic class variable '${varName}' not found in context`);
        return '';
      }
      return cls;
    })
    .filter(cls => cls.length > 0);
}
