/**
 * Expression Bundle Index
 *
 * Pre-configured expression evaluator factories for different bundle tiers.
 *
 * Tiers:
 * - core: ~4,000 lines (references + logical + special)
 * - common: ~8,000 lines (core + conversion + positional)
 * - full: ~11,885 lines (all 6 categories)
 *
 * @example
 * ```typescript
 * // For minimal bundles
 * import { createCoreExpressionEvaluator } from './expressions/bundles';
 *
 * // For standard bundles
 * import { createCommonExpressionEvaluator } from './expressions/bundles';
 *
 * // For full bundles
 * import { createFullExpressionEvaluator } from './expressions/bundles';
 * ```
 */

export { createCoreExpressionEvaluator } from './core-expressions';
export { createCommonExpressionEvaluator } from './common-expressions';
export { createFullExpressionEvaluator } from './full-expressions';

// Re-export individual categories for custom bundles
export { referencesExpressions, logicalExpressions, specialExpressions } from './core-expressions';

export { conversionExpressions, positionalExpressions } from './common-expressions';

export { propertiesExpressions } from './full-expressions';
