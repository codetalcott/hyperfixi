/**
 * Positional expressions for hyperscript
 * Handles first, last, next, previous, and numeric position expressions
 *
 * Uses centralized type-helpers for consistent type checking.
 */

import type { ExecutionContext, ExpressionImplementation } from '../../types/core';
import { validateMaxArgs, validateArgRange, validateArgIsNumber } from '../validation-helpers';
import { isString, isNumber, isObject } from '../type-helpers';

// ============================================================================
// Array/Collection Positional Expressions
// ============================================================================

export const firstExpression: ExpressionImplementation = {
  name: 'first',
  category: 'Reference',
  evaluatesTo: 'Any',
  operators: ['first'],

  async evaluate(context: ExecutionContext, collection?: any): Promise<any> {
    // If no collection provided, use context.it
    const target = collection !== undefined ? collection : context.it;

    if (target == null) {
      return null;
    }

    // Handle arrays
    if (Array.isArray(target)) {
      return target.length > 0 ? target[0] : null;
    }

    // Handle NodeList or HTMLCollection
    if (target instanceof NodeList || target instanceof HTMLCollection) {
      return target.length > 0 ? target[0] : null;
    }

    // Handle DOM element - get first child element
    if (target instanceof Element) {
      return target.children.length > 0 ? target.children[0] : null;
    }

    // Handle string
    if (isString(target)) {
      const strTarget = target as string;
      return strTarget.length > 0 ? strTarget[0] : null;
    }

    // Handle object with length property
    if (isObject(target) && 'length' in (target as object) && isNumber((target as any).length)) {
      const objTarget = target as { length: number; [key: number]: unknown };
      return objTarget.length > 0 ? objTarget[0] : null;
    }

    return null;
  },

  validate(args: any[]): string | null {
    return validateMaxArgs(args, 1, 'first', 'collection');
  },
};

export const lastExpression: ExpressionImplementation = {
  name: 'last',
  category: 'Reference',
  evaluatesTo: 'Any',
  operators: ['last'],

  async evaluate(context: ExecutionContext, collection?: any): Promise<any> {
    // If no collection provided, use context.it
    const target = collection !== undefined ? collection : context.it;

    if (target == null) {
      return null;
    }

    // Handle arrays
    if (Array.isArray(target)) {
      return target.length > 0 ? target[target.length - 1] : null;
    }

    // Handle NodeList or HTMLCollection
    if (target instanceof NodeList || target instanceof HTMLCollection) {
      return target.length > 0 ? target[target.length - 1] : null;
    }

    // Handle DOM element - get last child element
    if (target instanceof Element) {
      const children = target.children;
      return children.length > 0 ? children[children.length - 1] : null;
    }

    // Handle string
    if (isString(target)) {
      const strTarget = target as string;
      return strTarget.length > 0 ? strTarget[strTarget.length - 1] : null;
    }

    // Handle object with length property
    if (isObject(target) && 'length' in (target as object) && isNumber((target as any).length)) {
      const objTarget = target as { length: number; [key: number]: unknown };
      return objTarget.length > 0 ? objTarget[objTarget.length - 1] : null;
    }

    return null;
  },

  validate(args: any[]): string | null {
    return validateMaxArgs(args, 1, 'last', 'collection');
  },
};

export const atExpression: ExpressionImplementation = {
  name: 'at',
  category: 'Reference',
  evaluatesTo: 'Any',
  operators: ['at'],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<any> {
    const [index, collection] = args;
    if (!isNumber(index)) {
      throw new Error('Index must be a number');
    }
    const numIndex = index as number;

    // If no collection provided, use context.it
    const target = collection !== undefined ? collection : context.it;

    if (target == null) {
      return null;
    }

    // Handle arrays
    if (Array.isArray(target)) {
      // Support negative indexing
      const actualIndex = numIndex < 0 ? target.length + numIndex : numIndex;
      return actualIndex >= 0 && actualIndex < target.length ? target[actualIndex] : null;
    }

    // Handle NodeList or HTMLCollection
    if (target instanceof NodeList || target instanceof HTMLCollection) {
      const actualIndex = numIndex < 0 ? target.length + numIndex : numIndex;
      return actualIndex >= 0 && actualIndex < target.length ? target[actualIndex] : null;
    }

    // Handle DOM element - get nth child element
    if (target instanceof Element) {
      const children = target.children;
      const actualIndex = numIndex < 0 ? children.length + numIndex : numIndex;
      return actualIndex >= 0 && actualIndex < children.length ? children[actualIndex] : null;
    }

    // Handle string
    if (isString(target)) {
      const strTarget = target as string;
      const actualIndex = numIndex < 0 ? strTarget.length + numIndex : numIndex;
      return actualIndex >= 0 && actualIndex < strTarget.length ? strTarget[actualIndex] : null;
    }

    // Handle object with length property and numeric indexing
    if (isObject(target) && 'length' in (target as object) && isNumber((target as any).length)) {
      const objTarget = target as { length: number; [key: number]: unknown };
      const actualIndex = numIndex < 0 ? objTarget.length + numIndex : numIndex;
      return actualIndex >= 0 && actualIndex < objTarget.length ? objTarget[actualIndex] : null;
    }

    return null;
  },

  validate(args: any[]): string | null {
    return (
      validateArgRange(args, 1, 2, 'at', 'index, optional collection') ??
      validateArgIsNumber(args, 0, 'at', 'index')
    );
  },
};

