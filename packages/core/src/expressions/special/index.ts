/**
 * Special Expressions for HyperScript
 * Provides deep TypeScript integration for literals and mathematical operations
 *
 * Refactored to use BaseExpressionImpl for reduced bundle size (~180 lines savings)
 * Uses centralized type-helpers for consistent type checking.
 */

import { v, type RuntimeValidator } from '../../validation/lightweight-validators';
import type {
  TypedExpressionContext,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
  EvaluationResult,
} from '../../types/base-types';
import type { ExpressionCategory } from '../../types/expression-types';
import { isString, isNumber, isBoolean } from '../type-helpers';
import { toNumber } from '../shared';
import { BaseExpressionImpl } from '../base-expression';

// ============================================================================
// Input Schemas
// ============================================================================

type StringLiteralInput = { value: string };
type NumberLiteralInput = { value: number };
type BooleanLiteralInput = { value: boolean };
type BinaryOperationInput = { left: unknown; right: unknown };

const StringLiteralInputSchema = v
  .object({
    value: v.string().describe('String literal value'),
  })
  .strict() as unknown as RuntimeValidator<StringLiteralInput>;

const NumberLiteralInputSchema = v
  .object({
    value: v.number().describe('Number literal value'),
  })
  .strict() as unknown as RuntimeValidator<NumberLiteralInput>;

const BooleanLiteralInputSchema = v
  .object({
    value: v.boolean().describe('Boolean literal value'),
  })
  .strict() as unknown as RuntimeValidator<BooleanLiteralInput>;

const BinaryOperationInputSchema = v
  .object({
    left: v.unknown().describe('Left operand'),
    right: v.unknown().describe('Right operand'),
  })
  .strict() as unknown as RuntimeValidator<BinaryOperationInput>;

// ============================================================================
// Enhanced String Literal Expression
// ============================================================================

export class StringLiteralExpression extends BaseExpressionImpl<StringLiteralInput, string> {
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
        const result = this.failure<string>(
          'ValidationError',
          'validation-error',
          validation.errors.map(e => e.message).join(', '),
          'VALIDATION_FAILED',
          validation.suggestions
        );
        this.trackSimple(context, startTime, false);
        return result;
      }

      let resultValue = input.value;

      // Handle template interpolation if present
      if (resultValue.includes('${') || resultValue.includes('$')) {
        resultValue = this.interpolateString(resultValue, context);
      }

      const result = this.success(resultValue, 'string');
      this.trackSimple(context, startTime, true, resultValue);
      return result;
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return this.failure<string>(
        'StringEvaluationError',
        'runtime-error',
        `String literal evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        'STRING_EVALUATION_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') || 'Invalid string literal input',
          ['Provide a value parameter', 'Ensure value is a string']
        );
      }
      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }

  private interpolateString(template: string, context: TypedExpressionContext): string {
    // Handle ${expression} interpolation
    let result = template.replace(/\$\{([^}]+)\}/g, (_match, expression) => {
      try {
        const value = this.resolveExpression(expression.trim(), context);
        return value !== undefined ? String(value) : '';
      } catch (_error) {
        return '';
      }
    });

    // Handle $variable interpolation
    result = result.replace(/\$([a-zA-Z_$][a-zA-Z0-9_.$]*)/g, (_match, varName) => {
      try {
        const value = this.resolveVariable(varName, context);
        return value !== undefined ? String(value) : '';
      } catch (_error) {
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
        value = (value as Record<string, unknown>)[parts[i]];
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
}

// ============================================================================
// Enhanced Number Literal Expression
// ============================================================================

export class NumberLiteralExpression extends BaseExpressionImpl<NumberLiteralInput, number> {
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
        this.trackSimple(context, startTime, false);
        return this.failure<number>(
          'ValidationError',
          'validation-error',
          validation.errors.map(e => e.message).join(', '),
          'VALIDATION_FAILED',
          validation.suggestions
        );
      }

      if (!Number.isFinite(input.value)) {
        this.trackSimple(context, startTime, false);
        return this.failure<number>(
          'NumberValidationError',
          'invalid-argument',
          'Number literal must be finite',
          'NUMBER_NOT_FINITE'
        );
      }

      this.trackSimple(context, startTime, true, input.value);
      return this.success(input.value, 'number');
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return this.failure<number>(
        'NumberEvaluationError',
        'runtime-error',
        `Number literal evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        'NUMBER_EVALUATION_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') || 'Invalid number literal input',
          ['Provide a value parameter', 'Ensure value is a number']
        );
      }

      if (!Number.isFinite((parsed.data as NumberLiteralInput).value)) {
        return this.validationFailure('invalid-argument', 'Number literal value must be finite', [
          'Use finite numbers only',
          'Avoid Infinity and NaN values',
        ]);
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }
}

