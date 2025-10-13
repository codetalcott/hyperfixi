/**
 * Enhanced String Expressions - Deep TypeScript Integration
 * Comprehensive string manipulation with full type safety and validation
 * Enhanced for LLM code agents with maximum type safety
 */

import { v, z, type RuntimeValidator } from '../../validation/lightweight-validators';
import type {
  TypedExpressionImplementation,
  TypedExecutionContext,
  HyperScriptValue,
  EvaluationResult,
  LLMDocumentation
} from '../../types/enhanced-core';

// ============================================================================
// Enhanced String Interpolation Expression
// ============================================================================

/**
 * String interpolation input schema
 */
const StringInterpolationInputSchema = v.object({
  template: v.string(),
  variables: z.record(v.string(), v.unknown()).optional()
});

type StringInterpolationInput = z.infer<typeof StringInterpolationInputSchema>;

/**
 * Enhanced string interpolation expression with comprehensive variable substitution
 */
export class EnhancedStringInterpolationExpression implements TypedExpressionImplementation<string> {
  public readonly name = 'string-interpolation';
  public readonly category = 'string' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'string' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(n)' as const,
    dependencies: ['context-variables']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Interpolates variables and expressions in template strings using ${variable} syntax',
    parameters: [
      {
        name: 'template',
        type: 'string',
        description: 'Template string with ${variable} placeholders',
        optional: false,
        examples: ['Hello ${name}!', 'User: ${user.name} (${user.age} years old)']
      },
      {
        name: 'variables',
        type: 'object',
        description: 'Optional variables to use for interpolation',
        optional: true,
        examples: ['{"name": "John"}', '{"user": {"name": "Jane", "age": 30}}']
      }
    ],
    returns: {
      type: 'string',
      description: 'String with variables interpolated',
      examples: ['Hello John!', 'User: Jane (30 years old)']
    },
    examples: [
      {
        title: 'Basic variable interpolation',
        code: 'Hello ${name}!',
        explanation: 'Substitutes the name variable into the template',
        output: 'Hello John!'
      },
      {
        title: 'Context variable access',
        code: 'Element: ${me.tagName}',
        explanation: 'Access current element properties',
        output: 'Element: DIV'
      },
      {
        title: 'Complex object access',
        code: 'User: ${user.name} (${user.age})',
        explanation: 'Access nested object properties',
        output: 'User: Jane (30)'
      }
    ],
    seeAlso: ['string-concat', 'string-format'],
    tags: ['string', 'template', 'interpolation', 'variables']
  };

  async evaluate(context: TypedExecutionContext, template: string, variables?: Record<string, unknown>): Promise<EvaluationResult<string>> {
    try {
      const templateStr = String(template || '');
      
      // Handle ${variable} interpolation
      const result = templateStr.replace(/\$\{([^}]+)\}/g, (match, expression) => {
        try {
          const value = this.evaluateExpression(expression.trim(), context, variables);
          return String(value);
        } catch (error) {
          return 'undefined';
        }
      });

      return {
        success: true,
        value: result,
        type: 'string'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'StringInterpolationError',
          message: error instanceof Error ? error.message : 'String interpolation failed',
          code: 'STRING_INTERPOLATION_FAILED',
          suggestions: [
            'Check template syntax using ${variable} format',
            'Ensure referenced variables exist in context',
            'Verify property access paths are valid'
          ]
        },
        type: 'error'
      };
    }
  }

  private evaluateExpression(expression: string, context: TypedExecutionContext, variables?: Record<string, unknown>): unknown {
    // Handle me.property
    if (expression.startsWith('me.')) {
      const prop = expression.substring(3);
      return context.me ? (context.me as any)[prop] : undefined;
    }
    
    // Handle you.property
    if (expression.startsWith('you.')) {
      const prop = expression.substring(3);
      return context.you ? (context.you as any)[prop] : undefined;
    }
    
    // Handle it.property or just it
    if (expression === 'it') {
      return context.it;
    }
    if (expression.startsWith('it.')) {
      const prop = expression.substring(3);
      return (context.it as any)?.[prop];
    }
    
    // Handle variables from input
    if (variables && expression in variables) {
      return variables[expression];
    }
    
    // Handle nested object access (user.name)
    if (expression.includes('.')) {
      const parts = expression.split('.');
      let current: any = variables?.[parts[0]] || context.locals.get(parts[0]) || context.globals.get(parts[0]);
      
      for (let i = 1; i < parts.length && current != null; i++) {
        current = current[parts[i]];
      }
      
      return current;
    }
    
    // Handle local and global variables
    return context.locals.get(expression) || context.globals.get(expression) || undefined;
  }
}

// ============================================================================
// Enhanced String Concatenation Expression
// ============================================================================

/**
 * Enhanced string concatenation with type coercion
 */
