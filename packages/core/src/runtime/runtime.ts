/**
 * Hyperscript runtime entry point. Extends `RuntimeBase` with the
 * concrete command registry and the default set of 48 commands.
 */

import { RuntimeBase, type RuntimeBaseOptions } from './runtime-base';
import { CommandRegistryV2, type CommandWithParseInput } from './command-adapter';
import { createFullExpressionRegistry } from '../expressions/index';

// Import all 48 V2 commands
// DOM Commands (11) - includes htmx-like swap/morph/process-partials and v0.9.90 `empty`
import { createHideCommand } from '../commands/dom/hide';
import { createShowCommand } from '../commands/dom/show';
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createToggleCommand } from '../commands/dom/toggle';
import { createPutCommand } from '../commands/dom/put';
import { createMakeCommand } from '../commands/dom/make';
import { createEmptyCommand } from '../commands/dom/empty';
import { createOpenCommand } from '../commands/dom/open';
import { createCloseCommand } from '../commands/dom/close';
import { createSelectCommand } from '../commands/dom/select';
import { createResetCommand } from '../commands/dom/reset';
import { createSwapCommand, createMorphCommand } from '../commands/dom/swap';
import { createProcessPartialsCommand } from '../commands/dom/process-partials';

// Async Commands (2)
import { createWaitCommand } from '../commands/async/wait';
import { createFetchCommand } from '../commands/async/fetch';

// Data Commands (5) — + clear (v0.9.90)
import { createSetCommand } from '../commands/data/set';
import { createGetCommand } from '../commands/data/get';
import { createIncrementCommand } from '../commands/data/increment';
import { createDecrementCommand } from '../commands/data/decrement';
import { createClearCommand } from '../commands/data/clear';

// Utility Commands (1)
import { createLogCommand } from '../commands/utility/log';

// Event Commands (2)
import { createTriggerCommand } from '../commands/events/trigger';
import { createSendCommand } from '../commands/events/send';

// Navigation Commands (3) - includes htmx-like push/replace url
import { createGoCommand } from '../commands/navigation/go';
import { createPushUrlCommand } from '../commands/navigation/push-url';
import { createReplaceUrlCommand } from '../commands/navigation/replace-url';
import { createScrollCommand } from '../commands/navigation/scroll-to';

// Control Flow Commands (7)
import { createIfCommand } from '../commands/control-flow/if';
import { createRepeatCommand } from '../commands/control-flow/repeat';
import { createBreakCommand } from '../commands/control-flow/break';
import { createContinueCommand } from '../commands/control-flow/continue';
import { createHaltCommand } from '../commands/control-flow/halt';
import { createReturnCommand } from '../commands/control-flow/return';
import { createExitCommand } from '../commands/control-flow/exit';

// Execution Commands (3) - includes v0.9.90 focus/blur
import { createCallCommand } from '../commands/execution/call';
import { createFocusCommand } from '../commands/execution/focus';
import { createBlurCommand } from '../commands/execution/blur';

// Content Commands (1)
import { createAppendCommand } from '../commands/content/append';

// Animation Commands - Phase 6-3 (3)
import { createTransitionCommand } from '../commands/animation/transition';
import { createMeasureCommand } from '../commands/animation/measure';
import { createSettleCommand } from '../commands/animation/settle';
import { createStartViewTransitionCommand } from '../commands/animation/start-view-transition';

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
import { createBreakpointCommand } from '../commands/utility/breakpoint';
import { createInstallCommand } from '../commands/behaviors/install';

// Final Commands - Phase 6-6 (2)
import { createTakeCommand } from '../commands/animation/take';
import { createRenderCommand } from '../commands/templates/render';

/**
 * Runtime options (backward compatible with V1 interface)
 */
export interface RuntimeOptions {
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

  /**
   * Enable lazy loading of expressions (default: true)
   */
  lazyLoad?: boolean;

  /**
   * Expression preloading strategy
   * - 'core': Load only essential expressions (default, ~40KB)
   * - 'common': Load core + common expressions (~70KB)
   * - 'all': Eager load all expressions (legacy behavior, ~100KB)
   * - 'none': Maximum lazy loading (load on first use)
   */
  expressionPreload?: 'core' | 'common' | 'all' | 'none';

  /**
   * Custom registry (optional - if not provided, creates default with 48 V2 commands)
   */
  registry?: CommandRegistryV2;

  /**
   * Bundle-supplied ExpressionRegistry threaded into evaluator contexts.
   * When set, the runtime dispatches expression evaluation through
   * `parser/runtime.ts:evaluateAST` with this registry on the context.
   * If unset, Runtime constructs a full registry (kitchen-sink) — fine
   * for the full bundle but a tree-shaking leak for subset bundles.
   */
  expressionRegistry?: import('../core/expression-registry').ExpressionRegistry;

