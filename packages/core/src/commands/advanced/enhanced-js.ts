/**
 * Enhanced JS Command Implementation
 * Executes inline JavaScript code with parameter passing and return values
 * 
 * Syntax: js([param1, param2, ...]) <javascript_code> end
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { ValidationResult, TypedExecutionContext } from '../../types/index.js';

// Define TypedCommandImplementation locally for now
interface TypedCommandImplementation<TInput, TOutput, TContext> {
  readonly metadata: {
    readonly name: string;
    readonly description: string;
    readonly examples: string[];
    readonly syntax: string;
    readonly category: string;
    readonly version: string;
  };
  readonly validation: {
    validate(input: unknown): ValidationResult<TInput>;
  };
  execute(input: TInput, context: TContext): Promise<TOutput>;
}

// Input type definition
export interface JSCommandInput {
  code: string; // JavaScript code to execute
  parameters?: string[]; // Parameter names for the code
}

// Output type definition
export interface JSCommandOutput {
  result: any;
  executed: boolean;
  codeLength: number;
  parameters?: string[];
}

/**
 * Enhanced JS Command with full type safety and validation
 */
export class EnhancedJSCommand implements TypedCommandImplementation<
  JSCommandInput,
  JSCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'js',
    description: 'The js command executes inline JavaScript code with access to the hyperscript context and optional parameters. It provides a way to run custom JavaScript within hyperscript.',
    examples: [
      'js console.log("Hello World") end',
      'js([x, y]) return x + y end',
      'js me.style.color = "red" end',
      'js([element]) element.classList.add("active") end'
    ],
    syntax: 'js([param1, param2, ...]) <javascript_code> end',
    category: 'advanced' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<JSCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'JS command requires JavaScript code',
            suggestions: ['Provide JavaScript code to execute']
          }],
          suggestions: ['Provide JavaScript code to execute']
        };
      }

      const inputObj = input as any;

      if (!inputObj.code || typeof inputObj.code !== 'string') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'JS command requires code string',
            suggestions: ['Provide JavaScript code as a string']
          }],
          suggestions: ['Provide JavaScript code as a string']
        };
      }

      // Validate parameters if provided
      if (inputObj.parameters && !Array.isArray(inputObj.parameters)) {
        return {
          isValid: false,
          errors: [{
            type: 'type-mismatch',
            message: 'Parameters must be an array of strings',
            suggestions: ['Use array format: ["param1", "param2"]']
          }],
          suggestions: ['Use array format: ["param1", "param2"]']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          code: inputObj.code,
          parameters: inputObj.parameters
        }
      };
    }
  };

  async execute(
    input: JSCommandInput,
    context: TypedExecutionContext
  ): Promise<JSCommandOutput> {
    const { code, parameters = [] } = input;

    // Skip execution if code is empty or only whitespace
    if (!code.trim()) {
      return {
        result: undefined,
        executed: false,
        codeLength: code.length,
        parameters
      };
    }

    try {
      // Create execution context with access to hyperscript variables
      const executionContext = this.createExecutionContext(context, parameters);

      // Execute the JavaScript code
      const func = new Function(...Object.keys(executionContext), code);
      const result = await func(...Object.values(executionContext));

      // Set the result in context
      context.it = result;

      return {
        result,
        executed: true,
        codeLength: code.length,
        parameters
      };

    } catch (error) {
      throw new Error(`JavaScript execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createExecutionContext(
    context: TypedExecutionContext, 
    parameters: string[]
  ): Record<string, any> {
    const executionContext: Record<string, any> = {
      // Hyperscript context variables
      me: context.me,
      it: context.it,
      you: context.you,
      
      // Access to context data
      locals: context.locals,
      globals: context.globals,
      variables: context.variables,
      
      // Utility functions
      console,
      document: typeof document !== 'undefined' ? document : undefined,
      window: typeof window !== 'undefined' ? window : undefined,
      
      // Parameter placeholders (will be overridden if parameters are provided)
      ...parameters.reduce((acc, param) => {
        acc[param] = undefined;
        return acc;
      }, {} as Record<string, any>)
    };

    return executionContext;
  }
}

/**
 * Factory function to create the enhanced js command
 */
export function createEnhancedJSCommand(): EnhancedJSCommand {
  return new EnhancedJSCommand();
}

export default EnhancedJSCommand;