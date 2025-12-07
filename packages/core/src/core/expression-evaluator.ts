/**
 * Expression Evaluator - Bridge between parser AST and expression system
 *
 * This class extends BaseExpressionEvaluator and eagerly imports all 6 expression
 * categories at construction time. For lazy loading, use LazyExpressionEvaluator.
 * For custom bundles with specific categories, use ConfigurableExpressionEvaluator.
 */

import { BaseExpressionEvaluator } from './base-expression-evaluator';
import { debug } from '../utils/debug';

// Import all expression categories
import { referencesExpressions } from '../expressions/references/index';
import { logicalExpressions } from '../expressions/logical/index';
import { conversionExpressions } from '../expressions/conversion/index';
import { positionalExpressions } from '../expressions/positional/index';
import { propertiesExpressions } from '../expressions/properties/index';
import { specialExpressions } from '../expressions/special/index';

export class ExpressionEvaluator extends BaseExpressionEvaluator {
  constructor() {
    super();
    this.registerExpressions();
  }

  /**
   * Register all expression implementations from different categories
   */
  private registerExpressions(): void {
    // Register reference expressions
    this.registerCategory(referencesExpressions);

    // Register logical expressions
    this.registerCategory(logicalExpressions);

    // Register conversion expressions
    this.registerCategory(conversionExpressions);

    // Register positional expressions
    this.registerCategory(positionalExpressions);

    // Register property expressions
    debug.expr('About to register properties expressions:', Object.keys(propertiesExpressions));
    this.registerCategory(propertiesExpressions);
    debug.expr('Total expressions registered:', this.expressionRegistry.size);
    debug.expr('Registry has "possessive":', this.expressionRegistry.has('possessive'));
    debug.expr('Registry has "my":', this.expressionRegistry.has('my'));

    // Register special expressions
    this.registerCategory(specialExpressions);
  }
}
