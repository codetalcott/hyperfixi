/**
 * Analytics Collector
 * Server-side event collection and processing
 */

import type {
  AnalyticsEvent,
  AnalyticsCollector,
  AnalyticsStorage,
  AnalyticsQuery,
  AggregationQuery,
  AnalyticsMetrics,
  AnalyticsSession,
  AnalyticsSubscription,
  AnalyticsAlert,
  AlertAction,
} from './types';

/**
 * Event buffer for batch processing
 */
interface EventBuffer {
  events: AnalyticsEvent[];
  lastFlush: number;
  size: number;
}

/**
 * Collector configuration
 */
interface CollectorConfig {
  batchSize: number;
  flushInterval: number;
  maxBufferSize: number;
  alerting: {
    enabled: boolean;
    checkInterval: number;
  };
  realtime: {
    enabled: boolean;
    maxSubscriptions: number;
  };
}

/**
 * Default collector configuration
 */
const DEFAULT_COLLECTOR_CONFIG: CollectorConfig = {
  batchSize: 100,
  flushInterval: 5000,
  maxBufferSize: 10000,
  alerting: {
    enabled: true,
    checkInterval: 60000, // 1 minute
  },
  realtime: {
    enabled: true,
    maxSubscriptions: 1000,
  },
};

/**
 * Analytics event collector
 */
export class EventCollector implements AnalyticsCollector {
  private config: CollectorConfig;
  private storage: AnalyticsStorage;
  private buffer: EventBuffer;
  private flushTimer: NodeJS.Timeout | null = null;
  private subscriptions = new Map<string, AnalyticsSubscription>();
  private alerts: AnalyticsAlert[] = [];
  private alertTimer: NodeJS.Timeout | null = null;

  constructor(storage: AnalyticsStorage, config: Partial<CollectorConfig> = {}) {
    this.config = { ...DEFAULT_COLLECTOR_CONFIG, ...config };
    this.storage = storage;
    this.buffer = {
      events: [],
      lastFlush: Date.now(),
      size: 0,
    };

    this.startFlushTimer();

    if (this.config.alerting.enabled) {
      this.startAlertTimer();
    }
  }

  /**
   * Collect a single event
   */
  async collect(event: AnalyticsEvent): Promise<void> {
    // Add to buffer
    this.buffer.events.push(event);
    this.buffer.size++;

    // Check if we need to flush
    if (this.buffer.size >= this.config.batchSize) {
      await this.flush();
    }

    // Notify real-time subscribers
    if (this.config.realtime.enabled) {
      this.notifySubscribers([event]);
    }
  }

  /**
   * Collect multiple events
   */
  async batch(events: AnalyticsEvent[]): Promise<void> {
    // Add to buffer
    this.buffer.events.push(...events);
    this.buffer.size += events.length;

    // Check if we need to flush
    if (this.buffer.size >= this.config.batchSize) {
      await this.flush();
    }

    // Notify real-time subscribers
    if (this.config.realtime.enabled) {
      this.notifySubscribers(events);
    }
  }

  /**
   * Flush buffered events to storage
   */
  async flush(): Promise<void> {
    if (this.buffer.events.length === 0) return;

    const eventsToFlush = [...this.buffer.events];
    this.buffer.events = [];
    this.buffer.size = 0;
    this.buffer.lastFlush = Date.now();

    try {
      await this.storage.storeBatch(eventsToFlush);
    } catch (error) {
      console.error('Failed to flush events to storage:', error);
      // Re-add events to buffer for retry
      this.buffer.events.unshift(...eventsToFlush);
      this.buffer.size += eventsToFlush.length;
      throw error;
    }
  }

  /**
   * Get analytics metrics
   */
  async getMetrics(): Promise<AnalyticsMetrics> {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    // Get recent events for metrics calculation
    const recentEvents = await this.storage.query({
      startTime: dayAgo,
      endTime: now,
    });

    // Calculate metrics
    const metrics: AnalyticsMetrics = {
      events: {
        total: recentEvents.length,
        byType: this.calculateEventsByType(recentEvents),
        byHour: this.calculateEventsByHour(recentEvents),
        byDay: this.calculateEventsByDay(recentEvents),
      },
      sessions: await this.calculateSessionMetrics(recentEvents),
      performance: await this.calculatePerformanceMetrics(recentEvents),
      interactions: await this.calculateInteractionMetrics(recentEvents),
      users: await this.calculateUserMetrics(recentEvents),
    };

    return metrics;
  }

