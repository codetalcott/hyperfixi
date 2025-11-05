/**
 * Enhanced Command Adapter
 * Bridges enhanced TypeScript commands with the runtime system
 * Converts TypedCommandImplementation to runtime-compatible format
 */

import type {
  ExecutionContext,
  TypedExecutionContext,
  ValidationResult
} from '../types/core';
import type { ASTNode } from '../types/base-types';
import {
  createAllEnhancedCommands,
  ENHANCED_COMMAND_FACTORIES,
  getEnhancedCommandNames
} from '../commands/command-registry';
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
 * Context bridge between ExecutionContext and TypedExecutionContext
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
      evaluationHistory: []
    };
  }

  /**
   * Update ExecutionContext from TypedExecutionContext
   */
  static fromTyped(typedContext: TypedExecutionContext, originalContext: ExecutionContext): ExecutionContext {
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
      ...(typedContext.meta !== undefined && { meta: typedContext.meta })
    };
  }
}

/**
 * Enhanced Command Adapter
 * Wraps TypedCommandImplementation for runtime compatibility
 */
export class CommandAdapter implements RuntimeCommand {
  constructor(private impl: any) {}

  get name(): string {
    return this.impl.name || this.impl.metadata?.name;
  }

  get metadata() {
    return {
      description: this.impl.description,
      examples: this.impl.metadata?.examples || [],
      syntax: this.impl.syntax
    };
  }

