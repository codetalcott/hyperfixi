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

/**
 * How far metadata.ts may drift from the built bundle before this gate fails.
 *
 * Two size gates sit side by side in CI's `bundle-size` job and they have
 * different jobs:
 *
 *   - THIS one guards a PUBLISHED DOC STRING (`@hyperfixi/core/metadata`).
 *     What it protects against is the number becoming a lie — the 2026-07-20
 *     audit found it ~110 KB (~35%) stale. It was doing that with exact
 *     formatted-string equality, i.e. firing on a ~102-byte gzip delta, ~100x
 *     finer than its own purpose. So it failed on essentially every code change
 *     and taught everyone to ignore it.
 *
 *   - `scripts/bundle-size-snapshot.mjs --check` (±5% vs
 *     scripts/bundle-snapshots/baseline.json) is the actual size-REGRESSION
 *     gate. Real growth is caught THERE, not here. CI also has absolute
 *     ceilings ("Check size limits").
 *
 * 2% of the ~311 KB full bundle is ~6 KB: loose enough that ordinary code
 * changes pass, tight enough that a 35% rot cannot recur.
 */
const TOLERANCE_PERCENT = 2;

/**
 * Half the formatting granularity, below which a "difference" is an artifact of
 * the rounding rather than real drift. rawKB is toFixed(0) → 0.5 KB; gzipKB is
 * toFixed(1) → 0.05 KB. Without this floor the small bundles (hyperfixi-lite.js
 * at ~2 KB gzip) would breach 2% on pure rounding noise.
 */
const RAW_ROUNDING_BYTES = 512;
const GZIP_ROUNDING_BYTES = 52;

interface SizeComparison {
  id: string;
  current: { raw: string; gzip: string };
  actual: { raw: string; gzip: string };
  /** The formatted strings differ at all. Cosmetic; this is what drives --update. */
  drifted: boolean;
  /** Drift exceeds TOLERANCE_PERCENT. THIS is what fails CI. */
  changed: boolean;
  /** Worst of the two deltas, for the report. */
  worstPercent: number;
}

