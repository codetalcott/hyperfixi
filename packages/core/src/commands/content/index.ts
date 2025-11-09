/**
 * Content Commands Export Module
 * Provides all content manipulation commands for hyperscript
 */

import { AppendCommand } from './append';

export { AppendCommand as AppendCommand } from './append';

// Create instances with default options for easy access
export const contentCommands = {
  append: new AppendCommand(),
} as const;
