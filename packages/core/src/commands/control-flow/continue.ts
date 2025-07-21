/**
 * Continue Command Implementation
 * The continue command skips to the next iteration of the current loop in hyperscript
 * Generated from LSP data with TDD implementation
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class ContinueCommand implements CommandImplementation {
  name = 'continue';
  syntax = 'continue';
  description = 'The continue command skips the rest of the current loop iteration and continues with the next iteration (repeat, for, while, until).';
  isBlocking = true; // Stops current iteration execution

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

    // Set the continuing flag to indicate current iteration should be skipped
    context.flags.continuing = true;

    // Continue command doesn't return a value
    return undefined;
  }

  validate(args: any[]): string | null {
    if (args.length > 0) {
      return 'Continue command takes no arguments';
    }
    return null;
  }
}

export default ContinueCommand;