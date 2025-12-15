/**
 * HyperFixi Classic Browser Bundle
 * Uses RuntimeBase + CommandAdapterV2 + Classic _hyperscript Commands Only
 *
 * This bundle EXCLUDES htmx-like features:
 * - swap/morph commands (use put, add, remove instead)
 * - process-partials command
 * - bind command (two-way data binding)
 * - persist command (localStorage persistence)
 * - push-url, replace-url commands (History API)
 * - boosted/history-swap behaviors
 * - Tailwind extension
 * - View Transitions API integration
 *
 * Commands included (37 classic _hyperscript commands):
 * - DOM: add, remove, toggle, put, hide, show, make (7)
 * - Control Flow: if, unless, repeat, break, continue, halt, return, exit, throw (9)
 * - Data: set, get, increment, decrement, default (5)
 * - Async: wait, fetch (2)
 * - Events: trigger, send (2)
 * - Animation: transition, measure, settle, take (4)
 * - Utility: log, tell, call, copy, pick, beep (6)
 * - Advanced: js, async (2)
 * - Navigation: go (1)
 * - Special: install, append, render, pseudo-command (4)
 *
 * Expected size: ~210KB uncompressed (~70KB gzipped)
 * Full bundle: ~366KB uncompressed (~112KB gzipped)
 * Reduction: ~40% smaller
 */

import { parse } from '../parser/parser';
import { createMinimalRuntime } from '../runtime/runtime-experimental';
import { createMinimalAttributeProcessor } from '../dom/minimal-attribute-processor';
import { createContext } from '../core/context';

// ============================================================================
// Expression Categories (for ConfigurableExpressionEvaluator)
// ============================================================================
import { ConfigurableExpressionEvaluator } from '../core/configurable-expression-evaluator';
import { referencesExpressions } from '../expressions/references/index';
import { logicalExpressions } from '../expressions/logical/index';
import { specialExpressions } from '../expressions/special/index';
import { propertiesExpressions } from '../expressions/properties/index';
import { conversionExpressions } from '../expressions/conversion/index';
import { positionalExpressions } from '../expressions/positional/index';

// ============================================================================
// DOM Commands (7)
// ============================================================================
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createHideCommand } from '../commands/dom/hide';
import { createShowCommand } from '../commands/dom/show';
import { createMakeCommand } from '../commands/dom/make';

// ============================================================================
// Control Flow Commands (9)
// ============================================================================
import { createIfCommand } from '../commands/control-flow/if';
import { createUnlessCommand } from '../commands/control-flow/unless';
import { createRepeatCommand } from '../commands/control-flow/repeat';
import { createBreakCommand } from '../commands/control-flow/break';
import { createContinueCommand } from '../commands/control-flow/continue';
import { createHaltCommand } from '../commands/control-flow/halt';
import { createReturnCommand } from '../commands/control-flow/return';
import { createExitCommand } from '../commands/control-flow/exit';
import { createThrowCommand } from '../commands/control-flow/throw';

// ============================================================================
// Data Commands (5)
// ============================================================================
import { createSetCommand } from '../commands/data/set';
import { createGetCommand } from '../commands/data/get';
import { createIncrementCommand } from '../commands/data/increment';
import { createDecrementCommand } from '../commands/data/decrement';
import { createDefaultCommand } from '../commands/data/default';

// ============================================================================
// Async Commands (2)
// ============================================================================
import { createWaitCommand } from '../commands/async/wait';
import { createFetchCommand } from '../commands/async/fetch';

// ============================================================================
// Event Commands (2)
// ============================================================================
import { createTriggerCommand } from '../commands/events/trigger';
import { createSendCommand } from '../commands/events/send';

// ============================================================================
// Animation Commands (4)
// ============================================================================
import { createTransitionCommand } from '../commands/animation/transition';
import { createMeasureCommand } from '../commands/animation/measure';
import { createSettleCommand } from '../commands/animation/settle';
import { createTakeCommand } from '../commands/animation/take';

// ============================================================================
// Utility Commands (6)
// ============================================================================
import { createLogCommand } from '../commands/utility/log';
import { createTellCommand } from '../commands/utility/tell';
import { createCallCommand } from '../commands/execution/call';
import { createCopyCommand } from '../commands/utility/copy';
import { createPickCommand } from '../commands/utility/pick';
import { createBeepCommand } from '../commands/utility/beep';

// ============================================================================
// Advanced Commands (2)
// ============================================================================
import { createJsCommand } from '../commands/advanced/js';
import { createAsyncCommand } from '../commands/advanced/async';

// ============================================================================
// Navigation Commands (1)
// ============================================================================
import { createGoCommand } from '../commands/navigation/go';

