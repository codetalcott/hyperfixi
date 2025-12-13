/**
 * IfCommand - Decorated Implementation
 *
 * Conditional execution based on boolean expressions.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   if <condition> then <commands>
 *   if <condition> then <commands> else <commands>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { evaluateCondition } from '../helpers/condition-helpers';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

/**
 * Typed input for IfCommand
 */
export interface IfCommandInput {
  condition: any;
  thenCommands: any;
  elseCommands?: any;
}

/**
 * Output from If command execution
 */
export interface IfCommandOutput {
  conditionResult: boolean;
  executedBranch: 'then' | 'else' | 'none';
  result: any;
}

/**
 * IfCommand - Conditional execution
 *
 * Before: 303 lines
 * After: ~130 lines (57% reduction)
 */
@meta({
  description: 'Conditional execution based on boolean expressions',
  syntax: ['if <condition> then <commands>', 'if <condition> then <commands> else <commands>'],
  examples: ['if x > 5 then add .active', 'if user.isAdmin then show #adminPanel else hide #adminPanel'],
  sideEffects: ['conditional-execution'],
})
@command({ name: 'if', category: 'control-flow' })
export class IfCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<IfCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('if command requires a condition to evaluate');
    }

    let thenCommands: any;
    let elseCommands: any;

    if (raw.args.length >= 2 && raw.args[1]) {
      thenCommands = raw.args[1];
      elseCommands = raw.args.length >= 3 ? raw.args[2] : undefined;
    } else if (raw.modifiers?.then) {
      thenCommands = raw.modifiers.then;
      elseCommands = raw.modifiers.else;
    }

    if (!thenCommands) {
      throw new Error('if command requires "then" branch with commands');
    }

    const condition = await evaluator.evaluate(raw.args[0], context);
    return { condition, thenCommands, elseCommands };
  }

  async execute(
    input: IfCommandInput,
    context: TypedExecutionContext
  ): Promise<IfCommandOutput> {
    const { condition, thenCommands, elseCommands } = input;
    const conditionResult = evaluateCondition(condition, context);

    let executedBranch: 'then' | 'else' | 'none';
    let result: any;

    if (conditionResult) {
      executedBranch = 'then';
      result = await this.executeCommandsOrBlock(thenCommands, context);
    } else if (elseCommands) {
      executedBranch = 'else';
      result = await this.executeCommandsOrBlock(elseCommands, context);
    } else {
      executedBranch = 'none';
    }

    return { conditionResult, executedBranch, result };
  }

  private async executeCommandsOrBlock(commandsOrBlock: any, context: TypedExecutionContext): Promise<any> {
    if (commandsOrBlock?.type === 'block') {
      return this.executeBlock(commandsOrBlock, context);
    }
    if (Array.isArray(commandsOrBlock)) {
      return this.executeCommands(commandsOrBlock, context);
    }
    return commandsOrBlock;
  }

  private async executeBlock(block: any, context: TypedExecutionContext): Promise<any> {
    const runtimeExecute = context.locals.get('_runtimeExecute') as any;
    if (!runtimeExecute) throw new Error('Runtime execute function not available');

    let lastResult: any;
    if (block.commands?.length) {
      for (const cmd of block.commands) {
        lastResult = await runtimeExecute(cmd, context);
      }
    }
    return lastResult;
  }

  private async executeCommands(commands: any[], context: TypedExecutionContext): Promise<any> {
    let lastResult: any;
    for (const cmd of commands) {
      if (cmd?.execute) lastResult = await cmd.execute(context);
      else if (typeof cmd === 'function') lastResult = await cmd();
      else lastResult = cmd;
    }
    return lastResult;
  }
}

export const createIfCommand = createFactory(IfCommand);
export default IfCommand;
