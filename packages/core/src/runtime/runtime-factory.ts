/**
 * Runtime Factory - Zero module-level imports for tree-shaking
 *
 * This factory creates RuntimeBase instances WITHOUT importing any commands
 * or expressions at the module level, enabling true tree-shaking.
 *
 * Usage:
 * ```typescript
 * import { createTreeShakeableRuntime } from './runtime/runtime-factory';
 * import { createCoreExpressionEvaluator } from './expressions/bundles/core-expressions';
 * import { createAddCommand } from './commands/dom/add';
 *
 * const runtime = createTreeShakeableRuntime(
 *   [createAddCommand()],
 *   { expressionEvaluator: createCoreExpressionEvaluator() }
 * );
 * ```
 */

import { RuntimeBase, type RuntimeBaseOptions } from './runtime-base';
import { CommandRegistryV2 } from './command-adapter';
import type { BaseExpressionEvaluator } from '../core/base-expression-evaluator';

export interface TreeShakeableRuntimeOptions {
  /**
   * Expression evaluator instance (required).
   * Use createCoreExpressionEvaluator() for minimal bundles.
   * Use createCommonExpressionEvaluator() for standard bundles.
   * Use new ExpressionEvaluator() for full bundles.
   */
  expressionEvaluator: BaseExpressionEvaluator;

  /**
   * Enable async command execution.
   * @default true
   */
  enableAsyncCommands?: boolean;

  /**
   * Command timeout in milliseconds.
   * @default 10000
   */
  commandTimeout?: number;

  /**
   * Enable error reporting.
   * @default true
   */
  enableErrorReporting?: boolean;

  /**
   * Enable Result-based execution pattern.
   * @default true
   */
  enableResultPattern?: boolean;
}

/**
 * Create a tree-shakeable runtime with explicit command and expression imports.
 *
 * This factory does NOT import any commands or expressions at the module level,
 * ensuring that only the commands you explicitly pass are included in the bundle.
 *
 * @param commands Array of command instances to register
 * @param options Runtime configuration including required expression evaluator
 * @returns RuntimeBase instance ready for execution
 *
 * @example
 * ```typescript
 * import { createTreeShakeableRuntime } from './runtime/runtime-factory';
 * import { createCoreExpressionEvaluator } from './expressions/bundles/core-expressions';
 * import { createAddCommand } from './commands/dom/add';
 * import { createRemoveCommand } from './commands/dom/remove';
 *
 * const runtime = createTreeShakeableRuntime(
 *   [createAddCommand(), createRemoveCommand()],
 *   { expressionEvaluator: createCoreExpressionEvaluator() }
 * );
 *
 * // Execute hyperscript
 * await runtime.execute(ast, context);
 * ```
 */
export function createTreeShakeableRuntime(
  commands: any[],
  options: TreeShakeableRuntimeOptions
): RuntimeBase {
  const registry = new CommandRegistryV2();

  for (const command of commands) {
    registry.register(command);
  }

  const runtimeOptions: RuntimeBaseOptions = {
    registry,
    expressionEvaluator: options.expressionEvaluator,
    enableAsyncCommands: options.enableAsyncCommands ?? true,
    commandTimeout: options.commandTimeout ?? 10000,
    enableErrorReporting: options.enableErrorReporting ?? true,
    enableResultPattern: options.enableResultPattern ?? true,
  };

  return new RuntimeBase(runtimeOptions);
}

// Re-export types for convenience
export type { BaseExpressionEvaluator };
