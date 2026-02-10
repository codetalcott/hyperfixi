/**
 * HyperScript Profiler - Performance analysis for hyperscript code
 *
 * Leverages @hyperfixi/core/ast-utils for static analysis and provides
 * runtime profiling capabilities for hyperscript execution.
 */

import type { ProfileResult, ProfileOperation, ProfileHotSpot } from './types';

// Import ast-utils analysis functions when available
interface AstToolkitFunctions {
  calculateComplexity?: (ast: any) => any;
  detectCodeSmells?: (ast: any) => any[];
  analyzeMetrics?: (ast: any) => any;
  suggestOptimizations?: (ast: any) => any[];
}

let astToolkit: AstToolkitFunctions | null = null;

// Dynamic import to handle optional dependency
async function loadAstToolkit(): Promise<AstToolkitFunctions> {
  if (astToolkit === null) {
    try {
      const toolkit = await import('@hyperfixi/core/ast-utils');
      astToolkit = {
        calculateComplexity: (ast: any) => toolkit.calculateComplexity?.(ast),
        detectCodeSmells: (ast: any) => toolkit.detectCodeSmells?.(ast),
        analyzeMetrics: (ast: any) => toolkit.analyzeMetrics?.(ast),
        suggestOptimizations: (ast: any) => toolkit.suggestOptimizations?.(ast),
      };
    } catch {
      astToolkit = {};
    }
  }
  return astToolkit;
}

/**
 * Profiler configuration
 */
export interface ProfilerConfig {
  /** Number of iterations for timing accuracy */
  iterations?: number;
  /** Enable memory profiling (may impact performance) */
  memoryProfiling?: boolean;
  /** Warmup iterations before measurement */
  warmupIterations?: number;
  /** Include static analysis */
  staticAnalysis?: boolean;
}

/**
 * Execution timing result
 */
interface TimingResult {
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
}

/**
 * HyperScript Profiler class
 */
export class HyperScriptProfiler {
  private config: Required<ProfilerConfig>;

  constructor(config: ProfilerConfig = {}) {
    this.config = {
      iterations: config.iterations ?? 100,
      memoryProfiling: config.memoryProfiling ?? false,
      warmupIterations: config.warmupIterations ?? 10,
      staticAnalysis: config.staticAnalysis !== false,
    };
  }

  /**
   * Profile hyperscript code execution
   */
  async profile(
    code: string,
    executor?: (code: string) => Promise<void> | void
  ): Promise<ProfileResult> {
    const operations: ProfileOperation[] = [];
    const hotSpots: ProfileHotSpot[] = [];
    const recommendations: string[] = [];

    // Measure execution timing
    const timing = await this.measureTiming(code, executor);

    // Measure memory if enabled
    const memory = this.config.memoryProfiling
      ? this.measureMemory()
      : { used: 0, total: 0, peak: 0 };

    // Create main operation record
    operations.push({
      name: 'execute',
      duration: timing.averageTime,
      calls: timing.iterations,
      memory: memory.used,
      children: [],
    });

    // Run static analysis if enabled
    if (this.config.staticAnalysis) {
      const staticResults = await this.runStaticAnalysis(code);
      operations.push(...staticResults.operations);
      hotSpots.push(...staticResults.hotSpots);
      recommendations.push(...staticResults.recommendations);
    }

    // Generate performance recommendations
    recommendations.push(...this.generatePerformanceRecommendations(timing, code));

    return {
      duration: timing.totalTime,
      memory,
      operations,
      hotSpots,
      recommendations,
    };
  }

