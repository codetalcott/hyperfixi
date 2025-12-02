/**
 * Possessive Expression - Property and Attribute Access
 * Implements comprehensive possessive expression functionality with TypeScript integration
 * Handles 'my property', 'element's attribute', style access, and attribute bracket notation
 */

import { v } from '../../validation/lightweight-validators';
import type {
  HyperScriptValue,
  HyperScriptValueType,
  EvaluationResult,
  TypedExpressionImplementation,
  TypedExecutionContext,
} from '../../types/command-types';
import type { ValidationResult, ValidationError } from '../../types/base-types';
import {
  accessProperty,
  accessStyleProperty,
  accessAttribute,
  accessObjectProperty,
  isElement,
} from '../property-access-utils';

// ============================================================================
// Input Validation Schemas
// ============================================================================

/**
 * Schema for possessive expression input validation
 */
export const PossessiveExpressionInputSchema = v.tuple([
  v.unknown().describe('Object/element to access property from'),
  v.string().describe('Property/attribute name to access'),
]);

export type PossessiveExpressionInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Possessive Expression Implementation
// ============================================================================

/**
 * Enhanced possessive expression for property and attribute access
 * Supports style properties (*property), attribute brackets ([@attr]), and possessive chaining
 */
export class PossessiveExpression
  implements TypedExpressionImplementation<HyperScriptValue>
{
  public readonly name = 'possessive';
  public readonly category = 'object' as const;
  public readonly precedence = 10; // High precedence for property access
  public readonly associativity = 'left' as const;
  public readonly outputType = 'object' as const;

  public readonly analysisInfo = {
    isPure: false, // Property access can have side effects
    canThrow: false, // We handle errors gracefully
    complexity: 'O(1)' as const, // Direct property access
    dependencies: ['object-properties'],
  };

  public readonly inputSchema = PossessiveExpressionInputSchema;

  

  /**
   * Validate possessive expression arguments
   */
  validate(args: unknown[]): ValidationResult {
    try {
      this.inputSchema.parse(args);

      const [_object, property] = args as PossessiveExpressionInput;
      const errors: ValidationError[] = [];

      // Validate property string format (this check runs after Zod parsing)
      // If we get here, the second argument should be validated by Zod as a string
      if (typeof property !== 'string' || property.length === 0) {
        errors.push({
          type: 'type-mismatch',
          message: 'Property name must be a non-empty string',
          suggestions: ['Provide a valid property name like "value", "@data-foo", or "*color"'],
        });
      }

      // Check for potentially dangerous property access
      if (typeof property === 'string') {
        const dangerousProps = ['__proto__', 'constructor', 'prototype'];
        if (dangerousProps.includes(property)) {
          errors.push({
            type: 'security-warning',
            message: `Accessing "${property}" property may be unsafe`,
            suggestions: ['Avoid accessing prototype chain properties for security'],
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        suggestions: [
          'Use @ prefix for attributes: @data-foo',
          'Use * prefix for styles: *color',
          'Use bracket notation for complex attributes: [@data-name]',
        ],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            type: 'missing-argument',
            message:
              error instanceof Error ? error.message : 'Invalid possessive expression arguments',
            suggestions: ['Provide object and property name'],
          },
        ],
        suggestions: ['Provide both object and property arguments', 'Use string property names'],
      };
    }
  }

  /**
   * Evaluate possessive expression
   */
  async evaluate(
    context: TypedExecutionContext,
    ...args: HyperScriptValue[]
  ): Promise<EvaluationResult<HyperScriptValue>> {
    try {
      // Validate input arguments
      const validationResult = this.validate(args);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'PossessiveExpressionValidationError',
            type: 'validation-error',
            message: `Possessive expression validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
            code: 'POSSESSIVE_EXPRESSION_VALIDATION_ERROR',
            suggestions: validationResult.suggestions,
          },
          type: 'error',
        };
      }

      const [object, property] = this.inputSchema.parse(args) as [unknown, string];

      // Access property from object using shared utilities
      const value = await this.accessPropertyInternal(object, property, context);

      return {
        success: true,
        value,
        type: this.inferValueType(value),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'PossessiveExpressionEvaluationError',
          type: 'runtime-error',
          message: `Failed to evaluate possessive expression: ${error instanceof Error ? error.message : String(error)}`,
          code: 'POSSESSIVE_EXPRESSION_EVALUATION_ERROR',
          suggestions: ['Check object and property exist', 'Ensure property is accessible'],
        },
        type: 'error',
      };
    }
  }

  /**
   * Access property from object with comprehensive syntax support
   * Delegates to shared utility functions for consistent behavior
   */
  private async accessPropertyInternal(
    object: unknown,
    property: string,
    context: TypedExecutionContext
  ): Promise<HyperScriptValue> {
    // Use shared accessProperty utility for consistent behavior
    return accessProperty(object, property);
  }

  /**
   * Infer TypeScript type from value
   */
  private inferValueType(value: unknown): HyperScriptValueType {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Element) return 'element';
    if (typeof value === 'function') return 'function';
    return 'object';
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'PossessiveExpression',
      category: 'property-access' as const,
      version: '1.0.0',
      description: 'Enhanced property and attribute access with comprehensive syntax support',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'object property access',
        'DOM attribute access (@attr)',
        'CSS style property access (*style)',
        'bracket attribute notation ([@attr])',
        'array/multiple element handling',
        'computed style access (*computed-prop)',
        'method binding for DOM elements',
        'null-safe property access',
      ],
      performance: {
        complexity: 'low to medium',
        averageExecutionTime: '< 5ms',
        memoryUsage: 'minimal to moderate',
      },
      capabilities: {
        contextAware: true,
        supportsAsync: true,
        sideEffects: false,
        cacheable: true, // Property access is generally cacheable
      },
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Factory function for creating enhanced possessive expression
 */
export function createPossessiveExpression(): EnhancedPossessiveExpression {
  return new EnhancedPossessiveExpression();
}

/**
 * Type guard for possessive expression input
 */
export function isValidPossessiveExpressionInput(
  args: unknown[]
): args is PossessiveExpressionInput {
  try {
    PossessiveExpressionInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick utility function for testing
 */
export function evaluatePossessive(
  object: HyperScriptValue,
  property: string,
  context: TypedExecutionContext
): Promise<EvaluationResult<HyperScriptValue>> {
  const expression = new EnhancedPossessiveExpression();
  return expression.evaluate(context, object, property);
}

// Default exports
export { EnhancedPossessiveExpression as default };
