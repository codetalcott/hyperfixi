/**
 * Common Expression Bundle - Standard expressions for common tier
 *
 * This bundle includes expression categories needed for typical hyperscript
 * applications, extending the core bundle with:
 * - conversion: as keyword, type conversion
 * - positional: first, last, array navigation
 *
 * Still excludes:
 * - properties: possessive syntax like "element's property" (use full bundle)
 *
 * Expected bundle contribution: ~8,000 lines vs ~11,885 lines (full)
 * Reduction: ~33% smaller than full expression system
 *
 * @example
 * ```typescript
 * import { createCommonExpressionEvaluator } from './expressions/bundles/common-expressions';
 * import { createTreeShakeableRuntime } from './runtime/runtime-factory';
 *
 * const runtime = createTreeShakeableRuntime(commands, {
 *   expressionEvaluator: createCommonExpressionEvaluator(),
 * });
 * ```
 */

import { ConfigurableExpressionEvaluator } from '../../core/configurable-expression-evaluator';
import { referencesExpressions } from '../references/index';
import { logicalExpressions } from '../logical/index';
import { specialExpressions } from '../special/index';
import { conversionExpressions } from '../conversion/index';
import { positionalExpressions } from '../positional/index';

/**
 * Create an expression evaluator with common expression categories.
 *
 * Includes: references, logical, special, conversion, positional
 * Excludes: properties (possessive syntax)
 *
 * @returns ConfigurableExpressionEvaluator with common expression categories
 */
export function createCommonExpressionEvaluator(): ConfigurableExpressionEvaluator {
  return new ConfigurableExpressionEvaluator([
    referencesExpressions,
    logicalExpressions,
    specialExpressions,
    conversionExpressions,
    positionalExpressions,
  ]);
}

// Export individual categories for custom bundles
export {
  referencesExpressions,
  logicalExpressions,
  specialExpressions,
  conversionExpressions,
  positionalExpressions,
};
