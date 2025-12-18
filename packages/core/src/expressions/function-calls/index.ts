/**
 * Enhanced Function Calls Expression - JavaScript Interoperability
 *
 * This expression handles function invocation from hyperscript with comprehensive
 * JavaScript interoperability. It supports:
 * - Global function calls: `Math.max(1, 2, 3)`
 * - Method calls: `element.getAttribute('id')`
 * - Constructor calls: `new Date()`
 * - Async function invocation with automatic promise awaiting
 * - Proper this binding for method calls
 *
 * RELATED COMPONENT - See BaseExpressionEvaluator:
 * ──────────────────────────────────────────────
 * BaseExpressionEvaluator.evaluateCallExpression() handles AST-based function calls
 * from the parser (e.g., `call #dialog.showModal()`) using explicit AST structures.
 *
 * COMPARISON:
 * ┌──────────────────┬──────────────────────┬──────────────────────────┐
 * │ Aspect           │ BaseExpressionEval   │ FunctionCallExpression   │
 * ├──────────────────┼──────────────────────┼──────────────────────────┤
 * │ Entry Point      │ evaluateCallExpr()   │ evaluate() method        │
 * │ Input Type       │ AST callExpression   │ String path/function ref │
 * │ Source           │ Parser generates     │ Expression system        │
 * │ Callee Types     │ memberExpression     │ String paths or direct   │
 * │                  │ propertyAccess       │ function references      │
 * │ Resolution       │ Evaluate AST parts   │ String split + context   │
 * │ Error Handling   │ Try-catch exceptions │ Result-based pattern     │
 * │ Use Case         │ Parsed hyperscript   │ Runtime expressions      │
 * └──────────────────┴──────────────────────┴──────────────────────────┘
 *
 * WHEN TO USE WHICH:
 * - BaseExpressionEvaluator: You have parsed hyperscript code (AST nodes)
 * - FunctionCallExpression: You need flexible runtime function resolution
 *
 * Both approaches coexist because they serve different execution pipelines.
 * They are complementary, not redundant.
 *
 * Implementation uses:
 * - Result-based error handling (returns EvaluationResult<T> not exceptions)
 * - String path resolution: "obj.method" → traverse object hierarchy
 * - Multi-context resolution: locals → variables → meta → context → element → global
 * - Type inference via centralized type-helpers for consistency
 *
 * @see BaseExpressionEvaluator#evaluateCallExpression() in packages/core/src/core/base-expression-evaluator.ts
 * @see BaseExpressionEvaluator#evaluateMethodCall() for AST-based method call handler
 */

import { v, z } from '../../validation/lightweight-validators';
import type {
  HyperScriptValue,
  HyperScriptValueType,
  EvaluationResult,
  TypedExpressionContext,
  TypedExpressionImplementation,
  ValidationResult,
  ExpressionCategory,
  ExpressionAnalysisInfo,
} from '../../types/command-types';
import type { ValidationError } from '../../types/base-types';
import { isString, isNumber, isBoolean, isObject, isFunction, inferType } from '../type-helpers';

// ============================================================================
// Input Validation Schema
// ============================================================================

/**
 * Schema for function call expression input validation
 */
export const FunctionCallExpressionInputSchema = z.union([
  // Standard function call: functionName, [args]
  v.tuple([
    v
      .union([
        v.string().describe('Function name or object.method path'),
        z.function().describe('Direct function reference'),
      ])
      .describe('Function to call'),
    v.array(v.unknown()).describe('Function arguments'),
  ]),
  // Function call without arguments: functionName
  v.tuple([
    v
      .union([
        v.string().describe('Function name or object.method path'),
        z.function().describe('Direct function reference'),
      ])
      .describe('Function to call'),
  ]),
  // Constructor call: 'new', constructorName, [args]
  v.tuple([
    v.literal('new').describe('Constructor keyword'),
    v.string().describe('Constructor name'),
    v.array(v.unknown()).describe('Constructor arguments'),
  ]),
  // Constructor call without arguments: 'new', constructorName
  v.tuple([
    v.literal('new').describe('Constructor keyword'),
    v.string().describe('Constructor name'),
  ]),
]);

export type FunctionCallExpressionInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced Function Call Expression Implementation
// ============================================================================

