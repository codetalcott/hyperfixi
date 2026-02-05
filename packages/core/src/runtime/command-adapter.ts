/**
 * Command Adapter V2 - Generic adapter with parseInput() support
 *
 * This is a simplified adapter that delegates argument parsing to commands
 * via their parseInput() method, enabling tree-shakable RuntimeBase.
 *
 * Key differences from V1:
 * - No command-specific logic (generic for all commands)
 * - Calls command.parseInput() when available
 * - Falls back to generic argument evaluation
 * - Much shorter (~150 lines vs 973 lines)
 */

import type { ExecutionContext, TypedExecutionContext, ValidationResult } from '../types/core';
import type { ASTNode } from '../types/base-types';
import type { HookContext, RuntimeHooks } from '../types/hooks';
import { HookRegistry } from '../types/hooks';
import { ExpressionEvaluator } from '../core/expression-evaluator';
import { debug } from '../utils/debug';

/**
 * Runtime-compatible command interface
 */
export interface RuntimeCommand {
  name: string;
  execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown>;
  validate?(input: unknown): ValidationResult<unknown>;
  metadata?: {
    description: string;
    examples: string[];
    syntax: string;
  };
}

/**
 * Command with optional parseInput() method
 */
export interface CommandWithParseInput {
  name: string;
  parseInput?(
    raw: { args: ASTNode[]; modifiers: Record<string, any>; commandName?: string },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any>;
  execute(input: any, context: TypedExecutionContext): Promise<unknown>;
  validate?(input: unknown): ValidationResult<unknown>;
  metadata?: any;
}

/**
 * Context bridge between ExecutionContext and TypedExecutionContext
 * (Copied from V1 - this part is generic and works well)
 */
export class ContextBridge {
  /**
   * Convert ExecutionContext to TypedExecutionContext
   */
  static toTyped(context: ExecutionContext): TypedExecutionContext {
    return {
      // Core context elements
      me: context.me,
      it: context.it,
      you: context.you,
      result: context.result,
      ...(context.event !== undefined && { event: context.event }),

      // Variable storage
      variables: context.variables || new Map(),
      locals: context.locals || new Map(),
      globals: context.globals || new Map(),

      // Runtime state
      ...(context.events !== undefined && { events: context.events }),
      meta: context.meta || {},

      // Enhanced features for typed commands
      expressionStack: [],
      evaluationDepth: 0,
      validationMode: 'strict',
      evaluationHistory: [],
    };
  }

  /**
   * Update ExecutionContext from TypedExecutionContext
   */
  static fromTyped(
    typedContext: TypedExecutionContext,
    originalContext: ExecutionContext
  ): ExecutionContext {
    return {
      ...originalContext,
      me: typedContext.me,
      it: typedContext.it,
      you: typedContext.you,
      result: typedContext.result,
      ...(typedContext.event !== undefined && { event: typedContext.event }),
      ...(typedContext.variables !== undefined && { variables: typedContext.variables }),
      locals: typedContext.locals,
      globals: typedContext.globals,
      ...(typedContext.events !== undefined && { events: typedContext.events }),
      ...(typedContext.meta !== undefined && { meta: typedContext.meta }),
    };
  }
}

/**
 * Command Adapter V2 - Generic adapter with parseInput() support
 *
 * This adapter is much simpler than V1 because it delegates argument parsing
 * to the commands themselves via parseInput().
 */
export class CommandAdapterV2 implements RuntimeCommand {
  private expressionEvaluator: ExpressionEvaluator;
  private hookRegistry: HookRegistry | null;

  constructor(
    private impl: CommandWithParseInput,
    sharedEvaluator?: ExpressionEvaluator,
    hookRegistry?: HookRegistry
  ) {
    // Use shared evaluator if provided, otherwise create new (backward compat)
    this.expressionEvaluator = sharedEvaluator ?? new ExpressionEvaluator();
    this.hookRegistry = hookRegistry ?? null;
  }

  /**
   * Create a HookContext for the current execution
   */
  private createHookContext(
    context: ExecutionContext,
    args: unknown[],
    modifiers: Record<string, unknown> = {}
  ): HookContext {
    return {
      commandName: this.name,
      element: context.me instanceof Element ? context.me : null,
      args,
      modifiers,
      // Filter out null - context.event can be Event | null | undefined
      event: context.event ?? undefined,
      executionContext: context,
    };
  }

  get name(): string {
    return this.impl.name || this.impl.metadata?.name;
  }

  get metadata() {
    return {
      description: this.impl.metadata?.description || '',
      examples: this.impl.metadata?.examples || [],
      syntax: this.impl.metadata?.syntax || '',
    };
  }

