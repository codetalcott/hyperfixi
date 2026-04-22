/**
 * BreakpointCommand - Drop into the debugger
 *
 * Emits a `debugger;` statement — the runtime pauses in any attached
 * DevTools session. No-op when no debugger is attached.
 *
 * Syntax:
 *   breakpoint
 */

import type {
  ExecutionContext,
  TypedExecutionContext,
  ASTNode,
  ExpressionNode,
} from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

export interface BreakpointCommandInput {
  // No arguments — present for shape parity with other commands.
  _tag?: 'breakpoint';
}

@meta({
  description: 'Drop into the debugger (emits a debugger; statement)',
  syntax: ['breakpoint'],
  examples: ['breakpoint', 'on click breakpoint'],
  sideEffects: ['debugging'],
})
@command({ name: 'breakpoint', category: 'utility' })
export class BreakpointCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    _raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    _evaluator: ExpressionEvaluator,
    _context: ExecutionContext
  ): Promise<BreakpointCommandInput> {
    return {};
  }

  async execute(_input: BreakpointCommandInput, _context: TypedExecutionContext): Promise<void> {
    // eslint-disable-next-line no-debugger
    debugger;
  }

  validate(input: unknown): input is BreakpointCommandInput {
    return typeof input === 'object' && input !== null;
  }
}

export const createBreakpointCommand = createFactory(BreakpointCommand);
export default BreakpointCommand;
