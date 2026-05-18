/**
 * Expression Bundle Index
 *
 * Pre-configured ExpressionRegistry factories for different bundle tiers.
 *
 * Tiers:
 * - core: references + logical + special
 * - common: core + conversion + positional
 * - full: all 6 categories (+ mathematical via createFullExpressionRegistry
 *   in expressions/index.ts)
 *
 * @example
 * ```typescript
 * // For minimal bundles
 * import { createCoreRegistry } from './expressions/bundles';
 *
 * // For standard bundles
 * import { createCommonRegistry } from './expressions/bundles';
 *
 * // For full bundles (6 categories)
 * import { createFullRegistry } from './expressions/bundles';
 *
 * // For the kitchen-sink (7 categories including mathematical)
 * import { createFullExpressionRegistry } from '../index';
 * ```
 */

export { createCoreRegistry } from './core-expressions';
export { createCommonRegistry } from './common-expressions';
export { createFullRegistry } from './full-expressions';

// Re-export individual categories for custom bundles
export { referencesExpressions, logicalExpressions, specialExpressions } from './core-expressions';

export { conversionExpressions, positionalExpressions } from './common-expressions';

export { propertiesExpressions } from './full-expressions';
