/**
 * Commands V2 - Enhanced with parseInput() for RuntimeBase
 *
 * This directory contains non-destructive wrappers for core commands,
 * adding parseInput() methods that enable tree-shakable RuntimeBase.
 *
 * These wrappers extend the original commands and move argument parsing
 * logic from Runtime to the commands themselves.
 */

// DOM Commands
export { HideCommand, createHideCommand } from './dom/hide';
export { ShowCommand, createShowCommand } from './dom/show';
export { AddCommand, createAddCommand } from './dom/add';
export { RemoveCommand, createRemoveCommand } from './dom/remove';
export { ToggleCommand, createToggleCommand } from './dom/toggle';
export { PutCommand, createPutCommand } from './dom/put';
export { MakeCommand, createMakeCommand } from './dom/make';

// Async Commands
export { WaitCommand, createWaitCommand } from './async/wait';
export { FetchCommand, createFetchCommand } from './async/fetch';

// Data Commands
export { SetCommand, createSetCommand } from './data/set';
export { IncrementCommand, createIncrementCommand } from './data/increment';
export { DecrementCommand, createDecrementCommand } from './data/decrement';

// Utility Commands
export { LogCommand, createLogCommand } from './utility/log';

// Event Commands
export { TriggerCommand, createTriggerCommand } from './events/trigger';
export { SendCommand, createSendCommand } from './events/send';

// Navigation Commands
export { GoCommand, createGoCommand } from './navigation/go';

// Export raw input types for documentation
export type { HideCommandRawInput } from './dom/hide';
export type { ShowCommandRawInput } from './dom/show';
export type { AddCommandRawInput } from './dom/add';
export type { RemoveCommandRawInput } from './dom/remove';
export type { ToggleCommandRawInput } from './dom/toggle';
export type { PutCommandRawInput } from './dom/put';
export type { MakeCommandRawInput } from './dom/make';
export type { WaitCommandRawInput } from './async/wait';
export type { FetchCommandRawInput } from './async/fetch';
export type { SetCommandRawInput } from './data/set';
export type { IncrementCommandRawInput } from './data/increment';
export type { DecrementCommandRawInput } from './data/decrement';
export type { LogCommandRawInput } from './utility/log';
export type { TriggerCommandRawInput } from './events/trigger';
export type { SendCommandRawInput } from './events/send';
export type { GoCommandRawInput } from './navigation/go';
