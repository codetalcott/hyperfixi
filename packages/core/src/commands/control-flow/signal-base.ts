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
import type { CommandRaw } from '../../ast/command-slots';
import type { ExitSignal, BreakSignal, ContinueSignal } from '../../types/result';

/** Signal type for control flow */
export type SignalType = 'break' | 'continue' | 'exit';

/** Base input (empty for signals) */
export interface SignalCommandInput {
  signalType: SignalType;
}

/** Base output */
/** The signal the command completes with (Arc 4a). */
export type SignalCommandOutput = ExitSignal | BreakSignal | ContinueSignal;

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
    // A signal is RETURNED, not thrown (Arc 4a): the runtime's dispatch
    // recognises it and routes it as control flow.
    return this.signalType === 'exit'
      ? { type: 'exit', returnValue: undefined }
      : { type: this.signalType };
  }
}
