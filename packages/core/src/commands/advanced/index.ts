/**
 * Advanced Commands Export Module
 * Provides advanced hyperscript commands for complex interactions
 */

import { TellCommand } from './tell';
import { AsyncCommand } from './async';
import { BeepCommand } from './beep';

export { TellCommand } from './tell';
export { AsyncCommand } from './async';
export { BeepCommand } from './beep';

// Create instances with default options for easy access
export const advancedCommands = {
  tell: new TellCommand(),
  async: new AsyncCommand(),
  beep: new BeepCommand(),
} as const;