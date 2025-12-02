/**
 * HyperFixi Standard Browser Bundle V2 - Experimental
 * Uses RuntimeBase + CommandAdapterV2 + V2 Commands
 *
 * This bundle uses the experimental RuntimeExperimental class which:
 * - Extends RuntimeBase (generic, zero direct command imports)
 * - Uses CommandRegistryV2 (parseInput() adapter)
 * - Imports V2 commands with parseInput() methods
 *
 * Commands included (16 standard):
 * - DOM: add, remove, toggle, show, hide, put, make (7)
 * - Data: set, increment, decrement (3)
 * - Events: send, trigger (2)
 * - Async: wait, fetch (2)
 * - Navigation: go (1)
 * - Utility: log (1)
 *
 * Expected size: ~230KB uncompressed (~75KB gzipped)
 * Full bundle: ~511KB uncompressed (~112KB gzipped)
 * Reduction: ~55% smaller
 */

import { parse } from '../parser/parser';
import { createMinimalRuntime } from '../runtime/runtime-experimental';
import { createMinimalAttributeProcessor } from '../dom/minimal-attribute-processor';
import { createContext } from '../core/context';

// Import all 16 V2 standard commands
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

// Create runtime instance with standard commands
const runtimeExperimental = createMinimalRuntime([
  // DOM (7)
  createAddCommand(),
  createRemoveCommand(),
  createToggleCommand(),
  createShowCommand(),
  createHideCommand(),
  createPutCommand(),      // Includes memberExpression fix for "put X into #el.innerHTML"
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
]);

// Create adapter for MinimalAttributeProcessor
// RuntimeExperimental has execute(node, context), but MinimalAttributeProcessor needs execute(code, context)
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

// Create the API object (this is what gets exposed globally AND exported)
const api = {
  runtime: runtimeAdapter,
  parse: (code: string) => runtimeAdapter.parse(code),
  execute: async (code: string, context?: any) => runtimeAdapter.execute(code, context),
  createContext,
  attributeProcessor,
  version: '1.1.0-standard-v2-experimental',
  commands: [
    'add', 'remove', 'toggle', 'show', 'hide', 'put', 'make',       // DOM (7)
    'set', 'increment', 'decrement',                                 // Data (3)
    'send', 'trigger',                                               // Events (2)
    'wait', 'fetch',                                                 // Async (2)
    'go',                                                            // Navigation (1)
    'log'                                                            // Utility (1)
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
  }
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
