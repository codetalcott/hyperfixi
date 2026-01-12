/**
 * Analytics System for HyperFixi Applications
 * 
 * Provides comprehensive behavior analytics and instrumentation including:
 * - Event tracking and collection
 * - Performance monitoring
 * - User behavior analysis
 * - Real-time dashboards
 * - Alert system
 */

// Core exports
export { AnalyticsTracker, createAnalyticsTracker, getTracker, initAnalytics } from './tracker';
export { EventCollector, createEventCollector } from './collector';

// Import for local use
import { createAnalyticsTracker } from './tracker';
import { createEventCollector } from './collector';

// Enhanced Pattern exports
export {
  TypedAnalyticsContextImplementation,
  createAnalyticsContext,
  createEnhancedAnalytics,
  enhancedAnalyticsImplementation,
  EnhancedAnalyticsInputSchema,
  EnhancedAnalyticsOutputSchema,
  type EnhancedAnalyticsInput,
  type EnhancedAnalyticsOutput
} from './enhanced-analytics';

// Type exports
export type {
  // Event types
  AnalyticsEvent,
  AnalyticsEventType,
  HyperscriptCompilationEvent,
  HyperscriptExecutionEvent,
  ElementInteractionEvent,
  PerformanceTimingEvent,
  UserActionEvent,
  EventMetadata,
  
  // Configuration types
  AnalyticsConfig,
  AnalyticsFilter,
  AnalyticsEnricher,
  
  // Session types
  AnalyticsSession,
  SessionMetadata,
  
  // Metrics types
  AnalyticsMetrics,
  
  // Dashboard types
  DashboardConfig,
  DashboardWidget,
  DashboardFilter,
  WidgetConfig,
  
  // Infrastructure types
  AnalyticsCollector,
  AnalyticsStorage,
  AnalyticsQuery,
  AggregationQuery,
  AnalyticsSubscription,
  AnalyticsExportConfig,
  
  // Alert types
  AnalyticsAlert,
  AlertAction,
  
  // Visualization types
  HeatMapDataPoint,
  ConversionFunnelStep,
  ABTestConfig,
  ABTestVariant,
} from './types';

/**
 * Create a complete analytics system
 */
export function createAnalyticsSystem(options: {
  storage: import('./types').AnalyticsStorage;
  tracker?: Partial<import('./types').AnalyticsConfig>;
  collector?: {
    batchSize?: number;
    flushInterval?: number;
    maxBufferSize?: number;
    alerting?: {
      enabled?: boolean;
      checkInterval?: number;
    };
    realtime?: {
      enabled?: boolean;
      maxSubscriptions?: number;
    };
  };
}) {
  const tracker = createAnalyticsTracker(options.tracker);
  const collector = createEventCollector(options.storage, options.collector ? {
    ...(options.collector.batchSize !== undefined && { batchSize: options.collector.batchSize }),
    ...(options.collector.flushInterval !== undefined && { flushInterval: options.collector.flushInterval }),
    ...(options.collector.maxBufferSize !== undefined && { maxBufferSize: options.collector.maxBufferSize }),
    ...(options.collector.alerting && options.collector.alerting.enabled !== undefined && options.collector.alerting.checkInterval !== undefined ? { alerting: options.collector.alerting as { enabled: boolean; checkInterval: number } } : {}),
    ...(options.collector.realtime && options.collector.realtime.enabled !== undefined && options.collector.realtime.maxSubscriptions !== undefined ? { realtime: options.collector.realtime as { enabled: boolean; maxSubscriptions: number } } : {}),
  } : undefined);

  return {
    tracker,
    collector,
    
    // Convenience methods
    track: {
      compilation: (data: import('./types').HyperscriptCompilationEvent['data']) => 
        tracker.trackCompilation(data),
      execution: (data: import('./types').HyperscriptExecutionEvent['data']) => 
        tracker.trackExecution(data),
      interaction: (data: import('./types').ElementInteractionEvent['data']) => 
        tracker.trackInteraction(data),
      performance: (data: import('./types').PerformanceTimingEvent['data']) => 
        tracker.trackPerformance(data),
      userAction: (data: import('./types').UserActionEvent['data']) => 
        tracker.trackUserAction(data),
      custom: (type: import('./types').AnalyticsEventType, data: Record<string, any>) => 
        tracker.trackCustomEvent(type, data),
      error: (error: Error, context?: Record<string, any>) => 
        tracker.trackError(error, context),
    },
    
    // Query methods
    query: (query: import('./types').AnalyticsQuery) => collector.query(query),
    aggregate: (query: import('./types').AggregationQuery) => collector.aggregate(query),
    getMetrics: () => collector.getMetrics(),
    
    // Real-time methods
    subscribe: (query: import('./types').AnalyticsQuery, callback: (events: import('./types').AnalyticsEvent[]) => void) => 
      collector.subscribe(query, callback),
    unsubscribe: (subscriptionId: string) => collector.unsubscribe(subscriptionId),
    
    // Alert methods
    addAlert: (alert: import('./types').AnalyticsAlert) => collector.addAlert(alert),
    removeAlert: (alertId: string) => collector.removeAlert(alertId),
    
    // Session methods
    setUserId: (userId: string) => tracker.setUserId(userId),
    setTenantId: (tenantId: string) => tracker.setTenantId(tenantId),
    getSession: () => tracker.getSession(),
    
    // Configuration methods
    updateConfig: (config: Partial<import('./types').AnalyticsConfig>) => tracker.updateConfig(config),
    addFilter: (filter: import('./types').AnalyticsFilter) => tracker.addFilter(filter),
    addEnricher: (enricher: import('./types').AnalyticsEnricher) => tracker.addEnricher(enricher),
    
    // Lifecycle methods
    flush: () => tracker.flush(),
    destroy: () => {
      tracker.destroy();
      collector.destroy();
    },
  };
}

