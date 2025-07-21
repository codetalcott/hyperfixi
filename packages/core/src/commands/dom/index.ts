/**
 * DOM Commands Export Module
 * Provides all DOM manipulation commands for hyperscript
 */

export { HideCommand } from './hide';
export { ShowCommand } from './show';
export { ToggleCommand } from './toggle';
export { AddCommand } from './add';
export { RemoveCommand } from './remove';
export { PutCommand } from './put';

export type { HideCommandOptions } from './hide';
export type { ShowCommandOptions } from './show';
export type { ToggleCommandOptions } from './toggle';
export type { AddCommandOptions } from './add';
export type { RemoveCommandOptions } from './remove';
export type { PutCommandOptions } from './put';

// Create instances with default options for easy access
export const domCommands = {
  hide: new HideCommand(),
  show: new ShowCommand(),
  toggle: new ToggleCommand(),
  add: new AddCommand(),
  remove: new RemoveCommand(),
  put: new PutCommand(),
} as const;