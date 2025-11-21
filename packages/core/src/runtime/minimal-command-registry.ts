/**
 * Minimal Command Registry - Tree-Shakeable
 *
 * Lightweight command registry that doesn't import the full command-registry module.
 * This allows Rollup to tree-shake unused commands.
 */

import type { ASTNode, ExecutionContext } from '../types/base-types';
import type { CommandImplementation } from '../types/core';
import { ExpressionEvaluator } from '../core/expression-evaluator';

/**
 * Tree-shakeable minimal command registry
 * Only stores commands that are explicitly registered
 */
export class MinimalCommandRegistry {
  private commands: Map<string, any> = new Map();
  private expressionEvaluator: ExpressionEvaluator;

  constructor() {
    this.expressionEvaluator = new ExpressionEvaluator();
  }

  /**
   * Register a command instance
   */
  register(command: any): void {
    const name = command.metadata?.name || command.name;
    if (!name) {
      throw new Error('Command must have a name in metadata or as a property');
    }
    this.commands.set(name.toLowerCase(), command);
  }

  /**
   * Execute a command node
   */
  async execute(node: ASTNode, context: ExecutionContext): Promise<any> {
    if (node.type === 'command') {
      const commandName = node.name.toLowerCase();
      const command = this.commands.get(commandName);

      if (!command) {
        throw new Error(`Command '${node.name}' not found. Available commands: ${Array.from(this.commands.keys()).join(', ')}`);
      }

      // Evaluate arguments
      const evaluatedArgs = [];
      if (node.args) {
        for (const arg of node.args) {
          const result = await this.expressionEvaluator.evaluate(arg, context);
          evaluatedArgs.push(result);
        }
      }

      // Build input object for command
      const input: any = {
        args: evaluatedArgs,
        rawArgs: node.args || []
      };

      // Execute command
      return await command.execute(input, context);
    }

    // For non-command nodes, evaluate as expression
    return await this.expressionEvaluator.evaluate(node, context);
  }

  /**
   * Check if a command exists
   */
  has(name: string): boolean {
    return this.commands.has(name.toLowerCase());
  }

  /**
   * Get list of registered command names
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }
}
