/**
 * Symbol Expression - Variable Resolution
 * Implements comprehensive symbol (variable) resolution with TypeScript integration
 * Handles local, element, and global variable resolution with enhanced error handling
 *
 * Uses centralized type-helpers for consistent type checking.
 */

import { v } from '../../validation/lightweight-validators';
import type {
  HyperScriptValue,
  HyperScriptValueType,
  EvaluationResult,
  TypedExpressionContext,
  TypedExpressionImplementation,
  ValidationResult,
  ExpressionCategory,
  ExpressionAnalysisInfo,
} from '../../types/command-types';
import type { ValidationError } from '../../types/base-types';
import { isString, isNumber, isBoolean, isObject, isFunction } from '../type-helpers';

// ============================================================================
// Input Validation Schema
// ============================================================================

/**
 * Schema for symbol expression input validation
 */
export const SymbolExpressionInputSchema = v.tuple([
  v.string().min(1).describe('Variable name to resolve from context'),
]);

export type SymbolExpressionInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Symbol Expression Implementation
// ============================================================================

/**
 * Enhanced symbol expression for variable resolution
 * Provides comprehensive context-aware variable lookup
 */
export class SymbolExpression
  implements TypedExpressionImplementation<HyperScriptValue, TypedExpressionContext>
{
  public readonly inputSchema = SymbolExpressionInputSchema;

  

  // Required TypedExpressionImplementation properties
  public readonly name = 'symbol';
  public readonly category: ExpressionCategory = 'reference';
  public readonly precedence = 18; // Highest precedence for variable references
  public readonly associativity: 'left' | 'right' | 'none' = 'none';
  public readonly outputType = 'any';
  public readonly analysisInfo: ExpressionAnalysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(1)',
    dependencies: [],
  };

  /**
   * Validate symbol expression arguments
   */
  async validate(args: unknown[]): Promise<ValidationResult> {
    try {
      const validatedArgs = this.inputSchema.parse(args) as [string];
      const [symbolName] = validatedArgs;

      // Additional semantic validation
      const issues: ValidationError[] = [];

      // Check for reserved keywords
      const reservedKeywords = ['me', 'you', 'it', 'event', 'target', 'result'];
      if (reservedKeywords.includes(symbolName)) {
        issues.push({
          type: 'validation-error',
          message: `"${symbolName}" is a reserved hyperscript keyword - use context references instead`,
          suggestions: [],
        });
      }

      // Check for potentially problematic names
      if (symbolName.includes('.')) {
        issues.push({
          type: 'validation-error',
          message: `Symbol names with dots should use property access syntax instead: "${symbolName.split('.')[0]}'s ${symbolName.split('.').slice(1).join('.')}"`,
          suggestions: [],
        });
      }

      if (symbolName.startsWith('__')) {
        issues.push({
          type: 'validation-error',
          message: `Symbol names starting with "__" are typically internal - consider a different name`,
          suggestions: [],
        });
      }

      return {
        isValid: issues.length === 0,
        errors: issues,
        suggestions:
          issues.length > 0
            ? [
                'Use standard variable naming conventions',
                'Avoid reserved keywords for variable names',
                'Use property access for nested properties',
              ]
            : [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            type: 'syntax-error',
            message: error instanceof Error ? error.message : 'Invalid symbol expression arguments',
            suggestions: [],
          },
        ],
        suggestions: [
          'Provide a valid string for the symbol name',
          'Ensure symbol name is not empty',
          'Use alphanumeric characters and underscores for variable names',
        ],
      };
    }
  }

  /**
   * Evaluate symbol expression with enhanced context resolution
   */
  async evaluate(
    context: TypedExpressionContext,
    ...args: unknown[]
  ): Promise<EvaluationResult<HyperScriptValue>> {
    try {
      // Validate input arguments
      const validationResult = await this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'SymbolValidationError',
            type: 'validation-error',
            message: `Symbol expression validation failed: ${validationResult.errors.join(', ')}`,
            code: 'SYMBOL_VALIDATION_ERROR',
            severity: 'error',
            suggestions: [],
          },
          type: 'error',
        };
      }

      const [symbolName] = this.inputSchema.parse(args) as [string];

      // Enhanced context resolution with comprehensive scope chain
      const resolvedValue = await this.resolveSymbol(symbolName, context);
      const valueType = this.inferType(resolvedValue);

      return {
        success: true,
        value: resolvedValue,
        type: valueType,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'SymbolEvaluationError',
          type: 'runtime-error',
          message: `Failed to evaluate symbol expression: ${error instanceof Error ? error.message : String(error)}`,
          code: 'SYMBOL_EVALUATION_ERROR',
          severity: 'error',
          suggestions: [],
        },
        type: 'error',
      };
    }
  }

  /**
   * Enhanced symbol resolution with comprehensive scope chain
   * Follows hyperscript variable resolution order:
   * 1. Meta context (template variables, local scope)
   * 2. Local variables
   * 3. Element properties (if current element exists)
   * 4. Global variables (window/globalThis)
   */
  private async resolveSymbol(
    symbolName: string,
    context: TypedExpressionContext
  ): Promise<HyperScriptValue> {
    // 1. Check meta context first (for template variables, local scope)
    if (
      context.meta &&
      typeof (context.meta as any).has === 'function' &&
      (context.meta as any).has(symbolName)
    ) {
      return (context.meta as any).get(symbolName) as HyperScriptValue;
    }

    // 2. Check local variables
    if (context.locals && context.locals.has(symbolName)) {
      return context.locals.get(symbolName);
    }

    // 3. Check variables map (alternative local storage)
    if (context.variables && context.variables.has(symbolName)) {
      return context.variables.get(symbolName);
    }

    // 4. Check direct context properties (for expressions like 'testValue')
    if (symbolName in context) {
      return (context as any)[symbolName] as HyperScriptValue;
    }

    // 5. Check current element properties (if element exists)
    if (context.me && typeof context.me === 'object' && context.me !== null) {
      if (symbolName in context.me) {
        const elementProperty = (context.me as any)[symbolName];

        // Handle methods bound to element
        if (isFunction(elementProperty)) {
          return (elementProperty as Function).bind(context.me);
        }

        return elementProperty as HyperScriptValue;
      }
    }

    // 6. Check global context (window/globalThis)
    if (typeof globalThis !== 'undefined' && symbolName in globalThis) {
      return (globalThis as any)[symbolName] as HyperScriptValue;
    }

    // If Node.js environment, check global
    if (typeof global !== 'undefined' && symbolName in global) {
      return (global as any)[symbolName] as HyperScriptValue;
    }

    // 7. Check common browser globals explicitly
    if (typeof window !== 'undefined') {
      const browserGlobals = ['document', 'window', 'console', 'location', 'navigator'];
      if (browserGlobals.includes(symbolName) && symbolName in window) {
        return (window as any)[symbolName] as HyperScriptValue;
      }
    }

    // Symbol not found - return undefined (hyperscript behavior)
    return undefined;
  }

  /**
   * Infer the type of a resolved value
   */
  private inferType(value: HyperScriptValue): HyperScriptValueType {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (isString(value)) return 'string';
    if (isNumber(value)) return 'number';
    if (isBoolean(value)) return 'boolean';
    if (value instanceof HTMLElement) return 'element';
    if (Array.isArray(value)) return 'array';
    if (isObject(value)) return 'object';
    if (isFunction(value)) return 'function';
    return 'unknown';
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'SymbolExpression',
      category: 'reference' as const,
      version: '1.0.0',
      description: 'Enhanced variable resolution with comprehensive scope chain lookup',
      inputSchema: this.inputSchema,
      supportedContexts: ['local', 'element', 'global', 'meta'],
      performance: {
        complexity: 'low',
        averageExecutionTime: '< 1ms',
        memoryUsage: 'minimal',
      },
      capabilities: {
        contextAware: true,
        supportsAsync: true,
        sideEffects: false,
        cacheable: true,
      },
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Factory function for creating enhanced symbol expressions
 */
export function createSymbolExpression(): SymbolExpression {
  return new SymbolExpression();
}

/**
 * Type guard for symbol expression inputs
 */
export function isValidSymbolInput(args: unknown[]): args is SymbolExpressionInput {
  try {
    SymbolExpressionInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick symbol resolution utility for testing
 */
export async function resolveSymbol(
  symbolName: string,
  context: TypedExpressionContext
): Promise<EvaluationResult<HyperScriptValue>> {
  const expression = new SymbolExpression();
  return expression.evaluate(context, symbolName);
}

// Default export
export default SymbolExpression;
