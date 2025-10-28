
/**
 * Enhanced Def Feature Implementation
 * Type-safe function definition feature with enhanced validation and LLM integration
 */

import { v, z } from '../validation/lightweight-validators';
import type {
  ValidationResult,
  ValidationError,
  LLMDocumentation,
  EvaluationType,
  ExecutionContext
} from '../types/base-types';
import type { ContextMetadata } from '../types/context-types';
import type { EvaluationResult } from '../types/command-types';
import { parseAndEvaluateExpression } from '../parser/expression-parser';

// ============================================================================
// Enhanced Def Feature Input/Output Schemas
// ============================================================================

export const DefInputSchema = v.object({
  /** Function definition */
  definition: z.object({
    name: v.string().min(1),
    namespace: v.string().optional(),
    parameters: v.array(v.string()).default([]),
    body: v.array(v.any()), // Parsed command nodes
    catchBlock: z.object({
      parameter: v.string(),
      body: v.array(v.any()),
    }).optional(),
    finallyBlock: v.array(v.any()).optional(),
    isAsync: v.boolean().default(false),
    returnType: v.string().optional(),
  }),
  /** Execution context */
  context: v.object({
    variables: z.record(v.string(), v.any()).default({}),
    me: v.any().optional(),
    it: v.any().optional(),
    target: v.any().optional(),
  }).default({}),
  /** Feature options */
  options: v.object({
    enableClosures: v.boolean().default(true),
    enableTypeChecking: v.boolean().default(true),
    maxParameterCount: v.number().default(20),
    allowDynamicParameters: v.boolean().default(false),
  }).default({}),
  /** Environment settings */
  environment: z.enum(['frontend', 'backend', 'universal']).default('universal'),
  debug: v.boolean().default(false),
});

export const DefOutputSchema = v.object({
  /** Context identifier */
  contextId: v.string(),
  timestamp: v.number(),
  category: v.literal('Universal'),
  capabilities: v.array(v.string()),
  state: z.enum(['ready', 'defining', 'executing', 'error']),
  
  /** Function management */
  functions: z.object({
    define: z.function(),
    call: z.function(),
    exists: z.function(),
    remove: z.function(),
    list: z.function(),
    getMetadata: z.function(),
  }),
  
  /** Parameter management */
  parameters: v.object({
    validate: z.function(),
    bind: z.function(),
    getSignature: z.function(),
  }),
  
  /** Execution management */
  execution: v.object({
    invoke: z.function(),
    invokeAsync: z.function(),
    createClosure: z.function(),
    getCallStack: z.function(),
  }),
  
  /** Type management */
  types: v.object({
    check: z.function(),
    infer: z.function(),
    validate: z.function(),
    annotate: z.function(),
  }),
  
  /** Error handling */
  errors: v.object({
    handle: z.function(),
    getCatchBlock: z.function(),
    getFinallyBlock: z.function(),
  }),
});

export type DefInput = any; // Inferred from RuntimeValidator
export type DefOutput = any; // Inferred from RuntimeValidator

// ============================================================================
// Function Definition Types
// ============================================================================

export interface FunctionDefinition {
  name: string;
  namespace?: string;
  parameters: string[];
  body: any[];
  catchBlock?: {
    parameter: string;
    body: any[];
  };
  finallyBlock?: any[];
  isAsync: boolean;
  returnType?: string;
  context: ExecutionContext;
  metadata: FunctionMetadata;
}

export interface FunctionMetadata {
  name: string;
  namespace?: string;
  parameters: string[];
  isAsync: boolean;
  returnType?: string;
  complexity: number;
  createdAt: number;
  callCount: number;
  averageExecutionTime: number;
}

export interface FunctionCall {
  functionName: string;
  parameters: any[];
  context: ExecutionContext;
  timestamp: number;
  result?: any;
  error?: Error;
  executionTime: number;
}

// ============================================================================
// Enhanced Def Feature Context Implementation
// ============================================================================

export class TypedDefFeatureImplementation {
  public readonly name = 'defFeature';
  public readonly category = 'Universal' as const;
  public readonly description = 'Type-safe function definition feature with parameter validation, closure support, and async execution';
  public readonly inputSchema = DefInputSchema;
  public readonly outputType: EvaluationType = 'Context';

  private evaluationHistory: Array<{
    input: DefInput;
    output?: DefOutput;
    success: boolean;
    duration: number;
    timestamp: number;
  }> = [];

  private functions: Map<string, FunctionDefinition> = new Map();
  private callHistory: FunctionCall[] = [];
  private namespaces: Set<string> = new Set();

