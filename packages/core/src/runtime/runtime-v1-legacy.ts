/**
 * Hyperscript Runtime System
 * Executes parsed AST nodes with proper context management and DOM integration
 */

import type {
  ASTNode,
  ExecutionContext,
  CommandNode,
  ExpressionNode,
  EventHandlerNode,
} from '../types/base-types';
import type { TypedExecutionContext } from '../types/command-types';

import { ExpressionEvaluator } from '../core/expression-evaluator';
import { LazyExpressionEvaluator } from '../core/lazy-expression-evaluator';
import { PutCommand } from '../commands/dom/put';
import { getSharedGlobals } from '../core/context';
// SetCommand now imported from data/index.js above

// Helper to check AST node types (workaround for type system limitations)
function nodeType(node: ASTNode): string {
  return (node as any).type || node.type;
}

// Enhanced command imports
import { CommandRegistry } from './command-adapter';
import { asHTMLElement } from '../utils/dom-utils';
import { debug, debugGroup } from '../utils/debug';
import { createHideCommand } from '../commands/dom/hide';
import { createShowCommand } from '../commands/dom/show';
import { createToggleCommand } from '../commands/dom/toggle';
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createSendCommand } from '../commands/events/send';
import { createTriggerCommand } from '../commands/events/trigger';
// Legacy commands excluded from TypeScript project
// import { createWaitCommand } from '../legacy/commands/async/wait';
import { createFetchCommand } from '../commands/async/fetch';
import { createPutCommand } from '../commands/dom/put';
import { createSetCommand } from '../commands/data/set';
import { createIncrementCommand } from '../commands/data/increment';
import { createDecrementCommand } from '../commands/data/decrement';
import { createRenderCommand } from '../commands/templates/render';
import { createLogCommand } from '../commands/utility/log';

// Additional command imports
// IncrementCommand and DecrementCommand now imported from data/index.js above
// MakeCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 8)
// AppendCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 8)
// CallCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 6)
// JSCommand and TellCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 6)
// PickCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 3)
import { GoCommand } from '../commands/navigation/go';

// Control flow commands
// All control flow commands now registered via ENHANCED_COMMAND_FACTORIES (Phase 5)

// Animation commands
import { createTransitionCommand } from '../commands/animation/index';
// MeasureCommand, SettleCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 7)
// TakeCommand, TransitionCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 9)

// Data commands
// DefaultCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 3)

// Advanced commands
import { BeepCommand } from '../commands/advanced/index';
// AsyncCommand, TellCommand, JSCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 6)

// Template commands
// RenderCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 9)

export interface RuntimeOptions {
  enableAsyncCommands?: boolean;
  commandTimeout?: number;
  enableErrorReporting?: boolean;
  useEnhancedCommands?: boolean;
  /**
   * Enable lazy loading of commands for optimal bundle size
   * When true, commands are only loaded when first used (default: true)
   * Set to false for legacy eager loading behavior
   */
  lazyLoad?: boolean;
  /**
   * Specify which commands to load (only used with lazyLoad: true)
   * If not provided, all commands are available for lazy loading
   */
  commands?: string[];
  /**
   * Expression preloading strategy (Phase 2 optimization)
   * - 'core': Load only essential expressions (default, ~40KB)
   * - 'common': Load core + common expressions (~70KB)
   * - 'all': Eager load all expressions (legacy behavior, ~100KB)
   * - 'none': Maximum lazy loading (load on first use)
   *
   * Only used when lazyLoad is true.
   */
  expressionPreload?: 'core' | 'common' | 'all' | 'none';
}

export class Runtime {
  private options: RuntimeOptions;
  private expressionEvaluator: ExpressionEvaluator | LazyExpressionEvaluator;
  private putCommand: PutCommand;
  private commandRegistry: CommandRegistry;
  private behaviorRegistry: Map<string, any>;
  private behaviorAPI: any;
  private globalVariables: Map<string, any>; // Shared globals across all executions

  constructor(options: RuntimeOptions = {}) {
    this.options = {
      enableAsyncCommands: true,
      commandTimeout: 10000, // 10 seconds
      enableErrorReporting: true,
      useEnhancedCommands: true,
      lazyLoad: true, // Default to lazy loading for optimal bundle size
      expressionPreload: 'core', // Default to core expressions for Phase 2 optimization
      ...options,
    };

    // Phase 2 optimization: Use LazyExpressionEvaluator for lazy loading
    if (this.options.lazyLoad) {
      this.expressionEvaluator = new LazyExpressionEvaluator({
        preload: this.options.expressionPreload || 'core',
      });
    } else {
      // Legacy eager loading behavior
      this.expressionEvaluator = new ExpressionEvaluator();
    }
    this.putCommand = new PutCommand();
    this.behaviorRegistry = new Map();
    this.globalVariables = getSharedGlobals(); // Use shared globals from context module

    // Create behavior API with install method
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

    // Initialize command registry based on loading strategy
    if (this.options.lazyLoad) {
      // Lazy loading mode (default) - commands loaded on first use
      // Note: LazyCommandRegistry implements same interface as CommandRegistry
      this.commandRegistry = CommandRegistry.createWithLazyLoading(
        this.options.commands ? { commands: this.options.commands } : undefined
      ) as unknown as CommandRegistry;
    } else {
      // Legacy eager loading mode - all commands loaded upfront
      this.commandRegistry = CommandRegistry.createWithDefaults();
      this.initializeEnhancedCommands();
    }
  }

  /**
   * Phase 9: Legacy registration infrastructure removed
   * All commands now use enhanced pattern exclusively
   * registerLegacyCommand() and checkDuplicateRegistration() methods removed
   */

  /**
   * Initialize enhanced commands in the registry
   */
  private initializeEnhancedCommands(): void {
    if (!this.options.useEnhancedCommands) {
      return;
    }

    try {
      // Register DOM commands
      this.commandRegistry.register(createHideCommand());
      this.commandRegistry.register(createShowCommand());
      this.commandRegistry.register(createToggleCommand());
      this.commandRegistry.register(createAddCommand());
      this.commandRegistry.register(createRemoveCommand());
      this.commandRegistry.register(createPutCommand());

      // Register event commands
      this.commandRegistry.register(createSendCommand());
      this.commandRegistry.register(createTriggerCommand());

      // Register data commands (enhanced)
      try {
        const setCommand = createSetCommand();
        this.commandRegistry.register(setCommand);
      } catch (e) {
        // console.error('❌ Failed to register Enhanced SET command:', e);
      }

      // Register async commands
      // Legacy commands excluded - TODO: Implement enhanced versions
      // this.commandRegistry.register(createWaitCommand());
      this.commandRegistry.register(createFetchCommand());

      // Register data commands (enhanced)
      try {
        const incrementCommand = createIncrementCommand();
        this.commandRegistry.register(incrementCommand);
      } catch (e) {
        // console.error('❌ Failed to register Enhanced INCREMENT command:', e);
      }

      try {
        const decrementCommand = createDecrementCommand();
        this.commandRegistry.register(decrementCommand);
      } catch (e) {
        // console.error('❌ Failed to register Enhanced DECREMENT command:', e);
      }

      // Register utility commands (enhanced)
      try {
        const logCommand = createLogCommand();
        this.commandRegistry.register(logCommand);
      } catch (e) {
        // console.error('❌ Failed to register Enhanced LOG command:', e);
      }

      // Register content/creation commands
      // MakeCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 8)
      // AppendCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 8)

      // Register execution commands
      // CallCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 6)

      // Register advanced commands
      // JSCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 6)
      // TellCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 6)

      // Register utility commands
      // PickCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 3)

      // Register navigation commands (has TypedCommandImplementation)
      this.commandRegistry.register(new GoCommand());

      // Register control flow commands
      // Note: halt, break, continue migrated to enhanced pattern (Phase 2)
      // Note: return, throw migrated to enhanced pattern (Phase 4)
      // Note: if, unless migrated to enhanced pattern (Phase 5)
      // All control flow commands now registered via ENHANCED_COMMAND_FACTORIES
      // RepeatCommand is now registered as enhanced command via CommandRegistry

      // Register animation commands
      // MeasureCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 7)
      // SettleCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 7)
      // TakeCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 9)

      // Register transition as enhanced command
      try {
        debug.command('About to create transition command...');
        const transitionCommand = createTransitionCommand();
        debug.command('Transition command created:', transitionCommand);
        debug.command('Transition command metadata:', transitionCommand.metadata);
        debug.command('Transition command name:', transitionCommand.metadata?.name);

        debug.command('About to register transition command...');
        this.commandRegistry.register(transitionCommand);
        debug.command('Transition command registered in enhanced registry');
        debug.command('Available enhanced commands:', this.commandRegistry.getCommandNames());
        debug.command('Verify transition is in registry:', this.commandRegistry.has('transition'));
      } catch (e) {
        console.error('❌ Failed to register transition command:', e);
        console.error('❌ Error details:', {
          message: (e as any).message,
          stack: (e as any).stack,
          error: e,
        });
        // Phase 9: Legacy fallback removed - all commands use enhanced pattern
        throw new Error(`Failed to register enhanced TransitionCommand: ${(e as any).message}`);
      }

      // Register additional data commands
      // DefaultCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 3)

      // Register advanced commands
      this.commandRegistry.register(new BeepCommand());
      // AsyncCommand now registered via ENHANCED_COMMAND_FACTORIES (Phase 6)

      // Register template commands (enhanced)
      try {
        const renderCommand = createRenderCommand();
        this.commandRegistry.register(renderCommand);
      } catch (e) {
        // console.error('❌ Failed to register Enhanced RENDER command:', e);
        // Phase 9: Legacy fallback removed - all commands use enhanced pattern
        throw new Error(`Failed to register enhanced RenderCommand: ${(e as any).message}`);
      }

      if (this.options.enableErrorReporting) {
      }
    } catch (error) {
      if (this.options.enableErrorReporting) {
        console.warn('Failed to initialize some enhanced commands:', error);
      }
      // Fallback to legacy commands if enhanced initialization fails
      this.options.useEnhancedCommands = false;
    }
  }

