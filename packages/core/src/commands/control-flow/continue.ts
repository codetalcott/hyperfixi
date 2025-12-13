/**
 * ContinueCommand - Decorated Implementation
 *
 * Skips to the next iteration of the current loop. Uses Stage 3 decorators.
 *
 * Syntax: continue
 */

import type { TypedExecutionContext, ExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

// Re-export for backward compatibility
export interface ContinueCommandInput {}
export interface ContinueCommandOutput {
  continued: true;
  timestamp: number;
}

/**
 * ContinueCommand - Skips to next loop iteration
 *
 * Before: 127 lines
 * After: ~45 lines (65% reduction)
 */
@meta({
  description: 'Skip to the next iteration of the current loop',
  syntax: ['continue'],
  examples: [
    'continue',
    'if item.isInvalid then continue',
    'repeat for item in items { if item.skip then continue; process item }',
  ],
  sideEffects: ['control-flow'],
})
@command({ name: 'continue', category: 'control-flow' })
export class ContinueCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    _raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: ExpressionEvaluator,
    _context: ExecutionContext
  ): Promise<ContinueCommandInput> {
    return {};
  }

  async execute(
    _input: ContinueCommandInput,
    _context: TypedExecutionContext
  ): Promise<ContinueCommandOutput> {
    const continueError = new Error('CONTINUE_LOOP');
    (continueError as any).isContinue = true;
    throw continueError;
  }
}

export const createContinueCommand = createFactory(ContinueCommand);
export default ContinueCommand;
