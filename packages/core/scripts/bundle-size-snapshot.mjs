#!/usr/bin/env node
/**
 * Bundle-size snapshot for the evaluator consolidation arc.
 *
 * Reads scripts/bundle-snapshots/baseline.json, rebuilds the bundles it lists,
 * measures raw + gzipped sizes, and compares against the baseline. If any
 * bundle moves outside the tolerance (default ±5%), exits non-zero — signalling
 * that the refactor likely regressed tree-shaking.
 *
 * Usage:
 *   node scripts/bundle-size-snapshot.mjs              # check against baseline
 *   node scripts/bundle-size-snapshot.mjs --check      # same (explicit)
 *   node scripts/bundle-size-snapshot.mjs --update     # overwrite baseline with current sizes
 *   node scripts/bundle-size-snapshot.mjs --skip-build # don't rebuild; measure existing dist/
 *
 * Exit codes: 0 = within tolerance, 1 = regression, 2 = missing file / config error.
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { gzipSync } from 'zlib';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, '..');
const baselinePath = resolve(__dirname, 'bundle-snapshots/baseline.json');
const distDir = resolve(pkgDir, 'dist');

const args = process.argv.slice(2);
const mode = args.includes('--update') ? 'update' : 'check';
const skipBuild = args.includes('--skip-build');

if (!existsSync(baselinePath)) {
  console.error(`baseline missing: ${baselinePath}`);
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const tolerance = (baseline.tolerance_percent ?? 5) / 100;

function buildBundle(configPath) {
  const cmd = `npx rollup -c ${configPath}`;
  execSync(cmd, { cwd: pkgDir, stdio: 'pipe' });
}

function measure(filePath) {
  const buf = readFileSync(filePath);
  return { raw_bytes: buf.length, gzip_bytes: gzipSync(buf).length };
}

function format(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function pctDelta(current, baseline) {
  if (!baseline) return null;
  return ((current - baseline) / baseline) * 100;
}

const results = {};
let regressions = 0;

console.log(`Bundle-size snapshot — mode: ${mode}, tolerance: ±${baseline.tolerance_percent}%`);
console.log('');

for (const [name, entry] of Object.entries(baseline.bundles)) {
  const distPath = resolve(distDir, name);

  if (!skipBuild) {
    process.stdout.write(`  build ${name}... `);
    try {
      buildBundle(entry.config);
      process.stdout.write('ok\n');
    } catch (err) {
      console.error(`failed: ${err.message}`);
      process.exit(2);
    }
  }

  if (!existsSync(distPath)) {
    console.error(`  ${name}: dist file missing at ${distPath}`);
    process.exit(2);
  }

  const m = measure(distPath);
  results[name] = m;

  if (mode === 'check') {
    const rawDelta = pctDelta(m.raw_bytes, entry.raw_bytes);
    const gzDelta = pctDelta(m.gzip_bytes, entry.gzip_bytes);
    const flag =
      Math.abs(rawDelta) > baseline.tolerance_percent ||
      Math.abs(gzDelta) > baseline.tolerance_percent;
    if (flag) regressions++;

    const marker = flag ? '✗ REGRESSION' : '✓';
    console.log(
      `  ${marker} ${name}: raw ${format(m.raw_bytes)} (${rawDelta >= 0 ? '+' : ''}${rawDelta.toFixed(1)}%), gzip ${format(m.gzip_bytes)} (${gzDelta >= 0 ? '+' : ''}${gzDelta.toFixed(1)}%)`
    );
  } else {
    console.log(`  ${name}: raw ${format(m.raw_bytes)}, gzip ${format(m.gzip_bytes)}`);
  }
}

if (mode === 'update') {
  for (const [name, m] of Object.entries(results)) {
    baseline.bundles[name].raw_bytes = m.raw_bytes;
    baseline.bundles[name].gzip_bytes = m.gzip_bytes;
  }
  baseline.generated = new Date().toISOString().slice(0, 10);
  try {
    baseline.commit = execSync('git rev-parse --short HEAD', { cwd: pkgDir }).toString().trim();
  } catch {
    baseline.commit = 'unknown';
  }
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`\nbaseline updated: ${baselinePath}`);
  process.exit(0);
}

console.log('');
if (regressions > 0) {
  console.log(`${regressions} bundle(s) exceed ±${baseline.tolerance_percent}% tolerance — investigate before continuing.`);
  process.exit(1);
}

console.log('all bundles within tolerance');
process.exit(0);
