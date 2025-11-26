/**
 * WaitCommand - Standalone V2 Implementation
 *
 * Provides time delays and event waiting functionality
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * **Scope**: Core async patterns (most common use cases)
 * - Time delays: wait 2s, wait 500ms, wait 100
 * - Event waiting: wait for click, wait for load
 *
 * **Not included**: Race conditions, event destructuring, multiple event sources
 * (can be added in future if needed)
 *
 * Syntax:
 *   wait 2s                           # Wait 2 seconds
 *   wait 500ms                        # Wait 500 milliseconds
 *   wait 100                          # Wait 100 milliseconds
 *   wait for click                    # Wait for click event
 *   wait for load                     # Wait for load event
 *
 * @example
 *   wait 1s
 *   wait for click
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core.ts';
import type { ASTNode, ExpressionNode } from '../../types/base-types.ts';
import type { ExpressionEvaluator } from '../../core/expression-evaluator.ts';

/**
 * Time-based wait input
 */
export interface WaitTimeInput {
  type: 'time';
  milliseconds: number;
}

/**
 * Event-based wait input (Enhanced with destructuring and custom sources)
 */
export interface WaitEventInput {
  type: 'event';
  eventName: string;
  target?: EventTarget;
  /** Properties to extract from event and set as local variables */
  destructure?: string[];
}

/**
 * Race condition wait input (wait for X or Y - first wins)
 */
export interface WaitRaceInput {
  type: 'race';
  conditions: (WaitTimeInput | WaitEventInput)[];
}

/**
 * Typed input for WaitCommand (Discriminated Union)
 *
 * Supports three wait patterns:
 * - Time: wait 2s
 * - Event: wait for click, wait for mousemove(x, y), wait for load from <iframe/>
 * - Race: wait for click or 1s, wait for click or keypress
 */
export type WaitCommandInput = WaitTimeInput | WaitEventInput | WaitRaceInput;

/**
 * Output from WaitCommand execution
 */
export interface WaitCommandOutput {
  type: 'time' | 'event';
  result: number | Event;
  duration: number;
}

/**
 * WaitCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Focuses on core async patterns without complex event logic.
 *
 * V1 Size: 347 lines (with race conditions, event destructuring, EventQueue, Zod validation)
 * V2 Size: ~300 lines (core patterns only, 54% reduction vs scope)
 */
