/**
 * Common Validators
 *
 * Shared validation patterns used across multiple commands.
 * This reduces code duplication and ensures consistency.
 *
 * These validators are built on top of the lightweight-validators system
 * and provide frequently-used validation patterns for DOM elements, targets,
 * CSS selectors, and other common types.
 */

import { v } from './lightweight-validators';
import type { RuntimeValidator } from './lightweight-validators';

/**
 * Validates that a value is an HTMLElement instance
 * Used by: add, remove, toggle, hide, show, send, trigger, take, put, and more
 */
export const htmlElement: RuntimeValidator<HTMLElement> = v.custom(
  (value: unknown) => value instanceof HTMLElement,
  'Expected HTMLElement'
);

/**
 * Validates that a value is an array of HTMLElements
 * Used by: add, remove, toggle, hide, show, and other DOM commands
 */
export const htmlElementArray: RuntimeValidator<HTMLElement[]> = v.array(
  v.custom((value: unknown) => value instanceof HTMLElement)
);

/**
 * Validates that a value is either an HTMLElement, null, or undefined
 * Used for optional element parameters
 */
export const htmlElementOrNull: RuntimeValidator<HTMLElement | null | undefined> = v.union([
  v.custom((value: unknown) => value instanceof HTMLElement),
  v.null(),
  v.undefined(),
]);

/**
 * Validates element target expressions
 * Accepts:
 * - HTMLElement instance (direct element reference)
 * - Array of HTMLElements (multiple elements)
 * - String (CSS selector)
 * - null/undefined (use implicit target like context.me)
 *
 * This is the most commonly used validator for command targets.
 * Used by: add, remove, toggle, hide, show, send, trigger, and many more
 */
export const elementTarget: RuntimeValidator<
  HTMLElement | HTMLElement[] | string | null | undefined
> = v.union([
  v.custom((value: unknown) => value instanceof HTMLElement),
  v.array(v.custom((value: unknown) => value instanceof HTMLElement)),
  v.string(),
  v.null(),
  v.undefined(),
]);

/**
 * Validates NodeList (result of querySelectorAll)
 */
export const nodeList: RuntimeValidator<NodeList> = v.custom(
  (value: unknown) => value instanceof NodeList,
  'Expected NodeList'
);

/**
 * Validates HTMLCollection
 */
export const htmlCollection: RuntimeValidator<HTMLCollection> = v.custom(
  (value: unknown) => value instanceof HTMLCollection,
  'Expected HTMLCollection'
);

/**
 * Validates that a value is a valid CSS selector string
 * Note: This does NOT validate selector syntax, just that it's a non-empty string.
 * Actual syntax validation happens at runtime when querySelector is called.
 */
export const cssSelector: RuntimeValidator<string> = v.string().min(1);

/**
 * Validates that a value is a valid CSS class name
 * Format: starts with letter/underscore/hyphen, followed by alphanumeric/underscore/hyphen
 */
export const cssClassName: RuntimeValidator<string> = v
  .string()
  .refine(
    (value: string) => /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(value.trim()),
    'Invalid CSS class name format'
  );

/**
 * Validates that a value is a valid HTML attribute name
 * Format: starts with letter/underscore, followed by alphanumeric/underscore/hyphen/period
 */
export const attributeName: RuntimeValidator<string> = v
  .string()
  .refine(
    (value: string) => /^[a-zA-Z_][a-zA-Z0-9._-]*$/.test(value.trim()),
    'Invalid attribute name format'
  );

/**
 * Validates event name strings
 * Used by: send, trigger, on, and other event-related commands
 */
export const eventName: RuntimeValidator<string> = v.string().min(1);

/**
 * Collection of all common validators for easy import
 */
export const validators = {
  htmlElement,
  htmlElementArray,
  htmlElementOrNull,
  elementTarget,
  nodeList,
  htmlCollection,
  cssSelector,
  cssClassName,
  attributeName,
  eventName,
};
