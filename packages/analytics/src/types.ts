/**
 * Types for Analytics System
 */

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'hyperscript:compiled'
  | 'hyperscript:executed'
  | 'hyperscript:error'
  | 'element:interaction'
  | 'element:mutation'
  | 'performance:timing'
  | 'user:action'
  | 'page:view'
  | 'custom:event';

/**
 * Base analytics event
 */
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  sessionId: string;
  userId?: string;
  tenantId?: string;
  data: Record<string, any>;
  metadata: EventMetadata;
}

/**
 * Event metadata
 */
export interface EventMetadata {
  userAgent: string;
  url: string;
  referrer: string;
  viewport: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
  };
  locale: string;
  timezone: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
}

/**
 * Hyperscript compilation event
 */
export interface HyperscriptCompilationEvent extends AnalyticsEvent {
  type: 'hyperscript:compiled';
  data: {
    script: string;
    compiledLength: number;
    compilationTime: number;
    complexity: number;
    features: string[];
    selectors: string[];
    commands: string[];
    errors: string[];
    warnings: string[];
  };
}

/**
 * Hyperscript execution event
 */
export interface HyperscriptExecutionEvent extends AnalyticsEvent {
  type: 'hyperscript:executed';
  data: {
    script: string;
    element: string;
    event: string;
    executionTime: number;
    success: boolean;
    result?: any;
    error?: string;
  };
}

/**
 * Element interaction event
 */
export interface ElementInteractionEvent extends AnalyticsEvent {
  type: 'element:interaction';
  data: {
    element: string;
    tagName: string;
    className: string;
    id: string;
    eventType: string;
    coordinates: {
      x: number;
      y: number;
    };
    value?: string;
    checked?: boolean;
  };
}

/**
 * Performance timing event
 */
export interface PerformanceTimingEvent extends AnalyticsEvent {
  type: 'performance:timing';
  data: {
    metric: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count';
    category: 'compilation' | 'execution' | 'rendering' | 'network' | 'navigation';
    details?: Record<string, any>;
  };
}

/**
 * User action event
 */
export interface UserActionEvent extends AnalyticsEvent {
  type: 'user:action';
  data: {
    action: string;
    category: string;
    label?: string;
    value?: number;
    properties?: Record<string, any>;
  };
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  enabled: boolean;
  trackingId?: string;
  apiEndpoint?: string;
  batchSize: number;
  batchTimeout: number;
  sampling: {
    enabled: boolean;
    rate: number;
  };
  privacy: {
    anonymizeIPs: boolean;
    respectDNT: boolean;
    cookieConsent: boolean;
  };
  events: {
    compilation: boolean;
    execution: boolean;
    interactions: boolean;
    performance: boolean;
    errors: boolean;
    customEvents: boolean;
  };
  filters: AnalyticsFilter[];
  enrichers: AnalyticsEnricher[];
}

/**
 * Analytics filter
 */
export interface AnalyticsFilter {
  name: string;
  condition: (event: AnalyticsEvent) => boolean;
  action: 'include' | 'exclude' | 'modify';
  modifier?: (event: AnalyticsEvent) => AnalyticsEvent;
}

/**
 * Analytics enricher
 */
export interface AnalyticsEnricher {
  name: string;
  enrich: (event: AnalyticsEvent) => Promise<AnalyticsEvent>;
}

/**
 * Analytics session
 */
export interface AnalyticsSession {
  id: string;
  userId?: string;
  tenantId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  events: AnalyticsEvent[];
  metadata: SessionMetadata;
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  initialUrl: string;
  initialReferrer: string;
  userAgent: string;
  locale: string;
  timezone: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  screenResolution: string;
  viewportSize: string;
}

/**
 * Analytics metrics
 */
