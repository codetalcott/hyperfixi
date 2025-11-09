/**
 * Exit Command Implementation
 * Exits early from an event handler or behavior without returning a value
 *
 * Syntax: exit
 *
 * Similar to return but specifically for early termination of event handlers
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';

// Input type definition (no input expected)
export interface ExitCommandInput {
  // Exit takes no parameters
}

// Output type definition
export interface ExitCommandOutput {
  exited: boolean;
  timestamp: number;
}

/**
 * Exit Command - Early termination for event handlers
 */
export class ExitCommand
  implements CommandImplementation<ExitCommandInput, ExitCommandOutput, TypedExecutionContext>
{
  metadata = {
    name: 'exit',
    description:
      'The exit command immediately terminates execution of the current event handler or behavior, useful for early returns based on conditions.',
    examples: [
      'exit',
      'if no draggedItem exit end',
      'if condition is false exit end',
      'on click if disabled exit end',
    ],
    syntax: 'exit',
    category: 'flow' as const,
    version: '1.0.0',
  };

  validation = {
    validate(_input: unknown): ValidationResult<ExitCommandInput> {
      // Exit command takes no input
      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {},
      };
    },
  };

  async execute(
    _input: ExitCommandInput,
    _context: TypedExecutionContext
  ): Promise<ExitCommandOutput> {
    // Throw a special exit error that can be caught and handled by the runtime
    // Similar to return but without a value
    const exitError = new Error('EXIT_COMMAND');
    (exitError as any).isExit = true;
    (exitError as any).returnValue = undefined;
    throw exitError;
  }
}

/**
 * Factory function to create the exit command
 */
export function createExitCommand(): ExitCommand {
  return new ExitCommand();
}

export default ExitCommand;
