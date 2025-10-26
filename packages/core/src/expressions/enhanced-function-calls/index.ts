/**
 * Enhanced Function Calls Expression - JavaScript Interoperability
 * Implements comprehensive function call evaluation with TypeScript integration
 * Handles global functions, method calls, async operations, and proper context binding
 */

import { v, z } from '../../validation/lightweight-validators';
import type {
  HyperScriptValue,
  HyperScriptValueType,
  EvaluationResult,
  TypedExpressionContext,
  TypedExpressionImplementation,
  LLMDocumentation,
  ValidationResult,
  ExpressionCategory,
  ExpressionAnalysisInfo
} from '../../types/enhanced-core';
import type { ValidationError } from '../../types/base-types';

// ============================================================================
// Input Validation Schema
// ============================================================================

/**
 * Schema for function call expression input validation
 */
export const FunctionCallExpressionInputSchema = z.union([
  // Standard function call: functionName, [args]
  v.tuple([
    v.union([
      v.string().describe('Function name or object.method path'),
      z.function().describe('Direct function reference')
    ]).describe('Function to call'),
    v.array(v.unknown()).describe('Function arguments')
  ]),
  // Function call without arguments: functionName
  v.tuple([
    v.union([
      v.string().describe('Function name or object.method path'),
      z.function().describe('Direct function reference')
    ]).describe('Function to call')
  ]),
  // Constructor call: 'new', constructorName, [args]
  v.tuple([
    v.literal('new').describe('Constructor keyword'),
    v.string().describe('Constructor name'),
    v.array(v.unknown()).describe('Constructor arguments')
  ]),
  // Constructor call without arguments: 'new', constructorName
  v.tuple([
    v.literal('new').describe('Constructor keyword'),
    v.string().describe('Constructor name')
  ])
]);

export type FunctionCallExpressionInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced Function Call Expression Implementation
// ============================================================================

/**
 * Enhanced function call expression for JavaScript interoperability
 * Provides comprehensive function invocation with async support
 */
export class EnhancedFunctionCallExpression implements TypedExpressionImplementation<
  HyperScriptValue,
  TypedExpressionContext
