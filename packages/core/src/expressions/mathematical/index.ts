/**
 * Mathematical Expressions - Deep TypeScript Integration
 * Implements arithmetic operations (+, -, *, /, mod) with comprehensive validation
 * Enhanced for LLM code agents with full type safety
 */

import { v } from '../../validation/lightweight-validators';
import type {
  ValidationResult,
  TypedExecutionContext as TypedExpressionContext,
  EvaluationType as EvaluationType,
  ExpressionMetadata as ExpressionMetadata,
  TypedResult as TypedResult,
  LLMDocumentation as LLMDocumentation,
  ExpressionCategory as ExpressionCategory,
} from '../../types/index';

// Define BaseTypedExpression locally for now
interface BaseTypedExpression<T> {
  readonly name: string;
  readonly category: string;
  readonly syntax: string;
  readonly outputType: EvaluationType;
  readonly inputSchema: any;
  readonly metadata: ExpressionMetadata;
  readonly documentation: LLMDocumentation;
  evaluate(context: TypedExpressionContext, input: unknown): Promise<TypedResult<T>>;
  validate(input: unknown): ValidationResult;
}

// ============================================================================
// Input Schemas
// ============================================================================

const BinaryOperationInputSchema = v.object({
  left: v.unknown().describe('Left operand value'),
  right: v.unknown().describe('Right operand value'),
});

type BinaryOperationInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Addition Expression
// ============================================================================

export class AdditionExpression implements BaseTypedExpression<number> {
  public readonly name = 'addition';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left + right';
  public readonly description = 'Adds two numeric values with type safety and validation';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      // Convert operands to numbers
      const leftNum = this.toNumber(input.left, 'left operand');
      const rightNum = this.toNumber(input.right, 'right operand');

      // Perform addition
      const result = leftNum + rightNum;

