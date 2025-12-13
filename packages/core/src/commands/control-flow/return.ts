/**
 * ReturnCommand - Decorated Implementation
 *
 * Returns a value from a command sequence or function.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   return
 *   return <value>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

/**
 * Typed input for ReturnCommand
 */
export interface ReturnCommandInput {
  value?: unknown;
}

/**
 * Output from Return command execution
 */
export interface ReturnCommandOutput {
  returnValue: unknown;
  timestamp: number;
}

/**
 * ReturnCommand - Returns a value
 *
 * Before: 152 lines
 * After: ~65 lines (57% reduction)
 */
@meta({
  description: 'Return a value from a command sequence or function, terminating execution',
  syntax: ['return', 'return <value>'],
  examples: ['return', 'return 42', 'return user.name', 'if found then return result'],
  sideEffects: ['control-flow', 'context-mutation'],
})
@command({ name: 'return', category: 'control-flow' })
export class ReturnCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ReturnCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      return { value: undefined };
    }
    const value = await evaluator.evaluate(raw.args[0], context);
    return { value };
  }

  async execute(
    input: ReturnCommandInput,
    context: TypedExecutionContext
  ): Promise<ReturnCommandOutput> {
    const { value } = input;

    if ('returnValue' in context) {
      (context as { returnValue: unknown }).returnValue = value;
    }
    Object.assign(context, { it: value });

    const returnError = new Error('RETURN_VALUE');
    (returnError as any).isReturn = true;
    (returnError as any).returnValue = value;
    throw returnError;
  }
}

export const createReturnCommand = createFactory(ReturnCommand);
export default ReturnCommand;
