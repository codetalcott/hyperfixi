/**
 * Core Expression Bundle - Minimal expressions for core tier
 *
 * This bundle includes only the essential expression categories needed
 * for basic hyperscript operations:
 * - references: CSS selectors, me, you, it, etc.
 * - logical: comparisons, boolean operators
 * - special: literals, basic math operations
 *
 * Excludes:
 * - conversion: as keyword, type conversion (optional)
 * - positional: first, last, array navigation (optional)
 * - properties: possessive syntax like "element's property" (optional)
 *
 * Expected bundle contribution: ~4,000 lines vs ~11,885 lines (full)
 * Reduction: ~66% smaller expression system
 *
 * @example
 * ```typescript
 * import { createCoreExpressionEvaluator } from './expressions/bundles/core-expressions';
 * import { createTreeShakeableRuntime } from './runtime/runtime-factory';
 *
 * const runtime = createTreeShakeableRuntime(commands, {
 *   expressionEvaluator: createCoreExpressionEvaluator(),
 * });
 * ```
 */

import { createExpressionRegistry } from '../../core/expression-registry';
import type { ExpressionRegistry } from '../../core/expression-registry';
import { referencesExpressions } from '../references/index';
import { logicalExpressions } from '../logical/index';
import { specialExpressions } from '../special/index';

/**
 * Build an ExpressionRegistry with the core expression categories
 * (references, logical, special). Tree-shaking keeps only these three
 * categories' modules in the dist.
 */
export function createCoreRegistry(): ExpressionRegistry {
  return createExpressionRegistry(referencesExpressions, logicalExpressions, specialExpressions);
}

// Export individual categories for custom bundles
export { referencesExpressions, logicalExpressions, specialExpressions };
