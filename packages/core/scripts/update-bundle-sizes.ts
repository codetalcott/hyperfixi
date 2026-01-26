#!/usr/bin/env tsx
/**
 * Update Bundle Sizes Script
 *
 * Measures actual bundle sizes from built files in dist/ and prints
 * the current sizes for updating metadata.ts.
 *
 * Run: npm run update:sizes (after npm run build:browser)
 *
 * Options:
 *   --update  Automatically update metadata.ts with new sizes
 *   --quiet   Only show sizes that differ from metadata
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_ROOT = resolve(__dirname, '..');

// Import current metadata for comparison
import { bundleInfo, type BundleInfo } from '../src/metadata.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface MeasuredSize {
  id: string;
  filename: string;
  rawBytes: number;
  gzipBytes: number;
  rawKB: string;
  gzipKB: string;
}

// =============================================================================
// MEASURE SIZES
// =============================================================================

function measureBundleSize(bundle: BundleInfo): MeasuredSize | null {
  const bundlePath = resolve(CORE_ROOT, 'dist', bundle.filename);

  if (!existsSync(bundlePath)) {
    return null;
  }

  const content = readFileSync(bundlePath);
  const gzipped = gzipSync(content);

  const rawBytes = content.length;
  const gzipBytes = gzipped.length;

  // Format as KB with 1 decimal place
  const rawKB = (rawBytes / 1024).toFixed(0) + ' KB';
  const gzipKB = (gzipBytes / 1024).toFixed(1) + ' KB';

  return {
    id: bundle.id,
    filename: bundle.filename,
    rawBytes,
    gzipBytes,
    rawKB,
    gzipKB,
  };
}

// =============================================================================
// COMPARE WITH METADATA
// =============================================================================

interface SizeComparison {
  id: string;
  current: { raw: string; gzip: string };
  actual: { raw: string; gzip: string };
  changed: boolean;
}

function compareWithMetadata(measured: MeasuredSize, bundle: BundleInfo): SizeComparison {
  const currentRaw = bundle.rawSize;
  const currentGzip = bundle.gzipSize;

  const actualRaw = measured.rawKB;
  const actualGzip = measured.gzipKB;

  // Consider changed if different (ignore minor whitespace differences)
  const changed =
    currentRaw.replace(/\s/g, '') !== actualRaw.replace(/\s/g, '') ||
    currentGzip.replace(/\s/g, '') !== actualGzip.replace(/\s/g, '');

  return {
    id: bundle.id,
    current: { raw: currentRaw, gzip: currentGzip },
    actual: { raw: actualRaw, gzip: actualGzip },
    changed,
  };
}

// =============================================================================
// UPDATE METADATA FILE
// =============================================================================

function updateMetadataFile(comparisons: SizeComparison[]): boolean {
  const metadataPath = resolve(CORE_ROOT, 'src/metadata.ts');
  let content = readFileSync(metadataPath, 'utf-8');

  let updated = false;

  for (const comp of comparisons) {
    if (!comp.changed) continue;

    // Update gzipSize using regex
    const gzipRegex = new RegExp(
      `(id:\\s*'${comp.id}'[^}]*gzipSize:\\s*)'[^']*'`,
      'g'
    );
    const newGzipContent = content.replace(gzipRegex, `$1'${comp.actual.gzip}'`);
    if (newGzipContent !== content) {
      content = newGzipContent;
      updated = true;
    }

    // Update rawSize using regex
    const rawRegex = new RegExp(
      `(id:\\s*'${comp.id}'[^}]*rawSize:\\s*)'[^']*'`,
      'g'
    );
    const newRawContent = content.replace(rawRegex, `$1'${comp.actual.raw}'`);
    if (newRawContent !== content) {
      content = newRawContent;
      updated = true;
    }
  }

  if (updated) {
    writeFileSync(metadataPath, content, 'utf-8');
  }

  return updated;
}

// =============================================================================
// MAIN
// =============================================================================

const args = process.argv.slice(2);
const shouldUpdate = args.includes('--update');
const quietMode = args.includes('--quiet');

console.log('📏 Measuring bundle sizes...\n');

const measurements: MeasuredSize[] = [];
const comparisons: SizeComparison[] = [];
const missing: string[] = [];

for (const bundle of bundleInfo) {
  const measured = measureBundleSize(bundle);

  if (measured) {
    measurements.push(measured);
    comparisons.push(compareWithMetadata(measured, bundle));
  } else {
    missing.push(bundle.id);
  }
}

// Report missing bundles
if (missing.length > 0) {
  console.log('⚠️  Missing bundles (run npm run build:browser first):');
  for (const id of missing) {
    console.log(`   ${id}`);
  }
  console.log('');
}

// Report sizes
const changedComparisons = comparisons.filter((c) => c.changed);

if (!quietMode || changedComparisons.length > 0) {
  console.log('Bundle Sizes:');
  console.log('─'.repeat(60));
  console.log(
    'Bundle'.padEnd(20) +
      'Gzip'.padEnd(12) +
      'Raw'.padEnd(12) +
      'Status'
  );
  console.log('─'.repeat(60));

  for (const comp of comparisons) {
    const status = comp.changed ? '⚠️  CHANGED' : '✓';
    console.log(
      comp.id.padEnd(20) +
        comp.actual.gzip.padEnd(12) +
        comp.actual.raw.padEnd(12) +
        status
    );
    if (comp.changed) {
      console.log(
        ''.padEnd(20) +
          `was ${comp.current.gzip}`.padEnd(12) +
          `was ${comp.current.raw}`.padEnd(12)
      );
    }
  }
  console.log('─'.repeat(60));
}

console.log('');

// Handle updates
if (changedComparisons.length === 0) {
  console.log('✅ All bundle sizes match metadata.ts');
} else if (shouldUpdate) {
  const updated = updateMetadataFile(comparisons);
  if (updated) {
    console.log('✅ Updated metadata.ts with new sizes');
  } else {
    console.log('⚠️  No changes made to metadata.ts (regex may need adjustment)');
  }
} else {
  console.log(`⚠️  ${changedComparisons.length} bundle(s) have different sizes`);
  console.log('   Run with --update to update metadata.ts automatically');
  console.log('   Or update manually in src/metadata.ts');
}

// Exit with error if sizes don't match (for CI)
if (!shouldUpdate && changedComparisons.length > 0) {
  process.exit(1);
}
