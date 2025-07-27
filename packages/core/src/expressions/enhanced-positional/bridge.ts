/**
 * Bridge between Enhanced Positional Expressions and Existing Expression Evaluator
 * Enables gradual migration from legacy to enhanced expressions while maintaining compatibility
 */

import type { ExecutionContext, TypedExpressionContext, ExpressionEvaluationOptions } from '../../types/base-types.js';
import { enhancedPositionalExpressions } from './index.js';

/**
 * Convert ExecutionContext to TypedExpressionContext for enhanced expressions
 */
export function createTypedExpressionContext(
  context: ExecutionContext,
  options: ExpressionEvaluationOptions = {}
): TypedExpressionContext {
  return {
    // Core context properties
    me: context.me,
    you: context.you,
    it: context.it,
    result: context.result,
    locals: context.locals || new Map(),
    globals: context.globals || new Map(),
    event: context.event || null,
    
    // Enhanced expression context properties
    expressionStack: [],
    evaluationDepth: 0,
    validationMode: options.validationMode || 'strict',
    evaluationHistory: []
  };
}

/**
 * Update ExecutionContext from TypedExpressionContext after evaluation
 */
export function updateExecutionContext(
  originalContext: ExecutionContext,
  typedContext: TypedExpressionContext
): ExecutionContext {
  // Update only the core properties that might have changed
  return {
    ...originalContext,
    me: typedContext.me,
    you: typedContext.you,
    it: typedContext.it,
    result: typedContext.result,
    locals: typedContext.locals,
    globals: typedContext.globals,
    event: typedContext.event
  };
}

/**
 * Enhanced expression adapter that wraps enhanced expressions for use in legacy systems
 */
export class EnhancedPositionalAdapter {
  /**
   * Evaluate enhanced 'first' expression with legacy context
   */
  static async evaluateFirst(context: ExecutionContext, collection?: unknown): Promise<unknown> {
    const typedContext = createTypedExpressionContext(context);
    const input = { collection };
    const result = await enhancedPositionalExpressions.first.evaluate(typedContext, input);
    
    if (result.success) {
      return result.value;
    } else {
      console.warn('Enhanced first expression failed:', result.errors);
      // Return null when enhanced expression fails
      return null;
    }
  }

  /**
   * Evaluate enhanced 'last' expression with legacy context
   */
  static async evaluateLast(context: ExecutionContext, collection?: unknown): Promise<unknown> {
    const typedContext = createTypedExpressionContext(context);
    const input = { collection };
    const result = await enhancedPositionalExpressions.last.evaluate(typedContext, input);
    
    if (result.success) {
      return result.value;
    } else {
      console.warn('Enhanced last expression failed:', result.error);
      // Fallback to basic last operation
      const target = collection !== undefined ? collection : context.it;
      if (Array.isArray(target)) {
        return target.length > 0 ? target[target.length - 1] : null;
      }
      return null;
    }
  }

  /**
   * Evaluate enhanced 'at' expression with legacy context
   */
  static async evaluateAt(context: ExecutionContext, index: number, collection?: unknown): Promise<unknown> {
    const typedContext = createTypedExpressionContext(context);
    const input = { index, collection };
    const result = await enhancedPositionalExpressions.at.evaluate(typedContext, input);
    
    if (result.success) {
      return result.value;
    } else {
      console.warn('Enhanced at expression failed:', result.error);
      // Fallback to basic at operation
      const target = collection !== undefined ? collection : context.it;
      if (Array.isArray(target)) {
        const actualIndex = index < 0 ? target.length + index : index;
        return actualIndex >= 0 && actualIndex < target.length ? target[actualIndex] : null;
      }
      return null;
    }
  }

  /**
   * Get enhanced expression metadata for debugging and tooling
   */
  static getExpressionMetadata(expressionName: string) {
    const expression = enhancedPositionalExpressions[expressionName as keyof typeof enhancedPositionalExpressions];
    return expression?.metadata;
  }

  /**
   * Get enhanced expression documentation for LLM assistance
   */
  static getExpressionDocumentation(expressionName: string) {
    const expression = enhancedPositionalExpressions[expressionName as keyof typeof enhancedPositionalExpressions];
    return expression?.documentation;
  }

  /**
   * Validate expression input using enhanced validation
   */
  static validateExpressionInput(expressionName: string, input: unknown) {
    const expression = enhancedPositionalExpressions[expressionName as keyof typeof enhancedPositionalExpressions];
    return expression?.validate(input);
  }
}

/**
 * Legacy compatibility wrapper that provides enhanced features while maintaining the old interface
 */
