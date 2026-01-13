/**
 * Batch DOM Operations
 *
 * Provides shared utilities for batch operations on DOM elements.
 * These helpers consolidate nested loop patterns found in toggle, add, and remove commands.
 *
 * Estimated savings: ~80 lines across toggle.ts, add.ts, remove.ts
 */

// ============================================================================
// Generic Batch Operations
// ============================================================================

/**
 * Apply an operation to each element in a collection
 *
 * @param targets - Target elements to operate on
 * @param operation - Operation to apply to each element
 * @returns The modified elements (same array for chaining)
 */
export function batchApply<T extends HTMLElement>(
  targets: T[],
  operation: (element: T) => void
): T[] {
  for (const element of targets) {
    operation(element);
  }
  return targets;
}

/**
 * Apply an operation to each element for each item in a collection
 * Useful for nested loops like elements × classes
 *
 * @param targets - Target elements to operate on
 * @param items - Items to iterate for each element
 * @param operation - Operation to apply (element, item)
 * @returns The modified elements
 */
export function batchApplyItems<T extends HTMLElement, U>(
  targets: T[],
  items: U[],
  operation: (element: T, item: U) => void
): T[] {
  for (const element of targets) {
    for (const item of items) {
      operation(element, item);
    }
  }
  return targets;
}

// ============================================================================
// Class Operations
// ============================================================================

/**
 * Add classes to multiple elements
 * Only adds if class is not already present (idempotent)
 *
 * @param targets - Target elements
 * @param classes - Class names to add
 * @returns The modified elements
 */
export function batchAddClasses(targets: HTMLElement[], classes: string[]): HTMLElement[] {
  return batchApplyItems(targets, classes, (element, className) => {
    if (!element.classList.contains(className)) {
      element.classList.add(className);
    }
  });
}

/**
 * Remove classes from multiple elements
 * Safe to call even if class doesn't exist
 *
 * @param targets - Target elements
 * @param classes - Class names to remove
 * @returns The modified elements
 */
export function batchRemoveClasses(targets: HTMLElement[], classes: string[]): HTMLElement[] {
  return batchApplyItems(targets, classes, (element, className) => {
    element.classList.remove(className);
  });
}

/**
 * Toggle classes on multiple elements
 *
 * @param targets - Target elements
 * @param classes - Class names to toggle
 * @returns The modified elements
 */
export function batchToggleClasses(targets: HTMLElement[], classes: string[]): HTMLElement[] {
  return batchApplyItems(targets, classes, (element, className) => {
    element.classList.toggle(className);
  });
}

// ============================================================================
// Attribute Operations
// ============================================================================

/**
 * Set an attribute on multiple elements
 *
 * @param targets - Target elements
 * @param name - Attribute name
 * @param value - Attribute value
 * @returns The modified elements
 */
export function batchSetAttribute(
  targets: HTMLElement[],
  name: string,
  value: string
): HTMLElement[] {
  return batchApply(targets, element => {
    element.setAttribute(name, value);
  });
}

/**
 * Remove an attribute from multiple elements
 *
 * @param targets - Target elements
 * @param name - Attribute name to remove
 * @returns The modified elements
 */
export function batchRemoveAttribute(targets: HTMLElement[], name: string): HTMLElement[] {
  return batchApply(targets, element => {
    element.removeAttribute(name);
  });
}

/**
 * Toggle an attribute on multiple elements
 *
 * If value is specified:
 * - If attribute equals value, remove it
 * - Otherwise, set it to value
 *
 * If no value specified (boolean attribute):
 * - If attribute exists, remove it
 * - Otherwise, set to empty string
 *
 * @param targets - Target elements
 * @param name - Attribute name
 * @param value - Optional attribute value
 * @returns The modified elements
 */
export function batchToggleAttribute(
  targets: HTMLElement[],
  name: string,
  value?: string
): HTMLElement[] {
  return batchApply(targets, element => {
    toggleAttribute(element, name, value);
  });
}

/**
 * Toggle attribute on a single element
 * Exported for use in temporal modifiers
 *
 * @param element - Element to modify
 * @param name - Attribute name
 * @param value - Optional attribute value
 */
export function toggleAttribute(element: HTMLElement, name: string, value?: string): void {
  const hasAttribute = element.hasAttribute(name);

  if (value !== undefined) {
    // Toggle with specific value
    if (hasAttribute && element.getAttribute(name) === value) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  } else {
    // Boolean attribute toggle
    if (hasAttribute) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, '');
    }
  }
}

// ============================================================================
// Style Operations
// ============================================================================

/**
 * Set styles on multiple elements
 *
 * @param targets - Target elements
 * @param styles - Object mapping property names to values
 * @returns The modified elements
 */
export function batchSetStyles(
  targets: HTMLElement[],
  styles: Record<string, string>
): HTMLElement[] {
  const entries = Object.entries(styles);
  return batchApplyItems(targets, entries, (element, [property, value]) => {
    element.style.setProperty(property, value);
  });
}

/**
 * Remove style properties from multiple elements
 *
 * @param targets - Target elements
 * @param properties - Style property names to remove
 * @returns The modified elements
 */
export function batchRemoveStyles(targets: HTMLElement[], properties: string[]): HTMLElement[] {
  return batchApplyItems(targets, properties, (element, property) => {
    element.style.removeProperty(property);
  });
}
