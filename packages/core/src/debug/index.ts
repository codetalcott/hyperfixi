/**
 * HyperFixi Interactive Debugger — Public API
 *
 * Usage:
 *   import { hyperscript } from '@hyperfixi/core';
 *
 *   hyperscript.debug.enable();
 *   hyperscript.debug.pause();           // pause at next command
 *   hyperscript.debug.on('paused', (snapshot) => { ... });
 *
 * Or standalone:
 *   import { createDebugController } from '@hyperfixi/core/debug';
 *   const dbg = createDebugController();
 *   runtime.registerHooks('debugger', dbg.hooks);
 *   dbg.enable();
 */

export { DebugController } from './debug-controller';
export type {
  StepMode,
  BreakpointCondition,
  DebugSnapshot,
  DebugState,
  DebugEventType,
  DebugEventListener,
} from './debug-controller';

import { DebugController } from './debug-controller';

/**
 * Create a standalone DebugController.
 * Register its `.hooks` with a runtime's HookRegistry to activate.
 */
export function createDebugController(): DebugController {
  return new DebugController();
}
