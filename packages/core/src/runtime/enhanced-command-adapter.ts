/**
 * Enhanced Command Adapter
 * Bridges enhanced TypeScript commands with the runtime system
 * Converts TypedCommandImplementation to runtime-compatible format
 */

import type { 
  ExecutionContext, 
  TypedExecutionContext,
  ValidationResult 
} from '../types/core.js';


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
      event: context.event,
      
      // Variable storage
      variables: context.variables || new Map(),
      locals: context.locals || new Map(),
      globals: context.globals || new Map(),
      
      // Runtime state
      events: context.events,
      meta: context.meta || {},
      
      // Enhanced features for typed commands
      errors: [],
      commandHistory: [],
      validationMode: 'strict'
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
      event: typedContext.event,
      variables: typedContext.variables,
      locals: typedContext.locals,
      globals: typedContext.globals,
      events: typedContext.events,
      meta: typedContext.meta
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
      // Convert to typed context
      const typedContext = ContextBridge.toTyped(context);
      
      // Execute enhanced command with typed context and spread args
      const result = await this.impl.execute(typedContext, ...args);
      
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
  register<TInput, TOutput, TContext extends TypedExecutionContext>(
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
    
    // Import and register all enhanced commands
    // This will be populated as we integrate each command
    
    return registry;
  }
}

/**
 * Factory function to create enhanced command adapters
 */
export function createEnhancedAdapter(impl: any): EnhancedCommandAdapter {
  return new EnhancedCommandAdapter(impl);
}