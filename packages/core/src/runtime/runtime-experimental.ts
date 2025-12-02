/**
 * RuntimeExperimental - Test runtime using RuntimeBase + CommandAdapterV2 + commands
 *
 * This is an experimental runtime for testing the tree-shaking refactoring.
 * It uses:
 * - RuntimeBase (generic, zero command imports)
 * - CommandRegistryV2 (generic adapter)
 * - Commands from commands/ (with parseInput() methods)
 *
 * This runtime is for validation and testing only. DO NOT use in production
 * until Phase 5 validation is complete.
 */

import { RuntimeBase } from './runtime-base';
import { CommandRegistryV2 } from './command-adapter';
import type { CommandRegistry } from './command-adapter';
import { ExpressionEvaluator } from '../core/expression-evaluator';
import { LazyExpressionEvaluator } from '../core/lazy-expression-evaluator';

// Import commands-v2 (with parseInput() methods)
// DOM Commands (7)
import { createHideCommand } from '../commands/dom/hide';
import { createShowCommand } from '../commands/dom/show';
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createMakeCommand } from '../commands/dom/make';

// Async Commands (2)
import { createWaitCommand } from '../commands/async/wait';
import { createFetchCommand } from '../commands/async/fetch';

// Data Commands (3)
import { createSetCommand } from '../commands/data/set';
import { createIncrementCommand } from '../commands/data/increment';
import { createDecrementCommand } from '../commands/data/decrement';

// Utility Commands (1)
import { createLogCommand } from '../commands/utility/log';

// Event Commands (2)
import { createTriggerCommand } from '../commands/events/trigger';
import { createSendCommand } from '../commands/events/send';

// Navigation Commands (1)
import { createGoCommand } from '../commands/navigation/go';

// Control Flow Commands (7)
import { createIfCommand } from '../commands/control-flow/if';
import { createRepeatCommand } from '../commands/control-flow/repeat';
import { createBreakCommand } from '../commands/control-flow/break';
import { createContinueCommand } from '../commands/control-flow/continue';
import { createHaltCommand } from '../commands/control-flow/halt';
import { createReturnCommand } from '../commands/control-flow/return';
import { createExitCommand } from '../commands/control-flow/exit';

// Data Commands - Phase 6-2 (1)
import { createBindCommand } from '../commands/data/bind';

// Execution Commands (1)
import { createCallCommand } from '../commands/execution/call';

// Content Commands (1)
import { createAppendCommand } from '../commands/content/append';

// Animation Commands - Phase 6-3 (3)
import { createTransitionCommand } from '../commands/animation/transition';
import { createMeasureCommand } from '../commands/animation/measure';
import { createSettleCommand } from '../commands/animation/settle';

// Data Persistence - Phase 6-3 (1)
import { createPersistCommand } from '../commands/data/persist';

// Advanced Commands - Phase 6-4 (2)
import { createJsCommand } from '../commands/advanced/js';
import { createAsyncCommand } from '../commands/advanced/async';

// Control Flow - Phase 6-4 (1)
import { createUnlessCommand } from '../commands/control-flow/unless';

// Data Commands - Phase 6-4 (1)
import { createDefaultCommand } from '../commands/data/default';

// Execution Commands - Phase 6-4 (1)
import { createPseudoCommand } from '../commands/execution/pseudo-command';

// Utility & Specialized - Phase 6-5 (6)
import { createTellCommand } from '../commands/utility/tell';
import { createCopyCommand } from '../commands/utility/copy';
import { createPickCommand } from '../commands/utility/pick';
import { createThrowCommand } from '../commands/control-flow/throw';
import { createBeepCommand } from '../commands/utility/beep';
import { createInstallCommand } from '../commands/behaviors/install';

// Final Commands - Phase 6-6 (2)
import { createTakeCommand } from '../commands/animation/take';
import { createRenderCommand } from '../commands/templates/render';

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
  registry?: CommandRegistryV2;

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
 * This runtime extends RuntimeBase and pre-registers all 43 V2 commands from
 * commands/ for testing purposes (Phase 6 COMPLETE - All commands migrated).
 *
 * Key differences from Runtime:
 * - Uses RuntimeBase (generic AST traversal)
 * - Uses CommandRegistryV2 (generic adapter)
 * - Uses standalone commands (with parseInput())
 * - Registers 43 V2 commands by default (16 Phase 5 + 5 Phase 6-1 + 5 Phase 6-2 + 4 Phase 6-3 + 5 Phase 6-4 + 6 Phase 6-5 + 2 Phase 6-6)
 * - Much smaller bundle size (estimated ~218KB vs 368KB baseline, 41% reduction)
 */
export class RuntimeExperimental extends RuntimeBase {
  constructor(options: RuntimeExperimentalOptions = {}) {
    // Create or use provided registry
    const registry = options.registry || new CommandRegistryV2();

    // If no custom registry provided, register all 43 V2 commands
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

      // Phase 6-3 Commands (4)
      registry.register(createTransitionCommand());
      registry.register(createMeasureCommand());
      registry.register(createSettleCommand());
      registry.register(createPersistCommand());

      // Phase 6-4 Commands (5)
      registry.register(createJsCommand());
      registry.register(createAsyncCommand());
      registry.register(createUnlessCommand());
      registry.register(createDefaultCommand());
      registry.register(createPseudoCommand());

      // Phase 6-5 Commands (6)
      registry.register(createTellCommand());
      registry.register(createCopyCommand());
      registry.register(createPickCommand());
      registry.register(createThrowCommand());
      registry.register(createBeepCommand());
      registry.register(createInstallCommand());

      // Phase 6-6 Commands (2) - Final commands completing Phase 6
      registry.register(createTakeCommand());
      registry.register(createRenderCommand());

      console.log('RuntimeExperimental: Registered 43 V2 commands (Phase 6 COMPLETE - All commands migrated)');
    }

    // Create expression evaluator (lazy or standard)
    const expressionEvaluator = options.lazyLoad
      ? new LazyExpressionEvaluator({ preload: options.expressionPreload || 'core' })
      : new ExpressionEvaluator();

    // Initialize RuntimeBase with registry and evaluator
    // Note: Cast registry to CommandRegistry for type compatibility
    // CommandRegistryV2 implements the same interface
    const baseOptions: any = {
      registry: registry as unknown as CommandRegistry,
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
 * import { createHideCommand, createShowCommand } from '../commands';
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
  const registry = new CommandRegistryV2();

  for (const command of commands) {
    registry.register(command);
  }

  return new RuntimeExperimental({
    ...options,
    registry,
  });
}
