#!/usr/bin/env npx tsx
/**
 * Performance Benchmark: Tokenizer Keyword Lookup Methods
 *
 * Compares the performance of:
 * - Array.find() - O(n) linear search
 * - Map.get() - O(1) hash lookup (new lookupKeyword/isKeyword methods)
 *
 * Run: npx tsx scripts/benchmark-tokenizer-lookup.ts
 */

import { japaneseTokenizer } from '../src/tokenizers/japanese';
import { spanishTokenizer } from '../src/tokenizers/spanish';
import { vietnameseTokenizer } from '../src/tokenizers/vietnamese';
import { hindiTokenizer } from '../src/tokenizers/hindi';
import { russianTokenizer } from '../src/tokenizers/russian';

// =============================================================================
// Test Data
// =============================================================================

// Sample keywords to look up (mix of common and rare)
const JAPANESE_KEYWORDS = ['切り替え', 'トグル', '追加', '削除', '表示', '非表示', '設定', '増加'];
const SPANISH_KEYWORDS = ['alternar', 'agregar', 'eliminar', 'mostrar', 'ocultar', 'establecer'];
const VIETNAMESE_KEYWORDS = ['bật tắt', 'thêm', 'xóa', 'hiển thị', 'ẩn', 'đặt'];
const HINDI_KEYWORDS = ['टॉगल', 'जोड़ें', 'हटाएं', 'दिखाएं', 'छुपाएं', 'सेट'];
const RUSSIAN_KEYWORDS = ['переключить', 'добавить', 'удалить', 'показать', 'скрыть', 'установить'];

// Non-keywords for negative lookups
const NON_KEYWORDS = ['xyz123', 'notakeyword', 'random', 'test', 'foo', 'bar'];

// =============================================================================
// Benchmark Infrastructure
// =============================================================================

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  opsPerSecond: number;
}

