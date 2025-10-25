/**
 * Command Performance Profiler for HyperFixi
 * Measures and optimizes command execution speeds
 * Provides detailed performance metrics and bottleneck identification
 */

import type {
  CommandExecutionResult
} from './unified-command-system';
import type { TypedExecutionContext } from '../types/core';

/**
 * Performance metrics for a single command execution
 */
export interface CommandPerformanceMetrics {
  commandName: string;
  executionTime: number;
  memoryUsed: number;
  cpuTime: number;
  timestamp: number;
  args: any[];
  contextSize: number;
  success: boolean;
  error?: string;
}

/**
 * Aggregated performance statistics
 */
export interface CommandPerformanceStats {
  commandName: string;
  executionCount: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p50Time: number;
  p95Time: number;
  p99Time: number;
  errorRate: number;
  throughput: number; // executions per second
  memoryImpact: number;
}

/**
 * Performance bottleneck analysis
 */
export interface PerformanceBottleneck {
  commandName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  impact: string;
  recommendations: string[];
  metrics: {
    averageTime: number;
    p99Time: number;
    errorRate: number;
  };
}

/**
 * Performance optimization suggestion
 */
export interface OptimizationSuggestion {
  commandName: string;
  type: 'caching' | 'batching' | 'async' | 'algorithm' | 'memory';
  description: string;
  expectedImprovement: string;
  implementation: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Command Performance Profiler
 */
export class CommandPerformanceProfiler {
  private metrics: Map<string, CommandPerformanceMetrics[]> = new Map();
  private startTimes: Map<string, number> = new Map();
  private memorySnapshots: Map<string, number> = new Map();
  private enabled = false;
  private maxMetricsPerCommand = 10000;
  private reportInterval: NodeJS.Timeout | null = null;

  /**
   * Enable performance profiling
   */
  enable(): void {
    this.enabled = true;
    console.log('[Performance Profiler] Enabled');
  }

  /**
   * Disable performance profiling
   */
  disable(): void {
    this.enabled = false;
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    console.log('[Performance Profiler] Disabled');
  }

  /**
   * Start profiling a command execution
   */
  startProfiling(commandName: string, args: any[], context: TypedExecutionContext): string {
    if (!this.enabled) return '';

    const profileId = this.generateProfileId(commandName);
    
    // Record start time
    this.startTimes.set(profileId, performance.now());
    
    // Take memory snapshot if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.memorySnapshots.set(profileId, process.memoryUsage().heapUsed);
    }

    // Record context size
    const contextSize = this.calculateContextSize(context);
    
    // Store initial metric
    const metric: Partial<CommandPerformanceMetrics> = {
      commandName,
      args,
      contextSize,
      timestamp: Date.now()
    };
    
    this.storePartialMetric(profileId, metric);
    
    return profileId;
  }

  /**
   * End profiling and record metrics
   */
  endProfiling(
    profileId: string, 
    result: CommandExecutionResult
  ): CommandPerformanceMetrics | null {
    if (!this.enabled || !profileId) return null;

    const startTime = this.startTimes.get(profileId);
    if (!startTime) return null;

    const executionTime = performance.now() - startTime;
    
    // Calculate memory usage
    let memoryUsed = 0;
    const startMemory = this.memorySnapshots.get(profileId);
    if (startMemory && typeof process !== 'undefined' && process.memoryUsage) {
      memoryUsed = process.memoryUsage().heapUsed - startMemory;
    }

    // Get partial metric
    const partialMetric = this.getPartialMetric(profileId);
    if (!partialMetric) return null;

    // Complete the metric
    const metric: CommandPerformanceMetrics = {
      ...partialMetric,
      executionTime,
      memoryUsed,
      cpuTime: executionTime, // Approximation
      success: result.success,
      error: result.error?.message
    } as CommandPerformanceMetrics;

    // Store complete metric
    this.storeMetric(metric);

    // Clean up
    this.startTimes.delete(profileId);
    this.memorySnapshots.delete(profileId);
    this.cleanupPartialMetric(profileId);

    return metric;
  }

