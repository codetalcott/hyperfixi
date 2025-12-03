/**
 * Base Expression Implementation - Shared Logic for All Expression Classes
 *
 * This base class extracts duplicated code from expression implementations:
 * - trackPerformance/trackEvaluation (~15 lines duplicated 80+ times)
 * - toBoolean utility (duplicated in logical expressions)
 * - Common validation error creation
 *
 * Bundle size savings: ~10-15 KB by eliminating duplication
 */

import type { RuntimeValidator } from '../validation/lightweight-validators';
import type {
  TypedExpressionContext,
  EvaluationResult,
  ValidationResult,
  ExpressionMetadata,
  EvaluationType,
} from '../types/base-types';
import type { ExpressionCategory } from '../types/expression-types';

/**
 * Abstract base class for expression implementations
 * Provides shared functionality to reduce code duplication
 */
export abstract class BaseExpressionImpl<TInput = unknown, TOutput = unknown> {
  // Required properties that subclasses must define
  abstract readonly name: string;
  abstract readonly category: ExpressionCategory;
  abstract readonly syntax: string;
  abstract readonly description: string;
  abstract readonly inputSchema: RuntimeValidator<TInput>;
  abstract readonly outputType: EvaluationType;
  abstract readonly metadata: ExpressionMetadata;

  /**
   * Track expression evaluation in context history
   * Previously duplicated ~15 lines across 80+ expression classes
   *
   * @param context - The expression context with evaluationHistory
   * @param input - The input that was evaluated
   * @param result - The evaluation result
   * @param startTime - The timestamp when evaluation started (from Date.now())
   */
  protected trackPerformance(
    context: TypedExpressionContext,
    input: unknown,
    result: EvaluationResult<TOutput>,
    startTime: number
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input,
        output: result.success ? result.value : result.error,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: result.success,
      });
    }
  }

  /**
   * Simplified tracking for success/failure without full result object
   * Used when you only have a boolean success flag
   *
   * @param context - The expression context with evaluationHistory
   * @param startTime - The timestamp when evaluation started
   * @param success - Whether the operation succeeded
   * @param output - Optional output value or error description
   */
  protected trackSimple(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean,
    output: unknown = success ? 'success' : 'error'
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'operation',
        output,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }

  /**
   * Convert value to boolean using JavaScript's truthiness rules
   * Previously duplicated in And, Or, and Not expressions
   *
   * JavaScript falsy values: false, 0, -0, 0n, "", null, undefined, NaN
   * All other values are truthy
   */
  protected toBoolean(value: unknown): boolean {
    // Explicit falsy checks (note: -0 === 0 in JavaScript)
    if (
      value === false ||
      value === 0 ||
      value === 0n ||
      value === '' ||
      value === null ||
      value === undefined
    ) {
      return false;
    }

    // NaN check (typeof NaN === 'number')
    if (typeof value === 'number' && isNaN(value)) {
      return false;
    }

    // All other values are truthy
    return true;
  }

  /**
   * Create a success evaluation result
   */
  protected success<T>(value: T, type: EvaluationResult<T>['type']): EvaluationResult<T> {
    return {
      success: true,
      value,
      type,
    };
  }

  /**
   * Create a failure evaluation result with structured error
   */
  protected failure<T>(
    name: string,
    type: 'runtime-error' | 'validation-error' | 'type-mismatch' | 'invalid-argument',
    message: string,
    code: string,
    suggestions: string[] = []
  ): EvaluationResult<T> {
    return {
      success: false,
      error: {
        name,
        type,
        message,
        code,
        suggestions,
      },
    };
  }

  /**
   * Create a successful validation result
   */
  protected validationSuccess(): ValidationResult {
    return {
      isValid: true,
      errors: [],
      suggestions: [],
    };
  }

  /**
   * Create a failed validation result
   */
  protected validationFailure(
    type: 'type-mismatch' | 'runtime-error' | 'validation-error' | 'syntax-error',
    message: string,
    suggestions: string[] = []
  ): ValidationResult {
    return {
      isValid: false,
      errors: [{ type, message, suggestions }],
      suggestions,
    };
  }

  /**
   * Check if a value is a DOM element using duck typing
   * Works across realms (JSDOM vs native HTMLElement)
   */
  protected isElement(value: unknown): value is Element {
    return value != null && typeof value === 'object' && (value as any).nodeType === 1;
  }

  /**
   * Infer HyperScript value type from runtime value
   */
  protected inferType(value: unknown): EvaluationResult<unknown>['type'] {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (this.isElement(value)) return 'element';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value as EvaluationResult<unknown>['type'];
  }

  // Abstract methods that subclasses must implement
  abstract evaluate(
    context: TypedExpressionContext,
    input: TInput
  ): Promise<EvaluationResult<TOutput>>;

  abstract validate(input: unknown): ValidationResult;
}

/**
 * Type guard to check if an expression extends BaseExpressionImpl
 */
export function isBaseExpression(expr: unknown): expr is BaseExpressionImpl {
  return (
    expr != null &&
    typeof expr === 'object' &&
    'trackPerformance' in expr &&
    typeof (expr as any).trackPerformance === 'function'
  );
}
