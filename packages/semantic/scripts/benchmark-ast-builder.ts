#!/usr/bin/env npx tsx
/**
 * Performance Benchmark: Direct AST Path vs English Text Path
 *
 * Compares the performance of:
 * - Direct path: Input → Semantic Parser → AST Builder → AST
 * - Text path: Input → Semantic Parser → English Text → (would go to Core Parser)
 *
 * Run: npx tsx scripts/benchmark-ast-builder.ts
 */

import { parse, render, buildAST, type SemanticNode } from '../src';

// =============================================================================
// Test Data
// =============================================================================

const TEST_COMMANDS = [
  // Simple commands
  'toggle .active',
  'add .highlight',
  'remove .error',
  'show #modal',
  'hide #sidebar',
  'wait 500ms',
  'log "hello"',

  // Commands with targets
  'toggle .active on #button',
  'add .highlight to #element',
  'remove .error from .field',

  // Property access
  "set #input's value to 'hello'",
  "increment #counter's textContent",

  // Navigation
  'go to /dashboard',
  'focus #search',
];

const MULTILINGUAL_INPUTS = [
  // Japanese (SOV)
  { lang: 'ja', input: '#button の .active を 切り替え', expected: 'toggle' },
  { lang: 'ja', input: '.highlight を 追加', expected: 'add' },
  { lang: 'ja', input: '#modal を 表示', expected: 'show' },

  // Spanish (SVO)
  { lang: 'es', input: 'alternar .active en #button', expected: 'toggle' },
  { lang: 'es', input: 'agregar .highlight a #element', expected: 'add' },

  // Korean (SOV)
  { lang: 'ko', input: '#button 의 .active 를 토글', expected: 'toggle' },

  // Arabic (VSO)
  { lang: 'ar', input: 'بدّل .active على #button', expected: 'toggle' },

  // Chinese (SVO)
  { lang: 'zh', input: '切换 .active 在 #button', expected: 'toggle' },
];

// =============================================================================
// Benchmark Functions
// =============================================================================

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  opsPerSecond: number;
}

function benchmark(name: string, fn: () => void, iterations: number = 1000): BenchmarkResult {
  // Warm up
  for (let i = 0; i < 10; i++) {
    fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();

  const totalMs = end - start;
  const avgMs = totalMs / iterations;
  const opsPerSecond = Math.round(1000 / avgMs);

  return { name, iterations, totalMs, avgMs, opsPerSecond };
}

function formatResult(result: BenchmarkResult): string {
  return `${result.name}: ${result.avgMs.toFixed(3)}ms avg (${result.opsPerSecond} ops/sec)`;
}

// =============================================================================
// Main Benchmark
// =============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('Performance Benchmark: Direct AST Path vs English Text Path');
  console.log('='.repeat(70));
  console.log('');

  const results: BenchmarkResult[] = [];

  // -----------------------------------------------------------------------------
  // Benchmark 1: Direct AST Path (parse → buildAST)
  // -----------------------------------------------------------------------------

  console.log('1. Direct AST Path: parse() → buildAST()');
  console.log('-'.repeat(50));

  for (const cmd of TEST_COMMANDS.slice(0, 5)) {
    const result = benchmark(`  Direct: "${cmd}"`, () => {
      const node = parse(cmd, 'en');
      if (node) {
        buildAST(node);
      }
    }, 500);
    console.log(formatResult(result));
    results.push(result);
  }

  console.log('');

  // -----------------------------------------------------------------------------
  // Benchmark 2: English Text Path (parse → render)
  // -----------------------------------------------------------------------------

  console.log('2. English Text Path: parse() → render()');
  console.log('-'.repeat(50));

  for (const cmd of TEST_COMMANDS.slice(0, 5)) {
    const result = benchmark(`  Text: "${cmd}"`, () => {
      const node = parse(cmd, 'en');
      if (node) {
        render(node, 'en');
      }
    }, 500);
    console.log(formatResult(result));
    results.push(result);
  }

  console.log('');

  // -----------------------------------------------------------------------------
  // Benchmark 3: Multilingual Direct Path
  // -----------------------------------------------------------------------------

  console.log('3. Multilingual Direct AST Path');
  console.log('-'.repeat(50));

  for (const { lang, input, expected } of MULTILINGUAL_INPUTS.slice(0, 5)) {
    const result = benchmark(`  ${lang.toUpperCase()}: "${input.slice(0, 25)}..."`, () => {
      const node = parse(input, lang);
      if (node) {
        buildAST(node);
      }
    }, 500);
    console.log(formatResult(result));
    results.push(result);
  }

  console.log('');

  // -----------------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------------

  console.log('='.repeat(70));
  console.log('Summary');
  console.log('='.repeat(70));

  // Calculate averages
  const directResults = results.filter(r => r.name.includes('Direct'));
  const textResults = results.filter(r => r.name.includes('Text'));

  if (directResults.length > 0 && textResults.length > 0) {
    const avgDirect = directResults.reduce((sum, r) => sum + r.avgMs, 0) / directResults.length;
    const avgText = textResults.reduce((sum, r) => sum + r.avgMs, 0) / textResults.length;

    console.log(`Direct Path Average: ${avgDirect.toFixed(3)}ms`);
    console.log(`Text Path Average: ${avgText.toFixed(3)}ms`);

    if (avgDirect < avgText) {
      const speedup = ((avgText - avgDirect) / avgText * 100).toFixed(1);
      console.log(`\n✅ Direct path is ${speedup}% faster`);
    } else {
      const slowdown = ((avgDirect - avgText) / avgText * 100).toFixed(1);
      console.log(`\n⚠️ Direct path is ${slowdown}% slower (expected initially due to parsing overhead)`);
    }
  }

  console.log('');
  console.log('Note: The direct AST path eliminates string serialization and re-parsing,');
  console.log('which provides the most benefit in real-world usage where the core parser');
  console.log('would add additional overhead.');
}

main().catch(console.error);
