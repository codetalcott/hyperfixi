/**
 * Positional Expressions for HyperScript
 * Provides deep TypeScript integration for positional navigation expressions
 *
 * Refactored to use BaseExpressionImpl for reduced bundle size (~4 KB savings)
 * Uses centralized type-helpers for consistent type checking.
 */

import { v } from '../../../validation/lightweight-validators';
import type {
  TypedExpressionContext,
  EvaluationType,
  ValidationResult,
  EvaluationResult,
} from '../../../types/base-types';
import { evaluationToHyperScriptType } from '../../../types/base-types';
import type {
  TypedExpressionImplementation,
  ExpressionMetadata,
  ExpressionCategory,
} from '../../../types/expression-types';
import { BaseExpressionImpl } from '../../base-expression';
import { isString, isNumber, isBoolean } from '../../type-helpers';

// ============================================================================
// Input Schemas
// ============================================================================

const CollectionInputSchema = v
  .object({
    collection: v.unknown().describe('Collection to operate on (array, NodeList, or string)'),
  })
  .strict();

const IndexInputSchema = v
  .object({
    collection: v.unknown().describe('Collection to access'),
    index: v.number().describe('Index position to access'),
  })
  .strict();

const RandomInputSchema = v
  .object({
    collection: v.unknown().describe('Collection to select random item from'),
  })
  .strict();

type CollectionInput = any; // Inferred from RuntimeValidator
type IndexInput = any; // Inferred from RuntimeValidator
type RandomInput = any; // Inferred from RuntimeValidator

// ============================================================================
// First Expression
// ============================================================================

export class FirstExpression
  extends BaseExpressionImpl<CollectionInput, unknown>
  implements TypedExpressionImplementation<CollectionInput, unknown>
{
  public readonly name = 'first';
  public readonly category: ExpressionCategory = 'Positional';
  public readonly syntax = 'first in collection';
  public readonly description = 'Gets the first element from a collection';
  public readonly inputSchema = CollectionInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: CollectionInput
  ): Promise<EvaluationResult<unknown>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      const collection = this.normalizeCollection(input.collection);
      const value = collection.length > 0 ? collection[0] : undefined;
      const result: EvaluationResult<unknown> = {
        success: true,
        value,
        type: evaluationToHyperScriptType[this.inferResultTypeLocal(value)],
      };

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<unknown>(
        'FirstExpressionError',
        'runtime-error',
        `First operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'FIRST_OPERATION_FAILED'
      );
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
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
              message: `Invalid first input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide a collection parameter',
            'Ensure collection is array, NodeList, or string',
          ],
        };
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }

  // Uses inherited normalizeCollection() and inferType() from BaseExpressionImpl

  private inferResultTypeLocal(value: unknown): EvaluationType {
    if (value === undefined) return 'Undefined';
    if (value === null) return 'Null';
    if (isString(value)) return 'String';
    if (isNumber(value)) return 'Number';
    if (isBoolean(value)) return 'Boolean';
    if (Array.isArray(value)) return 'Array';
    if (value instanceof HTMLElement) return 'Element';
    return 'Object';
  }
}

// ============================================================================
// Last Expression
// ============================================================================

export class LastExpression
  extends BaseExpressionImpl<CollectionInput, unknown>
  implements TypedExpressionImplementation<CollectionInput, unknown>
{
  public readonly name = 'last';
  public readonly category: ExpressionCategory = 'Positional';
  public readonly syntax = 'last in collection';
  public readonly description = 'Gets the last element from a collection';
  public readonly inputSchema = CollectionInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: CollectionInput
  ): Promise<EvaluationResult<unknown>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      const collection = this.normalizeCollection(input.collection);
      const value = collection.length > 0 ? collection[collection.length - 1] : undefined;
      const result: EvaluationResult<unknown> = {
        success: true,
        value,
        type: evaluationToHyperScriptType[this.inferResultTypeLocal(value)],
      };

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<unknown>(
        'LastExpressionError',
        'runtime-error',
        `Last operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'LAST_OPERATION_FAILED'
      );
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
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
              message: `Invalid last input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide a collection parameter',
            'Ensure collection is array, NodeList, or string',
          ],
        };
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }

  // Uses inherited normalizeCollection() from BaseExpressionImpl

  private inferResultTypeLocal(value: unknown): EvaluationType {
    if (value === undefined) return 'Undefined';
    if (value === null) return 'Null';
    if (isString(value)) return 'String';
    if (isNumber(value)) return 'Number';
    if (isBoolean(value)) return 'Boolean';
    if (Array.isArray(value)) return 'Array';
    if (value instanceof HTMLElement) return 'Element';
    return 'Object';
  }
}

// ============================================================================
// At Expression (Index Access)
// ============================================================================

