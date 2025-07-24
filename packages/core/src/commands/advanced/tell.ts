/**
 * Tell Command Implementation
 * Provides element/behavior communication by establishing new execution context
 * Syntax: tell <target> <command1> [<command2> ...]
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class TellCommand implements CommandImplementation {
  name = 'tell';
  syntax = 'tell <target> <command> [<command> ...]';
  description = 'Execute commands in the context of a target element with you/your/yourself references';
  isBlocking = false;

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length < 2) {
      throw new Error('Tell command requires at least 2 arguments: target and command');
    }

    const [target, ...commands] = args;
    
    // Resolve target to actual elements
    const resolvedTargets = this.resolveTarget(target, context);
    
    // If no valid targets, return without executing commands
    if (!resolvedTargets || resolvedTargets.length === 0) {
      return undefined;
    }

    // Execute commands for each target
    const results = [];
    for (const resolvedTarget of resolvedTargets) {
      const result = await this.executeCommandsForTarget(context, resolvedTarget, commands);
      results.push(result);
    }

    return results.length === 1 ? results[0] : results;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) {
      return 'Tell command requires at least 2 arguments: target and command';
    }

    // Validate that we have at least one command
    const commands = args.slice(1);
    if (commands.length === 0) {
      return 'Tell command requires at least one command to execute';
    }

    // Basic validation that commands have names (more detailed validation would happen at runtime)
    for (const command of commands) {
      if (typeof command !== 'object' || !command.name) {
        return 'Tell command arguments must be command objects with names';
      }
    }

    return null;
  }

  private resolveTarget(target: any, context: ExecutionContext): HTMLElement[] {
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
      try {
        const elements = document.querySelectorAll(target);
        return Array.from(elements) as HTMLElement[];
      } catch (error) {
        // Invalid selector, return empty array
        return [];
      }
    }

    // Handle CSS selector object (from expression evaluation)
    if (target && typeof target === 'object' && target.selector) {
      try {
        const elements = document.querySelectorAll(target.selector);
        return Array.from(elements) as HTMLElement[];
      } catch (error) {
        return [];
      }
    }

    return [];
  }

  private async executeCommandsForTarget(
    context: ExecutionContext, 
    target: HTMLElement, 
    commands: any[]
  ): Promise<any> {
    // Create new context with target as 'you'
    const tellContext = this.createTellContext(context, target);
    
    // Store original context values to restore later
    const originalYou = context.you;
    const originalYour = context.your;
    const originalYourself = context.yourself;

    try {
      // Execute all commands in the tell context
      let lastResult;
      
      for (const command of commands) {
        if (command && typeof command.execute === 'function') {
          lastResult = await command.execute(tellContext);
        }
      }

      return lastResult;
    } finally {
      // Restore original context
      context.you = originalYou;
      context.your = originalYour;
      context.yourself = originalYourself;
    }
  }

  private createTellContext(originalContext: ExecutionContext, target: HTMLElement): ExecutionContext {
    // Create a new context that inherits from the original but with modified references
    const tellContext = {
      ...originalContext,
      you: target,
      your: target, // For possessive syntax like "your @attribute"
      yourself: target, // For self-reference like "remove yourself"
    };

    return tellContext;
  }
}