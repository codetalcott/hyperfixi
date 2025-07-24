/**
 * Enhanced Positional Expressions for HyperScript
 * Provides deep TypeScript integration for positional navigation with comprehensive validation
 */

import { z } from 'zod';
import type { 
  TypedExpressionContext, 
  TypedResult,
  ExpressionMetadata,
  LLMDocumentation,
  ValidationResult,
  BaseTypedExpression
} from '../../types/enhanced-expressions.ts';

// ============================================================================
// Enhanced Positional Expression Types
// ============================================================================

/**
 * Supported collection types for positional operations
 */
export type PositionalCollection = 
  | unknown[]
  | NodeList
  | HTMLCollection
  | HTMLElement
  | string
  | { length: number; [key: number]: unknown };

/**
 * DOM traversal directions for navigation expressions
 */
export type TraversalDirection = 'next' | 'previous';

/**
 * Enhanced positional operation result
 */
export interface PositionalOperationResult<T = unknown> {
  value: T;
  index: number;
  collection: PositionalCollection;
  metadata: {
    collectionType: string;
    collectionLength: number;
    operation: string;
  };
}

// ============================================================================
// Enhanced First Expression Implementation
// ============================================================================

/**
 * Input schema for the 'first' positional expression
 */
const FirstExpressionInputSchema = z.object({
  collection: z.unknown().optional()
});

/**
 * Enhanced implementation of the 'first' positional expression
 */
export class EnhancedFirstExpression implements BaseTypedExpression<unknown> {
  readonly name = 'first';
  readonly category = 'Positional';
  readonly syntax = 'first [of collection]';
  readonly outputType = 'Any';
  readonly inputSchema = FirstExpressionInputSchema;

  readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any', 'Null'],
    examples: [
      {
        input: 'first of [1, 2, 3]',
        description: 'Get first element from array',
        expectedOutput: 1
      },
      {
        input: 'first of it',
        description: 'Get first element from context collection',
        expectedOutput: '<first-item>',
        context: { it: ['item1', 'item2', 'item3'] }
      },
      {
        input: 'first',
        description: 'Get first element from context.it',
        expectedOutput: '<first-element>',
        context: { it: document.querySelectorAll('.items') }
      },
      {
        input: 'first of element',
        description: 'Get first child element',
        expectedOutput: '<first-child>',
        context: { element: '<div with children>' }
      }
    ],
    relatedExpressions: ['last', 'at', 'next', 'previous'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  readonly documentation: LLMDocumentation = {
    summary: 'Returns the first element from a collection, array, NodeList, or DOM element children',
    parameters: [
      {
        name: 'collection',
        type: 'any',
        description: 'Collection to get first element from (optional, defaults to context.it)',
        optional: true,
        examples: ['[1, 2, 3]', 'document.querySelectorAll(".items")', 'element', '"hello"']
      }
    ],
    returns: {
      type: 'any',
      description: 'First element from collection or null if empty/invalid',
      examples: [1, 'first item', document.createElement('div'), 'h', null]
    },
    examples: [
      {
        title: 'Array first element',
        code: 'put first of [10, 20, 30] into result',
        explanation: 'Get first element from array literal',
        output: 10
      },
      {
        title: 'NodeList first element',
        code: 'put first of <button/> into firstButton',
        explanation: 'Get first button element from page',
        output: 'HTMLButtonElement'
      },
      {
        title: 'String first character',
        code: 'if first of my.value is "A" then proceed',
        explanation: 'Check if input starts with letter A',
        output: 'A'
      },
      {
        title: 'DOM children first',
        code: 'put first of closest <ul/> into firstItem',
        explanation: 'Get first child element of list',
        output: 'HTMLLIElement'
      },
      {
        title: 'Context collection first',
        code: 'put first into selected',
        explanation: 'Get first element from context.it collection',
        output: 'varies'
      }
    ],
    seeAlso: ['last', 'at', 'next', 'previous', 'children'],
    tags: ['positional', 'navigation', 'collection', 'array', 'dom']
  };

  async evaluate(context: TypedExpressionContext, input: { collection?: unknown }): Promise<TypedResult<unknown>> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'FirstExpressionValidationError',
            message: validation.errors[0]?.message || 'Invalid input',
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
        };
      }

      const { collection } = input;
      const target = collection !== undefined ? collection : context.it;

      // Handle null/undefined
      if (target == null) {
        const result = { success: true as const, value: null, type: 'null' as const };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle arrays
      if (Array.isArray(target)) {
        const value = target.length > 0 ? target[0] : null;
        const result = { success: true as const, value, type: value == null ? 'null' : typeof value };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle NodeList or HTMLCollection
      if (target instanceof NodeList || target instanceof HTMLCollection) {
        const value = target.length > 0 ? target[0] : null;
        const result = { success: true as const, value, type: value ? 'element' : 'null' };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle DOM element - get first child element
      if (target instanceof Element) {
        const value = target.children.length > 0 ? target.children[0] : null;
        const result = { success: true as const, value, type: value ? 'element' : 'null' };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle string
      if (typeof target === 'string') {
        const value = target.length > 0 ? target[0] : null;
        const result = { success: true as const, value, type: value ? 'string' : 'null' };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle object with length property and numeric indexing
      if (typeof target === 'object' && 'length' in target && typeof (target as any).length === 'number') {
        const lengthObj = target as { length: number; [key: number]: unknown };
        const value = lengthObj.length > 0 ? lengthObj[0] : null;
        const result = { success: true as const, value, type: value == null ? 'null' : typeof value };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Unsupported type
      const errorResult = {
        success: false as const,
        error: {
          name: 'UnsupportedCollectionTypeError',
          message: `Cannot get first element from type: ${typeof target}`,
          code: 'UNSUPPORTED_COLLECTION_TYPE',
          suggestions: [
            'Use arrays, NodeList, HTMLCollection, Element, or string',
            'Ensure collection has a length property and numeric indexing',
            'Check if the collection is properly initialized'
          ]
        }
      };
      this.trackEvaluation(context, input, errorResult, startTime);
      return errorResult;

    } catch (error) {
      const errorResult = {
        success: false as const,
        error: {
          name: 'FirstExpressionError',
          message: `First operation failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'FIRST_OPERATION_FAILED',
          suggestions: ['Check collection validity', 'Ensure collection is accessible']
        }
      };
      this.trackEvaluation(context, input, errorResult, startTime);
      return errorResult;
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            path: err.path,
            message: err.message,
            code: err.code
          })),
          suggestions: [
            'Provide optional collection parameter',
            'Check parameter structure: { collection?: any }'
          ]
        };
      }
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        suggestions: ['Check input structure']
      };
    }
  }

  private trackEvaluation(
    context: TypedExpressionContext,
    input: unknown,
    result: TypedResult<unknown>,
    startTime: number
  ): void {
    context.evaluationHistory.push({
      expressionName: this.name,
      category: this.category,
      input,
      output: result.success ? result.value : result.error,
      timestamp: startTime,
      duration: Date.now() - startTime,
      success: result.success
    });
  }
}

// ============================================================================
// Enhanced Last Expression Implementation
// ============================================================================

/**
 * Input schema for the 'last' positional expression
 */
const LastExpressionInputSchema = z.object({
  collection: z.unknown().optional()
});

/**
 * Enhanced implementation of the 'last' positional expression
 */
export class EnhancedLastExpression implements BaseTypedExpression<unknown> {
  readonly name = 'last';
  readonly category = 'Positional';
  readonly syntax = 'last [of collection]';
  readonly outputType = 'Any';
  readonly inputSchema = LastExpressionInputSchema;

  readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any', 'Null'],
    examples: [
      {
        input: 'last of [1, 2, 3]',
        description: 'Get last element from array',
        expectedOutput: 3
      },
      {
        input: 'last of it',
        description: 'Get last element from context collection',
        expectedOutput: '<last-item>',
        context: { it: ['item1', 'item2', 'item3'] }
      },
      {
        input: 'last',
        description: 'Get last element from context.it',
        expectedOutput: '<last-element>',
        context: { it: document.querySelectorAll('.items') }
      },
      {
        input: 'last of element',
        description: 'Get last child element',
        expectedOutput: '<last-child>',
        context: { element: '<div with children>' }
      }
    ],
    relatedExpressions: ['first', 'at', 'next', 'previous'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  readonly documentation: LLMDocumentation = {
    summary: 'Returns the last element from a collection, array, NodeList, or DOM element children',
    parameters: [
      {
        name: 'collection',
        type: 'any',
        description: 'Collection to get last element from (optional, defaults to context.it)',
        optional: true,
        examples: ['[1, 2, 3]', 'document.querySelectorAll(".items")', 'element', '"hello"']
      }
    ],
    returns: {
      type: 'any',
      description: 'Last element from collection or null if empty/invalid',
      examples: [3, 'last item', document.createElement('div'), 'o', null]
    },
    examples: [
      {
        title: 'Array last element',
        code: 'put last of [10, 20, 30] into result',
        explanation: 'Get last element from array literal',
        output: 30
      },
      {
        title: 'NodeList last element',
        code: 'put last of <button/> into lastButton',
        explanation: 'Get last button element from page',
        output: 'HTMLButtonElement'
      },
      {
        title: 'String last character',
        code: 'if last of my.value is "Z" then proceed',
        explanation: 'Check if input ends with letter Z',
        output: 'Z'
      },
      {
        title: 'DOM children last',
        code: 'put last of closest <ul/> into lastItem',
        explanation: 'Get last child element of list',
        output: 'HTMLLIElement'
      },
      {
        title: 'Context collection last',
        code: 'put last into selected',
        explanation: 'Get last element from context.it collection',
        output: 'varies'
      }
    ],
    seeAlso: ['first', 'at', 'next', 'previous', 'children'],
    tags: ['positional', 'navigation', 'collection', 'array', 'dom']
  };

  async evaluate(context: TypedExpressionContext, input: { collection?: unknown }): Promise<TypedResult<unknown>> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'LastExpressionValidationError',
            message: validation.errors[0]?.message || 'Invalid input',
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
        };
      }

      const { collection } = input;
      const target = collection !== undefined ? collection : context.it;

      // Handle null/undefined
      if (target == null) {
        const result = { success: true as const, value: null, type: 'null' as const };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle arrays
      if (Array.isArray(target)) {
        const value = target.length > 0 ? target[target.length - 1] : null;
        const result = { success: true as const, value, type: value == null ? 'null' : typeof value };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle NodeList or HTMLCollection
      if (target instanceof NodeList || target instanceof HTMLCollection) {
        const value = target.length > 0 ? target[target.length - 1] : null;
        const result = { success: true as const, value, type: value ? 'element' : 'null' };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle DOM element - get last child element
      if (target instanceof Element) {
        const children = target.children;
        const value = children.length > 0 ? children[children.length - 1] : null;
        const result = { success: true as const, value, type: value ? 'element' : 'null' };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle string
      if (typeof target === 'string') {
        const value = target.length > 0 ? target[target.length - 1] : null;
        const result = { success: true as const, value, type: value ? 'string' : 'null' };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle object with length property and numeric indexing
      if (typeof target === 'object' && 'length' in target && typeof (target as any).length === 'number') {
        const lengthObj = target as { length: number; [key: number]: unknown };
        const value = lengthObj.length > 0 ? lengthObj[lengthObj.length - 1] : null;
        const result = { success: true as const, value, type: value == null ? 'null' : typeof value };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Unsupported type
      const errorResult = {
        success: false as const,
        error: {
          name: 'UnsupportedCollectionTypeError',
          message: `Cannot get last element from type: ${typeof target}`,
          code: 'UNSUPPORTED_COLLECTION_TYPE',
          suggestions: [
            'Use arrays, NodeList, HTMLCollection, Element, or string',
            'Ensure collection has a length property and numeric indexing',
            'Check if the collection is properly initialized'
          ]
        }
      };
      this.trackEvaluation(context, input, errorResult, startTime);
      return errorResult;

    } catch (error) {
      const errorResult = {
        success: false as const,
        error: {
          name: 'LastExpressionError',
          message: `Last operation failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'LAST_OPERATION_FAILED',
          suggestions: ['Check collection validity', 'Ensure collection is accessible']
        }
      };
      this.trackEvaluation(context, input, errorResult, startTime);
      return errorResult;
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            path: err.path,
            message: err.message,
            code: err.code
          })),
          suggestions: [
            'Provide optional collection parameter',
            'Check parameter structure: { collection?: any }'
          ]
        };
      }
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        suggestions: ['Check input structure']
      };
    }
  }

  private trackEvaluation(
    context: TypedExpressionContext,
    input: unknown,
    result: TypedResult<unknown>,
    startTime: number
  ): void {
    context.evaluationHistory.push({
      expressionName: this.name,
      category: this.category,
      input,
      output: result.success ? result.value : result.error,
      timestamp: startTime,
      duration: Date.now() - startTime,
      success: result.success
    });
  }
}