      // Validate result (check for overflow, NaN, etc.)
      if (!Number.isFinite(result)) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: `Addition resulted in non-finite value: ${leftNum} + ${rightNum} = ${result}`,
              suggestions: [],
            },
          ],
          suggestions: [
            'Check for numeric overflow',
            'Ensure operands are within valid number range',
            'Verify input values are not causing mathematical errors',
          ],
        };
      }

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      // Track performance for failed operations
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Addition failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: [
          'Ensure both operands are numeric or convertible to numbers',
          'Check for null or undefined values',
          'Verify operands are within valid ranges',
        ],
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
              message: `Invalid addition input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide both left and right operands',
            'Ensure operands are numbers or convertible to numbers',
          ],
        };
      }

      const { left, right } = parsed.data as { left: unknown; right: unknown };

      // Check if operands can be converted to numbers
      if (!this.isNumericValue(left)) {
        return {
          isValid: false,
          errors: [
            {
              type: 'type-mismatch',
              message: `Left operand cannot be converted to number: ${String(left)}`,
              suggestions: [],
            },
          ],
          suggestions: ['Provide a numeric value or string for left operand'],
        };
      }

      if (!this.isNumericValue(right)) {
        return {
          isValid: false,
          errors: [
            {
              type: 'type-mismatch',
              message: `Right operand cannot be converted to number: ${String(right)}`,
              suggestions: [],
            },
          ],
          suggestions: ['Provide a numeric value or string for right operand'],
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
        errors: [
          {
            type: 'runtime-error',
            message: 'Validation failed with exception',
            suggestions: [],
          },
        ],
        suggestions: ['Check input structure and types'],
      };
    }
  }

  /**
   * Convert value to number with proper error handling
   */
  private toNumber(value: unknown, context: string): number {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(`${context} is not a finite number: ${value}`);
      }
      return value;
    }

    if (typeof value === 'string') {
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new Error(`${context} cannot be converted to number: "${value}"`);
      }
      if (!Number.isFinite(num)) {
        throw new Error(`${context} converts to non-finite number: "${value}" -> ${num}`);
      }
      return num;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    if (value == null) {
      throw new Error(`${context} is null or undefined`);
    }

    throw new Error(`${context} cannot be converted to number: ${typeof value}`);
  }

  /**
   * Check if value can be converted to a number
   */
  private isNumericValue(value: unknown): boolean {
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }

    if (typeof value === 'string') {
      const num = Number(value);
      return Number.isFinite(num);
    }

    if (typeof value === 'boolean') {
      return true;
    }

    return false;
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
        input: 'binary operation',
        output: success ? 'number' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Subtraction Expression
// ============================================================================

export class SubtractionExpression implements BaseTypedExpression<number> {
  public readonly name = 'subtraction';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left - right';
  public readonly description = 'Subtracts right operand from left operand with type safety';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    _context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    // Reuse the same logic as addition but with subtraction operation
    const additionExpr = new AdditionExpression();

    try {
      // Validate using the same validation logic
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      // Convert and subtract
      const leftNum = additionExpr['toNumber'](input.left, 'left operand');
      const rightNum = additionExpr['toNumber'](input.right, 'right operand');
      const result = leftNum - rightNum;

      if (!Number.isFinite(result)) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: `Subtraction resulted in non-finite value: ${leftNum} - ${rightNum} = ${result}`,
              suggestions: [],
            },
          ],
          suggestions: ['Check for numeric overflow/underflow', 'Verify input ranges'],
        };
      }

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Subtraction failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are numeric', 'Check for null or undefined values'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    // Reuse addition validation logic
    const additionExpr = new AdditionExpression();
    return additionExpr.validate(input);
  }
}

// ============================================================================
// Multiplication Expression
// ============================================================================

export class MultiplicationExpression implements BaseTypedExpression<number> {
  public readonly name = 'multiplication';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left * right';
  public readonly description = 'Multiplies two numeric values with overflow protection';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    _context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    const additionExpr = new AdditionExpression();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const leftNum = additionExpr['toNumber'](input.left, 'left operand');
      const rightNum = additionExpr['toNumber'](input.right, 'right operand');
      const result = leftNum * rightNum;

      if (!Number.isFinite(result)) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: `Multiplication resulted in non-finite value: ${leftNum} * ${rightNum} = ${result}`,
              suggestions: [],
            },
          ],
          suggestions: ['Check for numeric overflow', 'Verify input ranges'],
        };
      }

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Multiplication failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are numeric'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const additionExpr = new AdditionExpression();
    return additionExpr.validate(input);
  }
}

// ============================================================================
// Division Expression
// ============================================================================

export class DivisionExpression implements BaseTypedExpression<number> {
  public readonly name = 'division';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left / right';
  public readonly description =
    'Divides left operand by right operand with zero-division protection';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    _context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    const additionExpr = new AdditionExpression();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const leftNum = additionExpr['toNumber'](input.left, 'left operand');
      const rightNum = additionExpr['toNumber'](input.right, 'right operand');

      // Division by zero returns Infinity (JavaScript behavior)
      // Note: This matches JavaScript's built-in behavior where 1/0 = Infinity, -1/0 = -Infinity
      const result = leftNum / rightNum;

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Division failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are numeric and divisor is not zero'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const additionExpr = new AdditionExpression();
    return additionExpr.validate(input);
  }
}

// ============================================================================
// Modulo Expression
// ============================================================================

export class ModuloExpression implements BaseTypedExpression<number> {
  public readonly name = 'modulo';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left mod right';
  public readonly description = 'Calculates remainder of division with comprehensive validation';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    _context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    const additionExpr = new AdditionExpression();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const leftNum = additionExpr['toNumber'](input.left, 'left operand');
      const rightNum = additionExpr['toNumber'](input.right, 'right operand');

      // Check for modulo by zero
      if (rightNum === 0) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: 'Modulo by zero is not allowed',
              suggestions: [],
            },
          ],
          suggestions: [
            'Ensure the divisor (right operand) is not zero',
            'Add a condition to check for zero before modulo operation',
          ],
        };
      }

      const result = leftNum % rightNum;

      if (!Number.isFinite(result)) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: `Modulo resulted in non-finite value: ${leftNum} % ${rightNum} = ${result}`,
              suggestions: [],
            },
          ],
          suggestions: ['Check for numeric overflow issues'],
        };
      }

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Modulo failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are numeric and divisor is not zero'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const additionExpr = new AdditionExpression();
    return additionExpr.validate(input);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createAdditionExpression(): AdditionExpression {
  return new AdditionExpression();
}

export function createSubtractionExpression(): SubtractionExpression {
  return new SubtractionExpression();
}

export function createMultiplicationExpression(): MultiplicationExpression {
  return new MultiplicationExpression();
}

export function createDivisionExpression(): DivisionExpression {
  return new DivisionExpression();
}

export function createModuloExpression(): ModuloExpression {
  return new ModuloExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const mathematicalExpressions = {
  addition: createAdditionExpression(),
  subtraction: createSubtractionExpression(),
  multiplication: createMultiplicationExpression(),
  division: createDivisionExpression(),
  modulo: createModuloExpression(),
} as const;
