/**
 * Special Expressions for HyperScript
 * Provides deep TypeScript integration for literals and mathematical operations
 *
 * Uses centralized type-helpers for consistent type checking.
 */

import { v } from '../../validation/lightweight-validators';
import type {
  BaseTypedExpression,
  TypedExpressionContext,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
  EvaluationResult,
} from '../../types/base-types';
import type { ExpressionCategory } from '../../types/expression-types';
import { isString, isNumber, isBoolean } from '../type-helpers';

// ============================================================================
// Input Schemas
// ============================================================================

const StringLiteralInputSchema = v
  .object({
    value: v.string().describe('String literal value'),
  })
  .strict();

const NumberLiteralInputSchema = v
  .object({
    value: v.number().describe('Number literal value'),
  })
  .strict();

const BooleanLiteralInputSchema = v
  .object({
    value: v.boolean().describe('Boolean literal value'),
  })
  .strict();

const BinaryOperationInputSchema = v
  .object({
    left: v.unknown().describe('Left operand'),
    right: v.unknown().describe('Right operand'),
  })
  .strict();

type StringLiteralInput = any; // Inferred from RuntimeValidator
type NumberLiteralInput = any; // Inferred from RuntimeValidator
type BooleanLiteralInput = any; // Inferred from RuntimeValidator
type BinaryOperationInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced String Literal Expression
// ============================================================================

