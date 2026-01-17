/**
 * Event Source Registry
 *
 * Enables registration of custom event sources beyond standard DOM events.
 * This is essential for server-side hyperscript (request events), WebSocket events,
 * SSE streams, and other non-DOM event sources.
 *
 * Usage:
 *   eventSources.register('request', requestEventSource);
 *   eventSources.register('websocket', websocketEventSource);
 *
 * Event sources handle:
 *   - Subscribing to their event stream
 *   - Mapping events to hyperscript execution context
 *   - Cleanup when the subscription is no longer needed
 */

import type { ExecutionContext } from '../types/core';
import type { ASTNode } from '../types/base-types';
import type { RuntimeEnvironment } from './environment';

// Re-export RuntimeEnvironment for convenience
export type { RuntimeEnvironment } from './environment';

/**
 * Environment-specific target types
 *
 * Conditional type that resolves to the correct target type based on runtime environment:
 * - Browser: Element (DOM element)
 * - Node: object (generic context object)
 * - Universal: Element | object (works in both)
 */
export type EventTarget<TEnv extends RuntimeEnvironment> = TEnv extends 'browser'
  ? Element
  : TEnv extends 'node'
    ? object
    : Element | object;

/**
 * Environment-specific native event types
 *
 * Conditional type that resolves to the correct event type based on runtime environment:
 * - Browser: Event (native DOM event)
 * - Node: never (no native events in Node.js)
 * - Universal: Event | undefined (optional in universal code)
 */
export type NativeEvent<TEnv extends RuntimeEnvironment> = TEnv extends 'browser'
  ? Event
  : TEnv extends 'node'
    ? never
    : Event | undefined;

/**
 * Event payload passed to event handlers
 *
 * Generic interface that adapts to the runtime environment:
 * - In browser: target is Element, nativeEvent is Event
 * - In Node.js: target is object, nativeEvent is never (not available)
 * - Universal (default): target is Element | object, nativeEvent is optional
 *
 * @template TEnv - Runtime environment ('browser' | 'node' | 'universal')
 *
 * @example
 * // Browser-specific payload
 * const browserPayload: EventSourcePayload<'browser'> = {
 *   type: 'click',
 *   data: {},
 *   target: element,      // ✅ Must be Element
 *   nativeEvent: event,   // ✅ Must be Event
 * };
 *
 * @example
 * // Node-specific payload
 * const nodePayload: EventSourcePayload<'node'> = {
 *   type: 'request',
 *   data: { request, response },
 *   target: {},           // ✅ Can be any object
 *   // nativeEvent: event // ❌ TypeScript error - not available in Node
 * };
 *
 * @example
 * // Universal payload (default)
 * const universalPayload: EventSourcePayload = {
 *   type: 'custom',
 *   data: {},
 *   target: element,      // ✅ Can be Element or object
 *   nativeEvent: event,   // ✅ Optional
 * };
 */
export interface EventSourcePayload<TEnv extends RuntimeEnvironment = 'universal'> {
  /** The event type (e.g., 'request', 'message', 'connection', 'click') */
  type: string;

  /** Raw event data from the source */
  data: unknown;

  /**
   * Event target
   * - Browser: Element (DOM element)
   * - Node: object (generic context object)
   * - Universal: Element | object
   */
  target?: EventTarget<TEnv> | null;

  /**
   * Original native event (browser only)
   * - Browser: Event (native DOM event)
   * - Node: never (not available)
   * - Universal: Event | undefined
   */
  nativeEvent?: NativeEvent<TEnv>;

  /** Additional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Handler function invoked when an event source fires
 *
 * @template TEnv - Runtime environment ('browser' | 'node' | 'universal')
 */
export type EventSourceHandler<TEnv extends RuntimeEnvironment = 'universal'> = (
  payload: EventSourcePayload<TEnv>,
  context: ExecutionContext
) => void;

/**
 * Subscription returned when attaching to an event source
 */
export interface EventSourceSubscription {
  /** Unique identifier for this subscription */
  id: string;

  /** Event source name */
  source: string;

  /** Event type within the source */
  event: string;

  /** Cleanup function to remove the subscription */
  unsubscribe: () => void;
}

/**
 * Options for subscribing to an event source
 */
export interface EventSourceSubscribeOptions {
  /** The specific event type to listen for (e.g., 'GET', 'POST' for request source) */
  event: string;

  /** Event handler commands to execute */
  handler: EventSourceHandler;

  /** Target/filter criteria (e.g., URL pattern for requests) */
  target?: string | RegExp;

  /** Selector for event delegation */
  selector?: string;

  /** Additional options specific to the event source */
  options?: Record<string, unknown>;
}

/**
 * Interface for custom event sources
 *
 * Event sources are responsible for:
 * 1. Setting up the underlying event subscription
 * 2. Transforming native events into EventSourcePayload
 * 3. Managing cleanup on unsubscribe
 */
export interface EventSource {
  /** Unique name for this event source (e.g., 'request', 'websocket') */
  readonly name: string;

  /** Human-readable description */
  readonly description?: string;

