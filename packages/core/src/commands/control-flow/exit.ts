/**
 * ExitCommand - Decorated Implementation
 *
 * Exits early from an event handler or behavior without returning a value.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   exit
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

/**
 * Typed input for ExitCommand
 */
export interface ExitCommandInput {}

/**
 * Output from Exit command execution
 */
export interface ExitCommandOutput {
  exited: boolean;
  timestamp: number;
}

/**
 * ExitCommand - Exits from event handler
 *
 * Before: 134 lines
 * After: ~55 lines (59% reduction)
 */
@meta({
  description: 'Immediately terminate execution of the current event handler or behavior',
  syntax: ['exit'],
  examples: ['exit', 'if no draggedItem exit', 'on click if disabled exit'],
  sideEffects: ['control-flow'],
})
@command({ name: 'exit', category: 'control-flow' })
export class ExitCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    _raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: ExpressionEvaluator,
    _context: ExecutionContext
  ): Promise<ExitCommandInput> {
    return {};
  }

  async execute(
    _input: ExitCommandInput,
    _context: TypedExecutionContext
  ): Promise<ExitCommandOutput> {
    const exitError = new Error('EXIT_COMMAND');
    (exitError as any).isExit = true;
    (exitError as any).returnValue = undefined;
    (exitError as any).timestamp = Date.now();
    throw exitError;
  }
}

export const createExitCommand = createFactory(ExitCommand);
export default ExitCommand;
