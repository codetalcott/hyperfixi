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
import { parseDuration, parseCSSDurations, calculateMaxAnimationTime } from '../helpers/duration-parsing';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

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
@meta({
  description: 'Wait for CSS transitions and animations to complete',
  syntax: 'settle [<target>] [for <timeout>]',
  examples: ['settle', 'settle #animated-element', 'settle for 3000'],
  sideEffects: ['timing'],
})
@command({ name: 'settle', category: 'animation' })
export class SettleCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

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
        (typeof firstArg === 'string' && (
          firstArg.startsWith('#') || firstArg.startsWith('.') ||
          firstArg === 'me' || firstArg === 'it' || firstArg === 'you'
        ))
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
    const targetElement = resolveElement(target, context);
    const timeout = parseDuration(timeoutInput, 5000);

    const startTime = Date.now();
    const settled = await this.waitForSettle(targetElement, timeout);
    const duration = Date.now() - startTime;

    Object.assign(context, { it: targetElement });
    return { element: targetElement, settled, timeout, duration };
  }

  private async waitForSettle(element: HTMLElement, timeout: number): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      let settled = false;

      const computedStyle = getComputedStyle(element);
      const transitionDurations = parseCSSDurations(computedStyle.transitionDuration);
      const transitionDelays = parseCSSDurations(computedStyle.transitionDelay);
      const animationDurations = parseCSSDurations(computedStyle.animationDuration);
      const animationDelays = parseCSSDurations(computedStyle.animationDelay);

      const maxTransitionTime = calculateMaxAnimationTime(transitionDurations, transitionDelays);
      const maxAnimationTime = calculateMaxAnimationTime(animationDurations, animationDelays);
      const totalAnimationTime = Math.max(maxTransitionTime, maxAnimationTime);

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

      const onTransitionEnd = (event: Event) => { if (event.target === element) settle(); };
      const onAnimationEnd = (event: Event) => { if (event.target === element) settle(); };

      element.addEventListener('transitionend', onTransitionEnd);
      element.addEventListener('animationend', onAnimationEnd);

      const animationTimeoutId = setTimeout(() => settle(), totalAnimationTime + 50);
      const timeoutId = setTimeout(() => settle(true), timeout);
    });
  }
}

export const createSettleCommand = createFactory(SettleCommand);
export default SettleCommand;
