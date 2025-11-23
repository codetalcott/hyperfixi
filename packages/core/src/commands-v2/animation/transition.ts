/**
 * TransitionCommand - Standalone V2 Implementation
 *
 * Animates CSS properties using CSS transitions
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Animate CSS properties with smooth transitions
 * - Configurable duration and timing functions
 * - Element resolution (me/it/you, CSS selectors)
 * - Property name conversion (camelCase/kebab-case, * prefix)
 * - Transition event detection (end/cancel)
 * - Original transition restoration after completion
 *
 * Syntax:
 *   transition <property> to <value>
 *   transition <property> to <value> over <duration>
 *   transition <property> to <value> over <duration> with <timing-function>
 *   transition <target> <property> to <value>
 *
 * @example
 *   transition opacity to 0.5
 *   transition left to 100px over 500ms
 *   transition background-color to red over 1s with ease-in-out
 *   transition #box width to 200px
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for TransitionCommand
 */
export interface TransitionCommandInput {
  /** Target element (defaults to me) */
  target?: string | HTMLElement;
  /** CSS property to animate */
  property: string;
  /** Target value for the property */
  value: string | number;
  /** Duration in milliseconds or with unit (e.g., "1s", "500ms") */
  duration?: number | string;
  /** CSS timing function (ease, linear, ease-in-out, etc.) */
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
 * TransitionCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 335 lines (with dom-utils dependency)
 * V2 Target: ~350 lines (inline utilities, standalone)
 */
export class TransitionCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'transition';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Animate CSS properties using CSS transitions with configurable duration and timing',
    syntax: [
      'transition <property> to <value>',
      'transition <property> to <value> over <duration>',
      'transition <property> to <value> over <duration> with <timing-function>',
      'transition <target> <property> to <value>',
    ],
    examples: [
      'transition opacity to 0.5',
      'transition left to 100px over 500ms',
      'transition background-color to red over 1s with ease-in-out',
      'transition #box width to 200px',
      'transition me left to 50px over 2s',
    ],
    category: 'animation',
    sideEffects: ['dom-mutation', 'async'],
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
  ): Promise<TransitionCommandInput> {
    // Extract arguments
    if (!raw.args || raw.args.length === 0) {
      throw new Error('transition command requires property and value arguments');
    }

    // Parse property (first arg or second if target specified)
    let property: string;
    let target: string | HTMLElement | undefined;
    let valueModifier: ExpressionNode | undefined;
    let duration: number | string | undefined;
    let timingFunction: string | undefined;

    // Check if first arg is a target element
    const firstArg = await evaluator.evaluate(raw.args[0], context);

    // If first arg is an element or looks like selector, treat as target
    if (
      firstArg instanceof HTMLElement ||
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

    // Validate property
    if (!property) {
      throw new Error('transition command requires a CSS property');
    }

    // Extract value from 'to' modifier
    if (raw.modifiers?.to) {
      valueModifier = raw.modifiers.to;
    } else {
      throw new Error('transition command requires "to <value>" modifier');
    }

    const value = await evaluator.evaluate(valueModifier, context);

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
   *
   * Animates a CSS property from its current value to a target value.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Transition result with completion status
   */
  async execute(
    input: TransitionCommandInput,
    context: TypedExecutionContext
  ): Promise<TransitionCommandOutput> {
    const { target, value, duration: durationInput, timingFunction } = input;
    let { property } = input;

    // Validate property and value
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

    // Convert camelCase to kebab-case for CSS properties
    property = this.camelToKebab(property);

    // Resolve target element
    const targetElement = await this.resolveElement(target, context);
    if (!targetElement) {
      throw new Error('transition command requires a valid target element');
    }

    // Parse duration
    const duration = this.parseDuration(durationInput || 300);

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

  // ========== Private Utility Methods ==========

  /**
   * Resolve target element from various input types
   *
   * @param target - Target (element, selector, context ref, or undefined for me)
   * @param context - Execution context
   * @returns Resolved HTML element
   * @throws Error if element cannot be resolved
   */
  private async resolveElement(
    target: string | HTMLElement | undefined,
    context: TypedExecutionContext
  ): Promise<HTMLElement> {
    // If target is already an HTMLElement, return it
    if (target instanceof HTMLElement) {
      return target;
    }

    // If no target specified, use context.me
    if (!target) {
      const me = context.me;
      if (!me) {
        throw new Error('No target element - provide explicit target or ensure context.me is set');
      }
      return this.asHTMLElement(me);
    }

    // Handle string targets (context refs or CSS selectors)
    if (typeof target === 'string') {
      const trimmed = target.trim();

      // Handle context references
      if (trimmed === 'me') {
        if (!context.me) {
          throw new Error('Context reference "me" is not available');
        }
        return this.asHTMLElement(context.me);
      }

      if (trimmed === 'it') {
        if (!(context.it instanceof HTMLElement)) {
          throw new Error('Context reference "it" is not an HTMLElement');
        }
        return context.it;
      }

      if (trimmed === 'you') {
        if (!context.you) {
          throw new Error('Context reference "you" is not available');
        }
        return this.asHTMLElement(context.you);
      }

      // Handle CSS selector
      if (typeof document !== 'undefined') {
        const element = document.querySelector(trimmed);
        if (!element) {
          throw new Error(`Element not found with selector: ${trimmed}`);
        }
        if (!(element instanceof HTMLElement)) {
          throw new Error(`Element found but is not an HTMLElement: ${trimmed}`);
        }
        return element;
      }

      throw new Error('DOM not available - cannot resolve element selector');
    }

    throw new Error(`Invalid target type: ${typeof target}`);
  }

  /**
   * Convert value to HTMLElement
   *
   * @param value - Value to convert
   * @returns HTMLElement
   * @throws Error if value is not an HTMLElement
   */
  private asHTMLElement(value: unknown): HTMLElement {
    if (value instanceof HTMLElement) {
      return value;
    }
    throw new Error('Value is not an HTMLElement');
  }

  /**
   * Convert camelCase to kebab-case
   *
   * @param str - String in camelCase
   * @returns String in kebab-case
   */
  private camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /**
   * Parse duration from various formats
   *
   * Supports:
   * - Numbers (treated as milliseconds)
   * - Strings with "ms" suffix (e.g., "500ms")
   * - Strings with "s" suffix (e.g., "1.5s")
   * - Plain numeric strings (e.g., "500")
   *
   * @param value - Duration value
   * @returns Duration in milliseconds
   */
  private parseDuration(value: number | string): number {
    if (typeof value === 'number') {
      return Math.max(0, value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      // Parse numeric milliseconds
      if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
      }

      // Parse with time units (e.g., "1.5s", "500ms")
      const match = trimmed.match(/^(\d*\.?\d+)(s|ms)?$/i);
      if (match) {
        const [, numberStr, unit] = match;
        const number = parseFloat(numberStr);

        if (!isNaN(number)) {
          return unit === 's' ? number * 1000 : number;
        }
      }
    }

    return 300; // Default duration
  }

  /**
   * Wait for CSS transition to complete
   *
   * Listens for transitionend and transitioncancel events.
   * Falls back to timeout if events don't fire.
   *
   * @param element - Element being transitioned
   * @param property - CSS property being transitioned
   * @param duration - Expected duration in milliseconds
   * @returns Promise that resolves to true if completed, false if cancelled
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

      // Listen for transition events
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