/**
 * Quick start function for basic analytics setup
 */
export async function quickStartAnalytics(options: {
  apiEndpoint?: string;
  trackingId?: string;
  events?: {
    compilation?: boolean;
    execution?: boolean;
    interactions?: boolean;
    performance?: boolean;
    errors?: boolean;
  };
  privacy?: {
    anonymizeIPs?: boolean;
    respectDNT?: boolean;
    cookieConsent?: boolean;
  };
}) {
  // Create simple in-memory storage for demo purposes
  const storage: import('./types').AnalyticsStorage & { events: import('./types').AnalyticsEvent[] } = {
    events: [] as import('./types').AnalyticsEvent[],

    async store(event) {
      this.events.push(event);
    },
    
    async storeBatch(events) {
      this.events.push(...events);
    },
    
    async query(query) {
      let filtered = this.events;
      
      if (query.eventTypes) {
        filtered = filtered.filter(e => query.eventTypes!.includes(e.type));
      }
      
      if (query.startTime) {
        filtered = filtered.filter(e => e.timestamp >= query.startTime!);
      }
      
      if (query.endTime) {
        filtered = filtered.filter(e => e.timestamp <= query.endTime!);
      }
      
      if (query.userId) {
        filtered = filtered.filter(e => e.userId === query.userId);
      }
      
      if (query.tenantId) {
        filtered = filtered.filter(e => e.tenantId === query.tenantId);
      }
      
      if (query.sessionId) {
        filtered = filtered.filter(e => e.sessionId === query.sessionId);
      }
      
      if (query.filters) {
        filtered = filtered.filter(e => {
          for (const [key, value] of Object.entries(query.filters!)) {
            if (e.data[key] !== value) return false;
          }
          return true;
        });
      }
      
      if (query.orderBy) {
        filtered.sort((a, b) => {
          const aVal = (a as any)[query.orderBy!.field];
          const bVal = (b as any)[query.orderBy!.field];
          return query.orderBy!.direction === 'asc' ? aVal - bVal : bVal - aVal;
        });
      }
      
      if (query.offset) {
        filtered = filtered.slice(query.offset);
      }
      
      if (query.limit) {
        filtered = filtered.slice(0, query.limit);
      }
      
      return filtered;
    },
    
    async aggregate(query) {
      const events = await this.query(query);
      const result: any = {};
      
      for (const [key, aggregation] of Object.entries(query.aggregations)) {
        switch (aggregation.type) {
          case 'count':
            result[key] = events.length;
            break;
          case 'sum':
            if (aggregation.field) {
              result[key] = events.reduce((sum, e) => sum + (e.data[aggregation.field!] || 0), 0);
            }
            break;
          case 'avg':
            if (aggregation.field) {
              const values = events.map(e => e.data[aggregation.field!] || 0);
              result[key] = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
            }
            break;
          case 'min':
            if (aggregation.field) {
              const values = events.map(e => e.data[aggregation.field!] || 0);
              result[key] = values.length > 0 ? Math.min(...values) : 0;
            }
            break;
          case 'max':
            if (aggregation.field) {
              const values = events.map(e => e.data[aggregation.field!] || 0);
              result[key] = values.length > 0 ? Math.max(...values) : 0;
            }
            break;
        }
      }
      
      return result;
    },
    
    async delete(query) {
      const toDelete = await this.query(query);
      this.events = this.events.filter(e => !toDelete.includes(e));
      return toDelete.length;
    },
  };

  // Create analytics system
  const system = createAnalyticsSystem({
    storage,
    tracker: {
      ...(options.apiEndpoint && { apiEndpoint: options.apiEndpoint }),
      ...(options.trackingId && { trackingId: options.trackingId }),
      events: {
        compilation: true,
        execution: true,
        interactions: true,
        performance: true,
        errors: true,
        customEvents: true,
        ...options.events,
      },
      privacy: {
        anonymizeIPs: true,
        respectDNT: true,
        cookieConsent: false,
        ...options.privacy,
      },
    },
  });

  return system;
}

