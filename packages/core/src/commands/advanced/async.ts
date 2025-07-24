/**
 * Async Command Implementation
 * Executes commands asynchronously using async/await patterns
 * Syntax: async <command1> [<command2> ...]
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class AsyncCommand implements CommandImplementation {
  name = 'async';
  syntax = 'async <command> [<command> ...]';
  description = 'Execute commands asynchronously without blocking the main execution flow';
  isBlocking = false;

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length === 0) {
      throw new Error('Async command requires at least one command to execute');
    }

    // Validate that all arguments are command objects
    for (const command of args) {
      if (!this.isValidCommand(command)) {
        throw new Error('All arguments to async command must be command objects with name and execute method');
      }
    }

    // Execute commands asynchronously in sequence
    return this.executeCommandsAsync(context, args);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) {
      return 'Async command requires at least one command to execute';
    }

    // Validate that all arguments are command objects
    for (const command of args) {
      if (!this.isValidCommand(command)) {
        return 'All arguments to async command must be command objects with name and execute method';
      }
    }

    return null;
  }

  private isValidCommand(command: any): boolean {
    return (
      command &&
      typeof command === 'object' &&
      typeof command.name === 'string' &&
      typeof command.execute === 'function'
    );
  }

  private async executeCommandsAsync(context: ExecutionContext, commands: any[]): Promise<any> {
    // Execute commands asynchronously using setTimeout to ensure they run in the next tick
    // This ensures the async command returns immediately and commands execute later
    
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          let lastResult: any;

          for (const command of commands) {
            lastResult = await command.execute(context);
          }

          resolve(lastResult);
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
  }

  /**
   * Static method to create async execution wrapper
   * This can be used by other parts of the system to make any command async
   */
  static makeAsync<T>(asyncFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Use setTimeout to ensure the function executes asynchronously
      setTimeout(async () => {
        try {
          const result = await asyncFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
  }

  /**
   * Utility method to execute a single command asynchronously
   */
  static async executeAsync(context: ExecutionContext, command: any): Promise<any> {
    const asyncCmd = new AsyncCommand();
    return asyncCmd.execute(context, command);
  }
}