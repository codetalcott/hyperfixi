/**
 * Event System for Hyperscript Runtime
 * Handles custom events, event delegation, and hyperscript-specific event patterns
 */

import type { HyperscriptEvent, ExecutionContext } from '../types/core';
import { debug } from '../utils/debug';

// Event listener information
interface ListenerInfo {
  element: HTMLElement;
  eventType: string;
  handler: EventListener;
  options?: AddEventListenerOptions & { delegated?: boolean };
  wrappedHandler: EventListener;
}

// Event manager for organizing listeners
export interface HyperscriptEventManager {
  listeners: Map<string, ListenerInfo>;
  delegatedListeners: Map<string, Set<string>>;
}

// Global delegation state
let delegationSetup = false;
const delegatedEvents = new Set<string>();
const delegationHandlers = new Map<string, EventListener>();

/**
 * Callback type for registering cleanup functions with an external registry.
 * Avoids importing CleanupRegistry directly (which lives in src/runtime/).
 */
export type DelegationCleanupRegistrar = (cleanup: () => void, description: string) => void;

let _cleanupRegistrar: DelegationCleanupRegistrar | null = null;

/**
 * Wire delegation cleanup into an external cleanup system (e.g., CleanupRegistry).
 * When set, all document-level delegation listeners are registered for cleanup,
 * including any already-active handlers.
 */
export function setDelegationCleanupRegistrar(registrar: DelegationCleanupRegistrar): void {
  _cleanupRegistrar = registrar;
  // Register existing delegation handlers
  delegationHandlers.forEach((handler, eventType) => {
    registrar(
      () => document.removeEventListener(eventType, handler, { capture: true }),
      `Event delegation for '${eventType}'`
    );
  });
}

/**
 * Creates a new event manager
 */
export function createEventManager(): HyperscriptEventManager {
  return {
    listeners: new Map<string, ListenerInfo>(),
    delegatedListeners: new Map<string, Set<string>>(),
  };
}

/**
 * Generates a unique listener ID
 */
let listenerIdCounter = 0;
function generateListenerId(): string {
  return `listener_${++listenerIdCounter}`;
}

/**
 * Wraps an event handler with error handling and hyperscript context
 */
function wrapEventHandler(
  handler: EventListener,
  element: HTMLElement,
  eventType: string
): EventListener {
  return function wrappedHandler(event: Event) {
    try {
      handler.call(element, event);
    } catch (error) {
      debug.event(`Error in hyperscript event handler for ${eventType}:`, error);

      // Dispatch error event
      const errorEvent = createHyperscriptEvent('error', {
        element,
        context: null as any, // Will be filled by runtime if available
        error: error as Error,
        originalEvent: event,
      });

      element.dispatchEvent(errorEvent);
    }
  };
}

/**
 * Registers an event listener with the event manager
 */
export function registerEventListener(
  manager: HyperscriptEventManager,
  element: HTMLElement,
  eventType: string,
  handler: EventListener,
  options?: AddEventListenerOptions & { delegated?: boolean }
): string {
  const listenerId = generateListenerId();
  const wrappedHandler = wrapEventHandler(handler, element, eventType);

  // Store listener info
  const listenerInfo: ListenerInfo = {
    element,
    eventType,
    handler,
    ...(options && { options }),
    wrappedHandler,
  };

  manager.listeners.set(listenerId, listenerInfo);

  // Handle delegated vs direct listeners
  if (options?.delegated) {
    // Register for delegation
    if (!manager.delegatedListeners.has(eventType)) {
      manager.delegatedListeners.set(eventType, new Set());
    }
    manager.delegatedListeners.get(eventType)!.add(listenerId);

    // Ensure delegation is set up for this event type
    ensureEventDelegation(eventType);
  } else {
    // Register directly on element
    const listenerOptions = options ? { ...options } : undefined;
    if (listenerOptions) {
      delete (listenerOptions as any).delegated;
    }

    element.addEventListener(eventType, wrappedHandler, listenerOptions);
  }

  return listenerId;
}

/**
 * Unregisters an event listener
 */
export function unregisterEventListener(
  manager: HyperscriptEventManager,
  listenerId: string
): boolean {
  const listenerInfo = manager.listeners.get(listenerId);
  if (!listenerInfo) {
    return false;
  }

  const { element, eventType, wrappedHandler, options } = listenerInfo;

  // Remove from manager
  manager.listeners.delete(listenerId);

  // Handle delegated vs direct listeners
  if (options?.delegated) {
    // Remove from delegation tracking
    const delegatedSet = manager.delegatedListeners.get(eventType);
    if (delegatedSet) {
      delegatedSet.delete(listenerId);
      if (delegatedSet.size === 0) {
        manager.delegatedListeners.delete(eventType);
      }
    }
  } else {
    // Remove directly from element
    const listenerOptions = options ? { ...options } : undefined;
    if (listenerOptions) {
      delete (listenerOptions as any).delegated;
    }

    element.removeEventListener(eventType, wrappedHandler, listenerOptions);
  }

  return true;
}

