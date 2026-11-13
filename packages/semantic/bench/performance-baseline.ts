/**
 * Performance Baseline Benchmark
 *
 * Measures parse time and AST build time for the semantic package.
 * Run this before and after changes to detect performance regressions.
 *
 * Usage:
 *   npx tsx bench/performance-baseline.ts
 *
 * Results are printed to stdout and can be compared across runs.
 */

import { parse, buildAST, canParse, translate, getSupportedLanguages } from '../src';

// =============================================================================
// Configuration
// =============================================================================

const WARMUP_ITERATIONS = 100;
const BENCHMARK_ITERATIONS = 1000;

// Test cases for different commands
const TEST_CASES = [
  // Simple commands
  { lang: 'en', code: 'toggle .active' },
  { lang: 'en', code: 'add .highlight' },
  { lang: 'en', code: 'remove .selected' },
  { lang: 'en', code: 'hide me' },
  { lang: 'en', code: 'show me' },
  { lang: 'en', code: "put 'hello' into me" },
  { lang: 'en', code: 'wait 500ms' },
  { lang: 'en', code: 'log "debug"' },

  // Commands with modifiers
  { lang: 'en', code: 'toggle .active on #button' },
  { lang: 'en', code: 'add .highlight to #container' },

  // Japanese (SOV)
  { lang: 'ja', code: '.active を トグル' },
  { lang: 'ja', code: '.highlight を 追加' },
  { lang: 'ja', code: '.selected を 削除' },

  // Korean (SOV)
  { lang: 'ko', code: '.active 를 토글' },
  { lang: 'ko', code: '.highlight 를 추가' },

  // Spanish (SVO)
  { lang: 'es', code: 'alternar .active' },
  { lang: 'es', code: 'añadir .highlight' },

  // Arabic (VSO)
  { lang: 'ar', code: 'بدّل .active' },
  { lang: 'ar', code: 'أضف .highlight' },

  // Chinese (SVO)
  { lang: 'zh', code: '切换 .active' },

  // Turkish (SOV)
  { lang: 'tr', code: '.active değiştir' },
];

// =============================================================================
// Benchmark Utilities
// =============================================================================

function formatTime(ms: number): string {
  if (ms < 0.001) {
    return `${(ms * 1000000).toFixed(2)} ns`;
  } else if (ms < 1) {
    return `${(ms * 1000).toFixed(2)} µs`;
  } else {
    return `${ms.toFixed(2)} ms`;
  }
}

function formatOps(ops: number): string {
  if (ops >= 1000000) {
    return `${(ops / 1000000).toFixed(2)}M ops/s`;
  } else if (ops >= 1000) {
    return `${(ops / 1000).toFixed(2)}K ops/s`;
  } else {
    return `${ops.toFixed(2)} ops/s`;
  }
}

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  opsPerSecond: number;
}

function runBenchmark(
  name: string,
  fn: () => void,
  iterations: number
): BenchmarkResult {
  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn();
  }

  // Benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();

  const totalMs = end - start;
  const avgMs = totalMs / iterations;
  const opsPerSecond = 1000 / avgMs;

  return {
    name,
    iterations,
    totalMs,
    avgMs,
    opsPerSecond,
  };
}

// =============================================================================
// Benchmarks
// =============================================================================

function runParseBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  // Individual language parse times
  const languages = ['en', 'ja', 'ko', 'es', 'ar', 'zh', 'tr'];

  for (const lang of languages) {
    const testCase = TEST_CASES.find((tc) => tc.lang === lang);
    if (testCase) {
      const result = runBenchmark(
        `parse (${lang})`,
        () => parse(testCase.code, testCase.lang),
        BENCHMARK_ITERATIONS
      );
      results.push(result);
    }
  }

  return results;
}

function runASTBuildBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  // Pre-parse nodes
  const parsedNodes = TEST_CASES.slice(0, 5).map((tc) => ({
    lang: tc.lang,
    node: parse(tc.code, tc.lang),
  }));

  for (const { lang, node } of parsedNodes) {
    const result = runBenchmark(
      `buildAST (${lang})`,
      () => buildAST(node),
      BENCHMARK_ITERATIONS
    );
    results.push(result);
  }

  return results;
}

function runCanParseBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  // Test canParse (should be fast - no full parse)
  results.push(
    runBenchmark(
      'canParse (parseable)',
      () => canParse('toggle .active', 'en'),
      BENCHMARK_ITERATIONS
    )
  );

  results.push(
    runBenchmark(
      'canParse (unparseable)',
      () => canParse('foobar baz', 'en'),
      BENCHMARK_ITERATIONS
    )
  );

  return results;
}

function runTranslateBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  results.push(
    runBenchmark(
      'translate (en→ja)',
      () => translate('toggle .active', 'en', 'ja'),
      BENCHMARK_ITERATIONS / 10 // Translation is slower
    )
  );

  results.push(
    runBenchmark(
      'translate (ja→en)',
      () => translate('.active を トグル', 'ja', 'en'),
      BENCHMARK_ITERATIONS / 10
    )
  );

  return results;
}

function runFullPipelineBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  // Full pipeline: parse + buildAST
  results.push(
    runBenchmark(
      'full pipeline (en)',
      () => {
        const node = parse('toggle .active', 'en');
        buildAST(node);
      },
      BENCHMARK_ITERATIONS
    )
  );

  results.push(
    runBenchmark(
      'full pipeline (ja)',
      () => {
        const node = parse('.active を トグル', 'ja');
        buildAST(node);
      },
      BENCHMARK_ITERATIONS
    )
  );

  return results;
}

// =============================================================================
// Main
// =============================================================================

function printResults(category: string, results: BenchmarkResult[]): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${category}`);
  console.log('='.repeat(60));
  console.log(
    `${'Name'.padEnd(25)} ${'Avg'.padStart(12)} ${'Ops/sec'.padStart(15)}`
  );
  console.log('-'.repeat(60));

  for (const result of results) {
    console.log(
      `${result.name.padEnd(25)} ${formatTime(result.avgMs).padStart(12)} ${formatOps(result.opsPerSecond).padStart(15)}`
    );
  }
}

function main(): void {
  console.log('Performance Baseline Benchmark');
  console.log('==============================');
  console.log(`Warmup iterations: ${WARMUP_ITERATIONS}`);
  console.log(`Benchmark iterations: ${BENCHMARK_ITERATIONS}`);
  console.log(`Supported languages: ${getSupportedLanguages().join(', ')}`);

  const allResults: { category: string; results: BenchmarkResult[] }[] = [];

  // Run benchmarks
  allResults.push({ category: 'Parse', results: runParseBenchmarks() });
  allResults.push({ category: 'AST Build', results: runASTBuildBenchmarks() });
  allResults.push({ category: 'Can Parse', results: runCanParseBenchmarks() });
  allResults.push({ category: 'Translate', results: runTranslateBenchmarks() });
  allResults.push({ category: 'Full Pipeline', results: runFullPipelineBenchmarks() });

  // Print results
  for (const { category, results } of allResults) {
    printResults(category, results);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary');
  console.log('='.repeat(60));

  const parseAvg =
    allResults[0].results.reduce((acc, r) => acc + r.avgMs, 0) /
    allResults[0].results.length;

  const buildAvg =
    allResults[1].results.reduce((acc, r) => acc + r.avgMs, 0) /
    allResults[1].results.length;

  const pipelineAvg =
    allResults[4].results.reduce((acc, r) => acc + r.avgMs, 0) /
    allResults[4].results.length;

  console.log(`Average parse time: ${formatTime(parseAvg)}`);
  console.log(`Average AST build time: ${formatTime(buildAvg)}`);
  console.log(`Average full pipeline: ${formatTime(pipelineAvg)}`);
  console.log(`\nTarget: < 1ms per command for acceptable user experience`);

  if (pipelineAvg < 1) {
    console.log('✓ Performance is within target');
  } else {
    console.log('⚠ Performance is above target');
  }
}

main();
