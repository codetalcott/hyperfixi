/**
 * Element Property Access Helpers - Shared utilities for element property manipulation
 *
 * Used by: set, default, and other commands that need to get/set element properties
 *
 * These utilities handle:
 * - Getting/setting common DOM properties (textContent, innerHTML, id, className, value)
 * - Getting/setting CSS style properties
 * - Generic property access with type safety
 * - Element primary value (input value or textContent)
 *
 * This consolidates duplicated code that was in set.ts and default.ts
 */

import { isHTMLElement } from '../../utils/element-check';

/**
 * Get element property value (handles common DOM properties and styles)
 *
 * Handles:
 * - textContent, innerHTML, innerText
 * - id, className
 * - value (for input elements)
 * - CSS style properties (with hyphenated names)
 * - Generic DOM properties
 *
 * @param element - Target HTML element
 * @param property - Property name to get
 * @returns Property value
 */
export function getElementProperty(element: HTMLElement, property: string): unknown {
  // Handle common properties directly
  switch (property) {
    case 'textContent':
      return element.textContent;
    case 'innerHTML':
      return element.innerHTML;
    case 'innerText':
      return element.innerText;
    case 'id':
      return element.id;
    case 'className':
      return element.className;
    case 'value':
      return 'value' in element ? (element as HTMLInputElement).value : undefined;
  }
  // Handle style properties
  if (property.includes('-') || property in element.style) {
    return (
      element.style.getPropertyValue(property) || (element.style as Record<string, unknown>)[property]
    );
  }
  // Generic property access
  return (element as Record<string, unknown>)[property];
}

/**
 * Set element property value (handles common DOM properties and styles)
 *
 * Handles:
 * - textContent, innerHTML, innerText
 * - id, className
 * - value (for input elements)
 * - CSS style properties (with hyphenated names)
 * - Generic DOM properties with readonly protection
 *
 * @param element - Target HTML element
 * @param property - Property name to set
 * @param value - Value to set
 * @throws Error if property is readonly or protected
 */
export function setElementProperty(element: HTMLElement, property: string, value: unknown): void {
  const strValue = String(value);
  switch (property) {
    case 'textContent':
      element.textContent = strValue;
      return;
    case 'innerHTML':
      element.innerHTML = strValue;
      return;
    case 'innerText':
      element.innerText = strValue;
      return;
    case 'id':
      element.id = strValue;
      return;
    case 'className':
      element.className = strValue;
      return;
    case 'value':
      if ('value' in element) (element as HTMLInputElement).value = strValue;
      return;
  }
  // Handle style properties
  if (property.includes('-') || property in element.style) {
    element.style.setProperty(property, strValue);
    return;
  }
  // Generic property with readonly protection
  try {
    (element as Record<string, unknown>)[property] = value;
  } catch (error) {
    if (
      !(
        error instanceof TypeError &&
        (error.message.includes('only a getter') || error.message.includes('read only'))
      )
    ) {
      throw new Error(
        `Cannot set property '${property}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Get element's primary value (input value or textContent)
 *
 * For input-like elements (input, textarea, select), returns the value property.
 * For other elements, returns textContent.
 *
 * @param element - Target HTML element
 * @returns Primary value
 */
export function getElementValue(element: HTMLElement): unknown {
  return 'value' in element ? (element as HTMLInputElement).value : element.textContent;
}

/**
 * Set element's primary value (input value or textContent)
 *
 * For input-like elements, sets the value property.
 * For other elements, sets textContent.
 *
 * @param element - Target HTML element
 * @param value - Value to set
 */
export function setElementValue(element: HTMLElement, value: unknown): void {
  if ('value' in element) {
    (element as HTMLInputElement).value = String(value);
  } else {
    element.textContent = String(value);
  }
}

/**
 * Check if value is "empty" for defaulting purposes
 *
 * Considers undefined, null, and empty string as empty.
 *
 * @param value - Value to check
 * @returns True if value is empty
 */
export function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Check if value is a plain object (not array, not null, not DOM node)
 *
 * Used for distinguishing object literals from other value types.
 *
 * @param value - Value to check
 * @returns True if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  if (isHTMLElement(value) || value instanceof Node) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
