/**
 * Attribute Write Target Resolution
 *
 * Shared primitive for recognizing `@attr`-shaped WRITE targets and resolving
 * the element(s) they apply to. Extracted from SetCommand so append/prepend
 * share the exact same recognition rules.
 *
 * Covers:
 * - `@attr` / `[@attr]`      — standalone attributeAccess; applies to the
 *                              caller-supplied fallback scope (set: the `on`
 *                              modifier; append/prepend: `me`)
 * - `@attr of X`             — binary `of` with an attributeAccess LHS
 * - `X[@attr]`               — computed member whose property is attributeAccess
 *
 * Returns null for non-attribute targets so callers fall through to their
 * property/member/variable paths.
 *
 * IMPORTANT: this runs on the RAW AST node, before evaluation. Evaluating an
 * attributeAccess node yields the attribute's *current value*, so a write keyed
 * on that value would silently target the wrong thing (the defect this helper
 * exists to prevent).
 */

import type { ExecutionContext } from '../../types/core';
import type { ASTNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';

export interface AttributeWriteTarget {
  elements: HTMLElement[];
  name: string;
}

/** Evaluate an AST node to a single HTMLElement (unwrapping selector arrays). */
async function evaluateToElement(
  node: ASTNode,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
): Promise<HTMLElement | null> {
  const value = await evaluator.evaluate(node, context);
  const el = Array.isArray(value) ? value[0] : value;
  return isHTMLElement(el) ? (el as HTMLElement) : null;
}

/**
 * Recognize an attribute write target and resolve its element(s).
 *
 * @param node - The raw target AST node (NOT evaluated)
 * @param evaluator - Expression evaluator (used only for the `of` / member object side)
 * @param context - Execution context
 * @param getFallbackElements - Scope resolver for a standalone `@attr`. SetCommand
 *   passes its `on`-modifier resolver; append/prepend pass `me`.
 * @returns The attribute name plus target elements, or null if not an attribute shape
 */
export async function resolveAttributeWriteTarget(
  node: ASTNode | Record<string, unknown> | undefined,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext,
  getFallbackElements: () => Promise<HTMLElement[]>
): Promise<AttributeWriteTarget | null> {
  const n = node as Record<string, any> | undefined;

  // Standalone `@attr` / `[@attr]` — applies to the caller's fallback scope,
  // which may match many elements (e.g. `set @aria-selected to "false" on .tab`).
  if (n?.type === 'attributeAccess') {
    const elements = await getFallbackElements();
    return { elements, name: n.attributeName as string };
  }

  // `@attr of X` / `[@attr] of X` — binary `of` with an attributeAccess LHS.
  if (n?.type === 'binaryExpression' && n.operator === 'of' && n.left?.type === 'attributeAccess') {
    const element = await evaluateToElement(n.right as ASTNode, evaluator, context);
    if (element) return { elements: [element], name: n.left.attributeName as string };
  }

  // `X[@attr]` — computed member access whose property is an attributeAccess.
  if (n?.type === 'memberExpression' && n.property?.type === 'attributeAccess') {
    const element = await evaluateToElement(n.object as ASTNode, evaluator, context);
    if (element) return { elements: [element], name: n.property.attributeName as string };
  }

  return null;
}