  /**
   * Execute command with context conversion
   */
  async execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    try {
      // Convert to typed context
      const typedContext = ContextBridge.toTyped(context);

      // Execute enhanced command - different signature for enhanced vs legacy commands
      let result;

      // Check if this is a TypedCommandImplementation (enhanced command)
      if (this.impl.execute && this.impl.execute.length === 2) {
        // Enhanced command expects (input, context) signature
        let input: unknown;
        
        // SET command argument processing - handle context confusion
        if (this.impl.name === 'set') {
          // Check if we received the context object by mistake (has all context properties)
          if (args.length === 1 && args[0] && typeof args[0] === 'object' &&
              'me' in args[0] && 'locals' in args[0] && 'globals' in args[0] && 'result' in args[0]) {
            throw new Error('SET command received context object instead of parsed arguments. Check runtime command adapter routing.');
          }
          
          // Simple approach: create input object from raw arguments
          if (Array.isArray(args) && args.length >= 2) {
            // Assume format: [targetNode, valueNode] for "set target to value"
            const [targetNode, valueNode] = args;
            
            // Extract target name from AST node
            let target;
            if (typeof targetNode === 'string') {
              target = targetNode;
            } else if (targetNode && typeof targetNode === 'object' && 'name' in targetNode) {
              target = (targetNode as any).name;
            } else if (targetNode && typeof targetNode === 'object' && 'value' in targetNode) {
              target = (targetNode as any).value;
            } else {
              target = String(targetNode);
            }
            
            // Extract value from AST node  
            let value;
            if (typeof valueNode === 'object' && valueNode && 'value' in valueNode) {
              value = (valueNode as any).value;
            } else {
              value = valueNode;
            }
            
            input = {
              target: target,
              value: value,
              toKeyword: 'to' as const,
              scope: undefined
            };
          } else if (args.length === 1 && args[0] && typeof args[0] === 'object' && 'target' in args[0]) {
            // Pre-processed input object from runtime
            input = args[0];
          } else if (args.length === 1) {
            // Single argument - could be just the target, treat as fallback case
            input = {
              target: args[0],
              value: undefined,
              toKeyword: 'to' as const,
              scope: undefined
            };
          } else {
            // Multiple arguments fallback: create input from first two arguments
            input = {
              target: args[0],
              value: args[1],
              toKeyword: 'to' as const,
              scope: undefined
            };
          }
        } else if (this.impl.name === 'render' && Array.isArray(args) && args.length >= 3 && args[1] === 'with') {
          // Convert ['template', 'with', 'data'] to structured input  
          input = {
            template: args[0],
            variables: args[2],
            withKeyword: 'with' as const
          };
        } else if (this.impl.name === 'log') {
          // LOG command - all arguments are values to log
          input = {
            values: Array.isArray(args) ? args : [args]
          };
        } else if (this.impl.name === 'install') {
          // INSTALL command - convert [behaviorNameNode, paramsNode?, targetNode?] to structured input
          // Expected args from parser:
          //   args[0]: Identifier node with behavior name
          //   args[1]: ObjectLiteral node with parameters (optional)
          //   args[2]: Target expression (optional, defaults to 'me')

          let behaviorName: string | undefined;
          let parameters: Record<string, unknown> | undefined;
          let target: unknown | undefined;

          // Extract behavior name
          if (args.length > 0 && args[0]) {
            const nameNode = args[0];
            if (typeof nameNode === 'string') {
              behaviorName = nameNode;
            } else if (typeof nameNode === 'object' && nameNode && 'name' in nameNode) {
              behaviorName = (nameNode as any).name;
            } else if (typeof nameNode === 'object' && nameNode && 'value' in nameNode) {
              behaviorName = (nameNode as any).value;
            }
          }

          // Extract parameters (if present)
          if (args.length > 1 && args[1]) {
            const paramsNode = args[1];
            if (typeof paramsNode === 'object' && paramsNode !== null) {
              // Check if it's an object literal node from the parser
              if ('properties' in paramsNode && Array.isArray((paramsNode as any).properties)) {
                // It's an AST objectLiteral node - already evaluated by runtime
                parameters = paramsNode as Record<string, unknown>;
              } else if ('type' in paramsNode && (paramsNode as any).type === 'objectLiteral') {
                // AST node not yet evaluated - this shouldn't happen but handle it
                parameters = paramsNode as Record<string, unknown>;
              } else {
                // Already evaluated to a plain object
                parameters = paramsNode as Record<string, unknown>;
              }
            }
          }

          // Extract target (if present)
          if (args.length > 2) {
            target = args[2];
          }

          input = {
            behaviorName,
            parameters,
            target
          };
        } else if (this.impl.name === 'transition' || this.impl.metadata?.name === 'transition') {
          // TRANSITION command - receives raw AST nodes, extract metadata then evaluate values
          // Expected args from parser:
          //   args[0]: String node with property name (may include * prefix)
          //   args[1]: Value expression node (needs evaluation with context)
          //   args[2]: Duration expression node (optional, needs evaluation)
          //   args[3]: Timing function expression node (optional, needs evaluation)

          const property = args[0] ? (typeof args[0] === 'string' ? args[0] : (args[0] as any).value || (args[0] as any).content) : undefined;

          // Evaluate value, duration, timingFunction using the expression evaluator
          const evaluator = new ExpressionEvaluator();
          const value = args[1] && typeof args[1] === 'object' && 'type' in args[1] ? await evaluator.evaluate(args[1] as ASTNode, context) : args[1];
          const duration = args.length > 2 && args[2] && typeof args[2] === 'object' && 'type' in args[2] ? await evaluator.evaluate(args[2] as ASTNode, context) : args[2];
          const timingFunction = args.length > 3 && args[3] && typeof args[3] === 'object' && 'type' in args[3] ? await evaluator.evaluate(args[3] as ASTNode, context) : args[3];

          input = {
            property,
            value,
            duration,
            timingFunction
          };
        } else if (this.impl.name === 'repeat' || this.impl.metadata?.name === 'repeat') {
          // REPEAT command - receives raw AST nodes, extract loop type then evaluate as needed
          // Expected args from parser:
          //   args[0]: Identifier node with loop type ('for', 'times', 'while', 'until', 'until-event', 'forever')
          //   args[1]: Variable name (string node) for 'for' loops, OR event name for 'until-event'
          //   args[2]: Collection/condition/times/eventTarget expression
          //   args[3]: (for until-event with from) event target
          //   args[...]: Commands block (last arg with type 'block' containing commands array)

          const loopType = args[0] ? (typeof args[0] === 'string' ? args[0] : (args[0] as any).name || (args[0] as any).value) : undefined;

          debug.loop('REPEAT: Received args:', {
            argsLength: args.length,
            loopType,
            arg0: args[0],
            arg1: args[1],
            arg2: args[2],
            arg3: args[3],
            allArgs: args.map((arg: any, i: number) => ({
              index: i,
              type: arg?.type,
              name: arg?.name,
              value: arg?.value,
              keys: arg && typeof arg === 'object' ? Object.keys(arg) : []
            }))
          });

          let variable: string | undefined;
          let collection: any;
          let condition: any;
          let count: number | undefined;
          let eventName: string | undefined;
          let eventTarget: any;
          let commands: Function[] = [];

          // Create evaluator for AST node evaluation
          const evaluator = new ExpressionEvaluator();

          // Parse based on loop type
          if (loopType === 'for') {
            variable = args[1] ? (typeof args[1] === 'string' ? args[1] : (args[1] as any).value) : undefined;
            collection = args[2] && typeof args[2] === 'object' && 'type' in args[2] ? await evaluator.evaluate(args[2] as ASTNode, context) : args[2];
          } else if (loopType === 'times') {
            const timesArg = args[1] && typeof args[1] === 'object' && 'type' in args[1] ? await evaluator.evaluate(args[1] as ASTNode, context) : args[1];
            count = typeof timesArg === 'number' ? timesArg : undefined;
          } else if (loopType === 'while' || loopType === 'until') {
            condition = args[1]; // Keep as AST node for later evaluation
          } else if (loopType === 'until-event') {
            eventName = args[1] ? (typeof args[1] === 'string' ? args[1] : (args[1] as any).value) : undefined;
            eventTarget = args[2] && typeof args[2] === 'object' && 'type' in args[2] ? await evaluator.evaluate(args[2] as ASTNode, context) : args[2];
          }

          // Extract command block - look for arg with type 'block' containing commands array
          const blockArg = args.find((arg: any) => arg && typeof arg === 'object' && arg.type === 'block');
          if (blockArg && Array.isArray((blockArg as any).commands)) {
            // Get the runtime execute function from context
            const runtimeExecute = context.locals.get('_runtimeExecute');
            if (typeof runtimeExecute === 'function') {
              // Convert each command AST node to an executable function
              // The function receives the loop iteration context and passes it to runtime execute
              commands = (blockArg as any).commands.map((cmdNode: any) => {
                return async (ctx: any) => {
                  return await runtimeExecute(cmdNode, ctx);
                };
              });
              debug.loop(`REPEAT: Extracted ${commands.length} commands from block`);
            } else {
              console.warn('REPEAT: _runtimeExecute not found in context, commands will be empty');
            }
          } else {
            console.warn('REPEAT: No block arg found with commands array', { args: args.map((a: any) => ({ type: a?.type, keys: a && typeof a === 'object' ? Object.keys(a) : [] })) });
          }

          debug.loop('REPEAT: Parsed values:', {
            loopType,
            variable,
            collection,
            condition,
            count,
            eventName,
            eventTarget,
            commandsLength: commands.length
          });

          input = {
            type: loopType,
            variable,
            collection,
            condition,
            count,
            eventName,
            eventTarget,
            commands
          };

          debug.loop('REPEAT: Created input object:', input);
        } else if (this.impl.name === 'wait' || this.impl.metadata?.name === 'wait') {
          // WAIT command - args may be already evaluated or raw AST nodes
          // Expected args:
          //   Simple time wait: args[0] = time value or expression
          //   Event wait: args[0] = array of event objects, args[1] = optional target

          const evaluator = new ExpressionEvaluator();

          // Helper to evaluate only if needed (if arg is AST node, not plain value)
          const evaluateIfNeeded = async (arg: any): Promise<any> => {
            if (arg === null || arg === undefined) {
              return arg;
            }
            // If it has a 'type' property, it's an AST node - evaluate it
            if (typeof arg === 'object' && 'type' in arg) {
              return await evaluator.evaluate(arg, context);
            }
            // Otherwise it's already evaluated - return as-is
            return arg;
          };

          // Check if this is a time-based wait or event-based wait
          if (args.length === 1 && args[0] && !Array.isArray(args[0])) {
            // Time-based wait: wait 1000ms or wait 1s
            const timeValue = await evaluateIfNeeded(args[0]);
            input = {
              type: 'time',
              value: typeof timeValue === 'number' ? timeValue : 1000
            };
          } else {
            // Event-based wait: wait for event(args) or event from target
            const eventsArray = args[0] ? await evaluateIfNeeded(args[0]) : [];
            const sourceTarget = args.length > 1 ? await evaluateIfNeeded(args[1]) : context.me;

            input = {
              type: 'event',
              events: Array.isArray(eventsArray) ? eventsArray : [],
              source: sourceTarget
            };

            debug.async('WAIT: Prepared event input:', input);
          }
        } else {
          // Default input handling for non-SET/non-RENDER/non-LOG/non-INSTALL/non-TRANSITION/non-REPEAT/non-WAIT commands
          input = args.length === 1 ? args[0] : args;
        }
        
        result = await this.impl.execute(input, typedContext);
      } else {
        // Legacy command adapter expects (context, ...args) signature
        result = await this.impl.execute(typedContext, ...args);
      }
      
      // Update original context with changes
      Object.assign(context, ContextBridge.fromTyped(typedContext, context));
      
      // Extract value from EvaluationResult if needed
      if (result && typeof result === 'object' && 'success' in result) {
        return result.success ? result.value : result;
      }
      
      return result;
      
    } catch (error) {
      // Check for halt execution - don't wrap, just rethrow
      if (error instanceof Error && (error as any).isHalt) {
        throw error;
      }

      // Enhanced error handling with suggestions
      if (error instanceof Error) {
        const enhancedError = new Error(`${this.name} command error: ${error.message}`);

        // Add suggestions if available from validation
        if (this.impl.validation) {
          const suggestions = this.generateSuggestions(args);
          if (suggestions.length > 0) {
            enhancedError.message += `\n\nSuggestions:\n${suggestions.map(s => `  • ${s}`).join('\n')}`;
          }
        }

        throw enhancedError;
      }

      throw error;
    }
  }

  /**
   * Validate command input
   */
  validate(input: unknown): ValidationResult<unknown> {
    if (!this.impl.validate) {
      return { isValid: true,
        errors: [],
        suggestions: [], data: input };
    }
    
    // Use the command's validate method - pass input directly since commands expect tuple format
    const result = this.impl.validate(input);
    return {
      isValid: result.isValid,
      errors: result.errors || [],
      suggestions: result.suggestions || [],
      data: input,
      error: result.errors?.[0]
    };
  }


  /**
   * Generate helpful suggestions for command usage
   */
  private generateSuggestions(args: unknown[]): string[] {
    const suggestions: string[] = [];
    
    // Add basic syntax suggestion
    if (this.impl.syntax) {
      suggestions.push(`Correct syntax: ${this.impl.syntax}`);
    }
    
    // Add example usage
    if (this.impl.metadata?.examples?.length > 0) {
      const firstExample = this.impl.metadata.examples[0];
      const exampleCode = typeof firstExample === 'object' ? firstExample.code : firstExample;
      suggestions.push(`Example: ${exampleCode}`);
    }
    
    // Add argument count suggestion
    if (args.length === 0) {
      suggestions.push('This command requires arguments');
    }
    
    return suggestions;
  }
}

