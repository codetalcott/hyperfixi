/**
 * Enhanced Tell Command Implementation
 * Provides element/behavior communication by establishing new execution context
 * 
 * Syntax: tell <target> <command1> [<command2> ...]
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface TellCommandInput {
  target: HTMLElement | HTMLElement[] | string;
  commands: any[];
}

// Output type definition  
export interface TellCommandOutput {
  targetElements: HTMLElement[];
  commandResults: any[];
  executionCount: number;
}

/**
 * Enhanced Tell Command with full type safety and validation
 */
export class EnhancedTellCommand implements TypedCommandImplementation<
  TellCommandInput,
  TellCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'tell',
    description: 'Execute commands in the context of a target element with you/your/yourself references. This allows you to run commands as if they were executed from within the target element.',
    examples: [
      'tell #sidebar hide',
      'tell .buttons add .disabled',
      'tell closest <form/> submit',
      'tell children <input/> set value to ""',
      'tell me add .processing then wait 1s then remove .processing'
    ],
    syntax: 'tell <target> <command1> [<command2> ...]',
    category: 'utility' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<TellCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'Tell command requires an object input',
            suggestions: 'Provide an object with target and commands properties'
          }
        };
      }

      const inputObj = input as any;

      // Validate target is present
      if (!inputObj.target) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Tell command requires a target element or selector',
            suggestions: 'Provide an element reference, CSS selector, or element array'
          }
        };
      }

      // Validate target type
      const target = inputObj.target;
      if (typeof target !== 'string' && 
          !(target instanceof HTMLElement) && 
          !Array.isArray(target)) {
        return {
          success: false,
          error: {
            type: 'type-mismatch',
            message: 'Target must be a string (selector), HTMLElement, or array of elements',
            suggestions: 'Use a CSS selector, element reference, or array of elements'
          }
        };
      }

      // Validate commands are present
      if (!inputObj.commands || !Array.isArray(inputObj.commands)) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Tell command requires at least one command to execute',
            suggestions: 'Provide an array of commands to execute in the target context'
          }
        };
      }

      if (inputObj.commands.length === 0) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'Tell command requires at least one command to execute',
            suggestions: 'Provide at least one command in the commands array'
          }
        };
      }

      return {
        success: true,
        data: {
          target: inputObj.target,
          commands: inputObj.commands
        }
      };
    }
  };

  async execute(
    input: TellCommandInput,
    context: TypedExecutionContext
  ): Promise<TellCommandOutput> {
    const { target, commands } = input;

    // Resolve target to actual elements
    const resolvedTargets = this.resolveTarget(target, context);
    
    // If no valid targets, return without executing commands
    if (!resolvedTargets || resolvedTargets.length === 0) {
      return {
        targetElements: [],
        commandResults: [],
        executionCount: 0
      };
    }

    // Execute commands for each target
    const allResults: any[] = [];
    let executionCount = 0;

    for (const resolvedTarget of resolvedTargets) {
      const results = await this.executeCommandsForTarget(context, resolvedTarget, commands);
      allResults.push(results);
      executionCount++;
    }

    return {
      targetElements: resolvedTargets,
      commandResults: allResults,
      executionCount
    };
  }

  private resolveTarget(target: HTMLElement | HTMLElement[] | string, context: TypedExecutionContext): HTMLElement[] {
    // Handle null/undefined targets
    if (target === null || target === undefined) {
      return [];
    }

    // Handle direct element
    if (target instanceof HTMLElement) {
      return [target];
    }

    // Handle array of elements
    if (Array.isArray(target)) {
      return target.filter(item => item instanceof HTMLElement);
    }

    // Handle CSS selector string
    if (typeof target === 'string') {
      // Handle context references
      if (target === 'me' && context.me instanceof HTMLElement) {
        return [context.me];
      }
      if (target === 'you' && context.you instanceof HTMLElement) {
        return [context.you];
      }
      if (target === 'it' && context.it instanceof HTMLElement) {
        return [context.it];
      }

      // Try CSS selector
      try {
        if (typeof document !== 'undefined') {
          const elements = document.querySelectorAll(target);
          return Array.from(elements) as HTMLElement[];
        }
      } catch (error) {
        // Invalid selector, return empty array
        return [];
      }
    }

    return [];
  }

  private async executeCommandsForTarget(
    context: TypedExecutionContext, 
    target: HTMLElement, 
    commands: any[]
  ): Promise<any[]> {
    // Create new context with target as 'you'
    const tellContext = this.createTellContext(context, target);
    
    // Execute all commands in the tell context
    const results: any[] = [];
    
    for (const command of commands) {
      if (command && typeof command.execute === 'function') {
        const result = await command.execute(tellContext);
        results.push(result);
      } else if (typeof command === 'function') {
        const result = await command();
        results.push(result);
      } else {
        // Handle literal commands
        results.push(command);
      }
    }

    return results;
  }

  private createTellContext(originalContext: TypedExecutionContext, target: HTMLElement): TypedExecutionContext {
    // Create a new context that inherits from the original but with modified references
    const tellContext = {
      ...originalContext,
      me: target, // In tell context, target becomes 'me'
      you: target, // For possessive syntax like "your @attribute"
      // it remains unchanged - it's the result/data being passed around
    };

    return tellContext;
  }
}

/**
 * Factory function to create the enhanced tell command
 */
export function createEnhancedTellCommand(): EnhancedTellCommand {
  return new EnhancedTellCommand();
}

export default EnhancedTellCommand;