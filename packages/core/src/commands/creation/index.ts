/**
 * Creation Commands Export Module
 * Provides all creation commands for hyperscript
 */

export { EnhancedMakeCommand as MakeCommand } from './enhanced-make';

// Create instances with default options for easy access
export const creationCommands = {
  make: new EnhancedMakeCommand(),
} as const;