  /**
   * Execute an AST node within the given execution context
   */
  async execute(node: ASTNode, context: ExecutionContext): Promise<unknown> {
    debug.runtime(`RUNTIME: execute() called with node type: '${node.type}'`);

    // Inject behavior API into context so install command can access it
    if (!context.locals.has('_behaviors')) {
      context.locals.set('_behaviors', this.behaviorAPI);
    }

    try {
      debug.runtime(`RUNTIME: About to enter switch with node.type='${node.type}'`);
      switch (node.type) {
        case 'command': {
          return await this.executeCommand(node as CommandNode, context);
        }

        case 'eventHandler': {
          return await this.executeEventHandler(node as EventHandlerNode, context);
        }

        case 'behavior': {
          return await this.executeBehaviorDefinition(node as any, context);
        }

        case 'Program': {
          debug.runtime(`RUNTIME: *** PROGRAM NODE DETECTED *** with node type: ${node.type}`);
          // Execute a program containing multiple statements (commands + event handlers)
          const program = node as any;
          debug.runtime(
            `RUNTIME: Program node statements check:`,
            program.statements ? `array with ${program.statements.length} items` : 'NO STATEMENTS'
          );

          if (!program.statements || !Array.isArray(program.statements)) {
            console.warn('Program node has no statements array:', program);
            return;
          }

          debug.runtime(`RUNTIME: Executing Program with ${program.statements.length} statements`);
          program.statements.forEach((stmt: any, idx: number) => {
            debug.runtime(
              `  Statement ${idx + 1}: type=${stmt.type}, name=${stmt.name || stmt.event || 'N/A'}`
            );
          });

          let lastResult: unknown = undefined;

          // Execute each statement in sequence
          for (const statement of program.statements) {
            debug.runtime(`RUNTIME: Executing statement: type=${statement.type}`);
            try {
              lastResult = await this.execute(statement, context);
            } catch (error) {
              // Check for halt execution - stop program gracefully
              if (error instanceof Error && (error as any).isHalt) {
                if (this.options.enableErrorReporting) {
                }
                break; // Stop executing remaining statements
              }

              if (this.options.enableErrorReporting) {
                // console.error('Error executing statement in program:', error, statement);
              }
              throw error;
            }
          }

          // Return the result of the last statement
          return lastResult;
        }

        case 'initBlock':
        case 'block': {
          // Execute the commands in the init block or generic block
          const block = node as any;
          if (block.commands && Array.isArray(block.commands)) {
            for (const command of block.commands) {
              try {
                await this.execute(command, context);
              } catch (error) {
                // Check for halt execution - stop block gracefully
                if (error instanceof Error && (error as any).isHalt) {
                  break; // Stop executing remaining commands in block
                }
                throw error; // Rethrow other errors
              }
            }
          }
          return;
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

        case 'templateLiteral': {
          // Explicitly handle template literals through expression evaluator
          // to ensure ${} expressions are evaluated
          return await this.expressionEvaluator.evaluate(node, context);
        }

        case 'memberExpression': {
          // Handle member expressions, especially with selector objects
          // e.g., #id.property or .class.property
          const memberExpr = node as any;

          // Check if the object is a selector (ID or CSS selector)
          if (memberExpr.object?.type === 'selector') {
            const selector = memberExpr.object.value;
            const propertyName = memberExpr.property?.name || memberExpr.property?.value;

            debug.runtime(
              `RUNTIME: memberExpression with selector '${selector}' accessing property '${propertyName}'`
            );

            // Query elements using the selector
            const elements = this.queryElements(selector, context);

            if (elements.length === 0) {
              debug.runtime(`RUNTIME: No elements found for selector '${selector}'`);
              return undefined;
            }

            // For single element, return the property value
            if (elements.length === 1) {
              const value = (elements[0] as any)[propertyName];
              debug.runtime(
                `RUNTIME: Single element found, property '${propertyName}' value:`,
                value
              );
              return value;
            }

            // For multiple elements, return array of property values
            const values = elements.map((el: any) => el[propertyName]);
            debug.runtime(
              `RUNTIME: ${elements.length} elements found, property values:`,
              values
            );
            return values;
          }

          // For non-selector member expressions, use expression evaluator
          return await this.expressionEvaluator.evaluate(node, context);
        }

        default: {
          // For all other node types, use the expression evaluator
          debug.runtime(
            `RUNTIME: DEFAULT CASE - About to call expression evaluator for node type '${node.type}'`
          );
          const result = await this.expressionEvaluator.evaluate(node, context);
          debug.runtime(`RUNTIME: DEFAULT CASE - Expression evaluator returned:`, result);

          // Check if the result is a command-selector pattern from space operator
          if (result && typeof result === 'object' && result.command && result.selector) {
            return await this.executeCommandFromPattern(result.command, result.selector, context);
          }

          return result;
        }
      }
    } catch (error) {
      if (this.options.enableErrorReporting) {
        // console.error('Runtime execution error:', error);
      }
      throw error;
    }
  }

  /**
   * Execute a command sequence (multiple commands in order)
   */
  private async executeCommandSequence(
    node: { commands: ASTNode[] },
    context: ExecutionContext
  ): Promise<unknown> {
    if (!node.commands || !Array.isArray(node.commands)) {
      console.warn('CommandSequence node has no commands array:', node);
      return;
    }

    let lastResult: unknown = undefined;

    // Execute each command in sequence
    for (const command of node.commands) {
      try {
        lastResult = await this.execute(command, context);
      } catch (error) {
        // Check for halt execution - stop sequence gracefully
        if (error instanceof Error && (error as any).isHalt) {
          if (this.options.enableErrorReporting) {
          }
          break; // Stop executing remaining commands
        }

        // Check for exit - stop event handler execution
        if (error instanceof Error && (error as any).isExit) {
          break; // Exit from command sequence
        }

        // Check for return - stop function/handler execution and return value
        if (error instanceof Error && (error as any).isReturn) {
          const returnValue = (error as any).returnValue;
          if (returnValue !== undefined) {
            // Use Object.assign to set readonly properties
            Object.assign(context, { it: returnValue, result: returnValue });
            return returnValue;
          }
          break; // Stop executing remaining commands
        }

        // Check for break - should be handled by loop commands
        if (error instanceof Error && (error as any).isBreak) {
          throw error; // Re-throw to be caught by enclosing loop
        }

        if (this.options.enableErrorReporting) {
          // console.error('Error executing command in sequence:', error, command);
        }
        throw error;
      }
    }

    // Return the result of the last command
    return lastResult;
  }

  /**
   * Execute an object literal node (convert to JavaScript object)
   */
  private async executeObjectLiteral(
    node: { properties: Array<{ key: ASTNode; value: ASTNode }> },
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    if (!node.properties || !Array.isArray(node.properties)) {
      console.warn('ObjectLiteral node has no properties array:', node);
      return {};
    }

    const result: Record<string, unknown> = {};

    // Evaluate each property
    for (const property of node.properties) {
      try {
        // Evaluate the key
        let key: string;
        if (property.key.type === 'identifier') {
          // For object literal keys that are identifiers, we usually want the name directly
          // unless it's meant to be evaluated as a variable
          // In hyperscript, {name: value} uses 'name' as literal key
          // But {[name]: value} or {(name): value} would evaluate 'name' as variable
          key = (property.key as unknown as { name: string }).name;
        } else if (property.key.type === 'literal') {
          key = String((property.key as unknown as { value: unknown }).value);
        } else {
          // For other key types, evaluate them
          const evaluatedKey = await this.execute(property.key, context);
          key = String(evaluatedKey);
        }

        // Evaluate the value
        const value = await this.execute(property.value, context);

        // Add to result object
        result[key] = value;
      } catch (error) {
        if (this.options.enableErrorReporting) {
          // console.error('Error executing object property:', error, property);
        }
        throw error;
      }
    }

    return result;
  }

  /**
   * Build command input from args and modifiers for multi-word commands
   * Returns null if this command doesn't use modifiers or should fall through to existing logic
   */
  private async buildCommandInputFromModifiers(
    name: string,
    args: ExpressionNode[],
    modifiers: Record<string, ExpressionNode>,
    context: ExecutionContext
  ): Promise<any | null> {
    switch (name) {
      case 'append': {
        // append <content> to <target>
        const content = args.length > 0 ? await this.execute(args[0], context) : undefined;
        const target = modifiers.to ? await this.execute(modifiers.to, context) : undefined;
        return { content, target };
      }

      case 'fetch': {
        // fetch <url> [as <type>] [with <options>]
        const url = args.length > 0 ? await this.execute(args[0], context) : undefined;

        // For 'as', extract the identifier name directly (json, html, text, etc.)
        let responseType: string | undefined;
        if (modifiers.as) {
          const asNode = modifiers.as as any;
          if (asNode.type === 'identifier') {
            // Use the identifier name as the response type
            responseType = asNode.name;
          } else {
            // Evaluate if it's an expression
            responseType = await this.execute(modifiers.as, context);
          }
        }

        const options = modifiers.with ? await this.execute(modifiers.with, context) : undefined;
        return { url, responseType, options };
      }

      case 'make': {
        // make (a|an) <type>
        const article = modifiers.a || modifiers.an;
        const type = args.length > 0 ? await this.execute(args[0], context) : undefined;
        return { type, article: article ? 'a' : undefined };
      }

      case 'send': {
        // send <event> to <target>
        const event = args.length > 0 ? await this.execute(args[0], context) : undefined;
        const target = modifiers.to ? await this.execute(modifiers.to, context) : undefined;
        return { event, target };
      }

      case 'throw': {
        // throw <error>
        const error = args.length > 0 ? await this.execute(args[0], context) : undefined;
        return { error };
      }

      case 'measure': {
        // Handle both old and new measure syntax:
        // - Old: "measure x and set var" (1 arg + modifier) -> property=x, target=me
        // - New: "measure <#elem/> x and set var" (2 args + modifier) -> target=#elem, property=x

        let target: any = undefined;
        let property: string | undefined;

        if (args.length === 1) {
          // Single argument: treat as property, target defaults to 'me'
          const propertyNode = args[0] as any;
          if (propertyNode.type === 'identifier') {
            property = propertyNode.name;
          } else {
            property = await this.execute(args[0], context);
          }
          // target stays undefined, will default to context.me in execute()
        } else {
          // Two or more arguments: first is target, second is property
          target = await this.execute(args[0], context);

          // Extract first element if target is an array/NodeList
          if (Array.isArray(target) && target.length > 0) {
            target = target[0];
          }

          // Property is an identifier - extract name without evaluating
          if (args.length > 1) {
            const propertyNode = args[1] as any;
            if (propertyNode.type === 'identifier') {
              property = propertyNode.name;
            } else {
              property = await this.execute(args[1], context);
            }
          }
        }

        // Variable from "and set" modifier
        let variable: string | undefined;
        if (modifiers.set) {
          const setNode = modifiers.set as any;
          if (setNode.type === 'identifier') {
            variable = setNode.name;
          } else {
            variable = await this.execute(modifiers.set, context);
          }
        }

        return { target, property, variable };
      }

      default:
        // Not a multi-word command - return null to fall through to existing logic
        return null;
    }
  }

  /**
   * Execute enhanced command with adapter
   */
  private async executeEnhancedCommand(
    name: string,
    args: ExpressionNode[],
    modifiers: Record<string, ExpressionNode>,
    context: ExecutionContext
  ): Promise<unknown> {
    const adapter = await this.commandRegistry.getAdapter(name);
    if (!adapter) {
      throw new Error(`Enhanced command not found: ${name}`);
    }

    // Inject runtime execute function into context for commands that need to execute sub-commands
    // (e.g., repeat, if, unless, etc.)
    // Takes (node, optionalContext) - if optionalContext is provided, use it; otherwise use current context
    if (!context.locals.has('_runtimeExecute')) {
      context.locals.set('_runtimeExecute', (node: ASTNode, ctx?: any) =>
        this.execute(node, ctx || context)
      );
    }

    let evaluatedArgs: unknown[];

    // Handle multi-word commands with modifiers (append...to, fetch...as, send...to, etc.)
    if (Object.keys(modifiers).length > 0) {
      const commandInput = await this.buildCommandInputFromModifiers(
        name,
        args,
        modifiers,
        context
      );

      if (commandInput !== null) {
        // Command was handled by modifier logic
        return await adapter.execute(context, commandInput);
      }
      // Otherwise fall through to existing logic
    }

    // Special handling for commands with natural language syntax
    if (name === 'put' && args.length >= 3) {
      // For put command: evaluate content, extract position keyword, handle target specially
      debug.command(`PUT: Evaluating content expression type='${args[0]?.type}'`);
      const content = await this.execute(args[0], context);
      debug.command(`PUT: Content evaluated to: "${content}" (type: ${typeof content})`);

      // Position is a keyword (identifier or literal) - extract the value, don't evaluate
      const positionArg: any = args[1];
      const position =
        positionArg?.type === 'literal' ? positionArg.value : positionArg?.name || positionArg;
      let target: any = args[2];

      // Handle target resolution for enhanced put command
      if (target?.type === 'identifier' && target.name === 'me') {
        target = context.me;
      } else if (target?.type === 'selector') {
        // Keep selector as string for enhanced put command
        target = target.value;
      } else if (target?.type === 'identifier') {
        // For other identifiers, keep as string
        target = target.name;
      } else if (target?.type === 'literal') {
        target = target.value;
      } else if (target?.type === 'memberExpression') {
        // Handle property access like "#target.innerHTML" or "me.textContent"
        // Reconstruct the selector string with property access for PUT command
        let selector = '';
        if (target.object?.type === 'selector') {
          selector = target.object.value;
        } else if (target.object?.type === 'identifier') {
          selector = target.object.name;
        }

        if (selector && target.property?.name) {
          target = `${selector}.${target.property.name}`;
        } else {
          // Fallback: evaluate if we can't reconstruct the string
          target = await this.execute(target, context);
        }
      } else {
        // Evaluate and extract first element if it's an array
        const evaluated = await this.execute(target, context);
        if (
          Array.isArray(evaluated) &&
          evaluated.length > 0 &&
          evaluated[0] instanceof HTMLElement
        ) {
          target = evaluated[0];
        } else {
          target = evaluated;
        }
      }

      evaluatedArgs = [content, position, target];
    } else if ((name === 'add' || name === 'remove') && args.length === 3) {
      // Handle "add .class to #target" and "remove .class from #target" patterns
      // name,
      // argsLength: args.length,
      // args: args.map(arg => ({ type: arg.type, value: (arg as any).value || (arg as any).name }))
      // });

      // For add/remove, the first argument (class) should be treated as a literal value, not evaluated as selector
      let classArg: any = args[0];
      if (classArg?.type === 'selector' || classArg?.type === 'literal') {
        classArg = classArg.value;
      } else if (classArg?.type === 'identifier') {
        classArg = classArg.name;
      } else {
        classArg = await this.execute(args[0], context);
      }

      await this.execute(args[1], context); // 'to' or 'from' (evaluated for side effects)
      let target: any = args[2];

      // classArg,
      // keywordArg,
      // targetNode: { type: target?.type, value: (target as any)?.value || (target as any)?.name }
      // });

      // Extract target selector/element
      if (target?.type === 'identifier' && target.name === 'me') {
        target = context.me;
      } else if (target?.type === 'selector') {
        target = target.value;
      } else if (target?.type === 'identifier') {
        // For identifiers, check if it's a variable reference that needs to be looked up
        // Try to evaluate it as a variable reference
        const evaluated = await this.execute(target, context);
        target = evaluated;
      } else if (target?.type === 'literal') {
        target = target.value;
      } else {
        const evaluated = await this.execute(target, context);
        target = evaluated;
      }

      // Debug target resolution
      if (typeof target === 'string' && target.startsWith('#')) {
        document.querySelectorAll(target); // Query for validation
        // selector: target,
        // foundElements: elements.length,
        // elements: Array.from(elements)
        // });
      }

      // Enhanced commands expect [classExpression, target]
      evaluatedArgs = [classArg, target];
    } else if (name === 'toggle' && args.length === 3) {
      // Handle "toggle .class on #target" and "toggle .class from #target" patterns
      // Support both 'on' (official _hyperscript) and 'from' (HyperFixi) for compatibility

      // First argument: class expression (extract string value)
      let classArg: any = args[0];
      if (classArg?.type === 'selector' || classArg?.type === 'literal') {
        classArg = classArg.value;
      } else if (classArg?.type === 'identifier') {
        classArg = classArg.name;
      } else {
        classArg = await this.execute(args[0], context);
      }

      // Second argument: preposition ('on' or 'from')
      // Don't evaluate - it's just a syntax marker, not a variable
      const preposition = args[1]?.type === 'identifier' ? args[1].name : args[1];
      debug.runtime(`RUNTIME: toggle command preposition: '${preposition}'`);

      // Third argument: target (special handling for context variables)
      let target: any = args[2];

      // Extract target selector/element
      if (target?.type === 'identifier' && target.name === 'me') {
        // Special context variable - use from context
        target = context.me;
        debug.runtime(`RUNTIME: toggle target 'me' resolved to:`, target);
      } else if (target?.type === 'identifier' && target.name === 'it') {
        // Special context variable - use from context
        target = context.it;
        debug.runtime(`RUNTIME: toggle target 'it' resolved to:`, target);
      } else if (target?.type === 'identifier' && target.name === 'you') {
        // Special context variable - use from context
        target = context.you;
        debug.runtime(`RUNTIME: toggle target 'you' resolved to:`, target);
      } else if (target?.type === 'selector') {
        // CSS selector - pass as string
        target = target.value;
        debug.runtime(`RUNTIME: toggle target selector: '${target}'`);
      } else if (target?.type === 'identifier') {
        // Check if it's a variable in locals/globals first
        const varName = target.name;
        if (context.locals.has(varName)) {
          target = context.locals.get(varName);
          debug.runtime(`RUNTIME: toggle target from locals: '${varName}' =`, target);
        } else if (context.globals.has(varName)) {
          target = context.globals.get(varName);
          debug.runtime(`RUNTIME: toggle target from globals: '${varName}' =`, target);
        } else {
          // Not a known variable - evaluate as expression
          target = await this.execute(target, context);
          debug.runtime(`RUNTIME: toggle target evaluated: '${varName}' =`, target);
        }
      } else if (target?.type === 'literal') {
        target = target.value;
      } else {
        target = await this.execute(target, context);
      }

      // Enhanced commands expect [classExpression, target]
      evaluatedArgs = [classArg, target];
    } else if (name === 'toggle' && args.length === 1) {
      // Handle single-arg pattern: "toggle .active" (implicit target: me)
      // OR smart element pattern: "toggle #dialog" (no implicit target)
      let classArg: unknown = args[0];
      const classArgAny = classArg as any;

      // Extract the value
      if (classArgAny?.type === 'selector' || classArgAny?.type === 'literal') {
        classArg = classArgAny.value;
      } else if (classArgAny?.type === 'identifier') {
        classArg = classArgAny.name;
      } else {
        classArg = await this.execute(args[0], context);
      }

      // Check if this might be a smart element selector (ID or tag selector)
      // Smart elements: dialog, details, summary, select
      // If it's a class selector (starts with .), attribute (@), or CSS property (*), use implicit target
      const isSmartElementCandidate =
        typeof classArg === 'string' &&
        !classArg.startsWith('.') &&
        !classArg.startsWith('@') &&
        !classArg.startsWith('*') &&
        (classArg.startsWith('#') || ['dialog', 'details', 'summary', 'select'].includes(classArg.toLowerCase()));

      if (isSmartElementCandidate) {
        // Pass as selector without implicit target - let toggle command detect smart element
        evaluatedArgs = [classArg];
      } else {
        // Use context.me as implicit target for class/attribute toggle
        evaluatedArgs = [classArg, context.me];
      }
    } else if (name === 'toggle' && args.length >= 2) {
      // Handle pattern: "toggle #dialog modal" or "toggle #dialog as modal"
      const firstArg = args[0] as any;
      const secondArg = args[1] as any;
      const thirdArg = args.length >= 3 ? args[2] : undefined as any;

      let mode: string | undefined;
      let targetArg = firstArg;

      // Detect mode parameter patterns:
      // Pattern 1: "toggle #dialog modal" -> args[0] = selector, args[1] = identifier 'modal'
      // Pattern 2: "toggle #dialog as modal" -> args[0] = selector, args[1] = identifier 'as', args[2] = identifier 'modal'
      if (args.length === 2 && secondArg && secondArg.type === 'identifier' &&
          ['modal', 'dialog'].includes(secondArg.name)) {
        // Simple pattern: toggle #dialog modal
        mode = secondArg.name;
        debug.runtime(`RUNTIME: toggle command detected '${mode}' mode`);
      } else if (secondArg && secondArg.type === 'identifier' && secondArg.name === 'as' && thirdArg) {
        // Pattern with 'as': toggle #dialog as modal (if parser ever supports it)
        if (thirdArg.type === 'identifier') {
          mode = thirdArg.name;
        } else if (thirdArg.type === 'literal') {
          mode = thirdArg.value;
        }
        debug.runtime(`RUNTIME: toggle command detected 'as ${mode}' mode`);
      } else if (firstArg && firstArg.type === 'binary' && firstArg.operator === 'as') {
        // Binary expression (unlikely with current parser)
        targetArg = firstArg.left;
        const modeExpr = firstArg.right;
        if (modeExpr.type === 'identifier') {
          mode = modeExpr.name;
        } else if (modeExpr.type === 'literal') {
          mode = modeExpr.value;
        }
        debug.runtime(`RUNTIME: toggle command detected '${mode}' mode (binary)`);
      }

      // Now evaluate the target (without the 'as modal' part)
      let target: any;
      if (targetArg?.type === 'selector') {
        target = targetArg.value;
      } else if (targetArg?.type === 'identifier') {
        const name = targetArg.name;
        if (name === 'me') {
          target = context.me;
        } else if (name === 'it') {
          target = context.it;
        } else if (name === 'you') {
          target = context.you;
        } else {
          target = name;
        }
      } else {
        target = await this.execute(targetArg, context);
      }

      // Pass [target, undefined, undefined, mode] to match toggle command signature
      // toggle command expects: [expression, target, untilEvent, mode]
      evaluatedArgs = [target, undefined, undefined, mode];

      debug.runtime(`RUNTIME: toggle evaluated args:`, evaluatedArgs);
    } else if ((name === 'add' || name === 'remove') && args.length === 1) {
      // Handle single-arg pattern: "add .active" (implicit target: me)
      let classArg: unknown = args[0];
      const classArgAny = classArg as any;
      if (classArgAny?.type === 'selector' || classArgAny?.type === 'literal') {
        classArg = classArgAny.value;
      } else if (classArgAny?.type === 'identifier') {
        classArg = classArgAny.name;
      } else {
        classArg = await this.execute(args[0], context);
      }

      // Use context.me as implicit target
      evaluatedArgs = [classArg, context.me];
    } else if (name === 'measure' && args.length >= 1) {
      // Handle both old and new measure syntax:
      // - Old: "measure x" (1 arg) -> property=x, target=me (implicit)
      // - New: "measure <#elem/> x" (2 args) -> target=#elem, property=x

      let target: any = undefined;
      let property: string | undefined;

      if (args.length === 1) {
        // Single argument: treat as property, target defaults to 'me'
        const propertyNode = args[0] as any;
        if (propertyNode.type === 'identifier') {
          property = propertyNode.name;
        } else {
          property = await this.execute(args[0], context);
        }
        // target stays undefined, will default to context.me in execute()
      } else {
        // Two or more arguments: first is target, second is property
        target = await this.execute(args[0], context);

        // Extract first element if target is an array/NodeList
        if (Array.isArray(target) && target.length > 0) {
          target = target[0];
        }

        // Property is an identifier - extract name without evaluating
        if (args.length > 1) {
          const propertyNode = args[1] as any;
          if (propertyNode.type === 'identifier') {
            property = propertyNode.name;
          } else {
            property = await this.execute(args[1], context);
          }
        }
      }

      // Create input object for measure command
      const input = { target, property };

      // Call adapter directly with input object
      return await adapter.execute(context, input);
    } else if (name === 'set' && args.length >= 3) {
      // Handle "set X to Y" and "set the property of element to value" patterns

      // Find the "to" keyword that separates target from value
      let toIndex = -1;
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (nodeType(arg) === 'identifier' && (arg as any).name === 'to') {
          toIndex = i;
          break;
        }
      }

      if (toIndex === -1) {
        // No "to" found, fall back to normal evaluation
        evaluatedArgs = await Promise.all(args.map(arg => this.execute(arg, context)));
      } else {
        // Split into target (before "to") and value (after "to")
        const targetArgs = args.slice(0, toIndex);
        const valueArgs = args.slice(toIndex + 1);

        // Construct target path from multiple args
        let target;
        if (targetArgs.length === 1) {
          // Simple case: "set count to X" or "set global count to X"
          const targetArg = targetArgs[0];

          if (nodeType(targetArg) === 'identifier') {
            // Check if identifier has scope property (e.g., "set global count to X")
            if ((targetArg as any).scope) {
              const scopeValue = (targetArg as any).scope;
              const nameValue = (targetArg as any).name;
              // Create structured object with both name and scope for adapter
              target = {
                _isScoped: true,
                name: nameValue,
                scope: scopeValue,
              };
            } else {
              target = (targetArg as any).name;
            }
          } else if (nodeType(targetArg) === 'literal') {
            target = (targetArg as any).value;
          } else if (nodeType(targetArg) === 'memberExpression') {
            // Handle memberExpression like "my textContent"
            const memberExpr = targetArg as any;
            const objectName = memberExpr.object?.name || memberExpr.object?.value;
            const propertyName = memberExpr.property?.name || memberExpr.property?.value;

            if (['my', 'me', 'its', 'it', 'your', 'you'].includes(objectName)) {
              target = `${objectName} ${propertyName}`;
            } else {
              // Not a possessive, evaluate normally
              target = await this.execute(targetArg, context);
            }
          } else if (nodeType(targetArg) === 'possessiveExpression') {
            // Handle possessive syntax: "#element's property" or "#element's *property"
            const possExpr = targetArg as any;
            const selector = possExpr.object?.value || possExpr.object?.name;

            // Check if property has CSS prefix (*property)
            let property = possExpr.property?.name || possExpr.property?.value;

            // Create structured target for property setting
            target = { element: selector, property: property };
          } else if (nodeType(targetArg) === 'propertyOfExpression') {
            // Handle "the X of Y" pattern
            const propOfExpr = targetArg as any;
            const property = propOfExpr.property?.name || propOfExpr.property?.value;
            const selector = propOfExpr.target?.value || propOfExpr.target?.name;

            // property,
            // selector,
            // fullObject: propOfExpr
            // });

            // Create the string format expected by Enhanced SET command
            target = `the ${property} of ${selector}`;
          } else {
            // Fallback: try to evaluate the target arg
            target = await this.execute(targetArg, context);
          }

          // Safety check - ensure target is not undefined
          if (target === undefined || target === null) {
            throw new Error(
              `Invalid target type: ${typeof target}. Target arg: ${JSON.stringify(targetArg)}`
            );
          }
        } else if (
          targetArgs.length === 2 &&
          (nodeType(targetArgs[0]) === 'identifier' || nodeType(targetArgs[0]) === 'literal') &&
          ((targetArgs[0] as any).name === 'global' ||
            (targetArgs[0] as any).value === 'global' ||
            (targetArgs[0] as any).name === 'local' ||
            (targetArgs[0] as any).value === 'local')
        ) {
          // Handle scoped variable syntax: "set global count to X" or "set local count to X"
          const scope = (targetArgs[0] as any).name || (targetArgs[0] as any).value;
          const variableName = (targetArgs[1] as any).name || (targetArgs[1] as any).value;
          // Store scope for later use in input object (line 947-961)
          target = variableName;
          // Store scope in a way that will be accessible later
          (context as any)._pendingSetScope = scope;
        } else if (
          targetArgs.length === 2 &&
          (nodeType(targetArgs[0]) === 'identifier' || nodeType(targetArgs[0]) === 'context_var') &&
          ['my', 'me', 'its', 'it', 'your', 'you'].includes(
            (targetArgs[0] as any).name || (targetArgs[0] as any).value
          )
        ) {
          // Handle possessive syntax: "my textContent", "its value", etc.
          const possessive = (targetArgs[0] as any).name;
          const property = (targetArgs[1] as any).name || (targetArgs[1] as any).value;
          target = `${possessive} ${property}`;
        } else if (
          targetArgs.length === 3 &&
          nodeType(targetArgs[0]) === 'selector' &&
          nodeType(targetArgs[1]) === 'identifier' &&
          (targetArgs[1] as any).name === "'s" &&
          nodeType(targetArgs[2]) === 'identifier'
        ) {
          // Handle selector possessive syntax: "#element's property"
          const selector = (targetArgs[0] as any).value;
          const property = (targetArgs[2] as any).name;
          target = { element: selector, property: property };
        } else {
          // Complex case: "set the textContent of #element to X"
          // Parse: ["the", "textContent", "of", "#element"] -> { element: "#element", property: "textContent" }
          debug.command(
            'SET ARGS: Complex case - targetArgs:',
            targetArgs.map(arg => ({
              type: nodeType(arg),
              name: (arg as any).name,
              value: (arg as any).value,
            }))
          );

          let property = null;
          let element = null;

          // Look for property name (first identifier after "the")
          for (let i = 0; i < targetArgs.length; i++) {
            const arg = targetArgs[i];
            if (
              nodeType(arg) === 'identifier' &&
              (arg as any).name !== 'the' &&
              (arg as any).name !== 'of'
            ) {
              property = (arg as any).name;
              debug.command('SET ARGS: Found property at index', i, ':', property);
              break;
            }
          }

          // Look for element selector
          for (let i = 0; i < targetArgs.length; i++) {
            const arg = targetArgs[i];
            if (nodeType(arg) === 'selector') {
              element = (arg as any).value;
              debug.command('SET ARGS: Found element selector at index', i, ':', element);
              break;
            }
          }

          debug.command('SET ARGS: After parsing - property:', property, 'element:', element);

          if (property && element) {
            // Create a structured target for property setting
            target = { element, property };
            debug.command('SET ARGS: Using structured target:', target);
          } else if (property && !element) {
            // Simple variable with "the" keyword: "set the dragHandle to X"
            // Just use the property name as the variable name
            target = property;
            debug.command('SET ARGS: Using property as variable name:', target);
          } else {
            // Fallback to simple concatenation
            target = targetArgs
              .map(arg => {
                if (nodeType(arg) === 'identifier') return (arg as any).name;
                if (nodeType(arg) === 'selector') return (arg as any).value;
                if (nodeType(arg) === 'literal') return (arg as any).value;
                return arg;
              })
              .join('.');
            debug.command('SET ARGS: Using fallback concatenation:', target);
          }
        }

        // Evaluate value expression
        let value;
        // Debug: Check if this is a function call
        const isFunctionCall = this.isSimpleFunctionCall(valueArgs);
        // count: valueArgs.length,
        // isFunctionCall,
        // firstThreeTypes: valueArgs.slice(0, 3).map(arg => arg.type),
        // firstThreeValues: valueArgs.slice(0, 3).map(arg => (arg as any).name || (arg as any).value)
        // });
        if (isFunctionCall) {
        }

        if (valueArgs.length === 1) {
          value = await this.execute(valueArgs[0], context);
        } else if (this.isSimpleFunctionCall(valueArgs)) {
          // Handle function calls like Date(), Math.max(1, 2, 3), etc.
          value = await this.evaluateFunctionCall(valueArgs, context);
        } else if (valueArgs.length === 3 && nodeType(valueArgs[1]) === 'identifier') {
          // Check if this is a binary expression pattern: value + operator + value
          const operatorNode = valueArgs[1];
          const operator = (operatorNode as any).name || (operatorNode as any).value;

          if (['+', '-', '*', '/', 'mod'].includes(operator)) {
            // Evaluate as binary expression
            const leftValue = await this.execute(valueArgs[0], context);
            const rightValue = await this.execute(valueArgs[2], context);

            // Perform the operation
            switch (operator) {
              case '+':
                value = (leftValue as any) + (rightValue as any); // String concatenation or numeric addition
                break;
              case '-':
                value = Number(leftValue) - Number(rightValue);
                break;
              case '*':
                value = Number(leftValue) * Number(rightValue);
                break;
              case '/':
                value = Number(leftValue) / Number(rightValue);
                break;
              case 'mod':
                value = Number(leftValue) % Number(rightValue);
                break;
              default:
                // Fallback to joining
                const valueResults = await Promise.all(
                  valueArgs.map(arg => this.execute(arg, context))
                );
                value = valueResults.join(' ');
            }
          } else {
            // Not a binary operator, fall back to joining
            const valueResults = await Promise.all(
              valueArgs.map(arg => this.execute(arg, context))
            );
            value = valueResults.join(' ');
          }
        } else {
          // Multiple value args - evaluate each and join
          const valueResults = await Promise.all(valueArgs.map(arg => this.execute(arg, context)));
          value = valueResults.join(' ');
        }

        evaluatedArgs = [target, value];
      }
    } else if ((name === 'show' || name === 'hide') && args.length >= 1) {
      // Handle "show #element" and "hide #element" patterns
      // For show/hide, the argument should be treated as a selector string, not evaluated as a query
      let target: unknown = args[0];
      const targetAny = target as any;

      // Extract target selector/element
      if (targetAny?.type === 'identifier' && targetAny.name === 'me') {
        target = context.me;
      } else if (
        targetAny?.type === 'selector' ||
        targetAny?.type === 'id_selector' ||
        targetAny?.type === 'class_selector'
      ) {
        // Keep as selector string
        target = targetAny.value;
      } else if (targetAny?.type === 'identifier') {
        target = targetAny.name;
      } else if (targetAny?.type === 'literal') {
        target = targetAny.value;
      } else {
        const evaluated = await this.execute(target as ASTNode, context);
        target = evaluated;
      }

      evaluatedArgs = [target];
    } else if (name === 'if' || name === 'unless') {
      // IF/UNLESS commands need raw AST nodes for conditional evaluation
      // The condition needs to be evaluated, but the then/else blocks should NOT be evaluated yet
      // The if command will decide which block to execute based on the condition
      const condition = await this.execute(args[0], context);
      // Pass evaluated condition + raw block nodes
      evaluatedArgs = [condition, ...args.slice(1)];
    } else if (name === 'install') {
      // INSTALL: Keep behavior name as identifier, but evaluate parameter values
      const behaviorNameArg = args[0]; // Identifier node for behavior name
      const parametersArg = args[1]; // ObjectLiteral node with parameters

      debug.runtime(`[INSTALL RUNTIME] args.length: ${args.length}`);
      debug.runtime(`[INSTALL RUNTIME] parametersArg:`, parametersArg);
      debug.runtime(`[INSTALL RUNTIME] parametersArg type:`, (parametersArg as any)?.type);
      debug.runtime(`[INSTALL RUNTIME] has properties:`, 'properties' in (parametersArg || {}));

      evaluatedArgs = [behaviorNameArg]; // Keep behavior name as-is

      // If there's a parameters object literal, evaluate its property values
      if (parametersArg && (parametersArg as any).type === 'objectLiteral') {
        debug.runtime(`[INSTALL RUNTIME] Evaluating objectLiteral parameters`);
        const params = (parametersArg as any).properties || [];
        const evaluatedParams: Record<string, any> = {};

        for (const prop of params) {
          const key = prop.key.name || prop.key.value;
          debug.runtime(`[INSTALL RUNTIME] Evaluating param "${key}"`);
          // Evaluate the parameter value in the current context (where 'me' is the install target)
          let value = await this.execute(prop.value, context);
          // If value is an array (from expression like `.titlebar in me`), extract first element
          if (Array.isArray(value) && value.length > 0) {
            value = value[0];
            debug.runtime(`[INSTALL RUNTIME] Extracted first element from array for "${key}"`);
          }
          debug.runtime(`[INSTALL RUNTIME] Param "${key}" = `, value);
          evaluatedParams[key] = value;
        }

        evaluatedArgs.push(evaluatedParams);
      } else {
        debug.runtime(`[INSTALL RUNTIME] No objectLiteral, passing parametersArg as-is`);
        if (parametersArg) {
          evaluatedArgs.push(parametersArg);
        }
      }
    } else if (
      name === 'repeat' ||
      name === 'transition' ||
      name === 'halt'
    ) {
      // REPEAT, TRANSITION, and HALT commands need raw AST nodes for the adapter to extract metadata
      // HALT needs raw nodes to detect "halt the event" pattern
      // Don't evaluate args - pass them as-is to the adapter
      evaluatedArgs = args;
    } else if (name === 'increment' || name === 'decrement') {
      // INCREMENT/DECREMENT: Extract variable name without evaluating, preserve amount if present
      // Pattern: increment <var> [by <amount>]
      const targetArg = args[0];

      let target: string | number;
      let extractedScope: 'global' | 'local' | undefined;

      // Extract variable name AND scope from AST node without evaluating
      if (nodeType(targetArg) === 'identifier') {
        target = (targetArg as any).name;
        // Extract scope if present (from :variable syntax)
        if ((targetArg as any).scope) {
          extractedScope = (targetArg as any).scope;
        }
      } else if (nodeType(targetArg) === 'literal') {
        target = (targetArg as any).value;
      } else {
        // Fallback: evaluate if it's a complex expression (e.g., selector)
        const evaluated = await this.execute(targetArg, context);
        // If evaluation returns an array (from selector), extract first element
        if (Array.isArray(evaluated) && evaluated.length > 0) {
          target = evaluated[0];
        } else {
          target = evaluated as string | number;
        }
      }

      // Check for "by <amount>" pattern and "global" scope marker
      // Parser structure: [target, amount?, 'global'?]

      let amount = 1;
      let scope: 'global' | 'local' | undefined = extractedScope;

      // Check each arg to find amount and/or global scope
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg && (arg as any).type === 'literal') {
          const literalValue = (arg as any).value;
          if (literalValue === 'global') {
            scope = 'global';
          } else if (typeof literalValue === 'number') {
            amount = literalValue;
          }
        } else if (arg && (arg as any).type !== 'literal') {
          // Non-literal, evaluate it (could be expression for amount)
          const evaluated = await this.execute(arg, context);
          if (typeof evaluated === 'number') {
            amount = evaluated;
          }
        }
      }

