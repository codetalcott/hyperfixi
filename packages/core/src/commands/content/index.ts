/**
 * Content Commands Export Module  
 * Provides all content manipulation commands for hyperscript
 */

export { EnhancedAppendCommand as AppendCommand } from './enhanced-append';

// Create instances with default options for easy access
export const contentCommands = {
  append: new EnhancedAppendCommand(),
} as const;