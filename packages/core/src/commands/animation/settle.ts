/**
 * SettleCommand - Decorated Implementation
 *
 * Waits for CSS transitions and animations to complete.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   settle
 *   settle <target>
 *   settle for <timeout>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveElement } from '../helpers/element-resolution';
import {
  parseDuration,
  parseCSSDurations,
  calculateMaxAnimationTime,
} from '../helpers/duration-parsing';
import { waitForAnimationComplete } from '../helpers/event-waiting';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

/**
 * Typed input for SettleCommand
 */
export interface SettleCommandInput {
  target?: string | HTMLElement;
  timeout?: number | string;
}

/**
 * Output from Settle command execution
 */
export interface SettleCommandOutput {
  element: HTMLElement;
  settled: boolean;
  timeout: number;
  duration: number;
}

/**
 * SettleCommand - Waits for animations/transitions to complete
 *
 * Before: 191 lines
 * After: ~120 lines (37% reduction)
 */
@command({ name: 'settle' })
export class SettleCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Wait for CSS transitions and animations to complete',
    syntax: 'settle [<target>] [for <timeout>]',
    examples: ['settle', 'settle #animated-element', 'settle for 3000'],
    sideEffects: ['timing'],
    category: 'animation',
    compatibility: 'standard',
  });

  get metadata() {
    return SettleCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SettleCommandInput> {
    let target: string | HTMLElement | undefined;
    let timeout: number | string | undefined;

    if (raw.args && raw.args.length > 0) {
      const firstArg = await evaluator.evaluate(raw.args[0], context);
      if (
        isHTMLElement(firstArg) ||
        (typeof firstArg === 'string' &&
          (firstArg.startsWith('#') ||
            firstArg.startsWith('.') ||
            firstArg === 'me' ||
            firstArg === 'it' ||
            firstArg === 'you'))
      ) {
        target = firstArg as string | HTMLElement;
      }
    }

    if (raw.modifiers?.for) {
      timeout = await evaluator.evaluate(raw.modifiers.for, context);
    }

    const result: SettleCommandInput = {};
    if (target !== undefined) result.target = target;
    if (timeout !== undefined) result.timeout = timeout;
    return result;
  }

  async execute(
    input: SettleCommandInput,
    context: TypedExecutionContext
  ): Promise<SettleCommandOutput> {
    const { target, timeout: timeoutInput } = input;
    const targetElement = resolveElement(target, context, 'settle');
    const timeout = parseDuration(timeoutInput, 5000);

    const startTime = Date.now();

    // Calculate total animation time from computed styles
    const computedStyle = getComputedStyle(targetElement);
    const transitionDurations = parseCSSDurations(computedStyle.transitionDuration);
    const transitionDelays = parseCSSDurations(computedStyle.transitionDelay);
    const animationDurations = parseCSSDurations(computedStyle.animationDuration);
    const animationDelays = parseCSSDurations(computedStyle.animationDelay);

    const maxTransitionTime = calculateMaxAnimationTime(transitionDurations, transitionDelays);
    const maxAnimationTime = calculateMaxAnimationTime(animationDurations, animationDelays);
    const totalAnimationTime = Math.max(maxTransitionTime, maxAnimationTime);

    // Wait for animations using consolidated helper
    const result = await waitForAnimationComplete(targetElement, totalAnimationTime, timeout);
    const duration = Date.now() - startTime;

    // No `it` assignment — upstream parity. Upstream's settle sets no result,
    // and the element was explicitly named one clause earlier (`settle #x then
    // add .done to #x`, or `tell #x`). The self-assign this replaces was a
    // silent divergence: hyperfixi-only chains like `settle #x then … it` would
    // break on the canonical engine. Decided in Arc C's close-out — see
    // docs-internal/archive/handoffs/HANDOFF-command-arch-output-contract.md.
    return { element: targetElement, settled: result.completed, timeout, duration };
  }
}

export const createSettleCommand = createFactory(SettleCommand);
export default SettleCommand;
