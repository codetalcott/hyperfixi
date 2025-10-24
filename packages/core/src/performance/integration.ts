/**
 * Performance Integration Module
 * Integrates caching and optimization systems with core hyperscript components
 */

import type { ExecutionContext, ExpressionImplementation } from '../types/core';
import { globalCache } from './expression-cache';
import { tokenizeOptimized } from '../parser/tokenizer-optimized';

// Performance monitoring interface
export interface PerformanceMetrics {
  tokenizationTime: number;
  evaluationTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  domOperations: number;
}

// Global performance tracker
class PerformanceTracker {
  private metrics: PerformanceMetrics = {
    tokenizationTime: 0,
    evaluationTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    domOperations: 0
  };
  
  private startTimes = new Map<string, number>();
  
  startTimer(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }
  
  endTimer(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.startTimes.delete(operation);
      return duration;
    }
    return 0;
  }
  
  recordTokenization(duration: number): void {
    this.metrics.tokenizationTime += duration;
  }
  
  recordEvaluation(duration: number): void {
    this.metrics.evaluationTime += duration;
  }
  
  updateCacheMetrics(): void {
    const cacheStats = globalCache.getPerformanceStats();
    this.metrics.cacheHitRate = cacheStats.hitRate;
  }
  
  getMetrics(): PerformanceMetrics {
    this.updateCacheMetrics();
    return { ...this.metrics };
  }
  
  reset(): void {
    this.metrics = {
      tokenizationTime: 0,
      evaluationTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      domOperations: 0
    };
  }
}

export const performanceTracker = new PerformanceTracker();

// Optimized expression evaluation with caching
export async function evaluateExpressionWithCache<T>(
  cacheKey: string,
  evaluator: () => Promise<T>,
  _context: ExecutionContext
): Promise<T> {
  // Check cache first
  const cached = globalCache.getExpressionResult(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  // Track evaluation time
  performanceTracker.startTimer('evaluation');
  
  try {
    const result = await evaluator();
    
    // Cache the result
    globalCache.setExpressionResult(cacheKey, result);
    
    return result;
  } finally {
    const duration = performanceTracker.endTimer('evaluation');
    performanceTracker.recordEvaluation(duration);
  }
}

// Optimized DOM query operations with caching
export function queryWithCache(selector: string): Element | null {
  return globalCache.querySelector(selector);
}

export function queryAllWithCache(selector: string): Element[] {
  return globalCache.querySelectorAll(selector);
}

export function matchesWithCache(element: Element, selector: string): boolean {
  return globalCache.matches(element, selector);
}

// Enhanced expression wrapper with performance tracking
export function wrapExpressionForPerformance(
  expression: ExpressionImplementation
): ExpressionImplementation {
  return {
    ...expression,
    async evaluate(_context: ExecutionContext, ...args: any[]): Promise<any> {
      // Create cache key from expression name and arguments
      const cacheKey = createExpressionCacheKey(expression.name, args);
      
      return evaluateExpressionWithCache(
        cacheKey,
        () => expression.evaluate(_context, ...args),
        _context
      );
    }
  };
}

// Cache key generation for expressions
function createExpressionCacheKey(expressionName: string, args: any[]): string {
  const argsKey = args.map(arg => {
    if (arg === null || arg === undefined) return 'null';
    if (typeof arg === 'object') {
      if (arg instanceof Element) {
        return `element:${arg.tagName}:${arg.id || arg.className || 'unknown'}`;
      }
      return JSON.stringify(arg);
    }
    return String(arg);
  }).join('|');
  
  return `expr:${expressionName}:${argsKey}`;
}

// Optimized tokenization with performance tracking
export function tokenizeWithPerformance(input: string) {
  performanceTracker.startTimer('tokenization');
  
  try {
    const tokens = tokenizeOptimized(input);
    return tokens;
  } finally {
    const duration = performanceTracker.endTimer('tokenization');
    performanceTracker.recordTokenization(duration);
  }
}

// Memory cleanup utilities
export function performCleanup(): void {
  // Clean up expression cache
  globalCache.cleanup();
  
  // Reset performance metrics if needed
  const metrics = performanceTracker.getMetrics();
  
  // Clean up old metrics if memory usage is high
  if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB threshold
    performanceTracker.reset();
  }
}

// Auto-cleanup setup
let cleanupInterval: NodeJS.Timeout | null = null;

export function enableAutoCleanup(intervalMs: number = 30000): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  cleanupInterval = setInterval(performCleanup, intervalMs);
}

export function disableAutoCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// DOM operation batching for performance
class DOMBatcher {
  private pendingOperations: (() => void)[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  
  addOperation(operation: () => void): void {
    this.pendingOperations.push(operation);
    
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flush();
      }, 0); // Next tick
    }
  }
  
  flush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    if (this.pendingOperations.length > 0) {
      // Execute all operations in a single frame
      this.pendingOperations.forEach(op => op());
      this.pendingOperations.length = 0;
    }
  }
}

export const domBatcher = new DOMBatcher();

// Enhanced DOM manipulation with batching
export function batchDOMOperation(operation: () => void): void {
  domBatcher.addOperation(operation);
}

// Performance reporting
export function generatePerformanceReport(): string {
  const metrics = performanceTracker.getMetrics();
  const cacheStats = globalCache.getPerformanceStats();
  
  return `
Performance Report:
==================
Tokenization Time: ${metrics.tokenizationTime.toFixed(3)}ms
Evaluation Time: ${metrics.evaluationTime.toFixed(3)}ms
Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%
DOM Operations: ${metrics.domOperations}

Cache Statistics:
- Total Hits: ${cacheStats.hits}
- Total Misses: ${cacheStats.misses}
- DOM Query Cache: ${cacheStats.domQueryCache.size}/${cacheStats.domQueryCache.maxSize}
- Expression Cache: ${cacheStats.exprResultCache.size}/${cacheStats.exprResultCache.maxSize}
- CSS Match Cache: ${cacheStats.cssMatchCache.size}/${cacheStats.cssMatchCache.maxSize}
- Form Value Cache: ${cacheStats.formValueCache.size}/${cacheStats.formValueCache.maxSize}
`.trim();
}

// Initialize auto cleanup by default
if (typeof window !== 'undefined') {
  enableAutoCleanup();
}