/**
 * Type for HyperFixi runtime with hooks support
 */
interface HyperFixiRuntime {
  registerHooks(name: string, hooks: RuntimeHooks): void;
  unregisterHooks(name: string): boolean;
}

/**
 * RuntimeHooks interface from @hyperfixi/core
 * Defined locally to avoid circular dependency issues
 */
interface RuntimeHooks {
  beforeExecute?: (ctx: HookContext) => void | Promise<void>;
  afterExecute?: (ctx: HookContext, result: unknown) => void | Promise<void>;
  onError?: (ctx: HookContext, error: Error) => void | Error | Promise<void | Error>;
  interceptCommand?: (commandName: string, ctx: HookContext) => boolean;
}

/**
 * HookContext interface from @hyperfixi/core
 */
interface HookContext {
  commandName: string;
  element: Element | null;
  args: unknown[];
  modifiers: Record<string, unknown>;
  event?: Event;
  executionContext: unknown;
}

/**
 * Integration options for HyperFixi analytics
 */
export interface HyperFixiIntegrationOptions {
  /**
   * Whether to track execution timing
   * @default true
   */
  trackTiming?: boolean;

  /**
   * Whether to include full script in execution events
   * @default false (privacy - scripts may contain sensitive data)
   */
  includeScriptContent?: boolean;

  /**
   * Maximum script length to include (if includeScriptContent is true)
   * @default 500
   */
  maxScriptLength?: number;
}

const DEFAULT_INTEGRATION_OPTIONS: HyperFixiIntegrationOptions = {
  trackTiming: true,
  includeScriptContent: false,
  maxScriptLength: 500,
};

/**
 * Summarize a result value for analytics (avoid serializing large objects)
 */
function summarizeResult(result: unknown): string | undefined {
  if (result === undefined || result === null) {
    return undefined;
  }

  if (typeof result === 'string') {
    return result.slice(0, 100);
  }

  if (typeof result === 'number' || typeof result === 'boolean') {
    return String(result);
  }

  if (Array.isArray(result)) {
    return `[Array(${result.length})]`;
  }

  if (typeof result === 'object') {
    return '[Object]';
  }

  return String(result).slice(0, 100);
}

/**
 * Integration with HyperFixi core runtime using the registerHooks API
 *
 * @param runtime - HyperFixi runtime instance (from createRuntime() or new Runtime())
 * @param analytics - Analytics system instance (from createAnalyticsSystem())
 * @param options - Integration options
 * @returns Cleanup function to unregister hooks
 *
 * @example
 * ```typescript
 * import { createRuntime } from '@hyperfixi/core';
 * import { createAnalyticsSystem, integrateWithHyperFixi } from '@hyperfixi/analytics';
 *
 * const runtime = createRuntime();
 * const analytics = createAnalyticsSystem({ storage: myStorage });
 *
 * const cleanup = integrateWithHyperFixi(runtime, analytics);
 *
 * // Later, to remove analytics hooks:
 * cleanup();
 * ```
 */
export function integrateWithHyperFixi(
  runtime: HyperFixiRuntime,
  analytics: ReturnType<typeof createAnalyticsSystem>,
  options: HyperFixiIntegrationOptions = {}
): () => void {
  const opts = { ...DEFAULT_INTEGRATION_OPTIONS, ...options };
  const HOOK_NAME = 'hyperfixi-analytics';

  // Timing tracking using WeakMap (same pattern as createTimingHooks in core)
  const startTimes = new WeakMap<object, number>();

  const hooks: RuntimeHooks = {
    beforeExecute: (ctx: HookContext) => {
      if (opts.trackTiming) {
        startTimes.set(ctx, performance.now());
      }
    },

    afterExecute: (ctx: HookContext, result: unknown) => {
      const startTime = startTimes.get(ctx);
      const executionTime = startTime !== undefined
        ? performance.now() - startTime
        : 0;

      if (startTime !== undefined) {
        startTimes.delete(ctx);
      }

      // Extract script content from args if available
      let script = '';
      if (opts.includeScriptContent && ctx.args.length > 0) {
        const firstArg = ctx.args[0];
        if (typeof firstArg === 'string') {
          script = firstArg.slice(0, opts.maxScriptLength);
        }
      }

      // Extract element information safely
      const elementTag = ctx.element?.tagName?.toLowerCase() || 'unknown';
      const elementId = ctx.element?.id || '';
      const elementClasses = ctx.element?.className || '';

      analytics.track.execution({
        script,
        element: elementId || elementClasses || elementTag,
        event: ctx.event?.type || 'direct',
        executionTime,
        success: true,
        result: summarizeResult(result),
      });
    },

    onError: (ctx: HookContext, error: Error) => {
      const startTime = startTimes.get(ctx);
      const executionTime = startTime !== undefined
        ? performance.now() - startTime
        : 0;

      if (startTime !== undefined) {
        startTimes.delete(ctx);
      }

      // Extract element information
      const elementTag = ctx.element?.tagName?.toLowerCase() || 'unknown';
      const elementId = ctx.element?.id || '';
      const elementClasses = ctx.element?.className || '';

      // Track as failed execution
      analytics.track.execution({
        script: '',
        element: elementId || elementClasses || elementTag,
        event: ctx.event?.type || 'direct',
        executionTime,
        success: false,
        error: error.message,
      });

      // Also track as error event with full context
      analytics.track.error(error, {
        commandName: ctx.commandName,
        element: elementTag,
        elementId,
        eventType: ctx.event?.type,
        modifiers: ctx.modifiers,
      });

      // Return the error unchanged (don't transform it)
      return error;
    },
  };

  // Register hooks with the runtime
  runtime.registerHooks(HOOK_NAME, hooks);

  // Return cleanup function
  return () => {
    runtime.unregisterHooks(HOOK_NAME);
  };
}

