/**
 * HaltCommand - Decorated Implementation
 *
 * Stops execution of the current command sequence or prevents event defaults.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   halt
 *   halt the event
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
import type { HaltSignal } from '../../types/result';

/**
 * Typed input for HaltCommand
 */
export interface HaltCommandInput {
  target?: unknown;
}

/**
 * Output from Halt command execution
 */
export interface HaltEventOutput {
  halted: true;
  timestamp: number;
  eventHalted?: boolean;
}

/** Halting an event reports it; halting execution RETURNS the signal (Arc 4a). */
export type HaltCommandOutput = HaltEventOutput | HaltSignal;

/**
 * HaltCommand - Stops execution or prevents event defaults
 *
 * Before: 216 lines
 * After: ~100 lines (54% reduction)
 */
@command({ name: 'halt' })
export class HaltCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Stop command execution or prevent event defaults',
    syntax: ['halt', 'halt the event'],
    examples: [
      'halt',
      'halt the event',
      'if error then halt',
      'on click halt the event then log "clicked"',
    ],
    sideEffects: ['control-flow', 'event-prevention'],
    category: 'control-flow',
    compatibility: 'standard',
  });

  get metadata() {
    return HaltCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: CommandRaw<'halt'>,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HaltCommandInput> {
    // `halt the event` — the prevent-default-and-CONTINUE form (as opposed to
    // bare `halt`, which stops the handler) — arrives as the `the` slot
    // (Arc 3 step 3). The semantic path names the patient instead
    // (`haltSchema` skips the article and binds `event`), which evaluates to
    // the current event below; no path delivers the article as an argument.
    if (raw.modifiers.the) return { target: context.event };
    const [first] = raw.args;
    if (first) {
      const target = await evaluator.evaluate(first, context);
      return { target };
    }

    return {};
  }

  async execute(
    input: HaltCommandInput,
    context: TypedExecutionContext
  ): Promise<HaltCommandOutput> {
    let targetToHalt = input.target;

    // Handle "halt the event" variations
    if (targetToHalt === 'the' && context.event) {
      targetToHalt = context.event;
    } else if (
      typeof targetToHalt === 'object' &&
      targetToHalt !== null &&
      (targetToHalt as any).target === 'the' &&
      context.event
    ) {
      targetToHalt = context.event;
    }

    // If target is an event, prevent default behavior
    if (this.isEvent(targetToHalt)) {
      const event = targetToHalt as Event;
      event.preventDefault();
      event.stopPropagation();

      return { halted: true, timestamp: Date.now(), eventHalted: true };
    }

    // Regular halt - stop execution
    if ('halted' in context) {
      (context as any).halted = true;
    }

    // A signal is RETURNED, not thrown (Arc 4a): the runtime's dispatch
    // recognises it and stops the enclosing block.
    return { type: 'halt' };
  }

  private isEvent(value: unknown): value is Event {
    return (
      value !== null &&
      typeof value === 'object' &&
      'preventDefault' in value &&
      'stopPropagation' in value
    );
  }
}

export const createHaltCommand = createFactory(HaltCommand);
export default HaltCommand;
