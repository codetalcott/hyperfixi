/**
 * Cleanup Registry
 *
 * Tracks event listeners, MutationObservers, intervals, and other resources
 * that need cleanup when elements are removed from the DOM.
 *
 * Uses WeakMap for element-scoped cleanup to allow garbage collection,
 * while maintaining a separate list for global cleanups.
 *
 * Integrated from plugin-system package to fix memory leaks in RuntimeBase.
 */

import { debug } from '../utils/debug';

/**
 * Types of cleanup entries
 */
export type CleanupType = 'listener' | 'observer' | 'interval' | 'timeout' | 'custom';

/**
 * A single cleanup entry
 */
export interface CleanupEntry {
  /** Type of resource being tracked */
  type: CleanupType;
  /** Function to perform the cleanup */
  cleanup: () => void;
  /** Optional target for listener cleanup */
  target?: EventTarget;
  /** Event name for listener cleanup */
  eventName?: string;
  /** Description for debugging */
  description?: string;
}

/**
 * Statistics about registered cleanups
 */
export interface CleanupStats {
  /** Number of elements with registered cleanups */
  elementsTracked: number;
  /** Total listener cleanups */
  listeners: number;
  /** Total observer cleanups */
  observers: number;
  /** Total interval cleanups */
  intervals: number;
  /** Total timeout cleanups */
  timeouts: number;
  /** Total custom cleanups */
  custom: number;
  /** Global cleanups (not tied to elements) */
  global: number;
}

/**
 * Cleanup Registry
 *
 * Manages cleanup of resources associated with DOM elements.
 * Uses WeakMap to allow garbage collection of removed elements.
 */
export class CleanupRegistry {
  /** Element-scoped cleanups (WeakMap allows GC of removed elements) */
  private elementCleanups = new WeakMap<Element, CleanupEntry[]>();
  /**
   * Track elements with cleanups for stats.
   * Note: We use a regular Set which means elements won't be GC'd while tracked.
   * This is acceptable since we clean up when elements are removed from DOM.
   */
  private trackedElements = new Set<Element>();
  /** Global cleanups not tied to specific elements */
  private globalCleanups: CleanupEntry[] = [];
  /** Debug mode */
  private debugMode: boolean;

  constructor(options?: { debug?: boolean }) {
    this.debugMode = options?.debug ?? false;
  }

  /**
   * Register an event listener for cleanup
   * @param element The element associated with this listener
   * @param target The EventTarget the listener is attached to
   * @param eventName The event name
   * @param handler The event handler function
   * @param options Optional event listener options (for removeEventListener)
   */
  registerListener(
    element: Element,
    target: EventTarget,
    eventName: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    this.addCleanup(element, {
      type: 'listener',
      target,
      eventName,
      cleanup: () => {
        target.removeEventListener(eventName, handler, options);
        if (this.debugMode) {
          debug.runtime(`CleanupRegistry: Removed listener '${eventName}'`);
        }
      },
      description: `${eventName} listener`,
    });
  }

  /**
   * Register a MutationObserver for cleanup
   * @param element The element associated with this observer
   * @param observer The MutationObserver instance
   */
  registerObserver(element: Element, observer: MutationObserver): void {
    this.addCleanup(element, {
      type: 'observer',
      cleanup: () => {
        observer.disconnect();
        if (this.debugMode) {
          debug.runtime(`CleanupRegistry: Disconnected MutationObserver`);
        }
      },
      description: 'MutationObserver',
    });
  }

  /**
   * Register an interval for cleanup
   * @param element The element associated with this interval
   * @param intervalId The interval ID from setInterval
   */
  registerInterval(element: Element, intervalId: ReturnType<typeof setInterval>): void {
    this.addCleanup(element, {
      type: 'interval',
      cleanup: () => {
        clearInterval(intervalId);
        if (this.debugMode) {
          debug.runtime(`CleanupRegistry: Cleared interval`);
        }
      },
      description: 'Interval',
    });
  }

  /**
   * Register a timeout for cleanup
   * @param element The element associated with this timeout
   * @param timeoutId The timeout ID from setTimeout
   */
  registerTimeout(element: Element, timeoutId: ReturnType<typeof setTimeout>): void {
    this.addCleanup(element, {
      type: 'timeout',
      cleanup: () => {
        clearTimeout(timeoutId);
        if (this.debugMode) {
          debug.runtime(`CleanupRegistry: Cleared timeout`);
        }
      },
      description: 'Timeout',
    });
  }

  /**
   * Register a custom cleanup function
   * @param element The element associated with this cleanup
   * @param cleanup The cleanup function
   * @param description Optional description for debugging
   */
  registerCustom(element: Element, cleanup: () => void, description?: string): void {
    this.addCleanup(element, {
      type: 'custom',
      cleanup,
      description: description || 'Custom cleanup',
    });
  }

  /**
   * Register a global cleanup (not tied to a specific element)
   * @param cleanup The cleanup function
   * @param type The type of cleanup
   * @param description Optional description
   */
  registerGlobal(cleanup: () => void, type: CleanupType = 'custom', description?: string): void {
    this.globalCleanups.push({
      type,
      cleanup,
      description: description || 'Global cleanup',
    });

    if (this.debugMode) {
      debug.runtime(`CleanupRegistry: Registered global cleanup: ${description || type}`);
    }
  }

