/**
 * Expression Registry — name-to-implementation lookup for evaluator dispatch.
 *
 * Replaces the BaseExpressionEvaluator class hierarchy's internal Map. The
 * registry is constructed by the bundle entry from whichever expression
 * categories it includes, then threaded through `ExecutionContext.registry`
 * so `parser/runtime.ts:evaluateAST` can dispatch named-expression operators
 * (e.g. `ends with`, `is in`) without statically importing every category.
 *
 * Tree-shaking is preserved because `evaluateAST` reads via `context.registry`
 * rather than from static `logicalExpressions.endsWith` imports — modules
 * not referenced by any bundle entry are eliminated by rollup as usual.
 */

import type { ExpressionImplementation } from '../types/core';

/**
 * Read-only lookup from expression name (e.g. `endsWith`, `me`, `as`) to its
 * implementation. The runtime never mutates the registry; if more expressions
 * need to be registered, construct a new one via {@link createExpressionRegistry}.
 */
export type ExpressionRegistry = ReadonlyMap<string, ExpressionImplementation>;

/**
 * Build an ExpressionRegistry from one or more category objects.
 *
 * Each category is the `Record<string, ExpressionImplementation>` shape that
 * `expressions/*\/index.ts` modules export (e.g. `logicalExpressions`,
 * `referencesExpressions`). Last-write-wins on name collisions.
 *
 * @example
 * ```ts
 * import { createExpressionRegistry } from '@hyperfixi/core';
 * import {
 *   referencesExpressions,
 *   logicalExpressions,
 *   specialExpressions,
 * } from '@hyperfixi/core/expressions';
 *
 * const minimalRegistry = createExpressionRegistry(
 *   referencesExpressions,
 *   logicalExpressions,
 *   specialExpressions,
 * );
 * ```
 */
/**
 * Build the registry from one or more category objects. Parameter type uses
 * `Record<string, unknown>` because individual expression implementations
 * have stricter input/output shapes than `ExpressionImplementation`'s
 * `(context, ...args: unknown[])` signature — covariance bites if we try to
 * require the strict shape. The cast on `map.set` is safe because every
 * category module ships interchangeable `evaluate` implementations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createExpressionRegistry(
  ...categories: ReadonlyArray<Readonly<Record<string, any>>>
): ExpressionRegistry {
  const map = new Map<string, ExpressionImplementation>();
  for (const category of categories) {
    for (const [name, impl] of Object.entries(category)) {
      map.set(name, impl as ExpressionImplementation);
    }
  }
  return map;
}