// ============================================================================
// Enhanced Boolean Literal Expression
// ============================================================================

export class BooleanLiteralExpression extends BaseExpressionImpl<BooleanLiteralInput, boolean> {
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
        this.trackSimple(context, startTime, false);
        return this.failure<boolean>(
          'ValidationError',
          'validation-error',
          validation.errors.map(e => e.message).join(', '),
          'VALIDATION_FAILED',
          validation.suggestions
        );
      }

      this.trackSimple(context, startTime, true, input.value);
      return this.success(input.value, 'boolean');
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return this.failure<boolean>(
        'BooleanEvaluationError',
        'runtime-error',
        `Boolean literal evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        'BOOLEAN_EVALUATION_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') ||
            'Invalid boolean literal input',
          ['Provide a value parameter', 'Ensure value is a boolean']
        );
      }
      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }
}

// ============================================================================
// Addition Expression
// ============================================================================

export class AdditionExpression extends BaseExpressionImpl<BinaryOperationInput, number> {
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
        this.trackSimple(context, startTime, false);
        return this.failure<number>(
          'ValidationError',
          'validation-error',
          validation.errors.map(e => e.message).join(', '),
          'VALIDATION_FAILED',
          validation.suggestions
        );
      }

      // Use shared toNumber primitive for consistent number conversion
      const leftNum = toNumber(input.left, 'left operand');
      const rightNum = toNumber(input.right, 'right operand');
      const result = leftNum + rightNum;

      this.trackSimple(context, startTime, true, result);
      return this.success(result, 'number');
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return this.failure<number>(
        'AdditionError',
        'runtime-error',
        `Addition failed: ${error instanceof Error ? error.message : String(error)}`,
        'ADDITION_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') || 'Invalid addition input',
          ['Provide left and right operands']
        );
      }
      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }
}

// ============================================================================
// Enhanced String Concatenation Expression
// ============================================================================

export class StringConcatenationExpression extends BaseExpressionImpl<
  BinaryOperationInput,
  string
> {
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
        this.trackSimple(context, startTime, false);
        return this.failure<string>(
          'ValidationError',
          'validation-error',
          validation.errors[0]?.message || 'Invalid input',
          'STRING_CONCATENATION_VALIDATION_FAILED',
          validation.suggestions
        );
      }

      // Convert both operands to strings
      const leftStr = this.convertToString(input.left);
      const rightStr = this.convertToString(input.right);
      const result = leftStr + rightStr;

      this.trackSimple(context, startTime, true, result);
      return this.success(result, 'string');
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return this.failure<string>(
        'StringConcatenationError',
        'runtime-error',
        error instanceof Error ? error.message : 'String concatenation failed',
        'STRING_CONCATENATION_ERROR',
        ['Check that operands can be converted to strings']
      );
    }
  }

  validate(input: unknown): ValidationResult {
    const parsed = BinaryOperationInputSchema.safeParse(input);
    if (!parsed.success) {
      return this.validationFailure(
        'type-mismatch',
        parsed.error?.errors.map(err => err.message).join(', ') ||
          'Invalid string concatenation input',
        ['Provide left and right operands for concatenation']
      );
    }
    return this.validationSuccess();
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
}

// ============================================================================
// Multiplication Expression
// ============================================================================

export class MultiplicationExpression extends BaseExpressionImpl<BinaryOperationInput, number> {
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
        this.trackSimple(context, startTime, false);
        return this.failure<number>(
          'ValidationError',
          'validation-error',
          validation.errors.map(e => e.message).join(', '),
          'VALIDATION_FAILED',
          validation.suggestions
        );
      }

      // Use shared toNumber primitive for consistent number conversion
      const leftNum = toNumber(input.left, 'left operand');
      const rightNum = toNumber(input.right, 'right operand');
      const result = leftNum * rightNum;

      this.trackSimple(context, startTime, true, result);
      return this.success(result, 'number');
    } catch (error) {
      this.trackSimple(context, startTime, false);
      return this.failure<number>(
        'MultiplicationError',
        'runtime-error',
        `Multiplication failed: ${error instanceof Error ? error.message : String(error)}`,
        'MULTIPLICATION_FAILED'
      );
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return this.validationFailure(
          'type-mismatch',
          parsed.error?.errors.map(err => err.message).join(', ') || 'Invalid multiplication input',
          ['Provide left and right operands']
        );
      }
      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
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

export type SpecialExpressionName = keyof typeof specialExpressions;
