/**
 * Logical Expressions - Deep TypeScript Integration
 * Implements logical operations (and, or, not) with comprehensive validation
 * Enhanced for LLM code agents with full type safety
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

      // Convert left operand to boolean
      const leftBool = this.toBoolean(input.left);

      // Short-circuit evaluation: if left is false, return false without evaluating right
      if (!leftBool) {
        this.trackPerformance(context, startTime, true);
        return {
          success: true,
          value: false,
          type: 'boolean',
        };
      }

      // Convert right operand to boolean
      const rightBool = this.toBoolean(input.right);
      const result = leftBool && rightBool;

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value: result,
        type: 'boolean',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Logical AND operation failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: [],
        },
      };
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
              type: 'type-mismatch',
              message: `Invalid AND operation input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide both left and right operands', 'Ensure operands are valid values'],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
      };
    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: [],
        },
        suggestions: ['Check input structure and types'],
        errors: [],
      };
    }
  }

  /**
   * Convert value to boolean using JavaScript's truthiness rules
   */
  private toBoolean(value: unknown): boolean {
    // JavaScript falsy values: false, 0, -0, 0n, "", null, undefined, NaN
    // Note: -0 === 0 in JavaScript, so checking value === 0 covers both 0 and -0
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

    if (typeof value === 'number' && isNaN(value)) {
      return false;
    }

    // All other values are truthy
    return true;
  }

  /**
   * Track performance for debugging and optimization
   */
  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'logical operation',
        output: success ? 'boolean' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Or Expression
// ============================================================================

export class OrExpression
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

      // Convert left operand to boolean
      const leftBool = this.toBoolean(input.left);

      // Short-circuit evaluation: if left is true, return true without evaluating right
      if (leftBool) {
        this.trackPerformance(context, startTime, true);
        return {
          success: true,
          value: true,
          type: 'boolean',
        };
      }

      // Convert right operand to boolean
      const rightBool = this.toBoolean(input.right);
      const result = leftBool || rightBool;

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value: result,
        type: 'boolean',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Logical OR operation failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: [],
        },
      };
    }
  }

  validate(input: unknown): ValidationResult {
    // Reuse AND validation logic
    const andExpr = new AndExpression();
    return andExpr.validate(input);
  }

  private toBoolean(value: unknown): boolean {
    // Reuse AND boolean conversion logic
    const andExpr = new AndExpression();
    return andExpr['toBoolean'](value);
  }

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'logical operation',
        output: success ? 'boolean' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Not Expression
// ============================================================================

export class NotExpression
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

      // Convert operand to boolean and negate
      const operandBool = this.toBoolean(input.operand);
      const result = !operandBool;

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value: result,
        type: 'boolean',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Logical NOT operation failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: [],
        },
      };
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
              type: 'type-mismatch',
              message: `Invalid NOT operation input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide a single operand', 'Ensure operand is a valid value'],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
      };
    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: [],
        },
        suggestions: ['Check input structure and types'],
        errors: [],
      };
    }
  }

  private toBoolean(value: unknown): boolean {
    // Reuse AND boolean conversion logic
    const andExpr = new AndExpression();
    return andExpr['toBoolean'](value);
  }

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'logical operation',
        output: success ? 'boolean' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
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