/**
 * Lazy Command Registry
 * Loads commands on-demand for optimal tree-shaking and bundle size
 */
export class LazyCommandRegistry {
  private adapters = new Map<string, CommandAdapter>();
  private implementations = new Map<string, any>();
  private allowedCommands?: Set<string>; // For explicit command filtering

  constructor(allowedCommands?: string[]) {
    if (allowedCommands) {
      this.allowedCommands = new Set(allowedCommands);
    }
  }

  /**
   * Get runtime-compatible command adapter (lazy loads on first access)
   */
  getAdapter(name: string): CommandAdapter | undefined {
    // Check if command is in allowed list (if filtering is enabled)
    if (this.allowedCommands && !this.allowedCommands.has(name)) {
      return undefined;
    }

    // Return cached adapter if already loaded
    if (this.adapters.has(name)) {
      return this.adapters.get(name);
    }

    // Lazy load the command
    const impl = this.loadCommand(name);
    if (!impl) {
      return undefined;
    }

    // Create and cache adapter
    const adapter = new CommandAdapter(impl);
    this.adapters.set(name, adapter);
    this.implementations.set(name, impl);

    return adapter;
  }

  /**
   * Load a command implementation on-demand
   */
  private loadCommand(name: string): any {
    // Access command factory from statically imported registry
    // Note: Despite the "lazy" naming, factories are statically imported for browser compatibility
    const factory = ENHANCED_COMMAND_FACTORIES[name as keyof typeof ENHANCED_COMMAND_FACTORIES];

    if (!factory) {
      return null;
    }

    return factory();
  }

