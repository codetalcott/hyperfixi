/**
 * The one crossing between the union and the legacy public types
 *
 * `types/base-types.ts` declares `ExpressionNode` as the SINGLE kind
 * `type: 'expression'`, and `types/core.CommandNode.args` is typed with it —
 * yet what commands' args actually hold is identifiers, literals, selectors:
 * the {@link Expr} union. Nothing that flows through these positions has ever
 * had `type: 'expression'`. Both types are published from `index.ts`, and 70
 * files import them, so redefining them to the union is a major-version change
 * twice over: reads like `.operands` would degrade to `unknown`, and a
 * consumer narrowing on `type === 'expression'` would lose its assumption.
 * The owner's call (2026-09-01): fix the USAGES now, the public type at 4.0.
 *
 * Until then, every internal site that builds a real expression needs to cross
 * from the union to the lying type exactly once — and before this module, that
 * crossing was 21 separate `as unknown as ExpressionNode` casts at the
 * construction sites themselves, where the cast silenced EVERYTHING: a typo'd
 * kind, a wrong field, a missing one. (`semantic-integration.ts` also emitted
 * `type: 'cssProperty'` for years without the kind existing in any type — the
 * cast is why nothing noticed.)
 *
 * These helpers move the lie to the boundary and keep construction honest: a
 * value must BE an {@link Expr} before it can cross. They are `unknown`-free at
 * runtime — reference casts, no copying — so adopting them cannot move the
 * AST-equivalence corpus.
 *
 * When 4.0 redefines the public types, `git grep toLegacyExpression` is the
 * complete list of crossings to delete.
 */

import type { ExpressionNode } from '../types/base-types';
import type { Expr } from './nodes';

/** Cross ONE typed expression into a legacy `ExpressionNode` position. */
export function toLegacyExpression(node: Expr): ExpressionNode {
  return node as unknown as ExpressionNode;
}

/** Cross a whole args array. The same reference — no copy, no runtime effect. */
export function toLegacyExpressions(nodes: Expr[]): ExpressionNode[] {
  return nodes as unknown as ExpressionNode[];
}

/** Cross a modifiers map. The same reference — no copy, no runtime effect. */
export function toLegacyExpressionMap(
  modifiers: Record<string, Expr>
): Record<string, ExpressionNode> {
  return modifiers as unknown as Record<string, ExpressionNode>;
}