export class LegacyCompatibilityLayer {
  /**
   * Enhanced version of existing 'first' expression
   */
  static firstExpression = {
    name: 'first',
    category: 'Reference' as const,
    evaluatesTo: 'Any' as const,
    
    async evaluate(context: ExecutionContext, collection?: unknown): Promise<unknown> {
      return EnhancedPositionalAdapter.evaluateFirst(context, collection);
    },
    
    validate(args: unknown[]): string | null {
      if (args.length > 1) {
        return 'first expression takes at most one argument (collection)';
      }
      return null;
    }
  };

  /**
   * Enhanced version of existing 'last' expression
   */
  static lastExpression = {
    name: 'last',
    category: 'Reference' as const,
    evaluatesTo: 'Any' as const,
    
    async evaluate(context: ExecutionContext, collection?: unknown): Promise<unknown> {
      return EnhancedPositionalAdapter.evaluateLast(context, collection);
    },
    
    validate(args: unknown[]): string | null {
      if (args.length > 1) {
        return 'last expression takes at most one argument (collection)';
      }
      return null;
    }
  };

  /**
   * Enhanced version of existing 'at' expression
   */
  static atExpression = {
    name: 'at',
    category: 'Reference' as const,
    evaluatesTo: 'Any' as const,
    
    async evaluate(context: ExecutionContext, index: number, collection?: unknown): Promise<unknown> {
      return EnhancedPositionalAdapter.evaluateAt(context, index, collection);
    },
    
    validate(args: unknown[]): string | null {
      if (args.length < 1 || args.length > 2) {
        return 'at expression requires 1-2 arguments (index, optional collection)';
      }
      if (typeof args[0] !== 'number') {
        return 'index must be a number';
      }
      return null;
    }
  };
}

/**
 * Migration utility for gradually adopting enhanced expressions
 */
export class ExpressionMigrationUtility {
  private static migrationMap = new Map<string, boolean>();

  /**
   * Enable enhanced expression for a specific expression name
   */
  static enableEnhanced(expressionName: string) {
    this.migrationMap.set(expressionName, true);
  }

  /**
   * Disable enhanced expression for a specific expression name (use legacy)
   */
  static disableEnhanced(expressionName: string) {
    this.migrationMap.set(expressionName, false);
  }

  /**
   * Check if enhanced expression is enabled for a given name
   */
  static isEnhancedEnabled(expressionName: string): boolean {
    return this.migrationMap.get(expressionName) ?? false;
  }

  /**
   * Get migration status for all expressions
   */
  static getMigrationStatus() {
    return Object.fromEntries(this.migrationMap);
  }

  /**
   * Enable all enhanced positional expressions
   */
  static enableAllEnhanced() {
    Object.keys(enhancedPositionalExpressions).forEach(name => {
      this.enableEnhanced(name);
    });
  }

  /**
   * Disable all enhanced expressions (revert to legacy)
   */
  static disableAllEnhanced() {
    Object.keys(enhancedPositionalExpressions).forEach(name => {
      this.disableEnhanced(name);
    });
  }
}

/**
 * Positional navigation utilities with enhanced error handling
 */
