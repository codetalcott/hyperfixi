/**
 * HyperFixi Minimal Browser Bundle V2
 * Tree-Shakeable Implementation - Only 8 Core Commands
 *
 * This bundle bypasses the Runtime class to achieve true tree-shaking.
 * It imports only the 8 most common commands directly, resulting in
 * a 60-70% smaller bundle size compared to the full version.
 *
 * Commands included:
 * - add, remove, toggle (DOM manipulation)
 * - put (content insertion)
 * - set (variable assignment)
 * - if (control flow)
 * - send (event dispatch)
 * - log (debugging)
 *
 * Expected size: ~128KB uncompressed (~45-55KB gzipped)
 * Full bundle: ~511KB uncompressed (~112KB gzipped)
 * Reduction: ~71% smaller
 */

import { parse } from '../parser/parser';
import { MinimalCommandRegistry } from '../runtime/minimal-command-registry';
import { ExpressionEvaluator } from '../core/expression-evaluator';
import { createMinimalAttributeProcessor, type MinimalRuntime } from '../dom/minimal-attribute-processor';
import { createContext } from '../core/context';
import type { ExecutionContext } from '../types/base-types';

// Import ONLY the 8 minimal commands (tree-shaking works!)
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createSetCommand } from '../commands/data/set';
import { createIfCommand } from '../commands/control-flow/if';
import { createSendCommand } from '../commands/events/send';
import { createLogCommand } from '../commands/utility/log';

/**
 * Minimal Runtime - Direct Implementation
 * Bypasses Runtime class to avoid importing all commands
 */
class MinimalRuntimeV2 {
  private registry: MinimalCommandRegistry;
  private evaluator: ExpressionEvaluator;

  constructor() {
    this.registry = new MinimalCommandRegistry();
    this.evaluator = new ExpressionEvaluator();

    // Register only minimal commands
    this.registry.register(createAddCommand());
    this.registry.register(createRemoveCommand());
    this.registry.register(createToggleCommand());
    this.registry.register(createPutCommand());
    this.registry.register(createSetCommand());
    this.registry.register(createIfCommand());
    this.registry.register(createSendCommand());
    this.registry.register(createLogCommand());
  }

  /**
   * Parse hyperscript code
   */
  parse(code: string) {
    return parse(code);
  }

  /**
   * Execute hyperscript code
   */
  async execute(code: string, context?: ExecutionContext): Promise<any> {
    const ctx = context || createContext();
    const parseResult = parse(code);

    if (!parseResult.success || !parseResult.node) {
      throw new Error(parseResult.error?.message || 'Parse failed');
    }

    return await this.registry.execute(parseResult.node, ctx);
  }

  /**
   * Get command registry (for advanced usage)
   */
  getRegistry(): MinimalCommandRegistry {
    return this.registry;
  }

  /**
   * Get expression evaluator (for advanced usage)
   */
  getEvaluator(): ExpressionEvaluator {
    return this.evaluator;
  }
}

// Create runtime instance
const runtime = new MinimalRuntimeV2();

// Create minimal attribute processor
const attributeProcessor = createMinimalAttributeProcessor(runtime);

// Expose global API
if (typeof window !== 'undefined') {
  (window as any).hyperfixi = {
    runtime,
    parse: (code: string) => runtime.parse(code),
    execute: async (code: string, context?: any) => runtime.execute(code, context),
    createContext,
    attributeProcessor,
    version: '1.1.0-minimal-v2',
    commands: ['add', 'remove', 'toggle', 'put', 'set', 'if', 'send', 'log'],

    /**
     * Evaluate hyperscript code (convenience method)
     */
    eval: async (code: string, context?: any) => runtime.execute(code, context),

    /**
     * Initialize DOM scanning for _="" attributes
     */
    init: () => {
      attributeProcessor.init();
    }
  };

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

// Export for module usage
export { runtime, parse, createContext, attributeProcessor, MinimalRuntimeV2 };
export default runtime;