  /**
   * Deprecated - V1 option, kept for backward compatibility
   * @deprecated Use lazyLoad instead
   */
  useEnhancedCommands?: boolean;

  /**
   * Deprecated - V1 option, kept for backward compatibility
   * @deprecated All commands are now lazy-loaded by default
   */
  commands?: string[];
}

/**
 * Runtime - Clean V2 Implementation
 *
 * Production-ready runtime that extends RuntimeBase and registers all 48 V2 commands.
 *
 * Key features:
 * - 100% V2 architecture (zero V1 dependencies)
 * - All 48 user-facing commands registered
 * - Tree-shakeable design (224 KB bundle)
 * - Lazy expression loading support
 * - Backward compatible with V1 RuntimeOptions
 */
export class Runtime extends RuntimeBase {
  constructor(options: RuntimeOptions = {}) {
    // Create or use provided registry
    const registry = options.registry || new CommandRegistryV2();

    // If no custom registry provided, register all 48 V2 commands
    if (!options.registry) {
      // DOM Commands (11) - includes htmx-like swap/morph/process-partials and v0.9.90 `empty`
      registry.register(createHideCommand());
      registry.register(createShowCommand());
      registry.register(createAddCommand());
      registry.register(createRemoveCommand());
      registry.register(createToggleCommand());
      registry.register(createPutCommand());
      registry.register(createMakeCommand());
      registry.register(createEmptyCommand());
      registry.register(createOpenCommand());
      registry.register(createCloseCommand());
      registry.register(createSelectCommand());
      registry.register(createResetCommand());
      registry.register(createSwapCommand());
      registry.register(createMorphCommand());
      registry.register(createProcessPartialsCommand());

      // Async Commands (2)
      registry.register(createWaitCommand());
      registry.register(createFetchCommand());

      // Data Commands (5) — + clear (v0.9.90)
      registry.register(createSetCommand());
      registry.register(createGetCommand());
      registry.register(createIncrementCommand());
      registry.register(createDecrementCommand());
      registry.register(createClearCommand());

      // Utility Commands (1)
      registry.register(createLogCommand());

      // Event Commands (2)
      registry.register(createTriggerCommand());
      registry.register(createSendCommand());

      // Navigation Commands (4) - includes htmx-like push/replace url and
      // `scroll to` (upstream _hyperscript 0.9.90 replacement for the
      // deprecated `go to top of X` scroll form)
      registry.register(createGoCommand());
      registry.register(createPushUrlCommand());
      registry.register(createReplaceUrlCommand());
      registry.register(createScrollCommand());

      // Control Flow Commands (7)
      registry.register(createIfCommand());
      registry.register(createRepeatCommand());
      registry.register(createBreakCommand());
      registry.register(createContinueCommand());
      registry.register(createHaltCommand());
      registry.register(createReturnCommand());
      registry.register(createExitCommand());

      // Phase 6-2 Commands (4)
      registry.register(createCallCommand());
      registry.register(createAppendCommand());

      // v0.9.90 focus/blur (Phase 1 of deferred features plan)
      registry.register(createFocusCommand());
      registry.register(createBlurCommand());

      // Phase 6-3 Commands (4)
      registry.register(createTransitionCommand());
      registry.register(createMeasureCommand());
      registry.register(createSettleCommand());
      registry.register(createStartViewTransitionCommand());

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
      registry.register(createBreakpointCommand());
      registry.register(createInstallCommand());

      // Phase 6-6 Commands (2)
      registry.register(createTakeCommand());
      registry.register(createRenderCommand());
    }

    // Initialize RuntimeBase with the bundle-supplied ExpressionRegistry. If
    // none was provided, fall back to a kitchen-sink one (the full bundle
    // takes this path; subset bundles pass their own registry to control
    // which expression categories ship).
    const baseOptions: RuntimeBaseOptions = {
      registry,
      expressionRegistry: options.expressionRegistry ?? createFullExpressionRegistry(),
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

  /**
   * Get the command registry for introspection
   *
   * @returns The command registry instance
   */
  getRegistry(): CommandRegistryV2 {
    return this.registry;
  }
}

/**
 * Factory function for creating Runtime with default options
 */
export function createRuntime(options: RuntimeOptions = {}): Runtime {
  return new Runtime(options);
}

/**
 * Factory function for creating a minimal runtime with custom commands
 *
 * Example usage:
 * ```typescript
 * import { createMinimalRuntime } from './runtime';
 * import { createHideCommand, createShowCommand } from '../commands';
 *
 * const runtime = createMinimalRuntime([
 *   createHideCommand(),
 *   createShowCommand()
 * ]);
 * ```
 */
export function createMinimalRuntime(
  commands: CommandWithParseInput[],
  options: Omit<RuntimeOptions, 'registry'> = {}
): Runtime {
  const registry = new CommandRegistryV2();

  for (const command of commands) {
    registry.register(command);
  }

  return new Runtime({
    ...options,
    registry,
  });
}