> {
  public readonly inputSchema = FunctionCallExpressionInputSchema;
  
  public readonly documentation: LLMDocumentation = {
    summary: 'Invokes JavaScript functions with comprehensive argument handling and async support',
    parameters: [
      {
        name: 'functionReference',
        type: 'string',
        description: 'Function name (for globals) or object.method path (for methods)',
        optional: false,
        examples: ['identity', 'obj.getValue', 'utils.formatDate', 'Math.max']
      },
      {
        name: 'arguments',
        type: 'array',
        description: 'Array of arguments to pass to the function',
        optional: true,
        defaultValue: [],
        examples: ['["hello"]', '[42, true]', '[obj, "key"]']
      }
    ],
    returns: {
      type: 'any',
      description: 'The return value of the invoked function, properly awaited if async',
      examples: ['"result"', '42', 'Promise<value>', 'null']
    },
    examples: [
      {
        title: 'Global function call',
        code: 'identity("hello")',
        explanation: 'Calls window.identity with string argument',
        output: '"hello"'
      },
      {
        title: 'Method call on object',
        code: 'obj.getValue()',
        explanation: 'Calls getValue method on obj with proper this binding',
        output: '"foo"'
      },
      {
        title: 'Function with multiple arguments',
        code: 'Math.max(1, 5, 3)',
        explanation: 'Calls Math.max with multiple numeric arguments',
        output: 5
      },
      {
        title: 'Constructor call',
        code: 'new Date()',
        explanation: 'Creates new Date instance using constructor',
        output: 'Date object'
      },
      {
        title: 'Constructor with arguments',
        code: 'new Array(10)',
        explanation: 'Creates new Array with specified length using constructor',
        output: 'Array of length 10'
      },
      {
        title: 'Async function call',
        code: 'fetchData("url")',
        explanation: 'Calls async function and awaits the result',
        output: 'Promise<data>'
      }
    ],
    seeAlso: ['call command', 'method chaining', 'async operations'],
    tags: ['function', 'interoperability', 'javascript', 'async', 'method']
  };

  // Required TypedExpressionImplementation properties
  public readonly name = 'functionCall';
  public readonly category: ExpressionCategory = 'Special';
  public readonly precedence = 17; // High precedence for function calls
  public readonly associativity: 'left' | 'right' | 'none' = 'left';
  public readonly outputType = 'any';
  public readonly analysisInfo: ExpressionAnalysisInfo = {
    isPure: false,
    canThrow: true,
    complexity: 'O(1)',
    dependencies: []
  };

  /**
   * Validate function call expression arguments
   */
  async validate(args: unknown[]): Promise<ValidationResult> {
    try {
      const validatedArgs = this.inputSchema.parse(args) as unknown[];
      const issues: ValidationError[] = [];

      // Check if this is a constructor call
      const isConstructorCall = validatedArgs[0] === 'new';

      if (isConstructorCall) {
        // Constructor call validation
        const constructorName = validatedArgs[1] as string;
        const constructorArgs = validatedArgs.length > 2 ? (validatedArgs[2] as unknown[]) : [];
        
        if (!constructorName || constructorName.trim().length === 0) {
          issues.push({ type: 'validation-error', message: 'Constructor name cannot be empty', suggestions: [] });
        }

        // Check for potentially dangerous constructors
        const dangerousConstructors = ['Function', 'eval'];
        if (dangerousConstructors.includes(constructorName)) {
          issues.push({ type: 'validation-error', message: `Constructor "${constructorName}" may pose security risks - use with caution`, suggestions: [] });
        }

        // Validate arguments array for constructor
        if (constructorArgs && !Array.isArray(constructorArgs)) {
          issues.push({ type: 'validation-error', message: 'Constructor arguments must be provided as an array', suggestions: [] });
        }
      } else {
        // Regular function call validation
        const functionReference = validatedArgs[0];
        const functionArgs = validatedArgs.length > 1 ? (validatedArgs[1] as unknown[]) : [];
        
        // Validate function reference
        if (typeof functionReference === 'string') {
          if (functionReference.trim().length === 0) {
            issues.push({ type: 'validation-error', message: 'Function name cannot be empty', suggestions: [] });
          }

          if (functionReference.includes('..')) {
            issues.push({ type: 'validation-error', message: 'Invalid function path - contains consecutive dots', suggestions: [] });
          }

          if (functionReference.startsWith('.') || functionReference.endsWith('.')) {
            issues.push({ type: 'validation-error', message: 'Function path cannot start or end with a dot', suggestions: [] });
          }

          // Check for potentially dangerous function names
          const dangerousFunctions = ['eval', 'Function', 'setTimeout', 'setInterval'];
          const functionName = functionReference.split('.').pop() || '';
          if (dangerousFunctions.includes(functionName)) {
            issues.push({ type: 'validation-error', message: `Function "${functionName}" may pose security risks - use with caution`, suggestions: [] });
          }
        }

        // Validate arguments array
        if (functionArgs && !Array.isArray(functionArgs)) {
          issues.push({ type: 'validation-error', message: 'Function arguments must be provided as an array', suggestions: [] });
        }
      }

      return {
        isValid: issues.length === 0,
        errors: issues,
        suggestions: issues.length > 0 ? [
          'Ensure function reference is a valid string or function',
          'Provide arguments as an array, even if empty',
          'Use dot notation for method calls: "object.method"',
          'Avoid potentially dangerous function names'
        ] : []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'syntax-error',
          message: error instanceof Error ? error.message : 'Invalid function call arguments',
          suggestions: []
        }],
        suggestions: [
          'Provide a function name or reference as the first argument',
          'Provide arguments as an array (optional)',
          'Use valid JavaScript identifier syntax for function names'
        ]
      };
    }
  }

  /**
   * Evaluate function call expression with comprehensive handling
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
            name: 'FunctionCallValidationError',
            type: 'validation-error',
            message: `Function call validation failed: ${validationResult.errors.join(', ')}`,
            code: 'FUNCTION_CALL_VALIDATION_ERROR',
            severity: 'error',
          suggestions: []
          },
          type: 'error'
        };
      }

      const parsedArgs = this.inputSchema.parse(args) as unknown[];

      // Check if this is a constructor call
      const isConstructorCall = parsedArgs[0] === 'new';

      if (isConstructorCall) {
        // Handle constructor call: ['new', constructorName, args?]
        const constructorName = parsedArgs[1] as string;
        const constructorArgs = parsedArgs.length > 2 ? (parsedArgs[2] as unknown[]) : [];

        return await this.executeConstructor(constructorName, constructorArgs, context);
      } else {
        // Handle regular function call: [functionReference, args?]
        const functionReference = parsedArgs[0];
        const functionArgs = parsedArgs.length > 1 ? (parsedArgs[1] as unknown[]) : [];

        // Resolve the function to call
        const resolvedFunction = await this.resolveFunction(functionReference as string | Function, context);
        if (!resolvedFunction.success || !resolvedFunction.value) {
          return resolvedFunction;
        }

        // Execute the function call
        const result = await this.executeFunction(
          resolvedFunction.value.func,
          resolvedFunction.value.thisBinding,
          functionArgs,
          context
        );
        
        return result;
      }
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FunctionCallEvaluationError',
          type: 'runtime-error',
          message: `Failed to evaluate function call: ${error instanceof Error ? error.message : String(error)}`,
          code: 'FUNCTION_CALL_EVALUATION_ERROR',
          severity: 'error',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Resolve function reference to callable function with proper this binding
   */
  private async resolveFunction(
    functionReference: string | Function,
    context: TypedExpressionContext
  ): Promise<EvaluationResult<{ func: Function; thisBinding: any }>> {
    
    // Handle direct function reference
    if (typeof functionReference === 'function') {
      return {
        success: true,
        value: { func: functionReference, thisBinding: null },
        type: 'function'
      };
    }

    const functionPath = functionReference as string;
    const pathParts = functionPath.split('.');

    try {
      // Start resolution from multiple contexts
      const resolutionContexts = [
        // 1. Local context and variables
        { name: 'local', obj: context.locals },
        { name: 'variables', obj: context.variables },
        { name: 'meta', obj: context.meta },
        // 2. Direct context properties
        { name: 'context', obj: context },
        // 3. Current element
        { name: 'element', obj: context.me },
        // 4. Global context
        { name: 'global', obj: typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global) }
      ];

      for (const resolutionContext of resolutionContexts) {
        const result = this.resolveFromContext(pathParts, resolutionContext.obj);
        if (result) {
          return {
            success: true,
            value: result,
            type: 'function'
          };
        }
      }

      // Special handling for context method calls (like testArray.join)
      if (pathParts.length > 1) {
        const objectName = pathParts[0];
        
        // Check if we have the object in any context
        for (const resolutionContext of resolutionContexts) {
          let targetObj = null;
          
          if (resolutionContext.obj instanceof Map) {
            targetObj = resolutionContext.obj.get(objectName);
          } else if (resolutionContext.obj && typeof resolutionContext.obj === 'object' && objectName in resolutionContext.obj) {
            targetObj = (resolutionContext.obj as Record<string, unknown>)[objectName];
          }
          
          if (targetObj && typeof targetObj === 'object') {
            // Try to resolve the method on this object
            const methodResult = this.resolveFromContext(pathParts.slice(1), targetObj);
            if (methodResult) {
              // Update the thisBinding to be the target object
              return {
                success: true,
                value: { 
                  func: methodResult.func, 
                  thisBinding: targetObj // Bind to the target object
                },
                type: 'function'
              };
            }
          }
        }
      }

      // Function not found
      return {
        success: false,
        error: {
          name: 'FunctionNotFoundError',
          type: 'context-error',
          message: `Function "${functionPath}" not found in any accessible context`,
          code: 'FUNCTION_NOT_FOUND',
          severity: 'error',
          suggestions: []
        },
        type: 'error'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FunctionResolutionError',
          type: 'runtime-error',
          message: `Failed to resolve function "${functionPath}": ${error instanceof Error ? error.message : String(error)}`,
          code: 'FUNCTION_RESOLUTION_ERROR',
          severity: 'error',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Resolve function from a specific context object
   */
  private resolveFromContext(pathParts: string[], contextObj: any): { func: Function; thisBinding: any } | null {
    try {
      if (!contextObj) {
        return null;
      }

      // Handle Map objects (locals, variables, meta)
      if (contextObj instanceof Map) {
        if (pathParts.length === 1) {
          const func = contextObj.get(pathParts[0]);
          if (typeof func === 'function') {
            return { func, thisBinding: null };
          }
        }
        // For nested paths in Maps, try to get the root object and continue
        if (pathParts.length > 1) {
          const rootObj = contextObj.get(pathParts[0]);
          if (rootObj && typeof rootObj === 'object') {
            return this.resolveFromContext(pathParts.slice(1), rootObj);
          }
        }
        return null;
      }

      // Handle regular objects
      if (typeof contextObj !== 'object') {
        return null;
      }

      let currentObj = contextObj;
      let parentObj = null;

      // Navigate the object path
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        
        if (!(part in currentObj)) {
          return null;
        }

        parentObj = currentObj;
        currentObj = currentObj[part];

        // If we've reached the end and found a function
        if (i === pathParts.length - 1 && typeof currentObj === 'function') {
          // Determine proper 'this' binding
          const thisBinding = pathParts.length > 1 ? parentObj : null;
          return { func: currentObj, thisBinding };
        }

        // If intermediate value is not an object, path resolution fails
        if (typeof currentObj !== 'object' || currentObj === null) {
          return null;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Execute function with proper argument handling and async support
   */
  private async executeFunction(
    func: Function,
    thisBinding: any,
    args: unknown[],
    context: TypedExpressionContext
  ): Promise<EvaluationResult<HyperScriptValue>> {
    try {
      // Resolve any promise arguments first
      const resolvedArgs = await Promise.all(
        args.map(arg => this.resolveArgument(arg, context))
      );

      // Execute the function with proper this binding
      let result: unknown;
      if (thisBinding) {
        result = func.apply(thisBinding, resolvedArgs);
      } else {
        result = func(...resolvedArgs);
      }

      // Handle promise results
      if (result && typeof result === 'object' && 'then' in result) {
        result = await result;
      }

      const valueType = this.inferType(result);

      return {
        success: true,
        value: result as HyperScriptValue,
        type: valueType
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FunctionExecutionError',
          type: 'runtime-error',
          message: `Function execution failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'FUNCTION_EXECUTION_ERROR',
          severity: 'error',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Execute constructor with 'new' keyword and proper argument handling
   */
  private async executeConstructor(
    constructorName: string,
    args: unknown[],
    context: TypedExpressionContext
  ): Promise<EvaluationResult<HyperScriptValue>> {
    try {
      // Resolve constructor from context
      const constructor = await this.resolveConstructor(constructorName, context);
      if (!constructor.success || !constructor.value) {
        return constructor;
      }

      // Resolve any promise arguments first
      const resolvedArgs = await Promise.all(
        args.map(arg => this.resolveArgument(arg, context))
      );

      // Execute the constructor with new keyword
      const result = new (constructor.value as new (...args: any[]) => any)(...resolvedArgs);

      // Handle promise results
      let finalResult = result;
      if (result && typeof result === 'object' && 'then' in result) {
        finalResult = await result;
      }

      const valueType = this.inferType(finalResult);

      return {
        success: true,
        value: finalResult as HyperScriptValue,
        type: valueType
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ConstructorExecutionError',
          type: 'runtime-error',
          message: `Constructor execution failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'CONSTRUCTOR_EXECUTION_ERROR',
          severity: 'error',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Resolve constructor function from contexts
   */
  private async resolveConstructor(
    constructorName: string,
    context: TypedExpressionContext
  ): Promise<EvaluationResult<Function>> {
    try {
      // Start resolution from multiple contexts
      const resolutionContexts = [
        // 1. Local context and variables
        { name: 'local', obj: context.locals },
        { name: 'variables', obj: context.variables },
        { name: 'meta', obj: context.meta },
        // 2. Direct context properties
        { name: 'context', obj: context },
        // 3. Current element
        { name: 'element', obj: context.me },
        // 4. Global context
        { name: 'global', obj: typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global) }
      ];

      for (const resolutionContext of resolutionContexts) {
        let constructor = null;
        
        if (resolutionContext.obj instanceof Map) {
          constructor = resolutionContext.obj.get(constructorName);
        } else if (resolutionContext.obj && typeof resolutionContext.obj === 'object' && constructorName in resolutionContext.obj) {
          constructor = (resolutionContext.obj as Record<string, unknown>)[constructorName];
        }
        
        if (typeof constructor === 'function') {
          return {
            success: true,
            value: constructor,
            type: 'function'
          };
        }
      }

      // Constructor not found
      return {
        success: false,
        error: {
          name: 'ConstructorNotFoundError',
          type: 'context-error',
          message: `Constructor "${constructorName}" not found in any accessible context`,
          code: 'CONSTRUCTOR_NOT_FOUND',
          severity: 'error',
          suggestions: []
        },
        type: 'error'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ConstructorResolutionError',
          type: 'runtime-error',
          message: `Failed to resolve constructor "${constructorName}": ${error instanceof Error ? error.message : String(error)}`,
          code: 'CONSTRUCTOR_RESOLUTION_ERROR',
          severity: 'error',
          suggestions: []
        },
        type: 'error'
      };
    }
  }

  /**
   * Resolve individual arguments, handling expressions and promises
   */
  private async resolveArgument(arg: unknown, _context: TypedExpressionContext): Promise<unknown> {
    // If argument is a promise, await it
    if (arg && typeof arg === 'object' && 'then' in arg) {
      return await arg;
    }

    // For other types, return as-is
    // Note: In a full implementation, this might evaluate hyperscript expressions
    return arg;
  }

  /**
   * Infer the type of a function result
   */
  private inferType(value: unknown): HyperScriptValueType {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof HTMLElement) return 'element';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'function') return 'function';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'FunctionCallExpression',
      category: 'interoperability' as const,
      version: '1.0.0',
      description: 'Enhanced function call evaluation with async support and proper context binding',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'global functions',
        'method calls',
        'async functions',
        'promise arguments',
        'proper this binding',
        'error handling'
      ],
      performance: {
        complexity: 'medium',
        averageExecutionTime: '< 5ms',
        memoryUsage: 'moderate'
      },
      capabilities: {
        contextAware: true,
        supportsAsync: true,
        sideEffects: true, // Functions may have side effects
        cacheable: false // Function results shouldn't be cached
      }
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Factory function for creating enhanced function call expressions
 */
export function createFunctionCallExpression(): EnhancedFunctionCallExpression {
  return new EnhancedFunctionCallExpression();
}

/**
 * Type guard for function call expression inputs
 */
export function isValidFunctionCallInput(args: unknown[]): args is FunctionCallExpressionInput {
  try {
    FunctionCallExpressionInputSchema.parse(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick function call utility for testing
 */
export async function callFunction(
  functionReference: string | Function,
  args: unknown[],
  context: TypedExpressionContext
): Promise<EvaluationResult<HyperScriptValue>> {
  const expression = new EnhancedFunctionCallExpression();
  return expression.evaluate(context, functionReference, args);
}

// Default export
export default EnhancedFunctionCallExpression;