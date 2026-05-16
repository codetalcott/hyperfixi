/**
 * Core DOM manipulation utilities for HyperFixi
 * Handles different content placement strategies
 */

import { debug } from '../utils/debug';

/**
 * DOM manipulation strategies
 */
export const SWAP_STRATEGIES = {
  OUTER_HTML: 'outerHTML',
  INNER_HTML: 'innerHTML',
  BEFORE_END: 'beforeend',
  AFTER_BEGIN: 'afterbegin',
} as const;

export type SwapStrategy = (typeof SWAP_STRATEGIES)[keyof typeof SWAP_STRATEGIES];

/** Custom swap function signature */
export type CustomSwapFn = (opts: { target: Element; text: string }) => void;

/**
 * Map placement keywords to DOM swap strategies
 */
export function mapPlacementToSwap(placement: string): string {
  switch (placement) {
    case 'replace':
      return SWAP_STRATEGIES.OUTER_HTML;
    case 'put into':
      return SWAP_STRATEGIES.INNER_HTML;
    case 'append to':
      return SWAP_STRATEGIES.BEFORE_END;
    case 'prepend to':
      return SWAP_STRATEGIES.AFTER_BEGIN;
    default:
      return placement; // Allow custom swap methods
  }
}

/**
 * Apply content to target element using specified swap strategy
 */
export function applySwap(
  target: Element,
  content: string,
  swapStrategy: string | CustomSwapFn
): boolean {
  if (!target || content == null) return false;

  try {
    if (typeof swapStrategy === 'function') {
      swapStrategy({ target, text: content });
      return true;
    }

    switch (swapStrategy) {
      case SWAP_STRATEGIES.OUTER_HTML:
        target.outerHTML = content;
        return true;

      case SWAP_STRATEGIES.INNER_HTML:
        target.innerHTML = content;
        return true;

      case SWAP_STRATEGIES.BEFORE_END:
        target.insertAdjacentHTML('beforeend', content);
        return true;

      case SWAP_STRATEGIES.AFTER_BEGIN:
        target.insertAdjacentHTML('afterbegin', content);
        return true;

      default:
        // Fallback to outerHTML
        target.outerHTML = content;
        return true;
    }
  } catch (error) {
    debug.runtime('DOM swap failed:', error);
    return false;
  }
}

/**
 * Check if an element is still in the document
 */
export function isElementInDocument(element: Element): boolean {
  return !!element && typeof document !== 'undefined' && document.contains(element);
}
