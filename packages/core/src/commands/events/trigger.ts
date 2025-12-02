/**
 * TriggerCommand - Standalone V2 Implementation
 *
 * Triggers events on target elements using "trigger X on Y" syntax
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Simple event dispatch (trigger click on #button)
 * - Custom events with details (trigger event(foo: 'bar') on #target)
 * - Standard DOM events (click, change, input, submit)
 * - Event options (bubbles, cancelable, composed)
 * - Multiple target elements
 * - Window/document targets
 *
 * Syntax:
 *   trigger <event> on <target>                          # Simple event
 *   trigger <event>(<detail>) on <target>                # Event with details
 *   trigger <event> on <target> with bubbles             # With options
 *   trigger <event> on <target> with cancelable          # Cancelable event
 *   trigger <event> on <target> with composed            # Composed event
 *
 * Difference from SendCommand:
 *   - send uses "to": send event to #target
 *   - trigger uses "on": trigger event on #target
 *   - Trigger is more natural for DOM events (click, change, etc.)
 *   - Send is more natural for custom events
 *
 * @example
 *   trigger click on #button
 *   trigger customEvent on me
 *   trigger dataEvent(user: "Alice", id: 42) on #target
 *   trigger globalEvent on window
 *   trigger docEvent on document
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { createCustomEvent, parseEventValue } from '../helpers/event-helpers';
import type { EventOptions } from '../helpers/event-helpers';

// Re-export EventOptions for backward compatibility
export type { EventOptions } from '../helpers/event-helpers';

/**
 * Typed input for TriggerCommand
 * Represents parsed arguments ready for execution
 */
export interface TriggerCommandInput {
  eventName: string;           // Event to trigger
  detail?: any;                // Event detail data (optional)
  targets: EventTarget[];      // Where to dispatch (HTMLElement, Window, Document)
  options: EventOptions;       // Event options (bubbles, cancelable, composed)
}

/**
 * TriggerCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 682 lines (with validation, type safety, enhanced events)
 * V2 Size: ~400 lines (41% reduction, all features preserved)
 */
