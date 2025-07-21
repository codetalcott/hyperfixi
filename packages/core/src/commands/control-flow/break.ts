/**
 * Break Command Implementation
 * The break command exits from the current loop in hyperscript
 * Generated from LSP data with TDD implementation
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class BreakCommand implements CommandImplementation {
  name = 'break';
  syntax = 'break';
  description = 'The break command exits from the current loop (repeat, for, while, until). Execution continues after the loop.';
  isBlocking = true; // Stops current loop execution

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    // Initialize flags if not present
    if (!context.flags) {
      context.flags = {
        halted: false,
        breaking: false,
        continuing: false,
        returning: false,
        async: false
      };
    }

    // Set the breaking flag to indicate loop should exit
    context.flags.breaking = true;

    // Break command doesn't return a value
    return undefined;
  }

  validate(args: any[]): string | null {
    if (args.length > 0) {
      return 'Break command takes no arguments';
    }
    return null;
  }
}

export default BreakCommand;