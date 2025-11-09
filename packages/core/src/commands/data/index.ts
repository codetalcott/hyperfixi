/**
 * Data Commands Export Module
 * Provides all data manipulation commands for hyperscript
 */

import { SetCommand } from './set';
import { DefaultCommand } from './default';
import { IncrementCommand } from './increment';
import { DecrementCommand } from './decrement';

export { SetCommand as SetCommand } from './set';
export { DefaultCommand as DefaultCommand } from './default';
export { IncrementCommand as IncrementCommand } from './increment';
export { DecrementCommand as DecrementCommand } from './decrement';

// Create instances with default options for easy access
export const dataCommands = {
  set: new SetCommand(),
  default: new DefaultCommand(),
  increment: new IncrementCommand(),
  decrement: new DecrementCommand(),
} as const;
