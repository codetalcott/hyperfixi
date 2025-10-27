/**
 * Enhanced JS Command Implementation
 * Executes inline JavaScript code with parameter passing and return values
 * 
 * Syntax: js([param1, param2, ...]) <javascript_code> end
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { ValidationResult, TypedExecutionContext } from '../../types/index';

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
export class JSCommand implements TypedCommandImplementation<
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

  // Compatibility properties for legacy tests
  get name() { return this.metadata.name; }
  get description() { return this.metadata.description; }
  get syntax() { return this.metadata.syntax; }
  get isBlocking() { return false; }

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

  // Compatibility method for legacy tests
  validate(args: any[]): string | null {
    if (!Array.isArray(args) || args.length === 0) {
      return 'JS command requires JavaScript code';
    }

    const [firstArg, secondArg] = args;

    // Check if first arg is parameters array (when used with parameters)
    if (Array.isArray(firstArg)) {
      if (!secondArg || typeof secondArg !== 'string') {
        return 'JS command requires code as string';
      }
      return null;
    }

    // Check if first arg is the code
    if (typeof firstArg !== 'string') {
      if (firstArg === null) {
        return 'Code must be a string';
      }
      if (typeof firstArg === 'number') {
        return 'Code must be a string';
      }
      // If it's an object, it means they're trying to pass parameters as object instead of array
      if (typeof firstArg === 'object') {
        return 'Parameters must be an array';
      }
      return 'JS command requires code as string';
    }

    // If there's a second arg when first is code, second should be parameters array
    if (secondArg !== undefined) {
      if (typeof secondArg === 'object' && !Array.isArray(secondArg)) {
        return 'Parameters must be an array';
      }
      if (typeof secondArg === 'string') {
        return 'Parameters must be an array';
      }
    }

    return null;
  }

  // Overloaded execute method for compatibility
  async execute(
    contextOrInput: TypedExecutionContext | JSCommandInput,
    codeOrContext?: string | TypedExecutionContext,
    ...additionalArgs: any[]
  ): Promise<any> {
    // Legacy API: execute(context, code) or execute(context, params, code)
    if ('me' in contextOrInput || 'locals' in contextOrInput) {
      const context = contextOrInput as TypedExecutionContext;

      // Case 1: execute(context, code)
      if (typeof codeOrContext === 'string') {
        const code = codeOrContext;
        const output = await this.executeTyped({ code }, context);
        return output.result; // Return just the result for legacy API
      }

      // Case 2: execute(context, params, code)
      if (Array.isArray(codeOrContext) && additionalArgs.length > 0) {
        const parameters = codeOrContext;
        const code = additionalArgs[0] as string;
        const output = await this.executeTyped({ code, parameters }, context);
        return output.result; // Return just the result for legacy API
      }

      // If we get here, code is missing
      throw new Error('JS command requires JavaScript code to execute');
    }

    // Enhanced API: execute(input, context)
    const input = contextOrInput as JSCommandInput;
    const context = codeOrContext as TypedExecutionContext;
    return await this.executeTyped(input, context);
  }

  private async executeTyped(
    input: JSCommandInput,
    context: TypedExecutionContext
  ): Promise<JSCommandOutput | any> {
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
      Object.assign(context, { it: result });

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
      
      // Parameter values from context
      ...parameters.reduce((acc, param) => {
        acc[param] = context.locals?.get(param);
        return acc;
      }, {} as Record<string, any>)
    };

    return executionContext;
  }
}

/**
 * Factory function to create the enhanced js command
 */
export function createJSCommand(): JSCommand {
  return new JSCommand();
}

export default JSCommand;