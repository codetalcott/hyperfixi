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
import { evaluateAST } from '../parser/runtime';
import type { ExpressionEvaluator } from '../core/expression-evaluator';
import { debug } from '../utils/debug';
import { isControlFlowError } from './runtime-base';
import { COMMANDS } from '../parser/parser-constants';

/**
 * Adapter that wraps the canonical `evaluateAST` in the `ExpressionEvaluator`
 * shape expected by command `parseInput()` implementations. The context's
 * registry (threaded via `context.registry`) drives named-expression dispatch.
 */
const canonicalEvaluator: ExpressionEvaluator = {
  evaluate(node: ASTNode, context: ExecutionContext): Promise<unknown> {
    return evaluateAST(node, context);
  },
};

/**
 * Runtime-compatible command interface
 */
export interface RuntimeCommand {
  name: string;
  execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown>;
  /**
   * The ADAPTER's outward contract — `CommandAdapterV2 implements RuntimeCommand`
   * — so this legitimately stays a `ValidationResult`: it is what
   * `CommandRegistryV2.validateCommand()` reports to a caller. Do NOT confuse it
   * with {@link CommandWithParseInput.validate}, which is the boolean type guard
   * a COMMAND writes and which the adapter lifts into this shape. The two look
   * like twins and are opposites: one is the report, the other the predicate.
   */
  validate?(input: unknown): ValidationResult<unknown>;
  metadata?: {
    description: string;
    // Readonly for the same reason as CommandMetadata's below: the adapter's
    // getter forwards the command's own `commandMeta<const T>` tuple through.
    examples: readonly string[];
    // Already normalized by the getter — a `string[]` syntax is joined with ' | '.
    syntax: string;
  };
}

/**
 * Optional metadata shape attached to V2 command implementations.
 * Commands may extend it freely; the registry only reads `aliases` and
 * (via the parser) `name`.
 */
export interface CommandMetadata {
  description?: string;
  // READONLY arrays, because `commandMeta<const T>` (commands/decorators) infers
  // readonly tuples by design — the `const` type parameter is what gives it
  // excess-property and enum checking. Declaring these mutable made every real
  // command unassignable to this interface, which is the reason `register` could
  // only ever have been typed `any`. The registry never mutates them; it reads
  // `aliases` and nothing else.
  examples?: readonly string[];
  syntax?: string | readonly string[];
  aliases?: readonly string[];
  [extra: string]: unknown;
}

/**
 * Raw input shape passed from the runtime to a command's `parseInput`.
 * `modifiers` is heterogeneous because each modifier carries command-
 * specific payload (AST node, string, boolean, etc.).
 */
export interface CommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, unknown>;
  commandName?: string;
}

/**
 * Command with optional parseInput() method.
 *
 * `parseInput` returns the command-specific input shape; `execute`
 * receives that shape. Both are typed as `unknown` here — concrete
 * commands narrow them inside their own bodies. The registry doesn't
 * need to know the shape, only that it round-trips through one command.
 */
export interface CommandWithParseInput {
  name: string;
  parseInput?(
    raw: CommandRawInput,
    evaluator: { evaluate(node: ASTNode, context: ExecutionContext): Promise<unknown> },
    context: ExecutionContext
  ): Promise<unknown>;
  /**
   * The return is `unknown`, not `Promise<unknown>`, because the adapter AWAITS
   * it (`result = await this.impl.execute(...)`) and several commands are
   * legitimately synchronous — `GetCommand.execute` returns `GetCommandOutput`
   * and `RemoveCommand.execute` returns `void`, with `get.test.ts` asserting
   * that synchronous return directly across eight rows. Declaring
   * `Promise<unknown>` described neither the callee nor the caller; it merely
   * went unchecked while `register` took `any`. The PARAMETER list is where this
   * interface earns its keep — that is what catches a drifted signature.
   */
  execute(input: unknown, context: TypedExecutionContext): unknown;
  /**
   * Narrowing TYPE GUARD over this command's own input shape — every one of the
   * 17 implementations is written `validate(input: unknown): input is XInput`,
   * and 185 assertions across 21 test files pin the boolean result.
   *
   * This was declared as `ValidationResult<unknown>` until 2026-08-01, which no
   * command has ever returned. `CommandAdapterV2.validate()` passed the raw
   * boolean straight through under that type; the lie went unnoticed only
   * because its sole consumer, `CommandRegistryV2.validateCommand()`, is called
   * by nobody. The struct shape is still what the registry method REPORTS — the
   * adapter wraps at that boundary — but it was never the command contract.
   */
  validate?(input: unknown): boolean;
  metadata?: CommandMetadata;
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
      // Owner of `:name` element scope. Must be propagated (not derived from
      // `me`) so element-scoped vars stay with the handler's element even when
      // `me` is retargeted — e.g. inside a `tell` block, where `me` becomes the
      // told element but `:name` must remain bound to the owner.
      ...(context.owner !== undefined && { owner: context.owner }),
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