export class TriggerCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'trigger';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Trigger events on elements using "trigger X on Y" syntax',
    syntax: [
      'trigger <event> on <target>',
      'trigger <event>(<detail>) on <target>',
      'trigger <event> on <target> with <options>',
    ],
    examples: [
      'trigger click on #button',
      'trigger customEvent on me',
      'trigger dataEvent(foo: "bar", count: 42) on #target',
      'trigger globalEvent on window',
      'trigger event on #target with bubbles',
      'trigger docEvent on document',
    ],
    category: 'events',
    sideEffects: ['event-dispatch'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Handles complex patterns:
   * - "trigger <event> on <target>" - simple event dispatch
   * - "trigger <event>(<detail>) on <target>" - event with details
   * - "trigger <event> on <target> with <options>" - event with options
   *
   * Parser output structure (from parseTriggerCommand):
   * - args[0]: event name (identifier or functionCall for event(detail))
   * - args[1]: 'on' keyword
   * - args[2+]: target element(s)
   * - args[n]: 'with' keyword (optional)
   * - args[n+1+]: option keywords (bubbles, cancelable, composed)
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
  ): Promise<TriggerCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('trigger command requires an event name');
    }

    // Helper to get node type
    const nodeType = (node: ASTNode): string => {
      if (!node || typeof node !== 'object') return 'unknown';
      return (node as any).type || 'unknown';
    };

    // Step 1: Parse event name and optional detail
    const firstArg = raw.args[0];
    const firstType = nodeType(firstArg);

    let eventName: string;
    let detail: any = undefined;

    // Check if first arg is a function call (event with details)
    if (firstType === 'functionCall') {
      const funcCall = firstArg as any;
      eventName = funcCall.name;

      // Parse event detail from function arguments
      if (funcCall.args && funcCall.args.length > 0) {
        detail = await this.parseEventDetail(funcCall.args, evaluator, context);
      }
    } else if (firstType === 'identifier' || firstType === 'keyword') {
      // For identifiers, extract the name directly (don't evaluate as variable)
      eventName = (firstArg as any).name;
    } else if (firstType === 'string' || firstType === 'literal') {
      // For string literals, get the value
      const val = (firstArg as any).value;
      eventName = typeof val === 'string' ? val : String(val);
    } else {
      // For other types, try evaluating
      const evaluated = await evaluator.evaluate(firstArg, context);
      if (typeof evaluated !== 'string') {
        throw new Error(`trigger command: event name must be a string, got ${typeof evaluated}`);
      }
      eventName = evaluated;
    }

    // Step 2: Find target keyword ('on')
    let targetKeywordIndex = -1;
    let targetKeyword: string | null = null;

    for (let i = 1; i < raw.args.length; i++) {
      const arg = raw.args[i];
      const argType = nodeType(arg);
      const argValue = (argType === 'literal' ? (arg as any).value : (arg as any).name) as string;

      if ((argType === 'literal' || argType === 'identifier' || argType === 'keyword') &&
          argValue === 'on') {
        targetKeywordIndex = i;
        targetKeyword = argValue;
        break;
      }
    }

    // Step 3: Parse targets
    let targets: EventTarget[];

    if (targetKeywordIndex === -1 || targetKeywordIndex === raw.args.length - 1) {
      // No target specified, default to context.me
      if (!context.me) {
        throw new Error('trigger command: no target specified and context.me is null');
      }
      targets = [context.me as EventTarget];
    } else {
      // Parse target arguments
      const targetArgs = raw.args.slice(targetKeywordIndex + 1);

      // Find 'with' keyword (for options)
      let withKeywordIndex = -1;
      for (let i = 0; i < targetArgs.length; i++) {
        const arg = targetArgs[i];
        const argType = nodeType(arg);
        const argValue = (argType === 'literal' ? (arg as any).value : (arg as any).name) as string;

        if ((argType === 'literal' || argType === 'identifier' || argType === 'keyword') &&
            argValue === 'with') {
          withKeywordIndex = i;
          break;
        }
      }

      // Extract target args (before 'with')
      const actualTargetArgs = withKeywordIndex === -1
        ? targetArgs
        : targetArgs.slice(0, withKeywordIndex);

      targets = await this.resolveTargets(actualTargetArgs, evaluator, context);
    }

    // Step 4: Parse event options (bubbles, cancelable, composed)
    const options = await this.parseEventOptions(raw.args, evaluator, context);

    return { eventName, detail, targets, options };
  }

  /**
   * Execute the trigger command
   *
   * Creates and dispatches events to target elements.
   * Handles event detail and options.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns void (nothing)
   */
  async execute(
    input: TriggerCommandInput,
    context: TypedExecutionContext
  ): Promise<void> {
    const { eventName, detail, targets, options } = input;

    // Create custom event
    const event = createCustomEvent(eventName, detail, options);

    // Dispatch to all targets
    for (const target of targets) {
      target.dispatchEvent(event);
    }

    // Update context.it to the last dispatched event
    (context as any).it = event;
  }

  // ========== Private Utility Methods ==========

  /**
   * Resolve target elements from AST args
   *
   * Inline version of dom-utils.resolveTargets
   * Handles: HTMLElement, NodeList, CSS selectors, window, document
   *
   * @param args - Raw AST arguments
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Array of resolved EventTargets
   */
  private async resolveTargets(
    args: ASTNode[],
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<EventTarget[]> {
    if (!args || args.length === 0) {
      throw new Error('trigger command: no target specified');
    }

    const targets: EventTarget[] = [];

    for (const arg of args) {
      const evaluated = await evaluator.evaluate(arg, context);

      // Handle special global targets
      if (evaluated === 'window' || evaluated === globalThis || evaluated === window) {
        targets.push(window);
        continue;
      }

      if (evaluated === 'document' || evaluated === document) {
        targets.push(document);
        continue;
      }

      // Handle HTMLElement
      if (isHTMLElement(evaluated)) {
        targets.push(evaluated as HTMLElement);
      }
      // Handle NodeList
      else if (evaluated instanceof NodeList) {
        const elements = Array.from(evaluated).filter(
          (el): el is HTMLElement => isHTMLElement(el)
        );
        targets.push(...elements);
      }
      // Handle Array
      else if (Array.isArray(evaluated)) {
        const elements = evaluated.filter(
          (el): el is HTMLElement => isHTMLElement(el)
        );
        targets.push(...elements);
      }
      // Handle CSS selector string
      else if (typeof evaluated === 'string') {
        try {
          const selected = document.querySelectorAll(evaluated);
          const elements = Array.from(selected).filter(
            (el): el is HTMLElement => isHTMLElement(el)
          );

          if (elements.length === 0) {
            throw new Error(`No elements found matching selector: "${evaluated}"`);
          }

          targets.push(...elements);
        } catch (error) {
          throw new Error(
            `Invalid CSS selector: "${evaluated}" - ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      // Handle EventTarget (for window, document, etc.)
      else if (evaluated && typeof evaluated === 'object' && 'addEventListener' in evaluated) {
        targets.push(evaluated as EventTarget);
      }
      else {
        throw new Error(
          `Invalid trigger target: expected HTMLElement, window, document, or CSS selector, got ${typeof evaluated}`
        );
      }
    }

    if (targets.length === 0) {
      throw new Error('trigger command: no valid targets found');
    }

    return targets;
  }

  /**
   * Parse event detail from function call arguments
   *
   * Handles object literal syntax in event details:
   *   trigger event(foo: 'bar', count: 42) on #target
   *                 ^^^^^^^^^^^^^^^^^^^^^^^^
   *                 Parse as object literal
   *
   * @param args - Function call arguments from AST
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Parsed detail object
   */
  private async parseEventDetail(
    args: ASTNode[],
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any> {
    if (!args || args.length === 0) {
      return undefined;
    }

    // If single argument is an object literal, use it directly
    if (args.length === 1) {
      const evaluated = await evaluator.evaluate(args[0], context);
      return evaluated;
    }

    // Multiple arguments: treat as object properties
    const detail: Record<string, any> = {};

    for (const arg of args) {
      const evaluated = await evaluator.evaluate(arg, context);

      // If it's an object, merge it
      if (typeof evaluated === 'object' && evaluated !== null && !Array.isArray(evaluated)) {
        Object.assign(detail, evaluated);
      }
      // If it's a key:value string, parse it
      else if (typeof evaluated === 'string' && evaluated.includes(':')) {
        const [key, value] = evaluated.split(':', 2);
        detail[key.trim()] = parseEventValue(value.trim());
      }
    }

    return Object.keys(detail).length > 0 ? detail : undefined;
  }

  /**
   * Parse event options from args
   *
   * Looks for 'with' keyword followed by option keywords:
   * - bubbles
   * - cancelable
   * - composed
   *
   * @param args - All command arguments
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Event options object
   */
  private async parseEventOptions(
    args: ASTNode[],
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<EventOptions> {
    const options: EventOptions = {
      bubbles: true,        // Default to true for custom events
      cancelable: true,     // Default to true for custom events
      composed: false,      // Default to false
    };

    // Find 'with' keyword
    let withKeywordIndex = -1;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const argType = (arg as any).type;
      const argValue = (argType === 'literal' ? (arg as any).value : (arg as any).name) as string;

      if ((argType === 'literal' || argType === 'identifier' || argType === 'keyword') &&
          argValue === 'with') {
        withKeywordIndex = i;
        break;
      }
    }

    if (withKeywordIndex === -1) {
      return options;
    }

    // Parse option keywords after 'with'
    const optionArgs = args.slice(withKeywordIndex + 1);

    for (const arg of optionArgs) {
      const evaluated = await evaluator.evaluate(arg, context);

      if (typeof evaluated === 'string') {
        const normalized = evaluated.toLowerCase();

        if (normalized === 'bubbles') {
          options.bubbles = true;
        } else if (normalized === 'nobubbles' || normalized === 'no bubbles') {
          options.bubbles = false;
        } else if (normalized === 'cancelable') {
          options.cancelable = true;
        } else if (normalized === 'nocancelable' || normalized === 'no cancelable') {
          options.cancelable = false;
        } else if (normalized === 'composed') {
          options.composed = true;
        }
      }
    }

    return options;
  }
}

// ========== Factory Function ==========

/**
 * Factory function for creating TriggerCommand instances
 * Maintains compatibility with existing command registration patterns
 *
 * @returns New TriggerCommand instance
 */
export function createTriggerCommand(): TriggerCommand {
  return new TriggerCommand();
}

// Default export for convenience
export default TriggerCommand;
