/**
 * Analytics Tracker
 * Client-side event tracking and data collection
 */

import type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsConfig,
  EventMetadata,
  AnalyticsSession,
  SessionMetadata,
  HyperscriptCompilationEvent,
  HyperscriptExecutionEvent,
  ElementInteractionEvent,
  PerformanceTimingEvent,
  UserActionEvent,
  AnalyticsFilter,
  AnalyticsEnricher,
} from './types';

/**
 * Default analytics configuration
 */
const DEFAULT_CONFIG: AnalyticsConfig = {
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
  filters: [],
  enrichers: [],
};

/**
 * Analytics tracker class
 */
export class AnalyticsTracker {
  private config: AnalyticsConfig;
  private session: AnalyticsSession;
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.session = this.createSession();

    if (this.shouldTrack()) {
      this.initialize();
    }
  }

  /**
   * Initialize the tracker
   */
  private initialize(): void {
    if (this.isInitialized) return;

    // Set up automatic event tracking
    this.setupAutoTracking();

    // Set up batch processing
    this.setupBatchProcessing();

    // Set up page visibility handling
    this.setupVisibilityHandling();

    this.isInitialized = true;
  }

  /**
   * Track a hyperscript compilation event
   */
  trackCompilation(data: HyperscriptCompilationEvent['data']): void {
    if (!this.config.events.compilation) return;

    const event: HyperscriptCompilationEvent = {
      id: this.generateEventId(),
      type: 'hyperscript:compiled',
      timestamp: Date.now(),
      sessionId: this.session.id,
      ...(this.session.userId && { userId: this.session.userId }),
      ...(this.session.tenantId && { tenantId: this.session.tenantId }),
      data,
      metadata: this.getEventMetadata(),
    };

    this.trackEvent(event);
  }

  /**
   * Track a hyperscript execution event
   */
  trackExecution(data: HyperscriptExecutionEvent['data']): void {
    if (!this.config.events.execution) return;

    const event: HyperscriptExecutionEvent = {
      id: this.generateEventId(),
      type: 'hyperscript:executed',
      timestamp: Date.now(),
      sessionId: this.session.id,
      ...(this.session.userId && { userId: this.session.userId }),
      ...(this.session.tenantId && { tenantId: this.session.tenantId }),
      data,
      metadata: this.getEventMetadata(),
    };

    this.trackEvent(event);
  }

  /**
   * Track an element interaction event
   */
  trackInteraction(data: ElementInteractionEvent['data']): void {
    if (!this.config.events.interactions) return;

    const event: ElementInteractionEvent = {
      id: this.generateEventId(),
      type: 'element:interaction',
      timestamp: Date.now(),
      sessionId: this.session.id,
      ...(this.session.userId && { userId: this.session.userId }),
      ...(this.session.tenantId && { tenantId: this.session.tenantId }),
      data,
      metadata: this.getEventMetadata(),
    };

    this.trackEvent(event);
  }

  /**
   * Track a performance timing event
   */
  trackPerformance(data: PerformanceTimingEvent['data']): void {
    if (!this.config.events.performance) return;

    const event: PerformanceTimingEvent = {
      id: this.generateEventId(),
      type: 'performance:timing',
      timestamp: Date.now(),
      sessionId: this.session.id,
      ...(this.session.userId && { userId: this.session.userId }),
      ...(this.session.tenantId && { tenantId: this.session.tenantId }),
      data,
      metadata: this.getEventMetadata(),
    };

    this.trackEvent(event);
  }

  /**
   * Track a user action event
   */
  trackUserAction(data: UserActionEvent['data']): void {
    if (!this.config.events.customEvents) return;

    const event: UserActionEvent = {
      id: this.generateEventId(),
      type: 'user:action',
      timestamp: Date.now(),
      sessionId: this.session.id,
      ...(this.session.userId && { userId: this.session.userId }),
      ...(this.session.tenantId && { tenantId: this.session.tenantId }),
      data,
      metadata: this.getEventMetadata(),
    };

    this.trackEvent(event);
  }

  /**
   * Track a custom event
   */
  trackCustomEvent(type: AnalyticsEventType, data: Record<string, any>): void {
    if (!this.config.events.customEvents) return;

    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      sessionId: this.session.id,
      ...(this.session.userId && { userId: this.session.userId }),
      ...(this.session.tenantId && { tenantId: this.session.tenantId }),
      data,
      metadata: this.getEventMetadata(),
    };

    this.trackEvent(event);
  }

  /**
   * Track an error event
   */
  trackError(error: Error, context?: Record<string, any>): void {
    if (!this.config.events.errors) return;

    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type: 'hyperscript:error',
      timestamp: Date.now(),
      sessionId: this.session.id,
      ...(this.session.userId && { userId: this.session.userId }),
      ...(this.session.tenantId && { tenantId: this.session.tenantId }),
      data: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        context: context || {},
      },
      metadata: this.getEventMetadata(),
    };

    this.trackEvent(event);
  }

  /**
   * Core event tracking method
   */
  private async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.shouldTrack() || !this.shouldSample()) {
      return;
    }

    try {
      // Apply filters
      let processedEvent = event;
      for (const filter of this.config.filters) {
        if (filter.action === 'exclude' && filter.condition(processedEvent)) {
          return; // Skip this event
        }

        if (filter.action === 'include' && !filter.condition(processedEvent)) {
          return; // Skip this event
        }

        if (filter.action === 'modify' && filter.condition(processedEvent) && filter.modifier) {
          processedEvent = filter.modifier(processedEvent);
        }
      }

      // Apply enrichers
      for (const enricher of this.config.enrichers) {
        processedEvent = await enricher.enrich(processedEvent);
      }

      // Add to session events
      this.session.events.push(processedEvent);

      // Add to queue for batch processing
      this.eventQueue.push(processedEvent);

      // Process batch if needed
      if (this.eventQueue.length >= this.config.batchSize) {
        await this.processBatch();
      }
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }

  /**
   * Set up automatic event tracking
   */
  private setupAutoTracking(): void {
    if (typeof window === 'undefined') return;

    // Track page views
    this.trackCustomEvent('page:view', {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
    });

    // Track element interactions
    if (this.config.events.interactions) {
      document.addEventListener(
        'click',
        event => {
          this.handleElementInteraction(event, 'click');
        },
        { passive: true }
      );

      document.addEventListener(
        'change',
        event => {
          this.handleElementInteraction(event, 'change');
        },
        { passive: true }
      );

      document.addEventListener(
        'submit',
        event => {
          this.handleElementInteraction(event, 'submit');
        },
        { passive: true }
      );
    }

    // Track performance metrics
    if (this.config.events.performance) {
      this.trackNavigationTiming();
      this.trackResourceTiming();
    }

    // Track errors
    if (this.config.events.errors) {
      window.addEventListener('error', event => {
        this.trackError(event.error || new Error(event.message), {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      window.addEventListener('unhandledrejection', event => {
        this.trackError(
          event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
          { type: 'unhandledRejection' }
        );
      });
    }
  }

  /**
   * Handle element interaction events
   */
  private handleElementInteraction(event: Event, eventType: string): void {
    const element = event.target as Element;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const mouseEvent = event as MouseEvent;

    this.trackInteraction({
      element: this.getElementSelector(element),
      tagName: element.tagName.toLowerCase(),
      className: element.className || '',
      id: element.id || '',
      eventType,
      coordinates: {
        x: mouseEvent.clientX || 0,
        y: mouseEvent.clientY || 0,
      },
      value: (element as HTMLInputElement).value,
      checked: (element as HTMLInputElement).checked,
    });
  }

  /**
   * Track navigation timing
   */
  private trackNavigationTiming(): void {
    if (!performance.timing) return;

    const timing = performance.timing;
    const navigationStart = timing.navigationStart;

    // Track key timing metrics
    this.trackPerformance({
      metric: 'page_load_time',
      value: timing.loadEventEnd - navigationStart,
      unit: 'ms',
      category: 'navigation',
    });

    this.trackPerformance({
      metric: 'dom_content_loaded',
      value: timing.domContentLoadedEventEnd - navigationStart,
      unit: 'ms',
      category: 'navigation',
    });

    this.trackPerformance({
      metric: 'first_paint',
      value: timing.responseEnd - navigationStart,
      unit: 'ms',
      category: 'rendering',
    });
  }

  /**
   * Track resource timing
   */
  private trackResourceTiming(): void {
    if (!performance.getEntriesByType) return;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    resources.forEach(resource => {
      this.trackPerformance({
        metric: 'resource_load_time',
        value: resource.responseEnd - resource.startTime,
        unit: 'ms',
        category: 'network',
        details: {
          name: resource.name,
          type: resource.initiatorType,
          size: resource.transferSize,
        },
      });
    });
  }

  /**
   * Set up batch processing
   */
  private setupBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.processBatch();
      }
    }, this.config.batchTimeout);
  }

  /**
   * Set up page visibility handling
   */
  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Flush events before page becomes hidden
        this.flush();
      }
    });

    // Flush events before page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  /**
   * Process event batch
   */
  private async processBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      if (this.config.apiEndpoint) {
        await this.sendToAPI(events);
      } else {
        // Store locally or send to console in development
        console.log('Analytics events:', events);
      }
    } catch (error) {
      console.error('Failed to process analytics batch:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Send events to API endpoint
   */
  private async sendToAPI(events: AnalyticsEvent[]): Promise<void> {
    if (!this.config.apiEndpoint) return;

    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events,
        session: this.session,
        trackingId: this.config.trackingId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status}`);
    }
  }

  /**
   * Flush all pending events
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    await this.processBatch();
  }

  /**
   * Check if tracking should be enabled
   */
  private shouldTrack(): boolean {
    if (!this.config.enabled) return false;

    // Respect Do Not Track
    if (this.config.privacy.respectDNT && navigator.doNotTrack === '1') {
      return false;
    }

    // Check cookie consent if required
    if (this.config.privacy.cookieConsent && !this.hasCookieConsent()) {
      return false;
    }

    return true;
  }

  /**
   * Check if event should be sampled
   */
  private shouldSample(): boolean {
    if (!this.config.sampling.enabled) return true;
    return Math.random() < this.config.sampling.rate;
  }

  /**
   * Check cookie consent
   */
  private hasCookieConsent(): boolean {
    // Simple implementation - would integrate with consent management platform
    return localStorage.getItem('analytics_consent') === 'true';
  }

  /**
   * Create new session
   */
  private createSession(): AnalyticsSession {
    return {
      id: this.generateSessionId(),
      startTime: Date.now(),
      events: [],
      metadata: this.getSessionMetadata(),
    };
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `ses_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get element selector
   */
  private getElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.trim().split(/\s+/).slice(0, 2);
      return `.${classes.join('.')}`;
    }

    return element.tagName.toLowerCase();
  }

  /**
   * Get event metadata
   */
  private getEventMetadata(): EventMetadata {
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: screen.width,
        height: screen.height,
      },
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      deviceType: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
    };
  }

  /**
   * Get session metadata
   */
  private getSessionMetadata(): SessionMetadata {
    return {
      initialUrl: window.location.href,
      initialReferrer: document.referrer,
      userAgent: navigator.userAgent,
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      deviceType: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  /**
   * Detect device type
   */
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;
    if (/iPad|Tablet/.test(userAgent)) return 'tablet';
    if (/Mobile|Android|iPhone/.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  /**
   * Detect browser
   */
  private getBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Detect operating system
   */
  private getOS(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    this.session.userId = userId;
  }

  /**
   * Set tenant ID
   */
  setTenantId(tenantId: string): void {
    this.session.tenantId = tenantId;
  }

  /**
   * Get current session
   */
  getSession(): AnalyticsSession {
    return this.session;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add filter
   */
  addFilter(filter: AnalyticsFilter): void {
    this.config.filters.push(filter);
  }

  /**
   * Add enricher
   */
  addEnricher(enricher: AnalyticsEnricher): void {
    this.config.enrichers.push(enricher);
  }

  /**
   * Destroy tracker
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    this.flush();
    this.isInitialized = false;
  }
}

/**
 * Create analytics tracker
 */
export function createAnalyticsTracker(config: Partial<AnalyticsConfig> = {}): AnalyticsTracker {
  return new AnalyticsTracker(config);
}

/**
 * Global tracker instance
 */
let globalTracker: AnalyticsTracker | null = null;

/**
 * Get or create global tracker
 */
export function getTracker(config?: Partial<AnalyticsConfig>): AnalyticsTracker {
  if (!globalTracker) {
    globalTracker = createAnalyticsTracker(config);
  }
  return globalTracker;
}

/**
 * Initialize global analytics
 */
export function initAnalytics(config: Partial<AnalyticsConfig> = {}): AnalyticsTracker {
  return getTracker(config);
}
