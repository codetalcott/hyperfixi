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
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import type { CommandRaw } from '../../ast/command-slots';
import type { ReturnSignal } from '../../types/result';

/**
 * Typed input for ReturnCommand
 */
export interface ReturnCommandInput {
  value?: unknown;
}

/**
 * Output from Return command execution
 */
/** `return` completes with its signal (Arc 4a); the value rides on it. */
export type ReturnCommandOutput = ReturnSignal;

/**
 * ReturnCommand - Returns a value
 *
 * Before: 152 lines
 * After: ~65 lines (57% reduction)
 */
@command({ name: 'return' })
export class ReturnCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Return a value from a command sequence or function, terminating execution',
    syntax: ['return', 'return <value>'],
    examples: ['return', 'return 42', 'return user.name', 'if found then return result'],
    sideEffects: ['control-flow', 'context-mutation'],
    category: 'control-flow',
    compatibility: 'standard',
  });

  get metadata() {
    return ReturnCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'return'>,
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

    // A signal is RETURNED, not thrown (Arc 4a).
    return { type: 'return', returnValue: value };
  }
}

export const createReturnCommand = createFactory(ReturnCommand);
export default ReturnCommand;
