/**
 * LogCommand - Decorated Implementation
 *
 * Logs values to the console for debugging and inspection.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   log                      # Log empty line
 *   log <value>              # Log single value
 *   log <val1> <val2> ...    # Log multiple values
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import type { CommandRaw } from '../../ast/command-slots';

/**
 * Typed input for LogCommand
 */
export interface LogCommandInput {
  values: unknown[];
}

/**
 * Typed output for LogCommand
 */
export interface LogCommandOutput {
  values: unknown[];
  loggedAt: Date;
}

/**
 * LogCommand - Logs values to console
 *
 * Before: 192 lines
 * After: ~70 lines (64% reduction)
 */
@command({ name: 'log' })
export class LogCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Log values to the console',
    syntax: 'log [<values...>]',
    examples: ['log "Hello World"', 'log me.value', 'log x y z', 'log "Result:" result'],
    sideEffects: ['console-output'],
    category: 'utility',
    compatibility: 'standard',
  });

  get metadata() {
    return LogCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'log'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<LogCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      return { values: [] };
    }
    const values = await Promise.all(
      raw.args.map((arg: ASTNode) => evaluator.evaluate(arg, context))
    );
    return { values };
  }

  async execute(input: LogCommandInput, _context: TypedExecutionContext): Promise<undefined> {
    // Use window.console to prevent Terser's drop_console from stripping this
    const logger = typeof window !== 'undefined' ? window.console : console;

    if (input.values.length === 0) {
      logger.log();
    } else {
      logger.log(...input.values);
    }

    // Return undefined so log doesn't overwrite 'it' in the execution context
    // This is important for patterns like: fetch url; log it; put it.data into x
    return undefined;
  }

  validate(input: unknown): input is LogCommandInput {
    if (typeof input !== 'object' || input === null) return false;
    const typed = input as Partial<LogCommandInput>;
    return Array.isArray(typed.values);
  }
}

export const createLogCommand = createFactory(LogCommand);
export default LogCommand;