  /**
   * Query events
   */
  async query(query: AnalyticsQuery): Promise<AnalyticsEvent[]> {
    return this.storage.query(query);
  }

  /**
   * Aggregate events
   */
  async aggregate(query: AggregationQuery): Promise<any> {
    return this.storage.aggregate(query);
  }

  /**
   * Subscribe to real-time events
   */
  subscribe(query: AnalyticsQuery, callback: (events: AnalyticsEvent[]) => void): string {
    if (!this.config.realtime.enabled) {
      throw new Error('Real-time subscriptions are disabled');
    }

    if (this.subscriptions.size >= this.config.realtime.maxSubscriptions) {
      throw new Error('Maximum number of subscriptions reached');
    }

    const subscription: AnalyticsSubscription = {
      id: this.generateSubscriptionId(),
      query,
      callback,
      active: true,
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription.id;
  }

  /**
   * Unsubscribe from real-time events
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Add alert configuration
   */
  addAlert(alert: AnalyticsAlert): void {
    this.alerts.push(alert);
  }

  /**
   * Remove alert configuration
   */
  removeAlert(alertId: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.events.length > 0) {
        this.flush().catch(error => {
          console.error('Scheduled flush failed:', error);
        });
      }
    }, this.config.flushInterval);
  }

  /**
   * Start alert checking timer
   */
  private startAlertTimer(): void {
    this.alertTimer = setInterval(() => {
      this.checkAlerts().catch(error => {
        console.error('Alert checking failed:', error);
      });
    }, this.config.alerting.checkInterval);
  }

  /**
   * Notify real-time subscribers
   */
  private notifySubscribers(events: AnalyticsEvent[]): void {
    for (const subscription of this.subscriptions.values()) {
      if (!subscription.active) continue;

      // Filter events based on subscription query
      const matchingEvents = events.filter(event =>
        this.eventMatchesQuery(event, subscription.query)
      );

      if (matchingEvents.length > 0) {
        try {
          subscription.callback(matchingEvents);
        } catch (error) {
          console.error(`Subscription callback error:`, error);
          subscription.active = false;
        }
      }
    }
  }

  /**
   * Check if event matches query
   */
  private eventMatchesQuery(event: AnalyticsEvent, query: AnalyticsQuery): boolean {
    // Check event types
    if (query.eventTypes && !query.eventTypes.includes(event.type)) {
      return false;
    }

    // Check time range
    if (query.startTime && event.timestamp < query.startTime) {
      return false;
    }

    if (query.endTime && event.timestamp > query.endTime) {
      return false;
    }

    // Check user ID
    if (query.userId && event.userId !== query.userId) {
      return false;
    }

    // Check tenant ID
    if (query.tenantId && event.tenantId !== query.tenantId) {
      return false;
    }

    // Check session ID
    if (query.sessionId && event.sessionId !== query.sessionId) {
      return false;
    }

    // Check custom filters
    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        if (event.data[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check alerts
   */
  private async checkAlerts(): Promise<void> {
    for (const alert of this.alerts) {
      if (!alert.enabled) continue;

      try {
        const shouldTrigger = await this.evaluateAlertCondition(alert);
        if (shouldTrigger) {
          await this.triggerAlert(alert);
        }
      } catch (error) {
        console.error(`Failed to check alert ${alert.id}:`, error);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private async evaluateAlertCondition(alert: AnalyticsAlert): Promise<boolean> {
    const { condition } = alert;
    const endTime = Date.now();
    const startTime = endTime - condition.timeWindow;

    // Get metric value
    let metricValue: number;

    switch (condition.metric) {
      case 'error_rate':
        metricValue = await this.calculateErrorRate(startTime, endTime);
        break;
      case 'event_count':
        metricValue = await this.calculateEventCount(startTime, endTime);
        break;
      case 'avg_execution_time':
        metricValue = await this.calculateAvgExecutionTime(startTime, endTime);
        break;
      default:
        return false;
    }

    // Evaluate condition
    switch (condition.operator) {
      case '>':
        return metricValue > condition.threshold;
      case '<':
        return metricValue < condition.threshold;
      case '>=':
        return metricValue >= condition.threshold;
      case '<=':
        return metricValue <= condition.threshold;
      case '=':
        return metricValue === condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(alert: AnalyticsAlert): Promise<void> {
    for (const action of alert.actions) {
      try {
        await this.executeAlertAction(action, alert);
      } catch (error) {
        console.error(`Failed to execute alert action:`, error);
      }
    }
  }

  /**
   * Execute alert action
   */
  private async executeAlertAction(action: AlertAction, alert: AnalyticsAlert): Promise<void> {
    switch (action.type) {
      case 'email':
        await this.sendEmailAlert(action.config, alert);
        break;
      case 'webhook':
        await this.sendWebhookAlert(action.config, alert);
        break;
      case 'slack':
        await this.sendSlackAlert(action.config, alert);
        break;
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(config: Record<string, any>, alert: AnalyticsAlert): Promise<void> {
    // Email sending implementation would go here
    console.log(`Email alert for ${alert.name}:`, config);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(
    config: Record<string, any>,
    alert: AnalyticsAlert
  ): Promise<void> {
    if (!config.url) return;

    await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        alert: alert.name,
        condition: alert.condition,
        timestamp: Date.now(),
      }),
    });
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(config: Record<string, any>, alert: AnalyticsAlert): Promise<void> {
    if (!config.webhook_url) return;

    await fetch(config.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `Alert: ${alert.name}`,
        attachments: [
          {
            color: 'danger',
            fields: [
              {
                title: 'Condition',
                value: `${alert.condition.metric} ${alert.condition.operator} ${alert.condition.threshold}`,
                short: true,
              },
              {
                title: 'Time',
                value: new Date().toISOString(),
                short: true,
              },
            ],
          },
        ],
      }),
    });
  }

  /**
   * Calculate metrics helpers
   */
  private calculateEventsByType(events: AnalyticsEvent[]): Record<string, number> {
    const byType: Record<string, number> = {};

    for (const event of events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
    }

    return byType;
  }

  private calculateEventsByHour(events: AnalyticsEvent[]): Record<string, number> {
    const byHour: Record<string, number> = {};

    for (const event of events) {
      const hour = new Date(event.timestamp).toISOString().substring(0, 13);
      byHour[hour] = (byHour[hour] || 0) + 1;
    }

    return byHour;
  }

  private calculateEventsByDay(events: AnalyticsEvent[]): Record<string, number> {
    const byDay: Record<string, number> = {};

    for (const event of events) {
      const day = new Date(event.timestamp).toISOString().substring(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }

    return byDay;
  }

  private async calculateSessionMetrics(
    events: AnalyticsEvent[]
  ): Promise<AnalyticsMetrics['sessions']> {
    const sessions = new Map<string, AnalyticsSession>();

    // Group events by session
    for (const event of events) {
      if (!sessions.has(event.sessionId)) {
        const session: AnalyticsSession = {
          id: event.sessionId,
          startTime: event.timestamp,
          events: [],
          metadata: {} as any,
        };
        if (event.userId !== undefined) {
          session.userId = event.userId;
        }
        if (event.tenantId !== undefined) {
          session.tenantId = event.tenantId;
        }
        sessions.set(event.sessionId, session);
      }

      const session = sessions.get(event.sessionId)!;
      session.events.push(event);

      if (event.timestamp < session.startTime) {
        session.startTime = event.timestamp;
      }

      if (!session.endTime || event.timestamp > session.endTime) {
        session.endTime = event.timestamp;
      }
    }

    // Calculate metrics
    const totalSessions = sessions.size;
    const activeSessions = Array.from(sessions.values()).filter(
      session => !session.endTime || Date.now() - session.endTime < 30 * 60 * 1000
    ).length;

    const durations = Array.from(sessions.values())
      .filter(session => session.endTime)
      .map(session => session.endTime! - session.startTime);

    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0;

    const bounceRate =
      Array.from(sessions.values()).filter(session => session.events.length === 1).length /
      totalSessions;

    return {
      total: totalSessions,
      active: activeSessions,
      averageDuration,
      bounceRate,
    };
  }

  private async calculatePerformanceMetrics(
    events: AnalyticsEvent[]
  ): Promise<AnalyticsMetrics['performance']> {
    const compilationEvents = events.filter(e => e.type === 'hyperscript:compiled');
    const executionEvents = events.filter(e => e.type === 'hyperscript:executed');
    const errorEvents = events.filter(e => e.type === 'hyperscript:error');

    const avgCompilationTime =
      compilationEvents.length > 0
        ? compilationEvents.reduce((sum, e) => sum + (e.data.compilationTime || 0), 0) /
          compilationEvents.length
        : 0;

    const avgExecutionTime =
      executionEvents.length > 0
        ? executionEvents.reduce((sum, e) => sum + (e.data.executionTime || 0), 0) /
          executionEvents.length
        : 0;

    const errorRate = events.length > 0 ? errorEvents.length / events.length : 0;

    const errorCounts: Record<string, number> = {};
    for (const error of errorEvents) {
      const message = error.data.message || 'Unknown error';
      errorCounts[message] = (errorCounts[message] || 0) + 1;
    }

    const topErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      averageCompilationTime: avgCompilationTime,
      averageExecutionTime: avgExecutionTime,
      errorRate,
      topErrors,
    };
  }

  private async calculateInteractionMetrics(
    events: AnalyticsEvent[]
  ): Promise<AnalyticsMetrics['interactions']> {
    const interactionEvents = events.filter(e => e.type === 'element:interaction');
    const clickEvents = interactionEvents.filter(e => e.data.eventType === 'click');

    const elementCounts: Record<string, number> = {};
    for (const interaction of interactionEvents) {
      const element = interaction.data.element || 'unknown';
      elementCounts[element] = (elementCounts[element] || 0) + 1;
    }

    const topElements = Object.entries(elementCounts)
      .map(([element, interactions]) => ({ element, interactions }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 10);

    return {
      totalClicks: clickEvents.length,
      topElements,
      conversionFunnels: {}, // Would implement funnel analysis
    };
  }

  private async calculateUserMetrics(events: AnalyticsEvent[]): Promise<AnalyticsMetrics['users']> {
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
    const pageViews = events.filter(e => e.type === 'page:view');

    const urlCounts: Record<string, number> = {};
    for (const pageView of pageViews) {
      const url = pageView.data.url || 'unknown';
      urlCounts[url] = (urlCounts[url] || 0) + 1;
    }

    const topPages = Object.entries(urlCounts)
      .map(([url, views]) => ({ url, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      total: uniqueUsers.size,
      returning: 0, // Would implement returning user detection
      newUsers: uniqueUsers.size,
      topPages,
    };
  }

  /**
   * Alert metric calculations
   */
  private async calculateErrorRate(startTime: number, endTime: number): Promise<number> {
    const events = await this.storage.query({ startTime, endTime });
    const errorEvents = events.filter(e => e.type === 'hyperscript:error');
    return events.length > 0 ? errorEvents.length / events.length : 0;
  }

  private async calculateEventCount(startTime: number, endTime: number): Promise<number> {
    const events = await this.storage.query({ startTime, endTime });
    return events.length;
  }

  private async calculateAvgExecutionTime(startTime: number, endTime: number): Promise<number> {
    const events = await this.storage.query({
      startTime,
      endTime,
      eventTypes: ['hyperscript:executed'],
    });

    if (events.length === 0) return 0;

    const totalTime = events.reduce((sum, e) => sum + (e.data.executionTime || 0), 0);
    return totalTime / events.length;
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Destroy collector
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.alertTimer) {
      clearInterval(this.alertTimer);
      this.alertTimer = null;
    }

    this.flush();
    this.subscriptions.clear();
  }
}

/**
 * Create event collector
 */
export function createEventCollector(
  storage: AnalyticsStorage,
  config: Partial<CollectorConfig> = {}
): EventCollector {
  return new EventCollector(storage, config);
}
