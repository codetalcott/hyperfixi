/**
 * Performance Optimization Module for AST Toolkit
 * Provides benchmarking, caching, and optimization utilities for large AST operations
 */

import { findNodes, visit, calculateComplexity, analyzeMetrics } from '../index.js';
import type { ASTNode, ComplexityMetrics, AnalysisResult } from '../types.js';

// ============================================================================
// Performance Types
// ============================================================================

export interface BenchmarkResult {
  operation: string;
  duration: number; // milliseconds
  memoryUsed: number; // bytes
  throughput: number; // operations per second
  iterations: number;
  averageTime: number; // milliseconds
  minTime: number;
  maxTime: number;
  nodeCount: number;
  optimizationApplied?: string;
}

export interface PerformanceConfig {
  enableCaching: boolean;
  cacheSize: number;
  enableMemoization: boolean;
  enableParallelization: boolean;
  maxConcurrency: number;
  benchmarkIterations: number;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  computationTime: number;
}

export interface OptimizationSuggestion {
  type: 'caching' | 'memoization' | 'parallelization' | 'algorithm' | 'memory';
  description: string;
  expectedImprovement: string;
  implementation: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================================================
// Performance Cache Implementation
// ============================================================================

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Update access count and move to end (most recently used)
    entry.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  set(key: string, value: T, computationTime: number = 0): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 1,
      computationTime
    });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { hitRate: number; avgComputationTime: number; totalEntries: number } {
    const entries = Array.from(this.cache.values());
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const hits = entries.filter(entry => entry.accessCount > 1).length;
    const avgComputationTime = entries.reduce((sum, entry) => sum + entry.computationTime, 0) / entries.length;

    return {
      hitRate: totalAccess > 0 ? hits / totalAccess : 0,
      avgComputationTime: avgComputationTime || 0,
      totalEntries: entries.length
    };
  }
}

// Global caches for different operations
const complexityCache = new LRUCache<ComplexityMetrics>(500);
const analysisCache = new LRUCache<AnalysisResult>(300);
const nodeQueryCache = new LRUCache<ASTNode[]>(1000);

// ============================================================================
// Performance Configuration
// ============================================================================

const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableCaching: true,
  cacheSize: 1000,
  enableMemoization: true,
  enableParallelization: false, // Keep false for now as we don't have worker support
  maxConcurrency: 4,
  benchmarkIterations: 100
};

let currentConfig: PerformanceConfig = { ...DEFAULT_PERFORMANCE_CONFIG };

export function setPerformanceConfig(config: Partial<PerformanceConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  
  // Update cache sizes if needed
  if (config.cacheSize) {
    complexityCache.clear();
    analysisCache.clear();
    nodeQueryCache.clear();
  }
}

export function getPerformanceConfig(): PerformanceConfig {
  return { ...currentConfig };
}

// ============================================================================
// Optimized AST Operations
// ============================================================================

/**
 * Optimized complexity calculation with caching
 */
export function calculateComplexityOptimized(ast: ASTNode): ComplexityMetrics {
  if (!currentConfig.enableCaching) {
    return calculateComplexity(ast);
  }

  const cacheKey = generateASTHash(ast);
  const cached = complexityCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const startTime = performance.now();
  const result = calculateComplexity(ast);
  const computationTime = performance.now() - startTime;

  complexityCache.set(cacheKey, result, computationTime);
  return result;
}

/**
 * Optimized metrics analysis with caching
 */
export function analyzeMetricsOptimized(ast: ASTNode): AnalysisResult {
  if (!currentConfig.enableCaching) {
    return analyzeMetrics(ast);
  }

  const cacheKey = generateASTHash(ast);
  const cached = analysisCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const startTime = performance.now();
  const result = analyzeMetrics(ast);
  const computationTime = performance.now() - startTime;

  analysisCache.set(cacheKey, result, computationTime);
  return result;
}

/**
 * Optimized node finding with caching
 */
export function findNodesOptimized(
  ast: ASTNode, 
  predicate: (node: ASTNode) => boolean
): ASTNode[] {
  if (!currentConfig.enableCaching) {
    return findNodes(ast, predicate);
  }

  // Create a simple hash for the predicate (not perfect but works for common cases)
  const predicateHash = predicate.toString().slice(0, 100);
  const cacheKey = `${generateASTHash(ast)}-${predicateHash}`;
  const cached = nodeQueryCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const startTime = performance.now();
  const result = findNodes(ast, predicate);
  const computationTime = performance.now() - startTime;

  nodeQueryCache.set(cacheKey, result, computationTime);
  return result;
}

/**
 * Batch processing for multiple ASTs
 */
