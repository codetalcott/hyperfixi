/**
 * Enhanced Advanced Expressions - Deep TypeScript Integration
 * Lambda expressions, async expressions, error handling expressions with full type safety
 * Enhanced for LLM code agents with maximum type safety
 */

// Advanced expressions implementation
import { z } from 'zod';
import type {
  BaseTypedExpression,
  TypedExecutionContext,
  TypedResult,
  LLMDocumentation,
  EvaluationType,
  ValidationResult,
  ExpressionMetadata
} from '../../types/base-types.js';
import type { ExpressionCategory } from '../../types/enhanced-expressions.js';

// ============================================================================
// Enhanced Lambda Expression
// ============================================================================

/**
 * Enhanced lambda expression with type-safe function creation
 */
export class EnhancedLambdaExpression implements BaseTypedExpression<Function> {
  public readonly name = 'lambda';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = '\\(params) -> expression';
  public readonly outputType: EvaluationType = 'Any';
  public readonly inputSchema = z.object({
    parameters: z.array(z.string()).describe('Function parameter names'),
    body: z.string().describe('Function body expression')
  });
  
  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'medium',
    sideEffects: [],
    dependencies: ['context'],
    returnTypes: ['Any'],
    examples: [],
    relatedExpressions: [],
    performance: {
      averageTime: 1,
      complexity: 'O(1)'
    }
  };

  public readonly analysisInfo = {
    isPure: true,
    canThrow: false,
    complexity: 'O(1)' as const,
    dependencies: ['context']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates lambda function with parameters and body expression',
    parameters: [
      {
        name: 'parameters',
        type: 'array',
        description: 'Function parameter names',
        optional: false,
        examples: ['["x", "y"]', '["item"]', '[]']
      },
      {
        name: 'body',
        type: 'string',
        description: 'Function body expression',
        optional: false,
        examples: ['x + y', 'item.name', 'true']
      }
    ],
    returns: {
      type: 'function',
      description: 'Lambda function that can be called with arguments',
      examples: ['function(x, y) { return x + y; }']
    },
    examples: [
      {
        title: 'Simple arithmetic lambda',
        code: 'lambda(["x", "y"], "x + y")',
        explanation: 'Create function that adds two numbers',
        output: 'function(x, y) { return x + y; }'
      },
      {
        title: 'Property accessor lambda',
        code: 'lambda(["item"], "item.name")',
        explanation: 'Create function that extracts name property',
        output: 'function(item) { return item.name; }'
      }
    ],
    seeAlso: ['apply', 'curry', 'compose'],
    tags: ['function', 'lambda', 'closure', 'higher-order']
  };

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid lambda input: ${err.message}`
          })),
          suggestions: ['Provide valid parameters and body']
        };
      }
      return { isValid: true, errors: [], suggestions: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ type: 'runtime-error', message: 'Validation failed' }],
        suggestions: ['Check input structure']
      };
    }
  }

  async evaluate(context: TypedExecutionContext, parameters: string[], body: string): Promise<TypedResult<Function>> {
    try {
      if (!Array.isArray(parameters)) {
        return {
          success: false,
          error: {
            name: 'LambdaError',
            message: 'Parameters must be an array of strings',
            code: 'INVALID_PARAMETERS',
            suggestions: ['Provide an array of parameter names like ["x", "y"]']
          },
          type: 'error'
        };
      }

      if (typeof body !== 'string') {
        return {
          success: false,
          error: {
            name: 'LambdaError',
            message: 'Body must be a string expression',
            code: 'INVALID_BODY',
            suggestions: ['Provide a string expression for the function body']
          },
          type: 'error'
        };
      }

      // Create a lambda function that captures the current context
      const lambdaFunction = (...args: unknown[]) => {
        // Create new context for lambda execution
        const lambdaContext: TypedExecutionContext = {
          ...context,
          locals: new Map(context.locals)
        };
        
        // Bind parameters to arguments
        parameters.forEach((param, index) => {
          lambdaContext.locals.set(param, args[index] ?? null);
        });
        
        // In a real implementation, this would evaluate the body expression
        // For now, return a simplified evaluation
        return this.evaluateLambdaBody(body, lambdaContext, args);
      };

      return {
        success: true,
        value: lambdaFunction,
        type: 'function'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'LambdaError',
          message: error instanceof Error ? error.message : 'Lambda creation failed',
          code: 'LAMBDA_CREATION_FAILED',
          suggestions: ['Check parameter and body syntax']
        },
        type: 'error'
      };
    }
  }

  private evaluateLambdaBody(body: string, context: TypedExecutionContext, args: unknown[]): unknown {
    // Simple expression evaluation for common patterns
    if (body.includes('+') && body.split('+').length === 2) {
      const [left, right] = body.split('+').map(s => s.trim());
      const leftVal = context.locals.get(left) ?? left;
      const rightVal = context.locals.get(right) ?? right;
      
      if (typeof leftVal === 'number' && typeof rightVal === 'number') {
        return leftVal + rightVal;
      }
    }
    
    // Property access
    if (body.includes('.') && body.split('.').length === 2) {
      const [obj, prop] = body.split('.').map(s => s.trim());
      const objVal = context.locals.get(obj);
      if (objVal && typeof objVal === 'object' && objVal !== null) {
        return (objVal as any)[prop];
      }
    }
    
    // Variable access
    if (context.locals.has(body)) {
      return context.locals.get(body)!;
    }
    
    // Literals
    if (body === 'true') return true;
    if (body === 'false') return false;
    if (body === 'null') return null;
    if (!isNaN(Number(body))) return Number(body);
    
    return body;
  }
}

// ============================================================================
// Enhanced Promise Expression
// ============================================================================

/**
 * Enhanced promise creation with type safety
 */
export class EnhancedPromiseExpression implements BaseTypedExpression<Promise<unknown>> {
  public readonly name = 'promise';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'promise(executor)';
  public readonly inputSchema = z.object({
    executor: z.string().describe('Executor expression')
  });
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'medium',
    sideEffects: ['async'],
    dependencies: [],
    returnTypes: ['Any'],
    examples: [],
    relatedExpressions: ['await'],
    performance: {
      averageTime: 1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates a promise with executor function for async operations',
    parameters: [
      {
        name: 'executor',
        type: 'string',
        description: 'Executor expression (resolve/reject calls)',
        optional: false,
        examples: ['resolve(42)', 'reject("error")', 'setTimeout(() => resolve("done"), 1000)']
      }
    ],
    returns: {
      type: 'promise',
      description: 'Promise that resolves or rejects based on executor',
      examples: ['Promise.resolve(42)', 'Promise.reject("error")']
    },
    examples: [
      {
        title: 'Resolve promise',
        code: 'promise("resolve(42)")',
        explanation: 'Create promise that resolves with value 42',
        output: 'Promise.resolve(42)'
      },
      {
        title: 'Reject promise',
        code: 'promise("reject(\\"error\\")")',
        explanation: 'Create promise that rejects with error',
        output: 'Promise.reject("error")'
      }
    ],
    seeAlso: ['await', 'then', 'catch'],
    tags: ['async', 'promise', 'concurrent']
  };

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid promise input: ${err.message}`
          })),
          suggestions: ['Provide valid executor string']
        };
      }
      return { isValid: true, errors: [], suggestions: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ type: 'runtime-error', message: 'Validation failed' }],
        suggestions: ['Check input structure']
      };
    }
  }

  async evaluate(context: TypedExecutionContext, executor: string): Promise<TypedResult<Promise<unknown>>> {
    try {
      const promise = new Promise<unknown>((resolve, reject) => {
        try {
          // Handle resolve calls
          const resolveMatch = executor.match(/resolve\((.+?)\)/);
          if (resolveMatch) {
            const value = this.parseValue(resolveMatch[1]);
            resolve(value);
            return;
          }

          // Handle reject calls
          const rejectMatch = executor.match(/reject\((.+?)\)/);
          if (rejectMatch) {
            const value = this.parseValue(rejectMatch[1]);
            reject(new Error(String(value)));
            return;
          }

          // Handle timeout patterns
          const timeoutMatch = executor.match(/setTimeout\(\(\)\s*=>\s*resolve\((.+?)\),\s*(\d+)\)/);
          if (timeoutMatch) {
            const value = this.parseValue(timeoutMatch[1]);
            const delay = parseInt(timeoutMatch[2]);
            setTimeout(() => resolve(value), delay);
            return;
          }

          // Default to resolving with the executor string
          resolve(executor);
        } catch (error) {
          reject(error);
        }
      });

      return Promise.resolve({
        success: true,
        value: promise,
        type: 'any'
      });

    } catch (error) {
      return Promise.resolve({
        success: false,
        error: {
          name: 'PromiseError',
          message: error instanceof Error ? error.message : 'Promise creation failed',
          code: 'PROMISE_CREATION_FAILED',
          suggestions: ['Check executor syntax', 'Use resolve() or reject() calls']
        },
        type: 'error'
      });
    }
  }

  private parseValue(valueStr: string): unknown {
    const trimmed = valueStr.trim();
    
    // String literals
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    
    // Numbers
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    
    // Booleans
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    
    return trimmed;
  }
}