// ============================================================================
// DOM Relative Positional Expressions
// ============================================================================

export const nextExpression: ExpressionImplementation = {
  name: 'next',
  category: 'Reference',
  evaluatesTo: 'Element',
  operators: ['next'],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<HTMLElement | null> {
    const [selector, fromElement] = args;
    const startElement = (fromElement as HTMLElement | undefined) || context.me;

    if (!startElement || !(startElement instanceof Element)) {
      return null;
    }

    // If no selector provided, just get the next sibling element
    if (!selector) {
      return startElement.nextElementSibling as HTMLElement | null;
    }

    // Find next element matching selector in DOM tree
    return findNextElementInDOM(startElement, selector as string);
  },

  validate(args: any[]): string | null {
    const maxError = validateMaxArgs(args, 2, 'next', 'optional selector, optional fromElement');
    if (maxError) return maxError;
    if (args.length >= 1 && args[0] != null && typeof args[0] !== 'string') {
      return 'selector must be a string';
    }
    if (args.length >= 2 && args[1] != null && !(args[1] instanceof Element)) {
      return 'fromElement must be an Element';
    }
    return null;
  },
};

export const previousExpression: ExpressionImplementation = {
  name: 'previous',
  category: 'Reference',
  evaluatesTo: 'Element',
  operators: ['previous', 'prev'],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<HTMLElement | null> {
    const [selector, fromElement] = args;
    const startElement = (fromElement as HTMLElement | undefined) || context.me;

    if (!startElement || !(startElement instanceof Element)) {
      return null;
    }

    // If no selector provided, just get the previous sibling element
    if (!selector) {
      return startElement.previousElementSibling as HTMLElement | null;
    }

    // Find previous element matching selector in DOM tree
    return findPreviousElementInDOM(startElement, selector as string);
  },

  validate(args: any[]): string | null {
    const maxError = validateMaxArgs(
      args,
      2,
      'previous',
      'optional selector, optional fromElement'
    );
    if (maxError) return maxError;
    if (args.length >= 1 && args[0] != null && typeof args[0] !== 'string') {
      return 'selector must be a string';
    }
    if (args.length >= 2 && args[1] != null && !(args[1] instanceof Element)) {
      return 'fromElement must be an Element';
    }
    return null;
  },
};

// ============================================================================
// Helper Functions for DOM Traversal
// ============================================================================

function findNextElementInDOM(startElement: Element, selector: string): HTMLElement | null {
  // Start with the next sibling
  let current = startElement.nextElementSibling;

  // Check siblings first
  while (current) {
    if (current.matches(selector)) {
      return current as HTMLElement;
    }
    // Recursively check children
    const found = current.querySelector(selector);
    if (found) {
      return found as HTMLElement;
    }
    current = current.nextElementSibling;
  }

  // If no siblings found, move up to parent and continue
  const parent = startElement.parentElement;
  if (parent && parent !== document.documentElement) {
    return findNextElementInDOM(parent, selector);
  }

  return null;
}

function findPreviousElementInDOM(startElement: Element, selector: string): HTMLElement | null {
  // Start with the previous sibling
  let current = startElement.previousElementSibling;

  // Check siblings first (in reverse order)
  while (current) {
    // Check the sibling's descendants first (depth-first, reverse)
    const descendants = Array.from(current.querySelectorAll(selector)).reverse();
    if (descendants.length > 0) {
      return descendants[0] as HTMLElement;
    }

    // Then check the sibling itself
    if (current.matches(selector)) {
      return current as HTMLElement;
    }

    current = current.previousElementSibling;
  }

  // If no siblings found, move up to parent and continue
  const parent = startElement.parentElement;
  if (parent && parent !== document.documentElement) {
    return findPreviousElementInDOM(parent, selector);
  }

  return null;
}

// ============================================================================
// Advanced Positional Expressions with Options
// ============================================================================

