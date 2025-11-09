/**
 * Advanced Commands Export Module
 * Provides advanced hyperscript commands for complex interactions
 */

import { TellCommand as TellCommand } from './tell';
import { AsyncCommand as AsyncCommand } from './async';
import { BeepCommand } from './beep';
import { JSCommand as JSCommand } from './js';

export { TellCommand as TellCommand } from './tell';
export { AsyncCommand as AsyncCommand } from './async';
export { BeepCommand } from './beep';
export { JSCommand as JSCommand } from './js';

// Create instances with default options for easy access
export const advancedCommands = {
  tell: new TellCommand(),
  async: new AsyncCommand(),
  beep: new BeepCommand(),
  js: new JSCommand(),
} as const;
