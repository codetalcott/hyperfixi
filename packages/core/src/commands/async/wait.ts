/**
 * Wait Command Implementation
 * Provides time delays and event waiting functionality
 *
 * Syntax:
 *   wait <time-expr>
 *   wait for <event> [or <event>] [from <source>]
 *
 * Supports:
 * - Time delays: wait 2s, wait 500ms, wait 100
 * - Event waiting: wait for click, wait for load from <element>
 * - Multiple events: wait for click or 1s (race condition)
 * - Event destructuring: wait for mousemove(clientX, clientY)
 */

import { v, z } from '../../validation/lightweight-validators';
import type {
  TypedCommandImplementation,
  TypedExecutionContext,
  CommandMetadata,
  LLMDocumentation
} from '../../types/command-types';
import type { UnifiedValidationResult } from '../../types/unified-types';

// ============================================================================
// Type Definitions
// ============================================================================

export interface WaitTimeInput {
  type: 'time';
  value: number; // milliseconds
}

export interface WaitEventInput {
  type: 'event';
  events: Array<{
    name?: string;
    time?: number;
    args?: string[];
  }>;
  source?: EventTarget;
}

export type WaitCommandInput = WaitTimeInput | WaitEventInput;

export interface WaitCommandOutput {
  type: 'time' | 'event';
  result: Event | number;
  duration: number;
}

// ============================================================================
// Input Validation Schema
// ============================================================================

const WaitTimeInputSchema = v.object({
  type: v.literal('time'),
  value: v.number().min(0).describe('Time to wait in milliseconds')
});

const WaitEventInputSchema = v.object({
  type: v.literal('event'),
  events: v.array(v.object({
    name: v.string().optional().describe('Event name'),
    time: v.number().optional().describe('Timeout in milliseconds'),
    args: v.array(v.string()).optional().describe('Event properties to destructure')
  })).min(1).describe('List of events to wait for'),
  source: v.custom((value: unknown) =>
    value === undefined || value instanceof EventTarget
  ).optional().describe('Event source element')
});

const WaitCommandInputSchema = z.union([
  WaitTimeInputSchema,
  WaitEventInputSchema
]);

// ============================================================================
// Wait Command Implementation
// ============================================================================

/**
 * Wait Command - Async time delays and event waiting
 *
 * This command implements the hyperscript wait functionality:
 * - Time-based delays
 * - Event-based waiting
 * - Race conditions (multiple events/timeouts)
 * - Event property destructuring
 */
export class WaitCommand implements TypedCommandImplementation<
  WaitCommandInput,
  WaitCommandOutput,
  TypedExecutionContext
> {
  public readonly name = 'wait' as const;
  public readonly syntax = 'wait <time> | wait for <event> [or ...] [from <source>]';
  public readonly description = 'Waits for a specified time or event before continuing execution';
  public readonly inputSchema = WaitCommandInputSchema;
  public readonly outputType = 'object' as const;

  public readonly metadata: CommandMetadata = {
    category: 'Async',
    complexity: 'medium',
    sideEffects: ['time', 'event-listening'],
    examples: [
      {
        code: 'wait 2s',
        description: 'Wait 2 seconds',
        expectedOutput: '2000'
      },
      {
        code: 'wait for click',
        description: 'Wait for click event on current element',
        expectedOutput: 'Event'
      },
      {
        code: 'wait for load or 1s',
        description: 'Wait for load event or 1 second timeout',
        expectedOutput: 'Event | 1000'
      },
      {
        code: 'wait for mousemove(clientX, clientY)',
        description: 'Wait for mousemove and destructure event properties',
        expectedOutput: 'Event'
      }
    ],
    relatedCommands: ['async', 'fetch', 'settle']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Provides asynchronous time delays and event waiting functionality',
    parameters: [
      {
        name: 'time',
        type: 'number | string',
        description: 'Time to wait (e.g., "2s", "500ms", 100)',
        optional: false,
        examples: ['2s', '500ms', '1000', '1 second']
      },
      {
        name: 'event',
        type: 'string',
        description: 'Event name to wait for',
        optional: false,
        examples: ['click', 'load', 'transitionend', 'custom:event']
      },
      {
        name: 'source',
        type: 'EventTarget',
        description: 'Element to listen for events on (defaults to current element)',
        optional: true,
        examples: ['document', 'window', '#myElement']
      }
    ],
    returnType: {
      type: 'Promise<Event | number>',
      description: 'Resolves with event object or timeout duration'
    },
    notes: [
      'This command is asynchronous - execution pauses until wait completes',
      'Multiple events create a race condition - first to fire wins',
      'Event properties can be destructured into local variables',
      'Result is stored in context.result'
    ]
  };

  /**
   * Execute the wait command
   */
  async execute(
    input: WaitCommandInput,
    context: TypedExecutionContext
  ): Promise<WaitCommandOutput> {
    const startTime = Date.now();

    if (input.type === 'time') {
      await this.waitForTime(input.value);
      const duration = Date.now() - startTime;

      return {
        type: 'time',
        result: input.value,
        duration
      };
    }

    // Event-based wait
    const event = await this.waitForEvent(input.events, input.source || context.me, context);
    const duration = Date.now() - startTime;

    return {
      type: 'event',
      result: event,
      duration
    };
  }

  /**
   * Wait for a specified amount of time
   */
  private waitForTime(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  /**
   * Wait for one or more events
   * Implements race condition - first event to fire wins
   */
  private waitForEvent(
    events: Array<{ name?: string; time?: number; args?: string[] }>,
    target: EventTarget | undefined,
    context: TypedExecutionContext
  ): Promise<Event> {
    return new Promise((resolve) => {
      let resolved = false;
      const listeners: Array<{ target: EventTarget; event: string; listener: EventListener }> = [];

      // Helper to resolve once and cleanup all listeners
      const resolveOnce = (event: Event | number, eventInfo?: { args?: string[] }) => {
        if (resolved) return;
        resolved = true;

        // Cleanup all listeners
        for (const { target, event: eventName, listener } of listeners) {
          target.removeEventListener(eventName, listener);
        }

        // Store result in context
        if (typeof event === 'number') {
          // Timeout - just resolve with the time value
          context.result = event;
          resolve(event as any);
        } else {
          // Event - store and destructure properties
          context.result = event;

          // Destructure event properties into locals
          if (eventInfo?.args && context.locals) {
            for (const arg of eventInfo.args) {
              const value = (event as any)[arg] ||
                           (event as any).detail?.[arg] ||
                           null;
              context.locals.set(arg, value);
            }
          }

          resolve(event);
        }
      };

      // Setup listeners for each event
      for (const eventInfo of events) {
        if (eventInfo.name) {
          // Event listener
          const eventTarget = target || context.me;
          if (!eventTarget) {
            throw new Error('No event target available (context.me is undefined)');
          }

          const listener = ((event: Event) => {
            resolveOnce(event, eventInfo);
          }) as EventListener;

          eventTarget.addEventListener(eventInfo.name, listener, { once: true });
          listeners.push({
            target: eventTarget,
            event: eventInfo.name,
            listener
          });
        } else if (eventInfo.time != null) {
          // Timeout
          setTimeout(() => {
            resolveOnce(eventInfo.time!, eventInfo);
          }, eventInfo.time);
        }
      }
    });
  }
}

/**
 * Factory function to create the wait command
 */
export function createWaitCommand(): WaitCommand {
  return new WaitCommand();
}

export default WaitCommand;
