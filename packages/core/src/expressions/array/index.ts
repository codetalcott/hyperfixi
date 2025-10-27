

/**
 * Enhanced Array Expressions - Array Literal and Index Operations
 * Implements comprehensive array handling with TypeScript integration
 * Handles array creation, indexing, range operations, and type safety
 */

import { v, type RuntimeValidator } from '../../validation/lightweight-validators';
import type {
  HyperScriptValue,
  HyperScriptValueType,
  EvaluationResult,
  LLMDocumentation
} from '../../types/enhanced-core';
import type {
  ValidationResult,
  ValidationError,
  TypedExpressionContext
} from '../../types/base-types';
import type { TypedExpressionImplementation } from '../../types/enhanced-expressions';

// ============================================================================
// Input Validation Schemas
// ============================================================================

/**
 * Schema for array literal expression input validation
 */
export const ArrayLiteralInputSchema = v.array(v.unknown()).describe('Array elements');

export type ArrayLiteralInput = any; // Inferred from RuntimeValidator

/**
 * Schema for array index expression input validation
 */
export const ArrayIndexInputSchema = v.tuple([
  v.unknown().describe('Array or array-like object to index'),
  v.union([
    v.number().describe('Numeric index'),
    v.string().describe('String index for object access'),
    v.object({
      start: v.number().optional(),
      end: v.number().optional()
    }).strict().describe('Range object for slice operations')
  ]).describe('Index or range specification')
]);

export type ArrayIndexInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced Array Literal Expression Implementation
// ============================================================================

/**
 * Enhanced array literal expression for array creation
 * Provides comprehensive array literal creation with type safety
 */
export class EnhancedArrayLiteralExpression implements TypedExpressionImplementation<
  HyperScriptValue[]
