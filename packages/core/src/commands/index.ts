/**
 * Commands V2 - Enhanced with parseInput() for RuntimeBase
 *
 * This directory contains non-destructive wrappers for core commands,
 * adding parseInput() methods that enable tree-shakable RuntimeBase.
 *
 * These wrappers extend the original commands and move argument parsing
 * logic from Runtime to the commands themselves.
 *
 * ## Tree-Shaking Usage
 *
 * For optimal tree-shaking, import only the commands you need:
 *
 * ```typescript
 * import { createTreeShakeableRuntime } from '@hyperfixi/core/runtime';
 * import { toggle, add, remove } from '@hyperfixi/core/commands';
 *
 * const runtime = createTreeShakeableRuntime(
 *   [toggle(), add(), remove()],
 *   { expressionEvaluator: createCoreExpressionEvaluator() }
 * );
 * ```
 */

// =============================================================================
// TREE-SHAKEABLE FACTORY EXPORTS (Recommended for custom bundles)
// =============================================================================
// Import only what you need - bundlers will tree-shake unused exports

// DOM Commands (factories)
export { createHideCommand as hide } from './dom/hide';
export { createShowCommand as show } from './dom/show';
export { createAddCommand as add } from './dom/add';
export { createRemoveCommand as remove } from './dom/remove';
export { createToggleCommand as toggle } from './dom/toggle';
export { createPutCommand as put } from './dom/put';
export { createMakeCommand as make } from './dom/make';
export { createSwapCommand as swap, createMorphCommand as morph } from './dom/swap';
export { createProcessPartialsCommand as processPartialsCmd } from './dom/process-partials';

// Async Commands (factories)
export { createWaitCommand as wait } from './async/wait';
export { createFetchCommand as fetch } from './async/fetch';

// Data Commands (factories)
export { createSetCommand as set } from './data/set';
export { createGetCommand as get } from './data/get';
export { createIncrementCommand as increment } from './data/increment';
export { createDecrementCommand as decrement } from './data/decrement';
export { createBindCommand as bind } from './data/bind';
export { createPersistCommand as persist } from './data/persist';
export { createDefaultCommand as defaultCmd } from './data/default';

// Utility Commands (factories)
export { createLogCommand as log } from './utility/log';
export { createTellCommand as tell } from './utility/tell';
export { createCopyCommand as copy } from './utility/copy';
export { createPickCommand as pick } from './utility/pick';
export { createBeepCommand as beep } from './utility/beep';

// Event Commands (factories)
export { createTriggerCommand as trigger } from './events/trigger';
export { createSendCommand as send } from './events/send';

// Navigation Commands (factories)
export { createGoCommand as go } from './navigation/go';
export { createPushUrlCommand as pushUrl } from './navigation/push-url';
export { createReplaceUrlCommand as replaceUrl } from './navigation/replace-url';

// Control Flow Commands (factories)
export { createIfCommand as if_ } from './control-flow/if';
export { createUnlessCommand as unless } from './control-flow/unless';
export { createRepeatCommand as repeat } from './control-flow/repeat';
export { createBreakCommand as break_ } from './control-flow/break';
export { createContinueCommand as continue_ } from './control-flow/continue';
export { createHaltCommand as halt } from './control-flow/halt';
export { createReturnCommand as return_ } from './control-flow/return';
export { createExitCommand as exit } from './control-flow/exit';
export { createThrowCommand as throw_ } from './control-flow/throw';

// Execution Commands (factories)
export { createCallCommand as call } from './execution/call';
export { createPseudoCommand as pseudo } from './execution/pseudo-command';

// Content Commands (factories)
export { createAppendCommand as append } from './content/append';

// Animation Commands (factories)
export { createTransitionCommand as transition } from './animation/transition';
export { createMeasureCommand as measure } from './animation/measure';
export { createSettleCommand as settle } from './animation/settle';
export { createTakeCommand as take } from './animation/take';

// Advanced Commands (factories)
export { createJsCommand as js } from './advanced/js';
export { createAsyncCommand as async_ } from './advanced/async';

// Behavior Commands (factories)
export { createInstallCommand as install } from './behaviors/install';

// Template Commands (factories)
export { createRenderCommand as render } from './templates/render';

// =============================================================================
// BACKWARD-COMPATIBLE EXPORTS (Full class + factory names)
// =============================================================================
// These exports maintain backward compatibility with existing code

// DOM Commands
export { HideCommand, createHideCommand } from './dom/hide';
export { ShowCommand, createShowCommand } from './dom/show';
export { AddCommand, createAddCommand } from './dom/add';
export { RemoveCommand, createRemoveCommand } from './dom/remove';
export { ToggleCommand, createToggleCommand } from './dom/toggle';
export { PutCommand, createPutCommand } from './dom/put';
export { MakeCommand, createMakeCommand } from './dom/make';
export { swapCommand, morphCommand, createSwapCommand, createMorphCommand } from './dom/swap';
export {
  processPartialsCommand,
  createProcessPartialsCommand,
  extractPartials,
  processPartials,
} from './dom/process-partials';

// Async Commands
export { WaitCommand, createWaitCommand } from './async/wait';
export { FetchCommand, createFetchCommand } from './async/fetch';

// Data Commands
export { SetCommand, createSetCommand } from './data/set';
export { GetCommand, createGetCommand } from './data/get';
export {
  NumericModifyCommand,
  createNumericModifyCommand,
  IncrementCommand,
  createIncrementCommand,
} from './data/increment';
export { DecrementCommand, createDecrementCommand } from './data/decrement';

// Utility Commands
export { LogCommand, createLogCommand } from './utility/log';

// Event Commands
export {
  EventDispatchCommand,
  createEventDispatchCommand,
  TriggerCommand,
  createTriggerCommand,
} from './events/trigger';
export { SendCommand, createSendCommand } from './events/send';

// Navigation Commands
export { GoCommand, createGoCommand } from './navigation/go';
export {
  HistoryCommand,
  createHistoryCommand,
  PushUrlCommand,
  createPushUrlCommand,
} from './navigation/push-url';
export { ReplaceUrlCommand, createReplaceUrlCommand } from './navigation/replace-url';

// Control Flow Commands
export {
  ConditionalCommand,
  createConditionalCommand,
  IfCommand,
  createIfCommand,
} from './control-flow/if';
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
export type {
  ProcessPartialsCommandInput,
  ParsedPartial,
  ProcessPartialsResult,
} from './dom/process-partials';
export type { WaitCommandInput } from './async/wait';
export type { FetchCommandInput } from './async/fetch';
export type { SetCommandInput } from './data/set';
export type { GetCommandInput } from './data/get';
export type { NumericModifyInput, NumericOperation, IncrementCommandInput } from './data/increment';
export type { DecrementCommandInput } from './data/decrement';
export type { LogCommandInput } from './utility/log';
export type { EventDispatchInput, EventDispatchMode, TriggerCommandInput } from './events/trigger';
export type { SendCommandInput } from './events/send';
export type { GoCommandInput } from './navigation/go';
export type { HistoryCommandInput, HistoryMode, PushUrlCommandInput } from './navigation/push-url';
export type { ReplaceUrlCommandInput } from './navigation/replace-url';
export type {
  ConditionalCommandInput,
  ConditionalCommandOutput,
  ConditionalMode,
  IfCommandInput,
  IfCommandOutput,
} from './control-flow/if';
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
