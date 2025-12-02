/**
 * Hyperscript Runtime Base
 * Core execution engine with ZERO hard dependencies on specific commands.
 * Designed for tree-shaking: strict dependency injection pattern.
 */

import type {
  ASTNode,
  ExecutionContext,
  CommandNode,
  EventHandlerNode,
} from '../types/base-types';

import { ExpressionEvaluator } from '../core/expression-evaluator';
import { LazyExpressionEvaluator } from '../core/lazy-expression-evaluator';
import { CommandRegistry } from './command-adapter';
import { getSharedGlobals } from '../core/context';
import { asHTMLElement } from '../utils/dom-utils';
import { debug } from '../utils/debug';

// Helper to check AST node types
function nodeType(node: ASTNode): string {
  return (node as any).type || node.type;
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
   * Optional custom evaluator. If not provided, defaults to standard/lazy based on preload config.
   */
  expressionEvaluator?: ExpressionEvaluator | LazyExpressionEvaluator;
}

export class RuntimeBase {
  protected options: RuntimeBaseOptions;
  protected registry: CommandRegistry;
  protected expressionEvaluator: ExpressionEvaluator | LazyExpressionEvaluator;
  protected behaviorRegistry: Map<string, any>;
  protected behaviorAPI: any;
  protected globalVariables: Map<string, any>;

