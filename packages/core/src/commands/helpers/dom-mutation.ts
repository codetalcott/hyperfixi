/**
 * DOM Mutation Helpers
 *
 * Phase 3 Consolidation: Shared utilities for DOM mutation operations
 * Used by put, make, swap, add, and remove commands.
 *
 * Provides:
 * - Content insertion at various positions
 * - Element removal
 * - Safe DOM manipulation utilities
 */

import { isHTMLElement } from '../../utils/element-check';

/**
 * Extended insert positions (standard DOM InsertPosition plus 'replace')
 * Note: We use a custom type name to avoid conflict with the DOM InsertPosition type
 */
export type ContentInsertPosition =
  | 'beforebegin'
  | 'afterbegin'
  | 'beforeend'
  | 'afterend'
  | 'replace';

/**
 * Semantic position names mapped to InsertPosition
 */
export type SemanticPosition = 'before' | 'prepend' | 'append' | 'after' | 'into';

/**
 * Map semantic position names to ContentInsertPosition values
 */
const positionMap: Record<SemanticPosition, ContentInsertPosition> = {
  before: 'beforebegin',
  prepend: 'afterbegin',
  append: 'beforeend',
  after: 'afterend',
  into: 'replace',
};

/**
 * Convert semantic position name to ContentInsertPosition
 *
 * @param position - Semantic position name
 * @returns ContentInsertPosition value
 *
 * @example
 * ```typescript
 * toInsertPosition('before'); // 'beforebegin'
 * toInsertPosition('into');   // 'replace'
 * ```
 */
export function toInsertPosition(position: SemanticPosition): ContentInsertPosition {
  return positionMap[position];
}

/**
 * Check if a string looks like HTML content
 *
 * Simple heuristic: contains both < and > characters.
 *
 * @param str - String to check
 * @returns true if string appears to contain HTML
 */
export function looksLikeHTML(str: string): boolean {
  return str.includes('<') && str.includes('>');
}

/**
 * Insert content at a position relative to target element
 *
 * Handles both HTMLElement and string content.
 * For string content, uses insertAdjacentHTML if HTML, insertAdjacentText if not.
 * For 'replace' position, replaces target's content entirely.
 *
 * @param target - Target element
 * @param content - Content to insert (string or HTMLElement)
 * @param position - Insert position
 *
 * @example
 * ```typescript
 * // Insert before target
 * insertContent(target, '<div>New</div>', 'beforebegin');
 *
 * // Replace target content
 * insertContent(target, 'New content', 'replace');
 *
 * // Append element
 * insertContent(target, newElement, 'beforeend');
 * ```
 */
export function insertContent(
  target: HTMLElement,
  content: string | HTMLElement,
  position: ContentInsertPosition
): void {
  if (position === 'replace') {
    insertReplace(target, content);
    return;
  }

  if (isHTMLElement(content)) {
    insertElement(target, content, position);
  } else {
    insertText(target, content, position);
  }
}

/**
 * Insert content using semantic position names
 *
 * @param target - Target element
 * @param content - Content to insert
 * @param position - Semantic position name
 */
export function insertContentSemantic(
  target: HTMLElement,
  content: string | HTMLElement,
  position: SemanticPosition
): void {
  insertContent(target, content, toInsertPosition(position));
}

/**
 * Replace target element's content
 *
 * @param target - Target element
 * @param content - New content
 */
function insertReplace(target: HTMLElement, content: string | HTMLElement): void {
  if (isHTMLElement(content)) {
    target.innerHTML = '';
    target.appendChild(content);
  } else {
    if (looksLikeHTML(content)) {
      target.innerHTML = content;
    } else {
      target.textContent = content;
    }
  }
}

/**
 * Insert an HTMLElement at position
 *
 * @param target - Target element
 * @param element - Element to insert
 * @param position - Insert position
 */