  /**
   * Get performance statistics for a command
   */
  getStats(commandName: string): CommandPerformanceStats | null {
    const metrics = this.metrics.get(commandName);
    if (!metrics || metrics.length === 0) return null;

    const times = metrics.map(m => m.executionTime).sort((a, b) => a - b);
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const errorCount = metrics.filter(m => !m.success).length;
    
    // Calculate percentiles
    const p50Index = Math.floor(times.length * 0.5);
    const p95Index = Math.floor(times.length * 0.95);
    const p99Index = Math.floor(times.length * 0.99);

    // Calculate throughput
    const timeSpan = metrics[metrics.length - 1].timestamp - metrics[0].timestamp;
    const throughput = timeSpan > 0 ? (metrics.length / timeSpan) * 1000 : 0;

    // Calculate memory impact
    const memoryImpact = metrics.reduce((sum, m) => sum + m.memoryUsed, 0) / metrics.length;

    return {
      commandName,
      executionCount: metrics.length,
      totalTime,
      averageTime: totalTime / metrics.length,
      minTime: times[0],
      maxTime: times[times.length - 1],
      p50Time: times[p50Index] || 0,
      p95Time: times[p95Index] || 0,
      p99Time: times[p99Index] || 0,
      errorRate: errorCount / metrics.length,
      throughput,
      memoryImpact
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats(): CommandPerformanceStats[] {
    const stats: CommandPerformanceStats[] = [];
    
    for (const commandName of this.metrics.keys()) {
      const stat = this.getStats(commandName);
      if (stat) {
        stats.push(stat);
      }
    }
    
    return stats.sort((a, b) => b.averageTime - a.averageTime);
  }

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks(): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const stats = this.getAllStats();

    for (const stat of stats) {
      const issues: PerformanceBottleneck[] = [];

      // Check for slow execution
      if (stat.p99Time > 100) {
        issues.push({
          commandName: stat.commandName,
          severity: stat.p99Time > 500 ? 'critical' : stat.p99Time > 200 ? 'high' : 'medium',
          issue: 'Slow execution time',
          impact: `P99 execution time is ${stat.p99Time.toFixed(2)}ms`,
          recommendations: [
            'Consider caching frequently accessed data',
            'Optimize algorithm complexity',
            'Use async execution for non-blocking operations',
            'Profile specific code paths for optimization'
          ],
          metrics: {
            averageTime: stat.averageTime,
            p99Time: stat.p99Time,
            errorRate: stat.errorRate
          }
        });
      }

      // Check for high error rate
      if (stat.errorRate > 0.05) {
        issues.push({
          commandName: stat.commandName,
          severity: stat.errorRate > 0.2 ? 'critical' : stat.errorRate > 0.1 ? 'high' : 'medium',
          issue: 'High error rate',
          impact: `${(stat.errorRate * 100).toFixed(1)}% of executions fail`,
          recommendations: [
            'Add better input validation',
            'Improve error handling and recovery',
            'Add retry logic for transient failures',
            'Review error logs for patterns'
          ],
          metrics: {
            averageTime: stat.averageTime,
            p99Time: stat.p99Time,
            errorRate: stat.errorRate
          }
        });
      }

      // Check for high memory usage
      if (stat.memoryImpact > 10 * 1024 * 1024) { // 10MB
        issues.push({
          commandName: stat.commandName,
          severity: stat.memoryImpact > 50 * 1024 * 1024 ? 'high' : 'medium',
          issue: 'High memory consumption',
          impact: `Average memory usage: ${(stat.memoryImpact / 1024 / 1024).toFixed(2)}MB`,
          recommendations: [
            'Optimize data structures',
            'Implement object pooling',
            'Stream large data instead of loading into memory',
            'Clear unused references promptly'
          ],
          metrics: {
            averageTime: stat.averageTime,
            p99Time: stat.p99Time,
            errorRate: stat.errorRate
          }
        });
      }

      // Check for high variance
      const variance = stat.p99Time / stat.p50Time;
      if (variance > 10) {
        issues.push({
          commandName: stat.commandName,
          severity: variance > 20 ? 'high' : 'medium',
          issue: 'High performance variance',
          impact: `P99 is ${variance.toFixed(1)}x slower than P50`,
          recommendations: [
            'Identify edge cases causing slowdowns',
            'Add request throttling or rate limiting',
            'Implement timeout mechanisms',
            'Consider splitting into smaller operations'
          ],
          metrics: {
            averageTime: stat.averageTime,
            p99Time: stat.p99Time,
            errorRate: stat.errorRate
          }
        });
      }

      bottlenecks.push(...issues);
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizations(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const stats = this.getAllStats();
    const bottlenecks = this.identifyBottlenecks();

    for (const stat of stats) {
      // Suggest caching for frequently called commands
      if (stat.executionCount > 100 && stat.averageTime > 10) {
        suggestions.push({
          commandName: stat.commandName,
          type: 'caching',
          description: 'Implement result caching for frequently executed command',
          expectedImprovement: '50-80% reduction in average execution time',
          implementation: 'Use LRU cache with TTL for deterministic operations',
          priority: stat.averageTime > 50 ? 'high' : 'medium'
        });
      }

      // Suggest batching for high-frequency commands
      if (stat.throughput > 10) {
        suggestions.push({
          commandName: stat.commandName,
          type: 'batching',
          description: 'Batch multiple command executions together',
          expectedImprovement: '30-50% reduction in overhead',
          implementation: 'Collect commands and execute in batches with debouncing',
          priority: stat.throughput > 50 ? 'high' : 'low'
        });
      }

      // Suggest async execution for slow commands
      if (stat.averageTime > 50 && !this.isAsyncCommand(stat.commandName)) {
        suggestions.push({
          commandName: stat.commandName,
          type: 'async',
          description: 'Convert to async execution to prevent blocking',
          expectedImprovement: 'Non-blocking execution, better UI responsiveness',
          implementation: 'Use async/await pattern with progress indicators',
          priority: stat.averageTime > 100 ? 'high' : 'medium'
        });
      }

      // Suggest algorithm optimization for bottlenecks
      const bottleneck = bottlenecks.find(b => b.commandName === stat.commandName);
      if (bottleneck && bottleneck.severity !== 'low') {
        suggestions.push({
          commandName: stat.commandName,
          type: 'algorithm',
          description: `Optimize algorithm to address: ${bottleneck.issue}`,
          expectedImprovement: '40-60% performance improvement',
          implementation: bottleneck.recommendations[0],
          priority: bottleneck.severity === 'critical' ? 'high' : 'medium'
        });
      }

      // Suggest memory optimization for high memory usage
      if (stat.memoryImpact > 5 * 1024 * 1024) { // 5MB
        suggestions.push({
          commandName: stat.commandName,
          type: 'memory',
          description: 'Optimize memory usage patterns',
          expectedImprovement: '30-50% reduction in memory footprint',
          implementation: 'Use weak references, implement disposal patterns',
          priority: stat.memoryImpact > 20 * 1024 * 1024 ? 'high' : 'low'
        });
      }
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const stats = this.getAllStats();
    const bottlenecks = this.identifyBottlenecks();
    const optimizations = this.generateOptimizations();

    let report = `
Command Performance Report
==========================
Generated: ${new Date().toISOString()}

Summary
-------
Total Commands Profiled: ${stats.length}
Total Executions: ${stats.reduce((sum, s) => sum + s.executionCount, 0)}
Total Time: ${stats.reduce((sum, s) => sum + s.totalTime, 0).toFixed(2)}ms

Top 5 Slowest Commands (by P99)
--------------------------------
`;

    stats
      .sort((a, b) => b.p99Time - a.p99Time)
      .slice(0, 5)
      .forEach((stat, i) => {
        report += `${i + 1}. ${stat.commandName}: ${stat.p99Time.toFixed(2)}ms (avg: ${stat.averageTime.toFixed(2)}ms)\n`;
      });

    report += `
Critical Bottlenecks
--------------------
`;

    bottlenecks
      .filter(b => b.severity === 'critical' || b.severity === 'high')
      .slice(0, 5)
      .forEach(bottleneck => {
        report += `- ${bottleneck.commandName}: ${bottleneck.issue}\n`;
        report += `  Impact: ${bottleneck.impact}\n`;
        report += `  Recommendation: ${bottleneck.recommendations[0]}\n\n`;
      });

    report += `
Top Optimization Opportunities
------------------------------
`;

    optimizations
      .filter(o => o.priority === 'high')
      .slice(0, 5)
      .forEach(opt => {
        report += `- ${opt.commandName} (${opt.type})\n`;
        report += `  ${opt.description}\n`;
        report += `  Expected: ${opt.expectedImprovement}\n\n`;
      });

    report += `
Detailed Statistics
------------------
`;

    stats.forEach(stat => {
      report += `
${stat.commandName}:
  Executions: ${stat.executionCount}
  Avg Time: ${stat.averageTime.toFixed(2)}ms
  P50: ${stat.p50Time.toFixed(2)}ms
  P95: ${stat.p95Time.toFixed(2)}ms
  P99: ${stat.p99Time.toFixed(2)}ms
  Error Rate: ${(stat.errorRate * 100).toFixed(1)}%
  Throughput: ${stat.throughput.toFixed(2)}/sec
  Memory: ${(stat.memoryImpact / 1024).toFixed(2)}KB
`;
    });

    return report;
  }

  /**
   * Enable automatic reporting
   */
  enableAutoReporting(intervalMs: number = 60000): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }

    this.reportInterval = setInterval(() => {
      console.log(this.generateReport());
    }, intervalMs);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
    this.memorySnapshots.clear();
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): Map<string, CommandPerformanceMetrics[]> {
    return new Map(this.metrics);
  }

  /**
   * Import metrics for analysis
   */
  importMetrics(metrics: Map<string, CommandPerformanceMetrics[]>): void {
    this.metrics = new Map(metrics);
  }

  // Private helper methods

  private generateProfileId(commandName: string): string {
    return `${commandName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateContextSize(context: TypedExecutionContext): number {
    // Rough estimation of context size
    let size = 0;
    
    if (context.locals) {
      size += context.locals.size * 100; // Rough estimate per local variable
    }
    
    if (context.globals) {
      size += context.globals.size * 100;
    }
    
    if (context.evaluationHistory) {
      size += context.evaluationHistory.length * 50;
    }
    
    return size;
  }

  private partialMetrics: Map<string, Partial<CommandPerformanceMetrics>> = new Map();

  private storeMetric(metric: CommandPerformanceMetrics): void {
    const metrics = this.metrics.get(metric.commandName) || [];
    metrics.push(metric);
    
    // Limit stored metrics
    if (metrics.length > this.maxMetricsPerCommand) {
      metrics.shift();
    }
    
    this.metrics.set(metric.commandName, metrics);
  }

  private storePartialMetric(profileId: string, metric: Partial<CommandPerformanceMetrics>): void {
    this.partialMetrics.set(profileId, metric);
  }

  private getPartialMetric(profileId: string): Partial<CommandPerformanceMetrics> | null {
    return this.partialMetrics.get(profileId) || null;
  }

  private cleanupPartialMetric(profileId: string): void {
    this.partialMetrics.delete(profileId);
  }

  private isAsyncCommand(commandName: string): boolean {
    const asyncCommands = ['fetch', 'wait', 'async', 'settle', 'transition'];
    return asyncCommands.includes(commandName);
  }
}

// Export singleton instance
export const performanceProfiler = new CommandPerformanceProfiler();

// Note: CommandPerformanceMetrics, CommandPerformanceStats, PerformanceBottleneck, and
// OptimizationSuggestion are already exported via 'export interface' declarations above