/**
 * Production Performance Monitor
 * Real-time performance monitoring for enhanced implementations in production
 */

import { performance } from 'perf_hooks';

export interface PerformanceMetric {
  name: string;
  category: 'command' | 'expression' | 'validation' | 'runtime' | 'system';
  timestamp: number;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}

export interface PerformanceThresholds {
  command: {
    warning: number; // ms
    error: number; // ms
  };
  expression: {
    warning: number; // ms
    error: number; // ms
  };
  validation: {
    warning: number; // ms
    error: number; // ms
  };
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: number;
}

/**
 * Production performance monitoring system
 */
export class ProductionPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private isEnabled: boolean = false;
  private maxMetrics: number = 1000; // Keep last 1000 metrics
  private flushInterval: NodeJS.Timeout | null = null;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;

  private readonly thresholds: PerformanceThresholds = {
    command: { warning: 10, error: 50 },
    expression: { warning: 5, error: 25 },
    validation: { warning: 2, error: 10 },
  };

  constructor(
    options: {
      enabled?: boolean;
      thresholds?: Partial<PerformanceThresholds>;
      maxMetrics?: number;
      flushIntervalMs?: number;
    } = {}
  ) {
    this.isEnabled = options.enabled ?? process.env.NODE_ENV === 'production';
    this.maxMetrics = options.maxMetrics ?? 1000;

    // Override default thresholds
    if (options.thresholds) {
      Object.assign(this.thresholds, options.thresholds);
    }

    // Set up periodic system metrics collection
    if (this.isEnabled) {
      this.startSystemMonitoring(options.flushIntervalMs ?? 30000);
    }
  }

  /**
   * Record a performance metric
   */
  record(
    name: string,
    category: PerformanceMetric['category'],
    duration: number,
    success: boolean = true,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const threshold = this.thresholds[category as keyof PerformanceThresholds];
    let severity: PerformanceMetric['severity'] = 'info';

    if (threshold) {
      if (duration >= threshold.error) {
        severity = 'error';
      } else if (duration >= threshold.warning) {
        severity = 'warning';
      }
    }

    const metric: PerformanceMetric = {
      name,
      category,
      timestamp: Date.now(),
      duration,
      success,
      ...(metadata !== undefined && { metadata }),
      severity,
    };

    this.metrics.push(metric);

    // Trim metrics if we exceed the limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log critical performance issues immediately
    if (severity === 'error') {
      console.error(`🚨 Performance Error: ${name} took ${duration.toFixed(2)}ms`, {
        category,
        success,
        metadata,
      });
    } else if (severity === 'warning') {
      console.warn(`⚠️ Performance Warning: ${name} took ${duration.toFixed(2)}ms`, {
        category,
        success,
        metadata,
      });
    }
  }

  /**
   * Measure and record an operation
   */
  async measure<T>(
    name: string,
    category: PerformanceMetric['category'],
    operation: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isEnabled) {
      return await operation();
    }

    const start = performance.now();
    let success = true;
    let result: T;

    try {
      result = await operation();
    } catch (error) {
      success = false;
      const duration = performance.now() - start;
      this.record(name, category, duration, false, {
        ...metadata,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const duration = performance.now() - start;
    this.record(name, category, duration, success, metadata);

    return result;
  }

  /**
   * Get performance statistics
   */
  getStats(category?: PerformanceMetric['category']): {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
    medianDuration: number;
    maxDuration: number;
    minDuration: number;
    warnings: number;
    errors: number;
  } {
    const relevantMetrics = category
      ? this.metrics.filter(m => m.category === category)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0,
        medianDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        warnings: 0,
        errors: 0,
      };
    }

    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);
    const successful = relevantMetrics.filter(m => m.success).length;
    const warnings = relevantMetrics.filter(m => m.severity === 'warning').length;
    const errors = relevantMetrics.filter(m => m.severity === 'error').length;

    return {
      total: relevantMetrics.length,
      successful,
      failed: relevantMetrics.length - successful,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      warnings,
      errors,
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(minutes: number = 5): PerformanceMetric[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get current system metrics
   */
  getCurrentSystemMetrics(): SystemMetrics {
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage || undefined);
    this.lastCpuUsage = process.cpuUsage();

    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: currentCpuUsage,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const lines: string[] = [];
    lines.push('\n📊 Production Performance Report');
    lines.push('='.repeat(50));

    // Overall stats
    const overallStats = this.getStats();
    lines.push(`\n📈 Overall Performance:`);
    lines.push(`  Total Operations: ${overallStats.total}`);
    lines.push(
      `  Success Rate: ${((overallStats.successful / overallStats.total) * 100).toFixed(1)}%`
    );
    lines.push(`  Average Duration: ${overallStats.averageDuration.toFixed(2)}ms`);
    lines.push(`  Median Duration: ${overallStats.medianDuration.toFixed(2)}ms`);
    lines.push(`  Warnings: ${overallStats.warnings}`);
    lines.push(`  Errors: ${overallStats.errors}`);

    // Category breakdown
    const categories: PerformanceMetric['category'][] = [
      'command',
      'expression',
      'validation',
      'runtime',
    ];

    for (const category of categories) {
      const stats = this.getStats(category);
      if (stats.total === 0) continue;

      lines.push(`\n🔍 ${category.toUpperCase()} Performance:`);
      lines.push(`  Operations: ${stats.total}`);
      lines.push(`  Success Rate: ${((stats.successful / stats.total) * 100).toFixed(1)}%`);
      lines.push(`  Average: ${stats.averageDuration.toFixed(2)}ms`);
      lines.push(`  Range: ${stats.minDuration.toFixed(2)}ms - ${stats.maxDuration.toFixed(2)}ms`);

      if (stats.warnings > 0 || stats.errors > 0) {
        lines.push(`  ⚠️ Issues: ${stats.warnings} warnings, ${stats.errors} errors`);
      }
    }

    // Recent system metrics
    if (this.systemMetrics.length > 0) {
      const latest = this.systemMetrics[this.systemMetrics.length - 1];
      lines.push(`\n💾 System Metrics:`);
      lines.push(`  Memory Used: ${(latest.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
      lines.push(`  Memory Total: ${(latest.memoryUsage.heapTotal / 1024 / 1024).toFixed(1)}MB`);
      lines.push(`  External: ${(latest.memoryUsage.external / 1024 / 1024).toFixed(1)}MB`);
      lines.push(`  CPU User: ${(latest.cpuUsage.user / 1000).toFixed(1)}ms`);
      lines.push(`  CPU System: ${(latest.cpuUsage.system / 1000).toFixed(1)}ms`);
    }

    // Performance hotspots
    const recentMetrics = this.getRecentMetrics(5);
    const slowestOperations = recentMetrics
      .filter(m => m.severity !== 'info')
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    if (slowestOperations.length > 0) {
      lines.push(`\n🐌 Recent Performance Issues:`);
      slowestOperations.forEach(metric => {
        const icon = metric.severity === 'error' ? '🚨' : '⚠️';
        lines.push(
          `  ${icon} ${metric.name}: ${metric.duration.toFixed(2)}ms (${metric.category})`
        );
      });
    }

    return lines.join('\n');
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.systemMetrics = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;

    if (enabled && !this.flushInterval) {
      this.startSystemMonitoring();
    } else if (!enabled && this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(intervalMs: number = 30000): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      const systemMetric = this.getCurrentSystemMetrics();
      this.systemMetrics.push(systemMetric);

      // Keep only last 100 system metrics
      if (this.systemMetrics.length > 100) {
        this.systemMetrics = this.systemMetrics.slice(-100);
      }
    }, intervalMs);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.clear();
  }
}

// Global production monitor instance
export const productionMonitor = new ProductionPerformanceMonitor({
  enabled: process.env.NODE_ENV === 'production' || process.env.PERFORMANCE_MONITORING === 'true',
});

/**
 * Performance monitoring decorator for production use
 */
export function monitorPerformance(category: PerformanceMetric['category'], name?: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    const operationName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (this: any, ...args: Parameters<T>) {
      return productionMonitor.measure(
        operationName,
        category,
        () => originalMethod.apply(this, args),
        {
          argsCount: args.length,
          className: target.constructor.name,
          methodName: propertyKey,
        }
      );
    } as T;

    return descriptor;
  };
}

/**
 * Quick performance measurement utility
 */
export async function measureOperation<T>(
  name: string,
  operation: () => Promise<T> | T,
  category: PerformanceMetric['category'] = 'runtime'
): Promise<T> {
  return productionMonitor.measure(name, category, operation);
}
