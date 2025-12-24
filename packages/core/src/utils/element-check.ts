/**
 * Cross-Realm Element Type Checking Utilities
 *
 * Provides duck-typing based element checks that work across:
 * - Different JavaScript realms (iframes, workers)
 * - Test environments (vitest, happy-dom, jsdom)
 * - Production browser environments
 *
 * The `instanceof HTMLElement` check fails in cross-realm scenarios because
 * each realm has its own HTMLElement constructor. Duck-typing avoids this
 * by checking for expected properties instead.
 */

/**
 * Cross-realm safe HTMLElement check using duck-typing.
 *
 * Checks for:
 * - nodeType === 1 (Element node)
 * - tagName property (string)
 * - classList property (for class manipulation)
 *
 * @param value - Value to check
 * @returns True if value is an HTMLElement-like object
 *
 * @example
 * ```typescript
 * // Instead of: if (element instanceof HTMLElement)
 * if (isHTMLElement(element)) {
 *   element.classList.add('active');
 * }
 * ```
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return (
    value !== null &&
    typeof value === 'object' &&
    'nodeType' in value &&
    (value as any).nodeType === 1 &&
    'tagName' in value &&
    typeof (value as any).tagName === 'string' &&
    'classList' in value
  );
}

/**
 * Cross-realm safe Node check using duck-typing.
 *
 * Checks for:
 * - nodeType property (number)
 * - nodeName property (string)
 *
 * @param value - Value to check
 * @returns True if value is a Node-like object
 */
export function isNode(value: unknown): value is Node {
  return (
    value !== null &&
    typeof value === 'object' &&
    'nodeType' in value &&
    typeof (value as any).nodeType === 'number' &&
    'nodeName' in value &&
    typeof (value as any).nodeName === 'string'
  );
}

/**
 * Cross-realm safe Element check using duck-typing.
 *
 * More general than isHTMLElement - includes SVG elements, etc.
 *
 * @param value - Value to check
 * @returns True if value is an Element-like object
 */
export function isElement(value: unknown): value is Element {
  return (
    value !== null &&
    typeof value === 'object' &&
    'nodeType' in value &&
    (value as any).nodeType === 1 &&
    'tagName' in value &&
    typeof (value as any).tagName === 'string'
  );
}

/**
 * Cross-realm safe EventTarget check using duck-typing.
 *
 * @param value - Value to check
 * @returns True if value has addEventListener method
 */
export function isEventTarget(value: unknown): value is EventTarget {
  return (
    value !== null &&
    typeof value === 'object' &&
    'addEventListener' in value &&
    typeof (value as any).addEventListener === 'function'
  );
}

/**
 * Check if value is a NodeList-like object.
 *
 * @param value - Value to check
 * @returns True if value is iterable with length property
 */
export function isNodeList(value: unknown): value is NodeList {
  return (
    value !== null &&
    typeof value === 'object' &&
    'length' in value &&
    typeof (value as any).length === 'number' &&
    (Symbol.iterator in value || typeof (value as any).item === 'function')
  );
}

/**
 * Cross-realm safe DocumentFragment check using duck-typing.
 *
 * Checks for:
 * - nodeType === 11 (DocumentFragment node)
 * - childNodes property
 *
 * @param value - Value to check
 * @returns True if value is a DocumentFragment-like object
 */
export function isDocumentFragment(value: unknown): value is DocumentFragment {
  return (
    value !== null &&
    typeof value === 'object' &&
    'nodeType' in value &&
    (value as any).nodeType === 11 &&
    'childNodes' in value
  );
}
