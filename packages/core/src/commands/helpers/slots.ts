/**
 * Slot helpers for `parseInput` bodies (Arc 3 step 2).
 */
import type { ExecutionContext, ExpressionNode } from '../../types/core';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * A slot the command's syntax makes mandatory: its parser always emits it,
 * so its absence is a hand-built or foreign node, and the error names the
 * slot rather than surfacing as an evaluation of `undefined`.
 */
export function requireSlot(node: ExpressionNode | undefined, what: string): ExpressionNode {
  if (!node) throw new Error(`${what} is required`);
  return node;
}

/** Evaluate a mandatory slot: {@link requireSlot}, then the evaluator. */
export function evaluateSlot(
  evaluator: ExpressionEvaluator,
  context: ExecutionContext,
  node: ExpressionNode | undefined,
  what: string
): Promise<unknown> {
  return evaluator.evaluate(requireSlot(node, what), context);
}
