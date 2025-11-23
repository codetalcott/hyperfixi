/**
 * SettleCommand - Standalone V2 Implementation
 *
 * Waits for CSS transitions and animations to complete
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Wait for CSS transitions to complete
 * - Wait for CSS animations to complete
 * - Calculate total animation time from computed styles
 * - Configurable timeout with fallback
 * - Settle immediately if no animations running
 * - Event-based completion detection
 *
 * Syntax:
 *   settle
 *   settle <target>
 *   settle for <timeout>
 *   settle <target> for <timeout>
 *
 * @example
 *   settle
 *   settle #animated-element
 *   settle for 3000
 *   settle .loading for 5s
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for SettleCommand
 */
export interface SettleCommandInput {
  /** Target element (defaults to me) */
  target?: string | HTMLElement;
  /** Timeout in milliseconds or with unit */
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
 * SettleCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 326 lines (with dom-utils dependency)
 * V2 Target: ~340 lines (inline utilities, standalone)
 */
export class SettleCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'settle';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Wait for CSS transitions and animations to complete on the target element',
    syntax: [
      'settle',
      'settle <target>',
      'settle for <timeout>',
      'settle <target> for <timeout>',
    ],
    examples: [
      'settle',
      'settle #animated-element',
      'settle for 3000',
      'settle .loading for 5s',
    ],
    category: 'animation',
    sideEffects: ['async'],
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
  ): Promise<SettleCommandInput> {
    let target: string | HTMLElement | undefined;
    let timeout: number | string | undefined;

    // Parse optional target from args
    if (raw.args && raw.args.length > 0) {
      const firstArg = await evaluator.evaluate(raw.args[0], context);

      // Check if this is a target element
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
      }
    }

    // Parse optional timeout from 'for' modifier
    if (raw.modifiers?.for) {
      timeout = await evaluator.evaluate(raw.modifiers.for, context);
    }

    return {
      target,
      timeout,
    };
  }

  /**
   * Execute the settle command
   *
   * Waits for animations and transitions to complete on the target element.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Settle result with completion status and duration
   */
  async execute(
    input: SettleCommandInput,
    context: TypedExecutionContext
  ): Promise<SettleCommandOutput> {
    const { target, timeout: timeoutInput } = input;

    // Resolve target element (default to context.me)
    const targetElement = await this.resolveElement(target, context);
    if (!targetElement) {
      throw new Error('settle command requires a valid target element');
    }

    // Parse timeout
    const timeout = this.parseTimeout(timeoutInput || 5000);

    // Wait for element to settle
    const startTime = Date.now();
    const settled = await this.waitForSettle(targetElement, timeout);
    const duration = Date.now() - startTime;

    // Set result in context
    Object.assign(context, { it: targetElement });

    return {
      element: targetElement,
      settled,
      timeout,
      duration,
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
   * Parse timeout from various formats
   *
   * @param value - Timeout value
   * @returns Timeout in milliseconds
   */
  private parseTimeout(value: number | string): number {
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

    return 5000; // Default timeout
  }

  /**
   * Wait for element to settle (animations/transitions complete)
   *
   * @param element - Element to wait for
   * @param timeout - Maximum time to wait
   * @returns Promise that resolves to true if settled, false if timeout
   */
  private async waitForSettle(element: HTMLElement, timeout: number): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      let settled = false;

      // Get computed styles to check for transitions/animations
      const computedStyle = getComputedStyle(element);
      const transitionDurations = this.parseDurations(computedStyle.transitionDuration);
      const transitionDelays = this.parseDurations(computedStyle.transitionDelay);
      const animationDurations = this.parseDurations(computedStyle.animationDuration);
      const animationDelays = this.parseDurations(computedStyle.animationDelay);

      // Calculate total time for transitions/animations
      const maxTransitionTime = this.calculateMaxTime(transitionDurations, transitionDelays);
      const maxAnimationTime = this.calculateMaxTime(animationDurations, animationDelays);
      const totalAnimationTime = Math.max(maxTransitionTime, maxAnimationTime);

      // If no animations/transitions, settle immediately
      if (totalAnimationTime <= 0) {
        resolve(true);
        return;
      }

      // Set up event listeners for completion
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
        if (event.target === element) {
          settle();
        }
      };

      const onAnimationEnd = (event: Event) => {
        if (event.target === element) {
          settle();
        }
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

  /**
   * Parse CSS duration string into array of milliseconds
   *
   * @param durationString - CSS duration string (e.g., "1s, 0.5s")
   * @returns Array of durations in milliseconds
   */
  private parseDurations(durationString: string): number[] {
    if (!durationString || durationString === 'none') {
      return [0];
    }

    return durationString.split(',').map(duration => {
      const value = parseFloat(duration.trim());
      if (isNaN(value)) return 0;

      // Convert seconds to milliseconds
      if (duration.includes('s') && !duration.includes('ms')) {
        return value * 1000;
      }
      return value;
    });
  }

  /**
   * Calculate maximum total time from durations and delays
   *
   * @param durations - Array of durations in milliseconds
   * @param delays - Array of delays in milliseconds
   * @returns Maximum total time (duration + delay)
   */
  private calculateMaxTime(durations: number[], delays: number[]): number {
    let maxTime = 0;

    for (let i = 0; i < durations.length; i++) {
      const duration = durations[i] || 0;
      const delay = delays[i] || 0;
      const totalTime = duration + delay;
      maxTime = Math.max(maxTime, totalTime);
    }

    return maxTime;
  }
}

/**
 * Factory function to create SettleCommand instance
 */
export function createSettleCommand(): SettleCommand {
  return new SettleCommand();
}
