/**
 * DefaultCommand - Decorated Implementation
 *
 * Sets values only if they don't already exist.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   default <expression> to <expression>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

/**
 * Typed input for DefaultCommand
 */
export interface DefaultCommandInput {
  /** Target variable, element, or attribute */
  target: string | HTMLElement;
  /** Value to set if target doesn't exist */
  value: any;
}

/**
 * Output from default command execution
 */
export interface DefaultCommandOutput {
  target: string;
  value: any;
  wasSet: boolean;
  existingValue?: any;
  targetType: 'variable' | 'attribute' | 'property' | 'element';
}

/**
 * DefaultCommand - Set values if not already defined
 *
 * Before: 472 lines
 * After: ~400 lines (15% reduction)
 */
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

    // First arg is the target
    const target = await evaluator.evaluate(raw.args[0], context);

    // Value can be from "to" modifier or second arg
    let value: any;
    if (raw.modifiers?.to) {
      value = await evaluator.evaluate(raw.modifiers.to, context);
    } else if (raw.args.length >= 2) {
      value = await evaluator.evaluate(raw.args[1], context);
    } else {
      throw new Error('default command requires a value (use "to <value>")');
    }

    return {
      target,
      value,
    };
  }

  /**
   * Execute the default command
   *
   * Sets the value only if the target doesn't already have a value.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Default operation result
   */
  async execute(
    input: DefaultCommandInput,
    context: TypedExecutionContext
  ): Promise<DefaultCommandOutput> {
    const { target, value } = input;

    // Handle different target types
    if (typeof target === 'string') {
      // Handle attribute syntax: @attr or @data-attr
      if (target.startsWith('@')) {
        return this.defaultAttribute(context, target.substring(1), value);
      }

      // Handle possessive expressions like "my innerHTML", "my textContent"
      const possessiveMatch = target.match(/^(my|its?|your?)\s+(.+)$/);
      if (possessiveMatch) {
        const [, possessive, property] = possessiveMatch;
        return this.defaultElementProperty(context, possessive, property, value);
      }

      // Handle regular variable
      return this.defaultVariable(context, target, value);
    }

    // Handle HTML element
    if (isHTMLElement(target)) {
      return this.defaultElementValue(context, target as HTMLElement, value);
    }

    throw new Error(`Invalid target type: ${typeof target}`);
  }

  // ========== Private Utility Methods ==========

  /**
   * Set default value for a variable
   *
   * @param context - Execution context
   * @param variableName - Variable name
   * @param value - Default value
   * @returns Operation result
   */
  private defaultVariable(
    context: TypedExecutionContext,
    variableName: string,
    value: any
  ): DefaultCommandOutput {
    // Check if variable already exists
    const existingValue =
      context.locals?.get(variableName) ||
      context.globals?.get(variableName) ||
      context.variables?.get(variableName);

    if (existingValue !== undefined) {
      return {
        target: variableName,
        value,
        wasSet: false,
        existingValue,
        targetType: 'variable',
      };
    }

    // Set the default value
    if (context.locals) {
      context.locals.set(variableName, value);
    }

    // Set in context.it
    Object.assign(context, { it: value });

    return {
      target: variableName,
      value,
      wasSet: true,
      targetType: 'variable',
    };
  }

  /**
   * Set default value for an attribute
   *
   * @param context - Execution context
   * @param attributeName - Attribute name
   * @param value - Default value
   * @returns Operation result
   */
  private defaultAttribute(
    context: TypedExecutionContext,
    attributeName: string,
    value: any
  ): DefaultCommandOutput {
    if (!context.me) {
      throw new Error('No element context available for attribute default');
    }

    const existingValue = context.me.getAttribute(attributeName);

    if (existingValue !== null) {
      return {
        target: `@${attributeName}`,
        value,
        wasSet: false,
        existingValue,
        targetType: 'attribute',
      };
    }

    // Set the default value
    context.me.setAttribute(attributeName, String(value));
    Object.assign(context, { it: value });

    return {
      target: `@${attributeName}`,
      value,
      wasSet: true,
      targetType: 'attribute',
    };
  }

  /**
   * Set default value for an element property
   *
   * @param context - Execution context
   * @param possessive - Possessive reference (my, its, your)
   * @param property - Property name
   * @param value - Default value
   * @returns Operation result
   */
  private defaultElementProperty(
    context: TypedExecutionContext,
    possessive: string,
    property: string,
    value: any
  ): DefaultCommandOutput {
    let targetElement: HTMLElement;

    // Resolve possessive reference
    switch (possessive) {
      case 'my':
        if (!context.me) throw new Error('No "me" element in context');
        targetElement = this.asHTMLElement(context.me) ||
          (() => { throw new Error('context.me is not an HTMLElement'); })();
        break;
      case 'its':
      case 'it':
        if (!isHTMLElement(context.it)) throw new Error('Context "it" is not an element');
        targetElement = context.it as HTMLElement;
        break;
      case 'your':
      case 'you':
        if (!context.you) throw new Error('No "you" element in context');
        targetElement = this.asHTMLElement(context.you) ||
          (() => { throw new Error('context.you is not an HTMLElement'); })();
        break;
      default:
        throw new Error(`Unknown possessive: ${possessive}`);
    }

    // Get existing property value
    const existingValue = this.getElementProperty(targetElement, property);

    if (existingValue !== undefined && existingValue !== null && existingValue !== '') {
      return {
        target: `${possessive} ${property}`,
        value,
        wasSet: false,
        existingValue,
        targetType: 'property',
      };
    }

    // Set the default value
    this.setElementProperty(targetElement, property, value);
    Object.assign(context, { it: value });

    return {
      target: `${possessive} ${property}`,
      value,
      wasSet: true,
      targetType: 'property',
    };
  }

  /**
   * Set default value for an element
   *
   * @param context - Execution context
   * @param element - Target element
   * @param value - Default value
   * @returns Operation result
   */
  private defaultElementValue(
    context: TypedExecutionContext,
    element: HTMLElement,
    value: any
  ): DefaultCommandOutput {
    const existingValue = this.getElementValue(element);

    if (existingValue !== undefined && existingValue !== null && existingValue !== '') {
      return {
        target: 'element',
        value,
        wasSet: false,
        existingValue,
        targetType: 'element',
      };
    }

    // Set the default value
    this.setElementValue(element, value);
    Object.assign(context, { it: value });

    return {
      target: 'element',
      value,
      wasSet: true,
      targetType: 'element',
    };
  }

  /**
   * Inline utility: Convert element to HTMLElement
   * (Replaces V1 dependency on dom-utils.asHTMLElement)
   *
   * @param element - Element to convert
   * @returns HTMLElement or null
   */
  private asHTMLElement(element: Element | null | undefined): HTMLElement | null {
    if (!element) return null;
    if (isHTMLElement(element)) return element as HTMLElement;
    return null;
  }

  /**
   * Get element property value
   *
   * @param element - Target element
   * @param property - Property name
   * @returns Property value
   */
  private getElementProperty(element: HTMLElement, property: string): any {
    // Handle common properties
    if (property === 'textContent') return element.textContent;
    if (property === 'innerHTML') return element.innerHTML;
    if (property === 'innerText') return element.innerText;
    if (property === 'value' && 'value' in element) return (element as any).value;
    if (property === 'id') return element.id;
    if (property === 'className') return element.className;

    // Handle style properties
    if (property.includes('-') || property in element.style) {
      return element.style.getPropertyValue(property) || (element.style as any)[property];
    }

    // Handle generic property
    return (element as any)[property];
  }

  /**
   * Set element property value
   *
   * @param element - Target element
   * @param property - Property name
   * @param value - Value to set
   */
  private setElementProperty(element: HTMLElement, property: string, value: any): void {
    // Handle common properties
    if (property === 'textContent') {
      element.textContent = String(value);
      return;
    }
    if (property === 'innerHTML') {
      element.innerHTML = String(value);
      return;
    }
    if (property === 'innerText') {
      element.innerText = String(value);
      return;
    }
    if (property === 'value' && 'value' in element) {
      (element as any).value = value;
      return;
    }
    if (property === 'id') {
      element.id = String(value);
      return;
    }
    if (property === 'className') {
      element.className = String(value);
      return;
    }

    // Handle style properties
    if (property.includes('-') || property in element.style) {
      element.style.setProperty(property, String(value));
      return;
    }

    // Handle generic property
    (element as any)[property] = value;
  }

  /**
   * Get element value
   *
   * @param element - Target element
   * @returns Element value
   */
  private getElementValue(element: HTMLElement): any {
    if ('value' in element) {
      return (element as any).value;
    }
    return element.textContent;
  }

  /**
   * Set element value
   *
   * @param element - Target element
   * @param value - Value to set
   */
  private setElementValue(element: HTMLElement, value: any): void {
    if ('value' in element) {
      (element as any).value = value;
    } else {
      element.textContent = String(value);
    }
  }
}

export const createDefaultCommand = createFactory(DefaultCommand);
export default DefaultCommand;
