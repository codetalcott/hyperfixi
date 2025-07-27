/**
 * Enhanced If Command Implementation
 * Conditional execution based on boolean expressions
 * 
 * Syntax: if <condition> then <commands> [else <commands>]
 * 
 * Modernized with TypedCommandImplementation interface
 */

import type { TypedCommandImplementation, ValidationResult } from '../../types/core.js';
import type { TypedExecutionContext } from '../../types/enhanced-core.js';

// Input type definition
export interface IfCommandInput {
  condition: any;
  thenCommands: any[];
  elseCommands?: any[];
}

// Output type definition  
export interface IfCommandOutput {
  conditionResult: boolean;
  executedBranch: 'then' | 'else' | 'none';
  result: any;
}

/**
 * Enhanced If Command with full type safety and validation
 */
export class EnhancedIfCommand implements TypedCommandImplementation<
  IfCommandInput,
  IfCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'if',
    description: 'The if command provides conditional execution. It evaluates a condition and executes the then branch if true, or the optional else branch if false.',
    examples: [
      'if x > 5 then add .active',
      'if user.isAdmin then show #adminPanel else hide #adminPanel',
      'if localStorage.getItem("theme") == "dark" then add .dark-mode',
      'if form.checkValidity() then submit else show .error'
    ],
    syntax: 'if <condition> then <commands> [else <commands>]',
    category: 'flow' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): ValidationResult<IfCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          success: false,
          error: {
            type: 'invalid-syntax',
            message: 'If command requires an object input',
            suggestions: 'Provide an object with condition and thenCommands properties'
          }
        };
      }

      const inputObj = input as any;

      // Validate condition is present
      if (inputObj.condition === undefined) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'If command requires a condition to evaluate',
            suggestions: 'Provide a boolean expression as the condition'
          }
        };
      }

      // Validate thenCommands
      if (!inputObj.thenCommands) {
        return {
          success: false,
          error: {
            type: 'missing-argument',
            message: 'If command requires commands for the then branch',
            suggestions: 'Provide commands to execute when condition is true'
          }
        };
      }

      if (!Array.isArray(inputObj.thenCommands)) {
        return {
          success: false,
          error: {
            type: 'type-mismatch',
            message: 'Then commands must be an array',
            suggestions: 'Provide an array of commands for the then branch'
          }
        };
      }

      // Validate elseCommands if provided
      if (inputObj.elseCommands !== undefined && !Array.isArray(inputObj.elseCommands)) {
        return {
          success: false,
          error: {
            type: 'type-mismatch',
            message: 'Else commands must be an array',
            suggestions: 'Provide an array of commands for the else branch'
          }
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          condition: inputObj.condition,
          thenCommands: inputObj.thenCommands,
          elseCommands: inputObj.elseCommands
        }
      };
    }
  };

  async execute(
    input: IfCommandInput,
    context: TypedExecutionContext
  ): Promise<IfCommandOutput> {
    const { condition, thenCommands, elseCommands } = input;

    // Evaluate the condition
    const conditionResult = this.evaluateCondition(condition, context);

    let executedBranch: 'then' | 'else' | 'none';
    let result: any = undefined;

    if (conditionResult) {
      // Execute then branch
      executedBranch = 'then';
      result = await this.executeCommands(thenCommands, context);
    } else if (elseCommands && elseCommands.length > 0) {
      // Execute else branch
      executedBranch = 'else';
      result = await this.executeCommands(elseCommands, context);
    } else {
      executedBranch = 'none';
    }

    return {
      conditionResult,
      executedBranch,
      result
    };
  }

  private evaluateCondition(condition: any, context: TypedExecutionContext): boolean {
    // Handle different condition types
    if (typeof condition === 'boolean') {
      return condition;
    }

    if (typeof condition === 'function') {
      const result = condition();
      return Boolean(result);
    }

    if (condition instanceof Promise) {
      throw new Error('If command does not support async conditions - use await in the condition expression');
    }

    // Handle string conditions (variable names or expressions)
    if (typeof condition === 'string') {
      // Check if it's a context reference
      if (condition === 'me') return Boolean(context.me);
      if (condition === 'it') return Boolean(context.it);
      if (condition === 'you') return Boolean(context.you);

      // Check variables
      const value = this.getVariableValue(condition, context);
      return Boolean(value);
    }

    // For numbers, objects, etc., use JavaScript truthiness
    return Boolean(condition);
  }

  private async executeCommands(commands: any[], context: TypedExecutionContext): Promise<any> {
    let lastResult: any = undefined;

    for (const command of commands) {
      if (command && typeof command.execute === 'function') {
        lastResult = await command.execute(context);
      } else if (typeof command === 'function') {
        lastResult = await command();
      } else {
        // Handle literal values or expressions
        lastResult = command;
      }
    }

    return lastResult;
  }

  private getVariableValue(name: string, context: TypedExecutionContext): any {
    // Check local variables first
    if (context.locals && context.locals.has(name)) {
      return context.locals.get(name);
    }
    
    // Check global variables
    if (context.globals && context.globals.has(name)) {
      return context.globals.get(name);
    }
    
    // Check general variables  
    if (context.variables && context.variables.has(name)) {
      return context.variables.get(name);
    }
    
    return undefined;
  }
}

/**
 * Factory function to create the enhanced if command
 */
export function createEnhancedIfCommand(): EnhancedIfCommand {
  return new EnhancedIfCommand();
}

export default EnhancedIfCommand;