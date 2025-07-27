/**
 * Data Commands Export Module
 * Provides all data manipulation commands for hyperscript
 */

export { EnhancedSetCommand as SetCommand } from './enhanced-set';
export { EnhancedDefaultCommand as DefaultCommand } from './enhanced-default';
export { EnhancedIncrementCommand as IncrementCommand } from './enhanced-increment';
export { EnhancedDecrementCommand as DecrementCommand } from './enhanced-decrement';

// Create instances with default options for easy access
export const dataCommands = {
  set: new EnhancedSetCommand(),
  default: new EnhancedDefaultCommand(),
  increment: new EnhancedIncrementCommand(),
  decrement: new EnhancedDecrementCommand(),
} as const;