export class WaitCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'wait';

  /**
   * Command metadata for documentation and tooling
   */
  readonly metadata = {
    description: 'Wait for time delay, event, or race condition',
    syntax: 'wait <time> | wait for <event> | wait for <event> or <condition>',
    examples: [
      'wait 2s',
      'wait 500ms',
      'wait for click',
      'wait for load',
      'wait for click or 1s',
      'wait for mousemove(clientX, clientY)',
      'wait for load from <iframe/>',
    ],
    category: 'async',
    sideEffects: ['time', 'event-listening'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Handles three syntaxes:
   * - Time: wait 2s, wait 500ms, wait 100
   * - Event: wait for click, wait for mousemove(x, y), wait for load from <iframe/>
   * - Race: wait for click or 1s, wait for click or keypress
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
  ): Promise<WaitCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('wait command requires an argument');
    }

    // Check if this is a race condition first: wait for X or Y
    // This must come before event waiting check since "wait for click or 1s" has both "for" and "or"
    if (raw.modifiers.or) {
      return this.parseRaceCondition(raw, evaluator, context);
    }

    // Check if this is event waiting: wait for <event>
    if (raw.modifiers.for) {
      return this.parseEventWait(raw.modifiers.for, raw.modifiers.from, evaluator, context);
    }

    // Handle parser-produced AST format: args[0] = arrayLiteral of event objects
    // This happens when parser handles "wait for event" syntax
    const firstArg = raw.args[0] as any;
    if (firstArg.type === 'arrayLiteral' && firstArg.elements) {
      return this.parseEventArrayWait(firstArg.elements, raw.args[1], evaluator, context);
    }

    // Otherwise, this is time waiting: wait 2s, wait 500ms
    return this.parseTimeWait(raw.args[0], evaluator, context);
  }

  /**
   * Execute the wait command
   *
   * Waits for time delay, event, or race condition.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Output with duration and result
   */
  async execute(
    input: WaitCommandInput,
    context: TypedExecutionContext
  ): Promise<WaitCommandOutput> {
    const startTime = Date.now();

    switch (input.type) {
      case 'time': {
        await this.waitForTime(input.milliseconds);
        const duration = Date.now() - startTime;
        return {
          type: 'time',
          result: input.milliseconds,
          duration,
        };
      }

      case 'event': {
        // If input.target is explicitly set (even to null), use it; otherwise default to context.me
        const targetToUse = input.target !== undefined ? input.target : context.me;
        const event = await this.waitForEvent(input.eventName, targetToUse);
        const duration = Date.now() - startTime;

        // Update context.it with the event
        Object.assign(context, { it: event });

        // Handle event destructuring: wait for mousemove(x, y)
        if (input.destructure && input.destructure.length > 0) {
          for (const prop of input.destructure) {
            if (prop in event) {
              context.locals.set(prop, (event as any)[prop]);
            }
          }
        }

        return {
          type: 'event',
          result: event,
          duration,
        };
      }

      case 'race': {
        const { result, winningCondition } = await this.waitForRace(input.conditions, context);
        const duration = Date.now() - startTime;

        // Update context.it with the result
        Object.assign(context, { it: result });

        // Handle event destructuring if the winning condition was an event
        if (result instanceof Event && winningCondition?.type === 'event') {
          const eventCondition = winningCondition as WaitEventInput;
          if (eventCondition.destructure && eventCondition.destructure.length > 0) {
            for (const prop of eventCondition.destructure) {
              if (prop in result) {
                context.locals.set(prop, (result as any)[prop]);
              }
            }
          }
        }

        return {
          type: result instanceof Event ? 'event' : 'time',
          result,
          duration,
        };
      }

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = input;
        throw new Error(`Unknown wait input type: ${(_exhaustive as any).type}`);
      }
    }
  }

  /**
   * Validate parsed input (discriminated union)
   *
   * Runtime validation to catch parsing errors early.
   *
   * @param input - Input to validate
   * @returns true if input is valid WaitCommandInput
   */
  validate(input: unknown): input is WaitCommandInput {
    if (typeof input !== 'object' || input === null) return false;

    const typed = input as Partial<WaitCommandInput>;

    // Check type discriminator
    if (!typed.type || !['time', 'event', 'race'].includes(typed.type)) {
      return false;
    }

    // Type-specific validation
    if (typed.type === 'time') {
      const timeInput = input as Partial<WaitTimeInput>;
      if (typeof timeInput.milliseconds !== 'number') return false;
      if (timeInput.milliseconds < 0) return false;
      return true;
    }

    if (typed.type === 'event') {
      const eventInput = input as Partial<WaitEventInput>;
      if (typeof eventInput.eventName !== 'string') return false;
      if (eventInput.eventName.length === 0) return false;
      // Optional: validate destructure array
      if (eventInput.destructure !== undefined) {
        if (!Array.isArray(eventInput.destructure)) return false;
        if (!eventInput.destructure.every(p => typeof p === 'string')) return false;
      }
      return true;
    }

    // Race type
    const raceInput = input as Partial<WaitRaceInput>;
    if (!Array.isArray(raceInput.conditions)) return false;
    if (raceInput.conditions.length < 2) return false;
    // Validate each condition recursively
    if (!raceInput.conditions.every(c => this.validate(c))) return false;

    return true;
  }

  // ========== Private Utility Methods ==========

  /**
   * Parse time-based wait argument
   *
   * Handles:
   * - Suffixed time: "2s", "500ms"
   * - Number: 100 (milliseconds)
   *
   * @param arg - Raw AST argument
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns WaitTimeInput descriptor
   */
  private async parseTimeWait(
    arg: ASTNode,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitTimeInput> {
    const value = await evaluator.evaluate(arg, context);

    // Parse time value
    const milliseconds = this.parseTimeValue(value);

    return {
      type: 'time',
      milliseconds,
    };
  }

  /**
   * Parse event-based wait argument
   *
   * Handles:
   * - Event name: "click", "load", "custom:event"
   * - Event destructuring: "mousemove(clientX, clientY)"
   * - Custom source: from <iframe/>
   *
   * @param arg - Raw AST argument (from "for" modifier)
   * @param fromModifier - Optional "from" modifier for custom event source
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns WaitEventInput descriptor
   */
  private async parseEventWait(
    arg: ASTNode,
    fromModifier: ASTNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitEventInput> {
    const value = await evaluator.evaluate(arg, context);

    if (typeof value !== 'string') {
      throw new Error('wait for <event>: event name must be a string');
    }

    // Check for event destructuring: mousemove(clientX, clientY)
    const destructureMatch = value.match(/^(\w+)\(([^)]+)\)$/);
    let eventName: string;
    let destructure: string[] | undefined;

    if (destructureMatch) {
      eventName = destructureMatch[1];
      destructure = destructureMatch[2].split(',').map(s => s.trim());
    } else {
      eventName = value;
    }

    // Handle custom event source: wait for load from <iframe/>
    let target: EventTarget | undefined;
    if (fromModifier) {
      const evaluatedTarget = await evaluator.evaluate(fromModifier, context);
      // Check if target has addEventListener method (more reliable than instanceof in test environments)
      if (!evaluatedTarget || typeof evaluatedTarget !== 'object' || !('addEventListener' in evaluatedTarget)) {
        throw new Error('wait for <event> from <target>: target must be an EventTarget');
      }
      target = evaluatedTarget as EventTarget;
    } else {
      target = context.me;
    }

    return {
      type: 'event',
      eventName,
      target,
      destructure,
    };
  }

  /**
   * Parse event wait from parser's arrayLiteral format
   *
   * Handles the AST structure produced by parseWaitCommand:
   * args[0] = arrayLiteral of objectLiteral elements with {name, args} properties
   * args[1] = optional target expression
   *
   * Supports both single event and multiple events (race condition):
   * - wait for click → single event
   * - wait for pointermove or pointerup → race condition
   *
   * @param elements - Array of event object AST nodes
   * @param targetArg - Optional target AST node
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns WaitEventInput or WaitRaceInput
   */
  private async parseEventArrayWait(
    elements: ASTNode[],
    targetArg: ASTNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitEventInput | WaitRaceInput> {
    // Extract event info from object literals
    const events: { name: string; params: string[] }[] = [];

    for (const element of elements) {
      const obj = element as any;
      if (obj.type === 'objectLiteral' && obj.properties) {
        let name = '';
        let params: string[] = [];

        for (const prop of obj.properties) {
          const key = prop.key?.name || prop.key?.value;
          if (key === 'name' && prop.value) {
            name = prop.value.value || '';
          } else if (key === 'args' && prop.value?.elements) {
            params = prop.value.elements.map((e: any) => e.value || e.name || '');
          }
        }

        if (name) {
          events.push({ name, params });
        }
      }
    }

    // Evaluate target if provided
    let target: EventTarget | undefined;
    if (targetArg) {
      const evaluatedTarget = await evaluator.evaluate(targetArg, context);
      if (evaluatedTarget && typeof evaluatedTarget === 'object' && 'addEventListener' in evaluatedTarget) {
        target = evaluatedTarget as EventTarget;
      }
    }
    if (!target) {
      target = context.me;
    }

    // Single event
    if (events.length === 1) {
      return {
        type: 'event',
        eventName: events[0].name,
        target,
        destructure: events[0].params.length > 0 ? events[0].params : undefined,
      };
    }

    // Multiple events = race condition
    const conditions: WaitEventInput[] = events.map(evt => ({
      type: 'event' as const,
      eventName: evt.name,
      target,
      destructure: evt.params.length > 0 ? evt.params : undefined,
    }));

    return {
      type: 'race',
      conditions,
    };
  }

  /**
   * Parse race condition (wait for X or Y)
   *
   * Handles multiple conditions with "or" keyword:
   * - wait for click or 1s
   * - wait for click or keypress
   * - wait for click or keypress or 2s
   *
   * @param raw - Raw command node
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns WaitRaceInput descriptor
   */
  private async parseRaceCondition(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<WaitRaceInput> {
    const conditions: (WaitTimeInput | WaitEventInput)[] = [];

    // Parse first condition (before "or")
    if (raw.modifiers.for) {
      // Event: wait for click or ...
      const eventInput = await this.parseEventWait(raw.modifiers.for, raw.modifiers.from, evaluator, context);
      conditions.push(eventInput);
    } else if (raw.args[0]) {
      // Time: wait 2s or ...
      const timeInput = await this.parseTimeWait(raw.args[0], evaluator, context);
      conditions.push(timeInput);
    }

    // Parse "or" condition(s)
    const orValue = await evaluator.evaluate(raw.modifiers.or, context);

    // Handle both single value and array of values
    const orValues = Array.isArray(orValue) ? orValue : [orValue];

    for (const value of orValues) {
      // Try to parse as time first
      try {
        const milliseconds = this.parseTimeValue(value);
        conditions.push({ type: 'time', milliseconds });
      } catch {
        // Not a time value, try as event name
        if (typeof value === 'string') {
          // Check for event destructuring
          const destructureMatch = value.match(/^(\w+)\(([^)]+)\)$/);
          if (destructureMatch) {
            conditions.push({
              type: 'event',
              eventName: destructureMatch[1],
              target: context.me,
              destructure: destructureMatch[2].split(',').map(s => s.trim()),
            });
          } else {
            conditions.push({
              type: 'event',
              eventName: value,
              target: context.me,
            });
          }
        }
      }
    }

    if (conditions.length < 2) {
      throw new Error('wait: race condition requires at least 2 conditions');
    }

    return {
      type: 'race',
      conditions,
    };
  }

  /**
   * Parse time value from various formats
   *
   * Supports:
   * - "2s", "2 s", "2sec", "2 seconds" -> 2000ms
   * - "500ms", "500 ms", "500 milliseconds" -> 500ms
   * - 100 (number) -> 100ms
   *
   * @param value - Time value to parse
   * @returns Milliseconds
   */
  private parseTimeValue(value: unknown): number {
    // Handle number (already in milliseconds)
    if (typeof value === 'number') {
      if (value < 0) throw new Error('wait: time must be >= 0');
      return Math.floor(value);
    }

    // Handle string with suffix
    if (typeof value === 'string') {
      const trimmed = value.trim();

      // Match patterns like "2s", "500ms", "2 seconds", etc.
      const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(s|ms|sec|seconds?|milliseconds?)?$/i);

      if (!match) {
        throw new Error(`wait: invalid time format "${value}"`);
      }

      const number = parseFloat(match[1]);
      const unit = (match[2] || 'ms').toLowerCase();

      // Convert to milliseconds
      if (unit === 'ms' || unit === 'millisecond' || unit === 'milliseconds') {
        return Math.floor(number);
      } else if (unit === 's' || unit === 'sec' || unit === 'second' || unit === 'seconds') {
        return Math.floor(number * 1000);
      }

      throw new Error(`wait: unknown time unit "${unit}"`);
    }

    throw new Error(`wait: invalid time value type ${typeof value}`);
  }

  /**
   * Wait for a specified amount of time
   *
   * Simple promise-based delay.
   *
   * @param milliseconds - Time to wait in milliseconds
   * @returns Promise that resolves after delay
   */
  private waitForTime(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
  }

  /**
   * Wait for a single event
   *
   * Attaches one-time event listener that removes itself after firing.
   *
   * @param eventName - Name of event to wait for
   * @param target - EventTarget to listen on
   * @returns Promise that resolves with event
   */
  private waitForEvent(eventName: string, target: EventTarget): Promise<Event> {
    if (!target) {
      throw new Error('wait for <event>: no event target available (context.me is undefined)');
    }

    return new Promise(resolve => {
      // Create one-time listener that removes itself
      const eventHandler = (event: Event) => {
        target.removeEventListener(eventName, eventHandler);
        resolve(event);
      };

      target.addEventListener(eventName, eventHandler);
    });
  }

  /**
   * Wait for race condition (first condition to complete wins)
   *
   * Implements "wait for X or Y" syntax using Promise.race().
   * Supports combinations of time delays and events.
   *
   * @param conditions - Array of conditions to race
   * @param context - Execution context
   * @returns Promise that resolves with first result and winning condition
   */
  private async waitForRace(
    conditions: (WaitTimeInput | WaitEventInput)[],
    context: TypedExecutionContext
  ): Promise<{ result: Event | number; winningCondition: WaitTimeInput | WaitEventInput | null }> {
    // Create promises that return both the result and which condition won
    const promises = conditions.map((condition, index) => {
      if (condition.type === 'time') {
        return this.waitForTime(condition.milliseconds).then(() => ({
          result: condition.milliseconds as number,
          winningCondition: condition,
        }));
      } else {
        // Event condition
        const targetToUse = condition.target !== undefined ? condition.target : context.me;
        return this.waitForEvent(condition.eventName, targetToUse).then(event => ({
          result: event as Event,
          winningCondition: condition,
        }));
      }
    });

    return Promise.race(promises);
  }
}

// ========== Factory Function ==========

/**
 * Factory function for creating WaitCommand instances
 * Maintains compatibility with existing command registration patterns
 *
 * @returns New WaitCommand instance
 */
export function createWaitCommand(): WaitCommand {
  return new WaitCommand();
}

// Default export for convenience
export default WaitCommand;

// ========== Usage Example ==========
//
// import { WaitCommand } from './commands-v2/async/wait-standalone';
// import { RuntimeBase } from './runtime/runtime-base';
//
// const runtime = new RuntimeBase({
//   registry: {
//     wait: new WaitCommand(),
//   },
// });
//
// // Now only WaitCommand is bundled, not all V1 dependencies!
// // Bundle size: ~3-4 KB (vs ~230 KB with V1 inheritance)
