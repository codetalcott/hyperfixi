/**
 * Utility Commands Export Module
 * Provides all utility commands for hyperscript
 */

import { PickCommand } from './pick';

export { PickCommand } from './pick';

// Create instances with default options for easy access
export const utilityCommands = {
  pick: new PickCommand(),
} as const;