  constructor(options: RuntimeBaseOptions) {
    this.options = {
      commandTimeout: 10000,
      enableErrorReporting: true,
      ...options
    };

    this.registry = options.registry;
    this.expressionEvaluator = options.expressionEvaluator || new ExpressionEvaluator();
    this.behaviorRegistry = new Map();
    this.globalVariables = getSharedGlobals();

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
   * Main Entry Point: Execute an AST node
   */
  async execute(node: ASTNode, context: ExecutionContext): Promise<unknown> {
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
          return await this.processCommand(node as CommandNode, context);
        }

        case 'eventHandler': {
          return await this.executeEventHandler(node as EventHandlerNode, context);
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

        case 'CommandSequence': {
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
                // Pass runtime reference just in case command needs to re-enter runtime
                runtime: this
            });
        } catch (e) {
             // Don't log control flow errors - they're expected signals
             const isControlFlowError = e instanceof Error &&
                 ((e as any).isHalt === true || (e as any).isExit === true || e.message === 'HALT_EXECUTION' || e.message === 'EXIT_COMMAND');
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

  /**
   * Evaluate Expression (Delegator)
   * Handles standard expressions + the "implicit command pattern" (space operator)
   */
  protected async evaluateExpression(node: ASTNode, context: ExecutionContext): Promise<unknown> {
    // 1. Standard Evaluation
    const result = await this.expressionEvaluator.evaluate(node, context);

    // 2. Check for "Implicit Command Pattern" (e.g. "add .class")
    // This happens when the parser sees "word token" but interprets as property access
    if (result && typeof result === 'object' && (result as any).command && (result as any).selector) {
        return await this.executeCommandFromPattern(
            (result as any).command, 
            (result as any).selector, 
            context
        );
    }

    return result;
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
         args: args
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

  protected async executeCommandSequence(node: { commands: ASTNode[] }, context: ExecutionContext): Promise<unknown> {
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
    const behavior = this.behaviorRegistry.get(behaviorName);
    if (!behavior) throw new Error(`Behavior "${behaviorName}" not found`);

    // Create isolated context
    const behaviorContext: ExecutionContext = {
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
        try {
            await this.execute(behavior.initBlock, behaviorContext);
        } catch (e) {
            if (!(e instanceof Error && (e as any).isHalt)) throw e;
        }
    }

    // Attach Handlers
    if (behavior.eventHandlers) {
        for (const handler of behavior.eventHandlers) {
            await this.executeEventHandler(handler, behaviorContext);
        }
    }
  }

  protected async executeEventHandler(
    node: EventHandlerNode,
    context: ExecutionContext
  ): Promise<void> {
    const { event, events, commands, target, args, selector, attributeName, watchTarget } = node as any;
    const eventNames = events && events.length > 0 ? events : [event];

    let targets: HTMLElement[] = [];
    let globalTarget: Window | Document | null = null;

    // Target Resolution
    if (target) {
        // Check for global event sources (window, document)
        const targetLower = typeof target === 'string' ? target.toLowerCase() : '';
        if (targetLower === 'window' || targetLower === 'the window') {
            globalTarget = window;
        } else if (targetLower === 'document' || targetLower === 'the document' || targetLower === 'body') {
            globalTarget = document;
        } else if (typeof target === 'string' && context.locals.has(target)) {
            const resolved = context.locals.get(target);
            if (this.isElement(resolved)) targets = [resolved];
            else if (Array.isArray(resolved)) targets = resolved.filter(el => this.isElement(el));
            else if (typeof resolved === 'string') targets = this.queryElements(resolved, context);
        } else {
            targets = this.queryElements(target, context);
        }
    } else {
        targets = context.me ? [context.me as HTMLElement] : [];
    }

    if (targets.length === 0 && !globalTarget) return;

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

    // STANDARD CASE: DOM Event Listeners
    const eventHandler = async (domEvent: Event) => {
        // Recursion Guard
        const currentDepth = (domEvent as any).__hyperfixi_recursion_depth || 0;
        if (currentDepth >= 100) return;
        (domEvent as any).__hyperfixi_recursion_depth = currentDepth + 1;

        // Event Delegation Check
        if (selector && domEvent.target instanceof Element) {
            if (!domEvent.target.matches(selector) && !domEvent.target.closest(selector)) {
                return; 
            }
        }

        // Context Hydration
        const eventLocals = new Map(context.locals);
        const eventContext: ExecutionContext = {
            ...context,
            locals: eventLocals,
            it: domEvent,
            event: domEvent,
        };
        eventContext.locals.set('target', domEvent.target);

        // Arg Destructuring (e.g. on pointerdown(x, y))
        if (args && args.length > 0) {
            for (const argName of args) {
                const value = (domEvent as any)[argName] || (domEvent as any).detail?.[argName] || null;
                eventContext.locals.set(argName, value);
            }
        }

        // Execution
        for (const command of commands) {
            try {
                const result = await this.execute(command, eventContext);
                if (result !== undefined) {
                    // Logic for extracting actual results from complex return types
                    // (e.g. CallCommand result wrapper, GetCommand { value }, etc.)
                    let val = result;
                    if (val && typeof val === 'object') {
                        const valObj = val as any;

                        // CallCommand returns { result, wasAsync }
                        if ('result' in valObj && 'wasAsync' in valObj) {
                            val = valObj.result;
                        }
                        // JsCommand returns { result, executed, codeLength, parameters }
                        else if ('result' in valObj && 'executed' in valObj) {
                            val = valObj.result;
                        }
                        // RepeatCommand/IfCommand returns { type, lastResult } or { conditionResult, executedBranch }
                        else if ('lastResult' in valObj && 'type' in valObj) {
                            val = valObj.lastResult;
                        }
                        // IfCommand returns { conditionResult, executedBranch, result }
                        // Don't clobber context.result with if command metadata - only update if branch produced a result
                        else if ('conditionResult' in valObj && 'executedBranch' in valObj) {
                            // Only update context.result if the branch actually produced a meaningful result
                            if (valObj.result !== undefined) {
                                val = valObj.result;
                            } else {
                                // Don't update it/result - the if command didn't produce a value
                                continue;
                            }
                        }
                        // GetCommand returns { value }
                        else if ('value' in valObj && Object.keys(valObj).length === 1) {
                            val = valObj.value;
                        }
                    }
                    if (Array.isArray(val) && val.length > 0) val = val[0];

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

    // Attach Listeners
    if (globalTarget) {
        // Attach to global event source (window or document)
        for (const evt of eventNames) {
            globalTarget.addEventListener(evt, eventHandler);
        }
    } else {
        // Attach to HTMLElement targets
        for (const el of targets) {
            for (const evt of eventNames) {
                el.addEventListener(evt, eventHandler);
                // Optional: Store handler ref for cleanup if needed
            }
        }
    }
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  protected setupMutationObserver(targets: HTMLElement[], attr: string, commands: ASTNode[], context: ExecutionContext): void {
      debug.runtime(`RUNTIME BASE: Setting up MutationObserver for attribute '${attr}' on ${targets.length} elements`);

      for (const targetElement of targets) {
        const observer = new MutationObserver(async (mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === attr) {
              debug.event(`MUTATION DETECTED: attribute '${attr}' changed on`, targetElement);

              // Create context for mutation event
              const mutationContext: ExecutionContext = {
                ...context,
                me: targetElement,
                it: mutation,
                locals: new Map(context.locals),
              };

              // Store old and new values in context
              const oldValue = mutation.oldValue;
              const newValue = targetElement.getAttribute(attr);
              mutationContext.locals.set('oldValue', oldValue);
              mutationContext.locals.set('newValue', newValue);

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

        debug.runtime(`RUNTIME BASE: MutationObserver attached to`, targetElement, `for attribute '${attr}'`);
      }
  }

  protected async setupChangeObserver(watchTarget: ASTNode, commands: ASTNode[], context: ExecutionContext): Promise<void> {
      debug.runtime(`RUNTIME BASE: Setting up MutationObserver for content changes on watch target`);

      // Evaluate the watchTarget expression to get the target element(s)
      const watchTargetResult = await this.execute(watchTarget, context);
      let watchTargetElements: HTMLElement[] = [];

      if (this.isElement(watchTargetResult)) {
        watchTargetElements = [watchTargetResult];
      } else if (Array.isArray(watchTargetResult)) {
        watchTargetElements = watchTargetResult.filter((el: any) => this.isElement(el));
      }

      debug.runtime(`RUNTIME BASE: Watching ${watchTargetElements.length} target elements for content changes`);

      // Set up observer for each watch target
      for (const watchedElement of watchTargetElements) {
        const observer = new MutationObserver(async (mutations) => {
          for (const mutation of mutations) {
            // Detect content changes (childList or characterData)
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
              debug.event(`CONTENT CHANGE DETECTED on`, watchedElement, `mutation type:`, mutation.type);

              // Create context for change event
              const changeContext: ExecutionContext = {
                ...context,
                me: context.me, // Keep original 'me' (the element with the handler)
                it: mutation,
                locals: new Map(context.locals),
              };

              // Store the watched element in context as a local variable
              changeContext.locals.set('target', watchedElement);

              // Get old and new text content (if available)
              const oldValue = mutation.oldValue;
              const newValue = watchedElement.textContent;
              if (oldValue !== null) {
                changeContext.locals.set('oldValue', oldValue);
              }
              changeContext.locals.set('newValue', newValue);

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
          childList: true,      // Watch for child nodes being added/removed
          characterData: true,  // Watch for text content changes
          subtree: true,        // Watch all descendants
          characterDataOldValue: true, // Track old text values
        });

        debug.runtime(`RUNTIME BASE: MutationObserver attached to`, watchedElement, `for content changes`);
      }
  }

  protected queryElements(selector: string, context: ExecutionContext): HTMLElement[] {
    if (!context.me || typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll(selector));
  }

  protected isElement(obj: unknown): obj is HTMLElement {
    if (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement) return true;
    const objAny = obj as any;
    return (obj && typeof obj === 'object' && objAny.style && objAny.classList);
  }
}