  /** Supported event types within this source */
  readonly supportedEvents?: string[];

  /**
   * Subscribe to events from this source
   * @param options Subscription options
   * @param context Execution context for the handler
   * @returns Subscription that can be used to unsubscribe
   */
  subscribe(
    options: EventSourceSubscribeOptions,
    context: ExecutionContext
  ): EventSourceSubscription;

  /**
   * Check if this source supports a given event type
   * @param event Event type to check
   */
  supports?(event: string): boolean;

  /**
   * Initialize the event source (called once on first use)
   */
  initialize?(): Promise<void> | void;

  /**
   * Cleanup all subscriptions and resources
   */
  destroy?(): void;
}

/**
 * Registry for custom event sources
 *
 * Example usage:
 *   const registry = new EventSourceRegistry();
 *
 *   // Register a server-side request event source
 *   registry.register('request', {
 *     name: 'request',
 *     subscribe(options, context) {
 *       // Set up HTTP request handling
 *       return { id: '...', source: 'request', event: options.event, unsubscribe: () => {} };
 *     }
 *   });
 *
 *   // Use in hyperscript: on request(GET, /api/users)
 *   const sub = registry.subscribe('request', { event: 'GET', target: '/api/users', handler });
 */
export class EventSourceRegistry {
  private sources = new Map<string, EventSource>();
  private subscriptions = new Map<string, EventSourceSubscription>();
  private nextId = 1;

  /**
   * Register a custom event source
   * @param name Event source name (used in 'on <name>' syntax)
   * @param source Event source implementation
   */
  register(name: string, source: EventSource): void {
    const normalizedName = name.toLowerCase();

    if (this.sources.has(normalizedName)) {
      console.warn(`[EventSourceRegistry] Overwriting existing event source: ${name}`);
    }

    this.sources.set(normalizedName, source);
  }

  /**
   * Unregister an event source
   * @param name Event source name
   */
  unregister(name: string): boolean {
    const normalizedName = name.toLowerCase();
    const source = this.sources.get(normalizedName);

    if (source) {
      // Cleanup all subscriptions for this source
      for (const [id, sub] of this.subscriptions.entries()) {
        if (sub.source === normalizedName) {
          sub.unsubscribe();
          this.subscriptions.delete(id);
        }
      }

      // Destroy the source
      source.destroy?.();
      return this.sources.delete(normalizedName);
    }

    return false;
  }

  /**
   * Get a registered event source
   * @param name Event source name
   */
  get(name: string): EventSource | undefined {
    return this.sources.get(name.toLowerCase());
  }

  /**
   * Check if an event source is registered
   * @param name Event source name
   */
  has(name: string): boolean {
    return this.sources.has(name.toLowerCase());
  }

  /**
   * Subscribe to events from a registered source
   * @param sourceName Event source name
   * @param options Subscription options
   * @param context Execution context
   * @returns Subscription or undefined if source not found
   */
  subscribe(
    sourceName: string,
    options: EventSourceSubscribeOptions,
    context: ExecutionContext
  ): EventSourceSubscription | undefined {
    const source = this.get(sourceName);

    if (!source) {
      console.warn(`[EventSourceRegistry] Unknown event source: ${sourceName}`);
      return undefined;
    }

    // Initialize source if needed
    source.initialize?.();

    // Create subscription
    const subscription = source.subscribe(options, context);

    // Track subscription
    this.subscriptions.set(subscription.id, subscription);

    return subscription;
  }

  /**
   * Unsubscribe by subscription ID
   * @param subscriptionId Subscription ID
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      subscription.unsubscribe();
      return this.subscriptions.delete(subscriptionId);
    }

    return false;
  }

  /**
   * Get all registered event source names
   */
  getSourceNames(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): EventSourceSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Check if an event type might be from a custom source
   * Returns the source name if found, undefined otherwise
   */
  findSourceForEvent(event: string): string | undefined {
    for (const [name, source] of this.sources.entries()) {
      if (source.supports?.(event) ?? source.supportedEvents?.includes(event)) {
        return name;
      }
    }
    return undefined;
  }

  /**
   * Generate a unique subscription ID
   */
  generateId(): string {
    return `sub_${this.nextId++}_${Date.now().toString(36)}`;
  }

  /**
   * Cleanup all subscriptions and destroy all sources
   */
  destroy(): void {
    // Unsubscribe all
    for (const sub of this.subscriptions.values()) {
      sub.unsubscribe();
    }
    this.subscriptions.clear();

    // Destroy all sources
    for (const source of this.sources.values()) {
      source.destroy?.();
    }
    this.sources.clear();
  }
}

/**
 * Factory function for creating event source registry
 */
export function createEventSourceRegistry(): EventSourceRegistry {
  return new EventSourceRegistry();
}

/**
 * Default global event source registry instance
 */
let defaultRegistry: EventSourceRegistry | null = null;

/**
 * Get the default event source registry (creates one if needed)
 */
export function getDefaultEventSourceRegistry(): EventSourceRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createEventSourceRegistry();
  }
  return defaultRegistry;
}
