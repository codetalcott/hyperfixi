/**
 * PropertyTarget - Shared primitive for 'x of y' patterns
 * Used by: set, put, toggle commands
 *
 * Handles multiple AST node types:
 * - propertyOfExpression: "the X of Y" (core parser)
 * - propertyAccess: "#element's X" (semantic parser)
 */

import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveElement } from './element-resolution';
import { getElementProperty } from '../../expressions/property-access-utils';
import { setElementProperty } from './element-property-access';
import { getComputedStyleValue, setStyleValue } from './style-manipulation';

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

export interface PropertyAccessNode {
  type: 'propertyAccess';
  object: ASTNode;
  property: string;
}

// Pattern for "the X of Y" strings
const PATTERN = /^the\s+(.+?)\s+of\s+(.+)$/i;

// Boolean properties for toggle behavior
const BOOL_PROPS = new Set([
  'disabled',
  'checked',
  'hidden',
  'readOnly',
  'readonly',
  'required',
  'multiple',
  'selected',
  'autofocus',
  'autoplay',
  'controls',
  'loop',
  'muted',
  'open',
  'reversed',
  'async',
  'defer',
  'noValidate',
  'novalidate',
  'formNoValidate',
  'formnovalidate',
  'draggable',
  'spellcheck',
  'contentEditable',
]);

/** Check if node is a propertyOfExpression AST node (core parser: "the X of Y") */
export function isPropertyOfExpressionNode(node: unknown): node is PropertyOfExpressionNode {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  return n.type === 'propertyOfExpression' && typeof n.property === 'object' && n.property !== null;
}

/** Check if node is a propertyAccess AST node (semantic parser: "#element's X", expression parser: "obj.prop") */
export function isPropertyAccessNode(node: unknown): node is PropertyAccessNode {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  if (n.type !== 'propertyAccess') return false;
  // Accept both formats: string (semantic parser) or {name: string} (expression parser)
  return (
    typeof n.property === 'string' ||
    (typeof n.property === 'object' &&
      n.property !== null &&
      typeof (n.property as Record<string, unknown>).name === 'string')
  );
}

/** Check if value is a "the X of Y" string */
export function isPropertyTargetString(value: unknown): value is string {
  return typeof value === 'string' && PATTERN.test(value);
}

/** Resolve PropertyTarget from propertyOfExpression AST node (core parser) */
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

/** Resolve PropertyTarget from propertyAccess AST node (semantic parser or expression parser) */
export async function resolvePropertyTargetFromAccessNode(
  node: PropertyAccessNode,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<PropertyTarget | null> {
  // Extract property name from both formats: string or {name: string}
  const property =
    typeof node.property === 'string'
      ? node.property
      : (node.property as unknown as { name: string })?.name;
  if (!property) return null;

  let element = await evaluator.evaluate(node.object, context);
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

/**
 * Resolve PropertyTarget from any supported AST node type.
 * Unified function that handles all parser output formats.
 *
 * Supported node types:
 * - propertyOfExpression: "the X of Y" (core parser)
 * - propertyAccess: "#element's X" (semantic parser)
 * - possessiveExpression: "#element's *opacity" (possessive syntax)
 *
 * @param node - AST node to resolve
 * @param evaluator - Expression evaluator
 * @param context - Execution context
 * @returns PropertyTarget or null if not resolvable
 */
export async function resolveAnyPropertyTarget(
  node: ASTNode,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<PropertyTarget | null> {
  // Core parser: "the X of Y"
  if (isPropertyOfExpressionNode(node)) {
    return resolvePropertyTargetFromNode(node as PropertyOfExpressionNode, evaluator, context);
  }

  // Semantic parser: "#element's X"
  if (isPropertyAccessNode(node)) {
    return resolvePropertyTargetFromAccessNode(node as PropertyAccessNode, evaluator, context);
  }

  // Possessive/member expression: "#element's @disabled", "#element's *opacity"
  // The traditional parser creates possessiveExpression, the semantic/compile API creates memberExpression
  const anyNode = node as Record<string, unknown>;
  if (anyNode?.type === 'possessiveExpression' || anyNode?.type === 'memberExpression') {
    const objectNode = anyNode.object as ASTNode;
    const propertyNode = anyNode.property as Record<string, unknown>;
    let element = await evaluator.evaluate(objectNode, context);
    if (Array.isArray(element)) element = element[0];
    if (!isHTMLElement(element)) return null;

    // Extract property name - parser creates identifier nodes with @ or * prefix included
    // e.g., #el's @disabled → property: { type: 'identifier', name: '@disabled' }
    const propertyName = (propertyNode?.name || propertyNode?.value) as string;

    // Only treat as property target if name starts with @ or * (attribute/CSS property)
    // Regular member expressions like element.textContent should not be intercepted
    if (!propertyName || (!propertyName.startsWith('@') && !propertyName.startsWith('*')))
      return null;
    return { element: element as HTMLElement, property: propertyName };
  }

  return null;
}

/**
 * Read the value from a PropertyTarget
 *
 * Handles special prefixes:
 * - *property: reads computed CSS style (e.g., *opacity → getComputedStyle)
 * - @attribute: handled by getElementProperty
 * - Regular properties: handled by getElementProperty
 */
export function readPropertyTarget(target: PropertyTarget): unknown {
  const { element, property } = target;

  // CSS computed style (*opacity → getComputedStyle)
  if (property.startsWith('*')) {
    const styleProp = property.substring(1);
    return getComputedStyleValue(element, styleProp);
  }

  return getElementProperty(element, property);
}

/**
 * Write a value to a PropertyTarget
 *
 * Handles special prefixes:
 * - *property: sets inline CSS style (e.g., *opacity → style.setProperty)
 * - @attribute: handled by setElementProperty
 * - Regular properties: handled by setElementProperty
 */
export function writePropertyTarget(target: PropertyTarget, value: unknown): void {
  const { element, property } = target;

  // CSS style property (*opacity → inline style)
  if (property.startsWith('*')) {
    const styleProp = property.substring(1);
    setStyleValue(element, styleProp, String(value));
    return;
  }

  setElementProperty(element, property, value);
}

/** Toggle a property target (boolean: true↔false, numeric: n↔0, string: s↔'') */
export function togglePropertyTarget(target: PropertyTarget): unknown {
  const current = readPropertyTarget(target);
  const prop = target.property;

  // Strip @ prefix for boolean property check (e.g., @disabled → disabled)
  const propName = prop.startsWith('@') ? prop.substring(1) : prop;

  // Boolean
  if (
    typeof current === 'boolean' ||
    BOOL_PROPS.has(propName) ||
    BOOL_PROPS.has(propName.toLowerCase())
  ) {
    const val = !current;
    writePropertyTarget(target, val);
    return val;
  }

  // Numeric
  if (typeof current === 'number') {
    const val = current === 0 ? 1 : 0;
    writePropertyTarget(target, val);
    return val;
  }

  // String: toggle to empty, restore on re-toggle
  if (typeof current === 'string') {
    const key = `__ht_${prop}`;
    const stored = (target.element as any)[key];
    if (current === '' && stored !== undefined) {
      writePropertyTarget(target, stored);
      return stored;
    }
    (target.element as any)[key] = current;
    writePropertyTarget(target, '');
    return '';
  }

  // Fallback
  const val = !current;
  writePropertyTarget(target, val);
  return val;
}