/**
 * Dispatches a custom event
 */
export function dispatchCustomEvent(
  element: HTMLElement,
  eventType: string,
  detail?: any,
  options?: CustomEventInit
): boolean {
  const event = new CustomEvent(eventType, {
    detail,
    bubbles: true,
    cancelable: true,
    ...options,
  });

  return element.dispatchEvent(event);
}

/**
 * Creates a hyperscript-specific event
 */
export function createHyperscriptEvent(
  eventName: string,
  data: {
    element: HTMLElement;
    context: ExecutionContext;
    command?: string;
    result?: any;
    error?: Error;
    originalEvent?: Event;
  }
): HyperscriptEvent {
  const eventType = eventName.startsWith('hyperscript:') ? eventName : `hyperscript:${eventName}`;

  return new CustomEvent(eventType, {
    detail: data,
    bubbles: true,
    cancelable: true,
  }) as HyperscriptEvent;
}

/**
 * Sets up global event delegation
 */
export function setupEventDelegation(): void {
  if (delegationSetup) {
    return;
  }

  delegationSetup = true;

  // Set up delegation for common events
  const commonEvents = ['click', 'change', 'input', 'submit', 'focus', 'blur'];

  commonEvents.forEach(eventType => {
    ensureEventDelegation(eventType);
  });
}

/**
 * Ensures delegation is set up for a specific event type
 */
function ensureEventDelegation(eventType: string): void {
  if (delegatedEvents.has(eventType)) {
    return;
  }

  delegatedEvents.add(eventType);

  const delegationHandler = createDelegationHandler(eventType);
  delegationHandlers.set(eventType, delegationHandler);

  document.addEventListener(eventType, delegationHandler, { capture: true });

  // Register for cleanup if a registrar is available
  if (_cleanupRegistrar) {
    _cleanupRegistrar(
      () => document.removeEventListener(eventType, delegationHandler, { capture: true }),
      `Event delegation for '${eventType}'`
    );
  }
}

/**
 * Creates a delegation handler for a specific event type
 */
function createDelegationHandler(eventType: string): EventListener {
  return function delegationHandler(event: Event) {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Find all managers that have delegated listeners for this event type
    // Note: In a real implementation, you'd need a way to access all active managers
    // For now, we'll implement a basic pattern that works with the test

    // This is a simplified implementation for testing
    // In practice, you'd maintain a global registry of managers
    if ((window as any).__hyperscriptEventManagers) {
      const managers = (window as any).__hyperscriptEventManagers as HyperscriptEventManager[];

      for (const manager of managers) {
        const delegatedSet = manager.delegatedListeners.get(eventType);
        if (!delegatedSet) continue;

        delegatedSet.forEach(listenerId => {
          const listenerInfo = manager.listeners.get(listenerId);
          if (!listenerInfo) return;

          // Check if the target matches the listener element
          if (target === listenerInfo.element || listenerInfo.element.contains(target)) {
            listenerInfo.wrappedHandler(event);
          }
        });
      }
    }
  };
}

/**
 * Cleans up event delegation
 */
export function cleanupEventDelegation(): void {
  if (!delegationSetup) {
    return;
  }

  delegationHandlers.forEach((handler, eventType) => {
    document.removeEventListener(eventType, handler, { capture: true });
  });

  delegatedEvents.clear();
  delegationHandlers.clear();
  delegationSetup = false;
  _cleanupRegistrar = null;

  // Clear global manager registry to prevent stale references
  if (typeof window !== 'undefined' && (window as any).__hyperscriptEventManagers) {
    (window as any).__hyperscriptEventManagers = [];
  }
}

/**
 * Registers a manager for global delegation (helper for testing)
 */
export function registerManagerForDelegation(manager: HyperscriptEventManager): void {
  if (!(window as any).__hyperscriptEventManagers) {
    (window as any).__hyperscriptEventManagers = [];
  }

  (window as any).__hyperscriptEventManagers.push(manager);
}

/**
 * Unregisters a manager from global delegation
 */
export function unregisterManagerFromDelegation(manager: HyperscriptEventManager): void {
  if ((window as any).__hyperscriptEventManagers) {
    const managers = (window as any).__hyperscriptEventManagers as HyperscriptEventManager[];
    const index = managers.indexOf(manager);
    if (index > -1) {
      managers.splice(index, 1);
    }
  }
}

/**
 * Gets all active listeners for debugging
 */
export function getActiveListeners(manager: HyperscriptEventManager): ListenerInfo[] {
  return Array.from(manager.listeners.values());
}

