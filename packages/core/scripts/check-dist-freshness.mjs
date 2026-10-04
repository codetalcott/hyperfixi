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
 * Since Phase C3 (C-R4b) every bundle in core's dist/ is a copy of the engine's
 * hyperfixi-hs.js (scripts/copy-engine-bundle.mjs), so the source that matters
 * is packages/engine/src, and the bundles checked are the engine's built file
 * and core's copies of it, which must also be byte-identical to it. (Core's own
 * src/ no longer reaches any browser bundle.)
 *
 * Usage:
 *   node scripts/check-dist-freshness.mjs           # check all bundles
 *   SKIP_DIST_CHECK=1 <command>                     # bypass entirely
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = join(__dirname, '..');
const SRC = join(PKG, '../engine/src');
const DIST = join(PKG, 'dist');
const ENGINE_BUNDLE = join(PKG, '../engine/dist/hyperfixi-hs.js');

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
  console.error('[dist-check] no source files found under packages/engine/src/. Aborting.');
  process.exit(1);
}
const newestSrc = sources.reduce((a, b) => (a.mtime > b.mtime ? a : b));

const bundles = readdirSync(DIST)
  .filter(n => DIST_RE.test(n) && !n.endsWith('.map'))
  .map(n => ({ name: n, path: join(DIST, n), mtime: statSync(join(DIST, n)).mtimeMs }));

if (bundles.length === 0) {
  console.error('[dist-check] no browser bundles found in dist/. Build first:');
  console.error('  npm run build:browser --prefix packages/core');
  process.exit(1);
}

if (!existsSync(ENGINE_BUNDLE)) {
  console.error('[dist-check] packages/engine/dist/hyperfixi-hs.js does not exist. Build first:');
  console.error('  npm run build --prefix packages/engine && npm run build:browser --prefix packages/core');
  process.exit(1);
}

// A copy taken before the engine was rebuilt is fresh by mtime but wrong.
const engineBytes = readFileSync(ENGINE_BUNDLE);
const differs = bundles.filter(b => !readFileSync(b.path).equals(engineBytes));
if (differs.length > 0) {
  console.error(`\n[dist-check] FAIL — ${differs.map(b => b.name).join(', ')} differ from the engine's hyperfixi-hs.js.`);
  console.error('  recopy: npm run build:browser --prefix packages/core\n');
  process.exit(1);
}

const checked = [...bundles, { name: '../engine/dist/hyperfixi-hs.js', mtime: statSync(ENGINE_BUNDLE).mtimeMs }];
const stale = checked.filter(b => b.mtime < newestSrc.mtime);

if (stale.length === 0) {
  console.log(
    `[dist-check] ok — ${checked.length} bundle(s) fresh (newest source: ${relative(PKG, newestSrc.path)})`
  );
  process.exit(0);
}

console.error(`\n[dist-check] FAIL — ${stale.length} of ${checked.length} bundle(s) are stale.`);
console.error(`  newest source:  ${relative(PKG, newestSrc.path)}`);
console.error(`                  modified ${new Date(newestSrc.mtime).toISOString()}`);
console.error('  stale bundles:');
for (const b of stale) {
  const lagMs = newestSrc.mtime - b.mtime;
  const lag = lagMs > 86400000 ? `${Math.round(lagMs / 86400000)}d` : `${Math.round(lagMs / 1000)}s`;
  console.error(`    ${b.name}  (${lag} behind)`);
}
console.error('\n  rebuild the engine, then recopy hyperfixi.js and its aliases:');
console.error('    npm run build --prefix packages/engine && npm run build:browser --prefix packages/core');
console.error('  bypass this check:');
console.error('    SKIP_DIST_CHECK=1 <your command>\n');
process.exit(1);
