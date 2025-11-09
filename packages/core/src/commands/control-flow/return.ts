/**
 * Enhanced Return Command Implementation
 * Returns a value from a command sequence or function
 *
 * Syntax: return [<value>]
 *
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';

// Input type definition
export interface ReturnCommandInput {
  value?: any; // Optional return value
}

// Output type definition
export interface ReturnCommandOutput {
  returnValue: any;
  timestamp: number;
}

/**
 * Enhanced Return Command with full type safety and validation
 */
export class ReturnCommand
  implements CommandImplementation<ReturnCommandInput, ReturnCommandOutput, TypedExecutionContext>
{
  metadata = {
    name: 'return',
    description:
      'The return command returns a value from a command sequence or function, immediately terminating execution and passing the value back to the caller.',
    examples: [
      'return',
      'return 42',
      'return user.name',
      'return "success"',
      'if found then return result else return null',
    ],
    syntax: 'return [<value>]',
    category: 'flow' as const,
    version: '2.0.0',
  };

  validation = {
    validate(input: unknown): ValidationResult<ReturnCommandInput> {
      // Return command accepts any input (the return value) or no input
      if (!input || typeof input !== 'object') {
        return {
          isValid: true,
          errors: [],
          suggestions: [],
          data: {
            value: input, // Use the input directly as the value
          },
        };
      }

      const inputObj = input as any;
      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          value: inputObj.value,
        },
      };
    },
  };

  async execute(
    input: ReturnCommandInput,
    context: TypedExecutionContext
  ): Promise<ReturnCommandOutput> {
    const { value } = input;

    // Set the return value in context if it supports it
    if ('returnValue' in context) {
      (context as any).returnValue = value;
    }

    // Also set it as the result (it)
    Object.assign(context, { it: value });

    // Throw a special return error that can be caught and handled by the runtime
    const returnError = new Error('RETURN_VALUE');
    (returnError as any).isReturn = true;
    (returnError as any).returnValue = value;
    throw returnError;
  }
}

/**
 * Factory function to create the enhanced return command
 */
export function createReturnCommand(): ReturnCommand {
  return new ReturnCommand();
}

export default ReturnCommand;
