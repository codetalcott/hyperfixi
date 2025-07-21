/**
 * Data Commands Export Module
 * Provides all data manipulation commands for hyperscript
 */

export { SetCommand } from './set';

export type { SetCommandOptions } from './set';

// Create instances with default options for easy access
export const dataCommands = {
  set: new SetCommand(),
} as const;