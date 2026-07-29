/**
 * Hyperscript runtime entry point. Extends `RuntimeBase` with the concrete
 * command registry and the full command set.
 *
 * ## The command set is manifest-driven (Arc A step 3)
 *
 * The constructor no longer holds one `registry.register(createXCommand())`
 * line per command. It loops `COMMAND_MANIFEST` and looks each name up in
 * {@link COMMAND_FACTORIES} below, so `commands/manifest.ts` decides WHICH
 * commands the default runtime has and this file only supplies HOW to build
 * each one. Adding a command means adding a manifest row and a factory entry;
 * omitting either is a startup error rather than a silent absence.
 *
 * This file is Finding 9's stated exception to "manifest-checked, not
 * manifest-driven": a factory map defeats tree-shaking (measured, 177 B →
 * 38 KB for a names-only consumer at four commands), but `runtime.ts` already
 * imports every command implementation, so the pinning is already paid here.
 * Slim bundles (`compatibility/browser-bundle-*.ts`) keep their explicit
 * per-bundle imports and must NOT adopt this map.
 */

import { RuntimeBase, type RuntimeBaseOptions } from './runtime-base';
import { CommandRegistryV2 } from './command-adapter';
import { createFullExpressionRegistry } from '../expressions/index';
import { COMMAND_MANIFEST } from '../commands/manifest';

// Every command factory the default runtime can build. Grouped by source
// directory; the authoritative *set* is the manifest, not these groupings.
// DOM Commands - includes htmx-like swap/morph/process-partials and v0.9.90 `empty`
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

// Async Commands
import { createWaitCommand } from '../commands/async/wait';
import { createFetchCommand } from '../commands/async/fetch';

// Data Commands — + clear (v0.9.90)
import { createSetCommand } from '../commands/data/set';
import { createGetCommand } from '../commands/data/get';
import { createIncrementCommand } from '../commands/data/increment';
import { createClearCommand } from '../commands/data/clear';

// Utility Commands
import { createLogCommand } from '../commands/utility/log';

// Event Commands
import { createTriggerCommand } from '../commands/events/trigger';

// Navigation Commands - includes htmx-like push/replace url
import { createGoCommand } from '../commands/navigation/go';
import { createPushUrlCommand } from '../commands/navigation/push-url';
import { createScrollCommand } from '../commands/navigation/scroll-to';

// Control Flow Commands
import { createIfCommand } from '../commands/control-flow/if';
import { createRepeatCommand } from '../commands/control-flow/repeat';
import { createBreakCommand } from '../commands/control-flow/break';
import { createContinueCommand } from '../commands/control-flow/continue';
import { createHaltCommand } from '../commands/control-flow/halt';
import { createReturnCommand } from '../commands/control-flow/return';
import { createExitCommand } from '../commands/control-flow/exit';
import { createThrowCommand } from '../commands/control-flow/throw';

// Execution Commands - includes v0.9.90 focus/blur
import { createCallCommand } from '../commands/execution/call';
import { createFocusCommand } from '../commands/execution/focus';
import { createBlurCommand } from '../commands/execution/blur';
import { createPseudoCommand } from '../commands/execution/pseudo-command';

// Content Commands
import { createAppendCommand } from '../commands/content/append';
import { createPrependCommand } from '../commands/content/prepend';

// Animation Commands
import { createTransitionCommand } from '../commands/animation/transition';
import { createMeasureCommand } from '../commands/animation/measure';
import { createSettleCommand } from '../commands/animation/settle';
import { createStartViewTransitionCommand } from '../commands/animation/start-view-transition';
import { createTakeCommand } from '../commands/animation/take';

// Advanced Commands
import { createJsCommand } from '../commands/advanced/js';
import { createAsyncCommand } from '../commands/advanced/async';

// Data Commands
import { createDefaultCommand } from '../commands/data/default';

// Utility & Specialized
import { createTellCommand } from '../commands/utility/tell';
import { createCopyCommand } from '../commands/utility/copy';
import { createPickCommand } from '../commands/utility/pick';
import { createBeepCommand } from '../commands/utility/beep';
import { createBreakpointCommand } from '../commands/utility/breakpoint';
import { createInstallCommand } from '../commands/behaviors/install';

// Template Commands
import { createRenderCommand } from '../commands/templates/render';