export function processASTsBatch(
  asts: ASTNode[],
  operation: (ast: ASTNode) => any,
  options: { batchSize?: number; parallel?: boolean } = {}
): any[] {
  const { batchSize = 10, parallel = currentConfig.enableParallelization } = options;
  const results: any[] = [];

  if (!parallel || asts.length < batchSize) {
    // Sequential processing
    for (const ast of asts) {
      results.push(operation(ast));
    }
    return results;
  }

  // Batch processing (simulated parallelization)
  const batches: ASTNode[][] = [];
  for (let i = 0; i < asts.length; i += batchSize) {
    batches.push(asts.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const batchResults = batch.map(ast => operation(ast));
    results.push(...batchResults);
  }

  return results;
}

// ============================================================================
// Benchmarking System
// ============================================================================

/**
 * Benchmark a single operation
 */
export function benchmarkOperation(
  name: string,
  operation: () => any,
  iterations: number = currentConfig.benchmarkIterations
): BenchmarkResult {
  const times: number[] = [];
  let memoryStart = 0;
  let memoryEnd = 0;

  // Warm up
  for (let i = 0; i < 5; i++) {
    operation();
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Measure memory before
  if (process.memoryUsage) {
    memoryStart = process.memoryUsage().heapUsed;
  }

  // Run benchmarks
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    operation();
    const end = performance.now();
    times.push(end - start);
  }

  // Measure memory after
  if (process.memoryUsage) {
    memoryEnd = process.memoryUsage().heapUsed;
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const throughput = 1000 / averageTime; // operations per second

  return {
    operation: name,
    duration: totalTime,
    memoryUsed: memoryEnd - memoryStart,
    throughput,
    iterations,
    averageTime,
    minTime,
    maxTime,
    nodeCount: 0 // Will be set by caller if relevant
  };
}

/**
 * Comprehensive AST operation benchmarks
 */
export function benchmarkASTOperations(ast: ASTNode): BenchmarkResult[] {
  const nodeCount = countNodes(ast);
  const results: BenchmarkResult[] = [];

  // Benchmark basic operations
  const operations = [
    {
      name: 'Node Counting',
      operation: () => countNodes(ast)
    },
    {
      name: 'Event Handler Finding',
      operation: () => findNodes(ast, node => node.type === 'eventHandler')
    },
    {
      name: 'Command Finding', 
      operation: () => findNodes(ast, node => node.type === 'command')
    },
    {
      name: 'Complexity Calculation',
      operation: () => calculateComplexity(ast)
    },
    {
      name: 'Full Analysis',
      operation: () => analyzeMetrics(ast)
    },
    {
      name: 'AST Traversal',
      operation: () => {
        let nodeCount = 0;
        visit(ast, {
          enter: () => { nodeCount++; }
        });
        return nodeCount;
      }
    }
  ];

  // Run benchmarks
  for (const op of operations) {
    const result = benchmarkOperation(op.name, op.operation);
    result.nodeCount = nodeCount;
    results.push(result);
  }

  // Benchmark optimized vs non-optimized operations
  if (currentConfig.enableCaching) {
    // Clear caches first
    complexityCache.clear();
    analysisCache.clear();
    nodeQueryCache.clear();

    const unoptimizedComplexity = benchmarkOperation(
      'Complexity (Unoptimized)',
      () => calculateComplexity(ast)
    );
    unoptimizedComplexity.nodeCount = nodeCount;
    results.push(unoptimizedComplexity);

    const optimizedComplexity = benchmarkOperation(
      'Complexity (Optimized)',
      () => calculateComplexityOptimized(ast)
    );
    optimizedComplexity.nodeCount = nodeCount;
    optimizedComplexity.optimizationApplied = 'caching';
    results.push(optimizedComplexity);
  }

  return results;
}

/**
 * Performance comparison between different AST sizes
 */
export function benchmarkScalability(
  generateAST: (size: number) => ASTNode,
  sizes: number[] = [10, 50, 100, 500, 1000]
): Map<number, BenchmarkResult[]> {
  const results = new Map<number, BenchmarkResult[]>();

  for (const size of sizes) {
    console.log(`Benchmarking size: ${size} nodes...`);
    const ast = generateAST(size);
    const benchmarks = benchmarkASTOperations(ast);
    results.set(size, benchmarks);
  }

  return results;
}

// ============================================================================
// Performance Analysis and Optimization Suggestions
// ============================================================================

/**
 * Analyze performance characteristics and suggest optimizations
 */
export function analyzePerformance(
  benchmarkResults: BenchmarkResult[]
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  for (const result of benchmarkResults) {
    // Analyze throughput
    if (result.throughput < 100) { // Less than 100 ops/sec
      suggestions.push({
        type: 'algorithm',
        description: `${result.operation} is running slowly (${result.throughput.toFixed(1)} ops/sec)`,
        expectedImprovement: '2-5x performance improvement',
        implementation: 'Consider algorithmic optimizations or caching',
        priority: 'high'
      });
    }

    // Analyze memory usage
    if (result.memoryUsed > 10 * 1024 * 1024) { // > 10MB
      suggestions.push({
        type: 'memory',
        description: `${result.operation} uses significant memory (${(result.memoryUsed / 1024 / 1024).toFixed(1)}MB)`,
        expectedImprovement: '50-80% memory reduction',
        implementation: 'Implement memory-efficient data structures or streaming processing',
        priority: 'medium'
      });
    }

    // Analyze time variance
    const timeVariance = result.maxTime - result.minTime;
    if (timeVariance > result.averageTime) {
      suggestions.push({
        type: 'algorithm',
        description: `${result.operation} has high time variance (${timeVariance.toFixed(2)}ms range)`,
        expectedImprovement: 'More predictable performance',
        implementation: 'Investigate and eliminate performance bottlenecks',
        priority: 'medium'
      });
    }

    // Suggest caching for expensive operations
    if (result.averageTime > 10 && !result.optimizationApplied) {
      suggestions.push({
        type: 'caching',
        description: `${result.operation} could benefit from caching (${result.averageTime.toFixed(2)}ms per operation)`,
        expectedImprovement: '90%+ improvement for repeated operations',
        implementation: 'Implement LRU cache with appropriate invalidation strategy',
        priority: 'high'
      });
    }
  }

  // Suggest parallelization for batch operations
  if (benchmarkResults.some(r => r.nodeCount > 500)) {
    suggestions.push({
      type: 'parallelization',
      description: 'Large ASTs could benefit from parallel processing',
      expectedImprovement: '2-4x improvement depending on CPU cores',
      implementation: 'Use Web Workers or worker threads for parallel AST processing',
      priority: 'medium'
    });
  }

  return suggestions;
}

/**
 * Get cache performance statistics
 */
export function getCacheStats(): {
  complexity: any;
  analysis: any;
  nodeQuery: any;
} {
  return {
    complexity: complexityCache.getStats(),
    analysis: analysisCache.getStats(),
    nodeQuery: nodeQueryCache.getStats()
  };
}

/**
 * Clear all performance caches
 */
export function clearAllCaches(): void {
  complexityCache.clear();
  analysisCache.clear();
  nodeQueryCache.clear();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a simple hash for AST structure (for caching)
 */
function generateASTHash(ast: ASTNode): string {
  const key = JSON.stringify({
    type: ast.type,
    nodeCount: countNodes(ast),
    features: (ast as any).features?.length || 0,
    start: ast.start,
    end: ast.end
  });
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(36);
}

/**
 * Count total nodes in AST
 */
function countNodes(ast: ASTNode): number {
  let count = 0;
  visit(ast, {
    enter: () => { count++; }
  });
  return count;
}

/**
 * Format benchmark results for display
 */
export function formatBenchmarkResults(results: BenchmarkResult[]): string {
  const lines: string[] = [];
  lines.push('Performance Benchmark Results');
  lines.push('============================');
  
  for (const result of results) {
    lines.push(`\n${result.operation}:`);
    lines.push(`  Average Time: ${result.averageTime.toFixed(3)}ms`);
    lines.push(`  Throughput: ${result.throughput.toFixed(1)} ops/sec`);
    lines.push(`  Memory Used: ${(result.memoryUsed / 1024).toFixed(1)}KB`);
    lines.push(`  Node Count: ${result.nodeCount}`);
    
    if (result.optimizationApplied) {
      lines.push(`  Optimization: ${result.optimizationApplied}`);
    }
    
    lines.push(`  Range: ${result.minTime.toFixed(3)}ms - ${result.maxTime.toFixed(3)}ms`);
  }
  
  return lines.join('\n');
}

/**
 * Format optimization suggestions for display
 */
export function formatOptimizationSuggestions(suggestions: OptimizationSuggestion[]): string {
  const lines: string[] = [];
  lines.push('Performance Optimization Suggestions');
  lines.push('===================================');
  
  const priorityOrder = ['high', 'medium', 'low'];
  
  for (const priority of priorityOrder) {
    const prioritySuggestions = suggestions.filter(s => s.priority === priority);
    if (prioritySuggestions.length === 0) continue;
    
    lines.push(`\n${priority.toUpperCase()} PRIORITY:`);
    
    for (const suggestion of prioritySuggestions) {
      lines.push(`\n• ${suggestion.description}`);
      lines.push(`  Type: ${suggestion.type}`);
      lines.push(`  Expected Improvement: ${suggestion.expectedImprovement}`);
      lines.push(`  Implementation: ${suggestion.implementation}`);
    }
  }
  
  return lines.join('\n');
}