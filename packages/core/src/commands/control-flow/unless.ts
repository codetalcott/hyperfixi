/**
 * UnlessCommand - Decorated Implementation
 *
 * Conditionally executes commands only if the condition is false.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   unless <condition> <command> [<command> ...]
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { evaluateCondition } from '../helpers/condition-helpers';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

/**
 * Typed input for UnlessCommand
 */
export interface UnlessCommandInput {
  condition: any;
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
 * UnlessCommand - Inverse conditional execution
 *
 * Before: 202 lines
 * After: ~90 lines (55% reduction)
 */
@meta({
  description: 'Execute commands only if condition is false (inverse of if)',
  syntax: ['unless <condition> <command> [<command> ...]'],
  examples: ['unless user.isLoggedIn showLoginForm', 'unless data.isValid clearForm'],
  sideEffects: ['conditional-execution'],
})
@command({ name: 'unless', category: 'control-flow' })
export class UnlessCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<UnlessCommandInput> {
    if (raw.args.length < 2) {
      throw new Error('unless command requires a condition and at least one command');
    }
    const condition = await evaluator.evaluate(raw.args[0], context);
    const commands = raw.args.slice(1);
    return { condition, commands };
  }

  async execute(
    input: UnlessCommandInput,
    context: TypedExecutionContext
  ): Promise<UnlessCommandOutput> {
    const { condition, commands } = input;
    const conditionResult = evaluateCondition(condition, context);

    if (conditionResult) {
      return { conditionResult, executed: false, commandCount: commands.length, results: [] };
    }

    const results: any[] = [];
    let lastResult: any;

    for (const cmd of commands) {
      const result = await this.executeCommand(cmd, context);
      results.push(result);
      lastResult = result;
      Object.assign(context, { it: result });
    }

    return { conditionResult, executed: true, commandCount: commands.length, results, lastResult };
  }

  private async executeCommand(cmd: any, context: TypedExecutionContext): Promise<any> {
    if (typeof cmd === 'function') return await cmd(context);
    if (cmd?.execute) return await cmd.execute(context);
    throw new Error('Invalid command');
  }
}

export const createUnlessCommand = createFactory(UnlessCommand);
export default UnlessCommand;
