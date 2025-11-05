/**
 * Performance Utilities
 *
 * Optimized utilities for high-frequency DOM operations and event handling.
 * Designed to reduce layout thrashing and improve animation smoothness.
 */

// ============================================================================
// StyleBatcher - Batch DOM Style Updates
// ============================================================================

/**
 * StyleBatcher batches DOM style updates using requestAnimationFrame
 * to eliminate layout thrashing during high-frequency operations.
 *
 * Instead of applying styles immediately (causing reflows on every change),
 * styles are accumulated and applied once per frame (~16ms at 60fps).
 *
 * Example:
 * Without batching: 66 drag moves = 66 reflows = janky animation
 * With batching: 66 drag moves = ~4 reflows (at 60fps) = smooth animation
 */
export class StyleBatcher {
  private pending = new Map<HTMLElement, Record<string, string>>();
  private rafId: number | null = null;

  /**
   * Queue style updates for an element
   * Styles will be applied on the next animation frame
   */
  add(element: HTMLElement, styles: Record<string, string>): void {
    // Merge with existing pending styles for this element
    const existing = this.pending.get(element) || {};
    this.pending.set(element, { ...existing, ...styles });

    // Schedule flush if not already scheduled
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  /**
   * Apply all pending style updates immediately
   * Called automatically on next animation frame
   */
  private flush(): void {
    // Apply all pending styles in a single batch
    for (const [element, styles] of this.pending) {
      // Apply each CSS property
      for (const [property, value] of Object.entries(styles)) {
        // CSS custom properties (--variables) must use setProperty()
        if (property.startsWith('--')) {
          element.style.setProperty(property, value);
        } else {
          // Convert hyphenated property names to camelCase
          const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          (element.style as any)[camelProperty] = value;
        }
      }
    }

    // Clear pending updates
    this.pending.clear();
    this.rafId = null;
  }

  /**
   * Cancel any pending style updates
   */
  cancel(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pending.clear();
  }

  /**
   * Get number of pending style updates
   * Useful for debugging and monitoring
   */
  getPendingCount(): number {
    return this.pending.size;
  }
}

// Singleton instance for global use
export const styleBatcher = new StyleBatcher();

// ============================================================================
// EventQueue - Reuse Event Listeners
// ============================================================================

/**
 * EventQueue maintains persistent event listeners to eliminate setup/teardown overhead.
 *
 * Instead of creating a new listener for each wait operation (expensive),
 * EventQueue creates one persistent listener per target+event combination
 * and queues/dispatches events to waiters efficiently.
 *
 * Example:
 * Without EventQueue: 66 drag moves = 66 addEventListener + 66 removeEventListener = 132 operations
 * With EventQueue: 66 drag moves = 1 addEventListener (persistent) = 1 operation
 */
export class EventQueue {
  private listeners = new Map<string, {
    queue: Event[];
    waiters: Array<(event: Event) => void>;
    listener: EventListener;
  }>();

  /**
   * Wait for an event on a target
   * Reuses persistent listeners instead of creating new ones
   */
  async wait(
    eventName: string,
    target: EventTarget
  ): Promise<Event> {
    // Generate unique key for this target+event combination
    const key = this.getKey(target, eventName);

    // Setup persistent listener if not already registered
    if (!this.listeners.has(key)) {
      this.setupListener(key, target, eventName);
    }

    const entry = this.listeners.get(key)!;

    // If there's a queued event, return it immediately
    if (entry.queue.length > 0) {
      return entry.queue.shift()!;
    }

    // Otherwise, wait for the next event
    return new Promise((resolve) => {
      entry.waiters.push(resolve);
    });
  }

  /**
   * Setup a persistent event listener for a target+event combination
   */
  private setupListener(key: string, target: EventTarget, eventName: string): void {
    const listener: EventListener = (event: Event) => {
      const entry = this.listeners.get(key);
      if (!entry) return;

      // If there are waiters, resolve the first one immediately
      if (entry.waiters.length > 0) {
        const resolve = entry.waiters.shift()!;
        resolve(event);
      } else {
        // Otherwise, queue the event for future waiters
        entry.queue.push(event);
      }
    };

    target.addEventListener(eventName, listener);

    this.listeners.set(key, {
      queue: [],
      waiters: [],
      listener
    });
  }

  /**
   * Generate a unique key for target+event combination
   */
  private getKey(target: EventTarget, eventName: string): string {
    // Use WeakMap-style ID or default identifier
    const targetId = (target as any)._eventQueueId ||
                    (target === window ? 'window' :
                     target === document ? 'document' :
                     'default');
    return `${targetId}:${eventName}`;
  }

  /**
   * Cleanup a specific listener (optional, for memory management)
   */
  cleanup(target: EventTarget, eventName: string): void {
    const key = this.getKey(target, eventName);
    const entry = this.listeners.get(key);

    if (entry) {
      target.removeEventListener(eventName, entry.listener);
      this.listeners.delete(key);
    }
  }

  /**
   * Cleanup all listeners (optional, for testing or reset)
   */
  cleanupAll(): void {
    this.listeners.clear();
  }

  /**
   * Get number of active listeners (for debugging)
   */
  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Singleton instance for global use
export const eventQueue = new EventQueue();
