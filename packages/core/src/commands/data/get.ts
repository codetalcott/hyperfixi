/**
 * GetCommand - Decorated Implementation
 *
 * Evaluates an expression and stores the result in `it`.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   get <expression>              # Evaluate expression, store in 'it'
 *   get <expression> then ...     # Evaluate and chain with next command
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

/**
 * Typed input for GetCommand
 */
export interface GetCommandInput {
  value: unknown;
}

/**
 * Typed output for GetCommand
 */
export interface GetCommandOutput {
  value: unknown;
}

/**
 * GetCommand - Evaluates expression and stores in 'it'
 *
 * Before: 160 lines
 * After: ~65 lines (59% reduction)
 */
@meta({
  description: 'Evaluate an expression and store the result in it',
  syntax: 'get <expression>',
  examples: ['get #my-dialog', 'get <button/>', 'get me.parentElement'],
  sideEffects: ['context-mutation'],
})
@command({ name: 'get', category: 'data' })
export class GetCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<GetCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('get command requires an expression argument');
    }

    const firstArg = raw.args[0];
    const value = await evaluator.evaluate(firstArg, context);

    // Handle NodeList/array - if it's a single element, unwrap it
    if (value instanceof NodeList && value.length === 1) {
      return { value: value[0] };
    }
    if (Array.isArray(value) && value.length === 1) {
      return { value: value[0] };
    }

    return { value };
  }

  execute(
    input: GetCommandInput,
    context: TypedExecutionContext
  ): GetCommandOutput {
    (context as { it: unknown }).it = input.value;
    Object.assign(context, { result: input.value });
    return { value: input.value };
  }

  validate(input: unknown): input is GetCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    return 'value' in input;
  }
}

export const createGetCommand = createFactory(GetCommand);
export default GetCommand;
