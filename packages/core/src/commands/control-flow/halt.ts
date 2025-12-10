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
import { command, meta, createFactory } from '../decorators';

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
@meta({
  description: 'Stop command execution or prevent event defaults',
  syntax: ['halt', 'halt the event'],
  examples: ['halt', 'halt the event', 'if error then halt', 'on click halt the event then log "clicked"'],
  sideEffects: ['control-flow', 'event-prevention'],
})
@command({ name: 'halt', category: 'control-flow' })
export class HaltCommand {
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HaltCommandInput> {
    if (raw.args && raw.args.length > 0) {
      const firstArg = raw.args[0] as any;
      const secondArg = raw.args.length > 1 ? raw.args[1] as any : null;

      // Check for "halt the event" pattern
      if (firstArg.type === 'identifier' && firstArg.name === 'the' &&
          secondArg && secondArg.type === 'identifier' && secondArg.name === 'event') {
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