export interface AnalyticsMetrics {
  events: {
    total: number;
    byType: Record<AnalyticsEventType, number>;
    byHour: Record<string, number>;
    byDay: Record<string, number>;
  };
  sessions: {
    total: number;
    active: number;
    averageDuration: number;
    bounceRate: number;
  };
  performance: {
    averageCompilationTime: number;
    averageExecutionTime: number;
    errorRate: number;
    topErrors: Array<{ error: string; count: number }>;
  };
  interactions: {
    totalClicks: number;
    topElements: Array<{ element: string; interactions: number }>;
    conversionFunnels: Record<string, number>;
  };
  users: {
    total: number;
    returning: number;
    newUsers: number;
    topPages: Array<{ url: string; views: number }>;
  };
}

/**
 * Analytics dashboard configuration
 */
export interface DashboardConfig {
  title: string;
  widgets: DashboardWidget[];
  timeRange: {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  filters: DashboardFilter[];
  refreshInterval: number;
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap';
  title: string;
  description?: string;
  size: { width: number; height: number };
  position: { x: number; y: number };
  config: WidgetConfig;
}

/**
 * Widget configuration
 */
export interface WidgetConfig {
  metric?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  timeframe?: string;
  groupBy?: string;
  filters?: Record<string, any>;
  limit?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
}

/**
 * Dashboard filter
 */
export interface DashboardFilter {
  name: string;
  type: 'select' | 'date' | 'text' | 'number';
  options?: string[];
  value: any;
}

/**
 * Analytics collector interface
 */
export interface AnalyticsCollector {
  collect(event: AnalyticsEvent): Promise<void>;
  batch(events: AnalyticsEvent[]): Promise<void>;
  flush(): Promise<void>;
  getMetrics(): Promise<AnalyticsMetrics>;
}

/**
 * Analytics storage interface
 */
export interface AnalyticsStorage {
  store(event: AnalyticsEvent): Promise<void>;
  storeBatch(events: AnalyticsEvent[]): Promise<void>;
  query(query: AnalyticsQuery): Promise<AnalyticsEvent[]>;
  aggregate(query: AggregationQuery): Promise<any>;
  delete(query: AnalyticsQuery): Promise<number>;
}

/**
 * Analytics query
 */
export interface AnalyticsQuery {
  eventTypes?: AnalyticsEventType[];
  startTime?: number;
  endTime?: number;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
}

/**
 * Aggregation query
 */
export interface AggregationQuery extends AnalyticsQuery {
  groupBy?: string[];
  aggregations: {
    [key: string]: {
      type: 'count' | 'sum' | 'avg' | 'min' | 'max';
      field?: string;
    };
  };
}

/**
 * Real-time analytics subscription
 */
export interface AnalyticsSubscription {
  id: string;
  query: AnalyticsQuery;
  callback: (events: AnalyticsEvent[]) => void;
  active: boolean;
}

/**
 * Analytics export configuration
 */
export interface AnalyticsExportConfig {
  format: 'json' | 'csv' | 'xlsx';
  query: AnalyticsQuery;
  filename?: string;
  compression?: boolean;
  includeMetadata?: boolean;
}

/**
 * Heat map data point
 */
export interface HeatMapDataPoint {
  x: number;
  y: number;
  value: number;
  element?: string;
}

/**
 * Conversion funnel step
 */
export interface ConversionFunnelStep {
  name: string;
  condition: (event: AnalyticsEvent) => boolean;
  users: number;
  conversionRate: number;
}

/**
 * A/B test configuration
 */
export interface ABTestConfig {
  id: string;
  name: string;
  variants: ABTestVariant[];
  allocation: Record<string, number>;
  startDate: Date;
  endDate?: Date;
  targetMetric: string;
  successCriteria: {
    metric: string;
    threshold: number;
    direction: 'increase' | 'decrease';
  };
}

/**
 * A/B test variant
 */
export interface ABTestVariant {
  id: string;
  name: string;
  config: Record<string, any>;
  traffic: number;
}

/**
 * Analytics alert configuration
 */
export interface AnalyticsAlert {
  id: string;
  name: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number;
    timeWindow: number;
  };
  actions: AlertAction[];
  enabled: boolean;
}

/**
 * Alert action
 */
export interface AlertAction {
  type: 'email' | 'webhook' | 'slack';
  config: Record<string, any>;
}
