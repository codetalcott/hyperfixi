/**
 * Base Expression Implementation - Shared Logic for All Expression Classes
 *
 * This base class extracts duplicated code from expression implementations:
 * - trackPerformance/trackEvaluation (~15 lines duplicated 80+ times)
 * - toBoolean utility (duplicated in logical expressions)
 * - Common validation error creation
 *
 * Bundle size savings: ~10-15 KB by eliminating duplication
 * Uses centralized type-helpers for consistent type checking.
 */

import type { RuntimeValidator } from '../validation/lightweight-validators';
import type {
  TypedExpressionContext,
  EvaluationResult,
  ValidationResult,
  ValidationError,
  ExpressionMetadata,
  EvaluationType,
  ExpressionCategory,
} from '../types/base-types';
import { isString, isNumber, isBoolean, isObject, isFunction } from './type-helpers';

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
    if (isNumber(value) && isNaN(value as number)) {
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
    type: ValidationError['type'],
    message: string,
    code: string,
    suggestions: readonly string[] | string[] = []
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
    type: ValidationError['type'],
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
   * Works across realms (JSDOM, happy-dom vs native HTMLElement)
   *
   * Note: We don't use isObject() here because the type registry's Object
   * type explicitly excludes Elements (which is correct), so isObject()
   * returns false for Elements. Instead, we use direct duck-typing.
   */
  protected isElement(value: unknown): value is Element {
    return (
      value !== null &&
      typeof value === 'object' &&
      'nodeType' in value &&
      (value as any).nodeType === 1 &&
      'tagName' in value &&
      typeof (value as any).tagName === 'string'
    );
  }

  /**
   * Infer HyperScript value type from runtime value
   */
  protected inferType(value: unknown): EvaluationResult<unknown>['type'] {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (this.isElement(value)) return 'element';
    if (Array.isArray(value)) return 'array';
    if (isObject(value)) return 'object';
    return typeof value as EvaluationResult<unknown>['type'];
  }

  /**
   * Infer EvaluationType (capitalized) from runtime value
   * Previously duplicated as inferResultTypeLocal in First, Last, At, Random expressions
   *
   * Uses duck-typed isElement() for cross-realm compatibility (JSDOM vs native)
   */
  protected inferEvaluationType(value: unknown): EvaluationType {
    if (value === undefined) return 'Undefined';
    if (value === null) return 'Null';
    if (isString(value)) return 'String';
    if (isNumber(value)) return 'Number';
    if (isBoolean(value)) return 'Boolean';
    if (Array.isArray(value)) return 'Array';
    if (this.isElement(value)) return 'Element';
    return 'Object';
  }

  /**
   * Normalize various collection types to array
   * Previously duplicated in FirstExpression, LastExpression, AtExpression, RandomExpression
   *
   * Bundle size savings: ~54 lines by eliminating 4 duplicate implementations
   */
  protected normalizeCollection(collection: unknown): unknown[] {
    if (Array.isArray(collection)) return collection;
    if (collection instanceof NodeList) return Array.from(collection);
    if (isString(collection)) return (collection as string).split('');
    if (collection == null) return [];
    if (isObject(collection) && Symbol.iterator in (collection as object)) {
      return Array.from(collection as Iterable<unknown>);
    }
    return [];
  }

  /**
   * Convert value to number with proper null handling
   * Previously duplicated in comparison expressions (GreaterThan, LessThan, etc.)
   *
   * Bundle size savings: ~60 lines by eliminating 4+ duplicate implementations
   */
  protected toNumber(value: unknown): number | null {
    if (isNumber(value) && Number.isFinite(value as number)) return value as number;
    if (isString(value)) {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }
    if (isBoolean(value)) return (value as boolean) ? 1 : 0;
    return null;
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
    isObject(expr) &&
    'trackPerformance' in (expr as object) &&
    isFunction((expr as any).trackPerformance)
  );
}
