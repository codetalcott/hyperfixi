/**
 * Object Expression - Object Literal Operations
 * Implements comprehensive object literal creation with TypeScript integration
 * Handles object creation, dynamic field names, and type safety
 */

import { v, type RuntimeValidator } from '../../validation/lightweight-validators';
import type {
  HyperScriptValue,
  HyperScriptValueType,
  EvaluationResult,
  ValidationResult,
} from '../../types/command-types';
import type { ValidationError, TypedExpressionContext } from '../../types/base-types';
import type { TypedExpressionImplementation } from '../../types/expression-types';

// ============================================================================
// Input Validation Schemas
// ============================================================================

/**
 * Schema for object field definition
 */
export const ObjectFieldSchema = v.object({
  key: v
    .union([
      v.string().describe('Static field name'),
      v.unknown().describe('Dynamic expression for field name'),
    ])
    .describe('Field key (string or expression)'),
  value: v.unknown().describe('Field value'),
  isDynamic: v.boolean().default(false).describe('Whether the key is computed from an expression'),
});

export type ObjectField = any; // Inferred from RuntimeValidator

/**
 * Schema for object literal expression input validation
 */
export const ObjectLiteralInputSchema = v
  .array(ObjectFieldSchema)
  .describe('Object field definitions');

export type ObjectLiteralInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced Object Literal Expression Implementation
// ============================================================================

/**
 * Enhanced object literal expression for object creation
 * Provides comprehensive object literal creation with dynamic field names and type safety
 */
