/**
 * Execution Commands Export Module
 * Provides all execution commands for hyperscript
 */

import { EnhancedCallCommand } from './enhanced-call.js';

export { EnhancedCallCommand as CallCommand } from './enhanced-call.js';

// Create instances with default options for easy access
export const executionCommands = {
  call: new EnhancedCallCommand(),
} as const;