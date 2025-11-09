/**
 * Bridge between Enhanced Conversion Expressions and Existing Expression Evaluator
 * Enables gradual migration from legacy to enhanced expressions while maintaining compatibility
 */

import type {
  ExecutionContext,
  TypedExpressionContext,
  ExpressionEvaluationOptions,
} from '../../../types/base-types';
import { conversionExpressions } from './index';

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
    evaluationHistory: [],
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
    event: typedContext.event,
  };
}

/**
 * Enhanced expression adapter that wraps enhanced expressions for use in legacy systems
 */
export class EnhancedConversionAdapter {
  /**
   * Evaluate enhanced 'as' expression with legacy context
   */
  static async evaluateAs(
    context: ExecutionContext,
    value: unknown,
    type: string
  ): Promise<unknown> {
    const typedContext = createTypedExpressionContext(context);
    const input = { value, type };
    const result = await conversionExpressions.as.evaluate(typedContext, input);

    if (result.success) {
      return result.value;
    } else {
      console.warn('Enhanced as expression failed:', result.error);
      // Fallback to basic conversion - would implement legacy behavior here
      return value;
    }
  }

  /**
   * Evaluate enhanced 'is' expression with legacy context
   */
  static async evaluateIs(
    context: ExecutionContext,
    value: unknown,
    type: string
  ): Promise<boolean> {
    const typedContext = createTypedExpressionContext(context);
    const input = { value, type };
    const result = await conversionExpressions.is.evaluate(typedContext, input);

    if (result.success) {
      return result.value ?? false;
    } else {
      console.warn('Enhanced is expression failed:', result.error);
      // Fallback to basic type checking
      return typeof value === type.toLowerCase();
    }
  }

  /**
   * Get enhanced expression metadata for debugging and tooling
   */
  static getExpressionMetadata(expressionName: string) {
    const expression = conversionExpressions[expressionName as keyof typeof conversionExpressions];
    return expression?.metadata;
  }

  /**
   * Get enhanced expression documentation for LLM assistance
   */
  static getExpressionDocumentation(expressionName: string) {
    const expression = conversionExpressions[expressionName as keyof typeof conversionExpressions];
    return expression?.documentation;
  }

  /**
   * Validate expression input using enhanced validation
   */
  static validateExpressionInput(expressionName: string, input: unknown) {
    const expression = conversionExpressions[expressionName as keyof typeof conversionExpressions];
    return expression?.validate(input);
  }
}

/**
 * Legacy compatibility wrapper that provides enhanced features while maintaining the old interface
 */
export class LegacyCompatibilityLayer {
  /**
   * Enhanced version of existing 'as' expression
   */
  static asExpression = {
    name: 'as',
    category: 'Conversion' as const,
    evaluatesTo: 'Any' as const,

    async evaluate(context: ExecutionContext, value: unknown, type: string): Promise<unknown> {
      return EnhancedConversionAdapter.evaluateAs(context, value, type);
    },

    validate(args: unknown[]): string | null {
      if (args.length !== 2) {
        return 'as expression requires exactly two arguments (value, type)';
      }
      if (typeof args[1] !== 'string') {
        return 'conversion type must be a string';
      }
      return null;
    },
  };

  /**
   * Enhanced version of existing 'is' expression
   */
  static isExpression = {
    name: 'is',
    category: 'Conversion' as const,
    evaluatesTo: 'Boolean' as const,

    async evaluate(context: ExecutionContext, value: unknown, type: string): Promise<boolean> {
      return EnhancedConversionAdapter.evaluateIs(context, value, type);
    },

    validate(args: unknown[]): string | null {
      if (args.length !== 2) {
        return 'is expression requires exactly two arguments (value, type)';
      }
      if (typeof args[1] !== 'string') {
        return 'type must be a string';
      }
      return null;
    },
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
   * Enable all enhanced conversion expressions
   */
  static enableAllEnhanced() {
    Object.keys(conversionExpressions).forEach(name => {
      this.enableEnhanced(name);
    });
  }

  /**
   * Disable all enhanced expressions (revert to legacy)
   */
  static disableAllEnhanced() {
    Object.keys(conversionExpressions).forEach(name => {
      this.disableEnhanced(name);
    });
  }
}

/**
 * Type conversion utilities with enhanced error handling
 */
export class ConversionUtilities {
  /**
   * Safe type conversion with enhanced error reporting
   */
  static async safeConvert(
    context: ExecutionContext,
    value: unknown,
    type: string,
    fallback?: unknown
  ): Promise<{ success: boolean; value: unknown; error?: unknown }> {
    try {
      const typedContext = createTypedExpressionContext(context);
      const input = { value, type };
      const result = await conversionExpressions.as.evaluate(typedContext, input);

      if (result.success) {
        return { success: true, value: result.value };
      } else {
        return {
          success: false,
          value: fallback !== undefined ? fallback : value,
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        value: fallback !== undefined ? fallback : value,
        error: {
          type: 'runtime-error',
          message: error instanceof Error ? error.message : String(error),
          suggestions: [],
        },
      };
    }
  }

  /**
   * Batch convert multiple values
   */
  static async batchConvert(
    context: ExecutionContext,
    conversions: Array<{ value: unknown; type: string; key?: string }>
  ): Promise<{ success: boolean; results: Record<string, unknown>; errors: Array<unknown> }> {
    const results: Record<string, unknown> = {};
    const errors: Array<unknown> = [];
    let overallSuccess = true;

    for (let i = 0; i < conversions.length; i++) {
      const { value, type, key } = conversions[i];
      const conversionResult = await this.safeConvert(context, value, type);

      const resultKey = key || `conversion_${i}`;
      results[resultKey] = conversionResult.value;

      if (!conversionResult.success) {
        overallSuccess = false;
        errors.push({
          key: resultKey,
          value,
          type,
          error: conversionResult.error,
        });
      }
    }

    return { success: overallSuccess, results, errors };
  }

  /**
   * Get available conversion types with metadata
   */
  static getAvailableConversions() {
    return {
      String: { description: 'Convert to string', complexity: 'simple' },
      Number: { description: 'Convert to number', complexity: 'simple' },
      Int: { description: 'Convert to integer', complexity: 'simple' },
      Float: { description: 'Convert to float', complexity: 'simple' },
      Boolean: { description: 'Convert to boolean', complexity: 'simple' },
      Array: { description: 'Convert to array', complexity: 'simple' },
      Object: { description: 'Convert to object', complexity: 'medium' },
      Date: { description: 'Convert to date', complexity: 'medium' },
      JSON: { description: 'Convert to JSON string', complexity: 'medium' },
      Values: { description: 'Extract form values', complexity: 'medium' },
      'Values:Form': {
        description: 'Extract form values as URL-encoded string',
        complexity: 'medium',
      },
      'Values:JSON': { description: 'Extract form values as JSON string', complexity: 'medium' },
      HTML: { description: 'Convert to HTML string', complexity: 'medium' },
      Fragment: { description: 'Convert to document fragment', complexity: 'medium' },
      'Fixed:N': { description: 'Convert to fixed-precision decimal', complexity: 'simple' },
    };
  }
}

export default {
  createTypedExpressionContext,
  updateExecutionContext,
  EnhancedConversionAdapter,
  LegacyCompatibilityLayer,
  ExpressionMigrationUtility,
  ConversionUtilities,
};
