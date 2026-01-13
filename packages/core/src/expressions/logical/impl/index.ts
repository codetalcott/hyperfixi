/**
 * Logical Expressions - Deep TypeScript Integration
 * Implements logical operations (and, or, not) with comprehensive validation
 * Enhanced for LLM code agents with full type safety
 *
 * Refactored to use BaseExpressionImpl for reduced bundle size (~3 KB savings)
 */

import { v } from '../../../validation/lightweight-validators';
import type {
  TypedExpressionContext,
  EvaluationType,
  ValidationResult,
  EvaluationResult,
} from '../../../types/base-types';
import type {
  TypedExpressionImplementation,
  ExpressionMetadata,
  ExpressionCategory,
} from '../../../types/expression-types';
import { BaseExpressionImpl } from '../../base-expression';

// ============================================================================
// Input Schemas
// ============================================================================

const BinaryLogicalInputSchema = v
  .object({
    left: v.unknown().describe('Left operand value'),
    right: v.unknown().describe('Right operand value'),
  })
  .strict();

const UnaryLogicalInputSchema = v
  .object({
    operand: v.unknown().describe('Operand value to negate'),
  })
  .strict();

type BinaryLogicalInput = any; // Inferred from RuntimeValidator
type UnaryLogicalInput = any; // Inferred from RuntimeValidator

// ============================================================================
// And Expression
// ============================================================================

export class AndExpression
  extends BaseExpressionImpl<BinaryLogicalInput, boolean>
  implements TypedExpressionImplementation<BinaryLogicalInput, boolean>
{
  public readonly name = 'and';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left and right';
  public readonly description = 'Logical AND operation with comprehensive boolean type coercion';
  public readonly inputSchema = BinaryLogicalInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryLogicalInput
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      // Convert left operand to boolean (inherited from BaseExpressionImpl)
      const leftBool = this.toBoolean(input.left);

      // Short-circuit evaluation: if left is false, return false without evaluating right
      if (!leftBool) {
        this.trackSimple(context, startTime, true, 'boolean');
        return this.success(false, 'boolean');
      }

      // Convert right operand to boolean
      const rightBool = this.toBoolean(input.right);
      const result = leftBool && rightBool;

      // Track performance (inherited from BaseExpressionImpl)
      this.trackSimple(context, startTime, true, 'boolean');

      return this.success(result, 'boolean');
    } catch (error) {
      this.trackSimple(context, startTime, false);

      return this.failure(
        'AndExpressionError',
        'runtime-error',
        `Logical AND operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'AND_EVALUATION_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);

      if (!parsed.success) {
        return {
          isValid: false,
          errors:
            parsed.error?.errors.map(err => ({
              type: 'type-mismatch' as const,
              message: `Invalid AND operation input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide both left and right operands', 'Ensure operands are valid values'],
        };
      }

      return this.validationSuccess();
    } catch (error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }
}

// ============================================================================
// Or Expression
// ============================================================================

export class OrExpression
  extends BaseExpressionImpl<BinaryLogicalInput, boolean>
  implements TypedExpressionImplementation<BinaryLogicalInput, boolean>
{
  public readonly name = 'or';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left or right';
  public readonly description = 'Logical OR operation with comprehensive boolean type coercion';
  public readonly inputSchema = BinaryLogicalInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryLogicalInput
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      // Convert left operand to boolean (inherited from BaseExpressionImpl)
      const leftBool = this.toBoolean(input.left);

      // Short-circuit evaluation: if left is true, return true without evaluating right
      if (leftBool) {
        this.trackSimple(context, startTime, true, 'boolean');
        return this.success(true, 'boolean');
      }

      // Convert right operand to boolean
      const rightBool = this.toBoolean(input.right);
      const result = leftBool || rightBool;

      // Track performance (inherited from BaseExpressionImpl)
      this.trackSimple(context, startTime, true, 'boolean');

      return this.success(result, 'boolean');
    } catch (error) {
      this.trackSimple(context, startTime, false);

      return this.failure(
        'OrExpressionError',
        'runtime-error',
        `Logical OR operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'OR_EVALUATION_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);

      if (!parsed.success) {
        return {
          isValid: false,
          errors:
            parsed.error?.errors.map(err => ({
              type: 'type-mismatch' as const,
              message: `Invalid OR operation input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide both left and right operands', 'Ensure operands are valid values'],
        };
      }

      return this.validationSuccess();
    } catch (error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }
}

// ============================================================================
// Not Expression
// ============================================================================

export class NotExpression
  extends BaseExpressionImpl<UnaryLogicalInput, boolean>
  implements TypedExpressionImplementation<UnaryLogicalInput, boolean>
{
  public readonly name = 'not';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'not operand';
  public readonly description = 'Logical NOT operation with comprehensive boolean type coercion';
  public readonly inputSchema = UnaryLogicalInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: UnaryLogicalInput
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      // Convert operand to boolean and negate (inherited from BaseExpressionImpl)
      const operandBool = this.toBoolean(input.operand);
      const result = !operandBool;

      // Track performance (inherited from BaseExpressionImpl)
      this.trackSimple(context, startTime, true, 'boolean');

      return this.success(result, 'boolean');
    } catch (error) {
      this.trackSimple(context, startTime, false);

      return this.failure(
        'NotExpressionError',
        'runtime-error',
        `Logical NOT operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'NOT_EVALUATION_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);

      if (!parsed.success) {
        return {
          isValid: false,
          errors:
            parsed.error?.errors.map(err => ({
              type: 'type-mismatch' as const,
              message: `Invalid NOT operation input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide a single operand', 'Ensure operand is a valid value'],
        };
      }

      return this.validationSuccess();
    } catch (error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createAndExpression(): AndExpression {
  return new AndExpression();
}

export function createOrExpression(): OrExpression {
  return new OrExpression();
}

export function createNotExpression(): NotExpression {
  return new NotExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const logicalExpressions = {
  and: createAndExpression(),
  or: createOrExpression(),
  not: createNotExpression(),
} as const;