/**
 * How to build each command the manifest names — the "HOW" half of the split
 * described in the file header, where `commands/manifest.ts` owns the "WHICH".
 *
 * ## Keyed by REGISTERED name, and 55 keys for 59 commands
 *
 * Four manifest rows carry `consolidationAliasOf` and have no key here:
 * `decrement`, `replace`, `send`, and `unless` are alternate names for
 * `increment`, `push`, `trigger`, and `if`, backed by ONE implementation class
 * each and registered from that implementation's `metadata.aliases` by
 * `command-adapter.ts`. They are real, dispatchable command names — not
 * cosmetic synonyms — so the alias mechanism is load-bearing: break it and
 * four commands disappear.
 *
 * The pre-step-3 block did call `createDecrementCommand()` and its three
 * siblings, but those calls were redundant rather than load-bearing:
 * `createDecrementCommand` is `createFactory(NumericModifyCommand)`, the same
 * class `createIncrementCommand` builds, whose `name` is `'increment'` — so
 * the call re-registered `increment` (and re-added the `decrement` alias) over
 * the entry the previous line had just made. Dropping them changes which
 * instance backs the pair, not which names exist or how they behave.
 *
 * NOTE this map is the reason a `factory` field must never appear in the
 * manifest itself (Finding 9). It lives here because `runtime.ts` is the one
 * module that legitimately references every command implementation.
 */
const COMMAND_FACTORIES: Readonly<Record<string, () => unknown>> = {
  // DOM
  hide: createHideCommand,
  show: createShowCommand,
  add: createAddCommand,
  remove: createRemoveCommand,
  toggle: createToggleCommand,
  put: createPutCommand,
  make: createMakeCommand,
  empty: createEmptyCommand,
  open: createOpenCommand,
  close: createCloseCommand,
  select: createSelectCommand,
  reset: createResetCommand,
  swap: createSwapCommand,
  morph: createMorphCommand,
  process: createProcessPartialsCommand,

  // Async
  wait: createWaitCommand,
  fetch: createFetchCommand,

  // Data
  set: createSetCommand,
  get: createGetCommand,
  increment: createIncrementCommand, // + the `decrement` alias
  clear: createClearCommand,
  default: createDefaultCommand,

  // Events
  trigger: createTriggerCommand, // + the `send` alias

  // Navigation — includes htmx-like push/replace url and `scroll to`
  // (upstream _hyperscript 0.9.90's replacement for `go to top of X`)
  go: createGoCommand,
  push: createPushUrlCommand, // + the `replace` alias
  scroll: createScrollCommand,

  // Control flow
  if: createIfCommand, // + the `unless` alias
  repeat: createRepeatCommand,
  break: createBreakCommand,
  continue: createContinueCommand,
  halt: createHaltCommand,
  return: createReturnCommand,
  exit: createExitCommand,
  throw: createThrowCommand,

  // Execution
  call: createCallCommand,
  focus: createFocusCommand,
  blur: createBlurCommand,
  'pseudo-command': createPseudoCommand,

  // Content
  append: createAppendCommand,
  prepend: createPrependCommand,

  // Animation
  transition: createTransitionCommand,
  measure: createMeasureCommand,
  settle: createSettleCommand,
  start: createStartViewTransitionCommand,
  take: createTakeCommand,

  // Advanced
  js: createJsCommand,
  async: createAsyncCommand,

  // Utility
  log: createLogCommand,
  tell: createTellCommand,
  copy: createCopyCommand,
  pick: createPickCommand,
  beep: createBeepCommand,
  breakpoint: createBreakpointCommand,

  // Behaviors & templates
  install: createInstallCommand,
  render: createRenderCommand,
};

/**
 * Register the manifest's command set into `registry`.
 *
 * Rows with `consolidationAliasOf` are skipped: their name is registered by
 * their primary's `metadata.aliases`, so registering them here would only
 * rebuild the same implementation under the same primary name. A manifest row
 * with neither an alias target nor a factory is a wiring error, and throwing
 * makes it a loud one at construction rather than an "unknown command" at the
 * first parse that needs it.
 */
function registerManifestCommands(registry: CommandRegistryV2): void {
  for (const entry of COMMAND_MANIFEST) {
    if (entry.consolidationAliasOf) continue;
    const factory = COMMAND_FACTORIES[entry.name];
    if (!factory) {
      throw new Error(
        `Command manifest names '${entry.name}' but runtime.ts has no factory for it. ` +
          `Add it to COMMAND_FACTORIES, or give the manifest row a consolidationAliasOf.`
      );
    }
    registry.register(factory());
  }
}

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
   * Custom registry (optional). If not provided, one is created and populated
   * with every command `commands/manifest.ts` names. Supplying a registry
   * bypasses the manifest entirely — the caller owns the command set.
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
 * Production-ready runtime that extends RuntimeBase and registers every command
 * `commands/manifest.ts` names. The count is deliberately not repeated here —
 * it was stated as "48" in six places in this file while the real figure was
 * 59, which is the drift Arc A exists to end. Ask the manifest.
 *
 * Key features:
 * - 100% V2 architecture (zero V1 dependencies)
 * - Manifest-driven command set (see the file header)
 * - Lazy expression loading support
 * - Backward compatible with V1 RuntimeOptions
 */
export class Runtime extends RuntimeBase {
  constructor(options: RuntimeOptions = {}) {
    // Create or use provided registry
    const registry = options.registry || new CommandRegistryV2();

    // If no custom registry provided, register the manifest's command set
    if (!options.registry) {
      registerManifestCommands(registry);
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
