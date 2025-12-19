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
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

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
export class CallCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: ExpressionEvaluator,
    _context: ExecutionContext
  ): Promise<CallCommandInput> {
    if (!raw.args?.length) throw new Error('call command requires an expression');
    // Store the raw AST node, NOT the evaluated result
    // The expression will be evaluated during execute()
    const alias = (raw as { alias?: 'call' | 'get' }).alias || 'call';
    return Promise.resolve({ expression: raw.args[0], alias });
  }

  async execute(input: CallCommandInput, context: TypedExecutionContext): Promise<CallCommandOutput> {
    const { expression: expressionNode } = input;

    // NOW evaluate the expression during the execute phase
    // Get evaluator from locals where CommandAdapterV2 stored it
    const evaluator = context.locals?.get('__evaluator') as ExpressionEvaluator | undefined;
    if (!evaluator) {
      throw new Error('[CALL.execute] No evaluator available in context');
    }

    const expression = await evaluator.evaluate(expressionNode, context);

    let result: unknown;
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