export class AtExpression
  extends BaseExpressionImpl<IndexInput, unknown>
  implements TypedExpressionImplementation<IndexInput, unknown>
{
  public readonly name = 'at';
  public readonly category: ExpressionCategory = 'Positional';
  public readonly syntax = 'collection[index] or collection at index';
  public readonly description = 'Gets element at specific index from a collection';
  public readonly inputSchema = IndexInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: IndexInput
  ): Promise<EvaluationResult<unknown>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      const collection = this.normalizeCollection(input.collection);
      const index = this.normalizeIndex(input.index, collection.length);

      const value = index >= 0 && index < collection.length ? collection[index] : undefined;
      const result: EvaluationResult<unknown> = {
        success: true,
        value,
        type: evaluationToHyperScriptType[this.inferResultTypeLocal(value)],
      };

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<unknown>(
        'AtExpressionError',
        'runtime-error',
        `At operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'AT_OPERATION_FAILED'
      );
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
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
              message: `Invalid at input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide collection and index parameters', 'Ensure index is a number'],
        };
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }

  // Uses inherited normalizeCollection() from BaseExpressionImpl

  private normalizeIndex(index: number, length: number): number {
    // Handle negative indices
    if (index < 0) {
      return length + index;
    }
    return index;
  }

  private inferResultTypeLocal(value: unknown): EvaluationType {
    if (value === undefined) return 'Undefined';
    if (value === null) return 'Null';
    if (isString(value)) return 'String';
    if (isNumber(value)) return 'Number';
    if (isBoolean(value)) return 'Boolean';
    if (Array.isArray(value)) return 'Array';
    if (value instanceof HTMLElement) return 'Element';
    return 'Object';
  }
}

// ============================================================================
// Random Expression
// ============================================================================

export class RandomExpression
  extends BaseExpressionImpl<RandomInput, unknown>
  implements TypedExpressionImplementation<RandomInput, unknown>
{
  public readonly name = 'random';
  public readonly category: ExpressionCategory = 'Positional';
  public readonly syntax = 'random in collection';
  public readonly description = 'Gets a random element from a collection';
  public readonly inputSchema = RandomInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
  };

  async evaluate(
    context: TypedExpressionContext,
    input: RandomInput
  ): Promise<EvaluationResult<unknown>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors[0],
        };
      }

      const collection = this.normalizeCollection(input.collection);

      if (collection.length === 0) {
        const emptyResult: EvaluationResult<unknown> = {
          success: true,
          value: undefined,
          type: 'undefined',
        };
        this.trackPerformance(context, input, emptyResult, startTime);
        return emptyResult;
      }

      const randomIndex = this.getSecureRandomIndex(collection.length);
      const value = collection[randomIndex];
      const result: EvaluationResult<unknown> = {
        success: true,
        value,
        type: evaluationToHyperScriptType[this.inferResultTypeLocal(value)],
      };

      this.trackPerformance(context, input, result, startTime);
      return result;
    } catch (error) {
      const errorResult = this.failure<unknown>(
        'RandomExpressionError',
        'runtime-error',
        `Random operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'RANDOM_OPERATION_FAILED'
      );
      this.trackPerformance(context, input, errorResult, startTime);
      return errorResult;
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
              message: `Invalid random input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide a collection parameter',
            'Ensure collection is array, NodeList, or string',
          ],
        };
      }

      return this.validationSuccess();
    } catch (_error) {
      return this.validationFailure('runtime-error', 'Validation failed with exception', [
        'Check input structure and types',
      ]);
    }
  }

  // Uses inherited normalizeCollection() from BaseExpressionImpl

  private getSecureRandomIndex(length: number): number {
    // Use crypto.getRandomValues if available for better randomness
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] % length;
    }

    // Fallback to Math.random
    return Math.floor(Math.random() * length);
  }

  private inferResultTypeLocal(value: unknown): EvaluationType {
    if (value === undefined) return 'Undefined';
    if (value === null) return 'Null';
    if (isString(value)) return 'String';
    if (isNumber(value)) return 'Number';
    if (isBoolean(value)) return 'Boolean';
    if (Array.isArray(value)) return 'Array';
    if (value instanceof HTMLElement) return 'Element';
    return 'Object';
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createFirstExpression(): FirstExpression {
  return new FirstExpression();
}

export function createLastExpression(): LastExpression {
  return new LastExpression();
}

export function createAtExpression(): AtExpression {
  return new AtExpression();
}

export function createRandomExpression(): RandomExpression {
  return new RandomExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const positionalExpressions = {
  first: createFirstExpression(),
  last: createLastExpression(),
  at: createAtExpression(),
  random: createRandomExpression(),
} as const;

export type PositionalExpressionName = keyof typeof positionalExpressions;