export class EnhancedStringConcatenationExpression implements TypedExpressionImplementation<string> {
  public readonly name = 'string-concat';
  public readonly category = 'string' as const;
  public readonly precedence = 6;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'string' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(n)' as const,
    dependencies: []
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Concatenates multiple values into a single string with automatic type conversion',
    parameters: [
      {
        name: 'values',
        type: 'array',
        description: 'Values to concatenate (will be converted to strings)',
        optional: false,
        examples: ['["Hello", " ", "World"]', '[42, " items"]', '[null, undefined, "text"]']
      }
    ],
    returns: {
      type: 'string',
      description: 'Concatenated string result',
      examples: ['Hello World', '42 items', 'nullundefinedtext']
    },
    examples: [
      {
        title: 'Simple concatenation',
        code: 'concat("Hello", " ", "World")',
        explanation: 'Joins multiple strings together',
        output: 'Hello World'
      },
      {
        title: 'Mixed type concatenation',
        code: 'concat("Count: ", 42)',
        explanation: 'Automatically converts numbers to strings',
        output: 'Count: 42'
      },
      {
        title: 'Null/undefined handling',
        code: 'concat("Value: ", null, " End")',
        explanation: 'Handles null and undefined values',
        output: 'Value: null End'
      }
    ],
    seeAlso: ['string-interpolation', 'string-join'],
    tags: ['string', 'concatenation', 'join', 'type-conversion']
  };

  async evaluate(context: TypedExecutionContext, ...values: HyperScriptValue[]): Promise<EvaluationResult<string>> {
    try {
      const result = values.map(value => {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        return String(value);
      }).join('');

      return {
        success: true,
        value: result,
        type: 'string'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'StringConcatenationError',
          message: error instanceof Error ? error.message : 'String concatenation failed',
          code: 'STRING_CONCATENATION_FAILED',
          suggestions: [
            'Ensure all values can be converted to strings',
            'Check for circular object references',
            'Consider handling null/undefined values explicitly'
          ]
        },
        type: 'error'
      };
    }
  }
}

// ============================================================================
// Enhanced String Length Expression
// ============================================================================

/**
 * Enhanced string length with validation
 */
export class EnhancedStringLengthExpression implements TypedExpressionImplementation<number> {
  public readonly name = 'string-length';
  public readonly category = 'string' as const;
  public readonly precedence = 10;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'number' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(1)' as const,
    dependencies: []
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Returns the length of a string with type validation',
    parameters: [
      {
        name: 'value',
        type: 'string',
        description: 'String to measure (non-strings will be converted)',
        optional: false,
        examples: ['Hello', '""', '   ']
      }
    ],
    returns: {
      type: 'number',
      description: 'Length of the string',
      examples: ['5', '0', '3']
    },
    examples: [
      {
        title: 'Basic length',
        code: 'length("Hello")',
        explanation: 'Get length of a string',
        output: 5
      },
      {
        title: 'Empty string',
        code: 'length("")',
        explanation: 'Empty string has length 0',
        output: 0
      },
      {
        title: 'Type conversion',
        code: 'length(123)',
        explanation: 'Numbers are converted to strings first',
        output: 3
      }
    ],
    seeAlso: ['string-empty', 'string-trim'],
    tags: ['string', 'length', 'measure', 'validation']
  };

  async evaluate(context: TypedExecutionContext, value: HyperScriptValue): Promise<EvaluationResult<number>> {
    try {
      const stringValue = String(value);
      const length = stringValue.length;

      return {
        success: true,
        value: length,
        type: 'number'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'StringLengthError',
          message: error instanceof Error ? error.message : 'String length calculation failed',
          code: 'STRING_LENGTH_FAILED',
          suggestions: [
            'Ensure value can be converted to string',
            'Check for null or undefined input'
          ]
        },
        type: 'error'
      };
    }
  }
}

// ============================================================================
// Expression Registry and Exports
// ============================================================================

/**
 * Enhanced string expressions registry
 */
export const enhancedStringExpressions = {
  'string-interpolation': new EnhancedStringInterpolationExpression(),
  'string-concat': new EnhancedStringConcatenationExpression(),
  'string-length': new EnhancedStringLengthExpression()
} as const;

/**
 * Factory functions for creating enhanced string expressions
 */
export function createEnhancedStringInterpolation(): EnhancedStringInterpolationExpression {
  return new EnhancedStringInterpolationExpression();
}

export function createEnhancedStringConcatenation(): EnhancedStringConcatenationExpression {
  return new EnhancedStringConcatenationExpression();
}

export function createEnhancedStringLength(): EnhancedStringLengthExpression {
  return new EnhancedStringLengthExpression();
}

/**
 * Utility functions for string operations
 */
export async function interpolateString(template: string, context: TypedExecutionContext, variables?: Record<string, unknown>): Promise<EvaluationResult<string>> {
  const expr = new EnhancedStringInterpolationExpression();
  return expr.evaluate(context, template, variables);
}

export async function concatenateStrings(context: TypedExecutionContext, ...values: HyperScriptValue[]): Promise<EvaluationResult<string>> {
  const expr = new EnhancedStringConcatenationExpression();
  return expr.evaluate(context, ...values);
}

export async function getStringLength(value: HyperScriptValue, context: TypedExecutionContext): Promise<EvaluationResult<number>> {
  const expr = new EnhancedStringLengthExpression();
  return expr.evaluate(context, value);
}

export default enhancedStringExpressions;