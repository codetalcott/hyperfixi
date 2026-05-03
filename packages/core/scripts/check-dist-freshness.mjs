#!/usr/bin/env node
/**
 * check-dist-freshness.mjs
 *
 * Compares the newest source file mtime against each dist bundle mtime.
 * Exits non-zero if any bundle is older than any tracked source file.
 *
 * Why this exists: dist/ is gitignored, so a stale local build can silently
 * produce wrong test results (a fixed-in-source bug appears unfixed because
 * the bundle wasn't rebuilt). This catches the drift before tests run.
 *
 * Usage:
 *   node scripts/check-dist-freshness.mjs           # check all bundles
 *   SKIP_DIST_CHECK=1 <command>                     # bypass entirely
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = join(__dirname, '..');
const SRC = join(PKG, 'src');
const DIST = join(PKG, 'dist');

if (process.env.SKIP_DIST_CHECK) {
  console.log('[dist-check] skipped via SKIP_DIST_CHECK=1');
  process.exit(0);
}

if (!existsSync(DIST)) {
  console.error('[dist-check] dist/ does not exist. Build first:');
  console.error('  npm run build:browser --prefix packages/core');
  process.exit(1);
}

const IGNORE_RE = /(\.test|\.spec|\.bench)\.(t|j)sx?$|__tests__|__fixtures__|__snapshots__/;
const SRC_RE = /\.(ts|tsx|json)$/;
const DIST_RE = /^(hyperfixi|lokascript)[^/]*\.js$/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, out);
    } else if (SRC_RE.test(entry.name) && !IGNORE_RE.test(path)) {
      out.push({ path, mtime: statSync(path).mtimeMs });
    }
  }
  return out;
}

const sources = walk(SRC);
if (sources.length === 0) {
  console.error('[dist-check] no source files found under src/. Aborting.');
  process.exit(1);
}
const newestSrc = sources.reduce((a, b) => (a.mtime > b.mtime ? a : b));

const bundles = readdirSync(DIST)
  .filter(n => DIST_RE.test(n) && !n.endsWith('.map'))
  .map(n => ({ name: n, mtime: statSync(join(DIST, n)).mtimeMs }));

if (bundles.length === 0) {
  console.error('[dist-check] no browser bundles found in dist/. Build first:');
  console.error('  npm run build:browser --prefix packages/core');
  process.exit(1);
}

const stale = bundles.filter(b => b.mtime < newestSrc.mtime);

if (stale.length === 0) {
  console.log(
    `[dist-check] ok — ${bundles.length} bundle(s) fresh (newest source: ${relative(PKG, newestSrc.path)})`
  );
  process.exit(0);
}

console.error(`\n[dist-check] FAIL — ${stale.length} of ${bundles.length} bundle(s) are stale.`);
console.error(`  newest source:  ${relative(PKG, newestSrc.path)}`);
console.error(`                  modified ${new Date(newestSrc.mtime).toISOString()}`);
console.error('  stale bundles:');
for (const b of stale) {
  const lagMs = newestSrc.mtime - b.mtime;
  const lag = lagMs > 86400000 ? `${Math.round(lagMs / 86400000)}d` : `${Math.round(lagMs / 1000)}s`;
  console.error(`    ${b.name}  (${lag} behind)`);
}
console.error('\n  rebuild all browser bundles:');
console.error('    npm run build:browser --prefix packages/core');
console.error('  rebuild a single bundle (faster):');
console.error('    npm run build:browser:hybrid-hx --prefix packages/core      # or :hybrid-complete, :lite, etc.');
console.error('  bypass this check:');
console.error('    SKIP_DIST_CHECK=1 <your command>\n');
process.exit(1);