  /**
   * Get original enhanced implementation (lazy loads if needed)
   */
  getImplementation(name: string): any {
    if (!this.implementations.has(name)) {
      this.getAdapter(name); // Trigger lazy load
    }
    return this.implementations.get(name);
  }

  /**
   * Check if command exists (doesn't trigger load)
   */
  has(name: string): boolean {
    // Check if already loaded
    if (this.adapters.has(name)) {
      return true;
    }

    // Check if it exists in the statically imported factory registry
    return name in ENHANCED_COMMAND_FACTORIES;
  }

  /**
   * Get all available command names (from factory registry, not just loaded)
   */
  getCommandNames(): string[] {
    // Use statically imported function for browser compatibility
    const allNames = getEnhancedCommandNames();

    // Filter by allowed commands if specified
    if (this.allowedCommands) {
      return allNames.filter((name: string) => this.allowedCommands!.has(name));
    }

    return allNames;
  }

  /**
   * Get all runtime adapters (only returns loaded commands)
   */
  getAdapters(): Map<string, CommandAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Validate a command exists and can handle the given input
   */
  validateCommand(name: string, input: unknown): ValidationResult<unknown> {
    const adapter = this.getAdapter(name);
    if (!adapter) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error',
          message: `Unknown command: ${name}`,
          suggestions: [`Available commands: ${this.getCommandNames().join(', ')}`]
        }],
        suggestions: [`Available commands: ${this.getCommandNames().join(', ')}`]
      };
    }

    return adapter.validate(input);
  }

  /**
   * Preload specific commands (for performance optimization)
   */
  warmup(commandNames: string[]): void {
    for (const name of commandNames) {
      this.getAdapter(name); // Trigger lazy load
    }
  }
}

