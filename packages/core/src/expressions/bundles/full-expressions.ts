/**
 * Full Expression Bundle - All expression categories
 *
 * This bundle includes all 6 expression categories for full hyperscript
 * compatibility. Use this when you need complete expression support.
 *
 * Includes:
 * - references: CSS selectors, me, you, it, etc.
 * - logical: comparisons, boolean operators
 * - special: literals, basic math operations
 * - conversion: as keyword, type conversion
 * - positional: first, last, array navigation
 * - properties: possessive syntax like "element's property"
 *
 * Expected bundle contribution: ~11,885 lines
 *
 * @example
 * ```typescript
 * import { createFullExpressionEvaluator } from './expressions/bundles/full-expressions';
 * import { createTreeShakeableRuntime } from './runtime/runtime-factory';
 *
 * const runtime = createTreeShakeableRuntime(commands, {
 *   expressionEvaluator: createFullExpressionEvaluator(),
 * });
 * ```
 */

import { ConfigurableExpressionEvaluator } from '../../core/configurable-expression-evaluator';
import { referencesExpressions } from '../references/index';
import { logicalExpressions } from '../logical/index';
import { specialExpressions } from '../special/index';
import { conversionExpressions } from '../conversion/index';
import { positionalExpressions } from '../positional/index';
import { propertiesExpressions } from '../properties/index';

/**
 * Create an expression evaluator with all expression categories.
 *
 * @returns ConfigurableExpressionEvaluator with all 6 expression categories
 */
export function createFullExpressionEvaluator(): ConfigurableExpressionEvaluator {
  return new ConfigurableExpressionEvaluator([
    referencesExpressions,
    logicalExpressions,
    specialExpressions,
    conversionExpressions,
    positionalExpressions,
    propertiesExpressions,
  ]);
}

// Export individual categories for custom bundles
export {
  referencesExpressions,
  logicalExpressions,
  specialExpressions,
  conversionExpressions,
  positionalExpressions,
  propertiesExpressions,
};