function benchmark(name: string, fn: () => void, iterations: number = 10000): BenchmarkResult {
  // Warm up
  for (let i = 0; i < 100; i++) {
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
  return `  ${result.name.padEnd(35)} ${result.avgMs.toFixed(4)}ms avg (${result.opsPerSecond.toLocaleString()} ops/sec)`;
}

// =============================================================================
// Benchmark Tests
// =============================================================================

type TokenizerWithInternals = {
  profileKeywords: Array<{ native: string; normalized: string }>;
  profileKeywordMap: Map<string, { native: string; normalized: string }>;
};

function benchmarkLanguage(
  name: string,
  tokenizer: TokenizerWithInternals,
  keywords: string[],
  iterations: number = 10000
) {
  console.log(`\n${name} (${tokenizer.profileKeywords.length} keywords)`);
  console.log('-'.repeat(60));

  const results: BenchmarkResult[] = [];

  // Benchmark Array.find() - positive lookups
  const arrayFindPositive = benchmark('Array.find() - keywords found', () => {
    for (const kw of keywords) {
      tokenizer.profileKeywords.find(
        k => k.native === kw || k.native.toLowerCase() === kw.toLowerCase()
      );
    }
  }, iterations);
  results.push(arrayFindPositive);
  console.log(formatResult(arrayFindPositive));

  // Benchmark Map.get() - positive lookups
  const mapGetPositive = benchmark('Map.get() - keywords found', () => {
    for (const kw of keywords) {
      tokenizer.profileKeywordMap.get(kw.toLowerCase());
    }
  }, iterations);
  results.push(mapGetPositive);
  console.log(formatResult(mapGetPositive));

  // Benchmark Array.find() - negative lookups (worst case)
  const arrayFindNegative = benchmark('Array.find() - keywords NOT found', () => {
    for (const kw of NON_KEYWORDS) {
      tokenizer.profileKeywords.find(
        k => k.native === kw || k.native.toLowerCase() === kw.toLowerCase()
      );
    }
  }, iterations);
  results.push(arrayFindNegative);
  console.log(formatResult(arrayFindNegative));

  // Benchmark Map.get() - negative lookups
  const mapGetNegative = benchmark('Map.get() - keywords NOT found', () => {
    for (const kw of NON_KEYWORDS) {
      tokenizer.profileKeywordMap.get(kw.toLowerCase());
    }
  }, iterations);
  results.push(mapGetNegative);
  console.log(formatResult(mapGetNegative));

  // Calculate speedup
  const positiveSpeedup = arrayFindPositive.avgMs / mapGetPositive.avgMs;
  const negativeSpeedup = arrayFindNegative.avgMs / mapGetNegative.avgMs;

  console.log(`  ${'Speedup (positive):'.padEnd(35)} ${positiveSpeedup.toFixed(1)}x faster`);
  console.log(`  ${'Speedup (negative/worst-case):'.padEnd(35)} ${negativeSpeedup.toFixed(1)}x faster`);

  return { positiveSpeedup, negativeSpeedup, keywordCount: tokenizer.profileKeywords.length };
}

// =============================================================================
// Full Tokenization Benchmark
// =============================================================================

function benchmarkFullTokenization() {
  console.log('\n' + '='.repeat(60));
  console.log('Full Tokenization Benchmark');
  console.log('='.repeat(60));

  const testInputs = {
    ja: ['#button の .active を 切り替え', '.highlight を 追加', '#modal を 表示'],
    es: ['alternar .active en #button', 'agregar .highlight a #element', 'mostrar #modal'],
    vi: ['bật tắt .active trên #button', 'thêm .highlight vào #element', 'hiển thị #modal'],
    hi: ['#button पर .active टॉगल करें', '#element में .highlight जोड़ें', '#modal दिखाएं'],
    ru: ['переключить .active на #button', 'добавить .highlight в #element', 'показать #modal'],
  };

  const tokenizers = {
    ja: { name: 'Japanese', tokenizer: japaneseTokenizer, inputs: testInputs.ja },
    es: { name: 'Spanish', tokenizer: spanishTokenizer, inputs: testInputs.es },
    vi: { name: 'Vietnamese', tokenizer: vietnameseTokenizer, inputs: testInputs.vi },
    hi: { name: 'Hindi', tokenizer: hindiTokenizer, inputs: testInputs.hi },
    ru: { name: 'Russian', tokenizer: russianTokenizer, inputs: testInputs.ru },
  };

  for (const [_code, { name, tokenizer, inputs }] of Object.entries(tokenizers)) {
    const result = benchmark(`${name} tokenize()`, () => {
      for (const input of inputs) {
        tokenizer.tokenize(input);
      }
    }, 5000);
    console.log(formatResult(result));
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Tokenizer Keyword Lookup Benchmark');
  console.log('Comparing Array.find() vs Map.get() performance');
  console.log('='.repeat(60));

  const allResults: Array<{ language: string; positiveSpeedup: number; negativeSpeedup: number; keywordCount: number }> = [];

  // Benchmark each language
  allResults.push({
    language: 'Japanese',
    ...benchmarkLanguage('Japanese', japaneseTokenizer as unknown as TokenizerWithInternals, JAPANESE_KEYWORDS)
  });

  allResults.push({
    language: 'Spanish',
    ...benchmarkLanguage('Spanish', spanishTokenizer as unknown as TokenizerWithInternals, SPANISH_KEYWORDS)
  });

  allResults.push({
    language: 'Vietnamese',
    ...benchmarkLanguage('Vietnamese', vietnameseTokenizer as unknown as TokenizerWithInternals, VIETNAMESE_KEYWORDS)
  });

  allResults.push({
    language: 'Hindi',
    ...benchmarkLanguage('Hindi', hindiTokenizer as unknown as TokenizerWithInternals, HINDI_KEYWORDS)
  });

  allResults.push({
    language: 'Russian',
    ...benchmarkLanguage('Russian', russianTokenizer as unknown as TokenizerWithInternals, RUSSIAN_KEYWORDS)
  });

  // Full tokenization benchmark
  benchmarkFullTokenization();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  const avgPositiveSpeedup = allResults.reduce((sum, r) => sum + r.positiveSpeedup, 0) / allResults.length;
  const avgNegativeSpeedup = allResults.reduce((sum, r) => sum + r.negativeSpeedup, 0) / allResults.length;
  const avgKeywordCount = allResults.reduce((sum, r) => sum + r.keywordCount, 0) / allResults.length;

  console.log(`\nAverage keyword count: ${Math.round(avgKeywordCount)}`);
  console.log(`Average speedup (positive lookups): ${avgPositiveSpeedup.toFixed(1)}x`);
  console.log(`Average speedup (negative lookups): ${avgNegativeSpeedup.toFixed(1)}x`);

  console.log('\n✅ Map.get() provides O(1) lookups vs O(n) for Array.find()');
  console.log('   Speedup scales with keyword count - more keywords = bigger benefit');
  console.log('\nNote: Tokenizers can use this.lookupKeyword() and this.isKeyword()');
  console.log('      for O(1) lookups instead of this.profileKeywords.find()');
}

main().catch(console.error);
