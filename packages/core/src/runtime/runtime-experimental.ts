/**
 * RuntimeExperimental - Test runtime using RuntimeBase + CommandAdapterV2 + commands-v2
 *
 * This is an experimental runtime for testing the tree-shaking refactoring.
 * It uses:
 * - RuntimeBase (generic, zero command imports)
 * - EnhancedCommandRegistryV2 (generic adapter)
 * - Commands from commands-v2/ (with parseInput() methods)
 *
 * This runtime is for validation and testing only. DO NOT use in production
 * until Phase 5 validation is complete.
 */

import { RuntimeBase } from './runtime-base';
import { EnhancedCommandRegistryV2 } from './command-adapter-v2';
import type { EnhancedCommandRegistry } from './command-adapter';
import { ExpressionEvaluator } from '../core/expression-evaluator';
import { LazyExpressionEvaluator } from '../core/lazy-expression-evaluator';

// Import commands-v2 (with parseInput() methods)
// DOM Commands (7)
import { createHideCommand } from '../commands-v2/dom/hide';
import { createShowCommand } from '../commands-v2/dom/show';
import { createAddCommand } from '../commands-v2/dom/add';
import { createRemoveCommand } from '../commands-v2/dom/remove';
import { createToggleCommand } from '../commands-v2/dom/toggle';
import { createPutCommand } from '../commands-v2/dom/put';
import { createMakeCommand } from '../commands-v2/dom/make';

// Async Commands (2)
import { createWaitCommand } from '../commands-v2/async/wait';
import { createFetchCommand } from '../commands-v2/async/fetch';

// Data Commands (3)
import { createSetCommand } from '../commands-v2/data/set';
import { createIncrementCommand } from '../commands-v2/data/increment';
import { createDecrementCommand } from '../commands-v2/data/decrement';

// Utility Commands (1)
import { createLogCommand } from '../commands-v2/utility/log';

// Event Commands (2)
import { createTriggerCommand } from '../commands-v2/events/trigger';
import { createSendCommand } from '../commands-v2/events/send';

// Navigation Commands (1)
import { createGoCommand } from '../commands-v2/navigation/go';

// Control Flow Commands (7)
import { createIfCommand } from '../commands-v2/control-flow/if';
import { createRepeatCommand } from '../commands-v2/control-flow/repeat';
import { createBreakCommand } from '../commands-v2/control-flow/break';
import { createContinueCommand } from '../commands-v2/control-flow/continue';
import { createHaltCommand } from '../commands-v2/control-flow/halt';
import { createReturnCommand } from '../commands-v2/control-flow/return';
import { createExitCommand } from '../commands-v2/control-flow/exit';

// Data Commands - Phase 6-2 (1)
import { createBindCommand } from '../commands-v2/data/bind';

// Execution Commands (1)
import { createCallCommand } from '../commands-v2/execution/call';

// Content Commands (1)
import { createAppendCommand } from '../commands-v2/content/append';

export interface RuntimeExperimentalOptions {
  /**
   * Enable lazy loading of expressions
   */
  lazyLoad?: boolean;

  /**
   * Preload level for expressions (if lazy loading enabled)
   */
  expressionPreload?: 'core' | 'all' | 'common' | 'none';

  /**
   * Custom registry (optional - if not provided, creates default with 5 core commands)
   */
  registry?: EnhancedCommandRegistryV2;

  /**
   * Enable async command execution
   */
  enableAsyncCommands?: boolean;

  /**
   * Command timeout in milliseconds
   */
  commandTimeout?: number;

  /**
   * Enable error reporting
   */
  enableErrorReporting?: boolean;
}