  /**
   * Execute command with generic argument handling
   *
   * This is the key method that enables tree-shaking. Instead of having
   * command-specific logic here (like V1), we delegate to the command's
   * parseInput() method.
   *
   * Hook invocation order:
   * 1. beforeExecute hooks
   * 2. interceptCommand check (if true, skip execution)
   * 3. Command execution
   * 4. afterExecute hooks (on success)
   * 5. onError hooks (on failure)
   */
  async execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    // Extract modifiers for hook context
    const rawInput = args[0] as any;
    const modifiers: Record<string, unknown> =
      rawInput && typeof rawInput === 'object' && 'modifiers' in rawInput
        ? rawInput.modifiers || {}
        : {};

    // Create hook context
    const hookCtx = this.createHookContext(context, args, modifiers);

    try {
      debug.command(`CommandAdapterV2: Executing '${this.name}' with args:`, args);

      // HOOK: beforeExecute
      if (this.hookRegistry) {
        await this.hookRegistry.runBeforeExecute(hookCtx);
      }

      // HOOK: interceptCommand - check if any hook wants to skip execution
      if (this.hookRegistry?.shouldIntercept(this.name, hookCtx)) {
        debug.command(`CommandAdapterV2: '${this.name}' intercepted by hook`);
        return undefined;
      }

      // Store evaluator in locals for commands that need it during execute()
      if (!context.locals) {
        (context as { locals: Map<string, unknown> }).locals = new Map();
      }
      context.locals.set('__evaluator', this.expressionEvaluator);

      // Convert to typed context
      const typedContext = ContextBridge.toTyped(context);

      // Parse input arguments
      let parsedInput: any;

      // Check if command has parseInput() method (V2 commands)
      if (this.impl.parseInput && typeof this.impl.parseInput === 'function') {
        debug.command(`CommandAdapterV2: '${this.name}' has parseInput(), calling it`);

        if (
          rawInput &&
          typeof rawInput === 'object' &&
          ('args' in rawInput || 'modifiers' in rawInput)
        ) {
          // Check when/where conditional modifiers before execution
          // Both 'when' and 'where' are treated as identical conditional guards
          const whenCondition = rawInput.modifiers?.when || rawInput.modifiers?.where;
          if (whenCondition) {
            const conditionResult = await this.expressionEvaluator.evaluate(whenCondition, context);
            if (!conditionResult) {
              debug.command(
                `CommandAdapterV2: '${this.name}' skipped - when/where condition evaluated to false`
              );
              return undefined;
            }
          }

          // Raw AST input - pass to parseInput()
          parsedInput = await this.impl.parseInput(
            {
              args: rawInput.args || [],
              modifiers: rawInput.modifiers || {},
              // Pass command name for consolidated commands (e.g., show/hide → VisibilityCommand)
              commandName: rawInput.commandName,
            },
            this.expressionEvaluator,
            context
          );
        } else {
          // Already parsed - use as-is
          parsedInput = args;
        }
      } else {
        // No parseInput() - command expects already-parsed arguments (V1 pattern)
        debug.command(`CommandAdapterV2: '${this.name}' has no parseInput(), using args as-is`);
        parsedInput = args;
      }

      debug.command(`CommandAdapterV2: Calling execute with parsed input:`, parsedInput);

      // Execute command with parsed input
      // V2 commands expect: execute(input, context) where input is the parsed args
      // V1 commands expect: execute(context, ...args)
      let result;

      if (this.impl.execute.length === 2) {
        // Enhanced signature: execute(input, context)
        result = await this.impl.execute(parsedInput, typedContext);
      } else {
        // Legacy signature: execute(context, ...args)
        result = await (this.impl.execute as any)(typedContext, ...parsedInput);
      }

      debug.command(`CommandAdapterV2: Command result:`, result);

      // Update original context with changes from typed context
      Object.assign(context, ContextBridge.fromTyped(typedContext, context));

      // HOOK: afterExecute
      if (this.hookRegistry) {
        await this.hookRegistry.runAfterExecute(hookCtx, result);
      }

      return result;
    } catch (error) {
      // Don't log control flow signals — they're expected (exit, halt, break, etc.)
      const isControlFlow =
        error instanceof Error &&
        ((error as any).isExit ||
          (error as any).isHalt ||
          (error as any).isBreak ||
          (error as any).isContinue ||
          (error as any).isReturn ||
          error.message === 'EXIT_COMMAND' ||
          error.message === 'HALT_EXECUTION' ||
          error.message === 'EXIT_EXECUTION');
      if (!isControlFlow) {
        debug.command(`CommandAdapterV2: Error executing '${this.name}':`, error);
      }

      // HOOK: onError - allow hooks to transform the error
      if (this.hookRegistry && error instanceof Error) {
        const transformedError = await this.hookRegistry.runOnError(hookCtx, error);
        throw transformedError;
      }

      throw error;
    }
  }

