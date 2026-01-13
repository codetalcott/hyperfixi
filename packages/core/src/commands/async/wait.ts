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
  command,
  meta,
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
@meta({
  description: 'Wait for time delay, event, or race condition',
  syntax: ['wait <time>', 'wait for <event>', 'wait for <event> or <condition>'],
  examples: [
    'wait 2s',
    'wait for click',
    'wait for click or 1s',
    'wait for mousemove(clientX, clientY)',
  ],
  sideEffects: ['time', 'event-listening'],
})
@command({ name: 'wait', category: 'async' })
export class WaitCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitCommandInput> {
    if (!raw.args?.length) throw new Error('wait command requires an argument');

    if (raw.modifiers.or) return this.parseRaceCondition(raw, evaluator, context);
    if (raw.modifiers.for)
      return this.parseEventWait(raw.modifiers.for, raw.modifiers.from, evaluator, context);

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

  private async parseEventWait(
    arg: ASTNode,
    fromMod: ASTNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitEventInput> {
    const value = await evaluator.evaluate(arg, context);
    if (typeof value !== 'string') throw new Error('wait for: event name must be a string');

    const match = value.match(/^(\w+)\(([^)]+)\)$/);
    const eventName = match ? match[1] : value;
    const destructure = match ? match[2].split(',').map(s => s.trim()) : undefined;

    let target: EventTarget | undefined;
    if (fromMod) {
      const t = await evaluator.evaluate(fromMod, context);
      if (t && typeof t === 'object' && 'addEventListener' in t) target = t as EventTarget;
      else throw new Error('wait for from: target must be an EventTarget');
    } else {
      target = context.me ?? undefined;
    }

    return { type: 'event', eventName, target, destructure };
  }

  private async parseEventArrayWait(
    elements: ASTNode[],
    targetArg: ASTNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitEventInput | WaitRaceInput> {
    const events: { name: string; params: string[] }[] = [];
    for (const el of elements) {
      const obj = el as any;
      if (obj.type === 'objectLiteral' && obj.properties) {
        let name = '';
        let params: string[] = [];
        for (const p of obj.properties) {
          const k = p.key?.name || p.key?.value;
          if (k === 'name' && p.value) name = p.value.value || '';
          else if (k === 'args' && p.value?.elements)
            params = p.value.elements.map((e: any) => e.value || e.name || '');
        }
        if (name) events.push({ name, params });
      }
    }

    let target: EventTarget | undefined;
    if (targetArg) {
      const t = await evaluator.evaluate(targetArg, context);
      if (t && typeof t === 'object' && 'addEventListener' in t) target = t as EventTarget;
    }
    if (!target) target = context.me ?? undefined;

    if (events.length === 1) {
      return {
        type: 'event',
        eventName: events[0].name,
        target,
        destructure: events[0].params.length > 0 ? events[0].params : undefined,
      };
    }

    return {
      type: 'race',
      conditions: events.map(e => ({
        type: 'event' as const,
        eventName: e.name,
        target,
        destructure: e.params.length > 0 ? e.params : undefined,
      })),
    };
  }

  private async parseRaceCondition(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitRaceInput> {
    const conditions: (WaitTimeInput | WaitEventInput)[] = [];

    if (raw.modifiers.for) {
      conditions.push(
        await this.parseEventWait(raw.modifiers.for, raw.modifiers.from, evaluator, context)
      );
    } else if (raw.args[0]) {
      conditions.push(await this.parseTimeWait(raw.args[0], evaluator, context));
    }

    const orValue = await evaluator.evaluate(raw.modifiers.or, context);
    const orValues = Array.isArray(orValue) ? orValue : [orValue];

    for (const v of orValues) {
      try {
        conditions.push({ type: 'time', milliseconds: parseDurationStrict(v) });
      } catch {
        if (typeof v === 'string') {
          const match = v.match(/^(\w+)\(([^)]+)\)$/);
          conditions.push(
            match
              ? {
                  type: 'event',
                  eventName: match[1],
                  target: context.me ?? undefined,
                  destructure: match[2].split(',').map(s => s.trim()),
                }
              : { type: 'event', eventName: v, target: context.me ?? undefined }
          );
        }
      }
    }

    if (conditions.length < 2) throw new Error('wait: race requires at least 2 conditions');
    return { type: 'race', conditions };
  }

  private async executeRace(
    conditions: (WaitTimeInput | WaitEventInput)[],
    context: TypedExecutionContext
  ): Promise<{ result: Event | number; winningCondition: WaitTimeInput | WaitEventInput | null }> {
    const promises = conditions.map(c => {
      if (c.type === 'time') {
        return waitForTime(c.milliseconds).then(() => ({
          result: c.milliseconds as number,
          winningCondition: c,
        }));
      }
      const target = c.target ?? context.me ?? document;
      return waitForEvent(target, c.eventName).then(res => ({
        result: res.event as Event,
        winningCondition: c,
      }));
    });
    return Promise.race(promises);
  }
}

export const createWaitCommand = createFactory(WaitCommand);
export default WaitCommand;
