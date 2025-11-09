/**
 * DOM Utility Functions
 * Helpers for safe DOM element type conversions and assertions
 */

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