// ============================================================================
// Enhanced At Expression Implementation
// ============================================================================

/**
 * Input schema for the 'at' positional expression
 */
const AtExpressionInputSchema = z.object({
  index: z.number().int(),
  collection: z.unknown().optional()
});

/**
 * Enhanced implementation of the 'at' positional expression
 */
export class EnhancedAtExpression implements BaseTypedExpression<unknown> {
  readonly name = 'at';
  readonly category = 'Positional';
  readonly syntax = 'at index [of collection]';
  readonly outputType = 'Any';
  readonly inputSchema = AtExpressionInputSchema;

  readonly metadata: ExpressionMetadata = {
    category: 'Positional',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any', 'Null'],
    examples: [
      {
        input: 'at 1 of [1, 2, 3]',
        description: 'Get element at index 1 from array',
        expectedOutput: 2
      },
      {
        input: 'at -1 of [1, 2, 3]',
        description: 'Get last element using negative index',
        expectedOutput: 3
      },
      {
        input: 'at 0 of it',
        description: 'Get first element from context collection',
        expectedOutput: '<first-item>',
        context: { it: ['item1', 'item2', 'item3'] }
      },
      {
        input: 'at 2',
        description: 'Get element at index 2 from context.it',
        expectedOutput: '<third-element>',
        context: { it: document.querySelectorAll('.items') }
      }
    ],
    relatedExpressions: ['first', 'last', 'next', 'previous'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  readonly documentation: LLMDocumentation = {
    summary: 'Returns the element at a specific index from a collection, with support for negative indexing',
    parameters: [
      {
        name: 'index',
        type: 'number',
        description: 'Zero-based index (negative values count from end)',
        optional: false,
        examples: ['0', '1', '-1', '-2']
      },
      {
        name: 'collection',
        type: 'any',
        description: 'Collection to get element from (optional, defaults to context.it)',
        optional: true,
        examples: ['[1, 2, 3]', 'document.querySelectorAll(".items")', 'element', '"hello"']
      }
    ],
    returns: {
      type: 'any',
      description: 'Element at specified index or null if index is out of bounds',
      examples: [2, 'item at index', document.createElement('div'), 'l', null]
    },
    examples: [
      {
        title: 'Array element by index',
        code: 'put at 1 of [10, 20, 30] into result',
        explanation: 'Get second element (index 1) from array',
        output: 20
      },
      {
        title: 'Negative index access',
        code: 'put at -1 of items into lastItem',
        explanation: 'Get last element using negative index',
        output: 'last item'
      },
      {
        title: 'NodeList element by index',
        code: 'put at 0 of <button/> into firstButton',
        explanation: 'Get first button element from page',
        output: 'HTMLButtonElement'
      },
      {
        title: 'String character by index',
        code: 'if at 0 of my.value is "A" then proceed',
        explanation: 'Check first character of input',
        output: 'A'
      },
      {
        title: 'DOM children by index',
        code: 'put at 2 of closest <ul/> into thirdItem',
        explanation: 'Get third child element of list',
        output: 'HTMLLIElement'
      }
    ],
    seeAlso: ['first', 'last', 'next', 'previous', 'slice'],
    tags: ['positional', 'navigation', 'collection', 'array', 'dom', 'indexing']
  };

  async evaluate(context: TypedExpressionContext, input: { index: number; collection?: unknown }): Promise<TypedResult<unknown>> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'AtExpressionValidationError',
            message: validation.errors[0]?.message || 'Invalid input',
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
        };
      }

