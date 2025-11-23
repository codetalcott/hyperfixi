/**
 * UnlessCommand - Standalone V2 Implementation
 *
 * Conditionally executes commands only if the condition is false (inverse of if)
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Inverse conditional logic (executes when condition is false)
 * - Multiple command execution
 * - Result tracking
 * - Context updates between commands
 * - Comprehensive condition evaluation
 *
 * Syntax:
 *   unless <condition> <command> [<command> ...]
 *
 * @example
 *   unless user.isLoggedIn showLoginForm
 *   unless data.isValid clearForm showError
 *   unless element.isVisible fadeIn
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for UnlessCommand
 */
export interface UnlessCommandInput {
  /** Condition to evaluate (inverse logic) */
  condition: any;
  /** Commands to execute if condition is false */
  commands: any[];
}

/**
 * Output from unless command execution
 */
export interface UnlessCommandOutput {
  conditionResult: boolean;
  executed: boolean;
  commandCount: number;
  results: any[];
  lastResult?: any;
}

/**
 * UnlessCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 224 lines
 * V2 Target: ~210 lines (inline utilities, standalone)
 */
export class UnlessCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'unless';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Execute commands only if condition is false (inverse of if)',
    syntax: ['unless <condition> <command> [<command> ...]'],
    examples: [
      'unless user.isLoggedIn showLoginForm',
      'unless data.isValid clearForm showError',
      'unless element.isVisible fadeIn',
      'unless count > 10 increment',
    ],
    category: 'control-flow',
    sideEffects: ['conditional-execution'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<UnlessCommandInput> {
    if (raw.args.length < 2) {
      throw new Error('unless command requires a condition and at least one command');
    }

    // First arg is the condition
    const condition = await evaluator.evaluate(raw.args[0], context);

    // Remaining args are commands to execute
    const commands = raw.args.slice(1);

    return {
      condition,
      commands,
    };
  }

  /**
   * Execute the unless command
   *
   * Executes commands only if condition is FALSE (inverse of if).
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Execution result with condition and results
   */
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
        results: [],
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
        throw new Error(
          `Command execution failed in unless block: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      conditionResult,
      executed: true,
      commandCount: commands.length,
      results,
      lastResult,
    };
  }

  // ========== Private Utility Methods ==========

  /**
   * Evaluate condition as boolean
   *
   * @param condition - Condition value to evaluate
   * @param context - Execution context
   * @returns Boolean result
   */
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
      const value =
        context.locals?.get(condition) ||
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

  /**
   * Execute a command
   *
   * @param command - Command to execute (function or object with execute method)
   * @param context - Execution context
   * @returns Command result
   */
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
 * Factory function to create UnlessCommand instance
 */
export function createUnlessCommand(): UnlessCommand {
  return new UnlessCommand();
}