export class PositionalUtilities {
  /**
   * Safe first element extraction with enhanced error reporting
   */
  static async safeFirst(
    context: ExecutionContext,
    collection?: unknown,
    fallback?: unknown
  ): Promise<{ success: boolean; value: unknown; error?: unknown }> {
    try {
      const typedContext = createTypedExpressionContext(context);
      const input = { collection };
      const result = await enhancedPositionalExpressions.first.evaluate(typedContext, input);
      
      if (result.success) {
        return { success: true, value: result.value };
      } else {
        return {
          success: false,
          value: fallback !== undefined ? fallback : null,
          error: result.errors
        };
      }
    } catch (error) {
      return {
        success: false,
        value: fallback !== undefined ? fallback : null,
        error: { message: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Safe last element extraction with enhanced error reporting
   */
  static async safeLast(
    context: ExecutionContext,
    collection?: unknown,
    fallback?: unknown
  ): Promise<{ success: boolean; value: unknown; error?: unknown }> {
    try {
      const typedContext = createTypedExpressionContext(context);
      const input = { collection };
      const result = await enhancedPositionalExpressions.last.evaluate(typedContext, input);
      
      if (result.success) {
        return { success: true, value: result.value };
      } else {
        return {
          success: false,
          value: fallback !== undefined ? fallback : null,
          error: result.errors
        };
      }
    } catch (error) {
      return {
        success: false,
        value: fallback !== undefined ? fallback : null,
        error: { message: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Safe indexed element access with enhanced error reporting
   */
  static async safeAt(
    context: ExecutionContext,
    index: number,
    collection?: unknown,
    fallback?: unknown
  ): Promise<{ success: boolean; value: unknown; error?: unknown }> {
    try {
      const typedContext = createTypedExpressionContext(context);
      const input = { index, collection };
      const result = await enhancedPositionalExpressions.at.evaluate(typedContext, input);
      
      if (result.success) {
        return { success: true, value: result.value };
      } else {
        return {
          success: false,
          value: fallback !== undefined ? fallback : null,
          error: result.errors
        };
      }
    } catch (error) {
      return {
        success: false,
        value: fallback !== undefined ? fallback : null,
        error: { message: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Batch positional operations on multiple collections
   */
  static async batchPositionalOperations(
    context: ExecutionContext,
    operations: Array<{ 
      type: 'first' | 'last' | 'at'; 
      collection: unknown; 
      index?: number; 
      key?: string 
    }>
  ): Promise<{ success: boolean; results: Record<string, unknown>; errors: Array<unknown> }> {
    const results: Record<string, unknown> = {};
    const errors: Array<unknown> = [];
    let overallSuccess = true;

    for (let i = 0; i < operations.length; i++) {
      const { type, collection, index, key } = operations[i];
      let operationResult;

      switch (type) {
        case 'first':
          operationResult = await this.safeFirst(context, collection);
          break;
        case 'last':
          operationResult = await this.safeLast(context, collection);
          break;
        case 'at':
          if (index === undefined) {
            operationResult = { success: false, value: null, error: { message: 'Index required for at operation' } };
          } else {
            operationResult = await this.safeAt(context, index, collection);
          }
          break;
        default:
          operationResult = { success: false, value: null, error: { message: `Unknown operation type: ${type}` } };
      }

      const resultKey = key || `operation_${i}`;
      results[resultKey] = operationResult.value;

      if (!operationResult.success) {
        overallSuccess = false;
        errors.push({
          key: resultKey,
          type,
          collection,
          index,
          error: operationResult.error
        });
      }
    }

    return { success: overallSuccess, results, errors };
  }

  /**
   * Get available positional operations with metadata
   */
  static getAvailableOperations() {
    return {
      'first': { description: 'Get first element from collection', complexity: 'simple' },
      'last': { description: 'Get last element from collection', complexity: 'simple' },
      'at': { description: 'Get element at specific index (supports negative indexing)', complexity: 'simple' }
    };
  }

  /**
   * Collection type analysis utility
   */
  static analyzeCollection(collection: unknown): {
    type: string;
    length: number;
    isIndexable: boolean;
    supportsNegativeIndexing: boolean;
    metadata: Record<string, unknown>;
  } {
    if (collection == null) {
      return {
        type: 'null',
        length: 0,
        isIndexable: false,
        supportsNegativeIndexing: false,
        metadata: {}
      };
    }

    if (Array.isArray(collection)) {
      return {
        type: 'array',
        length: collection.length,
        isIndexable: true,
        supportsNegativeIndexing: true,
        metadata: { elementTypes: [...new Set(collection.map(item => typeof item))] }
      };
    }

    if (collection instanceof NodeList) {
      return {
        type: 'NodeList',
        length: collection.length,
        isIndexable: true,
        supportsNegativeIndexing: true,
        metadata: { nodeTypes: [...new Set(Array.from(collection).map(node => node.nodeName))] }
      };
    }

    if (collection instanceof HTMLCollection) {
      return {
        type: 'HTMLCollection',
        length: collection.length,
        isIndexable: true,
        supportsNegativeIndexing: true,
        metadata: { tagNames: [...new Set(Array.from(collection).map(el => el.tagName))] }
      };
    }

    if (collection instanceof Element) {
      return {
        type: 'Element',
        length: collection.children.length,
        isIndexable: true,
        supportsNegativeIndexing: true,
        metadata: { tagName: collection.tagName, childCount: collection.children.length }
      };
    }

    if (typeof collection === 'string') {
      return {
        type: 'string',
        length: collection.length,
        isIndexable: true,
        supportsNegativeIndexing: true,
        metadata: { encoding: 'UTF-16', isEmpty: collection.length === 0 }
      };
    }

    if (typeof collection === 'object' && 'length' in collection && typeof (collection as { length: number }).length === 'number') {
      return {
        type: 'array-like',
        length: (collection as { length: number }).length,
        isIndexable: true,
        supportsNegativeIndexing: true,
        metadata: { hasNumericKeys: true }
      };
    }

    return {
      type: typeof collection,
      length: 0,
      isIndexable: false,
      supportsNegativeIndexing: false,
      metadata: { unsupported: true }
    };
  }
}

export default {
  createTypedExpressionContext,
  updateExecutionContext,
  EnhancedPositionalAdapter,
  LegacyCompatibilityLayer,
  ExpressionMigrationUtility,
  PositionalUtilities
};