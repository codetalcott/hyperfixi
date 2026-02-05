/**
 * Hyperscript Runtime Base
 * Core execution engine with ZERO hard dependencies on specific commands.
 * Designed for tree-shaking: strict dependency injection pattern.
 */

import type { ASTNode, ExecutionContext, CommandNode, EventHandlerNode } from '../types/base-types';

import type { ExecutionResult, ExecutionSignal } from '../types/result';

import type { RuntimeHooks } from '../types/hooks';
import { HookRegistry } from '../types/hooks';

import { ok, err, isOk } from '../types/result';

import { BaseExpressionEvaluator } from '../core/base-expression-evaluator';
// NOTE: ExpressionEvaluator import removed for tree-shaking.
// Use ConfigurableExpressionEvaluator or ExpressionEvaluator explicitly in your bundle.
import { CommandRegistryV2 as CommandRegistry } from './command-adapter';
import { CleanupRegistry } from './cleanup-registry';
import { getSharedGlobals } from '../core/context';
import { debug } from '../utils/debug';
import {
  RegistryIntegration,
  type RegistryIntegrationOptions,
} from '../registry/runtime-integration';

/**
 * Unwrap a command's return value to extract the user-facing result.
 *
 * Commands return different wrapper shapes (CallCommand, JsCommand, FetchCommand, etc.).
 * This function extracts the meaningful value from those wrappers so it can be assigned
 * to `context.it` / `context.result` between sequential command executions.
 *
 * Returns `undefined` when the result should NOT update the context (e.g. IfCommand
 * with no branch result), signalling the caller to skip assignment.
 */
export function unwrapCommandResult(result: unknown): unknown | undefined {
  if (result === undefined) return undefined;

  let val = result;
  if (val && typeof val === 'object') {
    const valObj = val as any;

    // CallCommand returns { result, wasAsync }
    if ('result' in valObj && 'wasAsync' in valObj) {
      val = valObj.result;
    }
    // JsCommand returns { result, executed, codeLength, parameters, preserveArrayResult }
    else if ('result' in valObj && 'executed' in valObj) {
      val = valObj.result;
      // JsCommand sets preserveArrayResult to skip array unwrapping
      if (valObj.preserveArrayResult) {
        return val !== undefined ? val : undefined;
      }
    }
    // RepeatCommand/IfCommand returns { type, lastResult }
    else if ('lastResult' in valObj && 'type' in valObj) {
      val = valObj.lastResult;
    }
    // IfCommand returns { conditionResult, executedBranch, result }
    // Don't clobber context.result with if command metadata
    else if ('conditionResult' in valObj && 'executedBranch' in valObj) {
      if (valObj.result !== undefined) {
        val = valObj.result;
      } else {
        return undefined; // don't update context
      }
    }
    // GetCommand returns { value }
    else if ('value' in valObj && Object.keys(valObj).length === 1) {
      val = valObj.value;
    }
    // SetCommand returns { target, value, targetType }
    else if ('value' in valObj && 'target' in valObj && 'targetType' in valObj) {
      val = valObj.value;
    }
    // FetchCommand returns { status, statusText, headers, data, url, duration }
    // In _hyperscript, 'it' should be the actual data (not the wrapper)
    else if ('data' in valObj && 'status' in valObj && 'headers' in valObj) {
      val = valObj.data;
    }
  }
  if (Array.isArray(val) && val.length > 0) val = val[0];

  return val;
}

export interface RuntimeBaseOptions {
  /**
   * The registry instance containing allowed commands.
   * MUST be provided externally to enable tree-shaking.
   */
  registry: CommandRegistry;

  enableAsyncCommands?: boolean;
  commandTimeout?: number; // Default 10000ms
  enableErrorReporting?: boolean;

  /**
   * Enable Result-based execution pattern (napi-rs inspired).
   * When enabled, uses Result<T, ExecutionSignal> instead of exceptions
   * for control flow, providing ~12-18% performance improvement.
   * Default: true
   */
  enableResultPattern?: boolean;

  /**
   * Expression evaluator instance. REQUIRED for tree-shaking support.
   * Use ConfigurableExpressionEvaluator for minimal bundles, or ExpressionEvaluator for full bundles.
   * Accepts any class extending BaseExpressionEvaluator.
   */
  expressionEvaluator: BaseExpressionEvaluator;

  /**
   * Runtime hooks for command execution lifecycle.
   * Allows registering beforeExecute, afterExecute, onError, and interceptCommand hooks.
   */
  hooks?: RuntimeHooks;

  /**
   * Enable automatic cleanup of event listeners and observers when elements
   * are removed from the DOM. Uses MutationObserver to detect removals.
   * Default: true
   */
  enableAutoCleanup?: boolean;

  /**
   * Registry integration options for context providers and event sources.
   * When enabled, registered context providers will be available in execution contexts
   * and custom event sources can be used in 'on' commands.
   * Default: enabled
   */
  registryIntegration?: RegistryIntegrationOptions | boolean;
}

