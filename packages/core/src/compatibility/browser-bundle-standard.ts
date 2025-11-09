/**
 * HyperFixi Standard Browser Bundle
 * Includes core + 20 most commonly used commands for typical web applications
 *
 * Commands included:
 * - DOM: add, remove, toggle, show, hide, put
 * - Control Flow: if, halt, return
 * - Data: set, increment, decrement
 * - Events: send, trigger
 * - Async: wait
 * - Creation: make, append
 * - Execution: call, get
 * - Utility: log
 *
 * Estimated size: ~120KB gzipped (vs 192KB for full bundle)
 * Recommended for: Most web applications, dashboards, interactive forms
 */

import { Runtime } from '../runtime/runtime';
import { parse } from '../parser/parser';
import { defaultAttributeProcessor } from '../dom/attribute-processor';
import { createContext } from '../core/context';

// Standard command set (20 common commands)
const STANDARD_COMMANDS = [
  // Minimal commands (8)
  'add',
  'remove',
  'toggle',
  'put',
  'set',
  'if',
  'send',
  'log',

  // Additional common commands (12)
  'show',
  'hide',
  'increment',
  'decrement',
  'trigger',
  'wait',
  'halt',
  'return',
  'make',
  'append',
  'call',
  'get',
];

/**
 * Create a standard hyperscript runtime with common commands
 *
 * Phase 2 optimization: Uses 'common' expression tier for balanced bundle
 * - Commands: 20 common commands (lazy loaded)
 * - Expressions: Core + common tiers (references, logical, special, properties, conversion)
 * - Expected size: ~100-110KB gzipped (vs 83KB before Phase 2, includes more features)
 */
export function createStandardRuntime() {
  return new Runtime({
    lazyLoad: true,
    commands: STANDARD_COMMANDS,
    useEnhancedCommands: true,
    enableAsyncCommands: true,
    expressionPreload: 'common', // Phase 2: Load core + common expressions
  });
}

/**
 * Global API for standard bundle
 */
const runtime = createStandardRuntime();

// Expose global API
(window as any).hyperfixi = {
  runtime,
  parse,
  createContext,
  attributeProcessor: defaultAttributeProcessor,
  version: '1.0.0-standard',
  commands: STANDARD_COMMANDS,

  /**
   * Evaluate hyperscript code
   */
  eval: async (code: string, context?: any) => {
    const parseResult = parse(code);
    if (!parseResult.success || !parseResult.node) {
      throw new Error(parseResult.error?.message || 'Parse failed');
    }
    return await runtime.execute(parseResult.node, context || createContext());
  },

  /**
   * Initialize DOM scanning for _="" attributes
   */
  init: () => {
    defaultAttributeProcessor.init();
  },
};

// Auto-initialize on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    defaultAttributeProcessor.init();
  });
} else {
  // DOM already loaded
  defaultAttributeProcessor.init();
}

// Export for module usage
export { runtime, parse, createContext, defaultAttributeProcessor };