  /**
   * Add a cleanup entry for an element
   */
  private addCleanup(element: Element, entry: CleanupEntry): void {
    const existing = this.elementCleanups.get(element) || [];
    existing.push(entry);
    this.elementCleanups.set(element, existing);

    // Track the element for stats
    this.trackedElements.add(element);

    if (this.debugMode) {
      debug.runtime(`CleanupRegistry: Registered ${entry.type} for element`, element);
    }
  }

  /**
   * Run all cleanup functions for an element
   * @param element The element to clean up
   * @returns Number of cleanups performed
   */
  cleanupElement(element: Element): number {
    const entries = this.elementCleanups.get(element);
    if (!entries || entries.length === 0) {
      return 0;
    }

    let count = 0;
    for (const entry of entries) {
      try {
        entry.cleanup();
        count++;
      } catch (error) {
        if (this.debugMode) {
          debug.runtime(`CleanupRegistry: Error during cleanup:`, error);
        }
      }
    }

    this.elementCleanups.delete(element);
    this.trackedElements.delete(element);

    if (this.debugMode) {
      debug.runtime(`CleanupRegistry: Cleaned up ${count} resources for element`);
    }

    return count;
  }

  /**
   * Recursively clean up an element and all its descendants
   * @param element The root element
   * @returns Total number of cleanups performed
   */
  cleanupElementTree(element: Element): number {
    let count = this.cleanupElement(element);

    // Clean up all descendants
    const descendants = element.querySelectorAll('*');
    for (const descendant of descendants) {
      count += this.cleanupElement(descendant);
    }

    return count;
  }

  /**
   * Run all global cleanup functions
   * @returns Number of cleanups performed
   */
  cleanupGlobal(): number {
    let count = 0;
    for (const entry of this.globalCleanups) {
      try {
        entry.cleanup();
        count++;
      } catch (error) {
        if (this.debugMode) {
          debug.runtime(`CleanupRegistry: Error during global cleanup:`, error);
        }
      }
    }

    this.globalCleanups = [];

    if (this.debugMode) {
      debug.runtime(`CleanupRegistry: Cleaned up ${count} global resources`);
    }

    return count;
  }

  /**
   * Run all cleanup functions (element + global)
   * Note: This only cleans up globally registered cleanups since
   * WeakMap doesn't allow iteration over element cleanups.
   * Use cleanupElement() or cleanupElementTree() for specific elements.
   */
  cleanupAll(): number {
    return this.cleanupGlobal();
  }

  /**
   * Check if an element has registered cleanups
   */
  hasCleanups(element: Element): boolean {
    const entries = this.elementCleanups.get(element);
    return entries !== undefined && entries.length > 0;
  }

  /**
   * Get the number of registered cleanups for an element
   */
  getCleanupCount(element: Element): number {
    const entries = this.elementCleanups.get(element);
    return entries?.length ?? 0;
  }

  /**
   * Get statistics about registered cleanups
   */
  getStats(): CleanupStats {
    let listeners = 0;
    let observers = 0;
    let intervals = 0;
    let timeouts = 0;
    let custom = 0;

    // Count element cleanups
    for (const element of this.trackedElements) {
      const entries = this.elementCleanups.get(element);
      if (entries) {
        for (const entry of entries) {
          switch (entry.type) {
            case 'listener':
              listeners++;
              break;
            case 'observer':
              observers++;
              break;
            case 'interval':
              intervals++;
              break;
            case 'timeout':
              timeouts++;
              break;
            case 'custom':
              custom++;
              break;
          }
        }
      }
    }

    // Count global cleanups by type
    for (const entry of this.globalCleanups) {
      switch (entry.type) {
        case 'listener':
          listeners++;
          break;
        case 'observer':
          observers++;
          break;
        case 'interval':
          intervals++;
          break;
        case 'timeout':
          timeouts++;
          break;
        case 'custom':
          custom++;
          break;
      }
    }

    return {
      elementsTracked: this.trackedElements.size,
      listeners,
      observers,
      intervals,
      timeouts,
      custom,
      global: this.globalCleanups.length,
    };
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

/**
 * Create a cleanup registry with auto-cleanup on DOM removal
 * Sets up a MutationObserver on the document body to automatically
 * clean up resources when elements are removed from the DOM.
 */
export function createAutoCleanupRegistry(options?: {
  debug?: boolean;
  root?: Element;
}): CleanupRegistry {
  const registry = new CleanupRegistry(options);

  // Only set up auto-cleanup in browser environment
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
    return registry;
  }

  const root = options?.root ?? document.body;

  const observer = new MutationObserver(mutations => {
    const removedElements: Element[] = [];
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        if (node instanceof Element) {
          removedElements.push(node);
        }
      }
    }
    if (removedElements.length > 0) {
      // Defer cleanup to distinguish moves (insertBefore) from true removals.
      // After a microtask, moved elements will be re-connected to the DOM.
      queueMicrotask(() => {
        for (const element of removedElements) {
          if (!element.isConnected) {
            registry.cleanupElementTree(element);
          }
        }
      });
    }
  });

  observer.observe(root, { childList: true, subtree: true });

  // Register the observer itself for cleanup
  registry.registerGlobal(() => observer.disconnect(), 'observer', 'Auto-cleanup MutationObserver');

  return registry;
}
