/**
 * If Command Implementation
 * The if command provides the standard if-statement control flow.
 * Generated from LSP data with TDD implementation
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class IfCommand implements CommandImplementation {
  name = 'if';
  syntax = 'if <conditional> [then] <command-list> [(else | otherwise) <command-list>] end`';
  description = 'The if command provides the standard if-statement control flow.';
  isBlocking = true; // Control flow commands are blocking

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length < 3) {
      throw new Error('If command requires at least 3 arguments: condition, "then", commands');
    }

    const [condition, thenKeyword, ...rest] = args;
    
    if (thenKeyword !== 'then') {
      throw new Error('If command requires "then" keyword after condition');
    }

    // Find else/otherwise keyword position
    let elseIndex = -1;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === 'else' || rest[i] === 'otherwise') {
        elseIndex = i;
        break;
      }
    }

    let thenCommands: any;
    let elseCommands: any = null;

    if (elseIndex >= 0) {
      // Has else block
      thenCommands = rest.slice(0, elseIndex);
      elseCommands = rest.slice(elseIndex + 1);
      
      if (elseCommands.length === 0) {
        throw new Error('If command requires commands after "else"');
      }
    } else {
      // No else block
      thenCommands = rest;
    }

    // If thenCommands is a single array, use that array directly
    if (thenCommands.length === 1 && Array.isArray(thenCommands[0])) {
      thenCommands = thenCommands[0];
    }
    
    // If elseCommands is a single array, use that array directly
    if (elseCommands && elseCommands.length === 1 && Array.isArray(elseCommands[0])) {
      elseCommands = elseCommands[0];
    }

    // Evaluate condition
    const isConditionTrue = this.evaluateCondition(condition);
    
    let result: any = null;

    if (isConditionTrue) {
      // Execute then block
      result = await this.executeCommands(context, thenCommands);
    } else if (elseCommands) {
      // Execute else block
      result = await this.executeCommands(context, elseCommands);
    }

    return result;
  }

  validate(args: any[]): string | null {
    if (args.length < 3) {
      return 'If command requires at least 3 arguments: condition, "then", commands';
    }

    const [, thenKeyword, ...rest] = args;
    
    if (thenKeyword !== 'then') {
      return 'If command requires "then" keyword after condition';
    }

    // Find else/otherwise keyword
    let elseIndex = -1;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === 'else' || rest[i] === 'otherwise') {
        elseIndex = i;
        break;
      }
    }

    // Check for string keywords that are not valid else keywords
    for (let i = 0; i < rest.length; i++) {
      const item = rest[i];
      if (typeof item === 'string' && 
          item !== 'else' && 
          item !== 'otherwise' &&
          typeof rest[i-1] !== 'function' && // Not following a command
          (item === 'invalid' || /^[a-zA-Z]+$/.test(item))) { // String that looks like keyword
        return 'If command else block must use "else" or "otherwise" keyword';
      }
    }

    // Check that there are commands after else
    if (elseIndex >= 0 && elseIndex >= rest.length - 1) {
      return 'If command requires commands after "else"';
    }

    return null;
  }

  private evaluateCondition(condition: any): boolean {
    // Handle boolean values directly
    if (typeof condition === 'boolean') {
      return condition;
    }

    // Handle null/undefined as falsy
    if (condition == null) {
      return false;
    }

    // Handle numbers (0 is falsy, all others truthy)
    if (typeof condition === 'number') {
      return condition !== 0 && !isNaN(condition);
    }

    // Handle strings (empty string is falsy)
    if (typeof condition === 'string') {
      return condition.length > 0;
    }

    // Handle arrays (empty array is falsy)
    if (Array.isArray(condition)) {
      return condition.length > 0;
    }

    // Handle objects (null is handled above, objects are truthy)
    if (typeof condition === 'object') {
      return true;
    }

    // Default to truthy for other types
    return Boolean(condition);
  }

  private async executeCommands(context: ExecutionContext, commands: any): Promise<any> {
    let result: any = null;

    // Handle array of commands
    if (Array.isArray(commands)) {
      for (const command of commands) {
        if (typeof command === 'function') {
          result = await command(context);
        } else if (command && typeof command.execute === 'function') {
          result = await command.execute(context);
        } else if (command != null) {
          result = command;
        }
        
        // Check for control flow flags
        if (context.flags?.breaking || context.flags?.continuing || context.flags?.returning) {
          break;
        }
      }
    }
    // Handle single command function
    else if (typeof commands === 'function') {
      result = await commands(context);
    }
    // Handle single command object
    else if (commands && typeof commands.execute === 'function') {
      result = await commands.execute(context);
    }
    // Handle single non-function value (treat as literal result)
    else {
      result = commands;
    }

    return result;
  }
}

export default IfCommand;