export class ObjectLiteralExpression
  implements TypedExpressionImplementation<Record<string, HyperScriptValue>>
{
  public readonly name = 'ObjectLiteral';
  public readonly category = 'Special' as const;
  public readonly syntax = '{ key1: value1, key2: value2, ... }';
  public readonly description = 'Creates an object literal with specified key-value pairs';
  public readonly inputSchema: RuntimeValidator<Record<string, HyperScriptValue>> =
    ObjectLiteralInputSchema as RuntimeValidator<Record<string, HyperScriptValue>>;
  public readonly outputType = 'Object' as const;
  public readonly metadata = {
    category: 'Special' as const,
    complexity: 'simple' as const,
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Object' as const],
    examples: [
      { input: '{}', description: 'Empty object', expectedOutput: {} },
      { input: '{x: 1}', description: 'Single property', expectedOutput: { x: 1 } },
      {
        input: '{name: "Alice", age: 30}',
        description: 'Multiple properties',
        expectedOutput: { name: 'Alice', age: 30 },
      },
    ],
    relatedExpressions: ['Property', 'Possessive'],
    performance: { averageTime: 0.2, complexity: 'O(n)' as const },
  };

  

  /**
   * Validate object literal expression arguments
   */
  validate(args: unknown): ValidationResult {
    try {
      const validatedArgs = this.inputSchema.parse(args);

      const issues: ValidationError[] = [];

      // Check for extremely large objects
      if ((validatedArgs as unknown as any[]).length > 1000) {
        issues.push({
          type: 'validation-error',
          message: `Object literal with ${(validatedArgs as unknown as any[]).length} fields may impact performance`,
          suggestions: [],
        });
      }

      // Check for duplicate static keys
      const staticKeys = (validatedArgs as unknown as any[])
        .filter((field: any) => !field.isDynamic && typeof field.key === 'string')
        .map((field: any) => field.key as string);

      const duplicateKeys = staticKeys.filter(
        (key: string, index: number) => staticKeys.indexOf(key) !== index
      );
      if (duplicateKeys.length > 0) {
        issues.push({
          type: 'validation-error',
          message: `Duplicate field names detected: ${[...new Set(duplicateKeys)].join(', ')}`,
          suggestions: [],
        });
      }

      // Validate field key types
      for (const field of validatedArgs as unknown as any[]) {
        if (!field.isDynamic && typeof field.key !== 'string') {
          issues.push({
            type: 'validation-error',
            message: `Static field key must be a string, got ${typeof field.key}`,
            suggestions: [],
          });
        }
      }

      return {
        isValid: issues.length === 0,
        errors: issues,
        suggestions:
          issues.length > 0
            ? [
                'Consider breaking large objects into smaller structures',
                'Ensure field names are unique within the object',
                'Use consistent field naming conventions',
              ]
            : [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            type: 'syntax-error',
            message: error instanceof Error ? error.message : 'Invalid object literal arguments',
            suggestions: [],
          },
        ],
        suggestions: [
          'Provide fields as an array of field definitions',
          'Ensure each field has a valid key and value',
        ],
      };
    }
  }

  /**
   * Evaluate object literal expression
   */
  async evaluate(
    context: TypedExpressionContext,
    ...args: unknown[]
  ): Promise<EvaluationResult<Record<string, HyperScriptValue>>> {
    try {
      // Validate input arguments
      const validationResult = await this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'ObjectLiteralValidationError',
            type: 'validation-error',
            message: `Object literal validation failed: ${validationResult.errors.join(', ')}`,
            code: 'OBJECT_LITERAL_VALIDATION_ERROR',
            severity: 'error',
            suggestions: [],
          },
          type: 'error',
        };
      }

      const fields = this.inputSchema.parse(args);
      const resultObject: Record<string, HyperScriptValue> = {};

      // Process each field
      for (const field of fields as unknown as any[]) {
        const keyResult = await this.resolveFieldKey(field, context);
        if (!keyResult.success) {
          return keyResult as unknown as EvaluationResult<Record<string, HyperScriptValue>>;
        }

        const resolvedValue = await this.resolveFieldValue(field.value, context);
        if (!resolvedValue.success) {
          return resolvedValue as EvaluationResult<Record<string, HyperScriptValue>>;
        }

        if (keyResult.value !== undefined) {
          resultObject[keyResult.value] = resolvedValue.value;
        }
      }

      return {
        success: true,
        value: resultObject,
        type: 'object',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ObjectLiteralEvaluationError',
          type: 'runtime-error',
          message: `Failed to evaluate object literal: ${error instanceof Error ? error.message : String(error)}`,
          code: 'OBJECT_LITERAL_EVALUATION_ERROR',
          severity: 'error',
          suggestions: [],
        },
        type: 'error',
      };
    }
  }

  /**
   * Resolve field key (static or dynamic)
   */
  private async resolveFieldKey(
    field: ObjectField,
    context: TypedExpressionContext
  ): Promise<EvaluationResult<string>> {
    try {
      if (!field.isDynamic) {
        // Static field name
        return {
          success: true,
          value: field.key as string,
          type: 'string',
        };
      }

      // Dynamic field name - evaluate the expression
      const keyValue = await this.resolveFieldValue(field.key, context);
      if (!keyValue.success) {
        return {
          success: false,
          error: {
            name: 'DynamicFieldKeyError',
            type: 'runtime-error',
            message: `Failed to resolve dynamic field key: ${keyValue.error?.message}`,
            code: 'DYNAMIC_FIELD_KEY_ERROR',
            severity: 'error',
            suggestions: [],
          },
          type: 'error',
        };
      }

      // Convert the result to a string key
      const stringKey = String(keyValue.value);
      return {
        success: true,
        value: stringKey,
        type: 'string',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FieldKeyResolutionError',
          type: 'runtime-error',
          message: `Failed to resolve field key: ${error instanceof Error ? error.message : String(error)}`,
          code: 'FIELD_KEY_RESOLUTION_ERROR',
          severity: 'error',
          suggestions: [],
        },
        type: 'error',
      };
    }
  }

  /**
   * Resolve field value (handle promises and expressions)
   */
  private async resolveFieldValue(
    value: unknown,
    context: TypedExpressionContext
  ): Promise<EvaluationResult<HyperScriptValue>> {
    try {
      // Handle promise values
      if (value && typeof value === 'object' && 'then' in value) {
        const resolvedValue = await value;
        return {
          success: true,
          value: resolvedValue as HyperScriptValue,
          type: this.inferType(resolvedValue),
        };
      }

      // Handle function calls for dynamic evaluation
      if (typeof value === 'function') {
        try {
          const result = await value(context);
          return {
            success: true,
            value: result as HyperScriptValue,
            type: this.inferType(result),
          };
        } catch (functionError) {
          return {
            success: false,
            error: {
              name: 'FieldValueFunctionError',
              type: 'runtime-error',
              message: `Field value function evaluation failed: ${functionError instanceof Error ? functionError.message : String(functionError)}`,
              code: 'FIELD_VALUE_FUNCTION_ERROR',
              severity: 'error',
              suggestions: [],
            },
            type: 'error',
          };
        }
      }

      // Direct value
      return {
        success: true,
        value: value,
        type: this.inferType(value),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FieldValueResolutionError',
          type: 'runtime-error',
          message: `Failed to resolve field value: ${error instanceof Error ? error.message : String(error)}`,
          code: 'FIELD_VALUE_RESOLUTION_ERROR',
          severity: 'error',
          suggestions: [],
        },
        type: 'error',
      };
    }
  }

  /**
   * Infer the type of a field value
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
      name: 'ObjectLiteralExpression',
      category: 'literal' as const,
      version: '1.0.0',
      description: 'Enhanced object literal creation with dynamic field names and type safety',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'empty objects',
        'static field names',
        'dynamic field names',
        'mixed field types',
        'async field values',
        'duplicate key detection',
        'hyphenated field names',
        'string field names',
      ],
      performance: {
        complexity: 'low',
        averageExecutionTime: '< 3ms',
        memoryUsage: 'proportional to field count',
      },
      capabilities: {
        contextAware: true,
        supportsAsync: true,
        sideEffects: false,
        cacheable: true,
      },
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Factory function for creating enhanced object expression
 */
export function createObjectLiteralExpression(): ObjectLiteralExpression {
  return new ObjectLiteralExpression();
}

/**
 * Type guard for object literal input
 */
export function isValidObjectLiteralInput(args: unknown[]): args is ObjectLiteralInput {
  try {
    ObjectLiteralInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper function to create a field definition
 */
export function createField(
  key: string | unknown,
  value: unknown,
  isDynamic: boolean = false
): ObjectField {
  return {
    key,
    value,
    isDynamic,
  };
}

/**
 * Helper function to create a static field
 */
export function createStaticField(key: string, value: unknown): ObjectField {
  return createField(key, value, false);
}

/**
 * Helper function to create a dynamic field
 */
export function createDynamicField(keyExpression: unknown, value: unknown): ObjectField {
  return createField(keyExpression, value, true);
}

/**
 * Quick utility function for testing
 */
export async function createObject(
  fields: ObjectField[],
  context: TypedExpressionContext
): Promise<EvaluationResult<Record<string, HyperScriptValue>>> {
  const expression = new ObjectLiteralExpression();
  return expression.evaluate(context, ...fields);
}

// Default exports
export { ObjectLiteralExpression as default };