// ============================================================================
// Enhanced Await Expression
// ============================================================================

/**
 * Enhanced await expression with proper error handling
 */
export class EnhancedAwaitExpression implements BaseTypedExpression<unknown> {
  public readonly name = 'await';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'await promise';
  public readonly inputSchema = z.object({
    promise: z.unknown().describe('Promise to await')
  });
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'medium',
    sideEffects: ['async'],
    dependencies: ['promise'],
    returnTypes: ['Any'],
    examples: [],
    relatedExpressions: ['promise'],
    performance: {
      averageTime: 1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Awaits a promise and returns its resolved value or handles rejection',
    parameters: [
      {
        name: 'promise',
        type: 'promise',
        description: 'Promise to await',
        optional: false,
        examples: ['fetch("/api/data")', 'promise("resolve(42)")', 'delay(1000)']
      }
    ],
    returns: {
      type: 'unknown',
      description: 'Resolved value of the promise',
      examples: ['42', '{"data": "value"}', 'null']
    },
    examples: [
      {
        title: 'Await simple promise',
        code: 'await promise("resolve(42)")',
        explanation: 'Wait for promise to resolve and return value',
        output: 42
      },
      {
        title: 'Await with error handling',
        code: 'await fetch("/api/data")',
        explanation: 'Await API response',
        output: '{"success": true}'
      }
    ],
    seeAlso: ['promise', 'then', 'catch'],
    tags: ['async', 'await', 'promise']
  };

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid await input: ${err.message}`
          })),
          suggestions: ['Provide valid promise']
        };
      }
      return { isValid: true, errors: [], suggestions: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ type: 'runtime-error', message: 'Validation failed' }],
        suggestions: ['Check input structure']
      };
    }
  }

  async evaluate(context: TypedExecutionContext, promise: unknown): Promise<TypedResult<unknown>> {
    try {
      if (promise instanceof Promise) {
        const result = await promise;
        return {
          success: true,
          value: result,
          type: typeof result as any
        };
      }

      // If not a promise, return the value directly
      return {
        success: true,
        value: promise,
        type: typeof promise as any
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'AwaitError',
          message: error instanceof Error ? error.message : 'Await operation failed',
          code: 'AWAIT_FAILED',
          suggestions: ['Check promise implementation', 'Handle promise rejection']
        },
        type: 'error'
      };
    }
  }
}

// ============================================================================
// Enhanced Error Expression
// ============================================================================

/**
 * Enhanced error creation with comprehensive error handling
 */
export class EnhancedErrorExpression implements BaseTypedExpression<Error> {
  public readonly name = 'error';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'error(message, name?, code?)';
  public readonly inputSchema = z.object({
    message: z.string().describe('Error message'),
    name: z.string().optional().describe('Error name'),
    code: z.string().optional().describe('Error code')
  });
  public readonly outputType: EvaluationType = 'Any';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Any'],
    examples: [],
    relatedExpressions: [],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates error objects with customizable properties',
    parameters: [
      {
        name: 'message',
        type: 'string',
        description: 'Error message',
        optional: false,
        examples: ['"Something went wrong"', '"Validation failed"', '"Network error"']
      },
      {
        name: 'name',
        type: 'string',
        description: 'Error name/type',
        optional: true,
        examples: ['"ValidationError"', '"NetworkError"', '"TypeError"']
      },
      {
        name: 'code',
        type: 'string',
        description: 'Error code',
        optional: true,
        examples: ['"E001"', '"NETWORK_TIMEOUT"', '"INVALID_INPUT"']
      }
    ],
    returns: {
      type: 'error',
      description: 'Error object with specified properties',
      examples: ['Error("Something went wrong")', 'ValidationError("Invalid input")']
    },
    examples: [
      {
        title: 'Basic error',
        code: 'error("Something went wrong")',
        explanation: 'Create simple error with message',
        output: 'Error("Something went wrong")'
      },
      {
        title: 'Typed error',
        code: 'error("Invalid input", "ValidationError")',
        explanation: 'Create error with custom type',
        output: 'ValidationError("Invalid input")'
      }
    ],
    seeAlso: ['throw', 'try', 'catch'],
    tags: ['error', 'exception', 'validation']
  };

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid error input: ${err.message}`
          })),
          suggestions: ['Provide valid error message']
        };
      }
      return { isValid: true, errors: [], suggestions: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ type: 'runtime-error', message: 'Validation failed' }],
        suggestions: ['Check input structure']
      };
    }
  }

  async evaluate(context: TypedExecutionContext, message: string, name?: string, code?: string): Promise<TypedResult<Error>> {
    try {
      const error = new Error(String(message));
      
      if (name) {
        error.name = String(name);
      }
      
      if (code) {
        (error as any).code = String(code);
      }

      return {
        success: true,
        value: error,
        type: 'any'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ErrorCreationError',
          message: error instanceof Error ? error.message : 'Error creation failed',
          code: 'ERROR_CREATION_FAILED',
          suggestions: ['Check error message and properties']
        },
        type: 'error'
      };
    }
  }
}

