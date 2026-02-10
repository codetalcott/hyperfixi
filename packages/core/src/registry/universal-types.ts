/**
 * Universal Types
 *
 * Type-safe exports for code that works in both browser and Node.js environments.
 * These types use the 'universal' environment which allows both Element and object targets.
 *
 * Usage:
 *   import type { UniversalEventSource, UniversalEventPayload } from '@hyperfixi/core/registry/universal';
 *
 * Use universal types when:
 * - Writing library code that works in browser and server
 * - Creating event sources that adapt to the environment
 * - Building plugins that work everywhere
 */

import type {
  EventSourcePayload,
  EventSourceHandler,
  EventSourceSubscription,
  EventSource,
  RuntimeEnvironment,
} from './event-source-registry';
import type { ExecutionContext } from '../types/core';
import { isBrowserEnvironment, isNodeEnvironment } from './environment';

/**
 * Universal event payload
 *
 * Works in both browser and Node.js environments:
 * - target can be Element or object
 * - nativeEvent is optional (present in browser, undefined in Node)
 *
 * @example
 * const payload: UniversalEventPayload = {
 *   type: 'custom',
 *   data: { value: 123 },
 *   target: isBrowserEnvironment() ? element : {},
 *   nativeEvent: isBrowserEnvironment() ? event : undefined,
 * };
 */
export type UniversalEventPayload = EventSourcePayload<'universal'>;

/**
 * Universal event handler
 *
 * Handler function that works in both environments.
 * Must handle both Element and object targets.
 *
 * @example
 * const handler: UniversalEventHandler = (payload, context) => {
 *   if (isBrowserEnvironment()) {
 *     // Browser-specific handling
 *     if (payload.target instanceof Element) {
 *       payload.target.classList.add('active');
 *     }
 *     payload.nativeEvent?.preventDefault();
 *   } else {
 *     // Server-specific handling
 *     console.log('Server event:', payload.data);
 *   }
 * };
 */
export type UniversalEventHandler = EventSourceHandler<'universal'>;

/**
 * Universal event source
 *
 * Event source that works in both browser and Node.js environments.
 * Adapts behavior based on runtime environment.
 *
 * @template TEnv - Runtime environment (default: 'universal')
 *
 * @example
 * const logSource: UniversalEventSource = {
 *   name: 'log',
 *   description: 'Logging event source',
 *
 *   subscribe(options, context) {
 *     const handler = (data: unknown) => {
 *       const payload: UniversalEventPayload = {
 *         type: 'log',
 *         data,
 *         target: isBrowserEnvironment() ? document.body : {},
 *       };
 *       options.handler(payload, context);
 *     };
 *
 *     // Set up logging (works in both environments)
 *     const interval = setInterval(() => handler({ timestamp: Date.now() }), 1000);
 *
 *     return {
 *       id: 'log_1',
 *       source: 'log',
 *       event: 'tick',
 *       unsubscribe: () => clearInterval(interval),
 *     };
 *   },
 * };
 */
export interface UniversalEventSource<
  TEnv extends RuntimeEnvironment = 'universal',
> extends EventSource {
  // Inherits subscribe() from EventSource - no override needed
  // The generic TEnv parameter is available for other members if needed
}

/**
 * Type-safe registry that adapts to environment
 *
 * Provides a unified interface for registering event sources, commands, and context providers
 * that works in both browser and Node.js environments.
 *
 * @template TEnv - Runtime environment ('browser' | 'node' | 'universal')
 *
 * @example
 * const registry: TypedRegistry = {
 *   eventSources: {
 *     register(name, source) {
 *       // Register event source
 *     },
 *   },
 *   context: {
 *     register(name, provider) {
 *       // Register context provider
 *     },
 *   },
 *   commands: {
 *     register(command) {
 *       // Register command
 *     },
 *   },
 * };
 */
export interface TypedRegistry<TEnv extends RuntimeEnvironment = 'universal'> {
  /**
   * Event source registry
   */
  eventSources: {
    register(name: string, source: UniversalEventSource<TEnv>): void;
    get(name: string): UniversalEventSource<TEnv> | undefined;
    has(name: string): boolean;
    getSourceNames(): string[];
  };

  /**
   * Context provider registry
   */
  context: {
    register<T>(
      name: string,
      provide: (ctx: ExecutionContext) => T,
      options?: {
        description?: string;
        cache?: boolean;
      }
    ): void;
    has(name: string): boolean;
    getProviderNames(): string[];
  };

  /**
   * Command registry
   */
  commands: {
    register(command: any): void;
    has(name: string): boolean;
    getCommandNames(): string[];
  };
}

