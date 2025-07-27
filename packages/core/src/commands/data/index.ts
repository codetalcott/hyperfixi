/**
 * Data Commands Export Module
 * Provides all data manipulation commands for hyperscript
 */

import { EnhancedSetCommand } from './enhanced-set.js';
import { EnhancedDefaultCommand } from './enhanced-default.js';
import { EnhancedIncrementCommand } from './enhanced-increment.js';
import { EnhancedDecrementCommand } from './enhanced-decrement.js';

export { EnhancedSetCommand as SetCommand } from './enhanced-set.js';
export { EnhancedDefaultCommand as DefaultCommand } from './enhanced-default.js';
export { EnhancedIncrementCommand as IncrementCommand } from './enhanced-increment.js';
export { EnhancedDecrementCommand as DecrementCommand } from './enhanced-decrement.js';

// Create instances with default options for easy access
export const dataCommands = {
  set: new EnhancedSetCommand(),
  default: new EnhancedDefaultCommand(),
  increment: new EnhancedIncrementCommand(),
  decrement: new EnhancedDecrementCommand(),
} as const;