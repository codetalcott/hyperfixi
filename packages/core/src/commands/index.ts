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
export { swapCommand, morphCommand, createSwapCommand, createMorphCommand } from './dom/swap';
export { processPartialsCommand, createProcessPartialsCommand, extractPartials, processPartials } from './dom/process-partials';

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
export { pushUrlCommand, createPushUrlCommand } from './navigation/push-url';
export { replaceUrlCommand, createReplaceUrlCommand } from './navigation/replace-url';

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

// Advanced Commands (Phase 6-4)
export { JsCommand, createJsCommand } from './advanced/js';
export { AsyncCommand, createAsyncCommand } from './advanced/async';

// Control Flow - Phase 6-4
export { UnlessCommand, createUnlessCommand } from './control-flow/unless';

// Data Commands - Phase 6-4
export { DefaultCommand, createDefaultCommand } from './data/default';

// Execution Commands - Phase 6-4
export { PseudoCommand, createPseudoCommand } from './execution/pseudo-command';

// Utility & Specialized - Phase 6-5
export { TellCommand, createTellCommand } from './utility/tell';
export { CopyCommand, createCopyCommand } from './utility/copy';
export { PickCommand, createPickCommand } from './utility/pick';
export { ThrowCommand, createThrowCommand } from './control-flow/throw';
export { BeepCommand, createBeepCommand } from './utility/beep';
export { InstallCommand, createInstallCommand } from './behaviors/install';

// Final Commands - Phase 6-6
export { TakeCommand, createTakeCommand } from './animation/take';
export { RenderCommand, createRenderCommand } from './templates/render';

// Export input types for documentation
export type { HideCommandInput } from './dom/hide';
export type { ShowCommandInput } from './dom/show';
export type { AddCommandInput } from './dom/add';
export type { RemoveCommandInput } from './dom/remove';
export type { ToggleCommandInput } from './dom/toggle';
export type { PutCommandInput } from './dom/put';
export type { MakeCommandInput } from './dom/make';
export type { SwapCommandInput, SwapStrategy } from './dom/swap';
export type { ProcessPartialsCommandInput, ParsedPartial, ProcessPartialsResult } from './dom/process-partials';
export type { WaitCommandInput } from './async/wait';
export type { FetchCommandInput } from './async/fetch';
export type { SetCommandInput } from './data/set';
export type { IncrementCommandInput } from './data/increment';
export type { DecrementCommandInput } from './data/decrement';
export type { LogCommandInput } from './utility/log';
export type { TriggerCommandInput } from './events/trigger';
export type { SendCommandInput } from './events/send';
export type { GoCommandRawInput as GoCommandInput } from './navigation/go';
export type { PushUrlCommandInput } from './navigation/push-url';
export type { ReplaceUrlCommandInput } from './navigation/replace-url';
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
export type { JsCommandInput } from './advanced/js';
export type { AsyncCommandInput } from './advanced/async';
export type { UnlessCommandInput } from './control-flow/unless';
export type { DefaultCommandInput } from './data/default';
export type { PseudoCommandInput } from './execution/pseudo-command';
export type { TellCommandInput } from './utility/tell';
export type { CopyCommandInput } from './utility/copy';
export type { PickCommandInput } from './utility/pick';
export type { ThrowCommandInput } from './control-flow/throw';
export type { BeepCommandInput } from './utility/beep';
export type { InstallCommandInput } from './behaviors/install';
export type { TakeCommandInput } from './animation/take';
export type { RenderCommandInput } from './templates/render';
