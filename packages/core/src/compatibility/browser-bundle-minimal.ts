/**
 * HyperFixi Minimal Browser Bundle
 * Includes only core + 8 most common commands for smallest bundle size
 *
 * Commands included:
 * - add, remove, toggle (class manipulation)
 * - put (content insertion)
 * - set (variable assignment)
 * - if (conditionals)
 * - send (custom events)
 * - log (debugging)
 *
 * Estimated size: ~60KB gzipped (vs 192KB for full bundle)
 * Recommended for: Simple interactive UIs, form enhancements, basic animations
 */

import { Runtime } from '../runtime/runtime';
import { parse } from '../parser/parser';
import { defaultAttributeProcessor } from '../dom/attribute-processor';
import { createContext } from '../core/context';

// Minimal command set (8 most common commands)
const MINIMAL_COMMANDS = ['add', 'remove', 'toggle', 'put', 'set', 'if', 'send', 'log'];

/**
 * Create a minimal hyperscript runtime with only essential commands
 *
 * Phase 2 optimization: Uses 'core' expression tier for smallest bundle
 * - Commands: 8 essential commands (lazy loaded)
 * - Expressions: Core tier only (references, logical, special)
 * - Expected size: ~50-60KB gzipped (vs 83KB before Phase 2)
 */
export function createMinimalRuntime() {
  return new Runtime({
    lazyLoad: true,
    commands: MINIMAL_COMMANDS,
    useEnhancedCommands: true,
    enableAsyncCommands: false,
    expressionPreload: 'core', // Phase 2: Only load core expressions
  });
}

/**
 * Global API for minimal bundle
 */
const runtime = createMinimalRuntime();

// Expose global API
(window as any).hyperfixi = {
  runtime,
  parse,
  createContext,
  attributeProcessor: defaultAttributeProcessor,
  version: '1.0.0-minimal',
  commands: MINIMAL_COMMANDS,

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
