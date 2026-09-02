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
 * complete list of crossings to delete — plus `fromLegacyCommands` below, the
 * same lie read in the other direction.
 */

import type { ASTNode, ExpressionNode } from '../types/base-types';
import type { CommandNode as LegacyCommandNode } from '../types/core';
import type { Expr, Stmt } from './nodes';

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

// ---------------------------------------------------------------------------
// The reverse direction — legacy statements INTO the union (Arc 2 step 4)
// ---------------------------------------------------------------------------

/**
 * `parser.ts` still builds command lists as `types/core.CommandNode[]` — the
 * frozen public shape whose `args` is typed with the lying `ExpressionNode`.
 * The union's `EventHandlerNode.commands`, `DefNode.body`, the catch/finally
 * lists and `InitBlockNode.commands` are `Stmt[]`. Same nodes, same fields at
 * runtime; only the declared arg type differs, and that is exactly the lie
 * this module exists to hold in one place. Reference cast, no copy, so
 * adopting it cannot move the AST-equivalence corpus.
 *
 * Measured before adding this (probe E, 2026-09-01): retyping the parser's own
 * `parseCommandBlock` to return union `CommandNode[]` is not a types-only
 * change — its expression entry points legitimately return commands and
 * handlers in some branches (`parseExpression` → `CommandNode` at two sites,
 * `EventHandlerNode` at one), so the front end's `ASTNode` return types are
 * honest and narrowing them raised the error count 24 → 43. The crossing is
 * the truthful boundary until the front end is restructured (Arc 3).
 *
 * Accepts `ASTNode[]` as well as `CommandNode[]` because the parser's block
 * helpers disagree about which they return (`parseCommandBlock` says
 * `CommandNode[]`, `parseCommandListUntilTerminator` says `ASTNode[]`) — the
 * same nodes under two declared types, which is the whole point of this file.
 */
export function fromLegacyCommands(nodes: ReadonlyArray<LegacyCommandNode | ASTNode>): Stmt[] {
  return nodes as unknown as Stmt[];
}

/**
 * The expression twin of {@link fromLegacyCommands}. `parseExpression` returns
 * `ASTNode` — honestly, because in some branches it returns a command or a
 * handler (probe E) — yet an event handler's `condition` and `watchTarget` are
 * always expressions at runtime (measured: `binaryExpression` / `identifier`,
 * and `selector`). Cross once, here, instead of widening the union's fields
 * back to `unknown`.
 */
export function fromLegacyExpression(node: ASTNode): Expr {
  return node as unknown as Expr;
}

/**
 * The hybrid parser is a SEPARATE producer with its own 16-kind vocabulary
 * (`parser/hybrid/ast-types.ts`); Arc 5 decides its fate. Its `event` node's
 * `body` holds hybrid command nodes, and `runtime-base.ts` adapts that node
 * into a union `EventHandlerNode` before executing it. This is that
 * adapter's one crossing. Structural parameter on purpose: importing the
 * hybrid types here would be an upward layer edge (`ast` is layer 1, `parser`
 * layer 2), and the runtime executes these nodes by their `type` string
 * anyway.
 */
export function fromHybridStatements(body: ReadonlyArray<{ readonly type: string }>): Stmt[] {
  return body as unknown as Stmt[];
}
