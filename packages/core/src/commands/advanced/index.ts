/**
 * Advanced Commands Export Module
 * Provides advanced hyperscript commands for complex interactions
 */

import { EnhancedTellCommand as TellCommand } from './enhanced-tell';
import { EnhancedAsyncCommand as AsyncCommand } from './enhanced-async';
import { BeepCommand } from './beep';
import { EnhancedJSCommand as JSCommand } from './enhanced-js';

export { EnhancedTellCommand as TellCommand } from './enhanced-tell';
export { EnhancedAsyncCommand as AsyncCommand } from './enhanced-async';
export { BeepCommand } from './beep';
export { EnhancedJSCommand as JSCommand } from './enhanced-js';

// Create instances with default options for easy access
export const advancedCommands = {
  tell: new TellCommand(),
  async: new AsyncCommand(),
  beep: new BeepCommand(),
  js: new JSCommand(),
} as const;