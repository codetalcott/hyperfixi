/**
 * Creation Commands Export Module
 * Provides all creation commands for hyperscript
 */

import { MakeCommand } from './make';

export { MakeCommand as MakeCommand } from './make';

// Create instances with default options for easy access
export const creationCommands = {
  make: new MakeCommand(),
} as const;