      const { index, collection } = input;
      const target = collection !== undefined ? collection : context.it;

      // Handle null/undefined
      if (target == null) {
        const result = { success: true as const, value: null, type: 'null' as const };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle arrays
      if (Array.isArray(target)) {
        const actualIndex = index < 0 ? target.length + index : index;
        const value = actualIndex >= 0 && actualIndex < target.length ? target[actualIndex] : null;
        const result = { success: true as const, value, type: value == null ? 'null' : typeof value };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle NodeList or HTMLCollection
      if (target instanceof NodeList || target instanceof HTMLCollection) {
        const actualIndex = index < 0 ? target.length + index : index;
        const value = actualIndex >= 0 && actualIndex < target.length ? target[actualIndex] : null;
        const result = { success: true as const, value, type: value ? 'element' : 'null' };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle DOM element - get nth child element
      if (target instanceof Element) {
        const children = target.children;
        const actualIndex = index < 0 ? children.length + index : index;
        const value = actualIndex >= 0 && actualIndex < children.length ? children[actualIndex] : null;
        const result = { success: true as const, value, type: value ? 'element' : 'null' };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle string
      if (typeof target === 'string') {
        const actualIndex = index < 0 ? target.length + index : index;
        const value = actualIndex >= 0 && actualIndex < target.length ? target[actualIndex] : null;
        const result = { success: true as const, value, type: value ? 'string' : 'null' };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Handle object with length property and numeric indexing
      if (typeof target === 'object' && 'length' in target && typeof (target as any).length === 'number') {
        const lengthObj = target as { length: number; [key: number]: unknown };
        const actualIndex = index < 0 ? lengthObj.length + index : index;
        const value = actualIndex >= 0 && actualIndex < lengthObj.length ? lengthObj[actualIndex] : null;
        const result = { success: true as const, value, type: value == null ? 'null' : typeof value };
        this.trackEvaluation(context, input, result, startTime);
        return result;
      }

      // Unsupported type
      const errorResult = {
        success: false as const,
        error: {
          name: 'UnsupportedCollectionTypeError',
          message: `Cannot get element at index from type: ${typeof target}`,
          code: 'UNSUPPORTED_COLLECTION_TYPE',
          suggestions: [
            'Use arrays, NodeList, HTMLCollection, Element, or string',
            'Ensure collection has a length property and numeric indexing',
            'Check if the collection is properly initialized'
          ]
        }
      };
      this.trackEvaluation(context, input, errorResult, startTime);
      return errorResult;

    } catch (error) {
      const errorResult = {
        success: false as const,
        error: {
          name: 'AtExpressionError',
          message: `At operation failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'AT_OPERATION_FAILED',
          suggestions: ['Check index and collection validity', 'Ensure index is within bounds']
        }
      };
      this.trackEvaluation(context, input, errorResult, startTime);
      return errorResult;
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            path: err.path,
            message: err.message,
            code: err.code
          })),
          suggestions: [
            'Provide required index parameter as integer',
            'Provide optional collection parameter',
            'Check parameter structure: { index: number, collection?: any }'
          ]
        };
      }
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        suggestions: ['Check input structure']
      };
    }
  }

  private trackEvaluation(
    context: TypedExpressionContext,
    input: unknown,
    result: TypedResult<unknown>,
    startTime: number
  ): void {
    context.evaluationHistory.push({
      expressionName: this.name,
      category: this.category,
      input,
      output: result.success ? result.value : result.error,
      timestamp: startTime,
      duration: Date.now() - startTime,
      success: result.success
    });
  }
}

// ============================================================================
// Enhanced Expression Registry
// ============================================================================

export const enhancedPositionalExpressions = {
  first: new EnhancedFirstExpression(),
  last: new EnhancedLastExpression(),
  at: new EnhancedAtExpression()
} as const;

export type EnhancedPositionalExpressionName = keyof typeof enhancedPositionalExpressions;

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