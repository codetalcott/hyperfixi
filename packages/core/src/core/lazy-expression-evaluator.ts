/**
 * Lazy Expression Evaluator - On-demand loading of expression categories
 *
 * Phase 2 optimization: Dynamically load expression categories only when needed.
 * Extends BaseExpressionEvaluator to share evaluation logic while adding lazy loading.
 *
 * This enables minimal bundles to start with just core expressions (~40KB)
 * and lazy-load additional categories on first use.
 *
 * Performance:
 * - Core expressions: Pre-loaded (0ms)
 * - Common expressions: On-demand (~2-3ms first time)
 * - Optional expressions: On-demand (~2-3ms first time)
 */

import type { ASTNode, ExecutionContext } from '../types/core';
import {
  EXPRESSION_TIERS,
  type ExpressionCategory,
  type ExpressionTier,
} from '../expressions/expression-tiers';
import { BaseExpressionEvaluator } from './base-expression-evaluator';
import { debug } from '../utils/debug';

/**
 * Options for lazy expression evaluator
 */
export interface LazyExpressionEvaluatorOptions {
  /**
   * Preloading strategy:
   * - 'core': Load only essential expressions (default)
   * - 'common': Load core + common expressions
   * - 'all': Eager load all expressions (legacy behavior)
   * - 'none': Don't preload anything (maximum lazy loading)
   */
  preload?: 'core' | 'common' | 'all' | 'none';

  /**
   * Specific categories to preload (optional)
   * Overrides tier-based preloading if specified
   */
  categories?: ExpressionCategory[];
}

/**
 * Lazy Expression Evaluator - Loads expression categories on demand
 *
 * Extends BaseExpressionEvaluator and adds lazy loading capability.
 * The evaluate() method automatically loads required categories before evaluation.
 */
export class LazyExpressionEvaluator extends BaseExpressionEvaluator {
  private loadedCategories = new Set<string>();
  private loadPromises = new Map<string, Promise<void>>();
  private options: LazyExpressionEvaluatorOptions;

  constructor(options: LazyExpressionEvaluatorOptions = {}) {
    super();
    this.options = {
      preload: 'core',
      ...options,
    };

    // Preload based on strategy
    if (this.options.preload !== 'none') {
      void this.preloadExpressions();
    }
  }

  /**
   * Preload expressions based on configured strategy
   */
  private async preloadExpressions(): Promise<void> {
    if (this.options.categories) {
      // Explicit category list
      await Promise.all(this.options.categories.map(cat => this.loadCategory(cat)));
      return;
    }

    // Tier-based preloading
    switch (this.options.preload) {
      case 'all':
        await this.preloadTier('core');
        await this.preloadTier('common');
        await this.preloadTier('optional');
        break;

      case 'common':
        await this.preloadTier('core');
        await this.preloadTier('common');
        break;

      case 'core':
        await this.preloadTier('core');
        break;

      case 'none':
        // Don't preload anything
        break;
    }
  }

  /**
   * Preload an expression tier
   */
  private async preloadTier(tier: ExpressionTier): Promise<void> {
    const categories = EXPRESSION_TIERS[tier];
    await Promise.all(categories.map(cat => this.loadCategory(cat)));
  }

  /**
   * Load an expression category dynamically
   */
  private async loadCategory(category: string): Promise<void> {
    // Return early if already loaded
    if (this.loadedCategories.has(category)) {
      return;
    }

    // Return existing load promise if in progress
    if (this.loadPromises.has(category)) {
      return this.loadPromises.get(category)!;
    }

    // Start loading
    const loadPromise = this._loadCategoryImpl(category);
    this.loadPromises.set(category, loadPromise);

    try {
      await loadPromise;
      this.loadedCategories.add(category);
      debug.expressions(`✅ Loaded expression category: ${category}`);
    } finally {
      this.loadPromises.delete(category);
    }
  }

  /**
   * Implementation of category loading with dynamic imports
   */
  private async _loadCategoryImpl(category: string): Promise<void> {
    try {
      debug.expressions(`📦 Loading expression category: ${category}`);

      // Dynamic import based on category name
      let module: any;
      switch (category) {
        case 'references':
          module = await import('../expressions/references/index');
          break;
        case 'logical':
          module = await import('../expressions/logical/index');
          break;
        case 'special':
          module = await import('../expressions/special/index');
          break;
        case 'properties':
          module = await import('../expressions/properties/index');
          break;
        case 'conversion':
          module = await import('../expressions/conversion/index');
          break;
        case 'positional':
          module = await import('../expressions/positional/index');
          break;
        default:
          console.warn(`Unknown expression category: ${category}`);
          return;
      }

      // Extract expressions from module
      const categoryKey = `${category}Expressions`;
      const expressions = module[categoryKey] || module.default;

      if (!expressions) {
        console.warn(`No expressions found in category: ${category}`);
        return;
      }

      // Register all expressions from this category using the base class method
      this.registerCategory(expressions);
      debug.expressions(`  ✓ Registered ${Object.keys(expressions).length} expressions from ${category}`);
    } catch (error) {
      console.error(`Failed to load expression category: ${category}`, error);
      throw error;
    }
  }

  /**
   * Map node types to expression categories for lazy loading
   */
  private getCategoryForNodeType(nodeType: string): string | null {
    const typeToCategory: Record<string, string> = {
      // Reference expressions
      identifier: 'references',
      selector: 'references',
      dollarExpression: 'references',

      // Logical expressions
      binaryExpression: 'logical',
      unaryExpression: 'logical',
      comparison: 'logical',

      // Special expressions (literals)
      literal: 'special',
      string: 'special',
      numberLiteral: 'special',
      stringLiteral: 'special',
      booleanLiteral: 'special',
      arrayLiteral: 'special',
      objectLiteral: 'special',
      templateLiteral: 'special',

      // Property expressions
      memberExpression: 'properties',
      possessiveExpression: 'properties',
      propertyAccess: 'properties',
      propertyOfExpression: 'properties',

      // Conversion expressions
      asExpression: 'conversion',

      // Positional expressions
      positional: 'positional',

      // Call expressions
      callExpression: 'references',
    };

    return typeToCategory[nodeType] || null;
  }

  /**
   * Override evaluate to lazy-load categories before evaluation
   */
  override async evaluate(node: ASTNode, context: ExecutionContext): Promise<any> {
    // Handle null/undefined nodes
    if (!node) {
      debug.expressions('LAZY EVALUATOR: Received null/undefined node, returning null');
      return null;
    }

    // Handle nodes without type property
    if (!node.type) {
      console.error('LAZY EVALUATOR: Node missing type property:', node);
      throw new Error(`Node missing type property: ${JSON.stringify(node)}`);
    }

    // Determine which category this node type requires
    const category = this.getCategoryForNodeType(node.type);

    // Load category if needed
    if (category && !this.loadedCategories.has(category)) {
      debug.expressions(`🔄 Auto-loading category for node type: ${node.type} → ${category}`);
      await this.loadCategory(category);
    }

    // Delegate to base class evaluation logic
    return super.evaluate(node, context);
  }

  /**
   * Warmup API - Preload specific categories before they're needed
   */
  async warmupExpressions(categories: string[]): Promise<void> {
    debug.expressions(`🔥 Warming up expression categories: ${categories.join(', ')}`);
    await Promise.all(categories.map(cat => this.loadCategory(cat)));
  }

  /**
   * Get loaded categories
   */
  getLoadedCategories(): string[] {
    return Array.from(this.loadedCategories);
  }
}
