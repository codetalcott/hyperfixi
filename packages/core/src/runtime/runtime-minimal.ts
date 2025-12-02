/**
 * Minimal Runtime - Tree-Shakable Configuration
 *
 * Uses only standalone V2 commands (hide, show, log) with zero V1 dependencies.
 * Demonstrates true tree-shaking effectiveness.
 *
 * Bundle Size Target: < 100 KB minified
 * Expected Reduction: 60% vs full Runtime (230 KB → ~90 KB)
 *
 * @example
 * import { createMinimalRuntime } from './runtime/runtime-minimal';
 *
 * const runtime = createMinimalRuntime();
 * await runtime.execute(ast, context);
 */

import { RuntimeBase, type RuntimeBaseOptions } from './runtime-base';
import { CommandRegistry } from './command-adapter';
import { ExpressionEvaluator } from '../core/expression-evaluator';

// Import standalone V2 commands (zero V1 dependencies)
import { HideCommand } from '../commands/dom/hide-standalone';
import { ShowCommand } from '../commands/dom/show-standalone';
import { LogCommand } from '../commands/utility/log-standalone';

/**
 * Create a minimal runtime with only hide, show, and log commands
 *
 * This runtime is optimized for tree-shaking and includes zero V1 dependencies.
 * Perfect for minimal applications that only need basic DOM visibility and logging.
 *
 * @returns RuntimeBase instance with minimal command set
 */
export function createMinimalRuntime(): RuntimeBase {
  // Create empty registry
  const registry = new CommandRegistry();

  // Register standalone V2 commands
  registry.register(new HideCommand());
  registry.register(new ShowCommand());
  registry.register(new LogCommand());

  // Create runtime with minimal configuration
  const options: RuntimeBaseOptions = {
    registry,
    expressionEvaluator: new ExpressionEvaluator(),
    enableAsyncCommands: true,
    commandTimeout: 10000,
    enableErrorReporting: true,
  };

  return new RuntimeBase(options);
}

/**
 * Export individual components for advanced usage
 */
export { RuntimeBase, CommandRegistry, ExpressionEvaluator };
export { HideCommand, ShowCommand, LogCommand };

/**
 * Default export for convenience
 */
export default createMinimalRuntime;
