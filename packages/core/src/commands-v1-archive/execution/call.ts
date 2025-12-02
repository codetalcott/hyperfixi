/**
 * Enhanced Call Command Implementation
 * The call command allows you evaluate an expression.
 * The value of this expression will be put into the it variable.
 * get is an alias for call and can be used if it more clearly expresses the meaning of the code.
 *
 * Syntax: call <expression> | get <expression>
 *
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import type { ValidationResult } from '../../types/unified-types';

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
export class CallCommand
  implements CommandImplementation<CallCommandInput, CallCommandOutput, TypedExecutionContext>
{
  metadata = {
    name: 'call',
    description:
      'The call command allows you evaluate an expression. The value of this expression will be put into the it variable. get is an alias for call and can be used if it more clearly expresses the meaning of the code.',
    examples: [
      'call myFunction()',
      'get user.name',
      'call fetch("/api/data")',
      'get Math.random()',
      'call new Date().toISOString()',
    ],
    syntax: 'call <expression> | get <expression>',
    category: 'utility' as const,
    version: '2.0.0',
  };

  validation = {
    validate(input: unknown): ValidationResult<CallCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [
            {
              type: 'syntax-error',
              message: 'Call command requires an object input',
              suggestions: ['Provide an object with expression property'],
            },
          ],
          suggestions: ['Provide an object with expression property'],
        };
      }

      const inputObj = input as any;

      // Validate expression is present
      if (inputObj.expression === undefined) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Call command requires an expression to evaluate',
              suggestions: ['Provide a function, Promise, or value to evaluate'],
            },
          ],
          suggestions: ['Provide a function, Promise, or value to evaluate'],
        };
      }

      // Validate alias if provided
      if (inputObj.alias !== undefined && inputObj.alias !== 'call' && inputObj.alias !== 'get') {
        return {
          isValid: false,
          errors: [
            {
              type: 'syntax-error',
              message: 'Call command alias must be "call" or "get"',
              suggestions: ['Use "call" or "get" as the command alias'],
            },
          ],
          suggestions: ['Use "call" or "get" as the command alias'],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          expression: inputObj.expression,
          alias: inputObj.alias || 'call',
        },
      };
    },
  };

  async execute(
    input: CallCommandInput,
    context: TypedExecutionContext
  ): Promise<CallCommandOutput> {
    console.log('[CALL COMMAND DEBUG] Received input object:', input);
    const { expression } = input;

    console.log('[CALL COMMAND DEBUG] Extracted expression:', {
      type: typeof expression,
      isArray: Array.isArray(expression),
      value: expression,
      constructor: expression?.constructor?.name,
      id: expression?.id,
      tagName: expression?.tagName
    });

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
      Object.assign(context, { it: result });

      return {
        result,
        wasAsync,
        expressionType,
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
export class GetCommand extends CallCommand {
  override metadata = {
    ...(this.constructor as any).prototype.metadata,
    name: 'get',
    description:
      'The get command is an alias for call and can be used if it more clearly expresses the meaning of the code. It allows you to evaluate an expression and put the value into the it variable.',
    examples: [
      'get user.profile',
      'get document.title',
      'get localStorage.getItem("key")',
      'get Math.floor(Math.random() * 100)',
      'get fetch("/api/user").then(r => r.json())',
    ],
  };
}

/**
 * Factory function to create the enhanced call command
 */
export function createCallCommand(): CallCommand {
  return new CallCommand();
}

/**
 * Factory function to create the enhanced get command
 */
export function createGetCommand(): EnhancedGetCommand {
  return new EnhancedGetCommand();
}

export default CallCommand;
