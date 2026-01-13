/**
 * HyperFixi Minimal Browser Bundle V2 - Tree-Shakeable
 *
 * This bundle uses true tree-shaking by importing:
 * - createTreeShakeableRuntime (zero module-level command imports)
 * - createCoreExpressionEvaluator (only 3 expression categories)
 * - Only the 8 commands needed for minimal functionality
 *
 * Commands included (8 minimal):
 * - add, remove, toggle (DOM manipulation)
 * - put (content insertion)
 * - set (variable assignment)
 * - log (debugging)
 * - send (event dispatch)
 * - wait (async timing)
 *
 * Expression categories included (3 of 6):
 * - references: CSS selectors, me, you, it
 * - logical: comparisons, boolean operators
 * - special: literals, basic math
 *
 * Expected size: ~120KB uncompressed (~40KB gzipped)
 * Full bundle: ~672KB uncompressed (~148KB gzipped)
 * Reduction: ~82% smaller
 */

import { parse } from '../parser/parser';
import { createTreeShakeableRuntime } from '../runtime/runtime-factory';
import { createCoreExpressionEvaluator } from '../expressions/bundles/core-expressions';
import { createMinimalAttributeProcessor } from '../dom/minimal-attribute-processor';
import { createContext, ensureContext } from '../core/context';

// Import ONLY the 8 minimal commands (true tree-shaking!)
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createSetCommand } from '../commands/data/set';
import { createSendCommand } from '../commands/events/send';
import { createLogCommand } from '../commands/utility/log';
import { createWaitCommand } from '../commands/async/wait';

// Create runtime with ONLY the commands and expressions we need
const runtime = createTreeShakeableRuntime(
  [
    createAddCommand(),
    createRemoveCommand(),
    createToggleCommand(),
    createPutCommand(),
    createSetCommand(),
    createSendCommand(),
    createLogCommand(),
    createWaitCommand(),
  ],
  {
    expressionEvaluator: createCoreExpressionEvaluator(),
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
  version: '1.1.0-minimal-v2-tree-shakeable',
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