export class RuntimeBase {
  protected options: RuntimeBaseOptions;
  protected registry: CommandRegistry;
  protected expressionEvaluator: BaseExpressionEvaluator;
  /** Behavior registry for programmatic behavior registration */
  public behaviorRegistry: Map<string, any>;
  public behaviorAPI: any;
  protected globalVariables: Map<string, any>;
  /** Hook registry for runtime lifecycle hooks */
  protected hookRegistry: HookRegistry;
  /** Cleanup registry for tracking event listeners and observers */
  protected cleanupRegistry: CleanupRegistry;
  /** Auto-cleanup MutationObserver (if enabled) */
  private autoCleanupObserver: MutationObserver | null = null;
  /** Registry integration for context providers and event sources */
  protected registryIntegration: RegistryIntegration | null = null;

  constructor(options: RuntimeBaseOptions) {
    this.options = {
      commandTimeout: 10000,
      enableErrorReporting: true,
      enableResultPattern: true, // Default on for ~12-18% performance improvement
      enableAutoCleanup: true, // Default on to prevent memory leaks
      ...options,
    };

    this.registry = options.registry;
    this.expressionEvaluator = options.expressionEvaluator;
    this.behaviorRegistry = new Map();
    this.globalVariables = getSharedGlobals();

    // Initialize hook registry
    this.hookRegistry = new HookRegistry();
    if (options.hooks) {
      this.hookRegistry.register('default', options.hooks);
    }

    // Connect hook registry to command registry
    this.registry.setHookRegistry(this.hookRegistry);

    // Initialize cleanup registry
    this.cleanupRegistry = new CleanupRegistry();

    // Set up auto-cleanup if enabled and in browser environment
    if (this.options.enableAutoCleanup) {
      this.setupAutoCleanup();
    }

    // Initialize registry integration
    if (options.registryIntegration !== false) {
      const integrationOptions =
        typeof options.registryIntegration === 'object' ? options.registryIntegration : {};
      this.registryIntegration = new RegistryIntegration(integrationOptions);
      debug.runtime('RuntimeBase: Registry integration enabled');
    }

    // Create behavior API
    this.behaviorAPI = {
      has: (name: string) => this.behaviorRegistry.has(name),
      get: (name: string) => this.behaviorRegistry.get(name),
      install: async (
        behaviorName: string,
        element: HTMLElement,
        parameters: Record<string, any>
      ) => {
        return await this.installBehaviorOnElement(behaviorName, element, parameters);
      },
    };
  }

