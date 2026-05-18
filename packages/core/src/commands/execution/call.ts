/**
 * CallCommand - Decorated Implementation
 *
 * Evaluates an expression and stores the result in 'it'.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   call <expression>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import { evaluateAST } from '../../parser/runtime';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

/**
 * Typed input for CallCommand
 */
export interface CallCommandInput {
  expression: any;
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
  syntax: ['call <expression>'],
  examples: ['call myFunction()', 'call fetch("/api/data")', 'call element.focus()'],
  sideEffects: ['function-execution', 'context-mutation'],
})
@command({ name: 'call', category: 'execution' })
export class CallCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: unknown,
    _context: ExecutionContext
  ): Promise<CallCommandInput> {
    if (!raw.args?.length) throw new Error('call command requires an expression');
    // Store the raw AST node, NOT the evaluated result
    // The expression will be evaluated during execute()
    return Promise.resolve({ expression: raw.args[0] });
  }

  async execute(
    input: CallCommandInput,
    context: TypedExecutionContext
  ): Promise<CallCommandOutput> {
    const { expression: expressionNode } = input;

    // Evaluate the call's expression. Prefer a mock evaluator stashed in
    // `context.locals.__evaluator` (test-injection path retained from the
    // pre-Phase-4 class-based evaluator), otherwise dispatch through the
    // canonical `evaluateAST` — the bundle's registry is already threaded
    // through `context.registry`.
    const mockEvaluator = context.locals?.get('__evaluator') as
      | { evaluate(node: ASTNode, ctx: ExecutionContext): unknown }
      | undefined;
    const expression = mockEvaluator
      ? await mockEvaluator.evaluate(expressionNode, context)
      : await evaluateAST(expressionNode, context);

    let result: unknown;
    let wasAsync = false;
    let expressionType: 'function' | 'promise' | 'value';

    if (typeof expression === 'function') {
      expressionType = 'function';
      result = expression();
      if (result instanceof Promise) {
        wasAsync = true;
        result = await result;
      }
    } else if (expression instanceof Promise) {
      expressionType = 'promise';
      wasAsync = true;
      result = await expression;
    } else {
      expressionType = 'value';
      result = expression;
    }

    Object.assign(context, { it: result, result: result });
    return { result, wasAsync, expressionType };
  }
}

export const createCallCommand = createFactory(CallCommand);
export default CallCommand;
