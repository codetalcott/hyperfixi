/**
 * Enhanced Repeat Command Implementation
 * Provides iteration in the hyperscript language
 * 
 * Syntax: repeat for <identifier> in <expression> [index <identifier>] { <command> } end
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface RepeatCommandInput {
  type: 'for' | 'times' | 'while' | 'until' | 'forever'; // Type of repeat
  variable?: string; // Variable name for iteration
  collection?: any; // Collection to iterate over
  condition?: any; // Condition for while/until
  count?: number; // Number of times for 'times' type
  indexVariable?: string; // Index variable name
  commands?: Function[]; // Commands to execute in loop
}

// Output type definition
export interface RepeatCommandOutput {
  type: string;
  iterations: number;
  completed: boolean;
  lastResult?: any;
  interrupted?: boolean;
}

/**
 * Enhanced Repeat Command with full type safety and validation
 */
export class EnhancedRepeatCommand implements TypedCommandImplementation<
  RepeatCommandInput,
  RepeatCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'repeat',
    description: 'The repeat command provides iteration in the hyperscript language. It supports for-in loops, counted loops, conditional loops, and infinite loops.',
    examples: [
      'repeat for item in items { log item }',
      'repeat 5 times { log "hello" }',
      'repeat while count < 10 { increment count }',
      'repeat until done { checkStatus }',
      'repeat forever { monitor }'
    ],
    syntax: 'repeat for <identifier> in <expression> [index <identifier>] { <command> } end',
    category: 'flow' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<RepeatCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Repeat command requires loop configuration',
            suggestions: 'Provide loop type and parameters'
          }
        };
      }

      const inputObj = input as any;

      if (!inputObj.type) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Repeat command requires a loop type',
            suggestions: 'Use types: for, times, while, until, forever'
          }
        };
      }

      const validTypes = ['for', 'times', 'while', 'until', 'forever'];
      if (!validTypes.includes(inputObj.type)) {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: `Invalid repeat type: ${inputObj.type}`,
            suggestions: 'Use types: for, times, while, until, forever'
          }
        };
      }

      // Validate type-specific requirements
      if (inputObj.type === 'for' && (!inputObj.variable || !inputObj.collection)) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'For loops require variable and collection',
            suggestions: 'Use: repeat for item in items'
          }
        };
      }

      if (inputObj.type === 'times' && typeof inputObj.count !== 'number') {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Times loops require a count number',
            suggestions: 'Use: repeat 5 times'
          }
        };
      }

      if (['while', 'until'].includes(inputObj.type) && !inputObj.condition) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: `${inputObj.type} loops require a condition`,
            suggestions: `Use: repeat ${inputObj.type} condition`
          }
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          type: inputObj.type,
          variable: inputObj.variable,
          collection: inputObj.collection,
          condition: inputObj.condition,
          count: inputObj.count,
          indexVariable: inputObj.indexVariable,
          commands: inputObj.commands
        }
      };
    }
  };

  async execute(
    input: RepeatCommandInput,
    context: TypedExecutionContext
  ): Promise<RepeatCommandOutput> {
    const { type, variable, collection, condition, count, indexVariable, commands } = input;

    let iterations = 0;
    let completed = false;
    let lastResult: any = undefined;
    let interrupted = false;

    try {
      switch (type) {
        case 'for':
          ({ iterations, lastResult, interrupted } = await this.handleForLoop(
            context, variable!, collection, indexVariable, commands || []
          ));
          break;

        case 'times':
          ({ iterations, lastResult, interrupted } = await this.handleTimesLoop(
            context, count!, indexVariable, commands || []
          ));
          break;

        case 'while':
          ({ iterations, lastResult, interrupted } = await this.handleWhileLoop(
            context, condition, indexVariable, commands || []
          ));
          break;

        case 'until':
          ({ iterations, lastResult, interrupted } = await this.handleUntilLoop(
            context, condition, indexVariable, commands || []
          ));
          break;

        case 'forever':
          ({ iterations, lastResult, interrupted } = await this.handleForeverLoop(
            context, indexVariable, commands || []
          ));
          break;

        default:
          throw new Error(`Unknown repeat type: ${type}`);
      }

      completed = !interrupted;
      context.it = lastResult;

      return {
        type,
        iterations,
        completed,
        lastResult,
        interrupted
      };

    } catch (error) {
      // Handle control flow errors (break, continue, return)
      if (error instanceof Error && error.message.includes('BREAK')) {
        return {
          type,
          iterations,
          completed: true,
          lastResult,
          interrupted: true
        };
      }

      throw error;
    }
  }

  private async handleForLoop(
    context: TypedExecutionContext,
    variable: string,
    collection: any,
    indexVariable?: string,
    commands: Function[] = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;

    // Ensure collection is iterable
    const items = Array.isArray(collection) ? collection : [collection];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Set loop variables
      if (context.locals) {
        context.locals.set(variable, item);
        if (indexVariable) {
          context.locals.set(indexVariable, i);
        }
      }

      // Execute commands
      for (const command of commands) {
        try {
          lastResult = await command(context);
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes('BREAK')) {
              interrupted = true;
              break;
            }
            if (error.message.includes('CONTINUE')) {
              break;
            }
          }
          throw error;
        }
      }

      if (interrupted) break;
      iterations++;
    }

    return { iterations, lastResult, interrupted };
  }

  private async handleTimesLoop(
    context: TypedExecutionContext,
    count: number,
    indexVariable?: string,
    commands: Function[] = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;

    for (let i = 0; i < count; i++) {
      // Set index variable
      if (indexVariable && context.locals) {
        context.locals.set(indexVariable, i);
      }

      // Execute commands
      for (const command of commands) {
        try {
          lastResult = await command(context);
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes('BREAK')) {
              interrupted = true;
              break;
            }
            if (error.message.includes('CONTINUE')) {
              break;
            }
          }
          throw error;
        }
      }

      if (interrupted) break;
      iterations++;
    }

    return { iterations, lastResult, interrupted };
  }

  private async handleWhileLoop(
    context: TypedExecutionContext,
    condition: any,
    indexVariable?: string,
    commands: Function[] = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;
    const maxIterations = 10000; // Safety limit

    while (this.evaluateCondition(condition, context) && iterations < maxIterations) {
      // Set index variable
      if (indexVariable && context.locals) {
        context.locals.set(indexVariable, iterations);
      }

      // Execute commands
      for (const command of commands) {
        try {
          lastResult = await command(context);
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes('BREAK')) {
              interrupted = true;
              break;
            }
            if (error.message.includes('CONTINUE')) {
              break;
            }
          }
          throw error;
        }
      }

      if (interrupted) break;
      iterations++;
    }

    return { iterations, lastResult, interrupted };
  }

  private async handleUntilLoop(
    context: TypedExecutionContext,
    condition: any,
    indexVariable?: string,
    commands: Function[] = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;
    const maxIterations = 10000; // Safety limit

    while (!this.evaluateCondition(condition, context) && iterations < maxIterations) {
      // Set index variable
      if (indexVariable && context.locals) {
        context.locals.set(indexVariable, iterations);
      }

      // Execute commands
      for (const command of commands) {
        try {
          lastResult = await command(context);
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes('BREAK')) {
              interrupted = true;
              break;
            }
            if (error.message.includes('CONTINUE')) {
              break;
            }
          }
          throw error;
        }
      }

      if (interrupted) break;
      iterations++;
    }

    return { iterations, lastResult, interrupted };
  }

  private async handleForeverLoop(
    context: TypedExecutionContext,
    indexVariable?: string,
    commands: Function[] = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;
    const maxIterations = 10000; // Safety limit to prevent infinite loops

    while (iterations < maxIterations) {
      // Set index variable
      if (indexVariable && context.locals) {
        context.locals.set(indexVariable, iterations);
      }

      // Execute commands
      for (const command of commands) {
        try {
          lastResult = await command(context);
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes('BREAK')) {
              interrupted = true;
              break;
            }
            if (error.message.includes('CONTINUE')) {
              break;
            }
          }
          throw error;
        }
      }

      if (interrupted) break;
      iterations++;
    }

    return { iterations, lastResult, interrupted };
  }

  private evaluateCondition(condition: any, context: TypedExecutionContext): boolean {
    // Simple condition evaluation
    if (typeof condition === 'boolean') {
      return condition;
    }

    if (typeof condition === 'function') {
      try {
        return Boolean(condition(context));
      } catch {
        return false;
      }
    }

    // Check variables
    if (typeof condition === 'string') {
      const value = context.locals?.get(condition) || 
                   context.globals?.get(condition) || 
                   context.variables?.get(condition);
      return Boolean(value);
    }

    return Boolean(condition);
  }
}

/**
 * Factory function to create the enhanced repeat command
 */
export function createEnhancedRepeatCommand(): EnhancedRepeatCommand {
  return new EnhancedRepeatCommand();
}

export default EnhancedRepeatCommand;