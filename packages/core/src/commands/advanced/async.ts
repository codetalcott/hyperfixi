/**
 * Enhanced Async Command Implementation
 * Executes commands asynchronously using async/await patterns
 *
 * Syntax: async <command1> [<command2> ...]
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
export interface AsyncCommandInput {
  commands: Array<{ name: string; execute: Function }>; // Commands to execute asynchronously
}

// Output type definition
export interface AsyncCommandOutput {
  commandCount: number;
  results: any[];
  executed: boolean;
  duration: number;
}

/**
 * Enhanced Async Command with full type safety and validation
 */
export class AsyncCommand
  implements
    TypedCommandImplementation<AsyncCommandInput, AsyncCommandOutput, TypedExecutionContext>
{
  metadata = {
    name: 'async',
    description:
      'The async command executes other commands asynchronously without blocking the main execution flow. It runs commands in sequence using async/await patterns.',
    examples: [
      'async command1 command2',
      'async fetchData processData',
      'async animateIn showContent',
      'async loadImage fadeIn',
    ],
    syntax: 'async <command> [<command> ...]',
    category: 'advanced' as const,
    version: '2.0.0',
  };

  validation = {
    validate(input: unknown): ValidationResult<AsyncCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Async command requires at least one command to execute',
              suggestions: ['Provide command objects to execute asynchronously'],
            },
          ],
          suggestions: ['Provide command objects to execute asynchronously'],
        };
      }

      const inputObj = input as any;

      if (!inputObj.commands || !Array.isArray(inputObj.commands)) {
        return {
          isValid: false,
          errors: [
            {
              type: 'type-mismatch',
              message: 'Commands must be provided as an array',
              suggestions: ['Provide an array of command objects'],
            },
          ],
          suggestions: ['Provide an array of command objects'],
        };
      }

      if (inputObj.commands.length === 0) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Async command requires at least one command to execute',
              suggestions: ['Provide at least one command to execute'],
            },
          ],
          suggestions: ['Provide at least one command to execute'],
        };
      }

      // Validate that all items are command objects
      for (const command of inputObj.commands) {
        if (
          !command ||
          typeof command !== 'object' ||
          typeof command.name !== 'string' ||
          typeof command.execute !== 'function'
        ) {
          return {
            isValid: false,
            errors: [
              {
                type: 'type-mismatch',
                message: 'All items must be valid command objects with name and execute method',
                suggestions: ['Ensure all commands have name and execute properties'],
              },
            ],
            suggestions: ['Ensure all commands have name and execute properties'],
          };
        }
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          commands: inputObj.commands,
        },
      };
    },
  };

  async execute(
    input: AsyncCommandInput,
    context: TypedExecutionContext
  ): Promise<AsyncCommandOutput> {
    const { commands } = input;
    const startTime = Date.now();

    try {
      // Execute commands asynchronously in sequence
      const results = await this.executeCommandsAsync(context, commands);
      const duration = Date.now() - startTime;

      // Set the last result in context
      if (results.length > 0) {
        Object.assign(context, { it: results[results.length - 1] });
      }

      return {
        commandCount: commands.length,
        results,
        executed: true,
        duration,
      };
    } catch (error) {
      throw new Error(
        `Async command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async executeCommandsAsync(
    context: TypedExecutionContext,
    commands: Array<{ name: string; execute: Function }>
  ): Promise<any[]> {
    const results: any[] = [];

    for (const command of commands) {
      try {
        // Execute command asynchronously
        const result = await command.execute(context);
        results.push(result);

        // Update context for next command
        Object.assign(context, { it: result });
      } catch (error) {
        throw new Error(
          `Command '${command.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return results;
  }
}

/**
 * Factory function to create the enhanced async command
 */
export function createAsyncCommand(): AsyncCommand {
  return new AsyncCommand();
}

export default AsyncCommand;
