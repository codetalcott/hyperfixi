/**
 * HyperFixi Analytics Browser Bundle
 *
 * This bundle provides analytics functionality for browser environments.
 * It exposes the analytics API as `window.HyperFixiAnalytics`.
 *
 * Usage:
 * ```html
 * <script src="hyperfixi-browser.js"></script>
 * <script src="analytics-browser.js"></script>
 * <script>
 *   const analytics = await HyperFixiAnalytics.quickStartAnalytics({});
 *   HyperFixiAnalytics.integrateWithHyperFixi(hyperfixi, analytics);
 * </script>
 * ```
 */

// Re-export main analytics functions
export {
  createAnalyticsSystem,
  quickStartAnalytics,
  integrateWithHyperFixi,
  createTrackedCompile,
  type HyperFixiIntegrationOptions,
  VERSION,
  DEFAULT_ANALYTICS_CONFIG,
} from './index';

// Re-export tracker
export {
  AnalyticsTracker,
  createAnalyticsTracker,
  getTracker,
  initAnalytics,
} from './tracker';

// Re-export collector
export {
  EventCollector,
  createEventCollector,
} from './collector';

// Re-export types
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsConfig,
  AnalyticsMetrics,
  AnalyticsSession,
  AnalyticsCollector,
  AnalyticsStorage,
  AnalyticsQuery,
} from './types';

/**
 * Options for in-memory storage
 */
export interface InMemoryStorageOptions {
  /** Maximum number of events to store (default: 1000) */
  maxEvents?: number;
  /** Time-to-live in milliseconds - events older than this are auto-pruned (default: 1 hour) */
  ttlMs?: number;
  /** How often to run automatic cleanup in ms (default: 60000 = 1 minute) */
  cleanupIntervalMs?: number;
}

/**
 * Creates an in-memory storage with automatic cleanup to prevent memory leaks.
 *
 * Features:
 * - Automatic pruning when maxEvents is exceeded (removes oldest first)
 * - TTL-based expiration of old events
 * - Periodic cleanup interval
 * - Manual cleanup methods
 */
export function createInMemoryStorage(options: InMemoryStorageOptions = {}) {
  const {
    maxEvents = 1000,
    ttlMs = 60 * 60 * 1000, // 1 hour default
    cleanupIntervalMs = 60 * 1000, // 1 minute default
  } = options;

  let events: import('./types').AnalyticsEvent[] = [];
  let cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // Prune expired events based on TTL
  function pruneExpired(): number {
    const now = Date.now();
    const cutoff = now - ttlMs;
    const before = events.length;
    events = events.filter(e => e.timestamp >= cutoff);
    return before - events.length;
  }

  // Enforce max events limit (removes oldest first)
  function enforceMaxEvents(): number {
    if (events.length <= maxEvents) return 0;
    const excess = events.length - maxEvents;
    events = events.slice(excess);
    return excess;
  }

  // Run full cleanup
  function cleanup(): { expired: number; excess: number } {
    const expired = pruneExpired();
    const excess = enforceMaxEvents();
    return { expired, excess };
  }

  // Start automatic cleanup interval
  function startAutoCleanup(): void {
    if (cleanupTimer) return;
    cleanupTimer = setInterval(cleanup, cleanupIntervalMs);
  }

  // Stop automatic cleanup
  function stopAutoCleanup(): void {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }

  // Start auto-cleanup by default
  if (typeof window !== 'undefined') {
    startAutoCleanup();
  }

  return {
    async store(event: import('./types').AnalyticsEvent): Promise<void> {
      events.push(event);
      enforceMaxEvents(); // Enforce limit on each store
    },

    async storeBatch(batch: import('./types').AnalyticsEvent[]): Promise<void> {
      events.push(...batch);
      enforceMaxEvents();
    },

    async query(query: import('./types').AnalyticsQuery): Promise<import('./types').AnalyticsEvent[]> {
      let result = [...events];
      if (query.eventTypes?.length) {
        result = result.filter(e => query.eventTypes!.includes(e.type));
      }
      if (query.startTime) {
        result = result.filter(e => e.timestamp >= query.startTime!);
      }
      if (query.endTime) {
        result = result.filter(e => e.timestamp <= query.endTime!);
      }
      if (query.limit) {
        result = result.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit);
      }
      return result;
    },

    async aggregate(): Promise<Record<string, number>> {
      const counts: Record<string, number> = {};
      for (const event of events) {
        counts[event.type] = (counts[event.type] ?? 0) + 1;
      }
      return counts;
    },

    async delete(query: import('./types').AnalyticsQuery): Promise<number> {
      const initial = events.length;

      // If no filters, clear all
      if (!query.eventTypes?.length && !query.startTime && !query.endTime) {
        events = [];
        return initial;
      }

      // Filter out matching events (delete those that match the query)
      events = events.filter(e => {
        // Keep event if it doesn't match any of the query criteria
        if (query.eventTypes?.length && query.eventTypes.includes(e.type)) return false;
        if (query.startTime && e.timestamp >= query.startTime) {
          if (!query.endTime || e.timestamp <= query.endTime) return false;
        }
        return true;
      });

      return initial - events.length;
    },

    // Helper to get all events
    getAll(): import('./types').AnalyticsEvent[] {
      return [...events];
    },

    // Helper to clear all events
    clear(): void {
      events = [];
    },

    // Get current event count
    size(): number {
      return events.length;
    },

    // Manual cleanup - prune expired and enforce limits
    cleanup,

    // Start/stop automatic cleanup
    startAutoCleanup,
    stopAutoCleanup,

    // Destroy storage and stop cleanup
    destroy(): void {
      stopAutoCleanup();
      events = [];
    },

    // Get storage stats
    stats(): { count: number; oldestTimestamp: number | null; newestTimestamp: number | null } {
      const oldest = events[0];
      const newest = events[events.length - 1];
      return {
        count: events.length,
        oldestTimestamp: oldest?.timestamp ?? null,
        newestTimestamp: newest?.timestamp ?? null,
      };
    },
  };
}
