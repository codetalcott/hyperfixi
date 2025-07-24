/**
 * Enhanced Array Expressions - Array Literal and Index Operations
 * Implements comprehensive array handling with TypeScript integration
 * Handles array creation, indexing, range operations, and type safety
 */

import { z } from 'zod';
import type {
  HyperScriptValue,
  HyperScriptValueType,
  EvaluationResult,
  TypedExpressionContext,
  TypedExpressionImplementation,
  LLMDocumentation,
  ValidationResult
} from '../../types/enhanced-core.js';

// ============================================================================
// Input Validation Schemas
// ============================================================================

/**
 * Schema for array literal expression input validation
 */
export const ArrayLiteralInputSchema = z.array(z.unknown()).describe('Array elements');

export type ArrayLiteralInput = z.infer<typeof ArrayLiteralInputSchema>;

/**
 * Schema for array index expression input validation
 */
export const ArrayIndexInputSchema = z.tuple([
  z.unknown().describe('Array or array-like object to index'),
  z.union([
    z.number().int().describe('Numeric index'),
    z.string().describe('String index for object access'),
    z.object({
      start: z.number().int().optional(),
      end: z.number().int().optional()
    }).describe('Range object for slice operations')
  ]).describe('Index or range specification')
]);

export type ArrayIndexInput = z.infer<typeof ArrayIndexInputSchema>;

// ============================================================================
// Enhanced Array Literal Expression Implementation
// ============================================================================

/**
 * Enhanced array literal expression for array creation
 * Provides comprehensive array literal creation with type safety
 */
export class EnhancedArrayLiteralExpression implements TypedExpressionImplementation<
  ArrayLiteralInput,
  HyperScriptValue[],
  TypedExpressionContext
