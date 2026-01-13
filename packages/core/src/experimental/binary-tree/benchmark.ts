/**
 * Benchmark - Performance comparison between Binary Tree and JSON
 *
 * This module provides benchmarks to compare the performance of the
 * binary tree serialization format against JSON for common operations:
 *
 * 1. Serialization: Object → Wire format
 * 2. Full deserialization: Wire format → Object
 * 3. Single field access: Get one field from serialized data
 * 4. Multiple field access: Get several fields from serialized data
 *
 * The key hypothesis is that binary tree format should be significantly
 * faster for single/few field access due to O(log n) binary search vs
 * O(n) full JSON parse.
 */

import { BinaryTree, serialize, deserialize, getString, getNumber } from './index';

// =============================================================================
// Benchmark Types
// =============================================================================

export interface BenchmarkResult {
  name: string;
  iterations: number;
  jsonTime: number;
  binaryTime: number;
  speedup: number;
  jsonSize: number;
  binarySize: number;
  sizeRatio: number;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  summary: {
    avgSpeedup: number;
    avgSizeRatio: number;
    totalJsonTime: number;
    totalBinaryTime: number;
  };
}

// =============================================================================
// Test Data Generators
// =============================================================================

/**
 * Generates a simple AST-like structure
 */
function generateSimpleAST(): object {
  return {
    type: 'command',
    name: 'toggle',
    args: [{ type: 'selector', value: '.active' }],
    isBlocking: false,
    line: 1,
    column: 1,
  };
}

/**
 * Generates a complex AST-like structure with nesting
 */
function generateComplexAST(): object {
  return {
    type: 'feature',
    name: 'on',
    trigger: {
      type: 'event',
      name: 'click',
      filter: null,
    },
    body: [
      {
        type: 'command',
        name: 'toggle',
        args: [{ type: 'selector', value: '.active' }],
        isBlocking: false,
      },
      {
        type: 'command',
        name: 'wait',
        args: [{ type: 'literal', value: 100 }],
        isBlocking: true,
        modifiers: { unit: 'ms' },
      },
      {
        type: 'command',
        name: 'add',
        args: [{ type: 'selector', value: '.done' }],
        isBlocking: false,
        modifiers: {
          to: { type: 'identifier', value: 'me' },
        },
      },
    ],
    line: 1,
    column: 1,
  };
}

/**
 * Generates a large AST with many commands
 */
function generateLargeAST(commandCount: number): object {
  const body = [];
  for (let i = 0; i < commandCount; i++) {
    body.push({
      type: 'command',
      name: i % 3 === 0 ? 'toggle' : i % 3 === 1 ? 'add' : 'remove',
      args: [{ type: 'selector', value: `.class-${i}` }],
      isBlocking: i % 5 === 0,
      line: i + 1,
      column: 1,
    });
  }

  return {
    type: 'feature',
    name: 'on',
    trigger: { type: 'event', name: 'click' },
    body,
    metadata: {
      version: '1.0.0',
      generated: true,
      commandCount,
    },
  };
}

/**
 * Generates a deeply nested structure
 */
function generateDeepAST(depth: number): object {
  let current: object = { type: 'leaf', value: 'bottom' };

  for (let i = depth - 1; i >= 0; i--) {
    current = {
      type: 'node',
      depth: i,
      child: current,
    };
  }

  return current;
}

// =============================================================================
// Benchmark Functions
// =============================================================================

/**
 * Runs a timed benchmark
 */
function runTimed(fn: () => void, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  return performance.now() - start;
}

/**
 * Benchmarks serialization performance
 */
function benchmarkSerialization(data: object, iterations: number): BenchmarkResult {
  const jsonTime = runTimed(() => {
    JSON.stringify(data);
  }, iterations);

  const binaryTime = runTimed(() => {
    serialize(data);
  }, iterations);

  const jsonSize = JSON.stringify(data).length;
  const binarySize = serialize(data).byteLength;

  return {
    name: 'Serialization',
    iterations,
    jsonTime,
    binaryTime,
    speedup: jsonTime / binaryTime,
    jsonSize,
    binarySize,
    sizeRatio: binarySize / jsonSize,
  };
}