      // Bundle-supplied ExpressionRegistry. Commands like `call` invoke
      // `evaluateAST(node, context)` directly inside their `execute()`, which
      // requires `context.registry` for named-expression dispatch
      // (elementWithSelector, addition, etc.). Propagate it through so the
      // typed context isn't a registry-less downgrade of the original.
      ...(context.registry !== undefined && { registry: context.registry }),

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
  private hookRegistry: HookRegistry | null;

  constructor(
    private impl: CommandWithParseInput,
    /**
     * Unused since the Phase 4 evaluator consolidation; retained as a
     * positional parameter to keep callers binary-compatible. All evaluator
     * dispatch now goes through the canonical `evaluateAST` against the
     * context's ExpressionRegistry.
     */
    _legacySharedEvaluator?: unknown,
    hookRegistry?: HookRegistry
  ) {
    this.hookRegistry = hookRegistry ?? null;
  }

  /** Update the hook registry (called when registry is set after adapter creation) */
  setHookRegistry(registry: HookRegistry): void {
    this.hookRegistry = registry;
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
    const fromImpl = this.impl.name;
    if (fromImpl) return fromImpl;
    const fromMeta = this.impl.metadata?.name;
    return typeof fromMeta === 'string' ? fromMeta : '';
  }

  get metadata() {
    const syntax = this.impl.metadata?.syntax;
    return {
      description: this.impl.metadata?.description || '',
      examples: this.impl.metadata?.examples || [],
      // `typeof`, not `Array.isArray`: the latter narrows to `any[]` and leaves
      // `readonly string[]` in the else branch, so the getter's own return type
      // stopped matching `RuntimeCommand.metadata.syntax: string`.
      syntax: typeof syntax === 'string' ? syntax : syntax ? syntax.join(' | ') : '',
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
    const rawInput = args[0] as Record<string, unknown> | undefined;
    const modifiers: Record<string, unknown> =
      rawInput && typeof rawInput === 'object' && 'modifiers' in rawInput
        ? (rawInput.modifiers as Record<string, unknown>) || {}
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

      // Convert to typed context
      const typedContext = ContextBridge.toTyped(context);

      // Parse input arguments. The shape is command-specific; the adapter
      // treats it opaquely and the command's own execute() narrows it.
      let parsedInput: unknown;

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
          const mods = rawInput.modifiers as Record<string, unknown> | undefined;
          const whenCondition = (mods?.when || mods?.where) as ASTNode | undefined;
          if (whenCondition) {
            const conditionResult = await evaluateAST(whenCondition, context);
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
              args: (rawInput.args as ASTNode[]) || [],
              modifiers: mods || {},
              // Pass command name for consolidated commands (e.g., show/hide → VisibilityCommand)
              commandName: rawInput.commandName as string | undefined,
            },
            canonicalEvaluator,
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
        // Legacy signature: execute(context, ...args). The legacy path
        // expects parsedInput to be an array of positional args; commands
        // following this signature populate it accordingly.
        const legacyArgs = Array.isArray(parsedInput) ? parsedInput : [parsedInput];
        result = await (
          this.impl.execute as (ctx: TypedExecutionContext, ...rest: unknown[]) => Promise<unknown>
        )(typedContext, ...legacyArgs);
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
      if (!isControlFlowError(error)) {
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

  /**
   * Lift a command's boolean type guard into the `ValidationResult` shape the
   * registry reports. The wrap happens HERE, at the boundary, rather than in 17
   * command bodies — the guard is what commands are written to return and what
   * their tests assert. Before 2026-08-01 this passed the raw boolean straight
   * through while promising a struct.
   */
  validate(input: unknown): ValidationResult<unknown> {
    const isValid = this.impl.validate ? this.impl.validate(input) : true;
    return { isValid, errors: [], suggestions: [] };
  }
}

/**
 * Enhanced Command Registry V2
 *
 * Registry that uses CommandAdapterV2 for all commands.
 * Much simpler than V1 because it doesn't need command-specific logic.
 *
 * Expression evaluation goes through the canonical `evaluateAST` against the
 * bundle's ExpressionRegistry (threaded via `context.registry`).
 */
export class CommandRegistryV2 {
  private adapters = new Map<string, CommandAdapterV2>();
  private implementations = new Map<string, CommandWithParseInput>();
  private hookRegistry?: HookRegistry;

  /**
   * Create a command registry.
   * @param _legacySharedEvaluator Unused since Phase 4 of the evaluator
   *   consolidation arc. Retained as a positional parameter so external
   *   callers don't have to update yet.
   * @param hookRegistry Optional hook registry for runtime hooks.
   */
  constructor(_legacySharedEvaluator?: unknown, hookRegistry?: HookRegistry) {
    this.hookRegistry = hookRegistry;
  }

  /**
   * Set the hook registry (can be set after construction)
   */
  setHookRegistry(registry: HookRegistry): void {
    this.hookRegistry = registry;
    // Propagate to all existing adapters so hooks work on already-registered commands
    for (const adapter of this.adapters.values()) {
      adapter.setHookRegistry(registry);
    }
    debug.runtime(
      `CommandRegistryV2: Hook registry set and propagated to ${this.adapters.size} adapters`
    );
  }

  /**
   * Get the hook registry
   */
  getHookRegistry(): HookRegistry | undefined {
    return this.hookRegistry;
  }

  /**
   * Register a command, and any aliases its metadata declares.
   *
   * Typed to the interface the registry actually stores. It took `any` until
   * 2026-08-01, which meant all 55 manifest-driven registrations were unchecked
   * end to end — a drifted `execute` signature compiled silently, and the
   * `Map<string, CommandWithParseInput>` below asserted a shape nothing had
   * verified. Typing it required fixing what the interface said, not what the
   * commands do: readonly metadata tuples and a non-Promise `execute` return.
   *
   * The `metadata.name` fallback is kept because the error message promises it,
   * but no in-tree command relies on it: `metadata` is index-signature typed, so
   * that branch yields `unknown` and the runtime string check is what narrows.
   */
  register(impl: CommandWithParseInput): void {
    const rawName: unknown = impl.name || impl.metadata?.name;
    if (!rawName || typeof rawName !== 'string') {
      throw new Error(
        `Cannot register command: no name found. ` +
          `Provide a 'name' property or 'metadata.name' on the implementation.`
      );
    }
    const name = rawName.toLowerCase();

    debug.runtime(`CommandRegistryV2: Registering command '${name}'`);

    this.implementations.set(name, impl);
    const adapter = new CommandAdapterV2(impl, undefined, this.hookRegistry);
    this.adapters.set(name, adapter);

    // Also register with the parser so it recognizes the command keyword
    COMMANDS.add(name);

    // Register aliases (for consolidated commands)
    const aliases = impl.metadata?.aliases;
    if (aliases && Array.isArray(aliases)) {
      for (const alias of aliases) {
        const aliasLower = alias.toLowerCase();
        this.implementations.set(aliasLower, impl);
        this.adapters.set(aliasLower, adapter);
        COMMANDS.add(aliasLower);
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
  _legacySharedEvaluator?: unknown,
  hookRegistry?: HookRegistry
): CommandRegistryV2 {
  const registry = new CommandRegistryV2(undefined, hookRegistry);

  for (const command of commands) {
    registry.register(command);
  }

  return registry;
}
