/**
 * Enhanced Unless Command Implementation
 * Conditionally executes commands only if the condition is false (inverse of if)
 * 
 * Syntax: unless <condition> <command1> [<command2> ...]
 * 
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';

// Input type definition
export interface UnlessCommandInput {
  condition: any; // Condition to evaluate (inverse logic)
  commands: Function[]; // Commands to execute if condition is false
}

// Output type definition
export interface UnlessCommandOutput {
  conditionResult: boolean;
  executed: boolean;
  commandCount: number;
  results: any[];
  lastResult?: any;
}

/**
 * Enhanced Unless Command with full type safety and validation
 */
export class UnlessCommand implements CommandImplementation<
  UnlessCommandInput,
  UnlessCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'unless',
    description: 'The unless command executes commands only if the condition is false. It provides inverse conditional logic to the if command.',
    examples: [
      'unless user.isLoggedIn showLoginForm',
      'unless data.isValid clearForm showError',
      'unless element.isVisible fadeIn',
      'unless count > 10 increment'
    ],
    syntax: 'unless <condition> <command> [<command> ...]',
    category: 'flow' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<UnlessCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Unless command requires condition and commands',
            suggestions: ['Provide condition and commands to execute']
          }],
          suggestions: ['Provide condition and commands to execute']
        };
      }

      const inputObj = input as any;

      if (inputObj.condition === undefined) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Unless command requires a condition',
            suggestions: ['Provide a condition to evaluate']
          }],
          suggestions: ['Provide a condition to evaluate']
        };
      }

      if (!inputObj.commands || !Array.isArray(inputObj.commands)) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Unless command requires commands to execute',
            suggestions: ['Provide commands to execute when condition is false']
          }],
          suggestions: ['Provide commands to execute when condition is false']
        };
      }

      if (inputObj.commands.length === 0) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Unless command requires at least one command',
            suggestions: ['Provide at least one command to execute']
          }],
          suggestions: ['Provide at least one command to execute']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          condition: inputObj.condition,
          commands: inputObj.commands
        }
      };
    }
  };

  async execute(
    input: UnlessCommandInput,
    context: TypedExecutionContext
  ): Promise<UnlessCommandOutput> {
    const { condition, commands } = input;

    // Evaluate the condition
    const conditionResult = this.evaluateCondition(condition, context);

    // Unless logic: execute commands only if condition is FALSE
    if (conditionResult) {
      // Condition is true, don't execute commands
      return {
        conditionResult,
        executed: false,
        commandCount: commands.length,
        results: []
      };
    }

    // Condition is false, execute commands
    const results: any[] = [];
    let lastResult: any = undefined;

    for (const command of commands) {
      try {
        const result = await this.executeCommand(command, context);
        results.push(result);
        lastResult = result;
        
        // Update context for next command
        Object.assign(context, { it: result });
      } catch (error) {
        throw new Error(`Command execution failed in unless block: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      conditionResult,
      executed: true,
      commandCount: commands.length,
      results,
      lastResult
    };
  }

  private evaluateCondition(condition: any, context: TypedExecutionContext): boolean {
    // Handle boolean conditions
    if (typeof condition === 'boolean') {
      return condition;
    }

    // Handle function conditions
    if (typeof condition === 'function') {
      try {
        return Boolean(condition(context));
      } catch {
        return false;
      }
    }

    // Handle string variable references
    if (typeof condition === 'string') {
      const value = context.locals?.get(condition) || 
                   context.globals?.get(condition) || 
                   context.variables?.get(condition);
      return Boolean(value);
    }

    // Handle object conditions (check for truthy properties)
    if (typeof condition === 'object' && condition !== null) {
      // Simple object truthiness check
      return Object.keys(condition).length > 0;
    }

    // Default: evaluate as boolean
    return Boolean(condition);
  }

  private async executeCommand(command: any, context: TypedExecutionContext): Promise<any> {
    if (typeof command === 'function') {
      return await command(context);
    }

    if (command && typeof command === 'object' && typeof command.execute === 'function') {
      return await command.execute(context);
    }

    throw new Error('Invalid command: must be a function or object with execute method');
  }
}

/**
 * Factory function to create the enhanced unless command
 */
export function createUnlessCommand(): UnlessCommand {
  return new UnlessCommand();
}

export default UnlessCommand;