/**
 * Enhanced Command Registry
 * Manages enhanced commands and their runtime adapters
 */
export class EnhancedCommandRegistry {
  private adapters = new Map<string, CommandAdapter>();
  private implementations = new Map<string, any>();

  /**
   * Register an enhanced command
   */
  register(
    impl: any
  ): void {
    const adapter = new CommandAdapter(impl);
    const name = adapter.name; // Use adapter.name which handles both impl.name and impl.metadata.name

    // Debug logging for undefined names
    if (!name || name === 'undefined') {
      console.warn('⚠️  Attempting to register command with undefined name:', {
        impl,
        implName: impl?.name,
        implMetadata: impl?.metadata,
        implMetadataName: impl?.metadata?.name,
        adapterName: adapter.name
      });
    }

    this.adapters.set(name, adapter);
    this.implementations.set(name, impl);
  }

  /**
   * Get runtime-compatible command adapter
   */
  getAdapter(name: string): CommandAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get original enhanced implementation
   */
  getImplementation(name: string): any {
    return this.implementations.get(name);
  }

  /**
   * Check if command is registered
   */
  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * Get all registered command names
   */
  getCommandNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all runtime adapters
   */
  getAdapters(): Map<string, CommandAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Validate a command exists and can handle the given input
   */
  validateCommand(name: string, input: unknown): ValidationResult<unknown> {
    const adapter = this.getAdapter(name);
    if (!adapter) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error',
          message: `Unknown command: ${name}`,
          suggestions: [`Available commands: ${this.getCommandNames().join(', ')}`]
        }],
        suggestions: [`Available commands: ${this.getCommandNames().join(', ')}`]
      };
    }

    return adapter.validate(input);
  }

  /**
   * Create registry with all enhanced commands pre-registered
   * @deprecated Use createWithLazyLoading() for better performance and smaller bundles
   */
  static createWithDefaults(): EnhancedCommandRegistry {
    const registry = new EnhancedCommandRegistry();

    // Import and register all enhanced commands from the enhanced command registry
    try {
      const commands = createAllEnhancedCommands();

      // Register all commands
      for (const [_name, command] of commands.entries()) {
        registry.register(command);
      }
    } catch (error) {
      console.warn('Failed to load enhanced commands:', error);
    }

    return registry;
  }

  /**
   * Create registry with lazy loading for optimal bundle size
   * Commands are only loaded when first used
   */
  static createWithLazyLoading(options?: { commands?: string[] }): LazyCommandRegistry {
    return new LazyCommandRegistry(options?.commands);
  }
}

/**
 * Factory function to create enhanced command adapters
 */
export function createEnhancedAdapter(impl: any): CommandAdapter {
  return new CommandAdapter(impl);
}