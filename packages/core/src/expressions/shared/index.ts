/**
 * Shared Expression Primitives
 *
 * Phase 2 Consolidation: Central export point for shared utilities
 *
 * These primitives break the coupling between expression classes and enable:
 * - Expressions to be thin wrappers (~20-30 lines each)
 * - No inter-expression dependencies
 * - Consistent behavior across all expression categories
 *
 * Usage:
 *   import { toNumber, compareValues, validateBinaryInput } from '../shared';
 */

// Number utilities
export {
  toNumber,
  toNumberOrNull,
  ensureFinite,
  isNumeric,
  canBeNumeric,
  safeDivide,
  safeModulo,
} from './number-utils';

// Comparison utilities
export {
  compareValues,
  coerceToComparable,
  areStrictlyEqual,
  areLooselyEqual,
  isGreaterThan,
  isLessThan,
  isGreaterThanOrEqual,
  isLessThanOrEqual,
  type ComparisonOperator,
} from './comparison-utils';

// Validation utilities
export {
  validResult,
  invalidResult,
  createError,
  toValidationResult,
  validateBinaryInput,
  validateUnaryInput,
  validateNotNull,
  validateNumber,
  validateString,
  validateBoolean,
  combineValidations,
} from './validation-utils';

// Type utilities (re-exported from type-helpers for convenience)
export {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isFunction,
  isArray,
  isElement,
  isArrayLike,
  inferType,
} from '../type-helpers';

// ============================================================================
// Evaluation Tracking
// ============================================================================

/**
 * Track expression evaluation in context history
 * Use this for expressions that don't extend BaseExpressionImpl
 *
 * @param expression - The expression being evaluated (must have name and category)
 * @param context - The execution context (may have evaluationHistory)
 * @param args - The input arguments
 * @param result - The evaluation result
 * @param startTime - The timestamp when evaluation started (from Date.now())
 * @param success - Whether the evaluation succeeded (default: true)
 * @param error - Optional error if evaluation failed
 * @returns The result (pass-through for convenience)
 */
export function trackEvaluation<T>(
  expression: { name: string; category: string },
  context: unknown,
  args: unknown[],
  result: T,
  startTime: number,
  success: boolean = true,
  error?: Error
): T {
  // Add evaluation tracking if context supports it
  if (
    context &&
    typeof context === 'object' &&
    'evaluationHistory' in context &&
    Array.isArray((context as { evaluationHistory?: unknown[] }).evaluationHistory)
  ) {
    (
      context as {
        evaluationHistory: Array<{
          expressionName: string;
          category: string;
          input: unknown;
          output: unknown;
          timestamp: number;
          duration: number;
          success: boolean;
          error?: Error;
        }>;
      }
    ).evaluationHistory.push({
      expressionName: expression.name,
      category: expression.category,
      input: args,
      output: result,
      timestamp: startTime,
      duration: Date.now() - startTime,
      success,
      ...(error !== undefined && { error }),
    });
  }
  return result;
}
