/**
 * Positional Expressions for HyperScript
 * Provides deep TypeScript integration for positional navigation expressions
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
      const result = collection.length > 0 ? collection[0] : undefined;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: evaluationToHyperScriptType[this.inferResultType(result)],
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `First operation failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid first input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide a collection parameter',
            'Ensure collection is array, NodeList, or string',
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

  private normalizeCollection(collection: unknown): unknown[] {
    if (Array.isArray(collection)) {
      return collection;
    }
    if (collection instanceof NodeList) {
      return Array.from(collection);
    }
    if (typeof collection === 'string') {
      return collection.split('');
    }
    if (collection == null) {
      return [];
    }
    // Try to iterate other iterable objects
    if (typeof collection === 'object' && Symbol.iterator in collection) {
      return Array.from(collection as Iterable<unknown>);
    }
    return [];
  }

  private inferResultType(result: unknown): EvaluationType {
    if (result === undefined) return 'Undefined';
    if (result === null) return 'Null';
    if (typeof result === 'string') return 'String';
    if (typeof result === 'number') return 'Number';
    if (typeof result === 'boolean') return 'Boolean';
    if (Array.isArray(result)) return 'Array';
    if (result instanceof HTMLElement) return 'Element';
    return 'Object';
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
        input: 'first operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Last Expression
// ============================================================================

export class LastExpression
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
      const result = collection.length > 0 ? collection[collection.length - 1] : undefined;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: evaluationToHyperScriptType[this.inferResultType(result)],
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Last operation failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid last input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide a collection parameter',
            'Ensure collection is array, NodeList, or string',
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

  private normalizeCollection(collection: unknown): unknown[] {
    if (Array.isArray(collection)) {
      return collection;
    }
    if (collection instanceof NodeList) {
      return Array.from(collection);
    }
    if (typeof collection === 'string') {
      return collection.split('');
    }
    if (collection == null) {
      return [];
    }
    if (typeof collection === 'object' && Symbol.iterator in collection) {
      return Array.from(collection as Iterable<unknown>);
    }
    return [];
  }

  private inferResultType(result: unknown): EvaluationType {
    if (result === undefined) return 'Undefined';
    if (result === null) return 'Null';
    if (typeof result === 'string') return 'String';
    if (typeof result === 'number') return 'Number';
    if (typeof result === 'boolean') return 'Boolean';
    if (Array.isArray(result)) return 'Array';
    if (result instanceof HTMLElement) return 'Element';
    return 'Object';
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
        input: 'last operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// At Expression (Index Access)
// ============================================================================

export class AtExpression implements TypedExpressionImplementation<IndexInput, unknown> {
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

      const result = index >= 0 && index < collection.length ? collection[index] : undefined;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: evaluationToHyperScriptType[this.inferResultType(result)],
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `At operation failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid at input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: ['Provide collection and index parameters', 'Ensure index is a number'],
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

  private normalizeCollection(collection: unknown): unknown[] {
    if (Array.isArray(collection)) {
      return collection;
    }
    if (collection instanceof NodeList) {
      return Array.from(collection);
    }
    if (typeof collection === 'string') {
      return collection.split('');
    }
    if (collection == null) {
      return [];
    }
    if (typeof collection === 'object' && Symbol.iterator in collection) {
      return Array.from(collection as Iterable<unknown>);
    }
    return [];
  }

  private normalizeIndex(index: number, length: number): number {
    // Handle negative indices
    if (index < 0) {
      return length + index;
    }
    return index;
  }

  private inferResultType(result: unknown): EvaluationType {
    if (result === undefined) return 'Undefined';
    if (result === null) return 'Null';
    if (typeof result === 'string') return 'String';
    if (typeof result === 'number') return 'Number';
    if (typeof result === 'boolean') return 'Boolean';
    if (Array.isArray(result)) return 'Array';
    if (result instanceof HTMLElement) return 'Element';
    return 'Object';
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
        input: 'at operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Random Expression
// ============================================================================

export class RandomExpression
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
        this.trackPerformance(context, startTime, true, undefined);
        return {
          success: true,
          value: undefined,
          type: 'undefined',
        };
      }

      const randomIndex = this.getSecureRandomIndex(collection.length);
      const result = collection[randomIndex];

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: evaluationToHyperScriptType[this.inferResultType(result)],
      };
    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Random operation failed: ${error instanceof Error ? error.message : String(error)}`,
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
              message: `Invalid random input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide a collection parameter',
            'Ensure collection is array, NodeList, or string',
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

  private normalizeCollection(collection: unknown): unknown[] {
    if (Array.isArray(collection)) {
      return collection;
    }
    if (collection instanceof NodeList) {
      return Array.from(collection);
    }
    if (typeof collection === 'string') {
      return collection.split('');
    }
    if (collection == null) {
      return [];
    }
    if (typeof collection === 'object' && Symbol.iterator in collection) {
      return Array.from(collection as Iterable<unknown>);
    }
    return [];
  }

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

  private inferResultType(result: unknown): EvaluationType {
    if (result === undefined) return 'Undefined';
    if (result === null) return 'Null';
    if (typeof result === 'string') return 'String';
    if (typeof result === 'number') return 'Number';
    if (typeof result === 'boolean') return 'Boolean';
    if (Array.isArray(result)) return 'Array';
    if (result instanceof HTMLElement) return 'Element';
    return 'Object';
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
        input: 'random operation',
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

export function createFirstExpression(): EnhancedFirstExpression {
  return new EnhancedFirstExpression();
}

export function createLastExpression(): EnhancedLastExpression {
  return new EnhancedLastExpression();
}

export function createAtExpression(): EnhancedAtExpression {
  return new EnhancedAtExpression();
}

export function createRandomExpression(): EnhancedRandomExpression {
  return new EnhancedRandomExpression();
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
