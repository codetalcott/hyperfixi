/**
 * TakeCommand - Standalone V2 Implementation
 *
 * Moves classes, attributes, and properties between elements
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Property transfer (classes, attributes, CSS properties)
 * - Source and target resolution
 * - me, it, you context references
 * - CSS selector support
 * - "and put it on" optional syntax
 *
 * Syntax:
 *   take <property> from <source>
 *   take <property> from <source> and put it on <target>
 *
 * @example
 *   take class from <#source/> and put it on me
 *   take @data-value from <.source/> and put it on <#target/>
 *   take title from <#old-button/>
 *   take background-color from <.theme-source/> and put it on <.theme-target/>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { resolveElement } from '../helpers/element-resolution';

/**
 * Typed input for TakeCommand
 */
export interface TakeCommandInput {
  /** Property or attribute name to transfer */
  property: string;
  /** Source element to take from */
  source: unknown;
  /** Target element to put on (defaults to 'me') */
  target?: unknown;
}

/**
 * Output from take command execution
 */
export interface TakeCommandOutput {
  targetElement: HTMLElement;
  property: string;
  value: unknown;
}

/**
 * TakeCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 935 lines
 * V2 Target: ~350 lines (inline utilities, standalone)
 */
export class TakeCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'take';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Move classes, attributes, and properties from one element to another',
    syntax: [
      'take <property> from <source>',
      'take <property> from <source> and put it on <target>',
    ],
    examples: [
      'take class from <#source/> and put it on me',
      'take @data-value from <.source/> and put it on <#target/>',
      'take title from <#old-button/>',
      'take background-color from <.theme-source/>',
    ],
    category: 'animation',
    sideEffects: ['dom-mutation', 'property-transfer'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<TakeCommandInput> {
    // Syntax: take <property> from <source> [and put it on <target>]
    // Args: [property, 'from', source, ...optional('and', 'put', 'it', 'on', target)]

    if (raw.args.length < 3) {
      throw new Error(
        'take command requires property, "from", and source element'
      );
    }

    // First arg is property
    const property = String(await evaluator.evaluate(raw.args[0], context));

    // Second arg should be 'from'
    const fromKeyword = await evaluator.evaluate(raw.args[1], context);
    if (fromKeyword !== 'from') {
      throw new Error('take command syntax: take <property> from <source>');
    }

    // Third arg is source
    const source = await evaluator.evaluate(raw.args[2], context);

    // Optional: "and put it on <target>" (args[3-7])
    let target: unknown;
    if (raw.args.length > 3) {
      // Check for full "and put it on" sequence
      if (
        raw.args.length >= 7 &&
        (await evaluator.evaluate(raw.args[3], context)) === 'and' &&
        (await evaluator.evaluate(raw.args[4], context)) === 'put' &&
        (await evaluator.evaluate(raw.args[5], context)) === 'it' &&
        (await evaluator.evaluate(raw.args[6], context)) === 'on'
      ) {
        // Target is at index 7
        if (raw.args.length >= 8) {
          target = await evaluator.evaluate(raw.args[7], context);
        }
      } else {
        // Might be shortened syntax - target directly at index 3
        target = await evaluator.evaluate(raw.args[3], context);
      }
    }

    // Check "on" modifier
    if (!target && raw.modifiers?.on) {
      target = await evaluator.evaluate(raw.modifiers.on, context);
    }

    return {
      property,
      source,
      target,
    };
  }

  /**
   * Execute the take command
   *
   * Takes a property from source and puts it on target.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Take operation result
   */
  async execute(
    input: TakeCommandInput,
    context: TypedExecutionContext
  ): Promise<TakeCommandOutput> {
    const { property, source, target } = input;

    // Resolve source element
    let sourceElement: HTMLElement;
    try {
      sourceElement = resolveElement(source as string | HTMLElement | undefined, context);
    } catch {
      throw new Error('Source element not found or invalid');
    }

    // Resolve target element (defaults to context.me)
    let targetElement: HTMLElement;
    try {
      targetElement = target
        ? resolveElement(target as string | HTMLElement | undefined, context)
        : resolveElement(undefined, context);
    } catch {
      throw new Error('Target element not found or invalid');
    }

    // Take the property value from source
    const value = this.takeProperty(sourceElement, property);

    // Put the property value on target
    this.putProperty(targetElement, property, value);

    return {
      targetElement,
      property,
      value,
    };
  }

  // ========== Private Utility Methods ==========

  /**
   * Take property from element and remove it
   *
   * @param element - Source element
   * @param property - Property name
   * @returns Property value
   */
  private takeProperty(element: HTMLElement, property: string): unknown {
    const prop = property.trim();
    const lowerProp = prop.toLowerCase();

    // Handle CSS classes
    if (lowerProp === 'class' || lowerProp === 'classes') {
      const classes = Array.from(element.classList);
      element.className = ''; // Remove all classes
      return classes;
    }

    // Handle specific class
    if (prop.startsWith('.')) {
      const className = prop.substring(1);
      if (element.classList.contains(className)) {
        element.classList.remove(className);
        return className;
      }
      return null;
    }

    // Handle attributes (@ prefix or data- prefix)
    if (prop.startsWith('@')) {
      const attrName = prop.substring(1);
      const value = element.getAttribute(attrName);
      element.removeAttribute(attrName);
      return value;
    }

    if (prop.startsWith('data-')) {
      const value = element.getAttribute(prop);
      element.removeAttribute(prop);
      return value;
    }

    // Handle common properties
    if (lowerProp === 'id') {
      const value = element.id;
      element.id = '';
      return value;
    }

    if (lowerProp === 'title') {
      const value = element.title;
      element.title = '';
      return value;
    }

    if (lowerProp === 'value' && 'value' in element) {
      const value = (element as HTMLInputElement).value;
      (element as HTMLInputElement).value = '';
      return value;
    }

    // Handle CSS properties (kebab-case or camelCase)
    const camelProperty = prop.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );

    if (
      prop.includes('-') ||
      camelProperty in element.style ||
      prop in element.style
    ) {
      let value: string;

      if (camelProperty in element.style) {
        value = (element.style as any)[camelProperty];
        (element.style as any)[camelProperty] = '';
      } else if (prop in element.style) {
        value = (element.style as any)[prop];
        (element.style as any)[prop] = '';
      } else {
        value = element.style.getPropertyValue(prop);
        element.style.removeProperty(prop);
      }

      return value;
    }

    // Handle generic attribute
    const value = element.getAttribute(property);
    if (value !== null) {
      element.removeAttribute(property);
      return value;
    }

    return null;
  }

  /**
   * Put property on element
   *
   * @param element - Target element
   * @param property - Property name
   * @param value - Property value
   */
  private putProperty(
    element: HTMLElement,
    property: string,
    value: unknown
  ): void {
    if (value === null || value === undefined) {
      return; // Nothing to put
    }

    const prop = property.trim();
    const lowerProp = prop.toLowerCase();

    // Handle CSS classes
    if (lowerProp === 'class' || lowerProp === 'classes') {
      if (Array.isArray(value)) {
        value.forEach((className) => {
          if (className && typeof className === 'string') {
            element.classList.add(className);
          }
        });
      } else if (typeof value === 'string') {
        element.className = value;
      }
      return;
    }

    // Handle specific class
    if (prop.startsWith('.')) {
      const className = prop.substring(1);
      if (value) {
        element.classList.add(className);
      }
      return;
    }

    // Handle attributes
    if (prop.startsWith('@')) {
      const attrName = prop.substring(1);
      element.setAttribute(attrName, String(value));
      return;
    }

    if (prop.startsWith('data-')) {
      element.setAttribute(prop, String(value));
      return;
    }

    // Handle common properties
    if (lowerProp === 'id') {
      element.id = String(value);
      return;
    }

    if (lowerProp === 'title') {
      element.title = String(value);
      return;
    }

    if (lowerProp === 'value' && 'value' in element) {
      (element as HTMLInputElement).value = String(value);
      return;
    }

    // Handle CSS properties
    const camelProperty = prop.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );

    if (
      prop.includes('-') ||
      camelProperty in element.style ||
      prop in element.style
    ) {
      if (camelProperty in element.style) {
        (element.style as any)[camelProperty] = String(value);
      } else if (prop in element.style) {
        (element.style as any)[prop] = String(value);
      } else {
        element.style.setProperty(prop, String(value));
      }
      return;
    }

    // Handle generic attribute
    element.setAttribute(property, String(value));
  }
}

/**
 * Factory function to create TakeCommand instance
 */
export function createTakeCommand(): TakeCommand {
  return new TakeCommand();
}
