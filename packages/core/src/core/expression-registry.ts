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
 * Minimum shape the factory needs from any item being registered: a callable
 * `evaluate`. Two implementation shapes flow through here — plain
 * `ExpressionImplementation` objects (variadic `(context, ...args)`) and
 * `BaseExpressionImpl` subclasses (typed `(input)`) — and their `evaluate`
 * signatures are variance-incompatible. Documenting the minimum shape via
 * an explicit interface is stricter than `any` while staying permissive
 * enough that both forms type-check at the call site.
 */
interface ExpressionLike {
  // `any[]` is required: both call signatures end up here and they disagree
  // on parameter shapes. Without `any` the variance check rejects one of them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluate: (...args: any[]) => any;
}

/**
 * Build the registry from one or more category objects. The cast on
 * `map.set` remains because `ExpressionImplementation` has fields beyond
 * `evaluate` (`name`, `category`, etc.) that not every input is guaranteed
 * to satisfy at the type level. Downstream consumers (`parser/runtime.ts`)
 * only call `evaluate`, so the runtime invariant holds regardless.
 */
export function createExpressionRegistry(
  ...categories: ReadonlyArray<Readonly<Record<string, ExpressionLike>>>
): ExpressionRegistry {
  const map = new Map<string, ExpressionImplementation>();
  for (const category of categories) {
    for (const [name, impl] of Object.entries(category)) {
      map.set(name, impl as unknown as ExpressionImplementation);
    }
  }
  return map;
}
