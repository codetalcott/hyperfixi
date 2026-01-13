/**
 * ThrowCommand - Decorated Implementation
 *
 * Throws an error with a specified message, terminating execution.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   throw <message>
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

/**
 * Typed input for ThrowCommand
 */
export interface ThrowCommandInput {
  message: string | Error | unknown;
}

/**
 * Output from throw command (never returned as throw always throws)
 */
export interface ThrowCommandOutput {
  error: Error;
}

/**
 * ThrowCommand - Throws an error
 *
 * Before: 143 lines
 * After: ~60 lines (58% reduction)
 */
@meta({
  description: 'Throw an error with a specified message',
  syntax: ['throw <message>'],
  examples: ['throw "Invalid input"', 'if not valid then throw "Validation failed"'],
  sideEffects: ['error-throwing', 'execution-termination'],
})
@command({ name: 'throw', category: 'control-flow' })
export class ThrowCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ThrowCommandInput> {
    if (raw.args.length < 1) {
      throw new Error('throw command requires a message or error object');
    }
    const message = await evaluator.evaluate(raw.args[0], context);
    return { message };
  }

  async execute(
    input: ThrowCommandInput,
    _context: TypedExecutionContext
  ): Promise<ThrowCommandOutput> {
    const { message } = input;

    let errorToThrow: Error;
    if (message instanceof Error) {
      errorToThrow = message;
    } else if (typeof message === 'string') {
      errorToThrow = new Error(message);
    } else {
      errorToThrow = new Error(String(message));
    }

    throw errorToThrow;
  }
}

export const createThrowCommand = createFactory(ThrowCommand);
export default ThrowCommand;
