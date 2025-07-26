/**
 * Enhanced Call Command Implementation
 * The call command allows you evaluate an expression.
 * The value of this expression will be put into the it variable.
 * get is an alias for call and can be used if it more clearly expresses the meaning of the code.
 * 
 * Syntax: call <expression> | get <expression>
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface CallCommandInput {
  expression: any; // Can be function, Promise, or any value
  alias?: 'call' | 'get'; // Command alias used
}

// Output type definition  
export interface CallCommandOutput {
  result: any;
  wasAsync: boolean;
  expressionType: 'function' | 'promise' | 'value';
}

/**
 * Enhanced Call Command with full type safety and validation
 */
export class EnhancedCallCommand implements TypedCommandImplementation<
  CallCommandInput,
  CallCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'call',
    description: 'The call command allows you evaluate an expression. The value of this expression will be put into the it variable. get is an alias for call and can be used if it more clearly expresses the meaning of the code.',
    examples: [
      'call myFunction()',
      'get user.name',
      'call fetch("/api/data")',
      'get Math.random()',
      'call new Date().toISOString()'
    ],
    syntax: 'call <expression> | get <expression>',
    category: 'utility' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<CallCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'Call command requires an object input',
            suggestion: 'Provide an object with expression property'
          }
        };
      }

      const inputObj = input as any;

      // Validate expression is present
      if (inputObj.expression === undefined) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Call command requires an expression to evaluate',
            suggestion: 'Provide a function, Promise, or value to evaluate'
          }
        };
      }

      // Validate alias if provided
      if (inputObj.alias !== undefined && 
          inputObj.alias !== 'call' && inputObj.alias !== 'get') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'Call command alias must be "call" or "get"',
            suggestion: 'Use "call" or "get" as the command alias'
          }
        };
      }

      return {
        success: true,
        data: {
          expression: inputObj.expression,
          alias: inputObj.alias || 'call'
        }
      };
    }
  };

  async execute(
    input: CallCommandInput,
    context: TypedExecutionContext
  ): Promise<CallCommandOutput> {
    const { expression } = input;
    
    try {
      let result: any;
      let wasAsync = false;
      let expressionType: 'function' | 'promise' | 'value';

      // Handle function expressions
      if (typeof expression === 'function') {
        expressionType = 'function';
        result = expression();
        
        // Handle async functions and promises
        if (result instanceof Promise) {
          wasAsync = true;
          result = await result;
        }
      }
      // Handle Promise objects directly
      else if (expression instanceof Promise) {
        expressionType = 'promise';
        wasAsync = true;
        result = await expression;
      }
      // Handle literal values (strings, numbers, booleans, objects, etc.)
      else {
        expressionType = 'value';
        result = expression;
      }

      // Set the result in the 'it' context variable
      context.it = result;
      
      return {
        result,
        wasAsync,
        expressionType
      };
    } catch (error) {
      // Re-throw with enhanced error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Call command failed to evaluate expression: ${errorMessage}`);
    }
  }
}

/**
 * Enhanced Get Command (alias for Call)
 */
export class EnhancedGetCommand extends EnhancedCallCommand {
  metadata = {
    ...this.metadata,
    name: 'get',
    description: 'The get command is an alias for call and can be used if it more clearly expresses the meaning of the code. It allows you to evaluate an expression and put the value into the it variable.',
    examples: [
      'get user.profile',
      'get document.title',
      'get localStorage.getItem("key")',
      'get Math.floor(Math.random() * 100)',
      'get fetch("/api/user").then(r => r.json())'
    ]
  };
}

/**
 * Factory function to create the enhanced call command
 */
export function createEnhancedCallCommand(): EnhancedCallCommand {
  return new EnhancedCallCommand();
}

/**
 * Factory function to create the enhanced get command
 */
export function createEnhancedGetCommand(): EnhancedGetCommand {
  return new EnhancedGetCommand();
}

export default EnhancedCallCommand;