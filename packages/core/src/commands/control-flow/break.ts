/**
 * BreakCommand - Decorated Implementation
 *
 * Exits from the current loop. Uses Stage 3 decorators.
 *
 * Syntax: break
 */

import type { TypedExecutionContext, ExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory } from '../decorators';

// Re-export for backward compatibility
export interface BreakCommandInput {}
export interface BreakCommandOutput {
  broken: true;
  timestamp: number;
}

/**
 * BreakCommand - Exits from the current loop
 *
 * Before: 127 lines
 * After: ~45 lines (65% reduction)
 */
@meta({
  description: 'Exit from the current loop (repeat, for, while, until)',
  syntax: ['break'],
  examples: [
    'break',
    'if found then break',
    'repeat for item in items { if item == target then break }',
  ],
  sideEffects: ['control-flow'],
})
@command({ name: 'break', category: 'control-flow' })
export class BreakCommand {
  async parseInput(
    _raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: ExpressionEvaluator,
    _context: ExecutionContext
  ): Promise<BreakCommandInput> {
    return {};
  }

  async execute(
    _input: BreakCommandInput,
    _context: TypedExecutionContext
  ): Promise<BreakCommandOutput> {
    const breakError = new Error('BREAK_LOOP');
    (breakError as any).isBreak = true;
    throw breakError;
  }
}

export const createBreakCommand = createFactory(BreakCommand);
export default BreakCommand;