export class StringLiteralExpression implements BaseTypedExpression<string> {
  public readonly name = 'stringLiteral';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = '"string" or \'string\'';
  public readonly description = 'String literals with template interpolation support';
  public readonly outputType: EvaluationType = 'String';
  public readonly inputSchema = StringLiteralInputSchema;

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: StringLiteralInput
  ): Promise<EvaluationResult<string>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'validation-error',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions,
          },
        };
      }

      let result = input.value;

      // Handle template interpolation if present
      if (result.includes('${') || result.includes('$')) {
        result = this.interpolateString(result, context);
      }

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'string',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          name: 'StringEvaluationError',
          type: 'runtime-error',
          code: 'STRING_EVALUATION_FAILED',
          message: `String literal evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid string literal input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide a value parameter', 'Ensure value is a string'],
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

  private interpolateString(template: string, context: TypedExpressionContext): string {
    // Handle ${expression} interpolation
    let result = template.replace(/\$\{([^}]+)\}/g, (_match, expression) => {
      try {
        const value = this.resolveExpression(expression.trim(), context);
        return value !== undefined ? String(value) : '';
      } catch (error) {
        return '';
      }
    });

    // Handle $variable interpolation
    result = result.replace(/\$([a-zA-Z_$][a-zA-Z0-9_.$]*)/g, (_match, varName) => {
      try {
        const value = this.resolveVariable(varName, context);
        return value !== undefined ? String(value) : '';
      } catch (error) {
        return '';
      }
    });

    return result;
  }

  private resolveExpression(expression: string, context: TypedExpressionContext): unknown {
    // Simple expression resolution - for now handle basic property access
    if (expression.includes('.')) {
      const parts = expression.split('.');
      let value = this.resolveVariable(parts[0], context);

      for (let i = 1; i < parts.length && value != null; i++) {
        value = (value as any)[parts[i]];
      }

      return value;
    }

    return this.resolveVariable(expression, context);
  }

  private resolveVariable(varName: string, context: TypedExpressionContext): unknown {
    // Check context properties
    if (varName === 'me' && context.me) return context.me;
    if (varName === 'you' && context.you) return context.you;
    if (varName === 'it' && context.it) return context.it;
    if (varName === 'result' && context.result) return context.result;

    // Check locals
    if (context.locals?.has(varName)) {
      return context.locals.get(varName);
    }

    // Check globals
    if (context.globals?.has(varName)) {
      return context.globals.get(varName);
    }

    return undefined;
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
        input: 'string literal',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Enhanced Number Literal Expression
// ============================================================================

export class NumberLiteralExpression implements BaseTypedExpression<number> {
  public readonly name = 'numberLiteral';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = '123 or 3.14';
  public readonly description = 'Numeric literal with validation';
  public readonly inputSchema = NumberLiteralInputSchema;
  public readonly outputType: EvaluationType = 'Number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: NumberLiteralInput
  ): Promise<EvaluationResult<number>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'validation-error',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions,
          },
        };
      }

      if (!isFinite(input.value)) {
        return {
          success: false,
          error: {
            name: 'NumberValidationError',
            type: 'invalid-argument',
            code: 'NUMBER_NOT_FINITE',
            message: 'Number literal must be finite',
            suggestions: [],
          },
        };
      }

      this.trackPerformance(context, startTime, true, input.value);

      return {
        success: true,
        value: input.value,
        type: 'number',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          name: 'NumberEvaluationError',
          type: 'runtime-error',
          code: 'NUMBER_EVALUATION_FAILED',
          message: `Number literal evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid number literal input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide a value parameter', 'Ensure value is a number'],
        };
      }

      if (!isFinite((parsed.data as any).value)) {
        return {
          isValid: false,
          errors: [
            {
              type: 'invalid-argument',
              message: 'Number literal value must be finite',
              suggestions: [],
            },
          ],
          suggestions: ['Use finite numbers only', 'Avoid Infinity and NaN values'],
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
        input: 'number literal',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Enhanced Boolean Literal Expression
// ============================================================================

export class BooleanLiteralExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'booleanLiteral';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'true or false';
  public readonly description = 'Boolean literal values';
  public readonly inputSchema = BooleanLiteralInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: BooleanLiteralInput
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'validation-error',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions,
          },
        };
      }

      this.trackPerformance(context, startTime, true, input.value);

      return {
        success: true,
        value: input.value,
        type: 'boolean',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          name: 'BooleanEvaluationError',
          type: 'runtime-error',
          code: 'BOOLEAN_EVALUATION_FAILED',
          message: `Boolean literal evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid boolean literal input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide a value parameter', 'Ensure value is a boolean'],
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
        input: 'boolean literal',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Addition Expression
// ============================================================================

export class AdditionExpression implements BaseTypedExpression<number> {
  public readonly name = 'addition';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left + right';
  public readonly description = 'Addition of two numeric values';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'Number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<EvaluationResult<number>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'validation-error',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions,
          },
        };
      }

      const leftNum = this.ensureNumber(input.left, 'Left operand');
      const rightNum = this.ensureNumber(input.right, 'Right operand');

      const result = leftNum + rightNum;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          name: 'AdditionError',
          type: 'runtime-error',
          code: 'ADDITION_FAILED',
          message: `Addition failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid addition input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide left and right operands'],
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

  private ensureNumber(value: unknown, context: string): number {
    if (isNumber(value)) {
      if (!isFinite(value as number)) {
        throw new Error(`${context} must be a finite number`);
      }
      return value as number;
    }

    if (isString(value)) {
      const num = parseFloat(value as string);
      if (isNaN(num)) {
        throw new Error(`${context} cannot be converted to number: "${value}"`);
      }
      return num;
    }

    if (isBoolean(value)) {
      return (value as boolean) ? 1 : 0;
    }

    if (value === null || value === undefined) {
      return 0;
    }

    throw new Error(`${context} cannot be converted to number`);
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
        input: 'addition operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Enhanced String Concatenation Expression
// ============================================================================

export class StringConcatenationExpression implements BaseTypedExpression<string> {
  public readonly name = 'stringConcatenation';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left + right (string concatenation)';
  public readonly description = 'Concatenation of two values into a string';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'String';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<EvaluationResult<string>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'validation-error',
            message: validation.errors[0]?.message || 'Invalid input',
            code: 'STRING_CONCATENATION_VALIDATION_FAILED',
            suggestions: validation.suggestions,
          },
        };
      }

      // Convert both operands to strings
      const leftStr = this.convertToString(input.left);
      const rightStr = this.convertToString(input.right);

      const result = leftStr + rightStr;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'string',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          name: 'StringConcatenationError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'String concatenation failed',
          code: 'STRING_CONCATENATION_ERROR',
          suggestions: ['Check that operands can be converted to strings'],
        },
      };
    }
  }

  validate(input: unknown): ValidationResult<BinaryOperationInput> {
    const parsed = BinaryOperationInputSchema.safeParse(input);

    if (!parsed.success) {
      return {
        isValid: false,
        errors:
          parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid string concatenation input: ${err.message}`,
            suggestions: [],
          })) ?? [],
        suggestions: ['Provide left and right operands for concatenation'],
      };
    }

    return {
      isValid: true,
      errors: [],
      suggestions: [],
      data: parsed.data,
    };
  }

  private convertToString(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (isString(value)) return value as string;
    if (isNumber(value)) return (value as number).toString();
    if (isBoolean(value)) return (value as boolean).toString();
    if (value instanceof Date) return value.toString();

    try {
      return String(value);
    } catch {
      return '[object Object]';
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
        input: 'string concatenation operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Multiplication Expression
// ============================================================================

export class MultiplicationExpression implements BaseTypedExpression<number> {
  public readonly name = 'multiplication';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left * right';
  public readonly description = 'Multiplication of two numeric values';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'Number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
  };

  

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<EvaluationResult<number>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'validation-error',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions,
          },
        };
      }

      const leftNum = this.ensureNumber(input.left, 'Left operand');
      const rightNum = this.ensureNumber(input.right, 'Right operand');

      const result = leftNum * rightNum;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          name: 'MultiplicationError',
          type: 'runtime-error',
          code: 'MULTIPLICATION_FAILED',
          message: `Multiplication failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid multiplication input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide left and right operands'],
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

  private ensureNumber(value: unknown, context: string): number {
    if (isNumber(value)) {
      if (!isFinite(value as number)) {
        throw new Error(`${context} must be a finite number`);
      }
      return value as number;
    }

    if (isString(value)) {
      const num = parseFloat(value as string);
      if (isNaN(num)) {
        throw new Error(`${context} cannot be converted to number: "${value}"`);
      }
      return num;
    }

    if (isBoolean(value)) {
      return (value as boolean) ? 1 : 0;
    }

    if (value === null || value === undefined) {
      return 0;
    }

    throw new Error(`${context} cannot be converted to number`);
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
        input: 'multiplication operation',
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

export function createStringLiteralExpression(): StringLiteralExpression {
  return new StringLiteralExpression();
}

export function createNumberLiteralExpression(): NumberLiteralExpression {
  return new NumberLiteralExpression();
}

export function createBooleanLiteralExpression(): BooleanLiteralExpression {
  return new BooleanLiteralExpression();
}

export function createAdditionExpression(): AdditionExpression {
  return new AdditionExpression();
}

export function createStringConcatenationExpression(): StringConcatenationExpression {
  return new StringConcatenationExpression();
}

export function createMultiplicationExpression(): MultiplicationExpression {
  return new MultiplicationExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const specialExpressions = {
  stringLiteral: createStringLiteralExpression(),
  numberLiteral: createNumberLiteralExpression(),
  booleanLiteral: createBooleanLiteralExpression(),
  addition: createAdditionExpression(),
  stringConcatenation: createStringConcatenationExpression(),
  multiplication: createMultiplicationExpression(),
} as const;

// specialExpressions already exported above

export type SpecialExpressionName = keyof typeof specialExpressions;
