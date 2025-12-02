/**
 * SettleCommand - Standalone V2 Implementation
 *
 * Waits for CSS transitions and animations to complete.
 * Uses shared helpers from commands/helpers/ for element resolution and duration parsing.
 *
 * Syntax:
 *   settle
 *   settle <target>
 *   settle for <timeout>
 *   settle <target> for <timeout>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveElement } from '../helpers/element-resolution';
import { parseDuration, parseCSSDurations, calculateMaxAnimationTime } from '../helpers/duration-parsing';

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
 */
export class SettleCommand {
  readonly name = 'settle';

  static readonly metadata = {
    description: 'Wait for CSS transitions and animations to complete',
    syntax: 'settle [<target>] [for <timeout>]',
    examples: ['settle', 'settle #animated-element', 'settle for 3000'],
    category: 'animation',
  };

  /**
   * Parse raw AST nodes into typed command input
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SettleCommandInput> {
    let target: string | HTMLElement | undefined;
    let timeout: number | string | undefined;

    // Parse optional target from args
    if (raw.args && raw.args.length > 0) {
      const firstArg = await evaluator.evaluate(raw.args[0], context);

      if (
        isHTMLElement(firstArg) ||
        (typeof firstArg === 'string' && (
          firstArg.startsWith('#') ||
          firstArg.startsWith('.') ||
          firstArg === 'me' ||
          firstArg === 'it' ||
          firstArg === 'you'
        ))
      ) {
        target = firstArg as string | HTMLElement;
      }
    }

    // Parse optional timeout from 'for' modifier
    if (raw.modifiers?.for) {
      timeout = await evaluator.evaluate(raw.modifiers.for, context);
    }

    return { target, timeout };
  }

  /**
   * Execute the settle command
   */
  async execute(
    input: SettleCommandInput,
    context: TypedExecutionContext
  ): Promise<SettleCommandOutput> {
    const { target, timeout: timeoutInput } = input;

    // Resolve target element using shared helper
    const targetElement = resolveElement(target, context);

    // Parse timeout using shared helper
    const timeout = parseDuration(timeoutInput, 5000);

    // Wait for element to settle
    const startTime = Date.now();
    const settled = await this.waitForSettle(targetElement, timeout);
    const duration = Date.now() - startTime;

    // Set result in context
    Object.assign(context, { it: targetElement });

    return { element: targetElement, settled, timeout, duration };
  }

  /**
   * Wait for element to settle (animations/transitions complete)
   */
  private async waitForSettle(element: HTMLElement, timeout: number): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      let settled = false;

      // Get computed styles to check for transitions/animations
      const computedStyle = getComputedStyle(element);
      const transitionDurations = parseCSSDurations(computedStyle.transitionDuration);
      const transitionDelays = parseCSSDurations(computedStyle.transitionDelay);
      const animationDurations = parseCSSDurations(computedStyle.animationDuration);
      const animationDelays = parseCSSDurations(computedStyle.animationDelay);

      // Calculate total time for transitions/animations using shared helper
      const maxTransitionTime = calculateMaxAnimationTime(transitionDurations, transitionDelays);
      const maxAnimationTime = calculateMaxAnimationTime(animationDurations, animationDelays);
      const totalAnimationTime = Math.max(maxTransitionTime, maxAnimationTime);

      // If no animations/transitions, settle immediately
      if (totalAnimationTime <= 0) {
        resolve(true);
        return;
      }

      const cleanup = () => {
        element.removeEventListener('transitionend', onTransitionEnd);
        element.removeEventListener('animationend', onAnimationEnd);
        clearTimeout(timeoutId);
        clearTimeout(animationTimeoutId);
      };

      const settle = (wasTimeout = false) => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(!wasTimeout);
        }
      };

      const onTransitionEnd = (event: Event) => {
        if (event.target === element) settle();
      };

      const onAnimationEnd = (event: Event) => {
        if (event.target === element) settle();
      };

      // Listen for completion events
      element.addEventListener('transitionend', onTransitionEnd);
      element.addEventListener('animationend', onAnimationEnd);

      // Set timeout based on computed animation time (with 50ms buffer)
      const animationTimeoutId = setTimeout(() => settle(), totalAnimationTime + 50);

      // Set overall timeout
      const timeoutId = setTimeout(() => settle(true), timeout);
    });
  }
}

/**
 * Factory function to create SettleCommand instance
 */
export function createSettleCommand(): SettleCommand {
  return new SettleCommand();
}
