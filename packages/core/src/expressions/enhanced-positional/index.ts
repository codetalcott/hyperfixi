

/**
 * Enhanced Positional Expressions for HyperScript
 * Provides deep TypeScript integration for positional navigation expressions
 */

import { v } from '../../validation/lightweight-validators';
import type {
  TypedExpressionContext,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
  LLMDocumentation,
  EvaluationResult
} from '../../types/base-types';
import type { TypedExpressionImplementation } from '../../types/enhanced-expressions';
import { evaluationToHyperScriptType } from '../../types/base-types';
import type { ExpressionCategory } from '../../types/enhanced-expressions';

// ============================================================================
// Input Schemas
// ============================================================================

const CollectionInputSchema = v.object({
  collection: v.unknown().describe('Collection to operate on (array, NodeList, or string)')
}).strict();

const IndexInputSchema = v.object({
  collection: v.unknown().describe('Collection to access'),
  index: v.number().describe('Index position to access')
}).strict();

const RandomInputSchema = v.object({
  collection: v.unknown().describe('Collection to select random item from')
}).strict();

type CollectionInput = any; // Inferred from RuntimeValidator
type IndexInput = any; // Inferred from RuntimeValidator
type RandomInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced First Expression
// ============================================================================

export class EnhancedFirstExpression implements TypedExpressionImplementation<CollectionInput, unknown> {
  public readonly name = 'first';
  public readonly category: ExpressionCategory = 'Positional';
  public readonly syntax = 'first in collection';
  public readonly description = 'Gets the first element from a collection';
  public readonly inputSchema = CollectionInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any'],
    examples: [
      {
        input: 'first in [1, 2, 3]',
        description: 'Get first element from array',
        expectedOutput: 1
      },
      {
        input: 'first in <div/>',
        description: 'Get first element from NodeList',
        expectedOutput: 'HTMLElement'
      },
      {
        input: 'first in "hello"',
        description: 'Get first character from string',
        expectedOutput: 'h'
      }
    ],
    relatedExpressions: ['last', 'at', 'slice'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Retrieves the first element from a collection (array, NodeList, or string)',
    parameters: [
      {
        name: 'collection',
        type: 'array | NodeList | string',
        description: 'Collection to get first element from',
        optional: false,
        examples: ['[1, 2, 3]', 'document.querySelectorAll("div")', '"hello"', 'items']
      }
    ],
    returns: {
      type: 'any',
      description: 'First element of collection, or undefined if empty',
      examples: ['1', 'HTMLElement', '"h"', 'undefined']
    },
    examples: [
      {
        title: 'Array first element',
        code: 'first in [1, 2, 3]',
        explanation: 'Get first number from array',
        output: '1'
      },
      {
        title: 'DOM element selection',
        code: 'first in <.item/>',
        explanation: 'Get first element matching CSS selector',
        output: 'HTMLElement'
      },
      {
        title: 'String first character',
        code: 'first in "hello world"',
        explanation: 'Get first character of string',
        output: '"h"'
      },
      {
        title: 'Empty collection handling',
        code: 'first in []',
        explanation: 'Returns undefined for empty collections',
        output: 'undefined'
      }
    ],
    seeAlso: ['last', 'at', 'slice', 'random'],
    tags: ['positional', 'array', 'collection', 'navigation', 'first']
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
          error: validation.errors[0]
        };
      }

      const collection = this.normalizeCollection(input.collection);
      const result = collection.length > 0 ? collection[0] : undefined;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: evaluationToHyperScriptType[this.inferResultType(result)]
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `First operation failed: ${error instanceof Error ? error.message : String(error)}`
        },
        suggestions: [
          'Ensure collection is array, NodeList, or string',
          'Check that collection is not null or undefined'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid first input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide a collection parameter',
            'Ensure collection is array, NodeList, or string'
          ]
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: []
      };

    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types']
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

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'first operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Last Expression
// ============================================================================