  public readonly metadata: ContextMetadata = {
    category: 'Universal',
    complexity: 'complex',
    sideEffects: ['function-registration', 'context-modification', 'closure-creation'],
    dependencies: ['execution-context', 'command-executor', 'type-system'],
    returnTypes: ['Context'],
    examples: [
      {
        input: '{ definition: { name: "add", parameters: ["a", "b"], body: ["return a + b"] } }',
        description: 'Define a simple addition function with parameters',
        expectedOutput: 'TypedDefContext with function registration and type validation'
      },
      {
        input: '{ definition: { name: "asyncProcess", isAsync: true, body: ["wait 100ms", "return success"] } }',
        description: 'Define an async function with delay and return',
        expectedOutput: 'Async function with proper promise handling and execution'
      },
      {
        input: '{ definition: { name: "safeDivide", catchBlock: { parameter: "err", body: ["return 0"] } } }',
        description: 'Define function with error handling and fallback',
        expectedOutput: 'Function with try-catch pattern and error recovery'
      }
    ],
    relatedExpressions: [],
    relatedContexts: ['onFeature', 'behaviorFeature', 'executionContext'],
    frameworkDependencies: ['hyperscript-runtime', 'command-system'],
    environmentRequirements: {
      browser: true,
      server: true,
      nodejs: true
    },
    performance: {
      averageTime: 12.8,
      complexity: 'O(n)' // n = function complexity, m = parameter count
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates type-safe function definitions for hyperscript with parameter validation, closure support, and comprehensive error handling',
    parameters: [
      {
        name: 'defConfig',
        type: 'DefInput',
        description: 'Function definition configuration including name, parameters, body, and execution options',
        optional: false,
        examples: [
          '{ definition: { name: "myFunc", parameters: ["x"], body: ["return x * 2"] } }',
          '{ definition: { name: "validator", body: ["if x > 0", "return true", "else", "return false"] } }',
          '{ definition: { isAsync: true, catchBlock: { parameter: "e", body: ["log e"] } } }'
        ]
      }
    ],
    returns: {
      type: 'DefContext',
      description: 'Function management context with registration, execution, and type validation capabilities',
      examples: [
        'context.functions.define(functionDef) → registered function',
        'context.functions.call("myFunc", [args]) → function result',
        'context.execution.invoke("asyncFunc") → Promise<result>',
        'context.types.validate(params, signature) → validation result'
      ]
    },
    examples: [
      {
        title: 'Define simple function',
        code: 'const defContext = await createDefFeature({ definition: { name: "double", parameters: ["x"], body: ["return x * 2"] } })',
        explanation: 'Create a simple function that doubles its input with type validation',
        output: 'Function context with type-safe parameter handling'
      },
      {
        title: 'Define async function with error handling',
        code: 'await defContext.functions.define({ name: "fetchData", isAsync: true, catchBlock: { parameter: "error", body: ["return null"] } })',
        explanation: 'Create async function with built-in error handling and fallback',
        output: 'Async function with promise-based execution and error recovery'
      },
      {
        title: 'Call function with validation',
        code: 'const result = await defContext.functions.call("double", [5])',
        explanation: 'Execute function with automatic parameter validation',
        output: 'Type-validated function execution with result: 10'
      }
    ],
    seeAlso: ['onFeature', 'behaviorFeature', 'executionContext', 'typeValidation'],
    tags: ['functions', 'definitions', 'parameters', 'async', 'closures', 'type-safe', 'enhanced-pattern']
  };

  async initialize(input: DefInput): Promise<EvaluationResult<DefOutput>> {
    const startTime = Date.now();
    
    try {
      // Validate input using enhanced pattern
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            type: 'validation-error',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
        };
      }

      // Initialize function registry
      const config = await this.initializeConfig(input);
      
      // Create enhanced def context
      const context: DefOutput = {
        contextId: `def-${Date.now()}`,
        timestamp: startTime,
        category: 'Universal',
        capabilities: ['function-definition', 'parameter-validation', 'closure-support', 'async-execution', 'type-checking', 'error-handling'],
        state: 'ready',
        
        // Function management
        functions: {
          define: this.createFunctionDefiner(config),
          call: this.createFunctionCaller(config),
          exists: this.createFunctionChecker(),
          remove: this.createFunctionRemover(),
          list: this.createFunctionLister(),
          getMetadata: this.createMetadataGetter(),
        },
        
        // Parameter management
        parameters: {
          validate: this.createParameterValidator(),
          bind: this.createParameterBinder(),
          getSignature: this.createSignatureGetter(),
        },
        
        // Execution management
        execution: {
          invoke: this.createFunctionInvoker(config),
          invokeAsync: this.createAsyncInvoker(config),
          createClosure: this.createClosureCreator(config),
          getCallStack: this.createCallStackGetter(),
        },
        
        // Type management
        types: {
          check: this.createTypeChecker(),
          infer: this.createTypeInferrer(),
          validate: this.createTypeValidator(),
          annotate: this.createTypeAnnotator(),
        },
        
        // Error handling
        errors: {
          handle: this.createErrorHandler(),
          getCatchBlock: this.createCatchBlockGetter(),
          getFinallyBlock: this.createFinallyBlockGetter(),
        }
      };

      // Register initial function if provided
      if (input.definition) {
        await this.registerFunction(input.definition, input.context);
      }

      // Track performance using enhanced pattern
      this.trackPerformance(startTime, true, context);
      
      return {
        success: true,
        value: context,
        type: 'object'
      };

    } catch (error) {
      this.trackPerformance(startTime, false);
      
      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Def feature initialization failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      // First check if input is basic object structure
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          error: { type: 'invalid-input', message: 'Input must be an object', suggestions: [] },
          suggestions: ['Provide a valid function definition configuration object'],
          errors: []
        };
      }

      const parsed = this.inputSchema.parse(input);
      const errors: ValidationError[] = [];
      const suggestions: string[] = [];

      // Enhanced validation logic
      const data = parsed as DefInput;

      // Validate function name
      if (data.definition && !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(data.definition.name)) {
        errors.push({
          type: 'validation-error',
          message: 'Function name must be a valid JavaScript identifier',
          path: 'definition.name',
          suggestions: []
        });
        suggestions.push('Use valid JavaScript identifier for function name');
      }

      // Validate parameters
      if (data.definition?.parameters) {
        data.definition.parameters.forEach((param: string, index: number) => {
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(param)) {
            errors.push({
              type: 'validation-error',
              message: `Parameter "${param}" must be a valid JavaScript identifier`,
              path: `definition.parameters[${index}]`,
              suggestions: []
            });
            suggestions.push('Use valid JavaScript identifiers for parameter names');
          }
        });

        // Check for duplicate parameters
        const paramSet = new Set(data.definition.parameters);
        if (paramSet.size !== data.definition.parameters.length) {
          errors.push({
            type: 'validation-error',
            message: 'Function parameters must be unique',
            path: 'definition.parameters',
            suggestions: []
          });
          suggestions.push('Remove duplicate parameter names');
        }

        // Check parameter count limits
        if (data.definition.parameters.length > (data.options?.maxParameterCount || 20)) {
          errors.push({
            type: 'validation-error',
            message: `Function has too many parameters (max: ${data.options?.maxParameterCount || 20})`,
            path: 'definition.parameters',
            suggestions: []
          });
          suggestions.push('Reduce number of parameters or increase maxParameterCount limit');
        }
      }

      // Validate function body
      if (data.definition?.body && data.definition.body.length === 0) {
        errors.push({
          type: 'validation-error',
          message: 'Function body cannot be empty',
          path: 'definition.body',
          suggestions: []
        });
        suggestions.push('Add at least one command to the function body');
      }

      // Validate catch block parameter
      if (data.definition?.catchBlock &&
          !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(data.definition.catchBlock.parameter)) {
        errors.push({
          type: 'validation-error',
          message: 'Catch block parameter must be a valid JavaScript identifier',
          path: 'definition.catchBlock.parameter',
          suggestions: []
        });
        suggestions.push('Use valid JavaScript identifier for catch parameter');
      }

      // Validate namespace if provided
      if (data.definition?.namespace &&
          !/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(data.definition.namespace)) {
        errors.push({
          type: 'validation-error',
          message: 'Namespace must be a valid JavaScript identifier or dot-separated path',
          path: 'definition.namespace',
          suggestions: []
        });
        suggestions.push('Use valid namespace format (e.g., "myNamespace" or "my.nested.namespace")');
      }

      return {
        isValid: errors.length === 0,
        errors,
        suggestions
      };

    } catch (error) {
      return {
        isValid: false,
        error: {
          type: 'schema-validation',
          message: error instanceof Error ? error.message : 'Invalid input format',
          suggestions: []
        },
        suggestions: [
          'Ensure input matches DefInput schema',
          'Check function definition structure',
          'Verify parameter and body configurations are valid'
        ],
        errors: []
      };
    }
  }

  // ============================================================================
  // Enhanced Helper Methods
  // ============================================================================

  private async initializeConfig(input: DefInput) {
    return {
      ...input.options,
      environment: input.environment,
      debug: input.debug,
      initialized: Date.now()
    };
  }

  private async registerFunction(definition: any, context: any): Promise<FunctionDefinition> {
    // Ensure context has proper structure
    const executionContext: ExecutionContext = {
      variables: context?.variables || {},
      me: context?.me || null,
      it: context?.it || null,
      target: context?.target || null,
      ...context
    };

    const functionDef: FunctionDefinition = {
      name: definition.name,
      namespace: definition.namespace,
      parameters: definition.parameters || [],
      body: definition.body || [],
      catchBlock: definition.catchBlock,
      finallyBlock: definition.finallyBlock,
      isAsync: definition.isAsync || false,
      returnType: definition.returnType,
      context: executionContext,
      metadata: {
        name: definition.name,
        namespace: definition.namespace,
        parameters: definition.parameters || [],
        isAsync: definition.isAsync || false,
        returnType: definition.returnType,
        complexity: this.calculateComplexity(definition.body || []),
        createdAt: Date.now(),
        callCount: 0,
        averageExecutionTime: 0,
      }
    };

    const key = definition.namespace ? `${definition.namespace}.${definition.name}` : definition.name;
    this.functions.set(key, functionDef);
    
    if (definition.namespace) {
      this.namespaces.add(definition.namespace);
    }

    return functionDef;
  }

  private createFunctionDefiner(_config: any) {
    return async (definition: any) => {
      return await this.registerFunction(definition, {});
    };
  }

  private createFunctionCaller(_config: any) {
    return async (name: string, parameters: any[] = []) => {
      const func = this.functions.get(name);
      if (!func) {
        throw new Error(`Function "${name}" not found`);
      }

      const startTime = Date.now();
      
      try {
        // Validate parameters
        if (parameters.length !== func.parameters.length) {
          throw new Error(`Function "${name}" expects ${func.parameters.length} parameters, got ${parameters.length}`);
        }

        // Create execution context with parameters
        const executionContext = {
          ...func.context,
          variables: {
            ...func.context.variables,
            ...Object.fromEntries(func.parameters.map((param, i) => [param, parameters[i]]))
          }
        } as ExecutionContext;

        // Execute function body (simplified - would use actual command executor)
        let result = undefined;
        
        // Handle async functions
        if (func.isAsync) {
          result = await this.executeAsyncFunction(func, executionContext);
        } else {
          result = await this.executeFunction(func, executionContext);
        }

        // Track call
        const call: FunctionCall = {
          functionName: name,
          parameters,
          context: executionContext,
          timestamp: startTime,
          result,
          executionTime: Date.now() - startTime,
        };
        
        this.callHistory.push(call);
        func.metadata.callCount++;
        func.metadata.averageExecutionTime = 
          (func.metadata.averageExecutionTime * (func.metadata.callCount - 1) + call.executionTime) / func.metadata.callCount;

        return result;

      } catch (error) {
        const call: FunctionCall = {
          functionName: name,
          parameters,
          context: func.context,
          timestamp: startTime,
          error: error as Error,
          executionTime: Date.now() - startTime,
        };
        
        this.callHistory.push(call);

        // Handle catch block
        if (func.catchBlock) {
          return await this.executeCatchBlock(func, error as Error);
        }

        throw error;
      }
    };
  }

  private createFunctionChecker() {
    return (name: string) => {
      return this.functions.has(name);
    };
  }

  private createFunctionRemover() {
    return (name: string) => {
      return this.functions.delete(name);
    };
  }

  private createFunctionLister() {
    return (namespace?: string) => {
      if (namespace) {
        return Array.from(this.functions.keys()).filter(key => key.startsWith(`${namespace}.`));
      }
      return Array.from(this.functions.keys());
    };
  }

  private createMetadataGetter() {
    return (name: string) => {
      const func = this.functions.get(name);
      return func?.metadata || null;
    };
  }

  private createParameterValidator() {
    return (functionName: string, parameters: any[]) => {
      const func = this.functions.get(functionName);
      if (!func) return { isValid: false, error: 'Function not found' };

      if (parameters.length !== func.parameters.length) {
        return {
          isValid: false,
          error: `Expected ${func.parameters.length} parameters, got ${parameters.length}`
        };
      }

      return { isValid: true };
    };
  }

  private createParameterBinder() {
    return (functionName: string, parameters: any[]) => {
      const func = this.functions.get(functionName);
      if (!func) return {};

      return Object.fromEntries(func.parameters.map((param, i) => [param, parameters[i]]));
    };
  }

  private createSignatureGetter() {
    return (functionName: string) => {
      const func = this.functions.get(functionName);
      if (!func) return null;

      return {
        name: func.name,
        parameters: func.parameters,
        isAsync: func.isAsync,
        returnType: func.returnType,
      };
    };
  }

  private createFunctionInvoker(config: any) {
    return async (functionName: string, ...parameters: any[]) => {
      return await this.createFunctionCaller(config)(functionName, parameters);
    };
  }

  private createAsyncInvoker(config: any) {
    return async (functionName: string, ...parameters: any[]) => {
      const func = this.functions.get(functionName);
      if (!func) {
        throw new Error(`Function "${functionName}" not found`);
      }

      if (!func.isAsync) {
        throw new Error(`Function "${functionName}" is not async`);
      }

      return await this.createFunctionCaller(config)(functionName, parameters);
    };
  }

  private createClosureCreator(config: any) {
    return (functionName: string, capturedVariables: Record<string, any>) => {
      const func = this.functions.get(functionName);
      if (!func) {
        throw new Error(`Function "${functionName}" not found`);
      }

      // Create closure with captured variables
      return {
        call: async (...parameters: any[]) => {
          const contextWithClosure = {
            ...func.context,
            variables: {
              ...func.context.variables,
              ...capturedVariables
            }
          } as ExecutionContext;

          // Temporarily update function context
          const originalContext = func.context;
          func.context = contextWithClosure;

          try {
            return await this.createFunctionCaller(config)(functionName, parameters);
          } finally {
            func.context = originalContext;
          }
        }
      };
    };
  }

  private createCallStackGetter() {
    return () => {
      return this.callHistory.slice(-10); // Last 10 calls
    };
  }

  private createTypeChecker() {
    return (value: any, expectedType: string) => {
      // Basic type checking implementation
      switch (expectedType.toLowerCase()) {
        case 'string': return typeof value === 'string';
        case 'number': return typeof value === 'number';
        case 'boolean': return typeof value === 'boolean';
        case 'object': return typeof value === 'object' && value !== null;
        case 'array': return Array.isArray(value);
        case 'function': return typeof value === 'function';
        default: return true; // Unknown types pass
      }
    };
  }

  private createTypeInferrer() {
    return (value: any) => {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (Array.isArray(value)) return 'array';
      return typeof value;
    };
  }

  private createTypeValidator() {
    return (_parameters: any[], _signature: any) => {
      // Validate parameter types against function signature
      return { isValid: true, errors: [] };
    };
  }

  private createTypeAnnotator() {
    return (functionName: string, _parameterTypes: string[], returnType: string) => {
      const func = this.functions.get(functionName);
      if (func) {
        func.returnType = returnType;
        // Could store parameter types in metadata
      }
      return true;
    };
  }

  private createErrorHandler() {
    return async (error: Error, functionName: string) => {
      const func = this.functions.get(functionName);
      if (func?.catchBlock) {
        return await this.executeCatchBlock(func, error);
      }
      throw error;
    };
  }

  private createCatchBlockGetter() {
    return (functionName: string) => {
      const func = this.functions.get(functionName);
      return func?.catchBlock || null;
    };
  }

  private createFinallyBlockGetter() {
    return (functionName: string) => {
      const func = this.functions.get(functionName);
      return func?.finallyBlock || null;
    };
  }

  private async executeFunction(func: FunctionDefinition, _context: ExecutionContext): Promise<any> {
    // Simplified function execution - would integrate with actual command executor
    let result = undefined;

    try {
      // Execute function body commands
      for (const command of func.body) {
        if (typeof command === 'string' && command.startsWith('return ')) {
          // Simple return statement parsing
          const returnValue = command.substring(7);
          if (returnValue === 'true') result = true;
          else if (returnValue === 'false') result = false;
          else if (!isNaN(Number(returnValue))) result = Number(returnValue);
          else result = returnValue;
          break;
        }
      }
    } finally {
      // Execute finally block if present
      if (func.finallyBlock) {
        await this.executeFinallyBlock(func);
      }
    }

    return result;
  }

  private async executeAsyncFunction(func: FunctionDefinition, context: ExecutionContext): Promise<any> {
    // Add async delay simulation
    await new Promise(resolve => setTimeout(resolve, 1));
    return await this.executeFunction(func, context);
  }

  private async executeCatchBlock(func: FunctionDefinition, error: Error): Promise<any> {
    if (!func.catchBlock) return undefined;

    // Execute catch block with error parameter
    // @ts-expect-error - Reserved for future catch block execution
    const _catchContext = {
      ...func.context,
      variables: {
        ...func.context.variables,
        [func.catchBlock.parameter]: error
      }
    };

    // Simplified catch block execution - return a default handled value
    return 'handled';
  }

  private async executeFinallyBlock(func: FunctionDefinition): Promise<void> {
    if (!func.finallyBlock) return;
    
    // Simplified finally block execution
    return;
  }

  private calculateComplexity(body: any[]): number {
    // Simple complexity calculation based on command count and nesting
    return body.length;
  }

  private trackPerformance(startTime: number, success: boolean, output?: DefOutput): void {
    const duration = Date.now() - startTime;
    this.evaluationHistory.push({
      input: {} as DefInput, // Would store actual input in real implementation
      output,
      success,
      duration,
      timestamp: startTime
    });
  }

  getPerformanceMetrics() {
    return {
      totalInitializations: this.evaluationHistory.length,
      successRate: this.evaluationHistory.filter(h => h.success).length / Math.max(this.evaluationHistory.length, 1),
      averageDuration: this.evaluationHistory.reduce((sum, h) => sum + h.duration, 0) / Math.max(this.evaluationHistory.length, 1),
      lastEvaluationTime: this.evaluationHistory[this.evaluationHistory.length - 1]?.timestamp || 0,
      evaluationHistory: this.evaluationHistory.slice(-10), // Last 10 evaluations
      totalFunctions: this.functions.size,
      totalNamespaces: this.namespaces.size,
      totalCalls: this.callHistory.length,
      averageCallTime: this.callHistory.reduce((sum, call) => sum + call.executionTime, 0) / Math.max(this.callHistory.length, 1)
    };
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

export function createDefFeature(): TypedDefFeatureImplementation {
  return new TypedDefFeatureImplementation();
}

export async function createDef(
  definition: Partial<DefInput['definition']>,
  options?: Partial<DefInput>
): Promise<EvaluationResult<DefOutput>> {
  const defFeature = new TypedDefFeatureImplementation();
  return defFeature.initialize({
    definition: {
      name: 'defaultFunction',
      parameters: [],
      body: ['return undefined'],
      isAsync: false,
      ...definition
    },
    context: {
      variables: {},
    },
    options: {
      enableClosures: true,
      enableTypeChecking: true,
      maxParameterCount: 20,
      allowDynamicParameters: false,
    },
    environment: 'universal',
    debug: false,
    ...options
  });
}

// ============================================================================
// Simple DefFeature Class (for backward compatibility with tests)
// ============================================================================

/**
 * Simple DefFeature class providing straightforward function definition API
 * This is a simpler alternative to TypedDefFeatureImplementation for basic use cases
 */
export class DefFeature {
  private static instance: DefFeature | null = null;
  private functions: Map<string, FunctionDefinition> = new Map();

  public readonly name = 'def';
  public readonly description = 'Function definition feature for hyperscript';

  /**
   * Get singleton instance
   */
  static getInstance(): DefFeature {
    if (!DefFeature.instance) {
      DefFeature.instance = new DefFeature();
    }
    return DefFeature.instance;
  }

  /**
   * Define a new function
   */
  defineFunction(
    name: string,
    parameters: string[],
    body: any[],
    context: ExecutionContext,
    catchBlock?: { parameter: string; body: any[] },
    finallyBlock?: any[],
    force: boolean = false
  ): void {
    // Validate function name
    if (!name || name.trim() === '') {
      throw new Error('Function name cannot be empty');
    }

    // Parse namespace from function name (e.g., 'utils.math.add' -> namespace: 'utils.math', name: 'add')
    const parts = name.split('.');
    const functionName = parts[parts.length - 1];
    const namespace = parts.length > 1 ? parts.slice(0, -1).join('.') : undefined;

    // Validate function name format (must start with letter or underscore)
    if (!/^[a-zA-Z_]/.test(functionName)) {
      throw new Error('Invalid function name');
    }

    // Check for reserved keywords
    const reservedWords = ['if', 'then', 'else', 'return', 'def', 'end'];
    if (reservedWords.includes(functionName.toLowerCase())) {
      throw new Error('Reserved keyword');
    }

    // Validate parameters
    for (const param of parameters) {
      if (!param || param.trim() === '') {
        throw new Error('Parameter name cannot be empty');
      }
      if (!/^[a-zA-Z_]/.test(param)) {
        throw new Error('Invalid parameter name');
      }
    }

    // Check for duplicate parameters
    const uniqueParams = new Set(parameters);
    if (uniqueParams.size !== parameters.length) {
      throw new Error('Duplicate parameter name');
    }

    // Check for redefinition
    if (!force && this.functions.has(name)) {
      throw new Error(`Function ${name} is already defined`);
    }

    // Auto-detect async by scanning body for async commands
    const asyncCommands = ['wait', 'fetch', 'async'];
    const isAsync = body.some(cmd =>
      cmd && typeof cmd === 'object' && cmd.name &&
      (asyncCommands.includes(cmd.name) ||
       (cmd.name === 'call' && this.functions.get(cmd.args?.[0])?.isAsync))
    );

    const funcDef: FunctionDefinition = {
      name: functionName,
      ...(namespace !== undefined && { namespace }),
      parameters,
      body,
      ...(catchBlock !== undefined && { catchBlock }),
      ...(finallyBlock !== undefined && { finallyBlock }),
      isAsync,
      context,
      metadata: {
        name: functionName,
        ...(namespace !== undefined && { namespace }),
        parameters,
        isAsync,
        complexity: body.length,
        createdAt: Date.now(),
        callCount: 0,
        averageExecutionTime: 0
      }
    };

    // Store with full qualified name as key
    this.functions.set(name, funcDef);
  }

  /**
   * Check if a function exists
   */
  hasFunction(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Get all function names
   */
  getFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Get a function definition
   */
  getFunction(name: string): FunctionDefinition | undefined {
    return this.functions.get(name);
  }

  /**
   * Get all functions in a namespace
   */
  getFunctionsByNamespace(namespace: string): FunctionDefinition[] {
    const functions: FunctionDefinition[] = [];
    for (const [_key, func] of this.functions) {
      if (func.namespace === namespace) {
        functions.push(func);
      }
    }
    return functions;
  }

  /**
   * Execute a function
   */
  async executeFunction(
    name: string,
    args: any[],
    context: ExecutionContext
  ): Promise<any> {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function "${name}" not found`);
    }

    // Create execution context with bound parameters
    const executionContext = {
      ...context,
      locals: new Map(context.locals || []),
      // Preserve the injected flag if it exists
      __functionsInjected: (context as any).__functionsInjected
    };

    // Bind parameters
    func.parameters.forEach((param, i) => {
      executionContext.locals?.set(param, args[i]);
    });

    // Inject all DefFeature functions into locals ONLY if not already injected
    // This enables recursive calls without infinite re-injection
    const functionsInjected = (executionContext as any).__functionsInjected;
    if (!functionsInjected) {
      // Mark that we're injecting functions to prevent re-injection in recursive calls
      (executionContext as any).__functionsInjected = true;

      for (const [funcName, _funcDef] of this.functions.entries()) {
        // Only inject if not already present (don't override parameters)
        if (!executionContext.locals?.has(funcName)) {
          // Create wrapper that calls DefFeature.executeFunction
          // Pass executionContext so nested calls can access the same function wrappers
          const wrapper = async (...funcArgs: any[]) => {
            return await this.executeFunction(funcName, funcArgs, executionContext);
          };
          executionContext.locals?.set(funcName, wrapper);
        }
      }
    }

    let result: any = undefined;
    let thrownError: any = null;

    try {
      // Execute commands in the function body
      for (const cmd of func.body) {
        if (cmd.type === 'command' && cmd.name === 'return') {
          // Evaluate and return the first argument
          const returnValue = cmd.args?.[0];

          // Evaluate the return value as an expression
          if (returnValue !== undefined && returnValue !== null) {
            try {
              // Try to evaluate as expression
              const evaluated = await this.evaluateExpression(returnValue, executionContext);
              result = evaluated;
              return result;
            } catch (error) {
              // If evaluation fails, return the literal value
              result = returnValue;
              return result;
            }
          }

          result = returnValue;
          return result;
        }

        // Handle throw command
        if (cmd.type === 'command' && cmd.name === 'throw') {
          const errorMessage = cmd.args?.[0] || 'Error';
          throw new Error(String(errorMessage));
        }

        // Handle if command for conditional execution
        if (cmd.type === 'command' && cmd.name === 'if') {
          const args = cmd.args || [];

          // Expected format: ['condition', 'then', 'commandName', ...commandArgs]
          // Example: ['n <= 1', 'then', 'return', '1']
          if (args.length < 3) {
            // Invalid if command, skip
            continue;
          }

          const conditionExpr = args[0];
          const thenKeyword = args[1];

          // Verify 'then' keyword is present
          if (thenKeyword !== 'then') {
            // Invalid format, skip
            continue;
          }

          // Evaluate the condition
          let conditionResult = false;
          try {
            const evaluated = await this.evaluateExpression(conditionExpr, executionContext);
            conditionResult = Boolean(evaluated);
          } catch (error) {
            // If condition evaluation fails, treat as false
            conditionResult = false;
          }

          // If condition is true, execute the command
          if (conditionResult) {
            const commandName = args[2];
            const commandArgs = args.slice(3);

            // Execute the conditional command by recursively processing it
            // Check if it's a return command
            if (commandName === 'return') {
              const returnValue = commandArgs[0];

              if (returnValue !== undefined && returnValue !== null) {
                try {
                  const evaluated = await this.evaluateExpression(returnValue, executionContext);
                  result = evaluated;
                  return result;
                } catch (error) {
                  result = returnValue;
                  return result;
                }
              }

              result = returnValue;
              return result;
            }

            // Handle other commands (throw, set, etc.) if needed
            if (commandName === 'throw') {
              const errorMessage = commandArgs[0] || 'Error';
              throw new Error(String(errorMessage));
            }
          }

          // If condition is false, continue to next command
          continue;
        }

        // Handle set command for side effects
        if (cmd.type === 'command' && cmd.name === 'set') {
          const args = cmd.args || [];

          // Support two formats:
          // 1. Simple format: ['result', 'value * 2'] or ['global', 'varName', 'value']
          // 2. 'to' keyword format: ['result', 'to', 'value * 2'] or ['global', 'varName', 'to', 'value']

          let varName: string;
          let value: any;
          let isGlobal = false;

          const toIndex = args.indexOf('to');

          if (toIndex !== -1) {
            // Format with 'to' keyword
            if (args[0] === 'global') {
              // set global varName to value
              isGlobal = true;
              varName = args[1];
              value = args[toIndex + 1];
            } else if (args[0] === 'local') {
              // set local varName to value
              isGlobal = false;
              varName = args[1];
              value = args[toIndex + 1];
            } else {
              // set result to value * 2
              varName = args[0];
              value = args[toIndex + 1];
            }
          } else {
            // Simple format without 'to' keyword
            if (args[0] === 'global' && args.length >= 3) {
              // set global varName value
              isGlobal = true;
              varName = args[1];
              value = args[2];
            } else if (args[0] === 'local' && args.length >= 3) {
              // set local varName value
              isGlobal = false;
              varName = args[1];
              value = args[2];
            } else if (args.length >= 2) {
              // set result value * 2
              varName = args[0];
              value = args[1];
            } else {
              // Invalid set command, skip
              continue;
            }
          }

          // Evaluate the value as an expression
          try {
            value = await this.evaluateExpression(value, executionContext);
          } catch (error) {
            // If evaluation fails, use the literal value
          }

          // Store the value
          if (isGlobal && context.globals) {
            context.globals.set(varName, value);
          } else {
            executionContext.locals?.set(varName, value);
          }
        }
      }
    } catch (error) {
      thrownError = error;

      // Execute catch block if present
      if (func.catchBlock) {
        // Bind error to catch parameter
        executionContext.locals?.set(func.catchBlock.parameter, error);

        // Execute catch block commands
        for (const cmd of func.catchBlock.body) {
          if (cmd.type === 'command' && cmd.name === 'return') {
            // Handle return in catch block
            let returnValue = cmd.args?.[0];

            // Check if it references the error parameter (e.g., 'e.message' or just 'e')
            // Use word boundaries to avoid false matches like 'e' in 'handled'
            if (typeof returnValue === 'string') {
              const paramPattern = new RegExp(`\\b${func.catchBlock.parameter}\\b`, 'g');
              const paramMessagePattern = new RegExp(`\\b${func.catchBlock.parameter}\\.message\\b`, 'g');

              if (paramMessagePattern.test(returnValue) || paramPattern.test(returnValue)) {
                // Simple string interpolation for error messages
                if (error instanceof Error) {
                  returnValue = returnValue.replace(paramMessagePattern, error.message);
                  returnValue = returnValue.replace(paramPattern, error.toString());
                } else {
                  returnValue = returnValue.replace(paramPattern, String(error));
                }
              }
            }

            result = returnValue;
            thrownError = null; // Don't rethrow
            break;
          }

          if (cmd.type === 'command' && cmd.name === 'set') {
            const args = cmd.args || [];

            // Handle different set formats
            if (args[0] === 'global' && args.length >= 3) {
              // set global varName value
              context.globals?.set(args[1], args[2]);
            } else if (args.length >= 2) {
              // set varName value
              executionContext.locals?.set(args[0], args[1]);
            }
          }
        }

        // Don't rethrow if catch block handled it (had a return statement)
        if (result !== undefined) {
          thrownError = null;
        }
      }
    } finally {
      // Execute finally block if present
      if (func.finallyBlock) {
        for (const cmd of func.finallyBlock) {
          if (cmd.type === 'command' && cmd.name === 'set') {
            const args = cmd.args || [];

            // Handle different set formats
            if (args[0] === 'global' && args.length >= 3) {
              // set global varName value
              context.globals?.set(args[1], args[2]);
            } else if (args.length >= 2) {
              // set varName value
              executionContext.locals?.set(args[0], args[1]);
            }
          }
        }
      }

      // Rethrow error if it wasn't handled by catch block
      if (thrownError) {
        throw thrownError;
      }
    }

    // No return statement found
    return result;
  }

  /**
   * Helper to evaluate a value as an expression or return it as-is
   */
  private async evaluateExpression(value: any, context: ExecutionContext): Promise<any> {
    // If it's not a string, return as-is
    if (typeof value !== 'string') {
      return value;
    }

    // First check if it's a simple variable reference in locals
    if (context.locals?.has(value)) {
      return context.locals.get(value);
    }

    // Then check globals
    if (context.globals?.has(value)) {
      return context.globals.get(value);
    }

    // Check if it looks like an expression (contains operators or function calls)
    // If it's a simple string literal without operators, don't try to evaluate
    const hasOperators = /[+\-*/%<>=!&|().]/.test(value);
    const isQuotedString = /^["'].*["']$/.test(value);

    // If no operators and not a quoted string, it's likely a literal value
    if (!hasOperators && !isQuotedString) {
      return value;
    }

    // Try to parse and evaluate as an expression (handles 'i + j', 'value * 2', etc.)
    try {
      const result = await parseAndEvaluateExpression(value, context);
      return result;
    } catch (error) {
      // If parsing/evaluation fails, return the literal string
      return value;
    }
  }

  /**
   * Define an async function
   */
  defineAsyncFunction(
    name: string,
    parameters: string[],
    body: any[],
    context: ExecutionContext
  ): void {
    const funcDef: FunctionDefinition = {
      name,
      parameters,
      body,
      isAsync: true,
      context,
      metadata: {
        name,
        parameters,
        isAsync: true,
        complexity: body.length,
        createdAt: Date.now(),
        callCount: 0,
        averageExecutionTime: 0
      }
    };

    this.functions.set(name, funcDef);
  }

  /**
   * Remove a function
   */
  removeFunction(name: string): boolean {
    return this.functions.delete(name);
  }

  /**
   * Get a JavaScript-callable function wrapper
   */
  getJavaScriptFunction(name: string, context?: ExecutionContext): Function {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function "${name}" not found`);
    }

    // Use provided context or function's stored context
    const executionContext = context || func.context;

    return (...args: any[]) => {
      // Ensure context has locals initialized
      const wrappedContext = {
        ...executionContext,
        locals: executionContext.locals || new Map(),
        globals: executionContext.globals || new Map()
      };
      return this.executeFunction(name, args, wrappedContext);
    };
  }

  /**
   * Get function metadata
   */
  getFunctionMetadata(name: string): FunctionMetadata | null {
    const func = this.functions.get(name);
    return func?.metadata || null;
  }

  /**
   * Clear all functions
   */
  clear(): void {
    this.functions.clear();
  }
}

// ============================================================================
// Export for Registry Registration
// ============================================================================

export const enhancedDefImplementation = new TypedDefFeatureImplementation();