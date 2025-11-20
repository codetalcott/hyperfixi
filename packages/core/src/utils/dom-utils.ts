/**
 * DOM Utility Functions
 * Helpers for safe DOM element type conversions, assertions, and common DOM operations
 *
 * This module consolidates repeated DOM manipulation patterns found across multiple commands
 * to reduce code duplication and ensure consistency.
 */

import type { TypedExecutionContext } from '../types/command-types.ts';

/**
 * Safely convert Element to HTMLElement with type guard
 * Returns null if the element is not an HTMLElement
 */
export function asHTMLElement(element: Element | null): HTMLElement | null;
export function asHTMLElement(element: Element | undefined): HTMLElement | undefined;
export function asHTMLElement(element: Element | null | undefined): HTMLElement | null | undefined {
  if (element instanceof HTMLElement) {
    return element;
  }
  return null;
}

/**
 * Assert element is HTMLElement, throw if not
 * Use this when you need to guarantee HTMLElement type
 */
export function requireHTMLElement(
  element: Element | null | undefined,
  context?: string
): HTMLElement {
  if (element instanceof HTMLElement) {
    return element;
  }
  throw new TypeError(
    `Expected HTMLElement${context ? ': ' + context : ''}, got ${element?.nodeName || 'null'}`
  );
}

/**
 * Convert array of Elements to HTMLElements, filtering out non-HTML elements
 */
export function asHTMLElements(elements: Element[]): HTMLElement[] {
  return elements.filter(el => el instanceof HTMLElement);
}

/**
 * Type guard to check if element is HTMLElement
 */
export function isHTMLElement(element: Element | null | undefined): element is HTMLElement {
  return element instanceof HTMLElement;
}

// ============================================================================
// Target Resolution (Shared Across 12+ Commands)
// ============================================================================

/**
 * Options for target resolution behavior
 */
export interface ResolveTargetsOptions {
  /** Allow empty result array (default: false - throws error if no targets found) */
  allowEmpty?: boolean;
  /** Require context.me to be present if no target specified (default: true) */
  contextRequired?: boolean;
}

/**
 * Resolve target elements from various input types
 *
 * This function consolidates the target resolution logic that was duplicated
 * across add, remove, toggle, hide, show, send, trigger, and other commands.
 *
 * Handles:
 * - undefined/null → context.me (if available)
 * - HTMLElement → single element array
 * - HTMLElement[] → array of elements
 * - NodeList/HTMLCollection → converted to array
 * - string → querySelectorAll results
 *
 * @param context - Execution context containing 'me', 'it', 'you' references
 * @param target - Target specification (element, selector, array, etc.)
 * @param options - Resolution options
 * @returns Array of resolved HTMLElements
 * @throws Error if no targets found and allowEmpty is false
 *
 * @example
 * // Use context.me if no target specified
 * const elements = resolveTargets(context);
 *
 * @example
 * // Query by selector
 * const buttons = resolveTargets(context, '.button');
 *
 * @example
 * // Allow empty results
 * const maybeElements = resolveTargets(context, '#nonexistent', { allowEmpty: true });
 */
export function resolveTargets(
  context: TypedExecutionContext,
  target?: unknown,
  options: ResolveTargetsOptions = {}
): HTMLElement[] {
  const { allowEmpty = false, contextRequired = true } = options;

  // Handle undefined/null - use context.me
  if (target === undefined || target === null) {
    if (!context.me) {
      if (contextRequired) {
        throw new Error('Context element "me" is null');
      }
      return allowEmpty ? [] : [];
    }
    const htmlElement = asHTMLElement(context.me);
    if (!htmlElement) {
      throw new Error('Context element "me" is not an HTMLElement');
    }
    return [htmlElement];
  }

  // Handle direct HTMLElement
  if (target instanceof HTMLElement) {
    return [target];
  }

  // Handle NodeList (from querySelectorAll)
  if (target instanceof NodeList) {
    return Array.from(target).filter(el => el instanceof HTMLElement) as HTMLElement[];
  }

  // Handle HTMLCollection (from getElementsBy* methods)
  if (target instanceof HTMLCollection) {
    return Array.from(target).filter(el => el instanceof HTMLElement) as HTMLElement[];
  }

  // Handle Array of elements
  if (Array.isArray(target)) {
    return target.filter(item => item instanceof HTMLElement);
  }

  // Handle CSS selector string
  if (typeof target === 'string') {
    try {
      const elements = document.querySelectorAll(target);
      const htmlElements = Array.from(elements).filter(
        el => el instanceof HTMLElement
      ) as HTMLElement[];

      if (!allowEmpty && htmlElements.length === 0) {
        throw new Error(`No elements found matching selector: "${target}"`);
      }

      return htmlElements;
    } catch (error) {
      throw new Error(
        `Invalid CSS selector: "${target}"${error instanceof Error ? ' - ' + error.message : ''}`
      );
    }
  }

  // Unknown target type
  if (!allowEmpty) {
    throw new Error(`Cannot resolve target of type: ${typeof target}`);
  }

  return [];
}

