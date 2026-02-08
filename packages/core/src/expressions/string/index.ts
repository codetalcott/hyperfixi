/**
 * String Expressions - Deep TypeScript Integration
 * Comprehensive string manipulation with full type safety and validation
 * Enhanced for LLM code agents with maximum type safety
 */

import type {
  TypedExpressionImplementation,
  TypedExecutionContext,
  HyperScriptValue,
  EvaluationResult,
} from '../../types/command-types';

// ============================================================================
// Enhanced String Interpolation Expression
// ============================================================================

/**
 * Enhanced string interpolation expression with comprehensive variable substitution
 */
export class StringInterpolationExpression implements TypedExpressionImplementation<string> {
  public readonly name = 'string-interpolation';
  public readonly category = 'string' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'string' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(n)' as const,
    dependencies: ['context-variables'],
  };

  async evaluate(
    context: TypedExecutionContext,
    template: string,
    variables?: Record<string, unknown>
  ): Promise<EvaluationResult<string>> {
    try {
      const templateStr = String(template || '');

      // Handle ${variable} interpolation
      const result = templateStr.replace(/\$\{([^}]+)\}/g, (_match, expression) => {
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
        type: 'string',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'StringInterpolationError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'String interpolation failed',
          code: 'STRING_INTERPOLATION_FAILED',
          suggestions: [
            'Check template syntax using ${variable} format',
            'Ensure referenced variables exist in context',
            'Verify property access paths are valid',
          ],
        },
        type: 'error',
      };
    }
  }

  private evaluateExpression(
    expression: string,
    context: TypedExecutionContext,
    variables?: Record<string, unknown>
  ): unknown {
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
      let current: any =
        variables?.[parts[0]] || context.locals.get(parts[0]) || context.globals.get(parts[0]);

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
export class StringConcatenationExpression implements TypedExpressionImplementation<string> {
  public readonly name = 'string-concat';
  public readonly category = 'string' as const;
  public readonly precedence = 6;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'string' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(n)' as const,
    dependencies: [],
  };

  async evaluate(
    _context: TypedExecutionContext,
    ...values: HyperScriptValue[]
  ): Promise<EvaluationResult<string>> {
    try {
      const result = values
        .map(value => {
          if (value === null) return 'null';
          if (value === undefined) return 'undefined';
          return String(value);
        })
        .join('');

      return {
        success: true,
        value: result,
        type: 'string',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'StringConcatenationError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'String concatenation failed',
          code: 'STRING_CONCATENATION_FAILED',
          suggestions: [
            'Ensure all values can be converted to strings',
            'Check for circular object references',
            'Consider handling null/undefined values explicitly',
          ],
        },
        type: 'error',
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
export class StringLengthExpression implements TypedExpressionImplementation<number> {
  public readonly name = 'string-length';
  public readonly category = 'string' as const;
  public readonly precedence = 10;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'number' as const;

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(1)' as const,
    dependencies: [],
  };

  async evaluate(
    _context: TypedExecutionContext,
    value: HyperScriptValue
  ): Promise<EvaluationResult<number>> {
    try {
      const stringValue = String(value);
      const length = stringValue.length;

      return {
        success: true,
        value: length,
        type: 'number',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'StringLengthError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'String length calculation failed',
          code: 'STRING_LENGTH_FAILED',
          suggestions: [
            'Ensure value can be converted to string',
            'Check for null or undefined input',
          ],
        },
        type: 'error',
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
  'string-interpolation': new StringInterpolationExpression(),
  'string-concat': new StringConcatenationExpression(),
  'string-length': new StringLengthExpression(),
} as const;

/**
 * Factory functions for creating enhanced string expressions
 */
export function createStringInterpolation(): StringInterpolationExpression {
  return new StringInterpolationExpression();
}

export function createStringConcatenation(): StringConcatenationExpression {
  return new StringConcatenationExpression();
}

export function createStringLength(): StringLengthExpression {
  return new StringLengthExpression();
}

/**
 * Utility functions for string operations
 */
export async function interpolateString(
  template: string,
  context: TypedExecutionContext,
  variables?: Record<string, unknown>
): Promise<EvaluationResult<string>> {
  const expr = new StringInterpolationExpression();
  return expr.evaluate(context, template, variables);
}

export async function concatenateStrings(
  context: TypedExecutionContext,
  ...values: HyperScriptValue[]
): Promise<EvaluationResult<string>> {
  const expr = new StringConcatenationExpression();
  return expr.evaluate(context, ...values);
}

export async function getStringLength(
  value: HyperScriptValue,
  context: TypedExecutionContext
): Promise<EvaluationResult<number>> {
  const expr = new StringLengthExpression();
  return expr.evaluate(context, value);
}

export default enhancedStringExpressions;
