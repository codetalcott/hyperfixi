/**
 * PropertyTarget - Shared primitive for 'x of y' patterns
 * Used by: set, put, toggle commands
 */

import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveElement } from './element-resolution';
import { getElementProperty, setElementProperty } from './element-property-access';

// Types
export interface PropertyTarget {
  element: HTMLElement;
  property: string;
}

export interface PropertyOfExpressionNode {
  type: 'propertyOfExpression';
  property: { type: 'identifier'; name: string };
  target: ASTNode;
}

// Pattern for "the X of Y" strings
const PATTERN = /^the\s+(.+?)\s+of\s+(.+)$/i;

// Boolean properties for toggle behavior
const BOOL_PROPS = new Set([
  'disabled', 'checked', 'hidden', 'readOnly', 'readonly', 'required',
  'multiple', 'selected', 'autofocus', 'autoplay', 'controls', 'loop',
  'muted', 'open', 'reversed', 'async', 'defer', 'noValidate', 'novalidate',
  'formNoValidate', 'formnovalidate', 'draggable', 'spellcheck', 'contentEditable',
]);

/** Check if node is a propertyOfExpression AST node */
export function isPropertyOfExpressionNode(node: unknown): node is PropertyOfExpressionNode {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  return n.type === 'propertyOfExpression' && typeof n.property === 'object' && n.property !== null;
}

/** Check if value is a "the X of Y" string */
export function isPropertyTargetString(value: unknown): value is string {
  return typeof value === 'string' && PATTERN.test(value);
}

/** Resolve PropertyTarget from AST node */
export async function resolvePropertyTargetFromNode(
  node: PropertyOfExpressionNode,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<PropertyTarget | null> {
  const property = node.property?.name;
  if (!property) return null;

  let element = await evaluator.evaluate(node.target, context);
  if (Array.isArray(element)) element = element[0];
  if (!isHTMLElement(element)) return null;

  return { element: element as HTMLElement, property };
}

/** Resolve PropertyTarget from "the X of Y" string */
export function resolvePropertyTargetFromString(
  value: string,
  context: ExecutionContext
): PropertyTarget | null {
  const match = value.match(PATTERN);
  if (!match) return null;

  try {
    const element = resolveElement(match[2].trim(), context);
    return { element, property: match[1].trim() };
  } catch {
    return null;
  }
}

/** Toggle a property target (boolean: true↔false, numeric: n↔0, string: s↔'') */
export function togglePropertyTarget(target: PropertyTarget): unknown {
  const current = getElementProperty(target.element, target.property);
  const prop = target.property;

  // Boolean
  if (typeof current === 'boolean' || BOOL_PROPS.has(prop) || BOOL_PROPS.has(prop.toLowerCase())) {
    const val = !current;
    setElementProperty(target.element, prop, val);
    return val;
  }

  // Numeric
  if (typeof current === 'number') {
    const val = current === 0 ? 1 : 0;
    setElementProperty(target.element, prop, val);
    return val;
  }

  // String: toggle to empty, restore on re-toggle
  if (typeof current === 'string') {
    const key = `__ht_${prop}`;
    const stored = (target.element as any)[key];
    if (current === '' && stored !== undefined) {
      setElementProperty(target.element, prop, stored);
      return stored;
    }
    (target.element as any)[key] = current;
    setElementProperty(target.element, prop, '');
    return '';
  }

  // Fallback
  const val = !current;
  setElementProperty(target.element, prop, val);
  return val;
}