/**
 * Enhanced function call expression for JavaScript interoperability
 * Provides comprehensive function invocation with async support
 *
 * ARCHITECTURAL DESIGN NOTES:
 *
 * This class handles function calls VIA THE EXPRESSION SYSTEM, which is
 * DIFFERENT from BaseExpressionEvaluator.evaluateCallExpression().
 *
 * COMPARISON TABLE:
 * ┌─────────────────────────────┬──────────────────────┬──────────────────────┐
 * │ Aspect                      │ BaseExpressionEval   │ FunctionCallExpr      │
 * ├─────────────────────────────┼──────────────────────┼──────────────────────┤
 * │ Input Source                │ AST nodes from       │ Expressions/strings   │
 * │                             │ the parser           │ at runtime            │
 * ├─────────────────────────────┼──────────────────────┼──────────────────────┤
 * │ AST Types Handled           │ memberExpression     │ N/A - receives        │
 * │                             │ propertyAccess       │ string paths or       │
 * │                             │                      │ function refs         │
 * ├─────────────────────────────┼──────────────────────┼──────────────────────┤
 * │ Path Format                 │ Explicit AST node    │ String paths:         │
 * │                             │ fields (object,      │ "Math.max"            │
 * │                             │ property)            │ "element.getAttribute"│
 * ├─────────────────────────────┼──────────────────────┼──────────────────────┤
 * │ Resolution Strategy         │ Evaluate AST left    │ String split + multi- │
 * │                             │ side, get property   │ context traversal     │
 * ├─────────────────────────────┼──────────────────────┼──────────────────────┤
 * │ Error Handling              │ Try-catch +          │ Result-based (no      │
 * │                             │ throw exceptions     │ exceptions)           │
 * ├─────────────────────────────┼──────────────────────┼──────────────────────┤
 * │ Use Case                    │ Parser-generated     │ Expression system     │
 * │                             │ call expressions     │ function invocation   │
 * └─────────────────────────────┴──────────────────────┴──────────────────────┘
 *
 * EXAMPLE WORKFLOWS:
 *
 * BaseExpressionEvaluator approach:
 * - Parser: "call #dialog.showModal()" → callExpression AST
 * - Has: { type: 'callExpression', callee: propertyAccess, ... }
 * - Evaluator: Extract callee, evaluate it, apply with args
 *
 * FunctionCallExpression approach:
 * - Expression: receives string "Math.max" or path "dialog.showModal"
 * - Splits path: "Math.max" → ["Math", "max"]
 * - Resolves from contexts: get Math, then Math.max
 * - Executes with proper this binding
 *
 * WHY TWO DIFFERENT APPROACHES:
 * 1. Parser-based (BaseExpressionEvaluator): Structured, type-safe, explicit
 * 2. Expression-based (FunctionCallExpression): Flexible, runtime resolution
 *
 * They serve different parts of the execution pipeline and are not redundant.
 *
 * @see BaseExpressionEvaluator#evaluateCallExpression() in packages/core/src/core/base-expression-evaluator.ts
 * @see BaseExpressionEvaluator#evaluateMethodCall() for the AST-based method call handler
 */