/**
 * Create a timer event source that works in both environments
 *
 * Simple example of a universal event source.
 * Works with setTimeout/setInterval which exist in both browser and Node.js.
 *
 * @param name Event source name
 * @param interval Interval in milliseconds
 * @returns Universal event source
 *
 * @example
 * const tickSource = createTimerEventSource('tick', 1000);
 * registry.eventSources.register('tick', tickSource);
 *
 * // Use in hyperscript: on tick
 */
export function createTimerEventSource(name: string, interval: number): UniversalEventSource {
  return {
    name,
    description: `Timer that fires every ${interval}ms`,
    supportedEvents: [name],

    subscribe(options, context) {
      const handler = () => {
        const payload: UniversalEventPayload = {
          type: name,
          data: { timestamp: Date.now() },
          target: isBrowserEnvironment() && typeof document !== 'undefined' ? document.body : {},
        };

        options.handler(payload, context);
      };

      const timerId = setInterval(handler, interval);

      return {
        id: `${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        source: name,
        event: name,
        unsubscribe: () => clearInterval(timerId),
      };
    },

    supports(event: string): boolean {
      return event === name;
    },
  };
}

/**
 * Create a custom event source that adapts to environment
 *
 * Helper for creating event sources that work in both browser and server.
 * Uses DOM CustomEvent in browser, generic events in Node.js.
 *
 * @param name Event name
 * @param options Optional configuration
 * @returns Universal event source
 *
 * @example
 * const dataSource = createAdaptiveEventSource('data-update', {
 *   description: 'Data update notifications',
 * });
 *
 * // In browser: dispatches CustomEvent
 * // In Node: uses EventEmitter or custom logic
 */
export function createAdaptiveEventSource(
  name: string,
  options?: {
    description?: string;
  }
): UniversalEventSource {
  return {
    name,
    description: options?.description ?? `Adaptive ${name} events`,
    supportedEvents: [name],

    subscribe(subscribeOptions, context) {
      let unsubscribe: () => void;

      if (isBrowserEnvironment()) {
        // Browser implementation using CustomEvent
        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const payload: UniversalEventPayload = {
            type: name,
            data: customEvent.detail,
            target: e.target instanceof Element ? e.target : null,
            nativeEvent: e,
          };

          subscribeOptions.handler(payload, context);
        };

        document.addEventListener(name, handler);
        unsubscribe = () => document.removeEventListener(name, handler);
      } else if (isNodeEnvironment()) {
        // Node.js implementation (simplified - in real code, use EventEmitter)
        const handler = (data: unknown) => {
          const payload: UniversalEventPayload = {
            type: name,
            data,
            target: {},
          };

          subscribeOptions.handler(payload, context);
        };

        // In real implementation, register with EventEmitter
        // For now, just provide a no-op unsubscribe
        unsubscribe = () => {
          // Cleanup
        };
      } else {
        unsubscribe = () => {};
      }

      return {
        id: `${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        source: name,
        event: name,
        unsubscribe,
      };
    },

    supports(event: string): boolean {
      return event === name;
    },
  };
}

/**
 * Check if payload appears to be from browser environment
 *
 * Performs runtime checks to determine if payload has browser-like characteristics.
 * Note: This does NOT narrow the type due to TypeScript variance rules.
 *
 * @example
 * function handleEvent(payload: UniversalEventPayload) {
 *   if (isBrowserLikePayload(payload)) {
 *     // Runtime check passed, but type is still UniversalEventPayload
 *     if (payload.target instanceof Element) {
 *       payload.target.classList.add('active');
 *     }
 *   }
 * }
 */
export function isBrowserLikePayload(payload: UniversalEventPayload): boolean {
  return isBrowserEnvironment() && (payload.target == null || payload.target instanceof Element);
}

/**
 * Check if payload appears to be from server environment
 *
 * Performs runtime checks to determine if payload has server-like characteristics.
 * Note: This does NOT narrow the type due to TypeScript variance rules.
 *
 * @example
 * function handleEvent(payload: UniversalEventPayload) {
 *   if (isServerLikePayload(payload)) {
 *     // Runtime check passed, but type is still UniversalEventPayload
 *     if (payload.data && 'request' in payload.data) {
 *       // Access request data
 *     }
 *   }
 * }
 */
export function isServerLikePayload(payload: UniversalEventPayload): boolean {
  return (
    isNodeEnvironment() &&
    typeof payload.data === 'object' &&
    payload.data !== null &&
    'request' in payload.data
  );
}