/** '311.3 KB' → 318771.2. metadata.ts only stores the formatted string. */
function parseKB(formatted: string): number {
  const n = parseFloat(String(formatted).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n * 1024 : NaN;
}

function percentOff(actualBytes: number, recordedBytes: number): number {
  if (!Number.isFinite(recordedBytes) || recordedBytes <= 0) return Infinity;
  return (Math.abs(actualBytes - recordedBytes) / recordedBytes) * 100;
}

/** Out of tolerance = breaches BOTH the percentage and the rounding floor. */
function breaches(actualBytes: number, recordedBytes: number, floor: number): boolean {
  // Unparseable metadata is always a failure — that is real rot, not rounding.
  if (!Number.isFinite(recordedBytes) || recordedBytes <= 0) return true;
  const delta = Math.abs(actualBytes - recordedBytes);
  return delta > floor && percentOff(actualBytes, recordedBytes) > TOLERANCE_PERCENT;
}

function compareWithMetadata(measured: MeasuredSize, bundle: BundleInfo): SizeComparison {
  const currentRaw = bundle.rawSize;
  const currentGzip = bundle.gzipSize;

  const actualRaw = measured.rawKB;
  const actualGzip = measured.gzipKB;

  // Cosmetic drift: the formatted strings differ at all.
  const drifted =
    currentRaw.replace(/\s/g, '') !== actualRaw.replace(/\s/g, '') ||
    currentGzip.replace(/\s/g, '') !== actualGzip.replace(/\s/g, '');

  const recordedRaw = parseKB(currentRaw);
  const recordedGzip = parseKB(currentGzip);

  return {
    id: bundle.id,
    current: { raw: currentRaw, gzip: currentGzip },
    actual: { raw: actualRaw, gzip: actualGzip },
    drifted,
    changed:
      breaches(measured.rawBytes, recordedRaw, RAW_ROUNDING_BYTES) ||
      breaches(measured.gzipBytes, recordedGzip, GZIP_ROUNDING_BYTES),
    worstPercent: Math.max(
      percentOff(measured.rawBytes, recordedRaw),
      percentOff(measured.gzipBytes, recordedGzip)
    ),
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
    // `drifted`, not `changed`: --update must still refresh cosmetic drift, or
    // `update:sizes:auto` silently stops doing anything the moment the gate
    // gains a tolerance.
    if (!comp.drifted) continue;

    // Update gzipSize using regex
    const gzipRegex = new RegExp(`(id:\\s*'${comp.id}'[^}]*gzipSize:\\s*)'[^']*'`, 'g');
    const newGzipContent = content.replace(gzipRegex, `$1'${comp.actual.gzip}'`);
    if (newGzipContent !== content) {
      content = newGzipContent;
      updated = true;
    }

    // Update rawSize using regex
    const rawRegex = new RegExp(`(id:\\s*'${comp.id}'[^}]*rawSize:\\s*)'[^']*'`, 'g');
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
const driftedComparisons = comparisons.filter(c => c.drifted);
const failingComparisons = comparisons.filter(c => c.changed);

if (!quietMode || driftedComparisons.length > 0) {
  console.log('Bundle Sizes:');
  console.log('─'.repeat(72));
  console.log('Bundle'.padEnd(20) + 'Gzip'.padEnd(12) + 'Raw'.padEnd(12) + 'Status');
  console.log('─'.repeat(72));

  for (const comp of comparisons) {
    const status = comp.changed
      ? `✗ OUT OF TOLERANCE (${comp.worstPercent.toFixed(1)}%)`
      : comp.drifted
        ? `~ drift ${comp.worstPercent.toFixed(1)}% (within ±${TOLERANCE_PERCENT}%)`
        : '✓';
    console.log(
      comp.id.padEnd(20) + comp.actual.gzip.padEnd(12) + comp.actual.raw.padEnd(12) + status
    );
    if (comp.drifted) {
      console.log(
        ''.padEnd(20) + `was ${comp.current.gzip}`.padEnd(12) + `was ${comp.current.raw}`.padEnd(12)
      );
    }
  }
  console.log('─'.repeat(72));
}

console.log('');

// Handle updates
if (driftedComparisons.length === 0) {
  console.log('✅ All bundle sizes match metadata.ts');
} else if (shouldUpdate) {
  const updated = updateMetadataFile(comparisons);
  if (updated) {
    console.log('✅ Updated metadata.ts with new sizes');
  } else {
    console.log('⚠️  No changes made to metadata.ts (regex may need adjustment)');
  }
} else if (failingComparisons.length === 0) {
  console.log(
    `ℹ️  ${driftedComparisons.length} bundle(s) drifted within ±${TOLERANCE_PERCENT}% — NOT blocking.`
  );
  console.log('   metadata.ts is a published doc string, not a regression gate.');
  console.log('   The size-REGRESSION gate is the next CI step:');
  console.log('     node scripts/bundle-size-snapshot.mjs --check   (±5% vs baseline.json)');
} else {
  console.log(
    `❌ ${failingComparisons.length} bundle(s) exceed ±${TOLERANCE_PERCENT}% vs metadata.ts — stale enough to mislead.`
  );
  console.log('   Update src/metadata.ts with the numbers in the "actual" columns ABOVE.');
  console.log('');
  console.log('   ⚠️  Do NOT run `npm run update:sizes:auto` locally and commit the result.');
  console.log("      dist/ is untracked, so your tree may be carrying ANOTHER BRANCH's build,");
  console.log('      and gzip is platform-dependent — macOS reads ~2 KB lower than CI Linux');
  console.log('      zlib on the full bundles (measured: 311.4 KB local vs 311.3 KB CI).');
  console.log('      Copy the numbers out of the CI "Metadata size check" job log.');
}

// Exit with error only when metadata is stale beyond tolerance. Cosmetic drift
// is reported above and left to the next intentional update.
if (!shouldUpdate && failingComparisons.length > 0) {
  process.exit(1);
}
