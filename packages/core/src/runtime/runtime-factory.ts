/**
 * Runtime Factory - Zero module-level imports for tree-shaking
 *
 * This factory creates RuntimeBase instances WITHOUT importing any commands
 * or expressions at the module level, enabling true tree-shaking.
 *
 * ## Basic Usage (with separate parsing)
 *
 * ```typescript
 * import { createTreeShakeableRuntime } from '@hyperfixi/core/runtime';
 * import { createCoreExpressionEvaluator } from '@hyperfixi/core/expressions';
 * import { toggle, add } from '@hyperfixi/core/commands';
 *
 * const runtime = createTreeShakeableRuntime(
 *   [toggle(), add()],
 *   { expressionEvaluator: createCoreExpressionEvaluator() }
 * );
 * ```
 *
 * ## With Parser (unified API)
 *
 * ```typescript
 * import { createRuntime } from '@hyperfixi/core/runtime';
 * import { toggle, add } from '@hyperfixi/core/commands';
 * import { references, logical } from '@hyperfixi/core/expressions';
 * import { hybridParser } from '@hyperfixi/core/parser/hybrid';
 *
 * const hyperfixi = createRuntime({
 *   commands: [toggle, add],
 *   expressions: [references, logical],
 *   parser: hybridParser,
 * });
 *
 * // Parse and execute in one call
 * await hyperfixi.run('toggle .active', element);
 * ```
 */

import { RuntimeBase, type RuntimeBaseOptions } from './runtime-base';
import { CommandRegistryV2 } from './command-adapter';
import { ConfigurableExpressionEvaluator } from '../core/configurable-expression-evaluator';
import type { BaseExpressionEvaluator } from '../core/base-expression-evaluator';
import type { ParserInterface } from '../parser/parser-interface';
import type { ExecutionContext } from '../types/core';

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
 * Unified runtime options for createRuntime().
 *
 * This is the recommended API for tree-shakeable bundles.
 */
export interface RuntimeOptions {
  /**
   * Commands to register. Use factory functions from @hyperfixi/core/commands.
   *
   * @example
   * ```typescript
   * import { toggle, add, remove } from '@hyperfixi/core/commands';
   * commands: [toggle, add, remove]
   * ```
   */
  commands: Array<() => any>;

  /**
   * Expression categories to include. Use exports from @hyperfixi/core/expressions.
   *
   * @example
   * ```typescript
   * import { references, logical, positional } from '@hyperfixi/core/expressions';
   * expressions: [references, logical, positional]
   * ```
   */
  expressions?: Record<string, any>[];

  /**
   * Parser to use for parsing hyperscript code.
   * If not provided, you must pass pre-parsed AST to execute().
   *
   * @example
   * ```typescript
   * import { hybridParser } from '@hyperfixi/core/parser/hybrid';
   * parser: hybridParser
   * ```
   */
  parser?: ParserInterface;

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
}

/**
 * Unified runtime API returned by createRuntime().
 */
export interface HyperFixiRuntime {
  /**
   * The underlying RuntimeBase instance.
   */
  runtime: RuntimeBase;

  /**
   * The parser instance (if provided).
   */
  parser?: ParserInterface;

  /**
   * Parse and execute hyperscript code.
   * Requires a parser to be provided in options.
   *
   * @param code Hyperscript code to parse and execute
   * @param element Optional element context (used as 'me')
   * @returns Promise resolving to execution result
   */
  run(code: string, element?: Element): Promise<unknown>;

  /**
   * Execute a pre-parsed AST node.
   *
   * @param ast Parsed AST node
   * @param context Execution context
   * @returns Promise resolving to execution result
   */
  execute(ast: any, context: ExecutionContext): Promise<unknown>;

  /**
   * Parse hyperscript code without executing.
   * Requires a parser to be provided in options.
   *
   * @param code Hyperscript code to parse
   * @returns Parsed AST node
   */
  parse(code: string): any;
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
  // Pass the shared expression evaluator to the registry for tree-shaking optimization
  // This avoids each CommandAdapterV2 creating its own ExpressionEvaluator instance
  const registry = new CommandRegistryV2(options.expressionEvaluator as any);

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

/**
 * Create a tree-shakeable runtime with the unified API.
 *
 * This is the recommended entry point for tree-shakeable bundles.
 * It accepts commands as factory functions (not instances), expressions
 * as category objects, and an optional parser.
 *
 * @param options Runtime configuration
 * @returns HyperFixiRuntime instance with run(), execute(), and parse() methods
 *
 * @example
 * ```typescript
 * import { createRuntime } from '@hyperfixi/core/runtime';
 * import { toggle, add, remove } from '@hyperfixi/core/commands';
 * import { references, logical } from '@hyperfixi/core/expressions';
 * import { hybridParser } from '@hyperfixi/core/parser/hybrid';
 *
 * const hyperfixi = createRuntime({
 *   commands: [toggle, add, remove],
 *   expressions: [references, logical],
 *   parser: hybridParser,
 * });
 *
 * // Parse and execute
 * await hyperfixi.run('toggle .active', document.querySelector('button'));
 *
 * // Or use pre-parsed AST
 * const ast = hyperfixi.parse('add .highlight to #target');
 * await hyperfixi.execute(ast, { me: element });
 * ```
 */
export function createRuntime(options: RuntimeOptions): HyperFixiRuntime {
  // Create expression evaluator from provided categories
  const expressionEvaluator = options.expressions
    ? new ConfigurableExpressionEvaluator(options.expressions)
    : new ConfigurableExpressionEvaluator([]);

  // Create command registry with shared evaluator
  const registry = new CommandRegistryV2(expressionEvaluator as any);

  // Register commands (invoke factory functions)
  for (const commandFactory of options.commands) {
    const command = commandFactory();
    registry.register(command);
  }

  // Create runtime base
  const runtimeOptions: RuntimeBaseOptions = {
    registry,
    expressionEvaluator,
    enableAsyncCommands: options.enableAsyncCommands ?? true,
    commandTimeout: options.commandTimeout ?? 10000,
    enableErrorReporting: options.enableErrorReporting ?? true,
    enableResultPattern: true,
  };

  const runtime = new RuntimeBase(runtimeOptions);

  // Return unified API
  return {
    runtime,
    parser: options.parser,

    async run(code: string, element?: Element): Promise<unknown> {
      if (!options.parser) {
        throw new Error(
          'No parser provided. Either provide a parser in createRuntime() options, ' +
            'or use execute() with pre-parsed AST.'
        );
      }

      const ast = options.parser.parse(code);
      const context: ExecutionContext = {
        me: element || null,
        it: null,
        you: null,
        result: null,
        variables: new Map(),
        locals: new Map(),
        globals: new Map(),
        meta: {},
      };

      return runtime.execute(ast, context);
    },

    async execute(ast: any, context: ExecutionContext): Promise<unknown> {
      return runtime.execute(ast, context);
    },

    parse(code: string): any {
      if (!options.parser) {
        throw new Error('No parser provided. Provide a parser in createRuntime() options.');
      }
      return options.parser.parse(code);
    },
  };
}

// Re-export types for convenience (RuntimeOptions and HyperFixiRuntime already exported above)
export type { BaseExpressionEvaluator, ParserInterface };