  /**
   * Set up automatic cleanup when elements are removed from the DOM
   */
  private setupAutoCleanup(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.autoCleanupObserver = new MutationObserver(mutations => {
      const removedElements: Element[] = [];
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (node instanceof Element) {
            removedElements.push(node);
          }
        }
      }
      if (removedElements.length > 0) {
        // Defer cleanup to distinguish moves (insertBefore) from true removals.
        // After a microtask, moved elements will be re-connected to the DOM.
        queueMicrotask(() => {
          for (const element of removedElements) {
            if (!element.isConnected) {
              const count = this.cleanupRegistry.cleanupElementTree(element);
              if (count > 0) {
                debug.runtime(`RuntimeBase: Auto-cleaned ${count} resources for removed element`);
              }
            }
          }
        });
      }
    });

    // Start observing once document.body is available
    if (document.body) {
      this.autoCleanupObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      // Wait for DOMContentLoaded if body not yet available
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          this.autoCleanupObserver?.observe(document.body, { childList: true, subtree: true });
        },
        { once: true }
      );
    }
  }

  /**
   * Register runtime hooks
   * @param name Unique identifier for this hook set
   * @param hooks The hooks to register
   */
  registerHooks(name: string, hooks: RuntimeHooks): void {
    this.hookRegistry.register(name, hooks);
  }

  /**
   * Unregister runtime hooks
   * @param name Identifier of the hook set to remove
   */
  unregisterHooks(name: string): boolean {
    return this.hookRegistry.unregister(name);
  }

  /**
   * Get all registered hook names
   */
  getRegisteredHooks(): string[] {
    return this.hookRegistry.getRegisteredNames();
  }

  /**
   * Clean up resources for an element (event listeners, observers, etc.)
   * @param element The element to clean up
   * @returns Number of cleanups performed
   */
  cleanup(element: Element): number {
    return this.cleanupRegistry.cleanupElement(element);
  }

  /**
   * Clean up resources for an element and all its descendants
   * @param element The root element
   * @returns Total number of cleanups performed
   */
  cleanupTree(element: Element): number {
    return this.cleanupRegistry.cleanupElementTree(element);
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats(): ReturnType<CleanupRegistry['getStats']> {
    return this.cleanupRegistry.getStats();
  }

  /**
   * Destroy the runtime, cleaning up all resources
   */
  destroy(): void {
    // Stop auto-cleanup observer
    if (this.autoCleanupObserver) {
      this.autoCleanupObserver.disconnect();
      this.autoCleanupObserver = null;
    }

    // Clean up all global resources
    this.cleanupRegistry.cleanupAll();

    // Clear registries
    this.hookRegistry.clear();
    this.behaviorRegistry.clear();

    debug.runtime('RuntimeBase: Destroyed');
  }

  /**
   * Main Entry Point: Execute an AST node
   */
  async execute(node: ASTNode, context: ExecutionContext): Promise<unknown> {
    const nodeName = (node as { name?: string })?.name || '';
    debug.runtime(`RUNTIME BASE: execute() called with node type: '${node.type}'`);

    // Inject behavior API
    if (!context.locals.has('_behaviors')) {
      context.locals.set('_behaviors', this.behaviorAPI);
    }

    // Inject self-reference for recursive execution (needed by control flow commands)
    if (!context.locals.has('_runtimeExecute')) {
      context.locals.set('_runtimeExecute', (n: ASTNode, ctx?: any) =>
        this.execute(n, ctx || context)
      );
    }

    try {
      switch (node.type) {
        case 'command': {
          // Use Result-based execution when enabled (~12-18% faster)
          if (this.options.enableResultPattern) {
            try {
              const result = await this.processCommandWithResult(node as CommandNode, context);
              if (!isOk(result)) {
                // Convert signal back to exception for backward compatibility
                const signal = result.error;
                const error = new Error(signal.type.toUpperCase() + '_EXECUTION') as Error & {
                  [key: string]: unknown;
                };
                error['is' + signal.type.charAt(0).toUpperCase() + signal.type.slice(1)] = true;
                if ('returnValue' in signal) {
                  error.returnValue = signal.returnValue;
                }
                throw error;
              }
              return result.value;
            } catch (e) {
              throw e;
            }
          }
          return await this.processCommand(node as CommandNode, context);
        }

        case 'eventHandler': {
          return await this.executeEventHandler(node as EventHandlerNode, context);
        }

        case 'event': {
          // Handle EventNode from hybrid parser (different structure from EventHandlerNode)
          // EventNode has: event, filter, modifiers, body
          // EventHandlerNode expects: event, events, commands, target, args, selector
          const eventNode = node as any;
          const adaptedNode = {
            type: 'eventHandler',
            event: eventNode.event,
            events: [eventNode.event],
            commands: eventNode.body || [],
            target: eventNode.filter,
            modifiers: eventNode.modifiers || {},
          };
          return await this.executeEventHandler(adaptedNode as EventHandlerNode, context);
        }

        case 'behavior': {
          return await this.executeBehaviorDefinition(node as any, context);
        }

        case 'Program': {
          return await this.executeProgram(node as any, context);
        }

        case 'initBlock':
        case 'block': {
          return await this.executeBlock(node as any, context);
        }

        case 'sequence':
        case 'CommandSequence': {
          // Use Result-based execution when enabled
          if (this.options.enableResultPattern) {
            const seqNode = node as unknown as { commands: ASTNode[] };
            const result = await this.executeCommandSequenceWithResult(
              seqNode.commands || [],
              context
            );
            if (!isOk(result)) {
              // Convert signal back to exception for backward compatibility
              const signal = result.error;
              const error = new Error(signal.type.toUpperCase() + '_EXECUTION') as any;
              error['is' + signal.type.charAt(0).toUpperCase() + signal.type.slice(1)] = true;
              if ('returnValue' in signal) {
                error.returnValue = signal.returnValue;
              }
              throw error;
            }
            return result.value;
          }
          return await this.executeCommandSequence(
            node as unknown as { commands: ASTNode[] },
            context
          );
        }

        case 'objectLiteral': {
          return await this.executeObjectLiteral(
            node as unknown as { properties: Array<{ key: ASTNode; value: ASTNode }> },
            context
          );
        }

        case 'templateLiteral':
        case 'memberExpression':
        default: {
          // For expressions, use Result-based evaluation when enabled
          if (this.options.enableResultPattern) {
            const result = await this.evaluateExpressionWithResult(node, context);
            if (!isOk(result)) {
              // Convert signal back to exception for backward compatibility
              const signal = result.error;
              const error = new Error(signal.type.toUpperCase() + '_EXECUTION') as any;
              error['is' + signal.type.charAt(0).toUpperCase() + signal.type.slice(1)] = true;
              if ('returnValue' in signal) {
                error.returnValue = signal.returnValue;
              }
              throw error;
            }
            return result.value;
          }
          // For expressions, delegate to evaluator
          return await this.evaluateExpression(node, context);
        }
      }
    } catch (error) {
      if (this.options.enableErrorReporting) {
        // Optional: Add hook for error reporting service
      }
      throw error;
    }
  }

  /**
   * Generic Command Processor
   * Unlike the legacy Runtime, this does NOT contain specific logic for 'put', 'set', etc.
   * It delegates strictly to the Registry.
   */
  protected async processCommand(node: CommandNode, context: ExecutionContext): Promise<unknown> {
    const { name, args, modifiers } = node;
    const commandName = name.toLowerCase();

    debug.command(`RUNTIME BASE: Processing command '${commandName}'`);

    // 1. check registry
    if (this.registry.has(commandName)) {
      const adapter = await this.registry.getAdapter(commandName);

      if (!adapter) {
        throw new Error(`Command '${commandName}' is registered but failed to load adapter.`);
      }

      // 2. Delegate entirely to Adapter
      // We pass the raw AST nodes (args/modifiers) and the Context.
      // The Adapter (or the Command Implementation inside it) determines
      // if it needs to evaluate arguments or treat them as raw AST.
      try {
        return await adapter.execute(context, {
          args: args || [],
          modifiers: modifiers || {},
          // Pass command name for consolidated commands (e.g., show/hide → VisibilityCommand)
          commandName,
          // Pass runtime reference just in case command needs to re-enter runtime
          runtime: this,
        });
      } catch (e) {
        // Don't log control flow errors - they're expected signals
        const isControlFlowError =
          e instanceof Error &&
          ((e as any).isHalt === true ||
            (e as any).isExit === true ||
            e.message === 'HALT_EXECUTION' ||
            e.message === 'EXIT_COMMAND');
        if (!isControlFlowError) {
          console.error(`Error executing command '${commandName}':`, e);
        }
        throw e;
      }
    }

    // 3. Fallback / Error
    const errorMsg = `Unknown command: ${name}. Ensure it is registered in the Runtime options.`;
    if (this.options.enableErrorReporting) {
      console.warn(errorMsg);
    }
    throw new Error(errorMsg);
  }

  // --------------------------------------------------------------------------
  // Result-Based Execution (napi-rs inspired pattern)
  // --------------------------------------------------------------------------
  // These methods use the Result<T, E> pattern instead of exceptions for
  // control flow, providing ~18% performance improvement on hot paths.

  /**
   * Convert exception-based control flow error to ExecutionSignal.
   * Used for bridging legacy exception-throwing code with Result pattern.
   */
  protected toSignal(error: unknown): ExecutionSignal | null {
    if (error instanceof Error) {
      const e = error as any;
      if (e.isHalt || e.message === 'HALT_EXECUTION') {
        return { type: 'halt' };
      }
      if (e.isExit || e.message === 'EXIT_COMMAND') {
        return { type: 'exit', returnValue: e.returnValue };
      }
      if (e.isBreak) {
        return { type: 'break' };
      }
      if (e.isContinue) {
        return { type: 'continue' };
      }
      if (e.isReturn) {
        return { type: 'return', returnValue: e.returnValue };
      }
    }
    return null;
  }

  /**
   * Result-based command processor (internal).
   *
   * Unlike processCommand which uses try-catch for control flow,
   * this method returns ExecutionResult with explicit signals.
   *
   * Benefits:
   * - ~18% faster (no exception overhead)
   * - Explicit control flow handling
   * - Type-safe signal handling
   */
  protected async processCommandWithResult(
    node: CommandNode,
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    const { name, args, modifiers } = node;
    const commandName = name.toLowerCase();

    debug.command(`RUNTIME BASE (Result): Processing command '${commandName}'`);

    // 1. Check registry
    if (!this.registry.has(commandName)) {
      // Return error as exception (not a control flow signal)
      const errorMsg = `Unknown command: ${name}. Ensure it is registered in the Runtime options.`;
      if (this.options.enableErrorReporting) {
        console.warn(errorMsg);
      }
      throw new Error(errorMsg);
    }

    const adapter = await this.registry.getAdapter(commandName);
    if (!adapter) {
      throw new Error(`Command '${commandName}' is registered but failed to load adapter.`);
    }

    // 2. Execute command with exception-to-Result bridging
    // This bridges existing commands that throw control flow exceptions
    try {
      const result = await adapter.execute(context, {
        args: args || [],
        modifiers: modifiers || {},
        // Pass command name for consolidated commands (e.g., show/hide → VisibilityCommand)
        commandName,
        runtime: this,
      });
      return ok(result);
    } catch (e) {
      // Check if this is a control flow signal
      const signal = this.toSignal(e);
      if (signal) {
        return err(signal);
      }
      // Real error - log and re-throw
      console.error(`Error executing command '${commandName}':`, e);
      throw e;
    }
  }

  /**
   * Result-based command sequence executor (internal).
   *
   * Executes a sequence of commands using Result pattern instead of
   * exception-based control flow.
   */
  protected async executeCommandSequenceWithResult(
    commands: ASTNode[],
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    let lastResult: unknown = undefined;

    for (const command of commands) {
      // For commands, use Result-based execution
      if (command.type === 'command') {
        const result = await this.processCommandWithResult(command as CommandNode, context);

        if (!isOk(result)) {
          // Handle control flow signals
          const signal = result.error;
          switch (signal.type) {
            case 'halt':
            case 'exit':
              return result; // Propagate up
            case 'return':
              if (signal.returnValue !== undefined) {
                Object.assign(context, { it: signal.returnValue, result: signal.returnValue });
              }
              return ok(signal.returnValue);
            case 'break':
            case 'continue':
              return result; // Propagate to loop handler
          }
        }
        lastResult = result.value;
      } else {
        // For non-commands, use Result-based expression evaluation
        const exprResult = await this.evaluateExpressionWithResult(command, context);
        if (!isOk(exprResult)) {
          return exprResult; // Propagate signal
        }
        lastResult = exprResult.value;
      }
    }

    return ok(lastResult);
  }

  /**
   * Evaluate Expression (Delegator)
   * Handles standard expressions + the "implicit command pattern" (space operator)
   */
  protected async evaluateExpression(node: ASTNode, context: ExecutionContext): Promise<unknown> {
    // 1. Standard Evaluation
    const result = await this.expressionEvaluator.evaluate(node, context);

    // 2. Check for "Implicit Command Pattern" (e.g. "add .class")
    // This happens when the parser sees "word token" but interprets as property access
    if (
      result &&
      typeof result === 'object' &&
      (result as any).command &&
      (result as any).selector
    ) {
      return await this.executeCommandFromPattern(
        (result as any).command,
        (result as any).selector,
        context
      );
    }

    return result;
  }

  /**
   * Result-based expression evaluation (napi-rs inspired pattern).
   *
   * Uses Result<T, ExecutionSignal> instead of exceptions for control flow.
   * Provides performance improvement by eliminating try-catch overhead.
   */
  protected async evaluateExpressionWithResult(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    // Use Result-based evaluation from expression evaluator
    const result = await this.expressionEvaluator.evaluateWithResult(node, context);

    if (!isOk(result)) {
      return result; // Propagate signal
    }

    const value = result.value;

    // Check for "Implicit Command Pattern" (e.g. "add .class")
    if (value && typeof value === 'object' && (value as any).command && (value as any).selector) {
      // Execute command and wrap in Result
      if (this.options.enableResultPattern) {
        const commandNode: CommandNode = {
          type: 'command',
          name: (value as any).command,
          args: [{ type: 'literal', value: (value as any).selector }],
        };
        return this.processCommandWithResult(commandNode, context);
      } else {
        try {
          const cmdResult = await this.executeCommandFromPattern(
            (value as any).command,
            (value as any).selector,
            context
          );
          return ok(cmdResult);
        } catch (e) {
          const signal = this.toSignal(e);
          if (signal) {
            return err(signal);
          }
          throw e;
        }
      }
    }

    return ok(value);
  }

  /**
   * Handles the "Implicit Command Pattern"
   * e.g., "add .active" where parser returned { command: 'add', selector: '.active' }
   */
  protected async executeCommandFromPattern(
    commandName: string,
    selector: string,
    context: ExecutionContext
  ): Promise<unknown> {
    // Convert the pattern back into a standard Command structure and execute
    // This ensures it goes through the standard Registry lookup

    // Heuristic: Implicit commands usually treat the selector as a Literal arg
    // unless specific commands override this behavior.
    const args: ASTNode[] = [{ type: 'literal', value: selector }];

    const commandNode: CommandNode = {
      type: 'command',
      name: commandName,
      args: args,
    };

    return this.processCommand(commandNode, context);
  }

  // --------------------------------------------------------------------------
  // Structure Executors (Program, Block, Sequence)
  // --------------------------------------------------------------------------

  protected async executeProgram(node: any, context: ExecutionContext): Promise<unknown> {
    if (!node.statements || !Array.isArray(node.statements)) return;

    let lastResult: unknown = undefined;

    // Separate statements into categories for proper execution order
    // Event handlers MUST be registered before init blocks run
    // This ensures that events sent during init are properly received
    const eventHandlers: any[] = [];
    const initBlocks: any[] = [];
    const otherStatements: any[] = [];

    for (const statement of node.statements) {
      if (statement.type === 'eventHandler') {
        eventHandlers.push(statement);
      } else if (statement.type === 'initBlock') {
        initBlocks.push(statement);
      } else {
        otherStatements.push(statement);
      }
    }

    // Phase 1: Register all event handlers first
    for (const handler of eventHandlers) {
      try {
        await this.execute(handler, context);
      } catch (error) {
        if (error instanceof Error && ((error as any).isHalt || (error as any).isExit)) {
          break;
        }
        throw error;
      }
    }

    // Phase 2: Execute init blocks (now handlers are registered)
    for (const init of initBlocks) {
      try {
        lastResult = await this.execute(init, context);
      } catch (error) {
        if (error instanceof Error && ((error as any).isHalt || (error as any).isExit)) {
          break;
        }
        throw error;
      }
    }

    // Phase 3: Execute other statements
    for (const statement of otherStatements) {
      try {
        lastResult = await this.execute(statement, context);
      } catch (error) {
        if (error instanceof Error && ((error as any).isHalt || (error as any).isExit)) {
          break;
        }
        throw error;
      }
    }

    return lastResult;
  }

  protected async executeBlock(node: any, context: ExecutionContext): Promise<void> {
    if (!node.commands || !Array.isArray(node.commands)) return;

    for (const command of node.commands) {
      try {
        await this.execute(command, context);
      } catch (error) {
        if (error instanceof Error && (error as any).isHalt) break;
        throw error;
      }
    }
  }

  protected async executeCommandSequence(
    node: { commands: ASTNode[] },
    context: ExecutionContext
  ): Promise<unknown> {
    if (!node.commands || !Array.isArray(node.commands)) return;

    let lastResult: unknown = undefined;

    for (const command of node.commands) {
      try {
        lastResult = await this.execute(command, context);
      } catch (error) {
        // Handle Flow Control Signals
        const e = error as any;
        if (e.isHalt || e.isExit) break;
        if (e.isReturn) {
          if (e.returnValue !== undefined) {
            Object.assign(context, { it: e.returnValue, result: e.returnValue });
            return e.returnValue;
          }
          break;
        }
        if (e.isBreak) throw error; // Caught by loop
        throw error;
      }
    }
    return lastResult;
  }

  protected async executeObjectLiteral(
    node: { properties: Array<{ key: ASTNode; value: ASTNode }> },
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    if (!node.properties) return result;

    for (const property of node.properties) {
      let key: string;
      // Key evaluation logic
      if (property.key.type === 'identifier') {
        key = (property.key as unknown as { name: string }).name;
      } else if (property.key.type === 'literal') {
        key = String((property.key as unknown as { value: unknown }).value);
      } else {
        const evalKey = await this.execute(property.key, context);
        key = String(evalKey);
      }

      const value = await this.execute(property.value, context);
      result[key] = value;
    }
    return result;
  }

  // --------------------------------------------------------------------------
  // Context Enhancement (Registry Integration)
  // --------------------------------------------------------------------------

  /**
   * Enhance execution context with registered context providers
   * This makes registered providers available as lazy getters on the context
   */
  protected enhanceContext(baseContext: ExecutionContext): ExecutionContext {
    if (!this.registryIntegration) {
      return baseContext;
    }
    return this.registryIntegration.enhanceContext(baseContext);
  }

  // --------------------------------------------------------------------------
  // Event & Behavior System (DOM Glue)
  // --------------------------------------------------------------------------

  protected async executeBehaviorDefinition(node: any, _context: ExecutionContext): Promise<void> {
    const { name, parameters, eventHandlers, initBlock } = node;
    this.behaviorRegistry.set(name, { name, parameters, eventHandlers, initBlock });
    debug.runtime(`RUNTIME BASE: Registered behavior '${name}'`);
  }

  protected async installBehaviorOnElement(
    behaviorName: string,
    element: HTMLElement,
    parameters: Record<string, any>
  ): Promise<void> {
    debug.runtime(`BEHAVIOR: installBehaviorOnElement called: ${behaviorName}`);
    const behavior = this.behaviorRegistry.get(behaviorName);
    if (!behavior) throw new Error(`Behavior "${behaviorName}" not found`);
    debug.runtime(
      `BEHAVIOR: Found behavior, eventHandlers count: ${behavior.eventHandlers?.length || 0}`
    );

    // Create isolated context
    const baseBehaviorContext: ExecutionContext = {
      me: element,
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: this.globalVariables,
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
    };

    // Enhance context with registered providers
    const behaviorContext = this.enhanceContext(baseBehaviorContext);

    // Hydrate parameters
    if (behavior.parameters) {
      for (const param of behavior.parameters) {
        const value = param in parameters ? parameters[param] : undefined;
        behaviorContext.locals.set(param, value);
      }
    }
    // Add extra params
    for (const [key, value] of Object.entries(parameters)) {
      if (!behavior.parameters?.includes(key)) {
        behaviorContext.locals.set(key, value);
      }
    }

    // Run Init Block
    if (behavior.initBlock) {
      debug.runtime(`BEHAVIOR: Running init block for ${behaviorName}`);
      try {
        await this.execute(behavior.initBlock, behaviorContext);
        debug.runtime(`BEHAVIOR: Init block completed for ${behaviorName}`);
      } catch (e) {
        debug.runtime(`BEHAVIOR: Init block error for ${behaviorName}:`, e);
        if (!(e instanceof Error && (e as any).isHalt)) throw e;
      }
    }

    // Attach Handlers
    debug.runtime(
      `BEHAVIOR: About to attach ${behavior.eventHandlers?.length || 0} handlers for ${behaviorName}`
    );
    if (behavior.eventHandlers) {
      for (const handler of behavior.eventHandlers) {
        await this.executeEventHandler(handler, behaviorContext);
      }
    }
    debug.runtime(`BEHAVIOR: Finished installing ${behaviorName}`);
  }

  protected async executeEventHandler(
    node: EventHandlerNode,
    context: ExecutionContext
  ): Promise<void> {
    const {
      event,
      events,
      commands,
      target,
      args,
      selector,
      attributeName,
      watchTarget,
      modifiers,
    } = node as any;
    const eventNames = events && events.length > 0 ? events : [event];
    debug.runtime(`BEHAVIOR: executeEventHandler: event='${event}', target='${target}'`);

    let targets: HTMLElement[] = [];
    let globalTarget: Window | Document | null = null;

    // Target Resolution
    if (target) {
      // Check for global event sources (window, document)
      const targetLower = typeof target === 'string' ? target.toLowerCase() : '';
      if (targetLower === 'window' || targetLower === 'the window') {
        globalTarget = window;
      } else if (
        targetLower === 'document' ||
        targetLower === 'the document' ||
        targetLower === 'body'
      ) {
        globalTarget = document;
      } else if (targetLower === 'me' || targetLower === 'myself') {
        // Special case: 'me' refers to the context element
        targets = context.me ? [context.me as HTMLElement] : [];
      } else if (typeof target === 'string' && context.locals.has(target)) {
        const resolved = context.locals.get(target);
        debug.runtime(
          `BEHAVIOR: Target resolution: found local '${target}', isElement: ${this.isElement(resolved)}`
        );
        if (this.isElement(resolved)) targets = [resolved];
        else if (Array.isArray(resolved)) targets = resolved.filter(el => this.isElement(el));
        else if (typeof resolved === 'string') targets = this.queryElements(resolved, context);
      } else {
        debug.runtime(`BEHAVIOR: Target resolution: querying for '${target}'`);
        targets = this.queryElements(target, context);
      }
    } else {
      targets = context.me ? [context.me as HTMLElement] : [];
    }

    if (targets.length === 0 && !globalTarget) {
      debug.runtime(
        `BEHAVIOR: executeEventHandler - No targets found for event '${event}', returning early`
      );
      return;
    }

    // SPECIAL CASE 1: Mutation Observer
    if (event === 'mutation' && attributeName) {
      this.setupMutationObserver(targets, attributeName, commands, context);
      return;
    }

    // SPECIAL CASE 2: Content Change Observer
    if (event === 'change' && watchTarget) {
      this.setupChangeObserver(watchTarget, commands, context);
      return;
    }

    // SPECIAL CASE 3: Custom Event Source (from registry)
    const customEventSource = (node as any).customEventSource;
    if (customEventSource && this.registryIntegration) {
      debug.runtime(
        `BEHAVIOR: executeEventHandler - Using custom event source '${customEventSource}' for event '${event}'`
      );

      // Create event handler that executes the commands
      const customEventHandler = async (eventData: any) => {
        // Context Hydration
        const eventLocals = new Map(context.locals);
        const baseEventContext: ExecutionContext = {
          ...context,
          locals: eventLocals,
          it: eventData,
          event: eventData,
        };

        // Enhance context with registered providers
        const eventContext = this.enhanceContext(baseEventContext);

        // Execute commands
        debug.runtime(`CUSTOM EVENT: Executing commands for event '${event}'`);
        try {
          await this.execute({ type: 'program', commands }, eventContext);
        } catch (e) {
          console.error(`[HyperFixi] Error executing commands for custom event '${event}':`, e);
        }
      };

      // Subscribe to the custom event source
      try {
        const subscription = this.registryIntegration.subscribeToEventSource(
          customEventSource,
          {
            event,
            handler: customEventHandler,
            target,
            selector,
          },
          context
        );

        debug.runtime(
          `BEHAVIOR: Subscribed to custom event source '${customEventSource}' (id: ${subscription.id})`
        );

        // Register for cleanup
        this.cleanupRegistry.registerGlobal(
          () => subscription.unsubscribe(),
          'listener',
          `Custom event source '${customEventSource}' subscription ${subscription.id}`
        );
      } catch (error) {
        console.error(
          `[HyperFixi] Failed to subscribe to custom event source '${customEventSource}':`,
          error
        );
      }

      return;
    }

    // STANDARD CASE: DOM Event Listeners
    const baseEventHandler = async (domEvent: Event) => {
      // Recursion Guard
      const currentDepth = (domEvent as any).__hyperfixi_recursion_depth || 0;
      if (currentDepth >= 100) {
        return;
      }
      (domEvent as any).__hyperfixi_recursion_depth = currentDepth + 1;

      // Event Delegation Check
      if (selector && domEvent.target instanceof Element) {
        if (!domEvent.target.matches(selector) && !domEvent.target.closest(selector)) {
          return;
        }
      }

      // Context Hydration
      const eventLocals = new Map(context.locals);
      const baseEventContext: ExecutionContext = {
        ...context,
        locals: eventLocals,
        it: domEvent,
        event: domEvent,
      };
      // Only set 'target' if not already defined by the behavior's init block
      if (!eventLocals.has('target')) {
        baseEventContext.locals.set('target', domEvent.target);
      }

      // Enhance context with registered providers
      const eventContext = this.enhanceContext(baseEventContext);

      // Arg Destructuring (e.g. on pointerdown(x, y))
      if (args && args.length > 0) {
        for (const argName of args) {
          const value = (domEvent as any)[argName] ?? (domEvent as any).detail?.[argName] ?? null;
          eventContext.locals.set(argName, value);
        }
      }

      // Execution
      for (const command of commands) {
        try {
          const result = await this.execute(command, eventContext);
          const val = unwrapCommandResult(result);
          if (val !== undefined) {
            Object.assign(eventContext, { it: val, result: val });
          }
        } catch (e) {
          const err = e as any;
          if (err.isHalt || err.isExit) break;
          if (err.isReturn) {
            if (err.returnValue !== undefined) {
              Object.assign(eventContext, { it: err.returnValue, result: err.returnValue });
            }
            break;
          }
          console.error(`COMMAND FAILED:`, e);
          throw e;
        }
      }
    };

    // Apply event modifiers
    let eventHandler: (domEvent: Event) => void | Promise<void>;

    if (modifiers) {
      let wrappedHandler = baseEventHandler;

      // Apply .prevent modifier - call preventDefault()
      if (modifiers.prevent) {
        const preventHandler = wrappedHandler;
        wrappedHandler = async (domEvent: Event) => {
          domEvent.preventDefault();
          return preventHandler(domEvent);
        };
      }

      // Apply .stop modifier - call stopPropagation()
      if (modifiers.stop) {
        const stopHandler = wrappedHandler;
        wrappedHandler = async (domEvent: Event) => {
          domEvent.stopPropagation();
          return stopHandler(domEvent);
        };
      }

      // Apply .debounce modifier - delay execution until pause
      if (modifiers.debounce) {
        const delay = modifiers.debounce;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        eventHandler = (domEvent: Event) => {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => wrappedHandler(domEvent), delay);
        };
      }
      // Apply .throttle modifier - limit execution frequency
      else if (modifiers.throttle) {
        const delay = modifiers.throttle;
        let lastCall = 0;

        eventHandler = (domEvent: Event) => {
          const now = Date.now();
          if (now - lastCall >= delay) {
            lastCall = now;
            wrappedHandler(domEvent);
          }
        };
      } else {
        eventHandler = wrappedHandler;
      }
    } else {
      eventHandler = baseEventHandler;
    }

    // Attach Listeners
    const listenerOptions = modifiers?.once ? { once: true } : undefined;

    if (globalTarget) {
      // Attach to global event source (window or document)
      for (const evt of eventNames) {
        globalTarget.addEventListener(evt, eventHandler, listenerOptions);
        // Register for cleanup - use first target element or register as global
        if (targets.length > 0) {
          this.cleanupRegistry.registerListener(targets[0], globalTarget, evt, eventHandler);
        } else {
          this.cleanupRegistry.registerGlobal(
            () => globalTarget.removeEventListener(evt, eventHandler),
            'listener',
            `Global ${evt} listener`
          );
        }
      }
    } else {
      // Attach to HTMLElement targets
      for (const el of targets) {
        for (const evt of eventNames) {
          el.addEventListener(evt, eventHandler, listenerOptions);
          // Register for cleanup
          this.cleanupRegistry.registerListener(el, el, evt, eventHandler);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  protected setupMutationObserver(
    targets: HTMLElement[],
    attr: string,
    commands: ASTNode[],
    context: ExecutionContext
  ): void {
    debug.runtime(
      `RUNTIME BASE: Setting up MutationObserver for attribute '${attr}' on ${targets.length} elements`
    );

    for (const targetElement of targets) {
      const observer = new MutationObserver(async mutations => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === attr) {
            debug.event(`MUTATION DETECTED: attribute '${attr}' changed on`, targetElement);

            // Create context for mutation event
            const baseMutationContext: ExecutionContext = {
              ...context,
              me: targetElement,
              it: mutation,
              locals: new Map(context.locals),
            };

            // Store old and new values in context
            const oldValue = mutation.oldValue;
            const newValue = targetElement.getAttribute(attr);
            baseMutationContext.locals.set('oldValue', oldValue);
            baseMutationContext.locals.set('newValue', newValue);

            // Enhance context with registered providers
            const mutationContext = this.enhanceContext(baseMutationContext);

            // Execute all commands
            for (const command of commands) {
              try {
                await this.execute(command, mutationContext);
              } catch (error) {
                console.error(`❌ Error executing mutation handler command:`, error);
              }
            }
          }
        }
      });

      // Observe attribute changes
      observer.observe(targetElement, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: [attr],
      });

      // Register for cleanup
      this.cleanupRegistry.registerObserver(targetElement, observer);

      debug.runtime(
        `RUNTIME BASE: MutationObserver attached to`,
        targetElement,
        `for attribute '${attr}'`
      );
    }
  }

  protected async setupChangeObserver(
    watchTarget: ASTNode,
    commands: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    debug.runtime(`RUNTIME BASE: Setting up MutationObserver for content changes on watch target`);

    // Evaluate the watchTarget expression to get the target element(s)
    const watchTargetResult = await this.execute(watchTarget, context);
    let watchTargetElements: HTMLElement[] = [];

    if (this.isElement(watchTargetResult)) {
      watchTargetElements = [watchTargetResult];
    } else if (Array.isArray(watchTargetResult)) {
      watchTargetElements = watchTargetResult.filter((el: any) => this.isElement(el));
    }

    debug.runtime(
      `RUNTIME BASE: Watching ${watchTargetElements.length} target elements for content changes`
    );

    // Set up observer for each watch target
    for (const watchedElement of watchTargetElements) {
      const observer = new MutationObserver(async mutations => {
        for (const mutation of mutations) {
          // Detect content changes (childList or characterData)
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            debug.event(
              `CONTENT CHANGE DETECTED on`,
              watchedElement,
              `mutation type:`,
              mutation.type
            );

            // Create context for change event
            const baseChangeContext: ExecutionContext = {
              ...context,
              me: context.me, // Keep original 'me' (the element with the handler)
              it: mutation,
              locals: new Map(context.locals),
            };

            // Store the watched element in context as a local variable
            baseChangeContext.locals.set('target', watchedElement);

            // Get old and new text content (if available)
            const oldValue = mutation.oldValue;
            const newValue = watchedElement.textContent;
            if (oldValue !== null) {
              baseChangeContext.locals.set('oldValue', oldValue);
            }
            baseChangeContext.locals.set('newValue', newValue);

            // Enhance context with registered providers
            const changeContext = this.enhanceContext(baseChangeContext);

            // Execute all commands
            for (const command of commands) {
              try {
                await this.execute(command, changeContext);
              } catch (error) {
                console.error(`❌ Error executing change handler command:`, error);
              }
            }
          }
        }
      });

      // Observe content changes
      observer.observe(watchedElement, {
        childList: true, // Watch for child nodes being added/removed
        characterData: true, // Watch for text content changes
        subtree: true, // Watch all descendants
        characterDataOldValue: true, // Track old text values
      });

      // Register for cleanup
      this.cleanupRegistry.registerObserver(watchedElement, observer);

      debug.runtime(
        `RUNTIME BASE: MutationObserver attached to`,
        watchedElement,
        `for content changes`
      );
    }
  }

  protected queryElements(selector: string, context: ExecutionContext): HTMLElement[] {
    // Use element's ownerDocument for JSDOM compatibility, fall back to global document
    const doc =
      (context.me as any)?.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
    if (!doc) return [];
    // Handle hyperscript queryReference syntax <tag/>
    let cleanSelector = selector;
    if (cleanSelector.startsWith('<') && cleanSelector.endsWith('/>')) {
      cleanSelector = cleanSelector.slice(1, -2).trim(); // Remove '<' and '/>' and whitespace
    }
    return Array.from(doc.querySelectorAll(cleanSelector));
  }

  protected isElement(obj: unknown): obj is HTMLElement {
    if (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement) return true;
    const objAny = obj as any;
    return obj && typeof obj === 'object' && objAny.style && objAny.classList;
  }
}