// ============================================================================
// CSS Class Utilities (Shared Across 8+ Commands)
// ============================================================================

/**
 * Validate CSS class name format
 *
 * CSS class names must:
 * - Start with letter, underscore, or hyphen
 * - Contain only letters, digits, underscores, or hyphens
 * - Not be empty
 *
 * @param className - Class name to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidClassName('my-class') // true
 * isValidClassName('btn-primary') // true
 * isValidClassName('123invalid') // false
 * isValidClassName('has space') // false
 */
export function isValidClassName(className: string): boolean {
  if (!className || className.trim().length === 0) {
    return false;
  }

  // CSS class names: start with letter/underscore/hyphen, then alphanumeric/underscore/hyphen
  const cssClassNameRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
  return cssClassNameRegex.test(className.trim());
}

/**
 * Parse class expression into array of valid class names
 *
 * Handles:
 * - String with space/comma delimiters: "class1 class2,class3"
 * - Array of class names: ['class1', 'class2']
 * - Leading dots from CSS selectors: ".class-name" → "class-name"
 * - Filtering invalid class names
 *
 * @param classExpression - Class expression to parse
 * @param validate - Whether to validate and filter class names (default: true)
 * @returns Array of parsed class names
 *
 * @example
 * parseClasses('.btn .active') // ['btn', 'active']
 * parseClasses('btn, active') // ['btn', 'active']
 * parseClasses(['btn', 'active']) // ['btn', 'active']
 */
export function parseClasses(
  classExpression: unknown,
  validate = true
): string[] {
  if (!classExpression) {
    return [];
  }

  let classes: string[] = [];

  // Handle string input
  if (typeof classExpression === 'string') {
    classes = classExpression.split(/[\s,]+/);
  }
  // Handle array input
  else if (Array.isArray(classExpression)) {
    classes = classExpression.map(String);
  }
  // Handle other types by converting to string
  else {
    classes = [String(classExpression)];
  }

  // Process and filter classes
  return classes
    .map(cls => {
      const trimmed = cls.trim();
      // Remove leading dot from CSS selector syntax
      return trimmed.startsWith('.') ? trimmed.substring(1) : trimmed;
    })
    .filter(cls => {
      if (!cls.length) return false;
      return validate ? isValidClassName(cls) : true;
    });
}

// ============================================================================
// HTML Attribute Utilities
// ============================================================================

/**
 * Validate HTML attribute name format
 *
 * HTML attribute names must:
 * - Start with letter or underscore
 * - Contain only letters, digits, hyphens, periods, or underscores
 * - Not be empty
 *
 * @param name - Attribute name to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidAttributeName('data-value') // true
 * isValidAttributeName('aria-label') // true
 * isValidAttributeName('123invalid') // false
 */
export function isValidAttributeName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }

  // HTML attribute names: start with letter/underscore, then alphanumeric/underscore/hyphen/period
  const attributeNameRegex = /^[a-zA-Z_][a-zA-Z0-9._-]*$/;
  return attributeNameRegex.test(name.trim());
}

/**
 * Validate CSS selector syntax
 *
 * Attempts to use querySelector to validate selector syntax.
 * This is more reliable than regex but has a performance cost.
 *
 * @param selector - CSS selector to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidCSSSelector('.my-class') // true
 * isValidCSSSelector('#my-id') // true
 * isValidCSSSelector('div > p') // true
 * isValidCSSSelector('invalid[') // false
 */
export function isValidCSSSelector(selector: string): boolean {
  try {
    document.querySelector(selector);
    return true;
  } catch {
    return false;
  }
}
