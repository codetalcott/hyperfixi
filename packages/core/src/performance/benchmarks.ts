/**
 * Enhanced Performance Benchmarks - Production Performance Analysis
 * Measures real performance characteristics of enhanced TypeScript implementations
 * Focus: Enhanced commands and expressions with comprehensive metrics
 */

import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  name: string;
  category: 'command' | 'expression' | 'validation' | 'integration';
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  metadata: {
    complexity: 'low' | 'medium' | 'high';
    operationType: string;
    inputSize?: number;
    validationPassed: boolean;
  };
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  summary: {
    totalTests: number;
    totalTime: number;
    fastestTest: string;
    slowestTest: string;
    memoryEfficient: string;
    memoryIntensive: string;
  };
}

/**
 * Core benchmarking utility for enhanced implementations
 */
export class EnhancedBenchmark {
  private results: BenchmarkResult[] = [];

  async benchmark<T>(
    name: string,
    category: BenchmarkResult['category'],
    operation: () => Promise<T> | T,
    options: {
      iterations?: number;
      warmupRuns?: number;
      complexity?: 'low' | 'medium' | 'high';
      operationType: string;
      inputSize?: number;
    } = { operationType: 'unknown' }
  ): Promise<BenchmarkResult> {
    const iterations = options.iterations || 1000;
    const warmupRuns = options.warmupRuns || 100;

    // Warmup runs to stabilize performance
    for (let i = 0; i < warmupRuns; i++) {
      await operation();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const times: number[] = [];
    let validationPassed = true;
    const startMemory = process.memoryUsage();

    // Actual benchmark runs
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        const result = await operation();
        // Basic validation - ensure operation returns something meaningful
        if (result === undefined || result === null) {
          validationPassed = false;
        }
      } catch (error) {
        validationPassed = false;
        console.warn(`Benchmark ${name} failed on iteration ${i}:`, error);
      }

      const end = performance.now();
      times.push(end - start);
    }

    const endMemory = process.memoryUsage();

    // Calculate statistics
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const result: BenchmarkResult = {
      name,
      category,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      memoryUsage: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external,
      },
      metadata: {
        complexity: options.complexity || 'medium',
        operationType: options.operationType,
        ...(options.inputSize !== undefined && { inputSize: options.inputSize }),
        validationPassed,
      },
    };

    this.results.push(result);
    return result;
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  generateSuite(name: string): BenchmarkSuite {
    const results = this.getResults();

    if (results.length === 0) {
      return {
        name,
        results: [],
        summary: {
          totalTests: 0,
          totalTime: 0,
          fastestTest: 'none',
          slowestTest: 'none',
          memoryEfficient: 'none',
          memoryIntensive: 'none',
        },
      };
    }

    const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
    const fastestTest = results.reduce((min, r) => (r.averageTime < min.averageTime ? r : min));
    const slowestTest = results.reduce((max, r) => (r.averageTime > max.averageTime ? r : max));

    const memoryEfficient = results
      .filter(r => r.memoryUsage)
      .reduce((min, r) => (r.memoryUsage!.heapUsed < min.memoryUsage!.heapUsed ? r : min));

    const memoryIntensive = results
      .filter(r => r.memoryUsage)
      .reduce((max, r) => (r.memoryUsage!.heapUsed > max.memoryUsage!.heapUsed ? r : max));

    return {
      name,
      results,
      summary: {
        totalTests: results.length,
        totalTime,
        fastestTest: fastestTest.name,
        slowestTest: slowestTest.name,
        memoryEfficient: memoryEfficient?.name || 'none',
        memoryIntensive: memoryIntensive?.name || 'none',
      },
    };
  }

  clear(): void {
    this.results = [];
  }

  /**
   * Format results for console output
   */
  formatResults(suite: BenchmarkSuite): string {
    const lines: string[] = [];
    lines.push(`\n📊 Performance Benchmark: ${suite.name}`);
    lines.push('='.repeat(50));

    if (suite.results.length === 0) {
      lines.push('No benchmark results available');
      return lines.join('\n');
    }

    // Summary
    lines.push(`\n📈 Summary:`);
    lines.push(`  Total Tests: ${suite.summary.totalTests}`);
    lines.push(`  Total Time: ${suite.summary.totalTime.toFixed(2)}ms`);
    lines.push(`  Fastest: ${suite.summary.fastestTest}`);
    lines.push(`  Slowest: ${suite.summary.slowestTest}`);
    lines.push(`  Memory Efficient: ${suite.summary.memoryEfficient}`);
    lines.push(`  Memory Intensive: ${suite.summary.memoryIntensive}`);

    // Detailed results by category
    const categories = ['command', 'expression', 'validation', 'integration'] as const;

    for (const category of categories) {
      const categoryResults = suite.results.filter(r => r.category === category);
      if (categoryResults.length === 0) continue;

      lines.push(`\n🔍 ${category.toUpperCase()} Performance:`);
      lines.push('-'.repeat(30));

      categoryResults
        .sort((a, b) => a.averageTime - b.averageTime)
        .forEach(result => {
          const validation = result.metadata.validationPassed ? '✅' : '❌';
          const complexity = result.metadata.complexity.toUpperCase();
          const memory = result.memoryUsage
            ? `${(result.memoryUsage.heapUsed / 1024).toFixed(1)}KB`
            : 'N/A';

          lines.push(`  ${validation} ${result.name}`);
          lines.push(
            `     Avg: ${result.averageTime.toFixed(3)}ms | Min: ${result.minTime.toFixed(3)}ms | Max: ${result.maxTime.toFixed(3)}ms`
          );
          lines.push(
            `     Complexity: ${complexity} | Memory: ${memory} | Iterations: ${result.iterations}`
          );
        });
    }

    return lines.join('\n');
  }
}

// Singleton instance for global benchmarking
export const globalBenchmark = new EnhancedBenchmark();

/**
 * Convenience function for quick benchmarks
 */
export async function quickBenchmark<T>(
  name: string,
  operation: () => Promise<T> | T,
  category: BenchmarkResult['category'] = 'integration',
  iterations = 100
): Promise<BenchmarkResult> {
  return globalBenchmark.benchmark(name, category, operation, {
    iterations,
    operationType: 'quick-test',
  });
}

/**
 * Production performance measurement decorator
 */
export function measurePerformance(
  name: string,
  category: BenchmarkResult['category'] = 'command'
) {
  return function <T extends (...args: any[]) => any>(
    _target: any,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: any, ...args: Parameters<T>) {
      const start = performance.now();
      const result = await originalMethod.apply(this, args);
      const end = performance.now();

      // Log performance data for production monitoring
      if (end - start > 10) {
        // Only log slow operations (>10ms)
        console.debug(`🐌 Slow ${category}: ${name} took ${(end - start).toFixed(2)}ms`);
      }

      return result;
    } as T;

    return descriptor;
  };
}
