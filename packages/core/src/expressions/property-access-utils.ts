/**
 * Shared Property Access Utilities
 *
 * Consolidates common property access logic used by both:
 * - Basic possessive expressions (properties/index.ts)
 * - Enhanced possessive expressions (possessive/index.ts)
 *
 * This eliminates duplication and ensures consistent behavior across
 * all property access mechanisms.
 *
 * Uses centralized type-helpers for consistent type checking.
 */

import { isFunction, isObject } from './type-helpers';
import {
  isFormElement,
  isInputElement,
  isOptionElement,
  isHTMLElement as isHTMLEl,
} from '../types/type-guards';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a DOM element
 */
export function isElement(value: unknown): value is Element {
  return value instanceof Element;
}

/**
 * Check if value is an HTMLElement
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

/**
 * Check if property is a data attribute
 */
export function isDataAttribute(property: string): boolean {
  return property.startsWith('data-') || property === 'data';
}

/**
 * Check if property is an ARIA attribute
 */
export function isAriaAttribute(property: string): boolean {
  return property.startsWith('aria-') || property === 'aria';
}

// ============================================================================
// Style Property Access
// ============================================================================

/**
 * Access CSS style property from element
 * Handles both inline styles and computed styles
 *
 * @param element - DOM element to read style from
 * @param styleProp - CSS property name (hyphenated format)
 * @returns Style property value or null
 */
export function accessStyleProperty(element: Element, styleProp: string): string | null {
  // Handle computed styles for properties with computed- prefix
  if (styleProp.startsWith('computed-')) {
    const computedProp = styleProp.slice('computed-'.length);
    if (isHTMLElement(element)) {
      const styles = globalThis.getComputedStyle(element);
      return styles.getPropertyValue(computedProp) || null;
    }
    return null;
  }

  // Access inline style property directly
  if (isHTMLElement(element) && element.style) {
    const styleValue = element.style.getPropertyValue(styleProp);
    return styleValue || null;
  }

  return null;
}

// ============================================================================
// Attribute Access
// ============================================================================

/**
 * Access attribute from element
 *
 * @param element - DOM element to read attribute from
 * @param attrName - Attribute name
 * @returns Attribute value or null
 */
export function accessAttribute(element: Element, attrName: string): string | null {
  return element.getAttribute(attrName);
}

/**
 * Check if element has attribute
 *
 * @param element - DOM element to check
 * @param attrName - Attribute name
 * @returns True if attribute exists
 */
export function hasAttribute(element: Element, attrName: string): boolean {
  return element.hasAttribute(attrName);
}

// ============================================================================
// Property Access with Method Binding
// ============================================================================

/**
 * Special DOM property mappings
 * Maps hyperscript property names to actual DOM properties
 */
const SPECIAL_DOM_PROPERTIES: Record<string, (element: Element) => unknown> = {
  'id': (el) => el.id,
  'classname': (el) => el.className,
  'class': (el) => el.className,
  'tagname': (el) => el.tagName.toLowerCase(),
  'innertext': (el) => el.textContent?.trim(),
  'innerHTML': (el) => el.innerHTML,
  'outerhtml': (el) => el.outerHTML,
  'value': (el) => isFormElement(el) ? el.value : undefined,
  'checked': (el) => isInputElement(el) ? el.checked : undefined,
  'disabled': (el) => isFormElement(el) ? el.disabled : undefined,
  'selected': (el) => isOptionElement(el) ? el.selected : undefined,
  'hidden': (el) => isHTMLEl(el) ? el.hidden : undefined,
  'style': (el) => getComputedStyle(el),
  'children': (el) => Array.from(el.children),
  'parent': (el) => el.parentElement,
  'firstchild': (el) => el.firstElementChild,
  'lastchild': (el) => el.lastElementChild,
  'nextsibling': (el) => el.nextElementSibling,
  'previoussibling': (el) => el.previousElementSibling,
};

/**
 * Access property from DOM element with comprehensive handling
 *
 * Handles:
 * - Computed CSS styles (computed- prefix)
 * - Special DOM property mappings
 * - HTML attributes
 * - Regular object properties
 * - Method binding for DOM methods
 *
 * @param element - DOM element to access property from
 * @param property - Property name
 * @returns Property value (with methods bound to element)
 */
export function getElementProperty(element: Element, property: string): unknown {
  // Handle CSS computed style properties with computed- prefix
  if (property.startsWith('computed-')) {
    const cssProperty = property.slice('computed-'.length);
    if (isHTMLElement(element)) {
      const computedStyle = getComputedStyle(element);
      return computedStyle.getPropertyValue(cssProperty);
    }
    return undefined;
  }

  // Handle special DOM properties
  const specialHandler = SPECIAL_DOM_PROPERTIES[property.toLowerCase()];
  if (specialHandler) {
    return specialHandler(element);
  }

  // Try as attribute first
  if (hasAttribute(element, property)) {
    return accessAttribute(element, property);
  }

  // Try as regular property using index signature
  const value = (element as unknown as Record<string, unknown>)[property];

  // Bind functions to element for proper 'this' context
  // This is critical for DOM methods like closest(), querySelector(), etc.
  // Without binding, these methods lose their 'this' reference and fail
  if (isFunction(value)) {
    return value.bind(element);
  }

  return value;
}

/**
 * Access property from regular object
 *
 * @param object - Object to access property from
 * @param property - Property name
 * @returns Property value or null
 */
export function accessObjectProperty(object: unknown, property: string): unknown {
  if (!isObject(object)) {
    return null;
  }

  const obj = object as Record<string, unknown>;
  return obj[property] ?? null;
}

// ============================================================================
// Comprehensive Property Access (All Types)
// ============================================================================

/**
 * Access property with full feature support
 *
 * Handles all hyperscript property access patterns:
 * - *style-property (CSS computed styles)
 * - @attribute (attribute access)
 * - [@attribute] (bracket notation)
 * - regular properties with method binding
 *
 * @param object - Object or element to access property from
 * @param property - Property name (may include prefixes)
 * @returns Property value
 */
export async function accessProperty(
  object: unknown,
  property: string
): Promise<unknown> {
  // Handle null/undefined
  if (object === null || object === undefined) {
    return null;
  }

  // Handle arrays - map over all items
  if (Array.isArray(object)) {
    const results = await Promise.all(
      object.map(item => accessProperty(item, property))
    );
    return results;
  }

  // Handle style property access (*property)
  if (property.startsWith('*')) {
    const styleProp = property.slice(1);
    if (isElement(object)) {
      return accessStyleProperty(object, styleProp);
    }
    return null;
  }

  // Handle bracket attribute notation ([@attribute])
  if (property.startsWith('[@') && property.endsWith(']')) {
    const attrName = property.slice(2, -1);
    if (isElement(object)) {
      return accessAttribute(object, attrName);
    }
    return null;
  }

  // Handle attribute access (@attribute)
  if (property.startsWith('@')) {
    const attrName = property.slice(1);
    if (isElement(object)) {
      return accessAttribute(object, attrName);
    }
    return null;
  }

  // Handle DOM elements
  if (isElement(object)) {
    return getElementProperty(object, property);
  }

  // Handle regular objects
  return accessObjectProperty(object, property);
}

// ============================================================================
// Export all utilities
// ============================================================================

export const propertyAccessUtils = {
  // Type guards
  isElement,
  isHTMLElement,
  isDataAttribute,
  isAriaAttribute,

  // Access functions
  accessStyleProperty,
  accessAttribute,
  hasAttribute,
  getElementProperty,
  accessObjectProperty,
  accessProperty,
} as const;
