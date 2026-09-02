/**
 * WaitCommand - Decorated Implementation
 *
 * Time delays and event waiting functionality.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   wait 2s / wait 500ms
 *   wait for click / wait for load
 *   wait for click or 1s
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { parseDurationStrict } from '../helpers/duration-parsing';
import { waitForTime, waitForEvent } from '../helpers/event-waiting';
import {
  commandMeta,
  command,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

export interface WaitTimeInput {
  type: 'time';
  milliseconds: number;
}
export interface WaitEventInput {
  type: 'event';
  eventName: string;
  target?: EventTarget;
  destructure?: string[];
}
export interface WaitRaceInput {
  type: 'race';
  conditions: (WaitTimeInput | WaitEventInput)[];
}
export type WaitCommandInput = WaitTimeInput | WaitEventInput | WaitRaceInput;

export interface WaitCommandOutput {
  type: 'time' | 'event';
  result: number | Event;
  duration: number;
}

/**
 * WaitCommand - Time delays and event waiting
 *
 * Before: 650 lines
 * After: ~280 lines (57% reduction)
 */
@command({ name: 'wait' })
export class WaitCommand implements DecoratedCommand {
  static readonly metadata = commandMeta({
    description: 'Wait for time delay, event, or race condition',
    syntax: ['wait <time>', 'wait for <event>', 'wait for <event> or <condition>'],
    examples: [
      'wait 2s',
      'wait for click',
      'wait for click or 1s',
      'wait for mousemove(clientX, clientY)',
    ],
    sideEffects: ['time', 'event-listening'],
    category: 'async',
    compatibility: 'standard',
  });

  get metadata() {
    return WaitCommand.metadata;
  }

  declare readonly name: string;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitCommandInput> {
    if (!raw.args?.length) throw new Error('wait command requires an argument');

    const firstArg = raw.args[0] as any;
    if (firstArg.type === 'arrayLiteral' && firstArg.elements) {
      return this.parseEventArrayWait(firstArg.elements, raw.args[1], evaluator, context);
    }

    return this.parseTimeWait(raw.args[0], evaluator, context);
  }

  async execute(
    input: WaitCommandInput,
    context: TypedExecutionContext
  ): Promise<WaitCommandOutput> {
    const startTime = Date.now();

    if (input.type === 'time') {
      await waitForTime(input.milliseconds);
      return { type: 'time', result: input.milliseconds, duration: Date.now() - startTime };
    }

    if (input.type === 'event') {
      const target = input.target ?? context.me ?? document;
      const result = await waitForEvent(target, input.eventName);
      const event = result.event!;
      Object.assign(context, { it: event });
      if (input.destructure) {
        for (const prop of input.destructure) {
          if (prop in event) context.locals.set(prop, (event as any)[prop]);
        }
      }
      return { type: 'event', result: event, duration: Date.now() - startTime };
    }

    // Race
    const { result, winningCondition } = await this.executeRace(input.conditions, context);
    Object.assign(context, { it: result });
    if (
      result instanceof Event &&
      winningCondition?.type === 'event' &&
      winningCondition.destructure
    ) {
      for (const prop of winningCondition.destructure) {
        if (prop in result) context.locals.set(prop, (result as any)[prop]);
      }
    }
    return {
      type: result instanceof Event ? 'event' : 'time',
      result,
      duration: Date.now() - startTime,
    };
  }

  private async parseTimeWait(
    arg: ASTNode,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitTimeInput> {
    const value = await evaluator.evaluate(arg, context);
    return { type: 'time', milliseconds: parseDurationStrict(value) };
  }

  /**
   * The `wait for …` alternative list.
   *
   * `parseWaitCommand` emits one object literal per or-separated alternative:
   * `{ name, args }` for an event, `{ duration }` for a timeout. A mixed list
   * is the `wait for click or 1s` race — the DOM effect is "whichever happens
   * first", which `executeRace` already implements; before this it never
   * reached here, because the parser rejected the duration token.
   */
  private async parseEventArrayWait(
    elements: ASTNode[],
    targetArg: ASTNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitTimeInput | WaitEventInput | WaitRaceInput> {
    let target: EventTarget | undefined;
    if (targetArg) {
      const t = await evaluator.evaluate(targetArg, context);
      if (t && typeof t === 'object' && 'addEventListener' in t) target = t as EventTarget;
      else throw new Error('wait for from: target must be an EventTarget');
    }
    if (!target) target = context.me ?? undefined;

    const conditions: (WaitTimeInput | WaitEventInput)[] = [];
    for (const el of elements) {
      const obj = el as any;
      if (obj.type !== 'objectLiteral' || !obj.properties) continue;

      let name = '';
      let params: string[] = [];
      let durationNode: ASTNode | undefined;
      for (const p of obj.properties) {
        const k = p.key?.name || p.key?.value;
        if (k === 'name' && p.value) {
          if (typeof p.value.value !== 'string') {
            throw new Error('wait for: event name must be a string');
          }
          name = p.value.value;
        } else if (k === 'args' && p.value?.elements)
          params = p.value.elements.map((e: any) => e.value || e.name || '');
        else if (k === 'duration' && p.value) durationNode = p.value as ASTNode;
      }

      if (durationNode) {
        const value = await evaluator.evaluate(durationNode, context);
        conditions.push({ type: 'time', milliseconds: parseDurationStrict(value) });
      } else if (name) {
        conditions.push({
          type: 'event',
          eventName: name,
          target,
          destructure: params.length > 0 ? params : undefined,
        });
      }
    }

    // A single alternative is not a race — `wait for click` stays an event wait
    // and `wait for 1s` (which upstream also accepts) becomes a plain timeout.
    if (conditions.length === 1) return conditions[0];

    return { type: 'race', conditions };
  }

  private async executeRace(
    conditions: (WaitTimeInput | WaitEventInput)[],
    context: TypedExecutionContext
  ): Promise<{ result: Event | number; winningCondition: WaitTimeInput | WaitEventInput | null }> {
    // AbortController coordinates listener cleanup: when the race resolves,
    // we abort to remove every event listener registered by losing conditions.
    // Without this, a `wait for click or 50ms` where the timer wins leaks the
    // click listener until the event eventually fires (or never).
    const abortController = new AbortController();
    const signal = abortController.signal;

    const promises = conditions.map(c => {
      if (c.type === 'time') {
        return waitForTime(c.milliseconds).then(() => ({
          result: c.milliseconds as number,
          winningCondition: c,
        }));
      }
      const target = c.target ?? context.me ?? document;
      return waitForEvent(target, c.eventName, undefined, signal).then(res => ({
        result: res.event as Event,
        winningCondition: c,
      }));
    });

    try {
      return await Promise.race(promises);
    } finally {
      abortController.abort();
    }
  }
}

export const createWaitCommand = createFactory(WaitCommand);
export default WaitCommand;
