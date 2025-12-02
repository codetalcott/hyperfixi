/**
 * Comparison Expressions - TypeScript Integration
 * Implements comparison operators (==, !=, >, <, >=, <=) with type safety
 */

import { v, z } from '../../../validation/lightweight-validators';
import type {
  ValidationResult,
  TypedExecutionContext as TypedExpressionContext,
  EvaluationType as EvaluationType,
  ExpressionMetadata as ExpressionMetadata,
  TypedResult as TypedResult,
  LLMDocumentation as LLMDocumentation,
  ExpressionCategory as ExpressionCategory,
} from '../../../types/index';

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

const ComparisonInputSchema = v
  .object({
    left: v.unknown().describe('Left operand value'),
    operator: z.enum(['==', '!=', '>', '<', '>=', '<=']).describe('Comparison operator'),
    right: v.unknown().describe('Right operand value'),
  })
  .strict();

type ComparisonInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Equals Expression
// ============================================================================

export class EqualsExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'equals';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left == right';
  public readonly description = 'Equality comparison with type coercion';
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
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      // JavaScript equality comparison
      const result = input.left == input.right;

      this.trackPerformance(context, startTime, true, result);

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
            message: `Equality comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure operands are valid values', 'Check for null or undefined values'],
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
          suggestions: ['Provide left and right operands', 'Use valid comparison operator'],
        };
      }

      // Ensure operator is == for this expression
      if ((parsed.data as any).operator !== '==') {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: `Equals expression expects == operator, got ${(parsed.data as any).operator}`,
              suggestions: [],
            },
          ],
          suggestions: [
            'Use == for equality comparison',
            'Use appropriate expression for other operators',
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

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean,
    output?: any
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'equality comparison',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Enhanced Not Equals Expression
// ============================================================================

export class NotEqualsExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'notEquals';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left != right';
  public readonly description = 'Inequality comparison with type coercion';
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
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const result = input.left != input.right;

      this.trackPerformance(context, startTime, true, result);

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
            message: `Inequality comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure operands are valid values', 'Check for null or undefined values'],
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
          suggestions: ['Provide left and right operands', 'Use valid comparison operator'],
        };
      }

      if ((parsed.data as any).operator !== '!=') {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: `Not equals expression expects != operator, got ${(parsed.data as any).operator}`,
              suggestions: [],
            },
          ],
          suggestions: ['Use != for inequality comparison'],
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

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean,
    output?: any
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'inequality comparison',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Enhanced Greater Than Expression
// ============================================================================

export class GreaterThanExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'greaterThan';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left > right';
  public readonly description = 'Greater than comparison with numeric coercion';
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
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const result = input.left > input.right;

      this.trackPerformance(context, startTime, true, result);

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
          'Ensure operands can be compared',
          'Check for valid numeric or string values',
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
          suggestions: ['Provide left and right operands', 'Use valid comparison operator'],
        };
      }

      if ((parsed.data as any).operator !== '>') {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: `Greater than expression expects > operator, got ${(parsed.data as any).operator}`,
              suggestions: [],
            },
          ],
          suggestions: ['Use > for greater than comparison'],
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

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean,
    output?: any
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'greater than comparison',
        output: success ? output : 'error',
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
  public readonly description = 'Less than comparison with numeric coercion';
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
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const result = input.left < input.right;

      this.trackPerformance(context, startTime, true, result);

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
            message: `Less than comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: [
          'Ensure operands can be compared',
          'Check for valid numeric or string values',
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
          suggestions: ['Provide left and right operands'],
        };
      }

      if ((parsed.data as any).operator !== '<') {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: `Less than expression expects < operator, got ${(parsed.data as any).operator}`,
              suggestions: [],
            },
          ],
          suggestions: ['Use < for less than comparison'],
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

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean,
    output?: any
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'less than comparison',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Enhanced Greater Than Or Equal Expression
// ============================================================================

export class GreaterThanOrEqualExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'greaterThanOrEqual';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left >= right';
  public readonly description = 'Greater than or equal comparison with numeric coercion';
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
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const result = input.left >= input.right;

      this.trackPerformance(context, startTime, true, result);

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
            message: `Greater than or equal comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: [
          'Ensure operands can be compared',
          'Check for valid numeric or string values',
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
          suggestions: ['Provide left and right operands'],
        };
      }

      if ((parsed.data as any).operator !== '>=') {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: `Greater than or equal expression expects >= operator, got ${(parsed.data as any).operator}`,
              suggestions: [],
            },
          ],
          suggestions: ['Use >= for greater than or equal comparison'],
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

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean,
    output?: any
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'greater than or equal comparison',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Enhanced Less Than Or Equal Expression
// ============================================================================

export class LessThanOrEqualExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'lessThanOrEqual';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left <= right';
  public readonly description = 'Less than or equal comparison with numeric coercion';
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
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const result = input.left <= input.right;

      this.trackPerformance(context, startTime, true, result);

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
            message: `Less than or equal comparison failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: [
          'Ensure operands can be compared',
          'Check for valid numeric or string values',
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
          suggestions: ['Provide left and right operands'],
        };
      }

      if ((parsed.data as any).operator !== '<=') {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: `Less than or equal expression expects <= operator, got ${(parsed.data as any).operator}`,
              suggestions: [],
            },
          ],
          suggestions: ['Use <= for less than or equal comparison'],
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

  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean,
    output?: any
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'less than or equal comparison',
        output: success ? output : 'error',
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

export function createEqualsExpression(): EnhancedEqualsExpression {
  return new EnhancedEqualsExpression();
}

export function createNotEqualsExpression(): EnhancedNotEqualsExpression {
  return new EnhancedNotEqualsExpression();
}

export function createGreaterThanExpression(): EnhancedGreaterThanExpression {
  return new EnhancedGreaterThanExpression();
}

export function createLessThanExpression(): EnhancedLessThanExpression {
  return new EnhancedLessThanExpression();
}

export function createGreaterThanOrEqualExpression(): EnhancedGreaterThanOrEqualExpression {
  return new EnhancedGreaterThanOrEqualExpression();
}

export function createLessThanOrEqualExpression(): EnhancedLessThanOrEqualExpression {
  return new EnhancedLessThanOrEqualExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const comparisonExpressions = {
  equals: createEqualsExpression(),
  notEquals: createNotEqualsExpression(),
  greaterThan: createGreaterThanExpression(),
  lessThan: createLessThanExpression(),
  greaterThanOrEqual: createGreaterThanOrEqualExpression(),
  lessThanOrEqual: createLessThanOrEqualExpression(),
} as const;
