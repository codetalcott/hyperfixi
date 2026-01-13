/**
 * Style Manipulation Helpers
 *
 * Phase 3 Consolidation: Shared utilities for CSS property manipulation
 * Used by toggle, add, remove, and set commands.
 *
 * Provides:
 * - CSS property syntax parsing (*display, *opacity)
 * - Style toggling (display/visibility/opacity)
 * - Safe style get/set operations
 */

/**
 * Supported CSS properties for toggling
 */
export type ToggleableCSSProperty = 'display' | 'visibility' | 'opacity';

/**
 * Result of parsing a CSS property expression
 */
export interface ParsedCSSProperty {
  property: string;
  value?: string;
}

/**
 * Parse CSS property from expression string
 *
 * Supports syntax like:
 * - "*display" → { property: 'display' }
 * - "*opacity" → { property: 'opacity' }
 * - "*background-color" → { property: 'background-color' }
 *
 * @param expression - CSS property expression (e.g., "*display")
 * @returns Parsed property or null if invalid
 */
export function parseCSSProperty(expression: string): ParsedCSSProperty | null {
  const trimmed = expression.trim();

  if (!trimmed.startsWith('*')) {
    return null;
  }

  const property = trimmed.substring(1).trim();
  if (!property) {
    return null;
  }

  return { property };
}

/**
 * Check if expression is a CSS property syntax
 *
 * @param value - Value to check
 * @returns true if value starts with '*'
 */
export function isCSSPropertySyntax(value: string): boolean {
  return typeof value === 'string' && value.trim().startsWith('*');
}

/**
 * Parse toggleable CSS property
 *
 * Only returns properties that can be meaningfully toggled:
 * - display: toggles between 'none' and previous value
 * - visibility: toggles between 'hidden' and 'visible'
 * - opacity: toggles between '0' and '1'
 *
 * @param expression - CSS property expression
 * @returns Toggleable property or null if not toggleable
 */
export function parseToggleableCSSProperty(expression: string): ToggleableCSSProperty | null {
  const parsed = parseCSSProperty(expression);
  if (!parsed) return null;

  const supportedProperties: ToggleableCSSProperty[] = ['display', 'visibility', 'opacity'];
  const property = parsed.property.toLowerCase();

  if (supportedProperties.includes(property as ToggleableCSSProperty)) {
    return property as ToggleableCSSProperty;
  }

  return null;
}

/**
 * Get computed style value for an element
 *
 * @param element - Element to get style from
 * @param property - CSS property name
 * @returns Computed style value
 */
export function getComputedStyleValue(element: HTMLElement, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Set style value on element
 *
 * Uses setProperty for consistent handling of both
 * kebab-case (background-color) and camelCase (backgroundColor) properties.
 *
 * @param element - Element to modify
 * @param property - CSS property name
 * @param value - Value to set
 */
export function setStyleValue(element: HTMLElement, property: string, value: string): void {
  element.style.setProperty(property, value);
}

/**
 * Remove style property from element
 *
 * @param element - Element to modify
 * @param property - CSS property name to remove
 */
export function removeStyleProperty(element: HTMLElement, property: string): void {
  element.style.removeProperty(property);
}

/**
 * Toggle CSS property on element
 *
 * Handles special toggling behavior for common properties:
 * - display: toggles between 'none' and previous value (or 'block')
 * - visibility: toggles between 'hidden' and 'visible'
 * - opacity: toggles between '0' and '1'
 *
 * @param element - Element to modify
 * @param property - CSS property to toggle
 */
export function toggleCSSProperty(element: HTMLElement, property: ToggleableCSSProperty): void {
  const currentStyle = window.getComputedStyle(element);

  switch (property) {
    case 'display':
      if (currentStyle.display === 'none') {
        // Restore previous display value (stored in data attribute) or default to 'block'
        const previousDisplay = element.dataset.previousDisplay || 'block';
        element.style.display = previousDisplay;
        delete element.dataset.previousDisplay;
      } else {
        // Store current display value before hiding
        element.dataset.previousDisplay = currentStyle.display;
        element.style.display = 'none';
      }
      break;

    case 'visibility':
      element.style.visibility = currentStyle.visibility === 'hidden' ? 'visible' : 'hidden';
      break;

    case 'opacity':
      element.style.opacity = parseFloat(currentStyle.opacity) === 0 ? '1' : '0';
      break;
  }
}

/**
 * Check if element is currently hidden via display property
 *
 * @param element - Element to check
 * @returns true if display is 'none'
 */
export function isDisplayNone(element: HTMLElement): boolean {
  return window.getComputedStyle(element).display === 'none';
}

/**
 * Check if element is currently hidden via visibility property
 *
 * @param element - Element to check
 * @returns true if visibility is 'hidden'
 */
export function isVisibilityHidden(element: HTMLElement): boolean {
  return window.getComputedStyle(element).visibility === 'hidden';
}

/**
 * Check if element is currently transparent (opacity 0)
 *
 * @param element - Element to check
 * @returns true if opacity is 0
 */
export function isOpacityZero(element: HTMLElement): boolean {
  return parseFloat(window.getComputedStyle(element).opacity) === 0;
}
