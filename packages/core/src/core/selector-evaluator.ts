/**
 * Selector evaluation functions extracted from BaseExpressionEvaluator.
 * Pure DOM operations — no recursive evaluation callbacks needed.
 */

import type { ExecutionContext } from '../types/core';

/**
 * Get document reference from context (SSR-safe)
 */
function getDoc(context: ExecutionContext): Document | null {
  return (context.me as any)?.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
}

/**
 * Evaluate hyperscript selector nodes (<tag/>)
 */
export function evaluateSelector(
  node: { value: string },
  context: ExecutionContext
): HTMLElement[] {
  let selector = node.value;

  if (selector.startsWith('<') && selector.endsWith('/>')) {
    selector = selector.slice(1, -2).trim();
  }

  const doc = getDoc(context);
  if (!doc) {
    return [];
  }

  const elements = doc.querySelectorAll(selector);
  const isEl = (el: any): el is HTMLElement =>
    el && typeof el === 'object' && el.nodeType === 1 && typeof el.tagName === 'string';
  return Array.from(elements).filter(isEl);
}

/**
 * Evaluate CSS selector nodes produced by the parser
 * (`{ selectorType, selector }` shape, e.g. `#id`, `.cls`, `<tag/>`).
 */
export function evaluateCSSSelector(
  node: { selectorType: string; selector: string },
  context: ExecutionContext
): HTMLElement | HTMLElement[] | null {
  let selector = node.selector;

  if (selector.startsWith('<') && selector.endsWith('/>')) {
    selector = selector.slice(1, -2).trim();
  }

  const doc = getDoc(context);
  if (!doc) {
    return node.selectorType === 'id' ? null : [];
  }

  if (node.selectorType === 'id') {
    const id = selector.startsWith('#') ? selector.slice(1) : selector;
    return doc.getElementById(id);
  } else if (node.selectorType === 'class') {
    const escapedSelector = selector.replace(/:/g, '\\:');
    const elements = doc.querySelectorAll(escapedSelector);
    return Array.from(elements).filter((el): el is HTMLElement => el instanceof HTMLElement);
  }

  const elements = doc.querySelectorAll(selector);
  return Array.from(elements).filter((el): el is HTMLElement => el instanceof HTMLElement);
}

/**
 * Evaluate ID selector expressions (#id)
 */
export function evaluateIdSelector(
  node: { value: string },
  context: ExecutionContext
): Element | null {
  const doc = getDoc(context);
  if (!doc) {
    return null;
  }
  const id = node.value.startsWith('#') ? node.value.slice(1) : node.value;
  return doc.getElementById(id);
}

/**
 * Evaluate query reference expressions (<selector/>)
 */
export function evaluateQueryReference(
  node: { selector: string },
  context: ExecutionContext
): NodeList {
  let selector = node.selector;

  if (selector.startsWith('<') && selector.endsWith('/>')) {
    selector = selector.slice(1, -2).trim();
  }

  const doc = getDoc(context);
  if (!doc) {
    return [] as unknown as NodeList;
  }

  try {
    return doc.querySelectorAll(selector);
  } catch {
    return doc.createDocumentFragment().childNodes;
  }
}
