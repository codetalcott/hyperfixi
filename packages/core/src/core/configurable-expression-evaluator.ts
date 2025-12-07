/**
 * Configurable Expression Evaluator - For custom bundles with specific expression categories
 *
 * This class extends BaseExpressionEvaluator and accepts expression categories at construction time.
 * Unlike ExpressionEvaluator (which imports all categories) or LazyExpressionEvaluator (which lazy-loads),
 * this class only includes the categories you explicitly provide.
 *
 * This enables tree-shaking for custom bundles that only need specific expression categories,
 * reducing bundle size significantly for specialized use cases.
 *
 * Usage:
 * ```typescript
 * import { ConfigurableExpressionEvaluator } from './configurable-expression-evaluator';
 * import { referencesExpressions } from '../expressions/references';
 * import { logicalExpressions } from '../expressions/logical';
 *
 * const evaluator = new ConfigurableExpressionEvaluator([
 *   referencesExpressions,
 *   logicalExpressions,
 * ]);
 * ```
 */

import { BaseExpressionEvaluator } from './base-expression-evaluator';

/**
 * Configurable Expression Evaluator - Register only the expression categories you need
 */
export class ConfigurableExpressionEvaluator extends BaseExpressionEvaluator {
  /**
   * Create a configurable expression evaluator with specific categories
   * @param categories - Array of expression category objects to register
   */
  constructor(categories: Record<string, any>[]) {
    super();
    for (const category of categories) {
      this.registerCategory(category);
    }
  }
}