// ============================================================================
// Enhanced Type Checking Expression
// ============================================================================

/**
 * Enhanced typeof expression with comprehensive type checking
 */
export class EnhancedTypeofExpression implements BaseTypedExpression<string> {
  public readonly name = 'typeof';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'typeof value';
  public readonly inputSchema = z.object({
    value: z.unknown().describe('Value to check type of')
  });
  public readonly outputType: EvaluationType = 'String';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['String'],
    examples: [],
    relatedExpressions: [],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Returns detailed type information about a value',
    parameters: [
      {
        name: 'value',
        type: 'unknown',
        description: 'Value to check type of',
        optional: false,
        examples: ['42', '"hello"', 'true', 'null', '[]', '{}']
      }
    ],
    returns: {
      type: 'string',
      description: 'Type string with detailed information',
      examples: ['"number"', '"string"', '"boolean"', '"null"', '"array"', '"object"']
    },
    examples: [
      {
        title: 'Number type',
        code: 'typeof 42',
        explanation: 'Check type of number',
        output: '"number"'
      },
      {
        title: 'Array type',
        code: 'typeof []',
        explanation: 'Check type of array',
        output: '"array"'
      }
    ],
    seeAlso: ['instanceof', 'isError', 'isArray'],
    tags: ['type', 'check', 'validation']
  };

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid typeof input: ${err.message}`
          })),
          suggestions: ['Provide valid value']
        };
      }
      return { isValid: true, errors: [], suggestions: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ type: 'runtime-error', message: 'Validation failed' }],
        suggestions: ['Check input structure']
      };
    }
  }

  async evaluate(context: TypedExecutionContext, value: unknown): Promise<TypedResult<string>> {
    try {
      let typeResult: string;

      if (value === null) {
        typeResult = 'null';
      } else if (Array.isArray(value)) {
        typeResult = 'array';
      } else if (value instanceof Date) {
        typeResult = 'date';
      } else if (value instanceof Error) {
        typeResult = 'error';
      } else if (value instanceof Promise) {
        typeResult = 'promise';
      } else if (value instanceof RegExp) {
        typeResult = 'regexp';
      } else {
        typeResult = typeof value;
      }

      return {
        success: true,
        value: typeResult,
        type: 'string'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TypeofError',
          message: error instanceof Error ? error.message : 'Type checking failed',
          code: 'TYPEOF_FAILED',
          suggestions: ['Check if value is accessible']
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
 * Enhanced advanced expressions registry
 */
export const enhancedAdvancedExpressions = {
  'lambda': new EnhancedLambdaExpression(),
  'promise': new EnhancedPromiseExpression(),
  'await': new EnhancedAwaitExpression(),
  'error': new EnhancedErrorExpression(),
  'typeof': new EnhancedTypeofExpression()
} as const;

/**
 * Factory functions for creating enhanced advanced expressions
 */
export function createEnhancedLambda(): EnhancedLambdaExpression {
  return new EnhancedLambdaExpression();
}

export function createEnhancedPromise(): EnhancedPromiseExpression {
  return new EnhancedPromiseExpression();
}

export function createEnhancedAwait(): EnhancedAwaitExpression {
  return new EnhancedAwaitExpression();
}

export function createEnhancedError(): EnhancedErrorExpression {
  return new EnhancedErrorExpression();
}

export function createEnhancedTypeof(): EnhancedTypeofExpression {
  return new EnhancedTypeofExpression();
}

/**
 * Utility functions for advanced operations
 */
export async function createLambda(parameters: string[], body: string, context: TypedExecutionContext): Promise<TypedResult<Function>> {
  const expr = new EnhancedLambdaExpression();
  return expr.evaluate(context, parameters, body);
}

export async function createPromise(executor: string, context: TypedExecutionContext): Promise<TypedResult<Promise<unknown>>> {
  const expr = new EnhancedPromiseExpression();
  return expr.evaluate(context, executor);
}

export async function awaitPromise(promise: unknown, context: TypedExecutionContext): Promise<TypedResult<unknown>> {
  const expr = new EnhancedAwaitExpression();
  return expr.evaluate(context, promise);
}

export async function createError(message: string, context: TypedExecutionContext, name?: string, code?: string): Promise<TypedResult<Error>> {
  const expr = new EnhancedErrorExpression();
  return expr.evaluate(context, message, name, code);
}

export async function getTypeOf(value: unknown, context: TypedExecutionContext): Promise<TypedResult<string>> {
  const expr = new EnhancedTypeofExpression();
  return expr.evaluate(context, value);
}

export default enhancedAdvancedExpressions;