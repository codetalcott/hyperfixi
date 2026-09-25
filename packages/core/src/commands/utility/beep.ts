/**
 * BeepCommand - Decorated Implementation
 *
 * Provides debugging output for expressions with type information.
 *
 * **Console output is intentional**: `beep!` is a debug-only command —
 * `console.group` / `console.log` calls below are the command's entire
 * purpose, not stray instrumentation. The `sideEffects` metadata array
 * (`['console-output', 'debugging']`) declares this for tooling.
 *
 * Syntax:
 *   beep!
 *   beep! <expression>
 *   beep! <expression>, <expression>, ...
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { beepValues } from '../../utils/beep';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import type { CommandRaw } from '../../ast/command-slots';

/**
 * Typed input for BeepCommand
 */
export interface BeepCommandInput {
  expressions?: unknown[];
}

/**
 * Output from beep command execution
 */
export interface BeepCommandOutput {
  expressionCount: number;
  debugged: boolean;
  outputs: Array<{ value: unknown; type: string; representation: string }>;
}

/**
 * BeepCommand - Debug output with type information
 *
 * Before: 279 lines
 * After: ~130 lines (53% reduction)
 */
@command({ name: 'beep' })
export class BeepCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Debug output for expressions with type information',
    syntax: ['beep!', 'beep! <expression>', 'beep! <expression>, <expression>, ...'],
    examples: ['beep!', 'beep! myValue', 'beep! me.id, me.className'],
    sideEffects: ['console-output', 'debugging'],
    category: 'utility',
    compatibility: 'lokascript-extension',
  });

  get metadata() {
    return BeepCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'beep'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<BeepCommandInput> {
    if (raw.args.length === 0) return { expressions: [] };
    const expressions = await Promise.all(raw.args.map(arg => evaluator.evaluate(arg, context)));
    return { expressions };
  }

  async execute(
    input: BeepCommandInput,
    context: TypedExecutionContext
  ): Promise<BeepCommandOutput> {
    const expressions = input.expressions || [];

    if (expressions.length === 0) {
      this.debugContext(context);
      return { expressionCount: 0, debugged: true, outputs: [] };
    }

    // Shared with the `beep!` EXPRESSION (parser/runtime.ts), which reports a
    // value the same way and returns it.
    const outputs = beepValues(context.me, expressions);
    return { expressionCount: expressions.length, debugged: true, outputs };
  }

  private debugContext(context: TypedExecutionContext): void {
    console.group('🔔 beep! Context Debug');
    console.log('me:', context.me);
    console.log('it:', context.it);
    console.log('you:', context.you);
    console.log('locals:', context.locals);
    console.log('globals:', context.globals);
    console.log('variables:', context.variables);
    console.groupEnd();
  }
}

export const createBeepCommand = createFactory(BeepCommand);
export default BeepCommand;