export const nextWithinExpression: ExpressionImplementation = {
  name: 'nextWithin',
  category: 'Reference',
  evaluatesTo: 'Element',
  operators: ['next within'],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<HTMLElement | null> {
    const [selector, withinSelector, fromElement] = args;
    const startElement = (fromElement as HTMLElement | undefined) || context.me;

    if (!startElement || !(startElement instanceof Element)) {
      return null;
    }

    // Find the container element
    const container = startElement.closest(withinSelector as string);
    if (!container) {
      return null;
    }

    // Find next element within the container
    return findNextElementWithinContainer(startElement, selector as string, container);
  },

  validate(args: any[]): string | null {
    const rangeError = validateArgRange(
      args,
      2,
      3,
      'nextWithin',
      'selector, withinSelector, optional fromElement'
    );
    if (rangeError) return rangeError;
    if (typeof args[0] !== 'string') {
      return 'selector must be a string';
    }
    if (typeof args[1] !== 'string') {
      return 'withinSelector must be a string';
    }
    if (args.length >= 3 && args[2] != null && !(args[2] instanceof Element)) {
      return 'fromElement must be an Element';
    }
    return null;
  },
};

export const previousWithinExpression: ExpressionImplementation = {
  name: 'previousWithin',
  category: 'Reference',
  evaluatesTo: 'Element',
  operators: ['previous within'],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<HTMLElement | null> {
    const [selector, withinSelector, fromElement] = args;
    const startElement = (fromElement as HTMLElement | undefined) || context.me;

    if (!startElement || !(startElement instanceof Element)) {
      return null;
    }

    // Find the container element
    const container = startElement.closest(withinSelector as string);
    if (!container) {
      return null;
    }

    // Find previous element within the container
    return findPreviousElementWithinContainer(startElement, selector as string, container);
  },

  validate(args: any[]): string | null {
    const rangeError = validateArgRange(
      args,
      2,
      3,
      'previousWithin',
      'selector, withinSelector, optional fromElement'
    );
    if (rangeError) return rangeError;
    if (typeof args[0] !== 'string') {
      return 'selector must be a string';
    }
    if (typeof args[1] !== 'string') {
      return 'withinSelector must be a string';
    }
    if (args.length >= 3 && args[2] != null && !(args[2] instanceof Element)) {
      return 'fromElement must be an Element';
    }
    return null;
  },
};

function findNextElementWithinContainer(
  startElement: Element,
  selector: string,
  container: Element
): HTMLElement | null {
  // Get all matching elements within the container
  const matches = Array.from(container.querySelectorAll(selector));

  // Find the current element's position in document order
  const startPosition = getElementPosition(startElement);

  // Find the next element after the start position
  for (const element of matches) {
    const position = getElementPosition(element);
    if (position > startPosition) {
      return element as HTMLElement;
    }
  }

  return null;
}

function findPreviousElementWithinContainer(
  startElement: Element,
  selector: string,
  container: Element
): HTMLElement | null {
  // Get all matching elements within the container
  const matches = Array.from(container.querySelectorAll(selector));

  // Find the current element's position in document order
  const startPosition = getElementPosition(startElement);

  // Find the previous element before the start position (search in reverse)
  for (let i = matches.length - 1; i >= 0; i--) {
    const element = matches[i];
    const position = getElementPosition(element);
    if (position < startPosition) {
      return element as HTMLElement;
    }
  }

  return null;
}

function getElementPosition(element: Element): number {
  // Use compareDocumentPosition to determine order
  // This is a simplified approach; a more sophisticated implementation
  // would do a proper depth-first traversal count
  let position = 0;
  let current: Element | null = element;

  while (current && current.parentElement) {
    const siblings = Array.from(current.parentElement.children);
    position += siblings.indexOf(current);
    current = current.parentElement;
    position += 1000; // Weight for depth
  }

  return position;
}

// ============================================================================
// Export all positional expressions
// ============================================================================

export const positionalExpressions = {
  first: firstExpression,
  last: lastExpression,
  at: atExpression,
  next: nextExpression,
  previous: previousExpression,
  nextWithin: nextWithinExpression,
  previousWithin: previousWithinExpression,
} as const;

export type PositionalExpressionName = keyof typeof positionalExpressions;

// Export helper functions for testing
export {
  findNextElementInDOM,
  findPreviousElementInDOM,
  findNextElementWithinContainer,
  findPreviousElementWithinContainer,
  getElementPosition,
};

// Re-export enhanced implementations for tests
export {
  FirstExpression,
  LastExpression,
  createFirstExpression,
  createLastExpression,
} from './impl/index';
