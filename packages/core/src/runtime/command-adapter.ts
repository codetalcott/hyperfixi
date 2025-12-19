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
    raw: { args: ASTNode[]; modifiers: Record<string, any> },
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

  constructor(private impl: CommandWithParseInput) {
    this.expressionEvaluator = new ExpressionEvaluator();
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
   */
  async execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    try {
      debug.command(`CommandAdapterV2: Executing '${this.name}' with args:`, args);

      // Store evaluator in locals for commands that need it during execute()
      if (!context.locals) {
        context.locals = new Map();
      }
      context.locals.set('__evaluator', this.expressionEvaluator);

      // Convert to typed context
      const typedContext = ContextBridge.toTyped(context);

      // Parse input arguments
      let parsedInput: any;

      // Check if command has parseInput() method (V2 commands)
      if (this.impl.parseInput && typeof this.impl.parseInput === 'function') {
        debug.command(`CommandAdapterV2: '${this.name}' has parseInput(), calling it`);

        // Command has parseInput() - use it to parse raw AST input
        // The first arg should be the raw input object with { args, modifiers }
        const rawInput = args[0] as any;

        if (rawInput && typeof rawInput === 'object' && ('args' in rawInput || 'modifiers' in rawInput)) {
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

      return result;
    } catch (error) {
      debug.command(`CommandAdapterV2: Error executing '${this.name}':`, error);
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
 */
export class CommandRegistryV2 {
  private adapters = new Map<string, CommandAdapterV2>();
  private implementations = new Map<string, CommandWithParseInput>();

  /**
   * Register a command (V1 or V2 format)
   * Uses 'any' to accept all command implementations with compatible structure
   * Also registers any aliases defined in metadata
   */
  register(impl: any): void {
    const name = (impl.name || impl.metadata?.name).toLowerCase();

    debug.runtime(`CommandRegistryV2: Registering command '${name}'`);

    this.implementations.set(name, impl);
    const adapter = new CommandAdapterV2(impl);
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
 */
export function createCommandRegistryV2(commands: CommandWithParseInput[]): CommandRegistryV2 {
  const registry = new CommandRegistryV2();

  for (const command of commands) {
    registry.register(command);
  }

  return registry;
}
