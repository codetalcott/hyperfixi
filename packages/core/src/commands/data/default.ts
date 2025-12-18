/**
 * DefaultCommand - Optimized Implementation
 *
 * Sets values only if they don't already exist.
 * Uses shared helpers to reduce code duplication.
 *
 * Optimized: 424 lines → ~160 lines using shared helpers
 *
 * Syntax:
 *   default <expression> to <expression>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolvePossessive } from '../helpers/element-resolution';
import { getVariableValue, setVariableValue } from '../helpers/variable-access';
import {
  getElementProperty,
  setElementProperty,
  getElementValue,
  setElementValue,
  isEmpty,
} from '../helpers/element-property-access';
import { command, meta, createFactory, type DecoratedCommand, type CommandMetadata } from '../decorators';

/**
 * Typed input for DefaultCommand
 */
export interface DefaultCommandInput {
  /** Target variable, element, or attribute */
  target: string | HTMLElement;
  /** Value to set if target doesn't exist */
  value: unknown;
}

/**
 * Output from default command execution
 */
export interface DefaultCommandOutput {
  target: string;
  value: unknown;
  wasSet: boolean;
  existingValue?: unknown;
  targetType: 'variable' | 'attribute' | 'property' | 'element';
}

@meta({
  description: 'Set a value only if it doesn\'t already exist',
  syntax: ['default <expression> to <expression>'],
  examples: ['default myVar to "fallback"', 'default @data-theme to "light"', 'default my innerHTML to "No content"'],
  sideEffects: ['data-mutation', 'dom-mutation'],
})
@command({ name: 'default', category: 'data' })
export class DefaultCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<DefaultCommandInput> {
    if (raw.args.length < 1) {
      throw new Error('default command requires a target');
    }

    const target = await evaluator.evaluate(raw.args[0], context);
    let value: unknown;

    if (raw.modifiers?.to) {
      value = await evaluator.evaluate(raw.modifiers.to, context);
    } else if (raw.args.length >= 2) {
      value = await evaluator.evaluate(raw.args[1], context);
    } else {
      throw new Error('default command requires a value (use "to <value>")');
    }

    return { target, value };
  }

  async execute(
    input: DefaultCommandInput,
    context: TypedExecutionContext
  ): Promise<DefaultCommandOutput> {
    const { target, value } = input;

    if (typeof target === 'string') {
      // Attribute syntax: @attr
      if (target.startsWith('@')) {
        return this.defaultAttribute(context, target.substring(1), value);
      }

      // Possessive expression: "my innerHTML", "its value"
      const possessiveMatch = target.match(/^(my|its?|your?)\s+(.+)$/);
      if (possessiveMatch) {
        const [, possessive, property] = possessiveMatch;
        return this.defaultElementProperty(context, possessive, property, value);
      }

      // Regular variable
      return this.defaultVariable(context, target, value);
    }

    // HTML element
    if (isHTMLElement(target)) {
      return this.defaultElementValue(context, target as HTMLElement, value);
    }

    throw new Error(`Invalid target type: ${typeof target}`);
  }

  private defaultVariable(
    context: TypedExecutionContext,
    name: string,
    value: unknown
  ): DefaultCommandOutput {
    const existingValue = getVariableValue(name, context);

    if (existingValue !== undefined) {
      return { target: name, value, wasSet: false, existingValue, targetType: 'variable' };
    }

    setVariableValue(name, value, context);
    Object.assign(context, { it: value });

    return { target: name, value, wasSet: true, targetType: 'variable' };
  }

  private defaultAttribute(
    context: TypedExecutionContext,
    name: string,
    value: unknown
  ): DefaultCommandOutput {
    if (!context.me) {
      throw new Error('No element context available for attribute default');
    }

    const existingValue = context.me.getAttribute(name);

    if (existingValue !== null) {
      return { target: `@${name}`, value, wasSet: false, existingValue, targetType: 'attribute' };
    }

    context.me.setAttribute(name, String(value));
    Object.assign(context, { it: value });

    return { target: `@${name}`, value, wasSet: true, targetType: 'attribute' };
  }

  private defaultElementProperty(
    context: TypedExecutionContext,
    possessive: string,
    property: string,
    value: unknown
  ): DefaultCommandOutput {
    // Use shared helper for possessive resolution
    const targetElement = resolvePossessive(possessive, context);
    const existingValue = getElementProperty(targetElement, property);
    const targetName = `${possessive} ${property}`;

    if (!isEmpty(existingValue)) {
      return { target: targetName, value, wasSet: false, existingValue, targetType: 'property' };
    }

    setElementProperty(targetElement, property, value);
    Object.assign(context, { it: value });

    return { target: targetName, value, wasSet: true, targetType: 'property' };
  }

  private defaultElementValue(
    context: TypedExecutionContext,
    element: HTMLElement,
    value: unknown
  ): DefaultCommandOutput {
    const existingValue = getElementValue(element);

    if (!isEmpty(existingValue)) {
      return { target: 'element', value, wasSet: false, existingValue, targetType: 'element' };
    }

    setElementValue(element, value);
    Object.assign(context, { it: value });

    return { target: 'element', value, wasSet: true, targetType: 'element' };
  }
}

export const createDefaultCommand = createFactory(DefaultCommand);
export default DefaultCommand;