/**
 * Gets listener count for performance monitoring
 */
export function getListenerCount(manager: HyperscriptEventManager): number {
  return manager.listeners.size;
}

/**
 * Creates a debounced event handler
 */
export function createDebouncedHandler(handler: EventListener, delay: number): EventListener {
  let timeoutId: number | undefined;

  return function debouncedHandler(event: Event) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      handler(event);
      timeoutId = undefined;
    }, delay);
  };
}

/**
 * Creates a throttled event handler
 */
export function createThrottledHandler(handler: EventListener, limit: number): EventListener {
  let inThrottle = false;

  return function throttledHandler(event: Event) {
    if (!inThrottle) {
      handler(event);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Creates a one-time event handler
 */
export function createOnceHandler(handler: EventListener): EventListener {
  let called = false;

  return function onceHandler(event: Event) {
    if (!called) {
      called = true;
      handler(event);
    }
  };
}

/**
 * Utility to wait for a specific event (useful for testing and async operations)
 */
export function waitForEvent(
  element: EventTarget,
  eventType: string,
  timeout = 5000
): Promise<Event> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      element.removeEventListener(eventType, handler);
      reject(new Error(`Event ${eventType} not received within ${timeout}ms`));
    }, timeout);

    const handler = (event: Event) => {
      clearTimeout(timeoutId);
      element.removeEventListener(eventType, handler);
      resolve(event);
    };

    element.addEventListener(eventType, handler, { once: true });
  });
}

/**
 * Emits a cancelable `fx:config` event for fixi compatibility.
 * Listeners may modify `event.detail.config` before the request is sent,
 * or call `event.preventDefault()` to abort the request entirely.
 *
 * @param element - The element dispatching the event
 * @param cfg - The request configuration object (url, method, headers, etc.)
 * @returns `true` to proceed with the request; `false` if cancelled via `preventDefault()`
 */
export function emitConfigEvent(element: HTMLElement, cfg: any): boolean {
  const event = new CustomEvent('fx:config', {
    detail: { config: cfg },
    bubbles: true,
    cancelable: true,
  });

  element.dispatchEvent(event);

  // Return false if event was cancelled (preventDefault called)
  return !event.defaultPrevented;
}

/**
 * Emits a cancelable `fx:before` event just before the HTTP request is sent.
 * Call `event.preventDefault()` to abort the request.
 *
 * @param element - The element dispatching the event
 * @param cfg - The finalized request configuration
 * @returns `true` to proceed with the request; `false` if cancelled via `preventDefault()`
 */
export function emitBeforeEvent(element: HTMLElement, cfg: any): boolean {
  const event = new CustomEvent('fx:before', {
    detail: { config: cfg },
    bubbles: true,
    cancelable: true,
  });

  element.dispatchEvent(event);

  // Return false if event was cancelled (preventDefault called)
  return !event.defaultPrevented;
}

/**
 * Emits a cancelable `fx:after` event after the HTTP response is received.
 * Listeners may inspect the response via `event.detail.config` or cancel
 * further processing (e.g., DOM swap) via `event.preventDefault()`.
 *
 * @param element - The element dispatching the event
 * @param cfg - The request configuration including response data
 * @returns `true` to continue processing; `false` if cancelled via `preventDefault()`
 */
export function emitAfterEvent(element: HTMLElement, cfg: any): boolean {
  const event = new CustomEvent('fx:after', {
    detail: { config: cfg },
    bubbles: true,
    cancelable: true,
  });

  element.dispatchEvent(event);

  // Return false if event was cancelled (preventDefault called)
  return !event.defaultPrevented;
}

/**
 * Emits fx:error event for fixi compatibility
 * Fired when HTTP request or processing encounters an error
 */
export function emitErrorEvent(element: HTMLElement, error: Error, cfg: any, command: any): void {
  const event = new CustomEvent('fx:error', {
    detail: {
      error,
      config: cfg,
      command,
    },
    bubbles: true,
    cancelable: false, // Error events are not cancelable
  });

  element.dispatchEvent(event);
}

/**
 * Emits fx:finally event for fixi compatibility
 * Fired after request completion (success or error)
 */
export function emitFinallyEvent(element: HTMLElement, cfg: any): void {
  const event = new CustomEvent('fx:finally', {
    detail: { config: cfg },
    bubbles: true,
    cancelable: false, // Finally events are not cancelable
  });

  element.dispatchEvent(event);
}

/**
 * Emits fx:swapped event for fixi compatibility
 * Fired after DOM content has been swapped/updated
 */
export function emitSwappedEvent(element: HTMLElement, cfg: any): void {
  const event = new CustomEvent('fx:swapped', {
    detail: { config: cfg },
    bubbles: true,
    cancelable: false, // Swapped events are not cancelable (already done)
  });

  element.dispatchEvent(event);
}