export class EnhancedLastExpression implements TypedExpressionImplementation<CollectionInput, unknown> {
  public readonly name = 'last';
  public readonly category: ExpressionCategory = 'Positional';
  public readonly syntax = 'last in collection';
  public readonly description = 'Gets the last element from a collection';
  public readonly inputSchema = CollectionInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any'],
    examples: [
      {
        input: 'last in [1, 2, 3]',
        description: 'Get last element from array',
        expectedOutput: 3
      },
      {
        input: 'last in "hello"',
        description: 'Get last character from string',
        expectedOutput: 'o'
      }
    ],
    relatedExpressions: ['first', 'at', 'slice'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Returns the last element from a collection (array, NodeList, or string)',
    parameters: [
      {
        name: 'collection',
        type: 'array | NodeList | string',
        description: 'Collection to get last element from',
        optional: false,
        examples: ['[1, 2, 3]', 'document.querySelectorAll("div")', '"hello"']
      }
    ],
    returns: {
      type: 'any',
      description: 'Last element of collection, or undefined if empty',
      examples: ['3', 'HTMLElement', '"o"', 'undefined']
    },
    examples: [
      {
        title: 'Array last element',
        code: 'last in [1, 2, 3]',
        explanation: 'Get last number from array',
        output: '3'
      },
      {
        title: 'String last character',
        code: 'last in "hello"',
        explanation: 'Get last character of string',
        output: '"o"'
      },
      {
        title: 'DOM elements',
        code: 'last in <.item/>',
        explanation: 'Get last element matching selector',
        output: 'HTMLElement'
      }
    ],
    seeAlso: ['first', 'at', 'slice', 'random'],
    tags: ['positional', 'array', 'collection', 'navigation', 'last']
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
          error: validation.errors[0]
        };
      }

      const collection = this.normalizeCollection(input.collection);
      const result = collection.length > 0 ? collection[collection.length - 1] : undefined;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: evaluationToHyperScriptType[this.inferResultType(result)]
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Last operation failed: ${error instanceof Error ? error.message : String(error)}`
        },
        suggestions: [
          'Ensure collection is array, NodeList, or string',
          'Check that collection is not null or undefined'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid last input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide a collection parameter',
            'Ensure collection is array, NodeList, or string'
          ]
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: []
      };

    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types']
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

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'last operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced At Expression (Index Access)
// ============================================================================

export class EnhancedAtExpression implements TypedExpressionImplementation<IndexInput, unknown> {
  public readonly name = 'at';
  public readonly category: ExpressionCategory = 'Positional';
  public readonly syntax = 'collection[index] or collection at index';
  public readonly description = 'Gets element at specific index from a collection';
  public readonly inputSchema = IndexInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any'],
    examples: [
      {
        input: '[1, 2, 3] at 1',
        description: 'Get element at index 1',
        expectedOutput: 2
      },
      {
        input: '"hello" at 0',
        description: 'Get character at index 0',
        expectedOutput: 'h'
      }
    ],
    relatedExpressions: ['first', 'last', 'slice'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Retrieves element at specific index from a collection with negative index support',
    parameters: [
      {
        name: 'collection',
        type: 'array | NodeList | string',
        description: 'Collection to access',
        optional: false,
        examples: ['[1, 2, 3]', '"hello"', 'items']
      },
      {
        name: 'index',
        type: 'number',
        description: 'Index position (supports negative indexing)',
        optional: false,
        examples: ['0', '1', '-1', '-2']
      }
    ],
    returns: {
      type: 'any',
      description: 'Element at specified index, or undefined if out of bounds',
      examples: ['2', '"h"', 'HTMLElement', 'undefined']
    },
    examples: [
      {
        title: 'Positive index',
        code: '[1, 2, 3] at 1',
        explanation: 'Get second element (index 1)',
        output: '2'
      },
      {
        title: 'Negative index',
        code: '[1, 2, 3] at -1',
        explanation: 'Get last element using negative index',
        output: '3'
      },
      {
        title: 'String character access',
        code: '"hello" at 0',
        explanation: 'Get first character of string',
        output: '"h"'
      },
      {
        title: 'Out of bounds',
        code: '[1, 2] at 5',
        explanation: 'Returns undefined for invalid index',
        output: 'undefined'
      }
    ],
    seeAlso: ['first', 'last', 'slice', 'length'],
    tags: ['positional', 'array', 'index', 'access', 'negative-index']
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
          error: validation.errors[0]
        };
      }

      const collection = this.normalizeCollection(input.collection);
      const index = this.normalizeIndex(input.index, collection.length);
      
      const result = (index >= 0 && index < collection.length) ? collection[index] : undefined;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: evaluationToHyperScriptType[this.inferResultType(result)]
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `At operation failed: ${error instanceof Error ? error.message : String(error)}`
        },
        suggestions: [
          'Ensure collection is array, NodeList, or string',
          'Check that index is a valid number',
          'Verify index is within collection bounds'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid at input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide collection and index parameters',
            'Ensure index is a number'
          ]
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: []
      };

    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types']
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

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'at operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Random Expression
// ============================================================================

export class EnhancedRandomExpression implements TypedExpressionImplementation<RandomInput, unknown> {
  public readonly name = 'random';
  public readonly category: ExpressionCategory = 'Positional';
  public readonly syntax = 'random in collection';
  public readonly description = 'Gets a random element from a collection';
  public readonly inputSchema = RandomInputSchema;
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
    sideEffects: ['random-generation'],
    dependencies: [],
    returnTypes: ['Any'],
    examples: [
      {
        input: 'random in [1, 2, 3]',
        description: 'Get random element from array',
        expectedOutput: 'random number 1-3'
      },
      {
        input: 'random in "abc"',
        description: 'Get random character from string',
        expectedOutput: 'random character a-c'
      }
    ],
    relatedExpressions: ['first', 'last', 'at'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Selects a random element from a collection using cryptographically secure randomness when available',
    parameters: [
      {
        name: 'collection',
        type: 'array | NodeList | string',
        description: 'Collection to select random element from',
        optional: false,
        examples: ['[1, 2, 3]', '"abc"', 'items', 'document.querySelectorAll("div")']
      }
    ],
    returns: {
      type: 'any',
      description: 'Random element from collection, or undefined if empty',
      examples: ['2', '"b"', 'HTMLElement', 'undefined']
    },
    examples: [
      {
        title: 'Random array element',
        code: 'random in [1, 2, 3, 4, 5]',
        explanation: 'Get random number from array',
        output: 'random number 1-5'
      },
      {
        title: 'Random character',
        code: 'random in "abcdef"',
        explanation: 'Get random character from string',
        output: 'random character a-f'
      },
      {
        title: 'Random DOM element',
        code: 'random in <.item/>',
        explanation: 'Get random element matching selector',
        output: 'random HTMLElement'
      },
      {
        title: 'Empty collection',
        code: 'random in []',
        explanation: 'Returns undefined for empty collections',
        output: 'undefined'
      }
    ],
    seeAlso: ['first', 'last', 'at', 'shuffle'],
    tags: ['positional', 'random', 'selection', 'array', 'collection']
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
          error: validation.errors[0]
        };
      }

      const collection = this.normalizeCollection(input.collection);
      
      if (collection.length === 0) {
        this.trackPerformance(context, startTime, true, undefined);
        return {
          success: true,
          value: undefined,
          type: 'undefined'
        };
      }

      const randomIndex = this.getSecureRandomIndex(collection.length);
      const result = collection[randomIndex];

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: evaluationToHyperScriptType[this.inferResultType(result)]
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Random operation failed: ${error instanceof Error ? error.message : String(error)}`
        },
        suggestions: [
          'Ensure collection is array, NodeList, or string',
          'Check that collection is not null or undefined'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid random input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide a collection parameter',
            'Ensure collection is array, NodeList, or string'
          ]
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: []
      };

    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: []
        },
        suggestions: ['Check input structure and types']
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

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'random operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createEnhancedFirstExpression(): EnhancedFirstExpression {
  return new EnhancedFirstExpression();
}

export function createEnhancedLastExpression(): EnhancedLastExpression {
  return new EnhancedLastExpression();
}

export function createEnhancedAtExpression(): EnhancedAtExpression {
  return new EnhancedAtExpression();
}

export function createEnhancedRandomExpression(): EnhancedRandomExpression {
  return new EnhancedRandomExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const enhancedPositionalExpressions = {
  first: createEnhancedFirstExpression(),
  last: createEnhancedLastExpression(),
  at: createEnhancedAtExpression(),
  random: createEnhancedRandomExpression()
} as const;

export type EnhancedPositionalExpressionName = keyof typeof enhancedPositionalExpressions;