/**
 * Create a wrapped compile function that tracks compilation analytics
 *
 * @param compile - The hyperfixi.compile function
 * @param analytics - Analytics system instance
 * @returns Wrapped compile function that tracks compilation events
 *
 * @example
 * ```typescript
 * import { createAnalyticsSystem, createTrackedCompile } from '@hyperfixi/analytics';
 *
 * const analytics = createAnalyticsSystem({ storage: myStorage });
 * const trackedCompile = createTrackedCompile(hyperfixi.compile, analytics);
 *
 * // Now use trackedCompile instead of hyperfixi.compile
 * const result = trackedCompile('toggle .active');
 * ```
 */
export function createTrackedCompile<
  TCompile extends (code: string, options?: unknown) => unknown
>(
  compile: TCompile,
  analytics: ReturnType<typeof createAnalyticsSystem>
): TCompile {
  return ((code: string, options?: unknown) => {
    const startTime = performance.now();
    const result = compile(code, options) as Record<string, unknown>;
    const compilationTime = performance.now() - startTime;

    // Extract metadata safely
    const metadata = (result?.metadata || {}) as Record<string, unknown>;

    analytics.track.compilation({
      script: code.slice(0, 500), // Limit for privacy
      compiledLength: 0, // AST doesn't have a "length"
      compilationTime: (result?.compilationTime as number) || compilationTime,
      complexity: (metadata?.complexity as number) || 0,
      features: (metadata?.features as string[]) || [],
      selectors: (metadata?.selectors as string[]) || [],
      commands: (metadata?.commands as string[]) || [],
      errors: ((result?.errors || []) as Array<{ message?: string }>).map(
        (e) => e?.message || String(e)
      ),
      warnings: (metadata?.warnings as string[]) || [],
    });

    return result;
  }) as TCompile;
}

/**
 * Create analytics middleware for Express
 */
export function createExpressAnalyticsMiddleware(analytics: ReturnType<typeof createAnalyticsSystem>) {
  return function analyticsMiddleware(req: any, res: any, next: any) {
    // Track page view
    analytics.track.custom('page:view', {
      url: req.url,
      method: req.method,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer,
      ip: req.ip,
    });

    // Set tenant ID if available
    if (req.tenant?.id) {
      analytics.setTenantId(req.tenant.id);
    }

    // Set user ID if available
    if (req.user?.id) {
      analytics.setUserId(req.user.id);
    }

    // Attach analytics to request
    req.analytics = analytics;

    next();
  };
}

/**
 * Create analytics plugin for Elysia
 */
export function createElysiaAnalyticsPlugin(analytics: ReturnType<typeof createAnalyticsSystem>) {
  return function analyticsPlugin(app: any) {
    return app
      .derive(({ request, headers }: any) => {
        // Track page view
        analytics.track.custom('page:view', {
          url: request.url,
          method: request.method,
          userAgent: headers['user-agent'],
          referrer: headers.referer,
        });

        return { analytics };
      });
  };
}

/**
 * Version information
 */
export const VERSION = '0.1.0';

/**
 * Default configurations
 */
export const DEFAULT_ANALYTICS_CONFIG = {
  enabled: true,
  batchSize: 50,
  batchTimeout: 5000,
  sampling: {
    enabled: false,
    rate: 1.0,
  },
  privacy: {
    anonymizeIPs: true,
    respectDNT: true,
    cookieConsent: false,
  },
  events: {
    compilation: true,
    execution: true,
    interactions: true,
    performance: true,
    errors: true,
    customEvents: true,
  },
};