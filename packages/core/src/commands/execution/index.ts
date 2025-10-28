/**
 * Execution Commands Export Module
 * Provides all execution commands for hyperscript
 */

import { CallCommand } from './call';
import { PseudoCommand } from './pseudo-command';

export { CallCommand as CallCommand } from './call';
export { PseudoCommand as PseudoCommand } from './pseudo-command';

// Create instances with default options for easy access
export const executionCommands = {
  call: new CallCommand(),
  pseudoCommand: new PseudoCommand(),
} as const;