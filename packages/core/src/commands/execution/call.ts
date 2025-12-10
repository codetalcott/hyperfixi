/**
 * CallCommand - Decorated Implementation
 *
 * Evaluates an expression and stores the result in 'it'.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   call <expression>
 *   get <expression>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory } from '../decorators';

/**
 * Typed input for CallCommand
 */
export interface CallCommandInput {
  expression: any;
  alias?: 'call' | 'get';
}

/**
 * Output from Call command execution
 */
export interface CallCommandOutput {
  result: any;
  wasAsync: boolean;
  expressionType: 'function' | 'promise' | 'value';
}

/**
 * CallCommand - Evaluate expression and store in 'it'
 *
 * Before: 238 lines
 * After: ~85 lines (64% reduction)
 */
@meta({
  description: 'Evaluate an expression and store the result in the it variable',
  syntax: ['call <expression>', 'get <expression>'],
  examples: ['call myFunction()', 'get user.name', 'call fetch("/api/data")'],
  sideEffects: ['function-execution', 'context-mutation'],
})
@command({ name: 'call', category: 'execution' })
export class CallCommand {
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<CallCommandInput> {
    if (!raw.args?.length) throw new Error('call command requires an expression');
    const expression = await evaluator.evaluate(raw.args[0], context);
    return { expression, alias: (raw as any).alias || 'call' };
  }

  async execute(input: CallCommandInput, context: TypedExecutionContext): Promise<CallCommandOutput> {
    const { expression } = input;

    let result: any;
    let wasAsync = false;
    let expressionType: 'function' | 'promise' | 'value';

    if (typeof expression === 'function') {
      expressionType = 'function';
      result = expression();
      if (result instanceof Promise) { wasAsync = true; result = await result; }
    } else if (expression instanceof Promise) {
      expressionType = 'promise';
      wasAsync = true;
      result = await expression;
    } else {
      expressionType = 'value';
      result = expression;
    }

    Object.assign(context, { it: result });
    return { result, wasAsync, expressionType };
  }
}

/**
 * GetCommand - Alias for CallCommand
 */
@meta({
  description: 'Alias for call - evaluate an expression and store the result in the it variable',
  syntax: ['get <expression>'],
  examples: ['get user.profile', 'get document.title'],
  sideEffects: ['function-execution', 'context-mutation'],
})
@command({ name: 'get', category: 'execution' })
export class GetCommand extends CallCommand {}

export const createCallCommand = createFactory(CallCommand);
export const createGetCommand = createFactory(GetCommand);
export default CallCommand;