      // Pass structured input to adapter
      evaluatedArgs = [{ target, amount, ...(scope && { scope }) }];
    } else if (name === 'add' || name === 'remove') {
      // ADD/REMOVE: Don't evaluate selector nodes - extract their string values

      evaluatedArgs = await Promise.all(
        args.map(async arg => {
          if (arg && (arg as any).type === 'selector') {
            // Extract selector string value instead of evaluating
            return (arg as any).value;
          }
          // For non-selector args, evaluate normally
          return await this.execute(arg, context);
        })
      );
    } else if (name === 'trigger') {
      // TRIGGER: Extract event name from identifier node instead of evaluating
      // First arg is event name (identifier/string), rest are data/target args
      evaluatedArgs = await Promise.all(
        args.map(async (arg, index) => {
          if (index === 0) {
            // First argument is the event name - extract string value from identifier
            if (arg && typeof arg === 'object' && 'value' in arg) {
              // Extract the token value (e.g., "draggable:start")
              return (arg as any).value;
            } else if (arg && typeof arg === 'object' && 'name' in arg) {
              // Alternative: extract name property
              return (arg as any).name;
            } else if (typeof arg === 'string') {
              // Already a string
              return arg;
            }
            // Fallback: evaluate it
            return await this.execute(arg, context);
          }
          // For other args (data, "on", target), evaluate normally
          return await this.execute(arg, context);
        })
      );
    } else {
      // For other commands, evaluate all arguments normally
      console.log('[RUNTIME DEBUG] Evaluating args for command:', name, 'args:', args.map(arg => ({type: (arg as any)?.type, value: (arg as any)?.value, name: (arg as any)?.name})));
      evaluatedArgs = await Promise.all(args.map(arg => this.execute(arg, context)));
      console.log('[RUNTIME DEBUG] Evaluated args result:', evaluatedArgs, 'first arg:', {
        isArray: Array.isArray(evaluatedArgs[0]),
        length: Array.isArray(evaluatedArgs[0]) ? evaluatedArgs[0].length : 'N/A',
        value: evaluatedArgs[0]
      });
    }

    // Execute through enhanced adapter

    // Debug for SET command to see what args we actually have
    if (name === 'set') {
      // evaluatedArgsLength: evaluatedArgs.length,
      // evaluatedArgs: evaluatedArgs,
      // conditionCheck: evaluatedArgs.length >= 2,
      // willUseStructuredPath: name === 'set' && evaluatedArgs.length >= 2
      // });
    }

    // Debug for add/remove commands to see class parsing
    if ((name === 'add' || name === 'remove') && evaluatedArgs.length >= 1) {
    }

    let result;
    if (name === 'set' && evaluatedArgs.length >= 2) {
      // SET command expects input object format
      const [target, value] = evaluatedArgs;

      // Handle scoped variable object from SET command processing
      let inputTarget;
      let scope: 'global' | 'local' | undefined;

      if (target && typeof target === 'object' && (target as any)._isScoped) {
        // Extract name and scope from scoped variable object
        inputTarget = (target as any).name;
        scope = (target as any).scope;
      } else if (
        target &&
        typeof target === 'object' &&
        'element' in target &&
        'property' in target
      ) {
        // Convert structured target to "the X of Y" string format
        inputTarget = `the ${target.property} of ${target.element}`;
      } else {
        inputTarget = target;
      }

      const input: any = { target: inputTarget, value, toKeyword: 'to' as const };

      // Add scope if extracted from _isScoped object
      if (scope) {
        input.scope = scope;
      }

      // Add scope if it was detected during argument parsing (legacy path)
      if ((context as any)._pendingSetScope) {
        input.scope = (context as any)._pendingSetScope;
        delete (context as any)._pendingSetScope; // Clean up after use
      }
      result = await adapter.execute(context, input);
    } else if ((name === 'increment' || name === 'decrement') && evaluatedArgs.length >= 1) {
      // INCREMENT/DECREMENT commands expect input object format
      const [firstArg, ...rest] = evaluatedArgs;

      // Check if already structured by special INCREMENT/DECREMENT handling above
      let input: any;
      if (
        firstArg &&
        typeof firstArg === 'object' &&
        'target' in firstArg &&
        'amount' in firstArg
      ) {
        // Already structured - pass through
        input = firstArg;
      } else {
        // Not structured - build input object
        input = { target: firstArg };

        // Handle "by" amount syntax
        if (rest.length >= 2 && rest[0] === 'by' && typeof rest[1] === 'number') {
          input.amount = rest[1];
          input.byKeyword = 'by';
        } else if (rest.length === 1 && typeof rest[0] === 'number') {
          input.amount = rest[0];
        }
      }

      // Handle global scope (detect from target string)
      if (typeof input.target === 'string' && input.target.startsWith('global ')) {
        input.target = input.target.replace('global ', '');
        input.scope = 'global';
      }

      result = await adapter.execute(context, input);
    } else {
      console.log('[RUNTIME DEBUG] Calling adapter.execute for command:', name, 'with evaluatedArgs:', evaluatedArgs);
      result = await adapter.execute(context, ...evaluatedArgs);
      console.log('[RUNTIME DEBUG] Adapter returned:', result);
    }

    return result;
  }

  /**
   * Execute a command from a command-selector pattern (e.g., "add .active")
   */
  private async executeCommandFromPattern(
    command: string,
    selector: string,
    context: ExecutionContext
  ): Promise<unknown> {
    const commandName = command.toLowerCase();

    // Try enhanced commands first if available
    if (this.options.useEnhancedCommands && this.commandRegistry.has(commandName)) {
      // For pattern-based execution, we need to handle different command types
      let args: ASTNode[];
      if (commandName === 'remove' || commandName === 'add') {
        // For remove/add, pass the class name directly (strip . if present)
        const className = selector.startsWith('.') ? selector.slice(1) : selector;
        args = [{ type: 'literal', value: className }];
      } else {
        // For other commands (hide/show), pass selector as is
        args = selector ? [{ type: 'literal', value: selector }] : [];
      }
      return await this.executeEnhancedCommand(commandName, args as ExpressionNode[], context);
    }

    // Fallback to legacy command handling
    switch (commandName) {
      case 'add': {
        return this.executeAddCommand([selector], context);
      }
      case 'remove': {
        return this.executeRemoveCommand([selector], context);
      }
      case 'hide': {
        return this.executeHideCommand([selector], context);
      }
      case 'show': {
        return this.executeShowCommand([selector], context);
      }
      default: {
        // For unknown commands, create a proper command node
        const commandNode: CommandNode = {
          type: 'command',
          name: command,
          args: [{ type: 'literal', value: selector }],
        };
        return await this.executeCommand(commandNode, context);
      }
    }
  }

  /**
   * Execute a command node (hide, show, wait, add, remove, etc.)
   */
  private async executeCommand(node: CommandNode, context: ExecutionContext): Promise<unknown> {
    const { name, args, modifiers } = node;

    // DEBUG: Log all command executions
    debug.command(`executeCommand() called:`, {
      name,
      argsLength: args?.length,
      hasModifiers: !!modifiers,
      modifierKeys: modifiers ? Object.keys(modifiers) : [],
      useEnhanced: this.options.useEnhancedCommands,
      hasEnhanced: this.commandRegistry.has(name.toLowerCase()),
    });

    // Debug logging for transition command
    if (name.toLowerCase() === 'transition') {
      debug.command('TRANSITION command check:', {
        name,
        useEnhancedCommands: this.options.useEnhancedCommands,
        hasInRegistry: this.commandRegistry.has(name.toLowerCase()),
        availableCommands: this.commandRegistry.getCommandNames(),
      });
    }

    // Try enhanced commands first if enabled
    if (this.options.useEnhancedCommands && this.commandRegistry.has(name.toLowerCase())) {
      return await this.executeEnhancedCommand(
        name.toLowerCase(),
        (args || []) as ExpressionNode[],
        modifiers || {},
        context
      );
    }

    // For now, let commands handle their own argument evaluation
    // This ensures compatibility with how the commands are designed
    const rawArgs = args || [];

    switch (name.toLowerCase()) {
      case 'hide': {
        // These commands expect evaluated args
        const hideArgs = await Promise.all(
          rawArgs.map((arg: ASTNode) => this.execute(arg, context))
        );
        return this.executeHideCommand(hideArgs, context);
      }

      case 'show': {
        const showArgs = await Promise.all(
          rawArgs.map((arg: ASTNode) => this.execute(arg, context))
        );
        return this.executeShowCommand(showArgs, context);
      }

      case 'wait': {
        const waitArgs = await Promise.all(
          rawArgs.map((arg: ASTNode) => this.execute(arg, context))
        );
        return this.executeWaitCommand(waitArgs, context);
      }

      case 'add': {
        // For add command, extract class names from selector nodes (don't evaluate to elements)
        const addArgs = rawArgs.map((arg: any) => {
          if (arg.type === 'selector' || arg.type === 'class_reference') {
            return arg.value; // Return the class name string
          }
          return arg.value || arg.name || arg; // For other types, try to get a string value
        });
        return this.executeAddCommand(addArgs, context);
      }

      case 'remove': {
        // For remove command, extract class names from selector nodes (don't evaluate to elements)
        const removeArgs = rawArgs.map((arg: any) => {
          if (arg.type === 'selector' || arg.type === 'class_reference') {
            return arg.value; // Return the class name string
          }
          return arg.value || arg.name || arg; // For other types, try to get a string value
        });
        return this.executeRemoveCommand(removeArgs, context);
      }

      case 'put': {
        // Put command should get mixed arguments - content evaluated, target as raw string/element
        return await this.executePutCommand(rawArgs as ExpressionNode[], context);
      }

      case 'set': {
        // This should not be reached since SET command should go through enhanced registry
        throw new Error('SET command should be handled by enhanced registry');
      }

      case 'log': {
        // This should not be reached since LOG command should go through enhanced registry
        throw new Error('LOG command should be handled by enhanced registry');
      }

      case 'beep':
      case 'beep!': {
        // Beep command for debugging - evaluates all arguments and logs them
        const beepArgs = await Promise.all(
          rawArgs.map((arg: ASTNode) => this.execute(arg, context))
        );
        return this.executeBeepCommand(beepArgs, context);
      }

      case 'repeat': {
        // Execute repeat until event command
        return this.executeRepeatCommand(node as any, context);
      }

      default: {
        throw new Error(`Unknown command: ${name}`);
      }
    }
  }

  /**
   * Execute an event handler node (on click, on change, etc.)
   */
  private async executeEventHandler(
    node: EventHandlerNode,
    context: ExecutionContext
  ): Promise<void> {
    const { event, events, commands, target, args, selector, attributeName, watchTarget } = node as EventHandlerNode & { selector?: string; attributeName?: string; watchTarget?: ASTNode };

    // Get all event names (support both single event and multiple events with "or")
    const eventNames = events && events.length > 0 ? events : [event];

    debug.runtime(
      `RUNTIME: executeEventHandler for events '${eventNames.join(', ')}', target=${target}, selector=${selector}, attributeName=${attributeName}, watchTarget=${watchTarget ? 'yes' : 'no'}, args=${args}, context.me=`,
      context.me
    );

    // Determine target element(s)
    let targets: HTMLElement[] = [];

    if (target) {
      // First check if target is a variable name in the context
      if (typeof target === 'string' && context.locals.has(target)) {
        const resolvedTarget = context.locals.get(target);
        debug.runtime(`RUNTIME: Resolved target variable '${target}' to:`, resolvedTarget);

        // If it's an HTMLElement, use it directly
        if (this.isElement(resolvedTarget)) {
          targets = [resolvedTarget];
        } else if (typeof resolvedTarget === 'string') {
          // If it's a string, treat it as a CSS selector
          targets = this.queryElements(resolvedTarget, context);
        } else if (Array.isArray(resolvedTarget)) {
          // If it's an array, filter for HTMLElements
          targets = resolvedTarget.filter(el => this.isElement(el));
        }
      } else {
        // Not a variable, treat as CSS selector
        targets = this.queryElements(target, context);
      }
    } else {
      // No target specified, use context.me
      targets = context.me ? [context.me as HTMLElement] : [];
    }

    debug.runtime(`RUNTIME: Found ${targets.length} target elements for events '${eventNames.join(', ')}'`);

    if (targets.length === 0) {
      console.warn(`❌ EVENT HANDLER: No elements found for event handler: ${eventNames.join(', ')}`);
      return;
    }

    // Handle mutation events with MutationObserver
    if (event === 'mutation' && attributeName) {
      debug.runtime(`RUNTIME: Setting up MutationObserver for attribute '${attributeName}' on ${targets.length} elements`);

      for (const targetElement of targets) {
        const observer = new MutationObserver(async (mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === attributeName) {
              debug.event(`MUTATION DETECTED: attribute '${attributeName}' changed on`, targetElement);

              // Create context for mutation event
              const mutationContext: ExecutionContext = {
                ...context,
                me: targetElement,
                it: mutation,
                locals: new Map(context.locals),
              };

              // Store old and new values in context
              const oldValue = mutation.oldValue;
              const newValue = targetElement.getAttribute(attributeName);
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
          attributeFilter: [attributeName],
        });

        debug.runtime(`RUNTIME: MutationObserver attached to`, targetElement, `for attribute '${attributeName}'`);
      }

      // Return early - mutation observers don't use regular event listeners
      return;
    }

    // Handle content change events with MutationObserver (watching other elements)
    if (event === 'change' && watchTarget) {
      debug.runtime(`RUNTIME: Setting up MutationObserver for content changes on watch target`);

      // Evaluate the watchTarget expression to get the target element(s)
      const watchTargetResult = await this.execute(watchTarget, context);
      let watchTargetElements: HTMLElement[] = [];

      if (this.isElement(watchTargetResult)) {
        watchTargetElements = [watchTargetResult];
      } else if (Array.isArray(watchTargetResult)) {
        watchTargetElements = watchTargetResult.filter((el: any) => this.isElement(el));
      }

      debug.runtime(`RUNTIME: Watching ${watchTargetElements.length} target elements for content changes`);

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

        debug.runtime(`RUNTIME: MutationObserver attached to`, watchedElement, `for content changes`);
      }

      // Return early - mutation observers don't use regular event listeners
      return;
    }

    // Create event handler function
    const eventHandler = async (domEvent: Event) => {
      // Recursion protection: track event handler execution depth
      const currentDepth = (domEvent as any).__hyperfixi_recursion_depth || 0;
      if (currentDepth >= 100) {
        console.error(`⚠️ Event handler recursion depth limit exceeded (${currentDepth}) for event '${domEvent.type}'`);
        console.error('This usually indicates an infinite loop, such as "on keyup ... trigger keyup"');
        return;
      }
      (domEvent as any).__hyperfixi_recursion_depth = currentDepth + 1;

      // Event delegation: if selector is provided, check if event.target matches
      if (selector && domEvent.target instanceof Element) {
        const matchesSelector = domEvent.target.matches(selector);
        debug.event(`EVENT DELEGATION: checking if target matches selector '${selector}': ${matchesSelector}`);

        if (!matchesSelector) {
          // Check if any parent element matches (for bubbled events)
          const closestMatch = domEvent.target.closest(selector);
          if (!closestMatch) {
            debug.event(`EVENT DELEGATION: target does not match selector '${selector}', skipping handler`);
            return; // Skip this handler if selector doesn't match
          }
          debug.event(`EVENT DELEGATION: parent element matches selector '${selector}'`);
        }
      }

      debug.event(`EVENT FIRED: ${domEvent.type} on`, domEvent.target, 'with', commands.length, 'commands');

      // Create new context for event execution
      // IMPORTANT: Create a NEW locals Map that starts with the behavior's context
      // but allows event-specific variables to be isolated
      const eventLocals = new Map(context.locals);

      const eventContext: ExecutionContext = {
        ...context,
        locals: eventLocals, // Use NEW Map to isolate event-specific variables
        it: domEvent,
        event: domEvent,
      };

      // Make the event target available as 'target' variable
      eventContext.locals.set('target', domEvent.target);

      // Destructure event properties into context.locals if args are specified
      // This allows patterns like: on pointerdown(clientX, clientY)
      if (args && args.length > 0) {
        for (const argName of args) {
          const value = (domEvent as any)[argName] || (domEvent as any).detail?.[argName] || null;
          eventContext.locals.set(argName, value);
          debug.runtime(`RUNTIME: Destructured event property '${argName}' = ${value}`);
        }
      }

      debug.event(
        `EVENT CONTEXT: me=`,
        eventContext.me,
        'context.locals has:',
        Array.from(eventContext.locals.keys())
      );

      // Execute all commands in sequence
      for (const command of commands) {
        try {
          debug.command(`EXECUTING COMMAND in event handler:`, command);
          let result = await this.execute(command, eventContext);
          console.log('[RUNTIME DEBUG] Command result:', {isArray: Array.isArray(result), hasResult: result !== null && typeof result === 'object' && 'result' in result, result});
          // Update 'it' with command result for next command in sequence
          if (result !== undefined) {
            // If result is a call/get command output object, extract the result property
            // This handles: {result, wasAsync, expressionType}
            if (result !== null && typeof result === 'object' && 'result' in result && 'wasAsync' in result) {
              console.log('[RUNTIME DEBUG] Extracting result property from call/get command output');
              result = result.result;
              console.log('[RUNTIME DEBUG] After extracting result:', result);
            }
            // If result is a repeat command output object, extract the lastResult property
            // This handles: {type, iterations, completed, lastResult, interrupted}
            else if (result !== null && typeof result === 'object' && 'type' in result && 'iterations' in result && 'lastResult' in result) {
              console.log('[RUNTIME DEBUG] Extracting lastResult property from repeat command output');
              result = result.lastResult;
              console.log('[RUNTIME DEBUG] After extracting lastResult:', result);
            }

            // If result is an array from selector evaluation, extract first element
            // This allows "get #dialog" then "call it.showModal()" to work properly
            if (Array.isArray(result) && result.length > 0) {
              console.log('[RUNTIME DEBUG] Extracting first element from array');
              result = result[0];
              console.log('[RUNTIME DEBUG] After extracting element:', result);
            }
            console.log('[RUNTIME DEBUG] Setting context.it to:', result);
            eventContext.it = result;
            eventContext.result = result;
          }
          debug.command(`COMMAND COMPLETED, it =`, eventContext.it);
        } catch (error) {
          // Check for control flow commands - stop event handler gracefully
          if (error instanceof Error) {
            const errorAny = error as any;
            if (errorAny.isHalt) {
              debug.command('Halt command encountered, stopping event handler execution');
              break; // Stop executing remaining commands in event handler
            }
            if (errorAny.isExit) {
              debug.command('Exit command encountered, stopping event handler execution');
              break; // Stop executing remaining commands in event handler
            }
            if (errorAny.isReturn) {
              debug.command('Return command encountered, stopping event handler execution');
              if (errorAny.returnValue !== undefined) {
                Object.assign(eventContext, {
                  it: errorAny.returnValue,
                  result: errorAny.returnValue,
                });
              }
              break; // Stop executing remaining commands in event handler
            }
          }
          // Not a control flow command - this is an actual error
          console.error(`❌ COMMAND FAILED:`, error);
          throw error;
        }
      }
      debug.event(`EVENT HANDLER COMPLETE: ${domEvent.type}`);
    };

    // Bind event handlers to all target elements for all event names
    for (const target of targets) {
      for (const eventName of eventNames) {
        const elementInfo = this.isElement(target) ?
          `${target.tagName}${target.id ? '#' + target.id : ''}${target.className ? '.' + target.className.split(' ').join('.') : ''}` :
          'unknown';
        debug.runtime(`RUNTIME: Adding event listener for '${eventName}' on element: ${elementInfo}`, target);
        target.addEventListener(eventName, eventHandler);

        // Store event handler for potential cleanup
        if (!context.events) {
          Object.assign(context, { events: new Map() });
        }
        const eventKey = `${eventName}-${targets.indexOf(target)}`;
        const htmlTarget = asHTMLElement(target);
        if (htmlTarget) {
          context.events!.set(eventKey, { target: htmlTarget, event: eventName, handler: eventHandler });
        }
      }
    }
  }

  /**
   * Execute behavior definition node and register it
   */
  private async executeBehaviorDefinition(node: any, _context: ExecutionContext): Promise<void> {
    const { name, parameters, eventHandlers, initBlock } = node;

    debug.runtime(`RUNTIME: Registering behavior: ${name}`);

    // Store the behavior definition in the registry
    this.behaviorRegistry.set(name, {
      name,
      parameters,
      eventHandlers,
      initBlock,
    });

    debug.runtime(`RUNTIME: Behavior registered: ${name} with ${eventHandlers.length} event handlers`);
    debug.runtime('RUNTIME: Total behaviors in registry:', this.behaviorRegistry.size);
    debug.runtime('RUNTIME: Registry keys:', Array.from(this.behaviorRegistry.keys()));
  }

  /**
   * Get a behavior definition from the registry
   */
  getBehavior(name: string): any | undefined {
    return this.behaviorRegistry.get(name);
  }

  /**
   * Install a behavior on an element
   */
  private async installBehaviorOnElement(
    behaviorName: string,
    element: HTMLElement,
    parameters: Record<string, any>
  ): Promise<void> {
    const behavior = this.behaviorRegistry.get(behaviorName);
    if (!behavior) {
      throw new Error(`Behavior "${behaviorName}" not found`);
    }

    debug.runtime(`RUNTIME: Installing behavior ${behaviorName} on element`, element);

    // Create context for behavior initialization
    const behaviorContext: ExecutionContext = {
      me: element,
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: this.globalVariables, // Use shared globals across all executions
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
    };

    // Add behavior parameters to context
    // Initialize ALL declared parameters (even if undefined) so they can be set by init block
    if (behavior.parameters) {
      for (const param of behavior.parameters) {
        // Set to provided value, or undefined if not provided
        const value = param in parameters ? parameters[param] : undefined;
        behaviorContext.locals.set(param, value);
      }
    }

    // Add any extra parameters that weren't in the declared parameter list
    for (const [key, value] of Object.entries(parameters)) {
      if (!behavior.parameters || !behavior.parameters.includes(key)) {
        behaviorContext.locals.set(key, value);
      }
    }

    // Execute init block if present
    if (behavior.initBlock) {
      debug.runtime(`RUNTIME: Executing init block for ${behaviorName}`);
      try {
        await this.execute(behavior.initBlock, behaviorContext);
      } catch (error) {
        // Check for halt execution - stop init block gracefully
        if (error instanceof Error && (error as any).isHalt) {
          if (this.options.enableErrorReporting) {
          }
          // Continue with event handler attachment even if init was halted
        } else {
          // Rethrow other errors
          throw error;
        }
      }
    }

    // Attach event handlers to the element
    if (behavior.eventHandlers && behavior.eventHandlers.length > 0) {
      debug.runtime(
        'RUNTIME: About to attach event handlers. Current behaviorContext.locals:',
        Array.from(behaviorContext.locals.keys())
      );
      debug.runtime(
        'RUNTIME: dragHandle value in context:',
        behaviorContext.locals.get('dragHandle')
      );
      debug.runtime(`RUNTIME: Attaching ${behavior.eventHandlers.length} event handlers`);
      for (const handler of behavior.eventHandlers) {
        await this.executeEventHandler(handler, behaviorContext);
      }
    }

    debug.runtime(`RUNTIME: Behavior ${behaviorName} installed successfully`);
  }

  /**
   * Execute hide command
   */
  private executeHideCommand(args: unknown[], context: ExecutionContext): void {
    debug.command('HIDE DEBUG:', {
      args,
      argsLength: args.length,
      firstArgType: typeof args[0],
      firstArg: args[0],
    });
    // When we have args like "hide me", the first arg is the evaluated "me" identifier
    // When we have no args like "hide", use context.me directly
    const target = args.length > 0 ? args[0] : context.me;

    if (!target) {
      throw new Error('Context element "me" is null');
    }

    if (this.isElement(target)) {
      debug.command('HIDE: hiding element directly');
      target.style.display = 'none';
    } else if (typeof target === 'string') {
      debug.command('HIDE: querying and hiding elements with selector:', target);
      // Selector string - query and hide elements
      const elements = this.queryElements(target, context);
      debug.command('HIDE: found elements:', elements.length);
      elements.forEach(el => (el.style.display = 'none'));
    } else {
      debug.command('HIDE: target is neither element nor string, type:', typeof target, target);
    }
  }

  /**
   * Execute show command
   */
  private executeShowCommand(args: unknown[], context: ExecutionContext): void {
    debug.command('SHOW DEBUG:', {
      args,
      argsLength: args.length,
      firstArgType: typeof args[0],
      firstArg: args[0],
    });
    const target = args.length > 0 ? args[0] : context.me;

    if (!target) {
      throw new Error('Context element "me" is null');
    }

    if (this.isElement(target)) {
      debug.command('SHOW: showing element directly');
      target.style.display = 'block';
    } else if (typeof target === 'string') {
      debug.command('SHOW: querying and showing elements with selector:', target);
      // Selector string - query and show elements
      const elements = this.queryElements(target, context);
      debug.command('SHOW: found elements:', elements.length);
      elements.forEach(el => (el.style.display = 'block'));
    } else {
      debug.command('SHOW: target is neither element nor string, type:', typeof target, target);
    }
  }

  /**
   * Execute wait command with time delays
   */
  private async executeWaitCommand(args: unknown[], _context: ExecutionContext): Promise<void> {
    if (args.length === 0) {
      throw new Error('Wait command requires a time argument');
    }

    const timeArg = args[0];
    let milliseconds = 0;

    if (typeof timeArg === 'string') {
      // Parse time expressions like "500ms", "2s", "1.5s"
      const match = timeArg.match(/^(\d+(?:\.\d+)?)(ms|s|seconds?)$/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();

        if (unit === 'ms') {
          milliseconds = value;
        } else if (unit === 's' || unit.startsWith('second')) {
          milliseconds = value * 1000;
        }
      } else {
        throw new Error(`Invalid time format: ${timeArg}`);
      }
    } else if (typeof timeArg === 'number') {
      milliseconds = timeArg;
    }

    if (milliseconds > 0) {
      await new Promise(resolve => setTimeout(resolve, milliseconds));
    }
  }

  /**
   * Execute add command (add classes)
   */
  private executeAddCommand(args: unknown[], context: ExecutionContext): void {
    const target = context.me;
    if (!target) {
      throw new Error('Context element "me" is null');
    }

    args.forEach(arg => {
      if (typeof arg === 'string') {
        // Remove leading dot if present
        const className = arg.startsWith('.') ? arg.slice(1) : arg;
        target.classList.add(className);
      } else if (Array.isArray(arg)) {
        // Handle element arrays from selector evaluation - extract class name from original selector
        // This case occurs when selector nodes are evaluated to elements
        // For add/remove class operations, we need the class name, not the elements
        console.warn('Add command received element array instead of class name');
      }
    });
  }

  /**
   * Execute remove command (remove classes)
   */
  private executeRemoveCommand(args: unknown[], context: ExecutionContext): void {
    const target = context.me;
    if (!target) {
      throw new Error('Context element "me" is null');
    }

    args.forEach(arg => {
      if (typeof arg === 'string') {
        // Remove leading dot if present
        const className = arg.startsWith('.') ? arg.slice(1) : arg;
        target.classList.remove(className);
      }
    });
  }

  /**
   * Execute put command (set content)
   */
  private async executePutCommand(
    rawArgs: ExpressionNode[],
    context: ExecutionContext
  ): Promise<unknown> {
    debug.runtime('RUNTIME: executePutCommand started', {
      argCount: rawArgs.length,
      rawArgs: rawArgs.map(arg => ({
        type: arg?.type,
        value: (arg as any)?.value || (arg as any)?.name,
        raw: arg,
      })),
      contextMe: context.me?.tagName || context.me?.constructor?.name,
    });

    // Process arguments: find content, preposition, and target
    let contentArg = null;
    let prepositionArg = null;
    let targetArg = null;

    // Find the preposition keyword to split the arguments
    let prepositionIndex = -1;
    for (let i = 0; i < rawArgs.length; i++) {
      const arg = rawArgs[i];
      const argType = nodeType(arg);
      const argValue = (argType === 'literal' ? arg.value : (arg as any).name) as string;

      if (
        (argType === 'literal' || argType === 'identifier') &&
        ['into', 'before', 'after', 'at', 'at start of', 'at end of'].includes(argValue)
      ) {
        prepositionIndex = i;
        prepositionArg = argValue;
        break;
      }
    }

    if (prepositionIndex === -1) {
      // Fallback to old logic
      if (rawArgs.length >= 3) {
        contentArg = rawArgs[0];
        prepositionArg = rawArgs[1];
        targetArg = rawArgs[2];
      }
    } else {
      // Split arguments around the preposition
      const contentArgs = rawArgs.slice(0, prepositionIndex);
      const targetArgs = rawArgs.slice(prepositionIndex + 1);

      // Use first content arg (or combine if multiple)
      contentArg = contentArgs.length === 1 ? contentArgs[0] : contentArgs[0];
      targetArg = targetArgs.length === 1 ? targetArgs[0] : targetArgs[0];
    }

    if (contentArg && prepositionArg && targetArg) {
      const content = await this.execute(contentArg, context);

      const preposition = prepositionArg;

      let target = targetArg;
      debug.runtime('RUNTIME: before target resolution', {
        target,
        type: target?.type,
        name: (target as any)?.name,
        value: (target as any)?.value,
      });

      // Handle target resolution - fix the [object Object] issue
      if (nodeType(target) === 'identifier' && (target as any).name === 'me') {
        target = context.me as any;
      } else if (nodeType(target) === 'identifier') {
        // For other identifiers, keep as string for CSS selector or context lookup
        target = (target as any).name;
      } else if (nodeType(target) === 'literal') {
        target = (target as any).value;
      } else if (nodeType(target) === 'selector') {
        target = (target as any).value;
      } else {
        // Only evaluate if it's not already a target we can handle
        if (typeof target === 'object' && target?.type) {
          target = (await this.execute(target, context)) as any;
        }
      }

      debug.runtime('RUNTIME: calling putCommand.execute', { content, preposition, target });
      const result = await this.putCommand.execute(
        context as TypedExecutionContext,
        content,
        preposition,
        target
      );
      debug.runtime('RUNTIME: putCommand.execute result', { result });
      return result.success ? result.value : undefined;
    }

    // Fallback: use raw args
    const result = await this.putCommand.execute(context as TypedExecutionContext, ...rawArgs);
    return result.success ? result.value : undefined;
  }

  /**
   * Execute LOG command - output values to console
   */
  // @ts-expect-error - Reserved for future logging implementation
  private _executeLogCommand(args: unknown[], _context: ExecutionContext): void {
    // If no arguments, just log empty
    if (args.length === 0) {
      return;
    }

    // Log all arguments
  }

  /**
   * Execute BEEP command - debugging output with enhanced formatting
   */
  private executeBeepCommand(args: unknown[], _context: ExecutionContext): void {
    // If no arguments, beep with context info
    if (args.length === 0) {
      debugGroup.start('Beep! Hyperscript Context Debug');
      debugGroup.end();
      return;
    }

    // Debug each argument with enhanced formatting
    args.forEach((_value, index) => {
      console.group(`🔔 Beep! Argument ${index + 1}`);
      debugGroup.end();
    });
  }

  /**
   * Execute repeat until event command
   */
  private async executeRepeatCommand(node: any, context: ExecutionContext): Promise<void> {
    // The repeat command stores data in args array:
    // args[0] = loop type (identifier with name like "until-event")
    // args[1] = event name (string node)
    // args[2] = event target (AST node)
    // args[...] = commands block (last arg with type 'block')
    const args = node.args || [];

    debug.loop('RUNTIME: Executing repeat command', {
      argsCount: args.length,
      loopType: args[0]?.name || args[0]?.type,
      args: args.map((arg: any) => ({ type: arg?.type, name: arg?.name, value: arg?.value })),
    });

    // Find the loop type
    const loopTypeNode = args[0];
    const loopType = loopTypeNode?.name || loopTypeNode?.value;

    if (loopType !== 'until-event') {
      throw new Error(`Unsupported repeat loop type: ${loopType}`);
    }

    // Extract event name (args[1])
    const eventNameNode = args[1];
    const eventName = eventNameNode?.value;

    // Extract event target (args[2])
    const eventTargetNode = args[2];

    // Find commands block (last arg with type 'block')
    const blockNode = args.find((arg: any) => arg?.type === 'block');
    const commands = blockNode?.commands || [];

    debug.loop('RUNTIME: Parsed repeat command', {
      eventName,
      hasEventTarget: !!eventTargetNode,
      commandCount: commands.length,
    });

    // Evaluate the event target (e.g., "the document")
    let eventTarget: EventTarget | null = null;
    if (eventTargetNode) {
      const targetValue = await this.execute(eventTargetNode, context);
      if (targetValue instanceof EventTarget) {
        eventTarget = targetValue;
      } else if (targetValue === 'document' || (targetValue as any)?.name === 'document') {
        eventTarget = document;
      }
    }

    if (!eventTarget) {
      throw new Error('repeat until event: could not resolve event target');
    }

    debug.loop('RUNTIME: Repeat command will listen for', eventName, 'on', eventTarget);

    // Create a promise that resolves when the event fires
    return new Promise(resolve => {
      let shouldContinue = true;

      const eventHandler = () => {
        debug.loop('RUNTIME: Event', eventName, 'fired, stopping repeat loop');
        shouldContinue = false;
        eventTarget.removeEventListener(eventName, eventHandler);
        resolve();
      };

      // Add event listener
      eventTarget.addEventListener(eventName, eventHandler);

      // Start the repeat loop
      const executeLoop = async () => {
        while (shouldContinue) {
          // Execute the commands inside the repeat block
          if (commands && Array.isArray(commands)) {
            for (const cmd of commands) {
              if (!shouldContinue) break; // Stop mid-execution if event fired
              await this.execute(cmd, context);
            }
          }

          // Small delay to prevent blocking the event loop
          await new Promise(r => setTimeout(r, 0));
        }
        debug.loop('RUNTIME: Repeat loop finished');
      };

      // Start loop (but don't await it - let it run in parallel with event listener)
      void executeLoop();
    });
  }

  /**
   * Get detailed type information for beep command
   */
  // @ts-expect-error - Reserved for future beep command enhancement
  private _getDetailedType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    if (Array.isArray(value)) return 'array';
    if (value instanceof HTMLElement) return 'HTMLElement';
    if (value instanceof Date) return 'Date';
    if (value instanceof RegExp) return 'RegExp';
    if (value instanceof Error) return 'Error';

    return typeof value;
  }

  /**
   * Get source representation for beep command
   */
  // @ts-expect-error - Reserved for future beep command enhancement
  private _getSourceRepresentation(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value.toString();
    }

    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }

    if (value instanceof HTMLElement) {
      const tag = value.tagName.toLowerCase();
      const id = value.id ? `#${value.id}` : '';
      const classes = value.className ? `.${value.className.split(' ').join('.')}` : '';
      return `<${tag}${id}${classes}/>`;
    }

    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }

    if (typeof value === 'object') {
      try {
        const keys = Object.keys(value);
        return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;
      } catch {
        return '[Object]';
      }
    }

    return String(value);
  }

  /**
   * Query DOM elements by selector
   */
  private queryElements(selector: string, context: ExecutionContext): HTMLElement[] {
    if (!context.me || typeof document === 'undefined') {
      return [];
    }

    // Query from document or current element's context
    const root = document;
    const elements = Array.from(root.querySelectorAll(selector));

    return elements;
  }

  /**
   * Check if an object is an HTML element (works in both browser and Node.js)
   */
  private isElement(obj: unknown): obj is HTMLElement {
    // First check if it's a real HTMLElement (in browser environment)
    if (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement) {
      return true;
    }

    // Fallback: check for element-like properties (for mocks and Node.js)
    const objAny = obj as any;
    return (
      obj &&
      typeof obj === 'object' &&
      objAny.style &&
      typeof objAny.style === 'object' &&
      objAny.classList
    );
  }

  /**
   * Check if valueArgs represent a simple function call pattern like Date() or Math.max(1,2,3)
   */
  private isSimpleFunctionCall(valueArgs: ASTNode[]): boolean {
    if (valueArgs.length < 2) return false;

    // Pattern 1: identifier + opening parenthesis + closing parenthesis (e.g., Date())
    if (
      valueArgs.length === 3 &&
      valueArgs[0].type === 'identifier' &&
      (valueArgs[1] as any).value === '(' &&
      (valueArgs[2] as any).value === ')'
    ) {
      return true;
    }

    // Pattern 2: identifier + combined parentheses (e.g., Date + "()")
    if (
      valueArgs.length === 2 &&
      valueArgs[0].type === 'identifier' &&
      ((valueArgs[1] as any).value === ')' || (valueArgs[1] as any).name === ')')
    ) {
      // functionName: (valueArgs[0] as any).name,
      // secondToken: (valueArgs[1] as any).value || (valueArgs[1] as any).name
      // });
      return true;
    }

    // Pattern 3: Constructor call with 'new' keyword (e.g., new Date())
    if (this.isConstructorCall(valueArgs)) {
      return true;
    }

    // Pattern 4: Method call with arguments (e.g., Math.max(1, 5, 3))
    if (this.isMathMethodCall(valueArgs)) {
      return true;
    }

    return false;
  }

  /**
   * Check if this is a constructor call with 'new' keyword (e.g., new Date())
   */
  private isConstructorCall(valueArgs: ASTNode[]): boolean {
    if (valueArgs.length < 3) return false;

    // Debug the first few tokens
    // token0: { type: valueArgs[0].type, name: (valueArgs[0] as any).name, value: (valueArgs[0] as any).value },
    // token1: { type: valueArgs[1].type, name: (valueArgs[1] as any).name, value: (valueArgs[1] as any).value },
    // token2: { type: valueArgs[2].type, name: (valueArgs[2] as any).name, value: (valueArgs[2] as any).value }
    // });

    // Pattern: new + identifier + ) (e.g., new Date())
    // Check for different ways 'new' might be tokenized
    const firstToken = valueArgs[0];
    const isNewKeyword =
      (firstToken.type === 'keyword' && (firstToken as any).name === 'new') ||
      (firstToken.type === 'identifier' && (firstToken as any).name === 'new') ||
      (firstToken as any).value === 'new';

    if (
      valueArgs.length === 3 &&
      isNewKeyword &&
      valueArgs[1].type === 'identifier' &&
      ((valueArgs[2] as any).value === ')' || (valueArgs[2] as any).name === ')')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if this is a Math method call like Math.max(1, 5, 3)
   */
  private isMathMethodCall(valueArgs: ASTNode[]): boolean {
    if (valueArgs.length < 4) return false;

    // Debug the first few tokens
    // token0: { type: valueArgs[0].type, name: (valueArgs[0] as any).name, value: (valueArgs[0] as any).value },
    // token1: { type: valueArgs[1].type, name: (valueArgs[1] as any).name, value: (valueArgs[1] as any).value },
    // token2: { type: valueArgs[2].type, name: (valueArgs[2] as any).name, value: (valueArgs[2] as any).value },
    // lastToken: { type: valueArgs[valueArgs.length - 1].type, name: (valueArgs[valueArgs.length - 1] as any).name, value: (valueArgs[valueArgs.length - 1] as any).value }
    // });

    // Look for pattern: Math . methodName [args...] )
    if (
      valueArgs.length >= 4 &&
      valueArgs[0].type === 'identifier' &&
      (valueArgs[0] as any).name === 'Math' &&
      ((valueArgs[1] as any).value === '.' || (valueArgs[1] as any).name === '.') &&
      valueArgs[2].type === 'identifier' &&
      ((valueArgs[valueArgs.length - 1] as any).value === ')' ||
        (valueArgs[valueArgs.length - 1] as any).name === ')')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Evaluate a Math method call like Math.max(1, 5, 3)
   */
  private evaluateMathMethodCall(valueArgs: ASTNode[]): any {
    try {
      // Pattern: Math . methodName [args...] )
      const methodName = (valueArgs[2] as any).name;

      // Extract arguments (everything between methodName and closing parenthesis)
      const argTokens = valueArgs.slice(3, -1); // Skip Math, ., methodName, and closing )
      const args: number[] = [];

      // type: token.type,
      // name: (token as any).name,
      // value: (token as any).value
      // })));

      // Parse numeric arguments from tokens
      for (const token of argTokens) {
        const tokenValue = (token as any).name || (token as any).value;

        if (
          token.type === 'number' ||
          token.type === 'literal' ||
          (token.type === 'identifier' && !isNaN(Number(tokenValue)))
        ) {
          const value =
            token.type === 'number' || token.type === 'literal'
              ? (token as any).value
              : Number(tokenValue);
          args.push(value);
        }
      }

      // Call the Math method
      const mathMethod = (Math as any)[methodName];
      if (typeof mathMethod === 'function') {
        const result = mathMethod(...args);
        return result;
      } else {
        console.warn('🔧 SET: Math method not found:', methodName);
        return `Math.${methodName}(${args.join(', ')})`;
      }
    } catch (error) {
      // console.error('🔧 SET: Math method call error:', error);
      return `Math.${(valueArgs[2] as any).name}(...)`;
    }
  }

  /**
   * Evaluate a constructor call with 'new' keyword like new Date()
   */
  private evaluateConstructorCall(valueArgs: ASTNode[]): any {
    try {
      // Pattern: new + constructorName + ) (e.g., new Date())
      const constructorName = (valueArgs[1] as any).name;

      // Try to resolve the constructor from global context
      const globalObj =
        typeof globalThis !== 'undefined'
          ? globalThis
          : typeof window !== 'undefined'
            ? window
            : global;

      const constructor = (globalObj as any)[constructorName];
      if (typeof constructor === 'function') {
        const result = new constructor();
        return result;
      } else {
        console.warn('🔧 SET: Constructor not found:', constructorName);
        return `new ${constructorName}()`;
      }
    } catch (error) {
      // console.error('🔧 SET: Constructor call error:', error);
      return `new ${(valueArgs[1] as any).name}()`;
    }
  }

  /**
   * Evaluate a function call from parsed tokens
   */
  private async evaluateFunctionCall(
    valueArgs: ASTNode[],
    context: ExecutionContext
  ): Promise<any> {
    // Handle constructor calls with 'new' keyword
    if (this.isConstructorCall(valueArgs)) {
      return this.evaluateConstructorCall(valueArgs);
    }

    // Handle Math method calls
    if (this.isMathMethodCall(valueArgs)) {
      return this.evaluateMathMethodCall(valueArgs);
    }

    if (valueArgs.length === 3 || valueArgs.length === 2) {
      // Simple function call: functionName() (either 3 tokens or 2 tokens)
      const functionName = (valueArgs[0] as any).name;

      try {
        // Try to resolve the function from global context
        const globalObj =
          typeof globalThis !== 'undefined'
            ? globalThis
            : typeof window !== 'undefined'
              ? window
              : global;

        const func = (globalObj as any)[functionName];
        if (typeof func === 'function') {
          const result = func();
          return result;
        } else {
          console.warn('🔧 SET: Function not found:', functionName);
          return `${functionName}()`;
        }
      } catch (error) {
        // console.error('🔧 SET: Function call error:', error);
        return `${functionName}()`;
      }
    }

    // Fallback to string concatenation
    const results = await Promise.all(valueArgs.map(arg => this.execute(arg, context)));
    return results.join(' ');
  }

  /**
   * Get available command names (both enhanced and legacy)
   */
  getAvailableCommands(): string[] {
    const commands = new Set<string>();

    // Add enhanced commands
    if (this.options.useEnhancedCommands) {
      this.commandRegistry.getCommandNames().forEach((name: string) => commands.add(name));
    }

    // Add legacy commands
    ['hide', 'show', 'wait', 'add', 'remove', 'put', 'set', 'log'].forEach(name =>
      commands.add(name)
    );

    return Array.from(commands);
  }

  /**
   * Validate command before execution
   */
  validateCommand(
    name: string,
    input: unknown
  ): { valid: boolean; error?: string; suggestions?: string[] } {
    // Try enhanced validation first
    if (this.options.useEnhancedCommands && this.commandRegistry.has(name.toLowerCase())) {
      const result = this.commandRegistry.validateCommand(name.toLowerCase(), input);
      const returnObj: { valid: boolean; error?: string; suggestions?: string[] } = {
        valid: result.success ?? false,
      };
      if (result.error?.message) {
        returnObj.error = result.error.message;
      }
      if (result.error?.suggestions) {
        returnObj.suggestions = result.error.suggestions;
      }
      return returnObj;
    }

    // Basic validation for legacy commands
    const availableCommands = this.getAvailableCommands();
    if (!availableCommands.includes(name.toLowerCase())) {
      return {
        valid: false,
        error: `Unknown command: ${name}`,
        suggestions: [`Available commands: ${availableCommands.join(', ')}`],
      };
    }

    return { valid: true };
  }

  /**
   * Get enhanced command registry (for debugging/inspection)
   */
  getRegistry(): CommandRegistry {
    return this.commandRegistry;
  }

  /**
   * Check if enhanced commands are enabled
   */
  isUsingEnhancedCommands(): boolean {
    return this.options.useEnhancedCommands === true;
  }
}
