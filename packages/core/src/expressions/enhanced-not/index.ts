/**
 * Enhanced Not Expression - Logical Negation
 * Implements comprehensive 'not' expression functionality with TypeScript integration
 * Handles boolean negation, truthiness evaluation, and type coercion
 */

import { z } from 'zod';
import type {
  HyperScriptValue,
  EvaluationResult,
  TypedExpressionImplementation,
  LLMDocumentation,
  ValidationResult,
  TypedExecutionContext
} from '../../types/enhanced-core.ts';

// ============================================================================
// Input Validation Schemas
// ============================================================================

/**
 * Schema for 'not' expression input validation
 */
export const NotExpressionInputSchema = z.tuple([
  z.unknown().describe('Value to negate')
]);

export type NotExpressionInput = z.infer<typeof NotExpressionInputSchema>;

// ============================================================================
// Enhanced Not Expression Implementation
// ============================================================================

/**
 * Enhanced 'not' expression for logical negation
 * Provides comprehensive boolean negation with truthiness evaluation
 */
export class EnhancedNotExpression implements TypedExpressionImplementation<
  boolean
> {
  public readonly name = 'not';
  public readonly category = 'logical' as const;
  public readonly precedence = 9; // High precedence for unary operators
  public readonly associativity = 'right' as const; // Right associative for unary
  public readonly outputType = 'boolean' as const;
  
  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,  
    complexity: 'O(1)' as const,
    dependencies: []
  };

  public readonly inputSchema = NotExpressionInputSchema;
  
  public readonly documentation: LLMDocumentation = {
    summary: 'Performs logical negation with comprehensive truthiness evaluation and type coercion',
    parameters: [
      {
        name: 'value',
        type: 'object',
        description: 'Value to negate (evaluated for truthiness)',
        optional: false,
        examples: ['true', 'false', '0', '""', 'null', 'undefined', '[]', '{}']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'Negated boolean value based on truthiness evaluation',
      examples: [true, false]
    },
    examples: [
      {
        title: 'Simple boolean negation',
        code: 'not true',
        explanation: 'Returns false',
        output: false
      },
      {
        title: 'Falsy value negation',
        code: 'not 0',
        explanation: 'Returns true (0 is falsy)',
        output: true
      },
      {
        title: 'Double negation',
        code: 'not not true',
        explanation: 'Returns true (double negation)',
        output: true
      }
    ],
    seeAlso: ['logical operators', 'boolean expressions', 'truthiness evaluation'],
    tags: ['logical', 'negation', 'boolean', 'unary']
  };

  /**
   * Validate 'not' expression arguments
   */
  validate(args: unknown[]): ValidationResult {
    try {
      this.inputSchema.parse(args);
      
      // 'Not' expressions are always valid as any value can be negated
      return {
        isValid: true,
        errors: [],
        suggestions: []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'missing-argument',
          message: error instanceof Error ? error.message : 'Invalid not expression arguments',
          suggestions: 'Provide a value to negate'
        }],
        suggestions: [
          'Provide a single value to negate',
          'Any value type is acceptable for negation'
        ]
      };
    }
  }

  /**
   * Evaluate 'not' expression
   */
  evaluate(
    _context: TypedExecutionContext,
    ...args: HyperScriptValue[]
  ): Promise<EvaluationResult<boolean>> {
    try {
      // Validate input arguments
      const validationResult = this.validate(args);
      if (!validationResult.isValid) {
        return Promise.resolve({
          success: false,
          error: {
            name: 'NotExpressionValidationError',
            message: `Not expression validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`,
            code: 'NOT_EXPRESSION_VALIDATION_ERROR',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        });
      }

      const [value] = this.inputSchema.parse(args);
      
      // Evaluate truthiness and negate
      const truthiness = this.evaluateTruthiness(value);
      const negated = !truthiness;
      
      return Promise.resolve({
        success: true,
        value: negated,
        type: 'boolean'
      });
    } catch (error) {
      return Promise.resolve({
        success: false,
        error: {
          name: 'NotExpressionEvaluationError',
          message: `Failed to evaluate not expression: ${error instanceof Error ? error.message : String(error)}`,
          code: 'NOT_EXPRESSION_EVALUATION_ERROR',
          suggestions: ['Check the input value', 'Ensure the value is evaluable']
        },
        type: 'error'
      });
    }
  }

  /**
   * Evaluate truthiness of a value according to JavaScript rules
   */
  private evaluateTruthiness(value: unknown): boolean {
    // JavaScript falsy values: false, 0, -0, 0n, "", null, undefined, NaN
    if (value === false) return false;
    if (value === 0 || Object.is(value, -0)) return false;
    if (value === 0n) return false;
    if (value === '') return false;
    if (value === null) return false;
    if (value === undefined) return false;
    if (typeof value === 'number' && isNaN(value)) return false;
    
    // Special cases for objects
    if (Array.isArray(value)) {
      // Arrays are always truthy in JavaScript, even empty ones
      return true;
    }
    
    if (typeof value === 'object' && value !== null) {
      // Objects are always truthy in JavaScript, even empty ones
      return true;
    }
    
    // All other values are truthy
    return true;
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'NotExpression',
      category: 'logical' as const,
      version: '1.0.0',
      description: 'Enhanced logical negation with comprehensive truthiness evaluation',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'boolean negation',
        'truthiness evaluation',
        'type coercion',
        'JavaScript-compatible falsy values',
        'array and object handling',
        'NaN detection'
      ],
      performance: {
        complexity: 'very low',
        averageExecutionTime: '< 0.5ms',
        memoryUsage: 'minimal'
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
 * Factory function for creating enhanced not expression
 */
export function createNotExpression(): EnhancedNotExpression {
  return new EnhancedNotExpression();
}

/**
 * Type guard for not expression input
 */
export function isValidNotExpressionInput(args: unknown[]): args is NotExpressionInput {
  try {
    NotExpressionInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick utility function for testing
 */
export function evaluateNot(
  value: HyperScriptValue,
  context: TypedExecutionContext
): Promise<EvaluationResult<boolean>> {
  const expression = new EnhancedNotExpression();
  return expression.evaluate(context, value);
}

// Default exports
export { EnhancedNotExpression as default };