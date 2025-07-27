/**
 * DOM Commands Export Module
 * Provides all DOM manipulation commands for hyperscript
 */

import { HideCommand } from './hide.js';
import { ShowCommand } from './show.js';
import { ToggleCommand } from './toggle.js';
import { AddCommand } from './add.js';
import { RemoveCommand } from './remove.js';
import { PutCommand } from './put.js';

export { HideCommand } from './hide.js';
export { ShowCommand } from './show.js';
export { ToggleCommand } from './toggle.js';
export { AddCommand } from './add.js';
export { RemoveCommand } from './remove.js';
export { PutCommand } from './put.js';

export type { HideCommandOptions } from './hide.js';
export type { ShowCommandOptions } from './show.js';
export type { ToggleCommandOptions } from './toggle.js';
export type { AddCommandOptions } from './add.js';
export type { RemoveCommandOptions } from './remove.js';
export type { PutCommandOptions } from './put.js';

// Create instances with default options for easy access
export const domCommands = {
  hide: new HideCommand(),
  show: new ShowCommand(),
  toggle: new ToggleCommand(),
  add: new AddCommand(),
  remove: new RemoveCommand(),
  put: new PutCommand(),
} as const;