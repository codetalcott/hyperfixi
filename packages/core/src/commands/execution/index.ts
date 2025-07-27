/**
 * Execution Commands Export Module
 * Provides all execution commands for hyperscript
 */

export { EnhancedCallCommand as CallCommand } from './enhanced-call';

// Create instances with default options for easy access
export const executionCommands = {
  call: new EnhancedCallCommand(),
} as const;