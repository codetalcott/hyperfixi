/**
 * EventDispatchCommand - Consolidated Trigger/Send Implementation
 *
 * Dispatches events on target elements using either "trigger X on Y" or "send X to Y" syntax.
 * Uses Stage 3 decorators with alias support.
 *
 * Syntax:
 *   trigger <event> on <target>
 *   trigger <event>(<detail>) on <target>
 *   send <event> to <target>
 *   send <event>(<detail>) to <target>
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { createCustomEvent, parseEventValue } from '../helpers/event-helpers';
import type { EventOptions } from '../helpers/event-helpers';
import { command, meta, createFactory, type DecoratedCommand, type CommandMetadata } from '../decorators';

export type { EventOptions } from '../helpers/event-helpers';

/**
 * Event dispatch mode
 */
export type EventDispatchMode = 'trigger' | 'send';

/**
 * Typed input for EventDispatchCommand
 */
export interface EventDispatchInput {
  eventName: string;
  detail?: any;
  targets: EventTarget[];
  options: EventOptions;
  mode: EventDispatchMode;
}

// Backwards compatibility type aliases
export type TriggerCommandInput = Omit<EventDispatchInput, 'mode'>;
export type SendCommandInput = Omit<EventDispatchInput, 'mode'>;

/**
 * EventDispatchCommand - Unified trigger/send implementation
 *
 * Consolidates TriggerCommand and SendCommand into single implementation.
 * Registered under both 'trigger' and 'send' names via aliases.
 */
@meta({
  description: 'Dispatch events on elements',
  syntax: [
    'trigger <event> on <target>',
    'trigger <event>(<detail>) on <target>',
    'send <event> to <target>',
    'send <event>(<detail>) to <target>',
  ],
  examples: [
    'trigger click on #button',
    'trigger customEvent on me',
    'send dataEvent to #target',
    'send myEvent(count: 42) to me',
  ],
  sideEffects: ['event-dispatch'],
  aliases: ['send'],
})
@command({ name: 'trigger', category: 'event' })
export class EventDispatchCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode>; commandName?: string },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<EventDispatchInput> {
    // Detect mode from command name
    const mode: EventDispatchMode = raw.commandName?.toLowerCase() === 'send' ? 'send' : 'trigger';
    const cmdName = mode; // for error messages

    if (!raw.args?.length) throw new Error(`${cmdName} command requires an event name`);

    const nodeType = (n: ASTNode) => (n as any)?.type || 'unknown';
    const firstArg = raw.args[0];
    let eventName: string;
    let detail: any;

    if (nodeType(firstArg) === 'functionCall') {
      eventName = (firstArg as any).name;
      if ((firstArg as any).args?.length) {
        detail = await this.parseEventDetail((firstArg as any).args, evaluator, context);
      }
    } else if (nodeType(firstArg) === 'identifier' || nodeType(firstArg) === 'keyword') {
      eventName = (firstArg as any).name;
    } else {
      const eval1 = await evaluator.evaluate(firstArg, context);
      eventName = typeof eval1 === 'string' ? eval1 : String(eval1);
    }

    // Check for semantic parsing format first (modifiers.on or modifiers.to)
    let targets: EventTarget[];
    const targetModifier = raw.modifiers?.on || raw.modifiers?.to;

    if (targetModifier) {
      // Semantic parsing format: target is in modifiers
      targets = await this.resolveTargets([targetModifier as ASTNode], evaluator, context, cmdName);
    } else {
      // Traditional format: find target keyword in args
      const targetKeywordIndex = raw.args.findIndex((a, i) => {
        if (i === 0) return false;
        const val = (a as any).name || (a as any).value;
        return val === 'on' || val === 'to';
      });

      if (targetKeywordIndex === -1 || targetKeywordIndex >= raw.args.length - 1) {
        if (!context.me) throw new Error(`${cmdName}: no target specified and context.me is null`);
        targets = [context.me as EventTarget];
      } else {
        const afterTarget = raw.args.slice(targetKeywordIndex + 1);
        const withIdx = afterTarget.findIndex(a => ((a as any).name || (a as any).value) === 'with');
        const targetArgs = withIdx === -1 ? afterTarget : afterTarget.slice(0, withIdx);
        targets = await this.resolveTargets(targetArgs, evaluator, context, cmdName);
      }
    }

