/**
 * HyperFixi Standard Browser Bundle V2 - Tree-Shakeable
 *
 * This bundle uses true tree-shaking by importing:
 * - createTreeShakeableRuntime (zero module-level command imports)
 * - createCommonExpressionEvaluator (5 expression categories)
 * - Only the 16 commands needed for standard functionality
 *
 * Commands included (16 standard):
 * - DOM: add, remove, toggle, show, hide, put, make (7)
 * - Data: set, increment, decrement (3)
 * - Events: send, trigger (2)
 * - Async: wait, fetch (2)
 * - Navigation: go (1)
 * - Utility: log (1)
 *
 * Expression categories included (5 of 6):
 * - references: CSS selectors, me, you, it
 * - logical: comparisons, boolean operators
 * - special: literals, basic math
 * - conversion: as keyword, type conversion
 * - positional: first, last, array navigation
 *
 * Expected size: ~180KB uncompressed (~55KB gzipped)
 * Full bundle: ~672KB uncompressed (~148KB gzipped)
 * Reduction: ~73% smaller
 */

import { parse } from '../parser/parser';
import { createTreeShakeableRuntime } from '../runtime/runtime-factory';
import { createCommonExpressionEvaluator } from '../expressions/bundles/common-expressions';
import { createMinimalAttributeProcessor } from '../dom/minimal-attribute-processor';
import { createContext, ensureContext } from '../core/context';

// Import all 16 V2 standard commands (true tree-shaking!)
// DOM Commands (7)
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createShowCommand } from '../commands/dom/show';
import { createHideCommand } from '../commands/dom/hide';
import { createPutCommand } from '../commands/dom/put';
import { createMakeCommand } from '../commands/dom/make';

// Data Commands (3)
import { createSetCommand } from '../commands/data/set';
import { createIncrementCommand } from '../commands/data/increment';
import { createDecrementCommand } from '../commands/data/decrement';

// Event Commands (2)
import { createSendCommand } from '../commands/events/send';
import { createTriggerCommand } from '../commands/events/trigger';

// Async Commands (2)
import { createWaitCommand } from '../commands/async/wait';
import { createFetchCommand } from '../commands/async/fetch';

// Navigation Commands (1)
import { createGoCommand } from '../commands/navigation/go';

// Utility Commands (1)
import { createLogCommand } from '../commands/utility/log';

// Create runtime with ONLY the commands and expressions we need
const runtime = createTreeShakeableRuntime(
  [
    // DOM (7)
    createAddCommand(),
    createRemoveCommand(),
    createToggleCommand(),
    createShowCommand(),
    createHideCommand(),
    createPutCommand(),
    createMakeCommand(),
    // Data (3)
    createSetCommand(),
    createIncrementCommand(),
    createDecrementCommand(),
    // Events (2)
    createSendCommand(),
    createTriggerCommand(),
    // Async (2)
    createWaitCommand(),
    createFetchCommand(),
    // Navigation (1)
    createGoCommand(),
    // Utility (1)
    createLogCommand(),
  ],
  {
    expressionEvaluator: createCommonExpressionEvaluator(),
  }
);

// Create adapter for MinimalAttributeProcessor
// RuntimeBase has execute(node, context), but MinimalAttributeProcessor needs execute(code, context)
const runtimeAdapter = {
  parse: (code: string) => parse(code),
  execute: async (code: string, context?: any) => {
    const ctx = ensureContext(context);
    const parseResult = parse(code);
    if (!parseResult.success || !parseResult.node) {
      throw new Error(parseResult.error?.message || 'Parse failed');
    }
    return await runtime.execute(parseResult.node, ctx);
  },
};

// Create minimal attribute processor with adapter
const attributeProcessor = createMinimalAttributeProcessor(runtimeAdapter);

// Create the API object (this is what gets exposed globally AND exported)
const api = {
  runtime: runtimeAdapter,
  parse: (code: string) => runtimeAdapter.parse(code),
  execute: async (code: string, context?: any) => runtimeAdapter.execute(code, context),
  createContext,
  attributeProcessor,
  version: '1.1.0-standard-v2-tree-shakeable',
  commands: [
    'add',
    'remove',
    'toggle',
    'show',
    'hide',
    'put',
    'make', // DOM (7)
    'set',
    'increment',
    'decrement', // Data (3)
    'send',
    'trigger', // Events (2)
    'wait',
    'fetch', // Async (2)
    'go', // Navigation (1)
    'log', // Utility (1)
  ],

  /**
   * Evaluate hyperscript code (convenience method)
   */
  eval: async (code: string, context?: any) => runtimeAdapter.execute(code, context),

  /**
   * Initialize DOM scanning for _="" attributes
   */
  init: () => {
    attributeProcessor.init();
  },
};

// Expose global API
if (typeof window !== 'undefined') {
  (window as any).hyperfixi = api;

  // Auto-initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attributeProcessor.init();
    });
  } else {
    // DOM already loaded
    attributeProcessor.init();
  }
}

// Export the API object (this is what rollup's IIFE format will use)
export default api;