/**
 * Benchmarks full deserialization performance
 */
function benchmarkDeserialization(data: object, iterations: number): BenchmarkResult {
  const jsonStr = JSON.stringify(data);
  const binaryBuf = serialize(data);

  const jsonTime = runTimed(() => {
    JSON.parse(jsonStr);
  }, iterations);

  const binaryTime = runTimed(() => {
    deserialize(binaryBuf);
  }, iterations);

  return {
    name: 'Full Deserialization',
    iterations,
    jsonTime,
    binaryTime,
    speedup: jsonTime / binaryTime,
    jsonSize: jsonStr.length,
    binarySize: binaryBuf.byteLength,
    sizeRatio: binaryBuf.byteLength / jsonStr.length,
  };
}

/**
 * Benchmarks single field access - THE KEY BENCHMARK
 */
function benchmarkSingleFieldAccess(data: object, iterations: number): BenchmarkResult {
  const jsonStr = JSON.stringify(data);
  const binaryBuf = serialize(data);

  // JSON: must parse entire structure to get one field
  const jsonTime = runTimed(() => {
    const parsed = JSON.parse(jsonStr);
    void parsed.type;
  }, iterations);

  // Binary: zero-copy access to single field
  const binaryTime = runTimed(() => {
    getString(binaryBuf, ['type']);
  }, iterations);

  return {
    name: 'Single Field Access',
    iterations,
    jsonTime,
    binaryTime,
    speedup: jsonTime / binaryTime,
    jsonSize: jsonStr.length,
    binarySize: binaryBuf.byteLength,
    sizeRatio: binaryBuf.byteLength / jsonStr.length,
  };
}

/**
 * Benchmarks nested field access
 */
function benchmarkNestedFieldAccess(
  data: object,
  path: string[],
  iterations: number
): BenchmarkResult {
  const jsonStr = JSON.stringify(data);
  const binaryBuf = serialize(data);

  // JSON: must parse entire structure
  const jsonTime = runTimed(() => {
    let value: unknown = JSON.parse(jsonStr);
    for (const key of path) {
      value = (value as Record<string, unknown>)[key];
    }
  }, iterations);

  // Binary: navigate directly to nested field
  const binaryTime = runTimed(() => {
    getString(binaryBuf, path);
  }, iterations);

  return {
    name: `Nested Field Access (${path.join('.')})`,
    iterations,
    jsonTime,
    binaryTime,
    speedup: jsonTime / binaryTime,
    jsonSize: jsonStr.length,
    binarySize: binaryBuf.byteLength,
    sizeRatio: binaryBuf.byteLength / jsonStr.length,
  };
}

/**
 * Benchmarks multiple field access
 */
function benchmarkMultipleFieldAccess(
  data: object,
  fieldCount: number,
  iterations: number
): BenchmarkResult {
  const jsonStr = JSON.stringify(data);
  const binaryBuf = serialize(data);
  const dataAsRecord = data as Record<string, unknown>;
  const fields = Object.keys(dataAsRecord).slice(0, fieldCount);

  // JSON: parse once, access multiple fields
  const jsonTime = runTimed(() => {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    for (const field of fields) {
      void parsed[field];
    }
  }, iterations);

  // Binary: access each field independently
  const binaryTime = runTimed(() => {
    for (const field of fields) {
      getString(binaryBuf, [field]);
    }
  }, iterations);

  return {
    name: `Multiple Field Access (${fieldCount} fields)`,
    iterations,
    jsonTime,
    binaryTime,
    speedup: jsonTime / binaryTime,
    jsonSize: jsonStr.length,
    binarySize: binaryBuf.byteLength,
    sizeRatio: binaryBuf.byteLength / jsonStr.length,
  };
}

// =============================================================================
// Main Benchmark Suite
// =============================================================================

/**
 * Runs the complete benchmark suite
 */