export class FunctionCallExpression
  implements TypedExpressionImplementation<HyperScriptValue, TypedExpressionContext>
{
  public readonly inputSchema = FunctionCallExpressionInputSchema;

  

  // Required TypedExpressionImplementation properties
  public readonly name = 'functionCall';
  public readonly category: ExpressionCategory = 'special';
  public readonly precedence = 17; // High precedence for function calls
  public readonly associativity: 'left' | 'right' | 'none' = 'left';
  public readonly outputType = 'any';
  public readonly analysisInfo: ExpressionAnalysisInfo = {
    isPure: false,
    canThrow: true,
    complexity: 'O(1)',
    dependencies: [],
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
          issues.push({
            type: 'validation-error',
            message: 'Constructor name cannot be empty',
            suggestions: [],
          });
        }

        // Check for potentially dangerous constructors
        const dangerousConstructors = ['Function', 'eval'];
        if (dangerousConstructors.includes(constructorName)) {
          issues.push({
            type: 'validation-error',
            message: `Constructor "${constructorName}" may pose security risks - use with caution`,
            suggestions: [],
          });
        }

        // Validate arguments array for constructor
        if (constructorArgs && !Array.isArray(constructorArgs)) {
          issues.push({
            type: 'validation-error',
            message: 'Constructor arguments must be provided as an array',
            suggestions: [],
          });
        }
      } else {
        // Regular function call validation
        const functionReference = validatedArgs[0] as unknown;
        const functionArgs = validatedArgs.length > 1 ? (validatedArgs[1] as unknown[]) : [];

        // Validate function reference
        if (isString(functionReference)) {
          const funcRef = functionReference as string;
          if (funcRef.trim().length === 0) {
            issues.push({
              type: 'validation-error',
              message: 'Function name cannot be empty',
              suggestions: [],
            });
          }

          if (funcRef.includes('..')) {
            issues.push({
              type: 'validation-error',
              message: 'Invalid function path - contains consecutive dots',
              suggestions: [],
            });
          }

          if (funcRef.startsWith('.') || funcRef.endsWith('.')) {
            issues.push({
              type: 'validation-error',
              message: 'Function path cannot start or end with a dot',
              suggestions: [],
            });
          }

          // Check for potentially dangerous function names
          const dangerousFunctions = ['eval', 'Function', 'setTimeout', 'setInterval'];
          const functionName = funcRef.split('.').pop() || '';
          if (dangerousFunctions.includes(functionName)) {
            issues.push({
              type: 'validation-error',
              message: `Function "${functionName}" may pose security risks - use with caution`,
              suggestions: [],
            });
          }
        }

        // Validate arguments array
        if (functionArgs && !Array.isArray(functionArgs)) {
          issues.push({
            type: 'validation-error',
            message: 'Function arguments must be provided as an array',
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
                'Ensure function reference is a valid string or function',
                'Provide arguments as an array, even if empty',
                'Use dot notation for method calls: "object.method"',
                'Avoid potentially dangerous function names',
              ]
            : [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            type: 'syntax-error',
            message: error instanceof Error ? error.message : 'Invalid function call arguments',
            suggestions: [],
          },
        ],
        suggestions: [
          'Provide a function name or reference as the first argument',
          'Provide arguments as an array (optional)',
          'Use valid JavaScript identifier syntax for function names',
        ],
      };
    }
  }

  /**
   * Evaluate function call expression with comprehensive handling
   *
   * Supports three call patterns:
   * 1. Function call with arguments: [functionRef, args]
   *    - functionRef: string path ("Math.max") or direct function reference
   *    - args: array of arguments to pass to the function
   * 2. Function call without arguments: [functionRef]
   * 3. Constructor call: ['new', constructorName, args?]
   *
   * FUNCTION RESOLUTION (String Path Approach):
   * When functionRef is a string, it's treated as a dot-notation path:
   * - "Math.max" → resolve "Math" then access "max" property
   * - "element.getAttribute" → resolve "element" then access "getAttribute" property
   * - "myFunc" → resolve directly from contexts
   *
   * Resolution order: locals → variables → meta → context → element → global
   *
   * THIS BINDING:
   * For string paths with dots, 'this' is bound to the parent object:
   * - "Math.max" → func is Math.max, thisBinding is Math
   * - "element.getAttribute" → func is getAttribute, thisBinding is element
   * This ensures methods work correctly with proper context.
   *
   * ASYNC HANDLING:
   * Both function results and arguments are automatically awaited if they
   * are promises, enabling seamless async/await in hyperscript.
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
            suggestions: [],
          },
          type: 'error',
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
        // functionReference can be:
        // - String path: "Math.max", "element.getAttribute", "myFunc"
        // - Direct function reference: (a, b) => a + b
        const functionReference = parsedArgs[0];
        const functionArgs = parsedArgs.length > 1 ? (parsedArgs[1] as unknown[]) : [];

        // Resolve the function to call (string path resolution with multi-context lookup)
        const resolvedFunction = await this.resolveFunction(
          functionReference as string | Function,
          context
        );
        if (!resolvedFunction.success || !resolvedFunction.value) {
          return resolvedFunction;
        }

        // Execute the function call with proper this binding and async handling
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
          suggestions: [],
        },
        type: 'error',
      };
    }
  }

  /**
   * Resolve function reference to callable function with proper this binding
   *
   * This is the KEY DIFFERENCE from BaseExpressionEvaluator.evaluateCallExpression():
   * - BaseExpressionEvaluator: Evaluates AST nodes (memberExpression, propertyAccess)
   * - This method: Resolves STRING PATHS like "Math.max" or "element.getAttribute"
   *
   * STRING PATH RESOLUTION:
   * Converts dot-notation strings into traversable paths:
   * - "Math.max" → ["Math", "max"] → resolve Math, then Math.max
   * - "element.getAttribute" → ["element", "getAttribute"] → resolve element, then element.getAttribute
   * - "myFunc" → ["myFunc"] → resolve myFunc directly
   *
   * MULTI-CONTEXT RESOLUTION (Priority Order):
   * 1. Locals (function scope variables)
   * 2. Variables (execution context variables)
   * 3. Meta (metadata context)
   * 4. Direct context properties
   * 5. Current element (context.me)
   * 6. Global scope (globalThis, window, or Node.js global)
   *
   * THIS BINDING PRESERVATION:
   * For multi-part paths (e.g., "object.method"), the thisBinding is set to the
   * parent object to ensure the method executes with correct context:
   * - Path "Math.max": thisBinding = Math (so Math.max() has correct 'this')
   * - Path "element.getAttribute": thisBinding = element (proper method context)
   *
   * CONTRAST WITH ASTNODE EVALUATION:
   * BaseExpressionEvaluator evaluates already-parsed AST nodes that have explicit
   * object and property fields. This method parses string paths at runtime.
   * These approaches are complementary and serve different input sources.
   */
  private async resolveFunction(
    functionReference: string | Function,
    context: TypedExpressionContext
  ): Promise<EvaluationResult<{ func: Function; thisBinding: any }>> {
    // Handle direct function reference (bypass string path resolution)
    if (isFunction(functionReference)) {
      return {
        success: true,
        value: { func: functionReference as Function, thisBinding: null },
        type: 'function',
      };
    }

    // String path resolution: split "Math.max" into ["Math", "max"]
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
        {
          name: 'global',
          obj:
            typeof globalThis !== 'undefined'
              ? globalThis
              : typeof window !== 'undefined'
                ? window
                : global,
        },
      ];

      for (const resolutionContext of resolutionContexts) {
        const result = this.resolveFromContext(pathParts, resolutionContext.obj);
        if (result) {
          return {
            success: true,
            value: result,
            type: 'function',
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
          } else if (
            resolutionContext.obj &&
            typeof resolutionContext.obj === 'object' &&
            objectName in resolutionContext.obj
          ) {
            targetObj = (resolutionContext.obj as Record<string, unknown>)[objectName];
          }

          if (targetObj && isObject(targetObj)) {
            // Try to resolve the method on this object
            const methodResult = this.resolveFromContext(pathParts.slice(1), targetObj);
            if (methodResult) {
              // Update the thisBinding to be the target object
              return {
                success: true,
                value: {
                  func: methodResult.func,
                  thisBinding: targetObj, // Bind to the target object
                },
                type: 'function',
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
          suggestions: [],
        },
        type: 'error',
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
          suggestions: [],
        },
        type: 'error',
      };
    }
  }

  /**
   * Resolve function from a specific context object
   */
  private resolveFromContext(
    pathParts: string[],
    contextObj: any
  ): { func: Function; thisBinding: any } | null {
    try {
      if (!contextObj) {
        return null;
      }

      // Handle Map objects (locals, variables, meta)
      if (contextObj instanceof Map) {
        if (pathParts.length === 1) {
          const func = contextObj.get(pathParts[0]);
          if (isFunction(func)) {
            return { func: func as Function, thisBinding: null };
          }
        }
        // For nested paths in Maps, try to get the root object and continue
        if (pathParts.length > 1) {
          const rootObj = contextObj.get(pathParts[0]);
          if (rootObj && isObject(rootObj)) {
            return this.resolveFromContext(pathParts.slice(1), rootObj);
          }
        }
        return null;
      }

      // Handle regular objects
      if (!isObject(contextObj)) {
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
        if (i === pathParts.length - 1 && isFunction(currentObj)) {
          // Determine proper 'this' binding
          const thisBinding = pathParts.length > 1 ? parentObj : null;
          return { func: currentObj as Function, thisBinding };
        }

        // If intermediate value is not an object, path resolution fails
        if (!isObject(currentObj)) {
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
   *
   * EXECUTION STRATEGY:
   * 1. Argument resolution: Convert all arguments (may include promises) to actual values
   * 2. Function invocation: Call function with proper 'this' binding using func.apply()
   * 3. Result unwrapping: If result is a promise, automatically await it
   * 4. Type inference: Use centralized type-helpers to determine result type
   *
   * THIS BINDING:
   * - If thisBinding provided: Use func.apply(thisBinding, args)
   * - If no thisBinding: Call func(...args) directly
   * This enables proper method execution context, especially important for:
   * - Built-in methods: Math.max, Array.prototype.join
   * - DOM methods: element.getAttribute, element.classList.add
   * - Object methods: obj.method() with access to obj's properties
   *
   * ASYNC SUPPORT:
   * Both arguments and return values can be promises:
   * - Argument promises are awaited before function call
   * - Result promises are awaited after function call
   * This provides seamless async/await experience in hyperscript
   *
   * ERROR HANDLING:
   * Uses Result-based error handling (returns EvaluationResult, not exceptions)
   * Captures error details for debugging while maintaining graceful failure
   */
  private async executeFunction(
    func: Function,
    thisBinding: any,
    args: unknown[],
    context: TypedExpressionContext
  ): Promise<EvaluationResult<HyperScriptValue>> {
    try {
      // Step 1: Resolve any promise arguments first
      // This ensures all arguments are concrete values before function invocation
      const resolvedArgs = await Promise.all(args.map(arg => this.resolveArgument(arg, context)));

      // Step 2: Execute the function with proper this binding
      // Using func.apply() ensures correct 'this' context for methods
      let result: unknown;
      if (thisBinding) {
        // Method call: preserve the object context
        result = func.apply(thisBinding, resolvedArgs);
      } else {
        // Function call: no special context needed
        result = func(...resolvedArgs);
      }

      // Step 3: Handle promise results (auto-unwrap async function results)
      if (result && isObject(result) && 'then' in (result as object)) {
        result = await result;
      }

      const valueType = inferType(result);

      return {
        success: true,
        value: result,
        type: valueType,
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
          suggestions: [],
        },
        type: 'error',
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
      const resolvedArgs = await Promise.all(args.map(arg => this.resolveArgument(arg, context)));

      // Execute the constructor with new keyword
      const result = new (constructor.value as new (...args: any[]) => any)(...resolvedArgs);

      // Handle promise results
      let finalResult = result;
      if (result && isObject(result) && 'then' in (result as object)) {
        finalResult = await result;
      }

      const valueType = inferType(finalResult);

      return {
        success: true,
        value: finalResult as HyperScriptValue,
        type: valueType,
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
          suggestions: [],
        },
        type: 'error',
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
        {
          name: 'global',
          obj:
            typeof globalThis !== 'undefined'
              ? globalThis
              : typeof window !== 'undefined'
                ? window
                : global,
        },
      ];

      for (const resolutionContext of resolutionContexts) {
        let constructor = null;

        if (resolutionContext.obj instanceof Map) {
          constructor = resolutionContext.obj.get(constructorName);
        } else if (
          resolutionContext.obj &&
          typeof resolutionContext.obj === 'object' &&
          constructorName in resolutionContext.obj
        ) {
          constructor = (resolutionContext.obj as Record<string, unknown>)[constructorName];
        }

        if (isFunction(constructor)) {
          return {
            success: true,
            value: constructor as Function,
            type: 'function',
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
          suggestions: [],
        },
        type: 'error',
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
          suggestions: [],
        },
        type: 'error',
      };
    }
  }

  /**
   * Resolve individual arguments, handling expressions and promises
   */
  private async resolveArgument(arg: unknown, _context: TypedExpressionContext): Promise<unknown> {
    // If argument is a promise, await it
    if (arg && isObject(arg) && 'then' in (arg as object)) {
      return await arg;
    }

    // For other types, return as-is
    // Note: In a full implementation, this might evaluate hyperscript expressions
    return arg;
  }

  /**
   * Get expression metadata for introspection
   */
  getMetadata() {
    return {
      name: 'FunctionCallExpression',
      category: 'interoperability' as const,
      version: '1.0.0',
      description:
        'Enhanced function call evaluation with async support and proper context binding',
      inputSchema: this.inputSchema,
      supportedFeatures: [
        'global functions',
        'method calls',
        'async functions',
        'promise arguments',
        'proper this binding',
        'error handling',
      ],
      performance: {
        complexity: 'medium',
        averageExecutionTime: '< 5ms',
        memoryUsage: 'moderate',
      },
      capabilities: {
        contextAware: true,
        supportsAsync: true,
        sideEffects: true, // Functions may have side effects
        cacheable: false, // Function results shouldn't be cached
      },
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Factory function for creating enhanced function call expressions
 */
export function createFunctionCallExpression(): FunctionCallExpression {
  return new FunctionCallExpression();
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
  const expression = new FunctionCallExpression();
  return expression.evaluate(context, functionReference, args);
}

// Default export
export default FunctionCallExpression;
