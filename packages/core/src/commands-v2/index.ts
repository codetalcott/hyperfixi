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

// Control Flow Commands
export { IfCommand, createIfCommand } from './control-flow/if';
export { RepeatCommand, createRepeatCommand } from './control-flow/repeat';
export { BreakCommand, createBreakCommand } from './control-flow/break';
export { ContinueCommand, createContinueCommand } from './control-flow/continue';
export { HaltCommand, createHaltCommand } from './control-flow/halt';
export { ReturnCommand, createReturnCommand } from './control-flow/return';
export { ExitCommand, createExitCommand } from './control-flow/exit';

// Data Commands (Phase 6-2)
export { BindCommand, createBindCommand } from './data/bind';

// Execution Commands
export { CallCommand, createCallCommand } from './execution/call';

// Content Commands
export { AppendCommand, createAppendCommand } from './content/append';

// Animation Commands (Phase 6-3)
export { TransitionCommand, createTransitionCommand } from './animation/transition';
export { MeasureCommand, createMeasureCommand } from './animation/measure';
export { SettleCommand, createSettleCommand } from './animation/settle';

// Data Persistence (Phase 6-3)
export { PersistCommand, createPersistCommand } from './data/persist';

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
export type { IfCommandInput } from './control-flow/if';
export type { RepeatCommandInput } from './control-flow/repeat';
export type { BreakCommandInput } from './control-flow/break';
export type { ContinueCommandInput } from './control-flow/continue';
export type { HaltCommandInput } from './control-flow/halt';
export type { ReturnCommandInput } from './control-flow/return';
export type { ExitCommandInput } from './control-flow/exit';
export type { BindCommandInput } from './data/bind';
export type { CallCommandInput } from './execution/call';
export type { AppendCommandInput } from './content/append';
export type { TransitionCommandInput } from './animation/transition';
export type { MeasureCommandInput } from './animation/measure';
export type { SettleCommandInput } from './animation/settle';
export type { PersistCommandInput } from './data/persist';
