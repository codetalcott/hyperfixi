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
import type { CommandRaw } from '../../parser/command-slots';

/**
 * Typed input for HaltCommand
 */
export interface HaltCommandInput {
  target?: unknown;
}

/**
 * Output from Halt command execution
 */
export interface HaltCommandOutput {
  halted: true;
  timestamp: number;
  eventHalted?: boolean;
}

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
    if (raw.args && raw.args.length > 0) {
      const firstArg = raw.args[0] as any;

      // "halt the event" — the leading article "the" marks the prevent-default-
      // and-CONTINUE form (as opposed to bare `halt`, which stops the handler).
      // The i18n transformer leaves the article "the" verbatim across every
      // language, so this is the cross-language signal; the event noun may
      // follow as a second arg, sit elsewhere in the clause, or be dropped by
      // the translation, and the article node may arrive as a `literal` (en) or
      // an `identifier` (other languages, via the expression value converter).
      // Any of these means halt the event — NOT stop execution. Without this,
      // the non-en article evaluated to undefined and halt threw, swallowing
      // every command after `halt the event` (the §7 halt-propagation cluster).
      if (firstArg && (firstArg.name === 'the' || firstArg.value === 'the')) {
        return { target: context.event };
      }

      const target = await evaluator.evaluate(raw.args[0], context);
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

    const haltError = new Error('HALT_EXECUTION');
    (haltError as any).isHalt = true;
    throw haltError;
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
