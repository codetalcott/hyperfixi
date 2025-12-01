/**
 * SendCommand - Standalone V2 Implementation
 *
 * Sends custom events to target elements with optional event details
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Simple event dispatch (send myEvent to #target)
 * - Custom events with details (send event(foo: 'bar', count: 42) to #target)
 * - Standard DOM events (send click to #button)
 * - Event options (bubbles, cancelable, composed)
 * - Multiple target elements
 * - Window/document targets
 * - Trigger syntax alternative (trigger event on target)
 *
 * Syntax:
 *   send <event> to <target>                          # Simple event
 *   send <event>(<detail>) to <target>                # Event with details
 *   send <event> to <target> with bubbles             # With options
 *   send <event> to <target> with cancelable          # Non-cancelable
 *   send <event> to <target> with composed            # Composed event
 *   trigger <event> on <target>                       # Alternative syntax
 *
 * @example
 *   send customEvent to me
 *   send dataEvent(user: "Alice", id: 42) to #target
 *   send click to #button
 *   send globalEvent to window
 *   trigger loaded on document
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';

/**
 * Event options for custom events
 */
export interface EventOptions {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

/**
 * Typed input for SendCommand
 * Represents parsed arguments ready for execution
 */
export interface SendCommandInput {
  eventName: string;           // Event to send
  detail?: any;                // Event detail data (optional)
  targets: EventTarget[];      // Where to dispatch (HTMLElement, Window, Document)
  options: EventOptions;       // Event options (bubbles, cancelable, composed)
}

/**
 * SendCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 724 lines (with validation, type safety, enhanced events)
 * V2 Size: ~400 lines (45% reduction, all features preserved)
 */
export class SendCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'send';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Send custom events to elements with optional data',
    syntax: [
      'send <event> to <target>',
      'send <event>(<detail>) to <target>',
      'send <event> to <target> with <options>',
      'trigger <event> on <target>',
    ],
    examples: [
      'send customEvent to me',
      'send click to #button',
      'send dataEvent(foo: "bar", count: 42) to #target',
      'send myEvent to window',
      'send event to #target with bubbles',
      'trigger loaded on document',
    ],
    category: 'events',
    sideEffects: ['event-dispatch'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Handles complex patterns:
   * - "send <event> to <target>" - simple event dispatch
   * - "send <event>(<detail>) to <target>" - event with details
   * - "send <event> to <target> with <options>" - event with options
   * - "trigger <event> on <target>" - alternative syntax
   *
   * Parser output structure (from parseTriggerCommand):
   * - args[0]: event name (identifier or functionCall for event(detail))
   * - args[1]: 'on' or 'to' keyword
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
  ): Promise<SendCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('send command requires an event name');
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
    } else if (firstType === 'identifier') {
      // For identifier nodes, extract the name directly (don't evaluate as variable)
      // This handles cases like: send myEvent, send reset, send customEvent
      eventName = (firstArg as any).name;
    } else if (firstType === 'literal' || firstType === 'string') {
      // For string literals, get the value directly
      eventName = (firstArg as any).value;
    } else {
      // For other node types, try to evaluate
      eventName = await evaluator.evaluate(firstArg, context);
      if (typeof eventName !== 'string') {
        throw new Error(`send command: event name must be a string, got ${typeof eventName}`);
      }
    }

    // Step 2: Find target keyword ('to' or 'on')
    let targetKeywordIndex = -1;
    let targetKeyword: string | null = null;

    for (let i = 1; i < raw.args.length; i++) {
      const arg = raw.args[i];
      const argType = nodeType(arg);
      const argValue = (argType === 'literal' ? (arg as any).value : (arg as any).name) as string;

      if ((argType === 'literal' || argType === 'identifier' || argType === 'keyword') &&
          (argValue === 'to' || argValue === 'on')) {
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
        throw new Error('send command: no target specified and context.me is null');
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
   * Execute the send command
   *
   * Creates and dispatches custom events to target elements.
   * Handles event detail and options.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns void (nothing)
   */
  async execute(
    input: SendCommandInput,
    context: TypedExecutionContext
  ): Promise<void> {
    const { eventName, detail, targets, options } = input;

    // Create custom event
    const event = this.createCustomEvent(eventName, detail, options);

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
      throw new Error('send command: no target specified');
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
          `Invalid send target: expected HTMLElement, window, document, or CSS selector, got ${typeof evaluated}`
        );
      }
    }

    if (targets.length === 0) {
      throw new Error('send command: no valid targets found');
    }

    return targets;
  }

  /**
   * Parse event detail from function call arguments
   *
   * Handles object literal syntax in event details:
   *   send event(foo: 'bar', count: 42) to #target
   *                ^^^^^^^^^^^^^^^^^^^^^^^^
   *                Parse as object literal
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
        detail[key.trim()] = this.parseValue(value.trim());
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

  /**
   * Create custom event with detail and options
   *
   * Inline version of event-utils.createCustomEvent
   *
   * @param eventName - Event name
   * @param detail - Event detail data
   * @param options - Event options
   * @returns CustomEvent instance
   */
  private createCustomEvent(
    eventName: string,
    detail: any,
    options: EventOptions
  ): CustomEvent {
    return new CustomEvent(eventName, {
      detail: detail !== undefined ? detail : {},
      bubbles: options.bubbles !== undefined ? options.bubbles : true,
      cancelable: options.cancelable !== undefined ? options.cancelable : true,
      composed: options.composed !== undefined ? options.composed : false,
    });
  }

  /**
   * Parse string value to appropriate type
   *
   * Converts string literals to numbers, booleans, null, etc.
   *
   * @param value - String value to parse
   * @returns Parsed value
   */
  private parseValue(value: string): any {
    const trimmed = value.trim();

    // Try to parse as number
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }
    if (/^\d*\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // Try to parse as boolean
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // Try to parse as null/undefined
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;

    // Remove quotes if present
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    // Return as string
    return trimmed;
  }
}

// ========== Factory Function ==========

/**
 * Factory function for creating SendCommand instances
 * Maintains compatibility with existing command registration patterns
 *
 * @returns New SendCommand instance
 */
export function createSendCommand(): SendCommand {
  return new SendCommand();
}

// Default export for convenience
export default SendCommand;
