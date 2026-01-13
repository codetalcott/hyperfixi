/**
 * TransitionCommand - Decorated Implementation
 *
 * Animates CSS properties using CSS transitions.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   transition <property> to <value>
 *   transition <property> to <value> over <duration>
 *   transition <property> to <value> over <duration> with <timing-function>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveElement } from '../helpers/element-resolution';
import { parseDuration, camelToKebab } from '../helpers/duration-parsing';
import { waitForTransitionEnd } from '../helpers/event-waiting';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

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
 * TransitionCommand - Animate CSS with transitions
 *
 * Before: 250 lines
 * After: ~130 lines (48% reduction)
 */
@meta({
  description: 'Animate CSS properties using CSS transitions',
  syntax: 'transition <property> to <value> [over <duration>] [with <timing>]',
  examples: [
    'transition opacity to 0.5',
    'transition left to 100px over 500ms',
    'transition background-color to red over 1s with ease-in-out',
  ],
  sideEffects: ['style-change', 'timing'],
})
@command({ name: 'transition', category: 'animation' })
export class TransitionCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<TransitionCommandInput> {
    if (!raw.args?.length) throw new Error('transition requires property and value');

    let property: string;
    let target: string | HTMLElement | undefined;

    const firstArg = await evaluator.evaluate(raw.args[0], context);

    if (
      isHTMLElement(firstArg) ||
      (typeof firstArg === 'string' && /^[#.]|^(?:me|it|you)$/.test(firstArg))
    ) {
      target = firstArg as string | HTMLElement;
      property = String(await evaluator.evaluate(raw.args[1], context));
    } else {
      property = String(firstArg);
    }

    if (!property) throw new Error('transition requires a CSS property');
    if (!raw.modifiers?.to) throw new Error('transition requires "to <value>"');

    let value = await evaluator.evaluate(raw.modifiers.to, context);

    // Handle CSS keywords like 'initial', 'inherit', 'unset' that evaluate to undefined
    // because they're not defined as variables - use the raw identifier name instead
    if (value === undefined && (raw.modifiers.to as any).type === 'identifier') {
      value = (raw.modifiers.to as any).name;
    }

    const result: TransitionCommandInput = { property, value: value as string | number };
    if (target !== undefined) result.target = target;
    if (raw.modifiers?.over)
      result.duration = await evaluator.evaluate(raw.modifiers.over, context);
    if (raw.modifiers?.with)
      result.timingFunction = String(await evaluator.evaluate(raw.modifiers.with, context));
    return result;
  }

  async execute(
    input: TransitionCommandInput,
    context: TypedExecutionContext
  ): Promise<TransitionCommandOutput> {
    let { property } = input;
    const { target, value, duration: durationInput, timingFunction } = input;

    if (property.startsWith('*')) property = property.substring(1);
    property = camelToKebab(property);

    const targetElement = resolveElement(target, context);
    const duration = parseDuration(durationInput, 300);
    const fromValue = getComputedStyle(targetElement).getPropertyValue(property);

    const originalTransition = targetElement.style.transition;
    const transitionProp = `${property} ${duration}ms ${timingFunction || 'ease'}`;
    targetElement.style.transition = originalTransition
      ? `${originalTransition}, ${transitionProp}`
      : transitionProp;

    let toValue = String(value);
    let removeInlineAfter = false;

    // Handle CSS keywords that should restore to stylesheet value, not CSS spec initial
    // 'initial' in hyperscript means "restore to original" not CSS's transparent/default
    if (
      toValue === 'initial' ||
      toValue === 'inherit' ||
      toValue === 'unset' ||
      toValue === 'revert'
    ) {
      // Get the stylesheet value by temporarily removing inline style
      const currentInline = targetElement.style.getPropertyValue(property);
      targetElement.style.removeProperty(property);
      toValue = getComputedStyle(targetElement).getPropertyValue(property);
      // Restore inline style so transition can animate FROM current value
      if (currentInline) {
        targetElement.style.setProperty(property, currentInline);
      }
      removeInlineAfter = true;
    }

    targetElement.style.setProperty(property, toValue);

    const result = await waitForTransitionEnd(targetElement, property, duration);
    targetElement.style.transition = originalTransition;

    // If we transitioned to "initial", remove inline style to let stylesheet take over
    if (removeInlineAfter) {
      targetElement.style.removeProperty(property);
    }

    Object.assign(context, { it: targetElement });

    return {
      element: targetElement,
      property,
      fromValue,
      toValue,
      duration,
      completed: result.completed,
    };
  }
}

export const createTransitionCommand = createFactory(TransitionCommand);
export default TransitionCommand;
