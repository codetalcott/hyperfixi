/**
 * Enhanced Throw Command Implementation
 * Throws an error with a specified message
 * 
 * Syntax: throw <message>
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface ThrowCommandInput {
  message: string | Error | any;
}

// Output type definition (throw never returns normally)
export interface ThrowCommandOutput {
  // This will never be returned as throw always throws
  error: Error;
}

/**
 * Enhanced Throw Command with full type safety and validation
 */
export class EnhancedThrowCommand implements TypedCommandImplementation<
  ThrowCommandInput,
  ThrowCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'throw',
    description: 'The throw command throws an error with a specified message, immediately terminating execution and propagating the error up the call stack.',
    examples: [
      'throw "Invalid input"',
      'throw new Error("Custom error")',
      'if not valid then throw "Validation failed"',
      'throw `User ${user.name} not found`'
    ],
    syntax: 'throw <message>',
    category: 'flow' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<ThrowCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Throw command requires a message or error object',
            suggestions: ['Provide an error message string or Error object to throw']
          }],
          suggestions: ['Provide an error message string or Error object to throw']
        };
      }

      const inputObj = input as any;

      if (!('message' in inputObj) && !inputObj.message) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Throw command requires a message property',
            suggestions: ['Provide a message property with the error message']
          }],
          suggestions: ['Provide a message property with the error message']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          message: inputObj.message
        }
      };
    }
  };

  async execute(
    input: ThrowCommandInput,
    context: TypedExecutionContext
  ): Promise<ThrowCommandOutput> {
    const { message } = input;

    // Create appropriate error object
    let errorToThrow: Error;

    if (message instanceof Error) {
      // Use the error directly
      errorToThrow = message;
    } else if (typeof message === 'string') {
      // Create a new error with the message
      errorToThrow = new Error(message);
    } else {
      // Convert other types to string
      errorToThrow = new Error(String(message));
    }

    // Add context information to the error if possible
    if ('stack' in errorToThrow && typeof errorToThrow.stack === 'string') {
      // Error already has stack trace
    } else {
      // Try to capture stack trace
      if (Error.captureStackTrace) {
        Error.captureStackTrace(errorToThrow, this.execute);
      }
    }

    // Throw the error
    throw errorToThrow;
  }
}

/**
 * Factory function to create the enhanced throw command
 */
export function createEnhancedThrowCommand(): EnhancedThrowCommand {
  return new EnhancedThrowCommand();
}

export default EnhancedThrowCommand;