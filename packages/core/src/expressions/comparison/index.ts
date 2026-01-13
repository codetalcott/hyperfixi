/**
 * Comparison Expressions - Refactored with Shared Primitives
 *
 * Phase 2 Consolidation: Uses shared primitives to eliminate coupling
 * between expression classes and reduce code duplication.
 *
 * Before: 679 lines with internal coupling (LessThanExpression → GreaterThanExpression)
 * After: ~220 lines with no coupling
 */

import type {
  ValidationResult,
  TypedExecutionContext as TypedExpressionContext,
  EvaluationType,
  ExpressionMetadata,
  TypedResult,
  ExpressionCategory,
} from '../../types/index';

// Import shared primitives - breaks the coupling
import { compareValues, validateBinaryInput, createError } from '../shared';

// ============================================================================
// Base Interface
// ============================================================================

interface BaseTypedExpression<T> {
  readonly name: string;
  readonly category: string;
  readonly syntax: string;
  readonly outputType: EvaluationType;
  readonly metadata: ExpressionMetadata;
  evaluate(context: TypedExpressionContext, input: unknown): Promise<TypedResult<T>>;
  validate(input: unknown): ValidationResult;
}

// ============================================================================
// Greater Than Expression
// ============================================================================

export class GreaterThanExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'greaterThan';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left > right';
  public readonly outputType: EvaluationType = 'boolean';
  public readonly metadata: ExpressionMetadata = { category: 'Logical', complexity: 'simple' };

  async evaluate(_context: TypedExpressionContext, input: unknown): Promise<TypedResult<boolean>> {
    const validation = this.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, suggestions: validation.suggestions };
    }

    try {
      const { left, right } = input as { left: unknown; right: unknown };
      const result = compareValues(left, right, '>');

      return { success: true, value: result, type: 'boolean' };
    } catch (error) {
      return {
        success: false,
        errors: [
          createError(
            'runtime-error',
            `Greater than comparison failed: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        suggestions: ['Ensure both operands are comparable'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    return validateBinaryInput(input);
  }
}

// ============================================================================
// Less Than Expression
// ============================================================================

export class LessThanExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'lessThan';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left < right';
  public readonly outputType: EvaluationType = 'boolean';
  public readonly metadata: ExpressionMetadata = { category: 'Logical', complexity: 'simple' };

  async evaluate(_context: TypedExpressionContext, input: unknown): Promise<TypedResult<boolean>> {
    const validation = this.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, suggestions: validation.suggestions };
    }

    try {
      const { left, right } = input as { left: unknown; right: unknown };
      const result = compareValues(left, right, '<');

      return { success: true, value: result, type: 'boolean' };
    } catch (error) {
      return {
        success: false,
        errors: [
          createError(
            'runtime-error',
            `Less than comparison failed: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        suggestions: ['Ensure both operands are comparable'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    return validateBinaryInput(input);
  }
}

// ============================================================================
// Greater Than Or Equal Expression
// ============================================================================

export class GreaterThanOrEqualExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'greaterThanOrEqual';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left >= right';
  public readonly outputType: EvaluationType = 'boolean';
  public readonly metadata: ExpressionMetadata = { category: 'Logical', complexity: 'simple' };

  async evaluate(_context: TypedExpressionContext, input: unknown): Promise<TypedResult<boolean>> {
    const validation = this.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, suggestions: validation.suggestions };
    }

    try {
      const { left, right } = input as { left: unknown; right: unknown };
      const result = compareValues(left, right, '>=');

      return { success: true, value: result, type: 'boolean' };
    } catch (error) {
      return {
        success: false,
        errors: [
          createError(
            'runtime-error',
            `Greater than or equal comparison failed: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        suggestions: ['Ensure both operands are comparable'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    return validateBinaryInput(input);
  }
}

// ============================================================================
// Less Than Or Equal Expression
// ============================================================================

export class LessThanOrEqualExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'lessThanOrEqual';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left <= right';
  public readonly outputType: EvaluationType = 'boolean';
  public readonly metadata: ExpressionMetadata = { category: 'Logical', complexity: 'simple' };

  async evaluate(_context: TypedExpressionContext, input: unknown): Promise<TypedResult<boolean>> {
    const validation = this.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, suggestions: validation.suggestions };
    }

    try {
      const { left, right } = input as { left: unknown; right: unknown };
      const result = compareValues(left, right, '<=');

      return { success: true, value: result, type: 'boolean' };
    } catch (error) {
      return {
        success: false,
        errors: [
          createError(
            'runtime-error',
            `Less than or equal comparison failed: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        suggestions: ['Ensure both operands are comparable'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    return validateBinaryInput(input);
  }
}

// ============================================================================
// Equality Expression
// ============================================================================

export class EqualityExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'equals';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left == right';
  public readonly outputType: EvaluationType = 'boolean';
  public readonly metadata: ExpressionMetadata = { category: 'Logical', complexity: 'simple' };

  async evaluate(_context: TypedExpressionContext, input: unknown): Promise<TypedResult<boolean>> {
    const validation = this.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, suggestions: validation.suggestions };
    }

    try {
      const { left, right } = input as { left: unknown; right: unknown };
      const result = compareValues(left, right, '==');

      return { success: true, value: result, type: 'boolean' };
    } catch (error) {
      return {
        success: false,
        errors: [
          createError(
            'runtime-error',
            `Equality comparison failed: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        suggestions: ['Check for comparable values'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    return validateBinaryInput(input);
  }
}

// ============================================================================
// Inequality Expression
// ============================================================================

export class InequalityExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'notEquals';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left != right';
  public readonly outputType: EvaluationType = 'boolean';
  public readonly metadata: ExpressionMetadata = { category: 'Logical', complexity: 'simple' };

  async evaluate(_context: TypedExpressionContext, input: unknown): Promise<TypedResult<boolean>> {
    const validation = this.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, suggestions: validation.suggestions };
    }

    try {
      const { left, right } = input as { left: unknown; right: unknown };
      const result = compareValues(left, right, '!=');

      return { success: true, value: result, type: 'boolean' };
    } catch (error) {
      return {
        success: false,
        errors: [
          createError(
            'runtime-error',
            `Inequality comparison failed: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        suggestions: ['Check for comparable values'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    return validateBinaryInput(input);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createGreaterThanExpression(): GreaterThanExpression {
  return new GreaterThanExpression();
}

export function createLessThanExpression(): LessThanExpression {
  return new LessThanExpression();
}

export function createGreaterThanOrEqualExpression(): GreaterThanOrEqualExpression {
  return new GreaterThanOrEqualExpression();
}

export function createLessThanOrEqualExpression(): LessThanOrEqualExpression {
  return new LessThanOrEqualExpression();
}

export function createEqualityExpression(): EqualityExpression {
  return new EqualityExpression();
}

export function createInequalityExpression(): InequalityExpression {
  return new InequalityExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const comparisonExpressions = {
  greaterThan: createGreaterThanExpression(),
  lessThan: createLessThanExpression(),
  greaterThanOrEqual: createGreaterThanOrEqualExpression(),
  lessThanOrEqual: createLessThanOrEqualExpression(),
  equals: createEqualityExpression(),
  notEquals: createInequalityExpression(),
} as const;
