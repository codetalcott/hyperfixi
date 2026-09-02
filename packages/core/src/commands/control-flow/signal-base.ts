/**
 * ControlFlowSignalBase - Shared logic for signal commands
 *
 * This base class contains common logic for control flow signals:
 * break, continue, exit. These all follow the same pattern:
 * - No arguments
 * - Throw a specially-marked error to signal control flow
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import type { DecoratedCommand, CommandMetadata } from '../decorators';
import type { CommandRaw } from '../../parser/command-slots';

/** Signal type for control flow */
export type SignalType = 'break' | 'continue' | 'exit';

/** Base input (empty for signals) */
export interface SignalCommandInput {
  signalType: SignalType;
}

/** Base output */
export interface SignalCommandOutput {
  signalType: SignalType;
  timestamp: number;
}

/**
 * Abstract base class for control flow signals
 */
export abstract class ControlFlowSignalBase implements DecoratedCommand {
  declare readonly name: string;
  /**
   * Each concrete subclass supplies this via `static readonly metadata =
   * commandMeta({…})` plus an instance getter (Arc B step 3). Declared
   * `abstract` rather than `declare readonly`: a `declare`d PROPERTY cannot be
   * overridden by an accessor (TS2611), and the unchecked `declare` was itself
   * the shape Arc B exists to remove — it asserted a type the compiler never
   * verified.
   */
  abstract readonly metadata: CommandMetadata;

  /** Subclasses must define their signal type */
  protected abstract readonly signalType: SignalType;

  /** Signal error message */
  protected abstract readonly errorMessage: string;

  /** Signal error flag name (isBreak, isContinue, isExit) */
  protected abstract readonly errorFlag: string;

  async parseInput(
    _raw: CommandRaw<'break' | 'continue' | 'exit'>,
    _evaluator: ExpressionEvaluator,
    _context: ExecutionContext
  ): Promise<SignalCommandInput> {
    return { signalType: this.signalType };
  }

  async execute(
    _input: SignalCommandInput,
    _context: TypedExecutionContext
  ): Promise<SignalCommandOutput> {
    const error = new Error(this.errorMessage);
    (error as any)[this.errorFlag] = true;
    if (this.signalType === 'exit') {
      (error as any).returnValue = undefined;
      (error as any).timestamp = Date.now();
    }
    throw error;
  }
}
