/**
 * TransitionCommand - Standalone V2 Implementation
 *
 * Animates CSS properties using CSS transitions.
 * Uses shared helpers from commands/helpers/ for element resolution and duration parsing.
 *
 * Syntax:
 *   transition <property> to <value>
 *   transition <property> to <value> over <duration>
 *   transition <property> to <value> over <duration> with <timing-function>
 *   transition <target> <property> to <value>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveElement } from '../helpers/element-resolution';
import { parseDuration, camelToKebab } from '../helpers/duration-parsing';

/**
 * Typed input for TransitionCommand
 */
export interface TransitionCommandInput {
  target?: string | HTMLElement;
  property: string;
  value: string | number;
  duration?: number | string;
  timingFunction?: string;
}

/**
 * Output from Transition command execution
 */
export interface TransitionCommandOutput {
  element: HTMLElement;
  property: string;
  fromValue: string;
  toValue: string;
  duration: number;
  completed: boolean;
}

/**
 * TransitionCommand - Animates CSS properties with transitions
 */
export class TransitionCommand {
  readonly name = 'transition';

  static readonly metadata = {
    description: 'Animate CSS properties using CSS transitions',
    syntax: 'transition <property> to <value> [over <duration>] [with <timing>]',
    examples: [
      'transition opacity to 0.5',
      'transition left to 100px over 500ms',
      'transition background-color to red over 1s with ease-in-out',
    ],
    category: 'animation',
  };

  /**
   * Parse raw AST nodes into typed command input
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<TransitionCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('transition command requires property and value arguments');
    }

    let property: string;
    let target: string | HTMLElement | undefined;
    let duration: number | string | undefined;
    let timingFunction: string | undefined;

    // Check if first arg is a target element
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
      property = String(await evaluator.evaluate(raw.args[1], context));
    } else {
      property = String(firstArg);
    }

    if (!property) {
      throw new Error('transition command requires a CSS property');
    }

    // Extract value from 'to' modifier
    if (!raw.modifiers?.to) {
      throw new Error('transition command requires "to <value>" modifier');
    }
    const value = await evaluator.evaluate(raw.modifiers.to, context);

    // Extract optional duration from 'over' modifier
    if (raw.modifiers?.over) {
      duration = await evaluator.evaluate(raw.modifiers.over, context);
    }

    // Extract optional timing function from 'with' modifier
    if (raw.modifiers?.with) {
      timingFunction = String(await evaluator.evaluate(raw.modifiers.with, context));
    }

    return {
      target,
      property,
      value: value as string | number,
      duration,
      timingFunction,
    };
  }

  /**
   * Execute the transition command
   */
  async execute(
    input: TransitionCommandInput,
    context: TypedExecutionContext
  ): Promise<TransitionCommandOutput> {
    const { target, value, duration: durationInput, timingFunction } = input;
    let { property } = input;

    if (!property || typeof property !== 'string') {
      throw new Error('transition command requires a CSS property');
    }

    if (value === undefined || value === null) {
      throw new Error(`transition command for property "${property}" requires a target value`);
    }

    // Handle CSS property prefix (*property means use the actual CSS property name)
    if (property.startsWith('*')) {
      property = property.substring(1);
    }

    // Convert camelCase to kebab-case using shared helper
    property = camelToKebab(property);

    // Resolve target element using shared helper
    const targetElement = resolveElement(target, context);

    // Parse duration using shared helper
    const duration = parseDuration(durationInput, 300);

    // Get current value before transition
    const fromValue = getComputedStyle(targetElement).getPropertyValue(property);

    // Set up transition
    const originalTransition = targetElement.style.transition;
    const transitionProperty = `${property} ${duration}ms ${timingFunction || 'ease'}`;
    targetElement.style.transition = originalTransition
      ? `${originalTransition}, ${transitionProperty}`
      : transitionProperty;

    // Apply the new value
    const toValue = String(value);
    targetElement.style.setProperty(property, toValue);

    // Wait for transition to complete
    const completed = await this.waitForTransition(targetElement, property, duration);

    // Clean up transition
    targetElement.style.transition = originalTransition;

    // Set result in context
    Object.assign(context, { it: targetElement });

    return {
      element: targetElement,
      property,
      fromValue,
      toValue,
      duration,
      completed,
    };
  }

  /**
   * Wait for CSS transition to complete
   */
  private async waitForTransition(
    element: HTMLElement,
    property: string,
    duration: number
  ): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      let completed = false;

      const cleanup = () => {
        element.removeEventListener('transitionend', onTransitionEnd);
        element.removeEventListener('transitioncancel', onTransitionCancel);
        clearTimeout(timeoutId);
      };

      const finish = (wasCompleted: boolean) => {
        if (!completed) {
          completed = true;
          cleanup();
          resolve(wasCompleted);
        }
      };

      const onTransitionEnd = (event: TransitionEvent) => {
        if (event.target === element && event.propertyName === property) {
          finish(true);
        }
      };

      const onTransitionCancel = (event: TransitionEvent) => {
        if (event.target === element && event.propertyName === property) {
          finish(false);
        }
      };

      element.addEventListener('transitionend', onTransitionEnd);
      element.addEventListener('transitioncancel', onTransitionCancel);

      // Set timeout as fallback (duration + 50ms buffer)
      const timeoutId = setTimeout(() => finish(true), duration + 50);
    });
  }
}

/**
 * Factory function to create TransitionCommand instance
 */
export function createTransitionCommand(): TransitionCommand {
  return new TransitionCommand();
}