    const options = await this.parseEventOptions(raw.args, evaluator, context);
    return { eventName, detail, targets, options, mode };
  }

  async execute(input: EventDispatchInput, context: TypedExecutionContext): Promise<void> {
    const event = createCustomEvent(input.eventName, input.detail, input.options);
    for (const target of input.targets) target.dispatchEvent(event);
    (context as any).it = event;
  }

  private async resolveTargets(
    args: ASTNode[],
    evaluator: ExpressionEvaluator,
    context: ExecutionContext,
    cmdName: string
  ): Promise<EventTarget[]> {
    const targets: EventTarget[] = [];
    for (const arg of args) {
      const val = await evaluator.evaluate(arg, context);
      if (val === 'window' || val === window) { targets.push(window); continue; }
      if (val === 'document' || val === document) { targets.push(document); continue; }
      if (isHTMLElement(val)) { targets.push(val as HTMLElement); continue; }
      if (val instanceof NodeList) { targets.push(...Array.from(val).filter(isHTMLElement)); continue; }
      if (Array.isArray(val)) { targets.push(...val.filter(isHTMLElement)); continue; }
      if (typeof val === 'string') {
        const els = document.querySelectorAll(val);
        if (els.length === 0) throw new Error(`No elements found: "${val}"`);
        targets.push(...Array.from(els).filter(isHTMLElement));
        continue;
      }
      if (val && typeof val === 'object' && 'addEventListener' in val) { targets.push(val as EventTarget); continue; }
      throw new Error(`Invalid target: ${typeof val}`);
    }
    if (!targets.length) throw new Error(`${cmdName}: no valid targets`);
    return targets;
  }

  private async parseEventDetail(args: ASTNode[], evaluator: ExpressionEvaluator, context: ExecutionContext): Promise<any> {
    if (!args?.length) return undefined;
    if (args.length === 1) return await evaluator.evaluate(args[0], context);
    const detail: Record<string, any> = {};
    for (const arg of args) {
      const ev = await evaluator.evaluate(arg, context);
      if (typeof ev === 'object' && ev !== null && !Array.isArray(ev)) Object.assign(detail, ev);
      else if (typeof ev === 'string' && ev.includes(':')) {
        const [k, v] = ev.split(':', 2);
        detail[k.trim()] = parseEventValue(v.trim());
      }
    }
    return Object.keys(detail).length ? detail : undefined;
  }

  private async parseEventOptions(args: ASTNode[], evaluator: ExpressionEvaluator, context: ExecutionContext): Promise<EventOptions> {
    const options: EventOptions = { bubbles: true, cancelable: true, composed: false };
    const withIdx = args.findIndex(a => ((a as any).name || (a as any).value) === 'with');
    if (withIdx === -1) return options;
    for (const arg of args.slice(withIdx + 1)) {
      const ev = await evaluator.evaluate(arg, context);
      if (typeof ev === 'string') {
        const n = ev.toLowerCase();
        if (n === 'bubbles') options.bubbles = true;
        else if (n === 'nobubbles') options.bubbles = false;
        else if (n === 'cancelable') options.cancelable = true;
        else if (n === 'nocancelable') options.cancelable = false;
        else if (n === 'composed') options.composed = true;
      }
    }
    return options;
  }
}

// Backwards compatibility exports
export { EventDispatchCommand as TriggerCommand };
export { EventDispatchCommand as SendCommand };

// Factory functions
export const createEventDispatchCommand = createFactory(EventDispatchCommand);
export const createTriggerCommand = createFactory(EventDispatchCommand);
export const createSendCommand = createFactory(EventDispatchCommand);

export default EventDispatchCommand;