> {
  public readonly name = 'ArrayLiteral';
  public readonly category = 'Special' as const;
  public readonly syntax = '[element1, element2, ...]';
  public readonly description = 'Creates an array literal with specified elements';
  public readonly inputSchema: RuntimeValidator<HyperScriptValue[]> = ArrayLiteralInputSchema as RuntimeValidator<HyperScriptValue[]>;
  public readonly outputType = 'Array' as const;
  public readonly metadata = {
    category: 'Special' as const,
    complexity: 'simple' as const,
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Array' as const],
    examples: [
      { input: '[]', description: 'Empty array', expectedOutput: [] },
      { input: '[1, 2, 3]', description: 'Numeric array', expectedOutput: [1, 2, 3] },
      { input: '["a", "b"]', description: 'String array', expectedOutput: ['a', 'b'] }
    ],
    relatedExpressions: ['ArrayIndex'],
    performance: { averageTime: 0.1, complexity: 'O(n)' as const }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates array literals with comprehensive element handling and type safety',
    parameters: [
      {
        name: 'elements',
        type: 'array',
        description: 'Array of elements to include in the literal',
        optional: false,
        defaultValue: [],
        examples: ['[]', '[1, 2, 3]', '["a", "b", "c"]', '[true, 42, "mixed"]']
      }
    ],
    returns: {
      type: 'array',
      description: 'A new array containing the specified elements',
      examples: [[], [1, 2, 3], ['hello', 'world']]
    },
    examples: [
      {
        title: 'Empty array literal',
        code: '[]',
        explanation: 'Creates an empty array',
        output: []
      },
      {
        title: 'Numeric array literal',
        code: '[1, 2, 3]',
        explanation: 'Creates an array with numeric elements',
        output: [1, 2, 3]
      },
      {
        title: 'Mixed type array literal',
        code: '[true, 42, "hello"]',
        explanation: 'Creates an array with elements of different types',
        output: [true, 42, 'hello']
      }
    ],
    seeAlso: ['array indexing', 'array methods', 'collection operations'],
    tags: ['array', 'literal', 'collection', 'creation']
  };

  /**
   * Validate array literal expression arguments
   */
  validate(args: unknown[]): ValidationResult {
    try {
      const validatedArgs = this.inputSchema.parse(args);
      
      // Array literals are always valid, but we can check for potential issues
      const errors: ValidationError[] = [];
      
      // Check for extremely large arrays
      if ((validatedArgs as any[]).length > 10000) {
        errors.push({
          type: 'runtime-error',
          message: `Array literal with ${(validatedArgs as any[]).length} elements may impact performance`,
          suggestions: ['Consider breaking large arrays into smaller chunks']
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        suggestions: errors.length > 0 ? [
          'Consider breaking large arrays into smaller chunks',
          'Use consistent element types when possible'
        ] : []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'syntax-error',
          message: error instanceof Error ? error.message : 'Invalid array literal arguments',
          suggestions: ['Provide elements as an array']
        }],
        suggestions: [
          'Provide elements as an array',
          'Ensure all elements are valid hyperscript values'
        ]
      };
    }
  }

  /**
   * Evaluate array literal expression
   */
  async evaluate(
    _context: TypedExpressionContext,
    ...args: unknown[]
  ): Promise<EvaluationResult<HyperScriptValue[]>> {
    try {
      // Validate input arguments
      const validationResult = await this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'ArrayLiteralValidationError',
            type: 'validation-error',
            message: `Array literal validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
            code: 'ARRAY_LITERAL_VALIDATION_ERROR',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      const elements = this.inputSchema.parse(args) as any[];

      // Resolve any promise elements
      const resolvedElements = await Promise.all(
        elements.map(async (element: unknown) => {
          if (element && typeof element === 'object' && 'then' in element) {
            return await element;
          }
          return element;
        })
      );

      return {
        success: true,
        value: resolvedElements as HyperScriptValue[],
        type: 'array'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ArrayLiteralEvaluationError',
          type: 'runtime-error',
          message: `Failed to evaluate array literal: ${error instanceof Error ? error.message : String(error)}`,
          code: 'ARRAY_LITERAL_EVALUATION_ERROR',
          suggestions: ['Check array element values', 'Ensure all elements are valid']
        },
        type: 'error'
      };
    }
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'ArrayLiteralExpression',
      category: 'literal' as const,
      version: '1.0.0',
      description: 'Enhanced array literal creation with type safety and async element support',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'empty arrays',
        'mixed type elements',
        'async element resolution',
        'large array handling',
        'null/undefined detection'
      ],
      performance: {
        complexity: 'low',
        averageExecutionTime: '< 2ms',
        memoryUsage: 'proportional to element count'
      },
      capabilities: {
        contextAware: false,
        supportsAsync: true,
        sideEffects: false,
        cacheable: true
      }
    };
  }
}

// ============================================================================
// Enhanced Array Index Expression Implementation
// ============================================================================

/**
 * Enhanced array index expression for array element access
 * Provides comprehensive indexing including ranges and bounds checking
 */
export class EnhancedArrayIndexExpression implements TypedExpressionImplementation<
  HyperScriptValue
> {
  public readonly name = 'ArrayIndex';
  public readonly category = 'Special' as const;
  public readonly syntax = 'array[index]';
  public readonly description = 'Accesses an array element by index or extracts a slice';
  public readonly inputSchema = ArrayIndexInputSchema;
  public readonly outputType = 'Any' as const;
  public readonly metadata = {
    category: 'Special' as const,
    complexity: 'simple' as const,
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any' as const],
    examples: [
      { input: 'arr[0]', description: 'First element', expectedOutput: undefined },
      { input: 'arr[1]', description: 'Second element', expectedOutput: undefined },
      { input: 'arr[-1]', description: 'Last element', expectedOutput: undefined }
    ],
    relatedExpressions: ['ArrayLiteral'],
    performance: { averageTime: 0.05, complexity: 'O(1)' as const }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Accesses array elements with comprehensive indexing including ranges and bounds checking',
    parameters: [
      {
        name: 'target',
        type: 'array',
        description: 'Array or array-like object to index',
        optional: false,
        examples: ['[1, 2, 3]', 'myArray', 'document.querySelectorAll("div")']
      },
      {
        name: 'index',
        type: 'number',
        description: 'Index or range specification for element access',
        optional: false,
        examples: ['0', '1', '-1', '{start: 1, end: 3}']
      }
    ],
    returns: {
      type: 'any',
      description: 'The element at the specified index, or array slice for ranges',
      examples: [42, 'hello', [1, 2, 3]]
    },
    examples: [
      {
        title: 'Basic array indexing',
        code: 'arr[0]',
        explanation: 'Gets the first element of the array',
        output: 'first-element'
      },
      {
        title: 'Negative indexing',
        code: 'arr[-1]',
        explanation: 'Gets the last element of the array',
        output: 'last-element'
      },
      {
        title: 'Range slicing',
        code: 'arr[1..3]',
        explanation: 'Gets elements from index 1 to 3 (inclusive)',
        output: [2, 3, 4]
      }
    ],
    seeAlso: ['array literals', 'first/last expressions', 'array methods'],
    tags: ['array', 'indexing', 'access', 'slice', 'range']
  };

  /**
   * Validate array index expression arguments
   */
  validate(args: unknown[]): ValidationResult {
    try {
      const validatedArgs = this.inputSchema.parse(args) as [unknown, unknown];
      const [target, index] = validatedArgs;
      
      const errors: ValidationError[] = [];
      
      // Basic validation for target
      if (target === null || target === undefined) {
        errors.push({
          type: 'type-mismatch',
          message: 'Cannot index null or undefined value',
          suggestions: ['Provide an array or array-like object']
        });
      }

      // Validate index type
      if (typeof index === 'object' && index !== null) {
        const rangeObj = index as { start?: number; end?: number };
        if (rangeObj.start !== undefined && rangeObj.end !== undefined && rangeObj.start > rangeObj.end) {
          errors.push({
            type: 'syntax-error',
            message: 'Range start index cannot be greater than end index',
            suggestions: ['Ensure start <= end in range objects']
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        suggestions: errors.length > 0 ? [
          'Ensure target is an array or array-like object',
          'Use valid numeric indices or range objects',
          'Check that range start is less than or equal to end'
        ] : []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'syntax-error',
          message: error instanceof Error ? error.message : 'Invalid array index arguments',
          suggestions: ['Provide valid arguments for array indexing']
        }],
        suggestions: [
          'Provide an array-like target as the first argument',
          'Provide a numeric index or range object as the second argument'
        ]
      };
    }
  }

  /**
   * Evaluate array index expression
   */
  async evaluate(
    _context: TypedExpressionContext,
    ...args: unknown[]
  ): Promise<EvaluationResult<HyperScriptValue>> {
    try {
      // Validate input arguments
      const validationResult = await this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'ArrayIndexValidationError',
            type: 'validation-error',
            message: `Array index validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
            code: 'ARRAY_INDEX_VALIDATION_ERROR',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }

      const [target, index] = this.inputSchema.parse(args) as [unknown, unknown];
      
      // Convert target to array-like if needed
      const arrayTarget = this.normalizeArrayTarget(target);
      if (!arrayTarget.success) {
        return arrayTarget;
      }
      
      // Handle different index types
      const result = this.performIndexOperation(arrayTarget.value, index as number | string | { start?: number; end?: number });
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ArrayIndexEvaluationError',
          type: 'runtime-error',
          message: `Failed to evaluate array index: ${error instanceof Error ? error.message : String(error)}`,
          code: 'ARRAY_INDEX_EVALUATION_ERROR',
          severity: 'error',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Normalize target to array-like structure
   */
  private normalizeArrayTarget(target: unknown): EvaluationResult<unknown> {
    if (Array.isArray(target)) {
      return { success: true, value: target, type: 'array' };
    }
    
    // Handle NodeList, HTMLCollection, etc. - keep original object for string indexing
    if (target && typeof target === 'object' && 'length' in target) {
      return { success: true, value: target, type: 'array' };
    }
    
    // Handle string indexing
    if (typeof target === 'string') {
      return { success: true, value: target, type: 'string' };
    }
    
    return {
      success: false,
      error: {
        name: 'InvalidArrayTargetError',
        type: 'invalid-argument',
        message: `Cannot index target of type ${typeof target}`,
        code: 'INVALID_ARRAY_TARGET',
        severity: 'error',
          suggestions: []
      },
      type: 'error'
    };
  }

  /**
   * Perform the actual index operation
   */
  private performIndexOperation(
    target: unknown,
    index: number | string | { start?: number; end?: number }
  ): EvaluationResult<HyperScriptValue> {
    try {
      // Handle numeric indexing
      if (typeof index === 'number') {
        let length: number;
        let element: unknown;
        
        if (Array.isArray(target)) {
          length = target.length;
          const normalizedIndex = index < 0 ? length + index : index;
          
          if (normalizedIndex < 0 || normalizedIndex >= length) {
            return { success: true, value: undefined, type: 'undefined' };
          }
          
          element = target[normalizedIndex];
        } else if (typeof target === 'string') {
          length = target.length;
          const normalizedIndex = index < 0 ? length + index : index;
          
          if (normalizedIndex < 0 || normalizedIndex >= length) {
            return { success: true, value: undefined, type: 'undefined' };
          }
          
          element = target[normalizedIndex];
        } else if (target && typeof target === 'object' && 'length' in target) {
          const arrayLike = target as ArrayLike<unknown> & Record<string, unknown>;
          length = arrayLike.length;
          const normalizedIndex = index < 0 ? length + index : index;
          
          if (normalizedIndex < 0 || normalizedIndex >= length) {
            return { success: true, value: undefined, type: 'undefined' };
          }
          
          element = arrayLike[normalizedIndex];
        } else {
          return { success: true, value: undefined, type: 'undefined' };
        }
        
        return {
          success: true,
          value: element as HyperScriptValue,
          type: this.inferType(element)
        };
      }
      
      // Handle string indexing (for object-like arrays)
      if (typeof index === 'string') {
        if (target && typeof target === 'object') {
          const element = (target as Record<string, unknown>)[index];
          return {
            success: true,
            value: element as HyperScriptValue,
            type: this.inferType(element)
          };
        }
        return { success: true, value: undefined, type: 'undefined' };
      }
      
      // Handle range indexing
      if (typeof index === 'object' && index !== null) {
        const rangeObj = index as { start?: number; end?: number };
        
        let length: number;
        let slice: unknown[];
        
        if (Array.isArray(target)) {
          length = target.length;
          const start = rangeObj.start ?? 0;
          const end = rangeObj.end ?? length - 1;
          
          const normalizedStart = start < 0 ? length + start : start;
          const normalizedEnd = end < 0 ? length + end : end;
          
          slice = target.slice(normalizedStart, normalizedEnd + 1);
        } else if (typeof target === 'string') {
          length = target.length;
          const start = rangeObj.start ?? 0;
          const end = rangeObj.end ?? length - 1;
          
          const normalizedStart = start < 0 ? length + start : start;
          const normalizedEnd = end < 0 ? length + end : end;
          
          slice = Array.from(target.slice(normalizedStart, normalizedEnd + 1));
        } else if (target && typeof target === 'object' && 'length' in target) {
          const arrayLike = Array.from(target as ArrayLike<unknown>);
          length = arrayLike.length;
          const start = rangeObj.start ?? 0;
          const end = rangeObj.end ?? length - 1;
          
          const normalizedStart = start < 0 ? length + start : start;
          const normalizedEnd = end < 0 ? length + end : end;
          
          slice = arrayLike.slice(normalizedStart, normalizedEnd + 1);
        } else {
          slice = [];
        }
        
        return {
          success: true,
          value: slice as HyperScriptValue,
          type: 'array'
        };
      }
      
      return {
        success: false,
        error: {
          name: 'InvalidIndexTypeError',
          type: 'validation-error',
          message: `Unsupported index type: ${typeof index}`,
          code: 'INVALID_INDEX_TYPE',
          severity: 'error',
          suggestions: []
        },
        type: 'error'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'IndexOperationError',
          type: 'runtime-error',
          message: `Index operation failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'INDEX_OPERATION_ERROR',
          severity: 'error',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Infer the type of an indexed element
   */
  private inferType(value: unknown): HyperScriptValueType {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof HTMLElement) return 'element';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'function') return 'function';
    return 'unknown';
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'ArrayIndexExpression',
      category: 'access' as const,
      version: '1.0.0',
      description: 'Enhanced array indexing with range support and bounds checking',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'numeric indexing',
        'negative indexing',
        'string indexing',
        'range slicing',
        'bounds checking',
        'array-like objects'
      ],
      performance: {
        complexity: 'low',
        averageExecutionTime: '< 1ms',
        memoryUsage: 'minimal (constant for single element, proportional for ranges)'
      },
      capabilities: {
        contextAware: false,
        supportsAsync: false,
        sideEffects: false,
        cacheable: true
      }
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Factory functions for creating enhanced array expressions
 */
export function createArrayLiteralExpression(): EnhancedArrayLiteralExpression {
  return new EnhancedArrayLiteralExpression();
}

export function createArrayIndexExpression(): EnhancedArrayIndexExpression {
  return new EnhancedArrayIndexExpression();
}

/**
 * Type guards for array expression inputs
 */
export function isValidArrayLiteralInput(args: unknown[]): args is ArrayLiteralInput {
  try {
    ArrayLiteralInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

export function isValidArrayIndexInput(args: unknown[]): args is ArrayIndexInput {
  try {
    ArrayIndexInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick utility functions for testing
 */
export async function createArray(
  elements: unknown[],
  context: TypedExpressionContext
): Promise<EvaluationResult<HyperScriptValue[]>> {
  const expression = new EnhancedArrayLiteralExpression();
  return expression.evaluate(context, ...elements);
}

export async function indexArray(
  target: unknown,
  index: number | string | { start?: number; end?: number },
  context: TypedExpressionContext
): Promise<EvaluationResult<HyperScriptValue>> {
  const expression = new EnhancedArrayIndexExpression();
  return expression.evaluate(context, target, index);
}

// Default exports
export { EnhancedArrayLiteralExpression as default };