  /**
   * Measure execution timing
   */
  private async measureTiming(
    code: string,
    executor?: (code: string) => Promise<void> | void
  ): Promise<TimingResult> {
    const times: number[] = [];

    // Default executor that just parses (for static timing)
    const defaultExecutor = (_code: string) => {
      // Simulate parsing overhead
      _code.split(/\s+/);
    };

    const exec = executor || defaultExecutor;

    // Warmup iterations
    for (let i = 0; i < this.config.warmupIterations; i++) {
      await exec(code);
    }

    // Measured iterations
    for (let i = 0; i < this.config.iterations; i++) {
      const start = performance.now();
      await exec(code);
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);

    return {
      totalTime,
      averageTime: totalTime / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      iterations: times.length,
    };
  }

  /**
   * Measure current memory usage
   */
  private measureMemory(): { used: number; total: number; peak: number } {
    // Node.js memory measurement
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        used: mem.heapUsed,
        total: mem.heapTotal,
        peak: mem.heapTotal, // Approximate peak
      };
    }

    // Browser memory measurement (if available)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      return {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        peak: mem.jsHeapSizeLimit,
      };
    }

    return { used: 0, total: 0, peak: 0 };
  }

  /**
   * Run static analysis using core/ast-utils
   */
  private async runStaticAnalysis(code: string): Promise<{
    operations: ProfileOperation[];
    hotSpots: ProfileHotSpot[];
    recommendations: string[];
  }> {
    const operations: ProfileOperation[] = [];
    const hotSpots: ProfileHotSpot[] = [];
    const recommendations: string[] = [];

    const toolkit = await loadAstToolkit();

    // Analyze code patterns
    const patterns = this.analyzeCodePatterns(code);

    // Check for expensive operations
    if (patterns.selectorCount > 5) {
      hotSpots.push({
        location: 'selectors',
        operation: 'DOM queries',
        impact: patterns.selectorCount * 0.1,
        suggestion: `${patterns.selectorCount} DOM selectors found. Consider caching selector results.`,
      });
    }

    if (patterns.loopCount > 0) {
      hotSpots.push({
        location: 'loops',
        operation: 'iteration',
        impact: patterns.loopCount * 0.2,
        suggestion: `${patterns.loopCount} loop(s) detected. Ensure efficient iteration.`,
      });
    }

    if (patterns.nestedConditions > 2) {
      hotSpots.push({
        location: 'conditions',
        operation: 'branching',
        impact: patterns.nestedConditions * 0.05,
        suggestion: 'Deep nesting detected. Consider refactoring for clarity.',
      });
    }

    // Use core/ast-utils if available
    if (toolkit?.suggestOptimizations) {
      try {
        // Would need actual AST, using code analysis fallback
        const suggestions = await this.getFallbackSuggestions(patterns);
        recommendations.push(...suggestions);
      } catch {
        // Fallback to basic suggestions
      }
    }

    // Add pattern-based operation
    operations.push({
      name: 'static-analysis',
      duration: 0,
      calls: 1,
      memory: 0,
      children: [
        {
          name: 'pattern-detection',
          duration: 0,
          calls: 1,
          memory: 0,
          children: [],
        },
      ],
    });

    return { operations, hotSpots, recommendations };
  }

  /**
   * Analyze code patterns without AST
   */
  private analyzeCodePatterns(code: string): {
    selectorCount: number;
    loopCount: number;
    nestedConditions: number;
    eventCount: number;
    commandCount: number;
  } {
    return {
      selectorCount: (code.match(/#[a-zA-Z][\w-]*|\.[a-zA-Z][\w-]*/g) || []).length,
      loopCount: (code.match(/\b(for|while|repeat)\b/gi) || []).length,
      nestedConditions: this.countNestedConditions(code),
      eventCount: (code.match(/\bon\s+\w+/gi) || []).length,
      commandCount: (
        code.match(/\b(add|remove|toggle|set|put|get|call|send|trigger|wait|log)\b/gi) || []
      ).length,
    };
  }

  /**
   * Count nested conditional depth
   */
  private countNestedConditions(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    const tokens = code.split(/\s+/);
    for (const token of tokens) {
      if (/^(if|unless|when)$/i.test(token)) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (/^(end|otherwise)$/i.test(token)) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  /**
   * Get fallback optimization suggestions
   */
  private async getFallbackSuggestions(patterns: {
    selectorCount: number;
    loopCount: number;
    nestedConditions: number;
    eventCount: number;
    commandCount: number;
  }): Promise<string[]> {
    const suggestions: string[] = [];

    if (patterns.selectorCount > 10) {
      suggestions.push(
        'Consider using event delegation instead of multiple element-specific handlers.'
      );
    }

    if (patterns.loopCount > 3) {
      suggestions.push('Multiple loops detected. Consider combining operations where possible.');
    }

    if (patterns.nestedConditions > 3) {
      suggestions.push(
        'Complex conditional logic detected. Consider extracting to named behaviors.'
      );
    }

    if (patterns.eventCount > 5) {
      suggestions.push(
        'Many event handlers found. Consider using behaviors for reusable patterns.'
      );
    }

    return suggestions;
  }

  /**
   * Generate performance recommendations based on timing
   */
  private generatePerformanceRecommendations(timing: TimingResult, code: string): string[] {
    const recommendations: string[] = [];

    // Check for slow execution
    if (timing.averageTime > 16) {
      recommendations.push(
        `Average execution time (${timing.averageTime.toFixed(2)}ms) exceeds frame budget (16ms). Consider optimizing or deferring work.`
      );
    }

    // Check for high variance
    const variance = timing.maxTime - timing.minTime;
    if (variance > timing.averageTime * 0.5) {
      recommendations.push('High timing variance detected. Execution time may be unpredictable.');
    }

    // Check code length
    if (code.length > 1000) {
      recommendations.push(
        'Long hyperscript detected. Consider breaking into smaller, focused behaviors.'
      );
    }

    return recommendations;
  }

  /**
   * Profile multiple code snippets and compare
   */
  async compare(
    snippets: Array<{ name: string; code: string }>,
    executor?: (code: string) => Promise<void> | void
  ): Promise<Array<{ name: string; result: ProfileResult }>> {
    const results: Array<{ name: string; result: ProfileResult }> = [];

    for (const snippet of snippets) {
      const result = await this.profile(snippet.code, executor);
      results.push({ name: snippet.name, result });
    }

    // Sort by duration
    return results.sort((a, b) => a.result.duration - b.result.duration);
  }

  /**
   * Get profiler summary report
   */
  getSummaryReport(result: ProfileResult): string {
    const lines: string[] = [
      '=== HyperScript Profile Report ===',
      '',
      'Timing:',
      `  Duration: ${result.duration.toFixed(2)}ms`,
      '',
      'Memory:',
      `  Used:  ${this.formatBytes(result.memory.used)}`,
      `  Total: ${this.formatBytes(result.memory.total)}`,
      `  Peak:  ${this.formatBytes(result.memory.peak)}`,
      '',
      `Operations: ${result.operations.length}`,
      ...result.operations.map(
        op => `  - ${op.name}: ${op.duration.toFixed(2)}ms (${op.calls} calls)`
      ),
      '',
      `Hot Spots: ${result.hotSpots.length}`,
      ...result.hotSpots.map(hs => `  - ${hs.location}: ${hs.suggestion}`),
      '',
      'Recommendations:',
      ...result.recommendations.map(r => `  - ${r}`),
    ];

    return lines.join('\n');
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

/**
 * Quick profile function
 */
export async function profile(code: string, config?: ProfilerConfig): Promise<ProfileResult> {
  const profiler = new HyperScriptProfiler(config);
  return profiler.profile(code);
}

/**
 * Compare multiple code snippets
 */
export async function compareProfiles(
  snippets: Array<{ name: string; code: string }>,
  config?: ProfilerConfig
): Promise<Array<{ name: string; result: ProfileResult }>> {
  const profiler = new HyperScriptProfiler(config);
  return profiler.compare(snippets);
}

export default HyperScriptProfiler;
