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
  EvaluationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/command-types';
import { debug } from '../../utils/debug';

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

// Internal parsed types for documentation
type WaitCommandInput = any; // Inferred from RuntimeValidator

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
  value: v.number().min(0).describe('Time to wait in milliseconds'),
});

const WaitEventInputSchema = v.object({
  type: v.literal('event'),
  events: v
    .array(
      v.object({
        name: v.string().optional().describe('Event name'),
        time: v.number().optional().describe('Timeout in milliseconds'),
        args: v.array(v.string()).optional().describe('Event properties to destructure'),
      })
    )
    .min(1)
    .describe('List of events to wait for'),
  source: v
    .custom((value: unknown) => value === undefined || value instanceof EventTarget)
    .optional()
    .describe('Event source element'),
});

const WaitCommandInputSchema = z.union([WaitTimeInputSchema, WaitEventInputSchema]);

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
export class WaitCommand
  implements TypedCommandImplementation<WaitCommandInput, WaitCommandOutput, TypedExecutionContext>
{
  public readonly name = 'wait' as const;
  public readonly syntax = 'wait <time> | wait for <event> [or ...] [from <source>]';
  public readonly description = 'Waits for a specified time or event before continuing execution';
  public readonly inputSchema = WaitCommandInputSchema;
  public readonly outputType = 'object' as const;

  public readonly metadata: CommandMetadata = (
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          category: 'Control',
          complexity: 'medium',
          sideEffects: ['time', 'event-listening'],
          examples: [
            {
              code: 'wait 2s',
              description: 'Wait 2 seconds',
              expectedOutput: '2000',
            },
            {
              code: 'wait for click',
              description: 'Wait for click event on current element',
              expectedOutput: 'Event',
            },
            {
              code: 'wait for load or 1s',
              description: 'Wait for load event or 1 second timeout',
              expectedOutput: 'Event | 1000',
            },
            {
              code: 'wait for mousemove(clientX, clientY)',
              description: 'Wait for mousemove and destructure event properties',
              expectedOutput: 'Event',
            },
          ],
          relatedCommands: ['async', 'fetch', 'settle'],
        }
  ) as CommandMetadata;

  public readonly documentation: LLMDocumentation = (
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          summary: 'Provides asynchronous time delays and event waiting functionality',
          examples: [
            {
              title: 'Time delay',
              code: 'wait 2s',
              explanation: 'Wait for 2 seconds before continuing',
              output: '2000',
            },
            {
              title: 'Event waiting',
              code: 'wait for click',
              explanation: 'Wait for a click event on the current element',
              output: 'Event',
            },
            {
              title: 'Event with timeout',
              code: 'wait for click or 1s',
              explanation: 'Wait for click event, but timeout after 1 second',
              output: 'Event | 1000',
            },
          ],
          parameters: [
            {
              name: 'time',
              type: 'number | string',
              description: 'Time to wait (e.g., "2s", "500ms", 100)',
              optional: false,
              examples: ['2s', '500ms', '1000', '1 second'],
            },
            {
              name: 'event',
              type: 'string',
              description: 'Event name to wait for',
              optional: false,
              examples: ['click', 'load', 'transitionend', 'custom:event'],
            },
            {
              name: 'source',
              type: 'EventTarget',
              description: 'Element to listen for events on (defaults to current element)',
              optional: true,
              examples: ['document', 'window', '#myElement'],
            },
          ],
          returns: {
            type: 'Promise<Event | number>',
            description: 'Resolves with event object or timeout duration',
            examples: ['Event', '2000'],
          },
          seeAlso: ['on', 'trigger', 'send'],
          tags: ['async', 'events', 'timing', 'delay'],
        }
  ) as LLMDocumentation;

  /**
   * Validate command arguments
   */
  validate(_args: unknown[]): import('../../types/base-types').ValidationResult {
    // Basic validation - accept any args for now
    // More sophisticated validation could check time formats, event names, etc.
    return {
      isValid: true,
      errors: [],
      suggestions: [],
    };
  }

  /**
   * Execute the wait command
   */
  async execute(
    input: any,
    context: TypedExecutionContext
  ): Promise<EvaluationResult<WaitCommandOutput>> {
    const startTime = Date.now();

    debug.async('WAIT: execute() called with input:', input);

    try {
      if (input.type === 'time') {
        await this.waitForTime(input.value);
        const duration = Date.now() - startTime;

        return {
          success: true,
          value: {
            type: 'time',
            result: input.value,
            duration,
          },
          type: 'object',
        };
      }

      // Event-based wait
      const event = await this.waitForEvent(
        input.events,
        input.source || context.me || undefined,
        context
      );
      const duration = Date.now() - startTime;

      return {
        success: true,
        value: {
          type: 'event',
          result: event,
          duration,
        },
        type: 'object',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'RuntimeError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Wait command failed',
          code: 'WAIT_FAILED',
          suggestions: ['Check event names', 'Verify target elements exist'],
        },
        type: 'error',
      };
    }
  }

  /**
   * Wait for a specified amount of time
   */
  private waitForTime(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
  }

  /**
   * Wait for one or more events
   * Implements race condition - first event to fire wins
   * Optimized with EventQueue to reuse persistent listeners
   */
  private waitForEvent(
    events: Array<{ name?: string; time?: number; args?: string[] }>,
    target: EventTarget | undefined,
    context: TypedExecutionContext
  ): Promise<Event> {
    return new Promise(resolve => {
      let resolved = false;

      // Helper to resolve once
      const resolveOnce = (event: Event | number, eventInfo?: { args?: string[] }) => {
        if (resolved) return;
        resolved = true;

        // Resolve with result
        if (typeof event === 'number') {
          // Timeout - just resolve with the time value
          resolve(event as any);
        } else {
          // Event - destructure properties into locals
          if (eventInfo?.args && context.locals) {
            for (const arg of eventInfo.args) {
              const value = (event as any)[arg] || (event as any).detail?.[arg] || null;
              context.locals.set(arg, value);
            }
          }

          resolve(event);
        }
      };

      // Setup listeners for each event
      for (const eventInfo of events) {
        if (eventInfo.name) {
          // Event listener - use EventQueue for reusable persistent listeners
          const eventTarget = target || context.me || undefined;
          if (!eventTarget) {
            throw new Error('No event target available (context.me is undefined)');
          }

          // Use direct addEventListener (EventQueue has a bug where it shares queues between different elements)
          // Create a one-time listener that removes itself after firing
          const eventHandler = (event: Event) => {
            eventTarget.removeEventListener(eventInfo.name!, eventHandler);
            resolveOnce(event, eventInfo);
          };
          eventTarget.addEventListener(eventInfo.name, eventHandler);
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
