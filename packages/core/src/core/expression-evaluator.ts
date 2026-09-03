/**
 * ExpressionEvaluator — interface shim retained for backward compatibility.
 *
 * The class hierarchy (BaseExpressionEvaluator + subclasses) was deleted in
 * Phase 4 of the evaluator consolidation arc; expression dispatch now goes
 * through `parser/runtime.ts:evaluateAST` with a bundle-supplied
 * `ExpressionRegistry` on the `ExecutionContext`. This interface is what
 * V2 commands receive in their `parseInput(raw, evaluator, context)` signature.
 *
 * Command-adapter passes an object that wraps `evaluateAST`; tests can supply
 * any shape with the same `evaluate` method.
 */

import type { AnyNode } from '../ast/legacy';
import type { ExecutionContext } from '../types/core';

export interface ExpressionEvaluator {
  // Loose return type matches the deleted class's behavior; many call sites
  // assign directly to typed slots without explicit narrowing.
  //
  // The parameter is {@link AnyNode} (Arc 2 step 6): callers hand it both
  // legacy `ASTNode`s from the front end and union members from the typed AST.
  // Declared as a METHOD on purpose — method parameters are checked
  // bivariantly, so every existing implementer written as
  // `evaluate(node: ASTNode, …)` stays assignable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluate(node: AnyNode, context: ExecutionContext): Promise<any>;
}
