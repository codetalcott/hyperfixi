/**
 * SendCommand - Decorated Implementation
 *
 * Sends custom events to target elements with optional event details.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   send <event> to <target>
 *   send <event>(<detail>) to <target>
 *   send <event> to <target> with bubbles
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { createCustomEvent, parseEventValue } from '../helpers/event-helpers';
import type { EventOptions } from '../helpers/event-helpers';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

export type { EventOptions } from '../helpers/event-helpers';

/**
 * Typed input for SendCommand
 */
export interface SendCommandInput {
  eventName: string;
  detail?: any;
  targets: EventTarget[];
  options: EventOptions;
}

/**
 * SendCommand - Dispatch events to elements
 *
 * Before: 476 lines
 * After: ~200 lines (58% reduction)
 */
@meta({
  description: 'Send custom events to elements with optional data',
  syntax: ['send <event> to <target>', 'send <event>(<detail>) to <target>'],
  examples: ['send customEvent to me', 'send click to #button', 'send dataEvent(foo: "bar") to #target'],
  sideEffects: ['event-dispatch'],
})
@command({ name: 'send', category: 'event' })
export class SendCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SendCommandInput> {
    if (!raw.args?.length) throw new Error('send command requires an event name');

    const nodeType = (n: ASTNode) => (n as any)?.type || 'unknown';
    const firstArg = raw.args[0];
    let eventName: string;
    let detail: any;

    if (nodeType(firstArg) === 'functionCall') {
      eventName = (firstArg as any).name;
      if ((firstArg as any).args?.length) {
        detail = await this.parseEventDetail((firstArg as any).args, evaluator, context);
      }
    } else if (nodeType(firstArg) === 'identifier') {
      eventName = (firstArg as any).name;
    } else {
      const eval1 = await evaluator.evaluate(firstArg, context);
      eventName = typeof eval1 === 'string' ? eval1 : String(eval1);
    }

    const targetKeywordIndex = raw.args.findIndex((a, i) => {
      if (i === 0) return false;
      const val = (a as any).name || (a as any).value;
      return val === 'to' || val === 'on';
    });

    let targets: EventTarget[];
    if (targetKeywordIndex === -1 || targetKeywordIndex >= raw.args.length - 1) {
      if (!context.me) throw new Error('send: no target specified and context.me is null');
      targets = [context.me as EventTarget];
    } else {
      const afterTarget = raw.args.slice(targetKeywordIndex + 1);
      const withIdx = afterTarget.findIndex(a => ((a as any).name || (a as any).value) === 'with');
      const targetArgs = withIdx === -1 ? afterTarget : afterTarget.slice(0, withIdx);
      targets = await this.resolveTargets(targetArgs, evaluator, context);
    }

    const options = await this.parseEventOptions(raw.args, evaluator, context);
    return { eventName, detail, targets, options };
  }

  async execute(input: SendCommandInput, context: TypedExecutionContext): Promise<void> {
    const event = createCustomEvent(input.eventName, input.detail, input.options);
    for (const target of input.targets) target.dispatchEvent(event);
    (context as any).it = event;
  }

  private async resolveTargets(args: ASTNode[], evaluator: ExpressionEvaluator, context: ExecutionContext): Promise<EventTarget[]> {
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
    if (!targets.length) throw new Error('send: no valid targets');
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

export const createSendCommand = createFactory(SendCommand);
export default SendCommand;