export function runBenchmarks(iterations = 1000): BenchmarkSuite {
  const results: BenchmarkResult[] = [];

  // Simple AST benchmarks
  const simpleAST = generateSimpleAST();
  results.push(benchmarkSerialization(simpleAST, iterations));
  results.push(benchmarkDeserialization(simpleAST, iterations));
  results.push(benchmarkSingleFieldAccess(simpleAST, iterations));

  // Complex AST benchmarks
  const complexAST = generateComplexAST();
  results.push({
    ...benchmarkSingleFieldAccess(complexAST, iterations),
    name: 'Single Field Access (Complex AST)',
  });
  results.push(
    benchmarkNestedFieldAccess(complexAST, ['body', 0, 'type'] as unknown as string[], iterations)
  );

  // Large AST benchmarks
  const largeAST = generateLargeAST(100);
  results.push({
    ...benchmarkSingleFieldAccess(largeAST, iterations),
    name: 'Single Field Access (Large AST)',
  });
  results.push(
    benchmarkNestedFieldAccess(largeAST, ['body', 50, 'name'] as unknown as string[], iterations)
  );

  // Deep AST benchmarks
  const deepAST = generateDeepAST(10);
  results.push({
    ...benchmarkSingleFieldAccess(deepAST, iterations),
    name: 'Single Field Access (Deep AST)',
  });

  // Calculate summary
  const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length;
  const avgSizeRatio = results.reduce((sum, r) => sum + r.sizeRatio, 0) / results.length;
  const totalJsonTime = results.reduce((sum, r) => sum + r.jsonTime, 0);
  const totalBinaryTime = results.reduce((sum, r) => sum + r.binaryTime, 0);

  return {
    name: 'Binary Tree vs JSON Benchmark',
    results,
    summary: {
      avgSpeedup,
      avgSizeRatio,
      totalJsonTime,
      totalBinaryTime,
    },
  };
}

/**
 * Formats benchmark results as a readable string
 */
export function formatBenchmarkResults(suite: BenchmarkSuite): string {
  const lines: string[] = [];

  lines.push(`\n${'='.repeat(80)}`);
  lines.push(`${suite.name}`);
  lines.push(`${'='.repeat(80)}\n`);

  lines.push(
    `${'Test'.padEnd(40)} | ${'JSON'.padStart(10)} | ${'Binary'.padStart(10)} | ${'Speedup'.padStart(8)} | ${'Size Ratio'.padStart(10)}`
  );
  lines.push(
    `${'-'.repeat(40)}-+-${'-'.repeat(10)}-+-${'-'.repeat(10)}-+-${'-'.repeat(8)}-+-${'-'.repeat(10)}`
  );

  for (const result of suite.results) {
    const speedupStr =
      result.speedup >= 1
        ? `${result.speedup.toFixed(2)}x`
        : `${(1 / result.speedup).toFixed(2)}x slower`;

    lines.push(
      `${result.name.padEnd(40)} | ${result.jsonTime.toFixed(2).padStart(7)}ms | ${result.binaryTime.toFixed(2).padStart(7)}ms | ${speedupStr.padStart(8)} | ${result.sizeRatio.toFixed(2).padStart(10)}`
    );
  }

  lines.push(`\n${'='.repeat(80)}`);
  lines.push(`Summary:`);
  lines.push(`  Average Speedup: ${suite.summary.avgSpeedup.toFixed(2)}x`);
  lines.push(`  Average Size Ratio: ${suite.summary.avgSizeRatio.toFixed(2)} (binary/json)`);
  lines.push(`  Total JSON Time: ${suite.summary.totalJsonTime.toFixed(2)}ms`);
  lines.push(`  Total Binary Time: ${suite.summary.totalBinaryTime.toFixed(2)}ms`);
  lines.push(`${'='.repeat(80)}\n`);

  return lines.join('\n');
}

/**
 * Runs benchmarks and prints formatted results
 */
export function runAndPrintBenchmarks(iterations = 1000): void {
  const suite = runBenchmarks(iterations);
  console.log(formatBenchmarkResults(suite));
}
