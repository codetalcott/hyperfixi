/**
 * Expression System - Tree-Shakeable Exports
 *
 * This module provides tree-shakeable exports for the expression system.
 * Import only the categories you need for optimal bundle size.
 *
 * ## Tree-Shaking Usage
 *
 * ```typescript
 * import { createTreeShakeableRuntime } from '@hyperfixi/core/runtime';
 * import { references, logical } from '@hyperfixi/core/expressions';
 * import { toggle, add } from '@hyperfixi/core/commands';
 * import { ConfigurableExpressionEvaluator } from '@hyperfixi/core/expressions';
 *
 * const evaluator = new ConfigurableExpressionEvaluator([references, logical]);
 * const runtime = createTreeShakeableRuntime(
 *   [toggle(), add()],
 *   { expressionEvaluator: evaluator }
 * );
 * ```
 *
 * ## Available Categories
 *
 * - **references**: `me`, `you`, `it`, CSS selectors, traversal (closest, parent)
 * - **logical**: Comparisons, boolean logic, type checking
 * - **special**: Literals, arithmetic, function calls
 * - **conversion**: Type conversion (`as` keyword)
 * - **positional**: Array navigation (`first`, `last`, `at`)
 * - **properties**: Possessive syntax (`element's property`)
 *
 * ## Pre-configured Bundles
 *
 * For convenience, use pre-configured evaluator factories:
 *
 * - `createCoreExpressionEvaluator()`: references + logical + special (~4KB)
 * - `createCommonExpressionEvaluator()`: core + conversion + positional (~8KB)
 * - `createFullExpressionEvaluator()`: all 6 categories (~12KB)
 */

// =============================================================================
// TREE-SHAKEABLE CATEGORY EXPORTS (Recommended for custom bundles)
// =============================================================================

// Core categories (most commonly needed)
export { referencesExpressions as references } from './bundles/core-expressions';
export { logicalExpressions as logical } from './bundles/core-expressions';
export { specialExpressions as special } from './bundles/core-expressions';

// Extended categories
export { conversionExpressions as conversion } from './bundles/common-expressions';
export { positionalExpressions as positional } from './bundles/common-expressions';

// Advanced categories
export { propertiesExpressions as properties } from './bundles/full-expressions';

// =============================================================================
// PRE-CONFIGURED EVALUATOR FACTORIES
// =============================================================================

export {
  createCoreExpressionEvaluator,
  createCommonExpressionEvaluator,
  createFullExpressionEvaluator,
} from './bundles';

// =============================================================================
// CONFIGURABLE EVALUATOR (for custom category combinations)
// =============================================================================

export { ConfigurableExpressionEvaluator } from '../core/configurable-expression-evaluator';
export { BaseExpressionEvaluator } from '../core/base-expression-evaluator';

// =============================================================================
// FULL EXPRESSION REGISTRY (all 7 categories merged into one Map)
// =============================================================================
//
// Used by full bundles and tests that need every named expression available.
// Tree-shaking: this factory statically imports all categories, so any caller
// that uses it brings them all in. Size-sensitive bundles should construct
// their own registry with `createExpressionRegistry(...)` and the subset of
// category objects they need.

import { createExpressionRegistry } from '../core/expression-registry';
import { referencesExpressions } from './references/index';
import { logicalExpressions } from './logical/index';
import { conversionExpressions } from './conversion/index';
import { positionalExpressions } from './positional/index';
import { propertiesExpressions } from './properties/index';
import { specialExpressions } from './special/index';
import { mathematicalExpressions } from './mathematical/index';

/**
 * Build an ExpressionRegistry containing every named expression in all 7
 * categories. Convenience for full bundles, the standalone `evaluateExpressionFromSource`
 * entry, and tests; statically pulls all category modules.
 */
export function createFullExpressionRegistry() {
  return createExpressionRegistry(
    referencesExpressions,
    logicalExpressions,
    conversionExpressions,
    positionalExpressions,
    propertiesExpressions,
    specialExpressions,
    mathematicalExpressions
  );
}

export { createExpressionRegistry } from '../core/expression-registry';
export type { ExpressionRegistry } from '../core/expression-registry';

// =============================================================================
// BACKWARD-COMPATIBLE EXPORTS
// =============================================================================

// Re-export bundles index for existing imports
export * from './bundles';
