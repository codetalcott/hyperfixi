/**
 * HyperFixi Standard Browser Bundle V2
 * Tree-Shakeable Implementation - 19 Common Commands
 *
 * This bundle bypasses the Runtime class to achieve true tree-shaking.
 * It imports only the 19 most commonly used commands, resulting in
 * a 50-60% smaller bundle size compared to the full version.
 *
 * Commands included:
 * - DOM: add, remove, toggle, show, hide, put (6)
 * - Control Flow: if, halt, return (3)
 * - Data: set, increment, decrement (3)
 * - Events: send, trigger (2)
 * - Async: wait (1)
 * - Creation: make (1)
 * - Content: append (1)
 * - Execution: call (1)
 * - Utility: log (1)
 *
 * Expected size: ~185KB uncompressed (~64-73KB gzipped)
 * Full bundle: ~511KB uncompressed (~112KB gzipped)
 * Reduction: ~59% smaller
 */

import { parse } from '../parser/parser';
import { MinimalCommandRegistry } from '../runtime/minimal-command-registry';
import { ExpressionEvaluator } from '../core/expression-evaluator';
import { createMinimalAttributeProcessor, type MinimalRuntime } from '../dom/minimal-attribute-processor';
import { createContext } from '../core/context';
import type { ExecutionContext } from '../types/base-types';

// Minimal commands (8)
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createSetCommand } from '../commands/data/set';
import { createIfCommand } from '../commands/control-flow/if';
import { createSendCommand } from '../commands/events/send';
import { createLogCommand } from '../commands/utility/log';

// Additional standard commands (11)
import { createShowCommand } from '../commands/dom/show';
import { createHideCommand } from '../commands/dom/hide';
import { createIncrementCommand } from '../commands/data/increment';
import { createDecrementCommand } from '../commands/data/decrement';
import { createTriggerCommand } from '../commands/events/trigger';
import { createWaitCommand } from '../commands/async/wait';
import { createHaltCommand } from '../commands/control-flow/halt';
import { createReturnCommand } from '../commands/control-flow/return';
import { createMakeCommand } from '../commands/creation/make';
import { createAppendCommand } from '../commands/content/append';
import { createCallCommand } from '../commands/execution/call';

/**
 * Standard Runtime - Direct Implementation
 * Bypasses Runtime class to avoid importing all commands
 */
class StandardRuntimeV2 {
  private registry: MinimalCommandRegistry;
  private evaluator: ExpressionEvaluator;

  constructor() {
    this.registry = new MinimalCommandRegistry();
    this.evaluator = new ExpressionEvaluator();

    // Register minimal commands (8)
    this.registry.register(createAddCommand());
    this.registry.register(createRemoveCommand());
    this.registry.register(createToggleCommand());
    this.registry.register(createPutCommand());
    this.registry.register(createSetCommand());
    this.registry.register(createIfCommand());
    this.registry.register(createSendCommand());
    this.registry.register(createLogCommand());

    // Register additional standard commands (12)
    this.registry.register(createShowCommand());
    this.registry.register(createHideCommand());
    this.registry.register(createIncrementCommand());
    this.registry.register(createDecrementCommand());
    this.registry.register(createTriggerCommand());
    this.registry.register(createWaitCommand());
    this.registry.register(createHaltCommand());
    this.registry.register(createReturnCommand());
    this.registry.register(createMakeCommand());
    this.registry.register(createAppendCommand());
    this.registry.register(createCallCommand());
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
const runtime = new StandardRuntimeV2();

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
    version: '1.1.0-standard-v2',
    commands: [
      'add', 'remove', 'toggle', 'put', 'set', 'if', 'send', 'log',  // Minimal (8)
      'show', 'hide', 'increment', 'decrement', 'trigger', 'wait',    // Additional (6)
      'halt', 'return', 'make', 'append', 'call'                      // Additional (5)
    ],

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
export { runtime, parse, createContext, attributeProcessor, StandardRuntimeV2 };
export default runtime;
