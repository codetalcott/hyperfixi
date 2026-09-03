#!/usr/bin/env node
/**
 * Bundle Size Analysis Script
 *
 * Analyzes all HyperFixi bundles and reports sizes.
 * Can compare against baseline and fail if limits exceeded.
 *
 * Usage:
 *   node scripts/benchmark/bundle-size-check.mjs
 *   node scripts/benchmark/bundle-size-check.mjs --fail-on-increase
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// =============================================================================
// Configuration
// =============================================================================

const BUNDLE_CONFIGS = [
  {
    name: 'hyperfixi-hybrid-complete.js',
    path: 'packages/core/dist/hyperfixi-hybrid-complete.js',
    maxGzip: 15000, // 15 KB
    description: 'Recommended (~85% coverage)',
  },
  {
    name: 'hyperfixi-hybrid-hx.js',
    path: 'packages/core/dist/hyperfixi-hybrid-hx.js',
    maxGzip: 18000, // 18 KB
    description: 'Hybrid + htmx support',
  },
  {
    name: 'hyperfixi-multilingual.js',
    path: 'packages/core/dist/hyperfixi-multilingual.js',
    maxGzip: 100000, // 100 KB
    description: 'Multilingual (no parser)',
  },
  {
    name: 'hyperfixi-browser.js',
    path: 'packages/core/dist/hyperfixi-browser.js',
    maxGzip: 150000, // 150 KB
    description: 'Full bundle',
  },
];

const SEMANTIC_BUNDLES = [
  {
    name: 'browser.global.js',
    path: 'packages/semantic/dist/browser.global.js',
    maxGzip: 80000,
    description: 'All 13 languages',
  },
  {
    name: 'browser-en.en.global.js',
    path: 'packages/semantic/dist/browser-en.en.global.js',
    maxGzip: 25000,
    description: 'English only',
  },
];

// =============================================================================
// Utilities
// =============================================================================

function getFileSize(filePath) {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) {
    return { raw: 0, gzip: 0, exists: false };
  }

  const raw = fs.statSync(fullPath).size;
  const gzip = parseInt(
    execSync(`gzip -c "${fullPath}" | wc -c`).toString().trim(),
    10
  );

  return { raw, gzip, exists: true };
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${bytes} B`;
  }
}

function getStatusIcon(size, limit) {
  if (size === 0) return '⚪';
  if (size <= limit * 0.8) return '✅';
  if (size <= limit) return '🟡';
  return '🔴';
}

// =============================================================================
// Main Analysis
// =============================================================================

function analyzeBundle(config) {
  const sizes = getFileSize(config.path);
  return {
    ...config,
    ...sizes,
    status: sizes.exists ? getStatusIcon(sizes.gzip, config.maxGzip) : '⚪',
    exceedsLimit: sizes.exists && sizes.gzip > config.maxGzip,
  };
}

function printReport(results, category) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${category}`);
  console.log('='.repeat(80));
  console.log(
    `${'Status'.padEnd(6)} ${'Bundle'.padEnd(35)} ${'Raw'.padStart(10)} ${'Gzip'.padStart(10)} ${'Limit'.padStart(10)}`
  );
  console.log('-'.repeat(80));

  for (const result of results) {
    if (!result.exists) {
      console.log(
        `${'⚪'.padEnd(6)} ${result.name.padEnd(35)} ${'N/A'.padStart(10)} ${'N/A'.padStart(10)} ${formatSize(result.maxGzip).padStart(10)}`
      );
    } else {
      console.log(
        `${result.status.padEnd(6)} ${result.name.padEnd(35)} ${formatSize(result.raw).padStart(10)} ${formatSize(result.gzip).padStart(10)} ${formatSize(result.maxGzip).padStart(10)}`
      );
    }
  }
}

function main() {
  console.log('Bundle Size Analysis');
  console.log('====================');
  console.log(`Root: ${rootDir}`);
  console.log(`Date: ${new Date().toISOString()}`);

  // Analyze core bundles
  const coreResults = BUNDLE_CONFIGS.map(analyzeBundle);
  printReport(coreResults, 'Core Bundles');

  // Analyze semantic bundles
  const semanticResults = SEMANTIC_BUNDLES.map(analyzeBundle);
  printReport(semanticResults, 'Semantic Bundles');

  // Summary
  const allResults = [...coreResults, ...semanticResults];
  const exceeded = allResults.filter((r) => r.exceedsLimit);
  const missing = allResults.filter((r) => !r.exists);

  console.log(`\n${'='.repeat(80)}`);
  console.log('Summary');
  console.log('='.repeat(80));

  if (missing.length > 0) {
    console.log(`\n⚪ Missing bundles (${missing.length}):`);
    for (const m of missing) {
      console.log(`   - ${m.name}`);
    }
  }

  if (exceeded.length > 0) {
    console.log(`\n🔴 Bundles exceeding limits (${exceeded.length}):`);
    for (const e of exceeded) {
      const overBy = ((e.gzip - e.maxGzip) / e.maxGzip * 100).toFixed(1);
      console.log(`   - ${e.name}: ${formatSize(e.gzip)} (${overBy}% over limit)`);
    }
  }

  const withinLimits = allResults.filter((r) => r.exists && !r.exceedsLimit);
  console.log(`\n✅ Bundles within limits: ${withinLimits.length}/${allResults.filter(r => r.exists).length}`);

  // Save results to JSON
  const resultsPath = path.join(rootDir, 'packages/core/benchmark-results');
  if (!fs.existsSync(resultsPath)) {
    fs.mkdirSync(resultsPath, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || 'local',
    bundles: {
      core: coreResults.map(({ name, raw, gzip, maxGzip, exists, exceedsLimit }) => ({
        name,
        raw,
        gzip,
        maxGzip,
        exists,
        exceedsLimit,
      })),
      semantic: semanticResults.map(({ name, raw, gzip, maxGzip, exists, exceedsLimit }) => ({
        name,
        raw,
        gzip,
        maxGzip,
        exists,
        exceedsLimit,
      })),
    },
  };

  fs.writeFileSync(
    path.join(resultsPath, 'bundle-sizes.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(`\nResults saved to: ${path.join(resultsPath, 'bundle-sizes.json')}`);

  // Exit with error if any bundles exceed limits
  if (exceeded.length > 0 && process.argv.includes('--fail-on-exceed')) {
    console.log('\n❌ Build failed: Bundle size limits exceeded');
    process.exit(1);
  }
}

main();