> {
  public readonly inputSchema = ArrayLiteralInputSchema;
  
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
  async validate(args: unknown[]): Promise<ValidationResult> {
    try {
      const validatedArgs = this.inputSchema.parse(args);
      
      // Array literals are always valid, but we can check for potential issues
      const issues: string[] = [];
      
      // Check for extremely large arrays
      if (validatedArgs.length > 10000) {
        issues.push(`Array literal with ${validatedArgs.length} elements may impact performance`);
      }
      
      // Check for null/undefined elements that might be unintentional
      const nullCount = validatedArgs.filter(el => el === null || el === undefined).length;
      if (nullCount > 0 && nullCount < validatedArgs.length) {
        issues.push(`Array contains ${nullCount} null/undefined elements - this may be unintentional`);
      }

      return {
        isValid: issues.length === 0,
        errors: issues,
        suggestions: issues.length > 0 ? [
          'Consider breaking large arrays into smaller chunks',
          'Verify that null/undefined elements are intentional',
          'Use consistent element types when possible'
        ] : []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Invalid array literal arguments'],
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
    context: TypedExpressionContext,
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
            message: `Array literal validation failed: ${validationResult.errors.join(', ')}`,
            code: 'ARRAY_LITERAL_VALIDATION_ERROR',
            severity: 'error',
            context: { args, validation: validationResult }
          },
          type: 'error'
        };
      }

      const elements = this.inputSchema.parse(args);
      
      // Resolve any promise elements
      const resolvedElements = await Promise.all(
        elements.map(async (element) => {
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
          message: `Failed to evaluate array literal: ${error instanceof Error ? error.message : String(error)}`,
          code: 'ARRAY_LITERAL_EVALUATION_ERROR',
          severity: 'error',
          context: { args, error }
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
  ArrayIndexInput,
  HyperScriptValue,
  TypedExpressionContext
> {
  public readonly inputSchema = ArrayIndexInputSchema;
  
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
  async validate(args: unknown[]): Promise<ValidationResult> {
    try {
      const validatedArgs = this.inputSchema.parse(args);
      const [target, index] = validatedArgs;
      
      const issues: string[] = [];
      
      // Basic validation for target
      if (target === null || target === undefined) {
        issues.push('Cannot index null or undefined value');
      }
      
      // Validate index type
      if (typeof index === 'object' && index !== null) {
        const rangeObj = index as { start?: number; end?: number };
        if (rangeObj.start !== undefined && rangeObj.end !== undefined && rangeObj.start > rangeObj.end) {
          issues.push('Range start index cannot be greater than end index');
        }
      }

      return {
        isValid: issues.length === 0,
        errors: issues,
        suggestions: issues.length > 0 ? [
          'Ensure target is an array or array-like object',
          'Use valid numeric indices or range objects',
          'Check that range start is less than or equal to end'
        ] : []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Invalid array index arguments'],
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
    context: TypedExpressionContext,
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
            message: `Array index validation failed: ${validationResult.errors.join(', ')}`,
            code: 'ARRAY_INDEX_VALIDATION_ERROR',
            severity: 'error',
            context: { args, validation: validationResult }
          },
          type: 'error'
        };
      }

      const [target, index] = this.inputSchema.parse(args);
      
      // Convert target to array-like if needed
      const arrayTarget = this.normalizeArrayTarget(target);
      if (!arrayTarget.success) {
        return arrayTarget;
      }
      
      // Handle different index types
      const result = this.performIndexOperation(arrayTarget.value, index);
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ArrayIndexEvaluationError',
          message: `Failed to evaluate array index: ${error instanceof Error ? error.message : String(error)}`,
          code: 'ARRAY_INDEX_EVALUATION_ERROR',
          severity: 'error',
          context: { args, error }
        },
        type: 'error'
      };
    }
  }

  /**
   * Normalize target to array-like structure
   */
  private normalizeArrayTarget(target: unknown): EvaluationResult<unknown[]> {
    if (Array.isArray(target)) {
      return { success: true, value: target, type: 'array' };
    }
    
    // Handle NodeList, HTMLCollection, etc.
    if (target && typeof target === 'object' && 'length' in target) {
      const arrayLike = Array.from(target as ArrayLike<unknown>);
      return { success: true, value: arrayLike, type: 'array' };
    }
    
    // Handle string indexing
    if (typeof target === 'string') {
      return { success: true, value: Array.from(target), type: 'array' };
    }
    
    return {
      success: false,
      error: {
        name: 'InvalidArrayTargetError',
        message: `Cannot index target of type ${typeof target}`,
        code: 'INVALID_ARRAY_TARGET',
        severity: 'error',
        context: { target, targetType: typeof target }
      },
      type: 'error'
    };
  }

  /**
   * Perform the actual index operation
   */
  private performIndexOperation(
    array: unknown[],
    index: number | string | { start?: number; end?: number }
  ): EvaluationResult<HyperScriptValue> {
    try {
      // Handle numeric indexing
      if (typeof index === 'number') {
        const normalizedIndex = index < 0 ? array.length + index : index;
        
        if (normalizedIndex < 0 || normalizedIndex >= array.length) {
          return { success: true, value: undefined, type: 'undefined' };
        }
        
        const element = array[normalizedIndex];
        return {
          success: true,
          value: element as HyperScriptValue,
          type: this.inferType(element)
        };
      }
      
      // Handle string indexing (for object-like arrays)
      if (typeof index === 'string') {
        const element = (array as Record<string, unknown>)[index];
        return {
          success: true,
          value: element as HyperScriptValue,
          type: this.inferType(element)
        };
      }
      
      // Handle range indexing
      if (typeof index === 'object' && index !== null) {
        const rangeObj = index as { start?: number; end?: number };
        const start = rangeObj.start ?? 0;
        const end = rangeObj.end ?? array.length - 1;
        
        const normalizedStart = start < 0 ? array.length + start : start;
        const normalizedEnd = end < 0 ? array.length + end : end;
        
        const slice = array.slice(normalizedStart, normalizedEnd + 1);
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
          message: `Unsupported index type: ${typeof index}`,
          code: 'INVALID_INDEX_TYPE',
          severity: 'error',
          context: { index, indexType: typeof index }
        },
        type: 'error'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'IndexOperationError',
          message: `Index operation failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'INDEX_OPERATION_ERROR',
          severity: 'error',
          context: { array, index, error }
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
export { EnhancedArrayIndexExpression };