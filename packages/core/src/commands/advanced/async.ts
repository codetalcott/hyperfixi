/**
 * AsyncCommand - Decorated Implementation
 *
 * Executes commands asynchronously using async/await patterns.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   async <command> [<command> ...]
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

export interface AsyncCommandInput {
  commands: any[];
}

export interface AsyncCommandOutput {
  commandCount: number;
  results: any[];
  executed: boolean;
  duration: number;
}

/**
 * AsyncCommand - Execute commands asynchronously
 *
 * Before: 233 lines
 * After: ~150 lines (36% reduction)
 */
@meta({
  description: 'Execute commands asynchronously without blocking',
  syntax: ['async <command> [<command> ...]'],
  examples: [
    'async command1 command2',
    'async fetchData processData',
    'async animateIn showContent',
  ],
  sideEffects: ['async-execution'],
})
@command({ name: 'async', category: 'advanced' })
export class AsyncCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: ExpressionEvaluator,
    _context: ExecutionContext
  ): Promise<AsyncCommandInput> {
    if (raw.args.length < 1) {
      throw new Error('async command requires at least one command to execute');
    }

    // All args are commands to execute
    const commands = raw.args;

    return {
      commands,
    };
  }

  /**
   * Execute the async command
   *
   * Executes commands asynchronously in sequence.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Execution result with duration and results
   */
  async execute(
    input: AsyncCommandInput,
    context: TypedExecutionContext
  ): Promise<AsyncCommandOutput> {
    const { commands } = input;
    const startTime = Date.now();

    try {
      // Execute commands asynchronously in sequence
      const results = await this.executeCommandsAsync(context, commands);
      const duration = Date.now() - startTime;

      // Set the last result in context
      if (results.length > 0) {
        Object.assign(context, { it: results[results.length - 1] });
      }

      return {
        commandCount: commands.length,
        results,
        executed: true,
        duration,
      };
    } catch (error) {
      throw new Error(
        `Async command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ========== Private Utility Methods ==========

  /**
   * Execute commands asynchronously in sequence
   *
   * @param context - Execution context
   * @param commands - Commands to execute
   * @returns Array of command results
   */
  private async executeCommandsAsync(
    context: TypedExecutionContext,
    commands: any[]
  ): Promise<any[]> {
    const results: any[] = [];

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];

      try {
        // Execute command asynchronously
        const result = await this.executeCommand(command, context);
        results.push(result);

        // Update context for next command
        Object.assign(context, { it: result });
      } catch (error) {
        const commandName = this.getCommandName(command);
        throw new Error(
          `Command '${commandName}' (${i + 1}/${commands.length}) failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return results;
  }

  /**
   * Execute a single command
   *
   * @param command - Command to execute
   * @param context - Execution context
   * @returns Command result
   */
  private async executeCommand(command: any, context: TypedExecutionContext): Promise<any> {
    // Handle function commands
    if (typeof command === 'function') {
      return await command(context);
    }

    // Handle command objects with execute method
    if (command && typeof command === 'object' && typeof command.execute === 'function') {
      return await command.execute(context);
    }

    throw new Error('Invalid command: must be a function or object with execute method');
  }

  /**
   * Get command name for error messages
   *
   * @param command - Command object
   * @returns Command name
   */
  private getCommandName(command: any): string {
    if (typeof command === 'function') {
      return command.name || 'anonymous function';
    }

    if (command && typeof command === 'object') {
      return command.name || 'unnamed command';
    }

    return 'unknown';
  }
}

export const createAsyncCommand = createFactory(AsyncCommand);
export default AsyncCommand;
