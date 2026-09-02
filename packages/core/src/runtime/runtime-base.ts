/**
 * Hyperscript Runtime Base
 * Core execution engine with ZERO hard dependencies on specific commands.
 * Designed for tree-shaking: strict dependency injection pattern.
 */

import type { ASTNode, ExecutionContext } from '../types/base-types';
import type {
  Expr,
  CommandNode,
  EventHandlerNode,
  DefNode,
  BehaviorNode,
  ProgramNode,
  BlockNode,
  InitBlockNode,
  CommandSequenceNode,
  ObjectLiteralNode,
  Stmt,
} from '../ast/nodes';
import type {
  EventNode as HybridEventNode,
  SequenceNode as HybridSequenceNode,
} from '../parser/hybrid/ast-types';
import { fromHybridStatements, toLegacyNode, type AnyNode } from '../ast/legacy';

import type { ExecutionResult, ExecutionSignal } from '../types/result';

import type { RuntimeHooks } from '../types/hooks';
import { HookRegistry } from '../types/hooks';

import { ok, err, isOk, isSignal } from '../types/result';

import { evaluateAST, evaluateASTWithResult } from '../parser/runtime';
import type { ExpressionRegistry } from '../core/expression-registry';

/**
 * The only thrown form left (Arc 4a step 3, last slice). Every signal travels
 * as a `Result` from the command that produced it to the boundary that
 * consumes it — the loop for `break`/`continue`, the function, the handler
 * or the program for `halt`/`exit`/`return`. A `break`/`continue` that
 * reaches a boundary with no loop around it is not control flow any more; it
 * is an authoring error, and it is thrown as one. Named so that a handler's
 * `catch` block can decline it: upstream routes real errors to `catch`, and a
 * stray `break` is not one the author wrote a `catch` for.
 */
/** A command argument that is itself executable: a branch/loop body or a told command. */
function isBodyNode(arg: unknown): arg is AnyNode {
  const t = (arg as { type?: unknown } | null)?.type;
  return t === 'block' || t === 'command';
}

export class StrayControlFlowError extends Error {
  constructor(readonly signal: ExecutionSignal) {
    super(`'${signal.type}' used outside of a loop`);
    this.name = 'StrayControlFlowError';
  }
}
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
import type { Op, BodyOps } from '../types/program';

/**
 * Pattern from expression evaluator where a space-separated "word token" is
 * interpreted as an implicit command invocation (e.g. "add .class").
 */
interface ImplicitCommandResult {
  command: string;
  selector: string;
}

function isImplicitCommand(val: unknown): val is ImplicitCommandResult {
  return val !== null && typeof val === 'object' && 'command' in val && 'selector' in val;
}

/** Track event recursion depth per-event without expando properties on Event objects */
const eventRecursionDepth = new WeakMap<Event, number>();

/**
 * Every identifier name referenced anywhere in an expression tree. Used by the
 * event-filter evaluation to decide which event properties to expose as locals
 * (`on keydown[key=='Escape']` — `key` must resolve to `event.key`). A generic
 * object walk rather than a typed visitor: filter expressions are small, and
 * the walk must see identifiers wherever a node shape nests them.
 */
