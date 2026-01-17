/**
 * Browser-Specific Types
 *
 * Type-safe exports for browser environments.
 * These types guarantee DOM APIs (Element, Event) are used correctly.
 *
 * Usage:
 *   import type { BrowserEventPayload, BrowserEventSource } from '@hyperfixi/core/registry/browser';
 *
 * Benefits:
 * - Full type safety for DOM elements and events
 * - Better IntelliSense in browser code
 * - Compile-time errors if server APIs used in browser
 */

import type {
  EventSourcePayload,
  EventSourceHandler,
  EventSourceSubscription,
  EventSource,
} from './event-source-registry';
import type { ExecutionContext } from '../types/core';

/**
 * Browser-specific event payload
 *
 * Guarantees:
 * - target is Element (DOM element)
 * - nativeEvent is Event (native browser event)
 *
 * @example
 * const payload: BrowserEventPayload = {
 *   type: 'click',
 *   data: { x: 100, y: 200 },
 *   target: document.querySelector('#button'),  // ✅ Element
 *   nativeEvent: new MouseEvent('click'),       // ✅ Event
 * };
 */
export interface BrowserEventPayload extends EventSourcePayload<'browser'> {
  /** DOM element that triggered the event */
  target?: Element | null;

  /** Native browser event (MouseEvent, KeyboardEvent, etc.) */
  nativeEvent?: Event;
}

/**
 * Browser-specific event handler
 *
 * Handler function that receives BrowserEventPayload.
 * Guarantees DOM APIs are available.
 *
 * @example
 * const handler: BrowserEventHandler = (payload, context) => {
 *   if (payload.target) {
 *     payload.target.classList.add('active');  // ✅ Type-safe
 *   }
 *   if (payload.nativeEvent) {
 *     payload.nativeEvent.preventDefault();    // ✅ Type-safe
 *   }
 * };
 */
export type BrowserEventHandler = EventSourceHandler<'browser'>;

/**
 * Browser event source interface
 *
 * Event source for browser-specific events (clicks, keyboard, custom events, etc.)
 *
 * @example
 * const clickSource: BrowserEventSource = {
 *   name: 'custom-click',
 *   description: 'Custom click event handler',
 *
 *   subscribe(options, context) {
 *     const handler = (e: MouseEvent) => {
 *       const payload: BrowserEventPayload = {
 *         type: 'click',
 *         data: { x: e.clientX, y: e.clientY },
 *         target: e.target as Element,
 *         nativeEvent: e,
 *       };
 *       options.handler(payload, context);
 *     };
 *
 *     document.addEventListener('click', handler);
 *
 *     return {
 *       id: 'click_1',
 *       source: 'custom-click',
 *       event: 'click',
 *       unsubscribe: () => document.removeEventListener('click', handler),
 *     };
 *   },
 * };
 */
export interface BrowserEventSource extends EventSource {
  // Inherits subscribe from EventSource
  // Implementations can cast handler to BrowserEventHandler internally
  // This avoids type incompatibility while allowing browser-specific usage
}

/**
 * Type guard to check if a payload is a browser event payload
 *
 * Narrows the type from EventSourcePayload to BrowserEventPayload.
 * Useful for universal code that needs to branch based on environment.
 *
 * @param payload Event source payload of any environment
 * @returns true if payload is from browser environment
 *
 * @example
 * function handleEvent(payload: EventSourcePayload) {
 *   if (isBrowserPayload(payload)) {
 *     // ✅ Type is narrowed to BrowserEventPayload
 *     payload.target?.classList.add('active');
 *     payload.nativeEvent?.preventDefault();
 *   }
 * }
 */
export function isBrowserPayload(payload: EventSourcePayload): payload is BrowserEventPayload {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    (payload.target == null || payload.target instanceof Element)
  );
}

/**
 * Type guard to check if an event source is a browser event source
 *
 * Narrows the type from EventSource to BrowserEventSource.
 *
 * @param source Event source of any type
 * @returns true if source is for browser environment
 *
 * @example
 * function registerSource(source: EventSource) {
 *   if (isBrowserEventSource(source)) {
 *     // ✅ Type is narrowed to BrowserEventSource
 *     source.subscribe({ event: 'click', handler: browserHandler }, context);
 *   }
 * }
 */
export function isBrowserEventSource(source: EventSource): source is BrowserEventSource {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Create a simple DOM event source
 *
 * Helper function to create event sources for standard DOM events.
 * Handles common patterns like event delegation and cleanup.
 *
 * @param eventName DOM event name (e.g., 'click', 'keydown', 'input')
 * @param options Optional configuration
 * @returns Browser event source
 *
 * @example
 * const clickSource = createDOMEventSource('click', {
 *   description: 'Click events on document',
 * });
 *
 * registry.eventSources.register('custom-click', clickSource);
 *
 * // Use in hyperscript: on custom-click
 */
export function createDOMEventSource(
  eventName: string,
  options?: {
    description?: string;
    target?: Element | Document;
    capture?: boolean;
  }
): BrowserEventSource {
  const target = options?.target ?? document;
  const capture = options?.capture ?? false;

  return {
    name: eventName,
    description: options?.description ?? `DOM ${eventName} events`,
    supportedEvents: [eventName],

    subscribe(subscribeOptions, context) {
      const handler = (e: Event) => {
        const payload: BrowserEventPayload = {
          type: eventName,
          data: e,
          target: e.target instanceof Element ? e.target : null,
          nativeEvent: e,
        };

        subscribeOptions.handler(payload, context);
      };

      target.addEventListener(eventName, handler, { capture });

      return {
        id: `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        source: eventName,
        event: eventName,
        unsubscribe: () => target.removeEventListener(eventName, handler, { capture }),
      };
    },

    supports(event: string): boolean {
      return event === eventName;
    },
  };
}

/**
 * Create a custom event source for CustomEvent
 *
 * Helper for creating event sources that dispatch and listen to CustomEvents.
 * Useful for application-specific events with typed data.
 *
 * @param eventName Custom event name
 * @param options Optional configuration
 * @returns Browser event source
 *
 * @example
 * interface UserLoginData {
 *   userId: string;
 *   timestamp: number;
 * }
 *
 * const loginSource = createCustomEventSource<UserLoginData>('user-login', {
 *   description: 'User login events',
 * });
 *
 * // Dispatch event
 * const event = new CustomEvent('user-login', {
 *   detail: { userId: '123', timestamp: Date.now() },
 *   bubbles: true,
 * });
 * document.dispatchEvent(event);
 */
export function createCustomEventSource<TDetail = any>(
  eventName: string,
  options?: {
    description?: string;
    target?: Element | Document;
  }
): BrowserEventSource {
  const target = options?.target ?? document;

  return {
    name: eventName,
    description: options?.description ?? `Custom ${eventName} events`,
    supportedEvents: [eventName],

    subscribe(subscribeOptions, context) {
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent<TDetail>;
        const payload: BrowserEventPayload = {
          type: eventName,
          data: customEvent.detail,
          target: e.target instanceof Element ? e.target : null,
          nativeEvent: e,
          meta: {
            bubbles: customEvent.bubbles,
            cancelable: customEvent.cancelable,
            composed: customEvent.composed,
          },
        };

        subscribeOptions.handler(payload, context);
      };

      target.addEventListener(eventName, handler);

      return {
        id: `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        source: eventName,
        event: eventName,
        unsubscribe: () => target.removeEventListener(eventName, handler),
      };
    },

    supports(event: string): boolean {
      return event === eventName;
    },
  };
}