// ============================================================================
// Special Commands (4)
// ============================================================================
import { createInstallCommand } from '../commands/behaviors/install';
import { createAppendCommand } from '../commands/content/append';
import { createRenderCommand } from '../commands/templates/render';
import { createPseudoCommand } from '../commands/execution/pseudo-command';

// ============================================================================
// Runtime Setup
// ============================================================================

// Create ConfigurableExpressionEvaluator with all 6 expression categories
// In the future, this could be reduced to only needed categories for smaller bundles
const expressionEvaluator = new ConfigurableExpressionEvaluator([
  referencesExpressions,
  logicalExpressions,
  specialExpressions,
  propertiesExpressions,
  conversionExpressions,
  positionalExpressions,
]);

// Create runtime instance with classic commands (37 total) and custom expression evaluator
const runtimeExperimental = createMinimalRuntime([
  // DOM (7)
  createAddCommand(),
  createRemoveCommand(),
  createToggleCommand(),
  createPutCommand(),
  createHideCommand(),
  createShowCommand(),
  createMakeCommand(),

  // Control Flow (9)
  createIfCommand(),
  createUnlessCommand(),
  createRepeatCommand(),
  createBreakCommand(),
  createContinueCommand(),
  createHaltCommand(),
  createReturnCommand(),
  createExitCommand(),
  createThrowCommand(),

  // Data (5)
  createSetCommand(),
  createGetCommand(),
  createIncrementCommand(),
  createDecrementCommand(),
  createDefaultCommand(),

  // Async (2)
  createWaitCommand(),
  createFetchCommand(),

  // Events (2)
  createTriggerCommand(),
  createSendCommand(),

  // Animation (4)
  createTransitionCommand(),
  createMeasureCommand(),
  createSettleCommand(),
  createTakeCommand(),

  // Utility (6)
  createLogCommand(),
  createTellCommand(),
  createCallCommand(),
  createCopyCommand(),
  createPickCommand(),
  createBeepCommand(),

  // Advanced (2)
  createJsCommand(),
  createAsyncCommand(),

  // Navigation (1)
  createGoCommand(),

  // Special (4)
  createInstallCommand(),
  createAppendCommand(),
  createRenderCommand(),
  createPseudoCommand(),
], { expressionEvaluator });

// Create adapter for MinimalAttributeProcessor
const runtimeAdapter = {
  parse: (code: string) => parse(code),
  execute: async (code: string, context?: any) => {
    const ctx = context || createContext();
    const parseResult = parse(code);
    if (!parseResult.success || !parseResult.node) {
      throw new Error(parseResult.error?.message || 'Parse failed');
    }
    return await runtimeExperimental.execute(parseResult.node, ctx);
  }
};

// Create minimal attribute processor with adapter
const attributeProcessor = createMinimalAttributeProcessor(runtimeAdapter);

// ============================================================================
// API Export
// ============================================================================

const api = {
  runtime: runtimeAdapter,
  parse: (code: string) => runtimeAdapter.parse(code),
  execute: async (code: string, context?: any) => runtimeAdapter.execute(code, context),
  createContext,
  attributeProcessor,
  version: '1.1.0-classic',

  // Classic commands list (37)
  commands: [
    // DOM (7)
    'add', 'remove', 'toggle', 'put', 'hide', 'show', 'make',
    // Control Flow (9)
    'if', 'unless', 'repeat', 'break', 'continue', 'halt', 'return', 'exit', 'throw',
    // Data (5)
    'set', 'get', 'increment', 'decrement', 'default',
    // Async (2)
    'wait', 'fetch',
    // Events (2)
    'trigger', 'send',
    // Animation (4)
    'transition', 'measure', 'settle', 'take',
    // Utility (6)
    'log', 'tell', 'call', 'copy', 'pick', 'beep',
    // Advanced (2)
    'js', 'async',
    // Navigation (1)
    'go',
    // Special (4)
    'install', 'append', 'render', 'pseudo-command'
  ],

  /**
   * Evaluate hyperscript code (convenience method)
   */
  eval: async (code: string, context?: any) => runtimeAdapter.execute(code, context),

  /**
   * Initialize DOM scanning for _="" attributes
   */
  init: async () => {
    await attributeProcessor.init();
  }
};

// Expose global API
if (typeof window !== 'undefined') {
  (window as any).hyperfixi = api;

  // Auto-initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await attributeProcessor.init();
    });
  } else {
    // DOM already loaded - use setTimeout(0) to allow other scripts to load first
    // This enables external behaviors packages to set __hyperfixi_behaviors_ready
    setTimeout(async () => {
      await attributeProcessor.init();
    }, 0);
  }
}

// Export the API object
export default api;
