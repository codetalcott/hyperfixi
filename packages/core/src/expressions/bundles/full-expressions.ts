/**
 * Full Expression Bundle - All expression categories
 *
 * Builds an ExpressionRegistry containing all 6 standard expression categories
 * for full hyperscript compatibility. Use this when you need complete
 * expression support; for size-sensitive bundles use `createCoreRegistry()` or
 * `createCommonRegistry()` instead.
 *
 * Includes:
 * - references: CSS selectors, me, you, it, etc.
 * - logical: comparisons, boolean operators
 * - special: literals, basic math operations
 * - conversion: as keyword, type conversion
 * - positional: first, last, array navigation
 * - properties: possessive syntax like "element's property"
 *
 * @example
 * ```typescript
 * import { createFullRegistry } from './expressions/bundles/full-expressions';
 * import { createTreeShakeableRuntime } from './runtime/runtime-factory';
 *
 * const runtime = createTreeShakeableRuntime(commands, {
 *   expressionRegistry: createFullRegistry(),
 * });
 * ```
 */

import { createExpressionRegistry } from '../../core/expression-registry';
import type { ExpressionRegistry } from '../../core/expression-registry';
import { referencesExpressions } from '../references/index';
import { logicalExpressions } from '../logical/index';
import { specialExpressions } from '../special/index';
import { conversionExpressions } from '../conversion/index';
import { positionalExpressions } from '../positional/index';
import { propertiesExpressions } from '../properties/index';

/**
 * Build an ExpressionRegistry with all 6 standard expression categories.
 * Note: this does not include `mathematical` (which has its own bundle
 * cost); for the kitchen-sink including math, use
 * `createFullExpressionRegistry` from `expressions/index.ts`.
 */
export function createFullRegistry(): ExpressionRegistry {
  return createExpressionRegistry(
    referencesExpressions,
    logicalExpressions,
    specialExpressions,
    conversionExpressions,
    positionalExpressions,
    propertiesExpressions
  );
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