  validate(input: unknown): ValidationResult<unknown> {
    if (this.impl.validate) {
      return this.impl.validate(input);
    }
    return { isValid: true, errors: [], suggestions: [] };
  }
}

/**
 * Enhanced Command Registry V2
 *
 * Registry that uses CommandAdapterV2 for all commands.
 * Much simpler than V1 because it doesn't need command-specific logic.
 *
 * For tree-shaking: Pass a shared ExpressionEvaluator to avoid importing
 * all 6 expression categories for each command.
 */
export class CommandRegistryV2 {
  private adapters = new Map<string, CommandAdapterV2>();
  private implementations = new Map<string, CommandWithParseInput>();
  private sharedEvaluator?: ExpressionEvaluator;
  private hookRegistry?: HookRegistry;

  /**
   * Create a command registry.
   * @param sharedEvaluator Optional shared evaluator for tree-shaking optimization.
   *                        If not provided, each adapter creates its own evaluator.
   * @param hookRegistry Optional hook registry for runtime hooks.
   */
  constructor(sharedEvaluator?: ExpressionEvaluator, hookRegistry?: HookRegistry) {
    this.sharedEvaluator = sharedEvaluator;
    this.hookRegistry = hookRegistry;
  }

  /**
   * Set the hook registry (can be set after construction)
   */
  setHookRegistry(registry: HookRegistry): void {
    this.hookRegistry = registry;
    // Update existing adapters with the new hook registry
    // Note: This requires re-registering adapters, so we just store for new registrations
    debug.runtime(`CommandRegistryV2: Hook registry set`);
  }

  /**
   * Get the hook registry
   */
  getHookRegistry(): HookRegistry | undefined {
    return this.hookRegistry;
  }

  /**
   * Register a command (V1 or V2 format)
   * Uses 'any' to accept all command implementations with compatible structure
   * Also registers any aliases defined in metadata
   */
  register(impl: any): void {
    const name = (impl.name || impl.metadata?.name).toLowerCase();

    debug.runtime(`CommandRegistryV2: Registering command '${name}'`);

    this.implementations.set(name, impl);
    const adapter = new CommandAdapterV2(impl, this.sharedEvaluator, this.hookRegistry);
    this.adapters.set(name, adapter);

    // Register aliases (for consolidated commands)
    const aliases = impl.metadata?.aliases;
    if (aliases && Array.isArray(aliases)) {
      for (const alias of aliases) {
        const aliasLower = alias.toLowerCase();
        this.implementations.set(aliasLower, impl);
        this.adapters.set(aliasLower, adapter);
      }
    }
  }

  /**
   * Get adapter for a command
   */
  getAdapter(name: string): CommandAdapterV2 | undefined {
    return this.adapters.get(name.toLowerCase());
  }

  /**
   * Check if command is registered
   */
  has(name: string): boolean {
    return this.adapters.has(name.toLowerCase());
  }

  /**
   * Get all registered command names
   */
  getCommandNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get command implementation (for advanced use)
   */
  getImplementation(name: string): CommandWithParseInput | undefined {
    return this.implementations.get(name.toLowerCase());
  }

  /**
   * Get all runtime adapters (for compatibility with V1)
   */
  getAdapters(): Map<string, CommandAdapterV2> {
    return new Map(this.adapters);
  }

  /**
   * Validate a command exists and can handle the given input (for compatibility with V1)
   */
  validateCommand(name: string, input: unknown): ValidationResult<unknown> {
    const adapter = this.getAdapter(name);
    if (!adapter) {
      return {
        isValid: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Unknown command: ${name}`,
            suggestions: [`Available commands: ${this.getCommandNames().join(', ')}`],
          },
        ],
        suggestions: [`Available commands: ${this.getCommandNames().join(', ')}`],
      };
    }

    return adapter.validate(input);
  }
}

/**
 * Factory function for creating a pre-populated registry
 * (For backward compatibility with V1)
 *
 * @param commands Array of command implementations to register
 * @param sharedEvaluator Optional shared evaluator for tree-shaking optimization
 * @param hookRegistry Optional hook registry for runtime hooks
 */
export function createCommandRegistryV2(
  commands: CommandWithParseInput[],
  sharedEvaluator?: ExpressionEvaluator,
  hookRegistry?: HookRegistry
): CommandRegistryV2 {
  const registry = new CommandRegistryV2(sharedEvaluator, hookRegistry);

  for (const command of commands) {
    registry.register(command);
  }

  return registry;
}