function insertElement(
  target: HTMLElement,
  element: HTMLElement,
  position: ContentInsertPosition
): void {
  switch (position) {
    case 'beforebegin':
      target.parentElement?.insertBefore(element, target);
      break;
    case 'afterbegin':
      target.insertBefore(element, target.firstChild);
      break;
    case 'beforeend':
      target.appendChild(element);
      break;
    case 'afterend':
      target.parentElement?.insertBefore(element, target.nextSibling);
      break;
  }
}

/**
 * Insert text/HTML string at position
 *
 * @param target - Target element
 * @param content - String content to insert
 * @param position - Insert position
 */
function insertText(target: HTMLElement, content: string, position: ContentInsertPosition): void {
  // Cast to DOM InsertPosition - 'replace' is handled before this function is called
  const domPosition = position as globalThis.InsertPosition;
  if (looksLikeHTML(content)) {
    target.insertAdjacentHTML(domPosition, content);
  } else {
    target.insertAdjacentText(domPosition, content);
  }
}

/**
 * Remove an element from the DOM
 *
 * Safe removal that handles elements not in the DOM.
 *
 * @param element - Element to remove
 * @returns true if element was removed
 *
 * @example
 * ```typescript
 * if (removeElement(element)) {
 *   console.log('Element removed');
 * }
 * ```
 */
export function removeElement(element: HTMLElement): boolean {
  if (element.parentNode) {
    element.remove();
    return true;
  }
  return false;
}

/**
 * Remove multiple elements from the DOM
 *
 * @param elements - Elements to remove
 * @returns Number of elements removed
 */
export function removeElements(elements: HTMLElement[]): number {
  let removed = 0;
  for (const element of elements) {
    if (removeElement(element)) {
      removed++;
    }
  }
  return removed;
}

/**
 * Swap two elements' positions in the DOM
 *
 * Uses a placeholder node to swap positions safely.
 *
 * @param element1 - First element
 * @param element2 - Second element
 * @returns true if swap was successful
 *
 * @example
 * ```typescript
 * swapElements(el1, el2);  // el1 is now where el2 was, and vice versa
 * ```
 */
export function swapElements(element1: HTMLElement, element2: HTMLElement): boolean {
  if (!element1.parentNode || !element2.parentNode) {
    return false;
  }

  // Create a placeholder to mark element1's position
  const placeholder = document.createComment('swap-placeholder');

  // Insert placeholder before element1
  element1.parentNode.insertBefore(placeholder, element1);

  // Move element1 to element2's position
  element2.parentNode.insertBefore(element1, element2);

  // Move element2 to placeholder position (element1's original position)
  placeholder.parentNode?.insertBefore(element2, placeholder);

  // Remove placeholder
  placeholder.remove();

  return true;
}

/**
 * Clone an element for insertion
 *
 * Creates a deep clone of an element.
 *
 * @param element - Element to clone
 * @param deep - Whether to clone descendants (default: true)
 * @returns Cloned element
 */
export function cloneElement<T extends HTMLElement>(element: T, deep: boolean = true): T {
  return element.cloneNode(deep) as T;
}

/**
 * Create an element from HTML string
 *
 * Uses a template element for safe parsing.
 *
 * @param html - HTML string
 * @returns Created element or null if invalid
 *
 * @example
 * ```typescript
 * const div = createElementFromHTML('<div class="new">Content</div>');
 * ```
 */
export function createElementFromHTML(html: string): HTMLElement | null {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const element = template.content.firstElementChild;
  return element && isHTMLElement(element) ? element : null;
}

/**
 * Safely set innerHTML with proper handling
 *
 * @param element - Target element
 * @param html - HTML content to set
 */
export function setInnerHTML(element: HTMLElement, html: string): void {
  element.innerHTML = html;
}

/**
 * Safely set textContent
 *
 * @param element - Target element
 * @param text - Text content to set
 */
export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = text;
}

/**
 * Clear all content from an element
 *
 * @param element - Element to clear
 */
export function clearElement(element: HTMLElement): void {
  element.innerHTML = '';
}