/**
 * RuntimeExperimental - Test runtime for tree-shaking validation
 *
 * This runtime extends RuntimeBase and pre-registers all 26 V2 commands from
 * commands-v2/ for testing purposes (Phase 5 + Phase 6-1 + Phase 6-2).
 *
 * Key differences from Runtime:
 * - Uses RuntimeBase (generic AST traversal)
 * - Uses EnhancedCommandRegistryV2 (generic adapter)
 * - Uses commands-v2 (with parseInput())
 * - Registers 26 V2 commands by default (16 Phase 5 + 5 Phase 6-1 + 5 Phase 6-2)
 * - Much smaller bundle size (estimated ~145KB vs 366KB baseline, 60% reduction)
 */
export class RuntimeExperimental extends RuntimeBase {
  constructor(options: RuntimeExperimentalOptions = {}) {
    // Create or use provided registry
    const registry = options.registry || new EnhancedCommandRegistryV2();

    // If no custom registry provided, register all 26 V2 commands
    if (!options.registry) {
      // DOM Commands (7)
      registry.register(createHideCommand());
      registry.register(createShowCommand());
      registry.register(createAddCommand());
      registry.register(createRemoveCommand());
      registry.register(createToggleCommand());
      registry.register(createPutCommand());
      registry.register(createMakeCommand());

      // Async Commands (2)
      registry.register(createWaitCommand());
      registry.register(createFetchCommand());

      // Data Commands (3)
      registry.register(createSetCommand());
      registry.register(createIncrementCommand());
      registry.register(createDecrementCommand());

      // Utility Commands (1)
      registry.register(createLogCommand());

      // Event Commands (2)
      registry.register(createTriggerCommand());
      registry.register(createSendCommand());

      // Navigation Commands (1)
      registry.register(createGoCommand());

      // Control Flow Commands (7)
      registry.register(createIfCommand());
      registry.register(createRepeatCommand());
      registry.register(createBreakCommand());
      registry.register(createContinueCommand());
      registry.register(createHaltCommand());
      registry.register(createReturnCommand());
      registry.register(createExitCommand());

      // Phase 6-2 Commands (5)
      registry.register(createBindCommand());
      registry.register(createCallCommand());
      registry.register(createAppendCommand());

      console.log('RuntimeExperimental: Registered 26 V2 commands (Phase 5 + Phase 6-1 + Phase 6-2)');
    }

    // Create expression evaluator (lazy or standard)
    const expressionEvaluator = options.lazyLoad
      ? new LazyExpressionEvaluator({ preload: options.expressionPreload || 'core' })
      : new ExpressionEvaluator();

    // Initialize RuntimeBase with registry and evaluator
    // Note: Cast registry to EnhancedCommandRegistry for type compatibility
    // EnhancedCommandRegistryV2 implements the same interface
    const baseOptions: any = {
      registry: registry as unknown as EnhancedCommandRegistry,
      expressionEvaluator,
    };

    if (options.enableAsyncCommands !== undefined) {
      baseOptions.enableAsyncCommands = options.enableAsyncCommands;
    }
    if (options.commandTimeout !== undefined) {
      baseOptions.commandTimeout = options.commandTimeout;
    }
    if (options.enableErrorReporting !== undefined) {
      baseOptions.enableErrorReporting = options.enableErrorReporting;
    }

    super(baseOptions);
  }
}

/**
 * Factory function for creating RuntimeExperimental with default options
 */
export function createRuntimeExperimental(options: RuntimeExperimentalOptions = {}): RuntimeExperimental {
  return new RuntimeExperimental(options);
}

/**
 * Factory function for creating a minimal runtime with custom commands
 *
 * Example usage:
 * ```typescript
 * import { createMinimalRuntime } from './runtime-experimental';
 * import { createHideCommand, createShowCommand } from '../commands-v2';
 *
 * const runtime = createMinimalRuntime([
 *   createHideCommand(),
 *   createShowCommand()
 * ]);
 * ```
 */
export function createMinimalRuntime(
  commands: any[],
  options: Omit<RuntimeExperimentalOptions, 'registry'> = {}
): RuntimeExperimental {
  const registry = new EnhancedCommandRegistryV2();

  for (const command of commands) {
    registry.register(command);
  }

  return new RuntimeExperimental({
    ...options,
    registry,
  });
}
