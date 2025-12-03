/**
 * Comparison Expressions - Deep TypeScript Integration
 * Implements comparison operations (>, <, >=, <=, ==, !=) with comprehensive validation
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
import { toNumber } from './utils';

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

const ComparisonInputSchema = v.object({
  left: v.unknown().describe('Left operand value'),
  right: v.unknown().describe('Right operand value'),
});

type ComparisonInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced Greater Than Expression
// ============================================================================

export class GreaterThanExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'greaterThan';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left > right';
  public readonly description = 'Compares if left operand is greater than right operand';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
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

      // Compare values
      const result = this.compareValues(input.left, input.right, '>');

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
        errors: [
          {
            type: 'runtime-error',
            message: `Greater than comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: [
          'Ensure both operands are comparable (numbers, strings, or dates)',
          'Check for null or undefined values',
          'Verify operands have compatible types',
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
              message: `Invalid comparison input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide both left and right operands',
            'Ensure operands are comparable values',
          ],
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
   * Compare two values using the specified operator
   */
  private compareValues(left: unknown, right: unknown, _operator: string): boolean {
    // Handle null/undefined cases
    if (left == null || right == null) {
      return false;
    }

    // If both are numbers, compare numerically
    if (typeof left === 'number' && typeof right === 'number') {
      return left > right;
    }

    // If both are strings, compare lexicographically
    if (typeof left === 'string' && typeof right === 'string') {
      return left > right;
    }

    // Try to convert both to numbers (uses shared toNumber utility)
    const leftNum = toNumber(left);
    const rightNum = toNumber(right);

    if (leftNum !== null && rightNum !== null) {
      return leftNum > rightNum;
    }

    // Fallback to string comparison
    return String(left) > String(right);
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
        input: 'comparison',
        output: success ? 'boolean' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Enhanced Less Than Expression
// ============================================================================

export class LessThanExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'lessThan';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left < right';
  public readonly description = 'Compares if left operand is less than right operand';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
  };

  

  async evaluate(
    _context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    // Reuse greater than logic but invert the comparison
    const greaterThanExpr = new GreaterThanExpression();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const result = greaterThanExpr['compareValues'](input.left, input.right, '<');

      return {
        success: true,
        value: this.invertComparison(result, input.left, input.right, '<'),
        type: 'boolean',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Less than comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are comparable'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const greaterThanExpr = new GreaterThanExpression();
    return greaterThanExpr.validate(input);
  }

  private invertComparison(
    _greaterResult: boolean,
    left: unknown,
    right: unknown,
    _operator: string
  ): boolean {
    // Handle null/undefined cases
    if (left == null || right == null) {
      return false;
    }

    // For less than, we need to do the actual comparison
    if (typeof left === 'number' && typeof right === 'number') {
      return left < right;
    }

    if (typeof left === 'string' && typeof right === 'string') {
      return left < right;
    }

    // Try numeric conversion (uses shared toNumber utility)
    const leftNum = toNumber(left);
    const rightNum = toNumber(right);

    if (leftNum !== null && rightNum !== null) {
      return leftNum < rightNum;
    }

    return String(left) < String(right);
  }
}

// ============================================================================
// Enhanced Greater Than Or Equal Expression
// ============================================================================

export class GreaterThanOrEqualExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'greaterThanOrEqual';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left >= right';
  public readonly description =
    'Compares if left operand is greater than or equal to right operand';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
  };

  

  async evaluate(
    _context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const result = this.compareGreaterOrEqual(input.left, input.right);

      return {
        success: true,
        value: result,
        type: 'boolean',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Greater than or equal comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are comparable'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const greaterThanExpr = new GreaterThanExpression();
    return greaterThanExpr.validate(input);
  }

  private compareGreaterOrEqual(left: unknown, right: unknown): boolean {
    if (left == null || right == null) {
      return left === right; // Both null/undefined are equal
    }

    if (typeof left === 'number' && typeof right === 'number') {
      return left >= right;
    }

    if (typeof left === 'string' && typeof right === 'string') {
      return left >= right;
    }

    // Uses shared toNumber utility
    const leftNum = toNumber(left);
    const rightNum = toNumber(right);

    if (leftNum !== null && rightNum !== null) {
      return leftNum >= rightNum;
    }

    return String(left) >= String(right);
  }
}

// ============================================================================
// Enhanced Less Than Or Equal Expression
// ============================================================================

export class LessThanOrEqualExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'lessThanOrEqual';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left <= right';
  public readonly description = 'Compares if left operand is less than or equal to right operand';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
  };

  

  async evaluate(
    _context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const result = this.compareLessOrEqual(input.left, input.right);

      return {
        success: true,
        value: result,
        type: 'boolean',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Less than or equal comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are comparable'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const greaterThanExpr = new GreaterThanExpression();
    return greaterThanExpr.validate(input);
  }

  private compareLessOrEqual(left: unknown, right: unknown): boolean {
    if (left == null || right == null) {
      return left === right;
    }

    if (typeof left === 'number' && typeof right === 'number') {
      return left <= right;
    }

    if (typeof left === 'string' && typeof right === 'string') {
      return left <= right;
    }

    // Uses shared toNumber utility
    const leftNum = toNumber(left);
    const rightNum = toNumber(right);

    if (leftNum !== null && rightNum !== null) {
      return leftNum <= rightNum;
    }

    return String(left) <= String(right);
  }
}

// ============================================================================
// Equality Expression
// ============================================================================

export class EqualityExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'equals';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left == right';
  public readonly description = 'Compares if two values are equal with type coercion';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
  };

  

  async evaluate(
    _context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const result = this.compareEquality(input.left, input.right);

      return {
        success: true,
        value: result,
        type: 'boolean',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Equality comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Check for comparable values'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const greaterThanExpr = new GreaterThanExpression();
    return greaterThanExpr.validate(input);
  }

  private compareEquality(left: unknown, right: unknown): boolean {
    // Direct equality check
    if (left === right) {
      return true;
    }

    // Null/undefined handling
    if (left == null && right == null) {
      return true;
    }

    if (left == null || right == null) {
      return false;
    }

    // Type coercion for numbers and strings
    if (typeof left === 'number' && typeof right === 'string') {
      const rightNum = Number(right);
      return Number.isFinite(rightNum) && left === rightNum;
    }

    if (typeof left === 'string' && typeof right === 'number') {
      const leftNum = Number(left);
      return Number.isFinite(leftNum) && leftNum === right;
    }

    // Boolean coercion
    if (typeof left === 'boolean' && typeof right === 'number') {
      return (left ? 1 : 0) === right;
    }

    if (typeof left === 'number' && typeof right === 'boolean') {
      return left === (right ? 1 : 0);
    }

    // Default: convert both to strings and compare
    return String(left) === String(right);
  }
}

// ============================================================================
// Inequality Expression
// ============================================================================

export class InequalityExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'notEquals';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left != right';
  public readonly description = 'Compares if two values are not equal';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    try {
      // Use equality expression and invert the result
      const equalityExpr = new EqualityExpression();
      const equalityResult = await equalityExpr.evaluate(context, input);

      if (!equalityResult.success) {
        return {
          success: false,
          ...(equalityResult.errors && { errors: equalityResult.errors }),
          ...(equalityResult.suggestions && { suggestions: equalityResult.suggestions }),
        };
      }

      return {
        success: true,
        value: !equalityResult.value,
        type: 'boolean',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Inequality comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Check for comparable values'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const equalityExpr = new EqualityExpression();
    return equalityExpr.validate(input);
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
