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
import { createAllEnhancedCommands } from '../commands/enhanced-command-registry';


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
export class EnhancedCommandAdapter implements RuntimeCommand {
  constructor(private impl: any) {}

  get name(): string {
    return this.impl.name;
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
      // Debug logging for SET command
      if (this.impl.name === 'set') {
        // console.log('🚨🚨🚨 ENHANCED COMMAND ADAPTER EXECUTE CALLED FOR SET 🚨🚨🚨');
        // console.log('🔧 EnhancedCommandAdapter.execute() called with:', { 
          // commandName: this.impl.name, 
          // args, 
          // argsLength: args.length,
          // argsType: Array.isArray(args) ? 'array' : typeof args
        // });
      }
      
      // Convert to typed context
      const typedContext = ContextBridge.toTyped(context);
      
      // Execute enhanced command - different signature for enhanced vs legacy commands
      let result;
      
      // Check if this is a TypedCommandImplementation (enhanced command)
      
      // console.log('🔧 Command signature analysis:', {
        // commandName: this.impl.name,
        // hasExecute,
        // executeLength,
        // isEnhancedSignature,
        // executeMethod: this.impl.execute?.toString().substring(0, 200) + '...'
      // });
      
      if (this.impl.execute && this.impl.execute.length === 2) {
        // console.log('🔧 Detected enhanced command with proper signature - using enhanced path');
        // Enhanced command expects (input, context) signature
        let input: unknown;
        
        // SET command argument processing - handle context confusion
        if (this.impl.name === 'set') {
          // console.log('🔧 SET: Received arguments from runtime:', { 
            // args, 
            // isArray: Array.isArray(args), 
            // length: Array.isArray(args) ? args.length : 'not array',
            // argsContent: args
          // });
          
          // Detailed debugging of the first argument
          if (args.length > 0) {
            // console.log('🔧 SET: First argument detailed analysis:', {
              // type: typeof firstArg,
              // isObject: typeof firstArg === 'object' && firstArg !== null,
              // hasMe: firstArg && 'me' in firstArg,
              // hasLocals: firstArg && 'locals' in firstArg,
              // hasGlobals: firstArg && 'globals' in firstArg,
              // hasResult: firstArg && 'result' in firstArg,
              // hasTarget: firstArg && 'target' in firstArg,
              // keys: firstArg && typeof firstArg === 'object' ? Object.keys(firstArg) : 'not object'
            // });
          }
          
          // Check if we received the context object by mistake (has all context properties)
          if (args.length === 1 && args[0] && typeof args[0] === 'object' && 
              'me' in args[0] && 'locals' in args[0] && 'globals' in args[0] && 'result' in args[0]) {
            // console.log('🚨 SET: ERROR - Received context object instead of arguments!');
            // console.log('🚨 SET: This indicates a problem in the runtime command routing');
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
            // console.log('🔧 SET: Created simple input object from AST nodes:', { 
              // input, 
              // originalTargetNode: targetNode, 
              // originalValueNode: valueNode 
            // });
          } else if (args.length === 1 && args[0] && typeof args[0] === 'object' && 'target' in args[0]) {
            // Pre-processed input object from runtime
            input = args[0];
            // console.log('🔧 SET: Using pre-processed input object from runtime:', input);
          } else if (args.length === 1) {
            // Single argument - could be just the target, treat as fallback case
            // console.log('🔧 SET: Single argument fallback case');
            input = {
              target: args[0],
              value: undefined,
              toKeyword: 'to' as const,
              scope: undefined
            };
            // console.log('🔧 SET: Created single-arg fallback input object:', input);
          } else {
            // Multiple arguments fallback: create input from first two arguments
            input = {
              target: args[0],
              value: args[1],
              toKeyword: 'to' as const,
              scope: undefined
            };
            // console.log('🔧 SET: Created multi-arg fallback input object:', input);
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
        } else {
          // Default input handling for non-SET/non-RENDER/non-LOG commands
          input = args.length === 1 ? args[0] : args;
        }
        
        result = await this.impl.execute(input, typedContext);
      } else {
        // console.log('🔧 Using legacy command path - calling with (context, ...args)');
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
      success: result.isValid,
      data: input,
      error: result.errors?.[0] ? {
        message: result.errors[0].message,
        suggestions: result.suggestions
      } : undefined
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
 * Enhanced Command Registry
 * Manages enhanced commands and their runtime adapters
 */
export class EnhancedCommandRegistry {
  private adapters = new Map<string, EnhancedCommandAdapter>();
  private implementations = new Map<string, any>();

  /**
   * Register an enhanced command
   */
  register(
    impl: any
  ): void {
    const adapter = new EnhancedCommandAdapter(impl);
    this.adapters.set(impl.name, adapter);
    this.implementations.set(impl.name, impl);
  }

  /**
   * Get runtime-compatible command adapter
   */
  getAdapter(name: string): EnhancedCommandAdapter | undefined {
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
  getAdapters(): Map<string, EnhancedCommandAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Validate a command exists and can handle the given input
   */
  validateCommand(name: string, input: unknown): ValidationResult<unknown> {
    const adapter = this.getAdapter(name);
    if (!adapter) {
      return {
        success: false,
        error: {
          type: 'runtime-error',
          message: `Unknown command: ${name}`,
          suggestions: [`Available commands: ${this.getCommandNames().join(', ')}`]
        }
      };
    }

    return adapter.validate(input);
  }

  /**
   * Create registry with all enhanced commands pre-registered
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
}

/**
 * Factory function to create enhanced command adapters
 */
export function createEnhancedAdapter(impl: any): EnhancedCommandAdapter {
  return new EnhancedCommandAdapter(impl);
}