function collectIdentifierNames(node: unknown, out: Set<string> = new Set()): Set<string> {
  if (node === null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectIdentifierNames(item, out);
    return out;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type === 'identifier' && typeof obj.name === 'string') {
    out.add(obj.name);
  }
  for (const key of Object.keys(obj)) {
    // Positions/tokens carry no identifiers worth exposing.
    if (key === 'start' || key === 'end' || key === 'line' || key === 'column') continue;
    collectIdentifierNames(obj[key], out);
  }
  return out;
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
   * Bundle-supplied expression registry threaded through to
   * `parser/runtime.ts:evaluateAST` via `context.registry`. Build with
   * `createExpressionRegistry()` from the category objects the bundle includes
   * (or use `createCoreRegistry` / `createCommonRegistry` /
   * `createFullExpressionRegistry`). Named `expressionRegistry` (not
   * `registry`) to avoid collision with the existing CommandRegistry field.
   */
  expressionRegistry: ExpressionRegistry;

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

/**
 * What the runtime stores in `behaviorRegistry`. Behaviors come in two
 * shapes — imperative installers and hyperscript event-handler bundles —
 * discriminated by the presence/value of `type`.
 */
export type BehaviorEntry =
  | {
      name: string;
      /** Declared parameter names (positional). */
      parameters: string[];
      type: 'imperative';
      install: (element: HTMLElement, parameters: Record<string, unknown>) => void | Promise<void>;
    }
  | {
      name: string;
      parameters: string[];
      type?: undefined;
      eventHandlers: EventHandlerNode[];
      initBlock?: ASTNode;
    };

/**
 * External shape of the behavior registry API exposed at `runtime.behaviorAPI`.
 * Plugins (e.g. @hyperfixi/behaviors) attach a `resolve` hook to lazy-load
 * behaviors on first lookup.
 */
export interface BehaviorAPI {
  has(name: string): boolean;
  get(name: string): BehaviorEntry | undefined;
  set(name: string, definition: BehaviorEntry): void;
  /** Optional lazy-load hook; returns true if a behavior was just registered. */
  resolve: ((name: string) => boolean) | null;
  install(
    behaviorName: string,
    element: HTMLElement,
    parameters: Record<string, unknown>
  ): Promise<void>;
}

export class RuntimeBase {
  protected options: RuntimeBaseOptions;
  protected registry: CommandRegistry;
  /** Bundle-supplied expression registry threaded into evaluator contexts. */
  protected expressionRegistry: ExpressionRegistry;
  /** Behavior registry for programmatic behavior registration */
  public behaviorRegistry: Map<string, BehaviorEntry>;
  public behaviorAPI: BehaviorAPI;
  protected globalVariables: Map<string, unknown>;
  /** Hook registry for runtime lifecycle hooks */
  protected hookRegistry: HookRegistry;
  /** Cleanup registry for tracking event listeners and observers */
  protected cleanupRegistry: CleanupRegistry;
  /** Auto-cleanup MutationObserver (if enabled) */
  private autoCleanupObserver: MutationObserver | null = null;
  /** Registry integration for context providers and event sources */
  protected registryIntegration: RegistryIntegration | null = null;
  /** Accumulated runtime warnings from error-diagnosed nodes (resilient parsing) */
  protected runtimeWarnings: string[] = [];

  constructor(options: RuntimeBaseOptions) {
    this.options = {
      commandTimeout: 10000,
      enableErrorReporting: true,
      enableAutoCleanup: true, // Default on to prevent memory leaks
      ...options,
    };

    this.registry = options.registry;
    this.expressionRegistry = options.expressionRegistry;
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
      has: name => this.behaviorRegistry.has(name),
      get: name => this.behaviorRegistry.get(name),
      set: (name, definition) => this.behaviorRegistry.set(name, definition),
      resolve: null,
      install: async (behaviorName, element, parameters) => {
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
   * Track an event listener so it gets removed when the element is cleaned
   * up (via `cleanup()` / `cleanupTree()` / DOM removal). Used by the DOM
   * processor so that `hyperfixi.cleanup(elt)` can actually remove listeners
   * attached to an element's `_=` handler — critical for morph/swap
   * compatibility (upstream _hyperscript 0.9.90 style).
   *
   * The caller still calls `addEventListener` themselves — this just
   * registers the removal callback.
   */
  trackListener(
    element: Element,
    target: EventTarget,
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    this.cleanupRegistry.registerListener(element, target, eventName, handler, options);
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
   * Access the cleanup registry. Plugins use this to register per-element
   * teardowns that fire when the element is removed from the DOM or
   * `cleanup(element)` is called explicitly.
   */
  getCleanupRegistry(): CleanupRegistry {
    return this.cleanupRegistry;
  }

  /**
   * Surface a runtime error via `console.error` when `enableErrorReporting`
   * is on (the default). Embedders with their own error pipeline can disable
   * the option to silence per-event-loop spam in hot paths (mutation
   * observers, resize handlers, repeating event subscriptions).
   */
  protected logError(...args: unknown[]): void {
    if (this.options.enableErrorReporting) console.error(...args);
  }

  /** Same as `logError` but uses `console.warn`. */
  protected logWarn(...args: unknown[]): void {
    if (this.options.enableErrorReporting) console.warn(...args);
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
   * Check if an AST node has error-severity diagnostics (resilient parsing).
   */
  private hasErrorDiagnostics(node: AnyNode): boolean {
    const diagnostics = node.diagnostics as Array<{ severity: string }> | undefined;
    return !!diagnostics?.some(d => d.severity === 'error');
  }

  /**
   * Get accumulated runtime warnings from error-diagnosed nodes.
   */
  getWarnings(): readonly string[] {
    return this.runtimeWarnings;
  }

  /**
   * Main Entry Point: Execute an AST node
   */
  /**
   * The PROGRAM boundary (Arc 4a): the entry every outside caller uses — the
   * API's eval/execute, handler and observer bodies, behavior init. A
   * `return` that reaches it hands its value to the caller (the embedded-
   * evaluator use: `hyperscript.eval('return x + 1')`); a `halt`/`exit`
   * ends the program. `break`/`continue` have no loop to reach and stay
   * errors. Structural callers inside the runtime — the statement loops,
   * the compiled bodies of `if`/`repeat`/`tell`, the handler's command
   * loop — call `executeNode` instead, so a signal keeps travelling to the
   * boundary that consumes it.
   */
  async execute(node: AnyNode, context: ExecutionContext): Promise<unknown> {
    const result = await this.executeNode(node, context);
    if (isOk(result)) return result.value;
    const signal = result.error;
    if (signal.type === 'return') {
      const rv = signal.returnValue;
      if (rv !== undefined) Object.assign(context, { it: rv, result: rv });
      return rv;
    }
    if (signal.type === 'halt' || signal.type === 'exit') return undefined;
    throw new StrayControlFlowError(signal);
  }

  /** The recursive dispatcher. Signals leave it as control-flow errors. */
  protected async executeNode(
    node: AnyNode,
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    this.prepareContext(context);
    return this.compile(node)(context);
  }

  /**
   * Every context that runs a node carries the registry and the behavior API.
   *
   * Thread the bundle's ExpressionRegistry through context. Commands receive
   * this context and forward it to evaluator.evaluate(), which dispatches
   * named-expression lookups via context.registry. Mutate in place rather than
   * spread into a new object — `locals`/`globals` are already populated via
   * the caller's reference, so command writes to `context.result` / `context.it`
   * need to propagate to the caller too.
   */
  private prepareContext(context: ExecutionContext): void {
    if (!context.registry) {
      context.registry = this.expressionRegistry;
    }
    if (!context.locals.has('_behaviors')) {
      context.locals.set('_behaviors', this.behaviorAPI);
    }
  }

  // ---------------------------------------------------------------------------
  // Compile (Arc 4b)
  // ---------------------------------------------------------------------------

  private readonly ops = new WeakMap<object, Op>();

  /**
   * Bind a node to a closure ONCE. Memoised on the node object, so the API's
   * cached ASTs yield cached closures and a handler body compiles on its
   * first event, never again. Statement kinds compile structurally — a
   * command's `block`/`command` arguments are compiled and handed to it as
   * `bodies` — and everything else is a closure over {@link dispatch}, the
   * per-execution path the uncompiled kinds still take.
   */
  compile(node: AnyNode): Op {
    const cached = this.ops.get(node);
    if (cached) return cached;
    const op = this.compileNode(node);
    this.ops.set(node, op);
    return op;
  }

  /**
   * A body — a handler's, a `def`'s, a `catch`/`finally` block's — compiled
   * ONCE as a plain sequence: every statement in order, the first signal
   * returned to the boundary that owns it, nothing consumed here.
   */
  protected compileSequence(nodes: readonly AnyNode[]): Op {
    const ops = nodes.map(n => this.compile(n));
    return async context => {
      let last: unknown;
      for (const op of ops) {
        const result = await op(context);
        if (!isOk(result)) return result;
        last = result.value;
      }
      return ok(last);
    };
  }

  private compileNode(node: AnyNode): Op {
    // Resilient parsing: an error-diagnosed node runs as a warning.
    if (this.hasErrorDiagnostics(node)) {
      const diag = (node.diagnostics as readonly { message: string }[] | undefined)?.[0];
      const message = diag?.message || 'Skipped error node';
      return async () => {
        debug.runtime(`⚠️ RUNTIME: Skipping error node: ${message}`);
        this.runtimeWarnings.push(message);
        return ok(undefined);
      };
    }
    switch (node.type) {
      case 'command': {
        // The signal, if any, travels as a Result to the boundary that
        // consumes it — the loop, the function, the handler, or the program.
        const command = node as CommandNode;
        const bodies: BodyOps = (command.args ?? []).map(arg =>
          isBodyNode(arg) ? this.compile(arg) : undefined
        );
        const hasBodies = bodies.some(Boolean);
        return context =>
          this.processCommandWithResult(command, context, hasBodies ? bodies : undefined);
      }
      case 'initBlock':
      case 'block': {
        const block = node as BlockNode | InitBlockNode;
        const ops = (Array.isArray(block.commands) ? block.commands : []).map(c => this.compile(c));
        // An `init` block consumes `halt` (as `executeBlock` always did for
        // it). A command body — an `if` branch, a loop body — is a plain
        // block and passes EVERY signal to the command that owns it; those
        // bodies never went through `executeBlock`, and the control-flow
        // matrix's "inside if"/"inside repeat" columns pin that.
        const consumesHalt = node.type === 'initBlock';
        return async context => {
          for (const op of ops) {
            const result = await op(context);
            if (isOk(result)) continue;
            if (consumesHalt && result.error.type === 'halt') break;
            return result;
          }
          return ok(undefined);
        };
      }
      case 'sequence':
      case 'CommandSequence': {
        // Two producers reach this arm: the full parser's `CommandSequence`
        // and the hybrid parser's `sequence`. Both carry `commands`.
        const seqNode = node as CommandSequenceNode | HybridSequenceNode;
        return context => this.executeCommandSequenceWithResult(seqNode.commands || [], context);
      }
      case 'Program': {
        return context => this.executeProgram(node as ProgramNode, context);
      }
      default:
        return context => this.dispatch(node, context);
    }
  }

  /** The per-execution path for the kinds `compile` does not bind structurally. */
  private async dispatch(
    node: AnyNode,
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    debug.runtime(`RUNTIME BASE: dispatch node type: '${node.type}'`);
    switch (node.type) {
      case 'eventHandler': {
        return ok(await this.executeEventHandler(node as EventHandlerNode, context));
      }

      case 'event': {
        // The hybrid parser's `event` node (a separate producer — Arc 5 owns
        // it) is adapted into a union `EventHandlerNode` before execution.
        // Typed as that converter (Arc 2 step 4): `body` crosses through
        // `fromHybridStatements`, the one sanctioned crossing for it.
        //
        // `filter` is a hybrid AST node, not a string. It was always handed
        // to `target` under a string cast, and the runtime's target
        // resolution then falls through to `queryElements(target)`. That is
        // pre-existing behaviour a types-only step must not change, so the
        // cast stays — visibly, on one line, with this note.
        const hybrid = node as HybridEventNode;
        const adaptedNode: EventHandlerNode = {
          type: 'eventHandler',
          event: hybrid.event,
          events: [hybrid.event],
          commands: fromHybridStatements(hybrid.body || []),
          target: hybrid.filter as string | undefined,
          modifiers: hybrid.modifiers || {},
        };
        return ok(await this.executeEventHandler(adaptedNode, context));
      }

      case 'behavior': {
        return ok(await this.executeBehaviorDefinition(node as BehaviorNode, context));
      }

      case 'def': {
        return ok(this.installFunction(node as DefNode, context));
      }

      case 'objectLiteral': {
        return ok(await this.executeObjectLiteral(node as ObjectLiteralNode, context));
      }

      case 'templateLiteral':
      case 'memberExpression':
      default: {
        return await this.evaluateExpressionWithResult(node, context);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Result-Based Execution (napi-rs inspired pattern)
  // --------------------------------------------------------------------------
  // These methods use the Result<T, E> pattern instead of exceptions for
  // control flow, providing ~18% performance improvement on hot paths.

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
    context: ExecutionContext,
    bodies?: BodyOps
  ): Promise<ExecutionResult<unknown>> {
    const { name, args, modifiers } = node;
    const commandName = name.toLowerCase();

    debug.command(`RUNTIME BASE (Result): Processing command '${commandName}'`);

    // 1. Check registry
    if (!this.registry.has(commandName)) {
      // Return error as exception (not a control flow signal)
      const errorMsg = `Unknown command: ${name}. Ensure it is registered in the Runtime options.`;
      this.logWarn(errorMsg);
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
        bodies,
        // Pass command name for consolidated commands (e.g., show/hide → VisibilityCommand)
        commandName,
        runtime: this,
      });
      // A signal command RETURNS its signal (Arc 4a); route it as control flow.
      if (isSignal(result)) return err(result);
      return ok(result);
    } catch (e) {
      // Signals never throw (a signal command RETURNS its signal); anything
      // caught here is a real error.
      this.logError(`Error executing command '${commandName}':`, e);
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
    commands: readonly AnyNode[],
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    let lastResult: unknown = undefined;

    for (const command of commands) {
      // Resilient parsing: skip error-diagnosed nodes
      if (this.hasErrorDiagnostics(command)) {
        const diag = (command.diagnostics as readonly { message: string }[] | undefined)?.[0];
        debug.runtime(`⚠️ RUNTIME: Skipping error node: ${diag?.message || 'unknown error'}`);
        this.runtimeWarnings.push(diag?.message || 'Skipped error node');
        continue;
      }

      // For commands, use Result-based execution
      if (command.type === 'command') {
        const result = await this.compile(command)(context);

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
  protected async evaluateExpression(node: AnyNode, context: ExecutionContext): Promise<unknown> {
    // Canonical AST evaluation. The bundle's ExpressionRegistry is threaded
    // through `context.registry` so named-expression operators (`ends with`,
    // `is in`, `as`, etc.) resolve via the registry instead of static imports.
    const ctx = context.registry ? context : { ...context, registry: this.expressionRegistry };
    const result = await evaluateAST(node, ctx);

    // Check for "Implicit Command Pattern" (e.g. "add .class") — happens when
    // the parser sees "word token" but interprets as property access.
    if (isImplicitCommand(result)) {
      // The implicit `add .class` pattern, on the Result path (the only path).
      const commandNode: CommandNode = {
        type: 'command',
        name: result.command,
        args: [{ type: 'literal', value: result.selector }],
        isBlocking: false,
      };
      const executed = await this.processCommandWithResult(commandNode, context);
      // `add`/`remove`/`toggle` never signal; a signal here is a stray.
      if (!isOk(executed)) throw new StrayControlFlowError(executed.error);
      return executed.value;
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
    node: AnyNode,
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    const ctx = context.registry ? context : { ...context, registry: this.expressionRegistry };
    const result = await evaluateASTWithResult(node, ctx);

    if (!isOk(result)) {
      return result; // Propagate signal
    }

    const value = result.value;

    // Check for "Implicit Command Pattern" (e.g. "add .class")
    if (isImplicitCommand(value)) {
      // The runtime is a second PRODUCER of command nodes here (the implicit
      // `add .class` pattern). `isBlocking: false` is what its absence meant.
      const commandNode: CommandNode = {
        type: 'command',
        name: value.command,
        args: [{ type: 'literal', value: value.selector }],
        isBlocking: false,
      };
      return this.processCommandWithResult(commandNode, context);
    }

    return ok(value);
  }

  // --------------------------------------------------------------------------
  // Structure Executors (Program, Block, Sequence)
  // --------------------------------------------------------------------------

  /**
   * Install a `def` function into scope.
   *
   * `def … end` parsed cleanly long before anything executed it: the switch above
   * had no `def` case, so a DefNode fell through to `evaluateAST` and threw
   * `Unknown AST node type: def` — the syntax looked supported and did nothing.
   *
   * The function goes into `context.globals`, which `evaluateIdentifier` already
   * resolves (locals -> globals -> context props -> globalThis) and which
   * `createEventHandler` passes by reference, so a handler registered earlier
   * still sees a def installed later. Upstream _hyperscript instead assigns
   * body-level defs onto the real `window` and element-level defs into
   * per-element storage inherited down the DOM; we deliberately diverge, to
   * avoid polluting the global namespace with no teardown. A namespaced
   * `def utils.foo()` therefore installs under the flat key `"utils.foo"` rather
   * than creating a nested object.
   *
   * Error handling is the shape #768 gave `on` handlers, and for the same
   * reason — upstream shares one `parseErrorAndFinally` between the two
   * features, so they must not drift: the error binds as a local under the
   * author's symbol, a handled error does NOT propagate, `finally` runs on both
   * paths, and control-flow signals never route to `catch`.
   */
  protected installFunction(node: DefNode, context: ExecutionContext): void {
    const runtime = this;
    const params = node.params ?? [];
    const body = node.body ?? [];
    const errorHandler = node.errorHandler;
    const finallyHandler = node.finallyHandler;
    const errorSymbol = node.errorSymbol;
    // The FUNCTION's bodies compile once, at installation (Arc 4b step 3).
    const bodyOp = this.compileSequence(body);
    const errorOp = errorHandler ? this.compileSequence(errorHandler) : undefined;
    const finallyOp = finallyHandler ? this.compileSequence(finallyHandler) : undefined;

    const fn = async (...args: unknown[]): Promise<unknown> => {
      // Fresh locals per call, seeded from the declaring scope. Globals stay by
      // reference so a def can see (and set) globals like any other code.
      const fnContext: ExecutionContext = {
        ...context,
        locals: new Map(context.locals),
      };
      params.forEach((name, i) => {
        if (name) fnContext.locals.set(name, args[i]);
      });

      // The FUNCTION boundary (Arc 4a): `halt`/`exit` end the function (the
      // call returns undefined; halt's event side effect already happened),
      // `return` hands its value to the caller, and the caller continues —
      // upstream's rule. `break`/`continue` have no loop here and stay errors.
      const run = async (op: Op): Promise<unknown> => {
        const result = await op(fnContext);
        if (!isOk(result)) {
          const signal = result.error;
          if (signal.type === 'break' || signal.type === 'continue') {
            throw new StrayControlFlowError(signal);
          }
          return signal.type === 'return' ? signal.returnValue : undefined;
        }
        return result.value;
      };

      if (!errorOp && !finallyOp) {
        return await run(bodyOp);
      }

      try {
        return await run(bodyOp);
      } catch (e) {
        if (!errorOp || e instanceof StrayControlFlowError) throw e;
        if (errorSymbol) fnContext.locals.set(errorSymbol, e);
        return await run(errorOp);
      } finally {
        if (finallyOp) {
          await run(finallyOp);
        }
      }
    };

    context.globals.set(node.name, fn);
  }

  protected async executeProgram(
    node: ProgramNode,
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    if (!node.statements || !Array.isArray(node.statements)) return ok(undefined);

    let lastResult: unknown = undefined;

    // Separate statements into categories for proper execution order
    // Event handlers MUST be registered before init blocks run
    // This ensures that events sent during init are properly received
    const eventHandlers: Stmt[] = [];
    const defs: Stmt[] = [];
    const initBlocks: Stmt[] = [];
    const otherStatements: Stmt[] = [];

    for (const statement of node.statements) {
      if (statement.type === 'eventHandler') {
        eventHandlers.push(statement);
      } else if (statement.type === 'def') {
        defs.push(statement);
      } else if (statement.type === 'initBlock') {
        initBlocks.push(statement);
      } else {
        otherStatements.push(statement);
      }
    }

    // Phase 0: Install function declarations. `def` is a declaration, not
    // executable code, and an `init` block is the reverse — so a def has to be
    // callable before init runs, exactly as a handler has to be registered
    // before init can send to it.
    for (const def of defs) {
      void this.executeNode(def, context);
    }

    // The statement loops read Results (Arc 4a step 3): `halt`/`exit` end
    // the program, `return` ends it with a value, and a stray
    // `break`/`continue` propagates to the program boundary, which throws it.
    // Phase 1: Register all event handlers first
    for (const handler of eventHandlers) {
      const result = await this.executeNode(handler, context);
      if (isOk(result)) continue;
      if (result.error.type === 'halt' || result.error.type === 'exit') break;
      return result;
    }

    // Phase 2: Execute init blocks (now handlers are registered)
    for (const init of initBlocks) {
      const result = await this.executeNode(init, context);
      if (isOk(result)) {
        lastResult = result.value;
        continue;
      }
      if (result.error.type === 'halt' || result.error.type === 'exit') break;
      if (result.error.type === 'return') {
        lastResult = result.error.returnValue;
        break;
      }
      return result;
    }

    // Execute the remaining non-event-handler statements.
    for (const statement of otherStatements) {
      const result = await this.executeNode(statement, context);
      if (isOk(result)) {
        lastResult = result.value;
        continue;
      }
      if (result.error.type === 'halt' || result.error.type === 'exit') break;
      if (result.error.type === 'return') {
        lastResult = result.error.returnValue;
        break;
      }
      return result;
    }

    return ok(lastResult);
  }

  protected async executeBlock(
    node: BlockNode | InitBlockNode,
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    return this.compile(node)(context);
  }

  protected async executeObjectLiteral(
    node: ObjectLiteralNode,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    if (!node.properties) return result;

    for (const property of node.properties) {
      let key: string;
      // Key evaluation logic
      if (property.key.type === 'identifier') {
        key = property.key.name;
      } else if (property.key.type === 'literal') {
        key = String(property.key.value);
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

  protected async executeBehaviorDefinition(
    // `imperativeInstaller` is NOT a union field, on purpose. Nothing in this
    // repo emits it — `parser.ts:3230` is the only `type: 'behavior'` producer
    // and it writes name/parameters/eventHandlers/initBlock — so promoting it
    // into `BehaviorNode` would put a shape the parser never builds into the
    // file that describes what the parser builds. But `execute` is public and
    // this method is `protected` on a published class, so the branch below is
    // reachable from outside and deleting it would be a behaviour change a
    // types-only arc cannot make. It stays as an intersection at this one site.
    node: BehaviorNode & {
      readonly imperativeInstaller?: (
        element: HTMLElement,
        parameters: Record<string, any>
      ) => void;
    },
    _context: ExecutionContext
  ): Promise<void> {
    const { name, parameters = [], eventHandlers = [], initBlock } = node;
    const imperativeInstaller = node.imperativeInstaller;

    if (typeof imperativeInstaller === 'function') {
      // Imperative behavior: store the installer function directly
      this.behaviorRegistry.set(name, {
        name,
        parameters,
        type: 'imperative',
        install: imperativeInstaller,
      });
      debug.runtime(`RUNTIME BASE: Registered imperative behavior '${name}'`);
    } else {
      // Hyperscript behavior: store AST for event-handler-based installation
      // `BehaviorEntry.initBlock` is the frozen public `ASTNode`; the union's
      // is a `Stmt`. Same node, crossed once (see `ast/legacy.ts`).
      this.behaviorRegistry.set(name, {
        name,
        parameters,
        eventHandlers,
        initBlock: initBlock && toLegacyNode(initBlock),
      });
      debug.runtime(`RUNTIME BASE: Registered behavior '${name}'`);
    }
  }

  protected async installBehaviorOnElement(
    behaviorName: string,
    element: HTMLElement,
    parameters: Record<string, any>
  ): Promise<void> {
    debug.runtime(`BEHAVIOR: installBehaviorOnElement called: ${behaviorName}`);
    let behavior = this.behaviorRegistry.get(behaviorName);
    if (!behavior) {
      // Try resolver before throwing
      if (this.behaviorAPI.resolve && this.behaviorAPI.resolve(behaviorName)) {
        behavior = this.behaviorRegistry.get(behaviorName);
      }
      if (!behavior) throw new Error(`Behavior "${behaviorName}" not found`);
    }

    // Imperative behavior: call the installer directly and return
    if (behavior.type === 'imperative') {
      if (typeof behavior.install === 'function') {
        debug.runtime(`BEHAVIOR: Installing imperative behavior '${behaviorName}'`);
        behavior.install(element, parameters);
        debug.runtime(`BEHAVIOR: Finished installing imperative behavior '${behaviorName}'`);
      }
      return;
    }

    debug.runtime(
      `BEHAVIOR: Found behavior, eventHandlers count: ${behavior.eventHandlers?.length || 0}`
    );

    // Create isolated context. Thread the bundle's ExpressionRegistry so
    // behaviors whose event handlers evaluate expressions directly (e.g. via
    // command parseInput's evaluator) see the same registry as the rest of
    // the runtime. Without this, the registry is recovered later at
    // runtime.execute(), but only after every entry point. Symmetric with the
    // event/mutation/change contexts below which spread `...context`.
    const baseBehaviorContext: ExecutionContext = {
      me: element,
      owner: element, // Element that owns `:name` scope; preserved via `...context` spreads below
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: this.globalVariables,
      registry: this.expressionRegistry,
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

    // Run Init Block (with timeout protection)
    if (behavior.initBlock) {
      debug.runtime(`BEHAVIOR: Running init block for ${behaviorName}`);
      const timeout = this.options.commandTimeout ?? 10000;
      try {
        await Promise.race([
          this.execute(behavior.initBlock, behaviorContext),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`Behavior "${behaviorName}" init block timed out after ${timeout}ms`)
                ),
              timeout
            )
          ),
        ]);
        debug.runtime(`BEHAVIOR: Init block completed for ${behaviorName}`);
      } catch (e) {
        debug.runtime(`BEHAVIOR: Init block error for ${behaviorName}:`, e);
        throw e;
      }
    }

    // Attach Handlers (with timeout protection)
    debug.runtime(
      `BEHAVIOR: About to attach ${behavior.eventHandlers?.length || 0} handlers for ${behaviorName}`
    );
    if (behavior.eventHandlers) {
      const timeout = this.options.commandTimeout ?? 10000;
      for (const handler of behavior.eventHandlers) {
        await Promise.race([
          this.executeEventHandler(handler, behaviorContext),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Behavior "${behaviorName}" handler attachment timed out after ${timeout}ms`
                  )
                ),
              timeout
            )
          ),
        ]);
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
      condition,
      attributeName,
      watchTarget,
      modifiers,
      errorSymbol,
      errorHandler,
      finallyHandler,
    } = node;
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
    const customEventSource = node.customEventSource;
    if (customEventSource && this.registryIntegration) {
      debug.runtime(
        `BEHAVIOR: executeEventHandler - Using custom event source '${customEventSource}' for event '${event}'`
      );

      // Create event handler that executes the commands. Custom event
      // sources may emit arbitrary payloads (not just DOM `Event` instances),
      // so eventData is opaque and assigned to `event` with a cast.
      const customEventHandler = async (eventData: unknown) => {
        // Context Hydration
        const eventLocals = new Map(context.locals);
        const baseEventContext: ExecutionContext = {
          ...context,
          locals: eventLocals,
          it: eventData,
          event: eventData as Event | undefined,
        };

        // Enhance context with registered providers
        const eventContext = this.enhanceContext(baseEventContext);

        // Execute commands
        debug.runtime(`CUSTOM EVENT: Executing commands for event '${event}'`);
        try {
          await this.execute({ type: 'program', commands }, eventContext);
        } catch (e) {
          this.logError(`[HyperFixi] Error executing commands for custom event '${event}':`, e);
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
        this.logError(
          `[HyperFixi] Failed to subscribe to custom event source '${customEventSource}':`,
          error
        );
      }

      return;
    }

    // STANDARD CASE: DOM Event Listeners
    // Create handler via helper to limit closure scope — only captures what's needed,
    // not the full executeEventHandler scope (node, targets, globalTarget, eventNames, etc.)
    // KNOWN GAP: the filter is applied only to SINGLE-event handlers. The
    // parser attaches ONE `condition` to the whole node even when the filter
    // syntactically belongs to one leg of an `or`-join — upstream gives each
    // event spec its own filter (`on click or keypress[key=='Enter']` filters
    // ONLY keypress). Gating every leg on the shared condition would break the
    // unfiltered legs (a plain click would evaluate `key=='Enter'` and never
    // run), so multi-event handlers keep their historical unfiltered behavior
    // until conditions are represented per event. Queued in
    // docs-internal/PARSER_NEXT_STEPS.md.
    const applicableCondition = eventNames.length === 1 ? condition : undefined;
    const baseEventHandler = RuntimeBase.createEventHandler(
      this,
      commands,
      context,
      selector,
      args,
      { errorSymbol, errorHandler, finallyHandler },
      applicableCondition
    );

    // Apply event modifiers
    let eventHandler: (domEvent: Event) => void | Promise<void>;
    let debounceCleanup: (() => void) | null = null;

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

        // Track cleanup for pending debounce timeout
        debounceCleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
          }
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
      // Register debounce cleanup for global listeners
      if (debounceCleanup) {
        if (targets.length > 0) {
          this.cleanupRegistry.registerCustom(targets[0], debounceCleanup, 'debounce-timeout');
        } else {
          this.cleanupRegistry.registerGlobal(debounceCleanup, 'timeout', 'debounce-timeout');
        }
      }
    } else {
      // Attach to HTMLElement targets
      for (const el of targets) {
        for (const evt of eventNames) {
          // `on resize` on a plain HTMLElement is not a native DOM event —
          // upstream _hyperscript 0.9.90 wires this via ResizeObserver so
          // users can observe size changes of specific elements. We dispatch
          // a synthetic CustomEvent('resize') so the handler's `event.detail`
          // carries the ResizeObserverEntry for consumers that want it.
          if (evt === 'resize' && typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(entries => {
              for (const entry of entries) {
                const synthetic = new CustomEvent('resize', {
                  detail: entry,
                  bubbles: false,
                  cancelable: false,
                });
                // Flag so downstream listeners/tests can distinguish from native resize
                (synthetic as Event & { synthetic?: boolean }).synthetic = true;
                // Apply once semantics manually — ResizeObserver fires repeatedly.
                eventHandler(synthetic);
                if (listenerOptions?.once) {
                  observer.disconnect();
                  break;
                }
              }
            });
            observer.observe(el);
            this.cleanupRegistry.registerCustom(el, () => observer.disconnect(), 'resize-observer');
            continue;
          }

          el.addEventListener(evt, eventHandler, listenerOptions);
          // Register for cleanup
          this.cleanupRegistry.registerListener(el, el, evt, eventHandler);
        }
        // Register debounce cleanup per element
        if (debounceCleanup) {
          this.cleanupRegistry.registerCustom(el, debounceCleanup, 'debounce-timeout');
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /**
   * Create a DOM event handler closure with minimal scope capture.
   * Extracted as a static method so the returned closure only captures the 5 parameters
   * (runtime, commands, context, selector, args) instead of the full executeEventHandler scope.
   */
  private static createEventHandler(
    runtime: RuntimeBase,
    commands: readonly AnyNode[],
    context: ExecutionContext,
    selector: string | undefined,
    args: string[] | undefined,
    errorBlocks?: {
      errorSymbol?: string;
      errorHandler?: readonly AnyNode[];
      finallyHandler?: readonly AnyNode[];
    },
    condition?: AnyNode
  ): (domEvent: Event) => Promise<void> {
    // The handler's bodies compile ONCE, here at registration (Arc 4b step 3);
    // the listener below runs the closures on every event.
    const bodyOp = runtime.compileSequence(commands);
    const errorOp = errorBlocks?.errorHandler
      ? runtime.compileSequence(errorBlocks.errorHandler)
      : undefined;
    const finallyOp = errorBlocks?.finallyHandler
      ? runtime.compileSequence(errorBlocks.finallyHandler)
      : undefined;
    return async (domEvent: Event) => {
      // Recursion Guard (uses WeakMap instead of expando property on Event)
      const currentDepth = eventRecursionDepth.get(domEvent) ?? 0;
      if (currentDepth >= 100) {
        return;
      }
      eventRecursionDepth.set(domEvent, currentDepth + 1);

      // Event Delegation Check
      if (selector && domEvent.target instanceof Element) {
        try {
          if (!domEvent.target.matches(selector) && !domEvent.target.closest(selector)) {
            return;
          }
        } catch {
          // Invalid CSS selector — skip delegation filter rather than crashing the handler
          debug.runtime(`Event delegation: invalid CSS selector '${selector}', skipping filter`);
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
      const eventContext = runtime.enhanceContext(baseEventContext);

      // Arg Destructuring (e.g. on pointerdown(x, y))
      if (args && args.length > 0) {
        const eventObj = domEvent as Event & Record<string, unknown>;
        const detail = (eventObj as { detail?: Record<string, unknown> }).detail;
        for (const argName of args) {
          const value = eventObj[argName] ?? detail?.[argName] ?? null;
          eventContext.locals.set(argName, value);
        }
      }

      // Event filter (`on keydown[key=='Escape'] …`): upstream evaluates the
      // bracketed expression against the EVENT before running the body — bare
      // identifiers in the filter resolve to properties of the event. The
      // parser has always delivered it as `node.condition`, but nothing here
      // consumed it, so every filtered handler ran UNFILTERED (found by the
      // shipped-examples execution gate: the modal.html Escape filter hid
      // every modal on any key; upstream correctly did nothing).
      //
      // Placed AFTER arg destructuring so `on pointerdown(x, y)[x > 3]` can
      // reference destructured args. Identifiers the filter names are resolved
      // from the event into locals first — unless already bound (behavior-init
      // locals and the `target` local take precedence). An evaluation ERROR
      // also skips the body: upstream wraps the body in `if (<filter>)`, so a
      // throwing filter never runs it either.
      if (condition) {
        const eventProps = domEvent as unknown as Record<string, unknown>;
        for (const name of collectIdentifierNames(condition)) {
          if (!eventContext.locals.has(name) && name in eventProps) {
            eventContext.locals.set(name, eventProps[name]);
          }
        }
        let filterResult: unknown;
        try {
          filterResult = await runtime.evaluateExpression(condition, eventContext);
        } catch (e) {
          debug.runtime(`Event filter threw; skipping handler body:`, e);
          return;
        }
        if (!filterResult) {
          return;
        }
      }

      // Execution
      //
      // No `it`/`result` propagation from the command's RETURN value: commands
      // that produce a user-facing value assign `context.it` themselves inside
      // execute(), and the adapter copies that back — a mechanism that runs on
      // EVERY execution path, unlike this loop, which only ever ran here and in
      // the lazy attribute stub. The removed `unwrapCommandResult` sniffed
      // return shapes through seven branches; all seven were redundant with
      // self-assignment, and what it uniquely contributed was ~21 internal
      // wrapper objects leaking into `it` plus an array collapse that took the
      // first element of `toggle`/`put`'s element list. See
      // docs-internal/HANDOFF-command-arch-output-contract.md.
      // The HANDLER boundary (Arc 4a): `halt`/`exit` end the handler,
      // `return` ends it and its value lands in `it`/`result`. A stray
      // `break`/`continue` is thrown as the error it is.
      // The HANDLER's bodies were compiled once at registration (Arc 4b
      // step 3); each event runs the closures. halt/exit end the handler,
      // return ends it with its value in it/result, a stray break/continue
      // is thrown as the error it is.
      runtime.prepareContext(eventContext);
      const runBody = async (op: Op): Promise<void> => {
        let outcome: ExecutionResult<unknown>;
        try {
          outcome = await op(eventContext);
        } catch (e) {
          runtime.logError(`COMMAND FAILED:`, e);
          throw e;
        }
        if (isOk(outcome)) return;
        const signal = outcome.error;
        if (signal.type === 'return' && signal.returnValue !== undefined) {
          Object.assign(eventContext, { it: signal.returnValue, result: signal.returnValue });
        }
        if (signal.type === 'break' || signal.type === 'continue') {
          throw new StrayControlFlowError(signal);
        }
      };

      // No `catch`/`finally` on this handler — behave exactly as before, including
      // letting the error escape to the page after the COMMAND FAILED log.
      if (!errorOp && !finallyOp) {
        await runBody(bodyOp);
        return;
      }

      // `on <event> … catch <sym> … finally … end` (upstream _hyperscript semantics:
      // the error is bound as a local under the author's symbol, a handled error
      // does NOT propagate, and `finally` runs on both paths).
      try {
        await runBody(bodyOp);
      } catch (e) {
        // A stray break/continue is not an error the author wrote a `catch`
        // for and is not routed to it; `finally` alone never swallows.
        if (!errorOp || e instanceof StrayControlFlowError) throw e;
        if (errorBlocks?.errorSymbol) {
          eventContext.locals.set(errorBlocks.errorSymbol, e);
        }
        await runBody(errorOp);
      } finally {
        if (finallyOp) {
          await runBody(finallyOp);
        }
      }
    };
  }

  protected setupMutationObserver(
    targets: HTMLElement[],
    attr: string,
    commands: readonly AnyNode[],
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
              let outcome: ExecutionResult<unknown> | undefined;
              try {
                outcome = await this.executeNode(command, mutationContext);
              } catch (error) {
                this.logError(`Error executing mutation handler command:`, error);
              }
              // halt/exit/return end the mutation body; a stray break/continue is
              // ignored here, as it always was.
              if (outcome && !isOk(outcome)) {
                const t = outcome.error.type;
                if (t === 'halt' || t === 'exit' || t === 'return') break;
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
    watchTarget: AnyNode,
    commands: readonly AnyNode[],
    context: ExecutionContext
  ): Promise<void> {
    debug.runtime(`RUNTIME BASE: Setting up MutationObserver for content changes on watch target`);

    // Evaluate the watchTarget expression to get the target element(s)
    const watchTargetResult = await this.execute(watchTarget, context);
    let watchTargetElements: HTMLElement[] = [];

    if (this.isElement(watchTargetResult)) {
      watchTargetElements = [watchTargetResult];
    } else if (Array.isArray(watchTargetResult)) {
      watchTargetElements = watchTargetResult.filter((el: unknown) => this.isElement(el));
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
              let outcome: ExecutionResult<unknown> | undefined;
              try {
                outcome = await this.executeNode(command, changeContext);
              } catch (error) {
                this.logError(`Error executing change handler command:`, error);
              }
              // halt/exit/return end the change body; a stray break/continue is
              // ignored here, as it always was.
              if (outcome && !isOk(outcome)) {
                const t = outcome.error.type;
                if (t === 'halt' || t === 'exit' || t === 'return') break;
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
    const me = context.me;
    const doc =
      (me instanceof Element ? me.ownerDocument : null) ??
      (typeof document !== 'undefined' ? document : null);
    if (!doc) return [];
    // Handle hyperscript queryReference syntax <tag/>
    let cleanSelector = selector;
    if (cleanSelector.startsWith('<') && cleanSelector.endsWith('/>')) {
      cleanSelector = cleanSelector.slice(1, -2).trim(); // Remove '<' and '/>' and whitespace
    }
    try {
      return Array.from(doc.querySelectorAll(cleanSelector));
    } catch {
      // Invalid CSS selector — return empty array instead of crashing
      debug.runtime(`queryElements: invalid CSS selector '${cleanSelector}'`);
      return [];
    }
  }

  protected isElement(obj: unknown): obj is HTMLElement {
    if (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement) return true;
    // Duck-type check for JSDOM/polyfill environments where instanceof fails
    if (obj && typeof obj === 'object') {
      const el = obj as Record<string, unknown>;
      return !!el.style && !!el.classList;
    }
    return false;
  }
}
