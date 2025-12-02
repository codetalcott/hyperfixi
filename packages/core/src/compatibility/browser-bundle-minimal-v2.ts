/**
 * HyperFixi Minimal Browser Bundle V2 - Experimental
 * Uses RuntimeBase + CommandAdapterV2 + V2 Commands
 *
 * This bundle uses the experimental RuntimeExperimental class which:
 * - Extends RuntimeBase (generic, zero direct command imports)
 * - Uses CommandRegistryV2 (parseInput() adapter)
 * - Imports V2 commands with parseInput() methods
 *
 * Commands included (8 minimal):
 * - add, remove, toggle (DOM manipulation)
 * - put (content insertion, with memberExpression fix)
 * - set (variable assignment)
 * - log (debugging)
 * - send (event dispatch)
 * - wait (async timing)
 *
 * Expected size: ~180KB uncompressed (~60KB gzipped)
 * Full bundle: ~511KB uncompressed (~112KB gzipped)
 * Reduction: ~60% smaller
 */

import { parse } from '../parser/parser';
import { createMinimalRuntime } from '../runtime/runtime-experimental';
import { createMinimalAttributeProcessor } from '../dom/minimal-attribute-processor';
import { createContext } from '../core/context';

// Import ONLY the 8 minimal V2 commands (tree-shaking works!)
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createSetCommand } from '../commands/data/set';
import { createSendCommand } from '../commands/events/send';
import { createLogCommand } from '../commands/utility/log';
import { createWaitCommand } from '../commands/async/wait';

// Create runtime instance with minimal commands
const runtimeExperimental = createMinimalRuntime([
  createAddCommand(),
  createRemoveCommand(),
  createToggleCommand(),
  createPutCommand(),      // Includes memberExpression fix for "put X into #el.innerHTML"
  createSetCommand(),
  createSendCommand(),
  createLogCommand(),
  createWaitCommand(),
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
  version: '1.1.0-minimal-v2-experimental',
  commands: ['add', 'remove', 'toggle', 'put', 'set', 'send', 'log', 'wait'],

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
