#!/usr/bin/env node
/**
 * check-bundle-shards — bundle list → CI shard drift guard
 *
 * The browser bundles are built by the `bundles` job in ci.yml, sharded across
 * three runners by a hand-written `only:` list per shard. The set of bundles
 * itself lives somewhere else entirely: the `BUNDLES` map in
 * `packages/core/scripts/build-browser-bundles.mjs`.
 *
 * Nothing connected the two. Adding a bundle to `BUNDLES` without adding it to
 * a shard would mean it is simply never built in CI — and the failure is
 * SILENT in the worst way, because the jobs that consume the bundles do not
 * check for a complete set. `export-validation` would eventually notice a
 * missing package.json export target, but only for the bundles that happen to
 * be exported, and with an error pointing at the wrong thing.
 *
 * This is the same failure shape as `check-ci-build-order.cjs`, which exists
 * because a new workspace package went unlisted in ci.yml and left main red
 * for 11 days.
 *
 * Fails on either direction of drift:
 *   - a bundle in BUNDLES that no shard builds  (would never be built)
 *   - a shard entry that is not in BUNDLES      (stale; `--only` silently
 *                                                ignores unknown names, so the
 *                                                shard would quietly shrink)
 *   - a bundle listed in more than one shard    (wasted CPU + racing uploads)
 *
 * Zero runtime deps — node built-ins only, so it stays cheap in both the
 * pre-commit hook and the CI lint-typecheck step.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CI_WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');
const BUNDLE_SCRIPT = path.join(
  REPO_ROOT,
  'packages',
  'core',
  'scripts',
  'build-browser-bundles.mjs'
);

/** Bundle keys from the `BUNDLES` object literal in the build orchestrator. */
function readBundleKeys() {
  const text = fs.readFileSync(BUNDLE_SCRIPT, 'utf8');
  const start = text.indexOf('const BUNDLES = {');
  if (start === -1)
    throw new Error(`check-bundle-shards: no 'const BUNDLES = {' in ${BUNDLE_SCRIPT}`);
  // Each entry is a top-level key at exactly two-space indent, quoted or bare.
  const body = text.slice(start, text.indexOf('\n};', start));
  const keys = [];
  for (const m of body.matchAll(/^ {2}'?([a-zA-Z0-9-]+)'?:\s*\{/gm)) keys.push(m[1]);
  if (keys.length === 0) throw new Error('check-bundle-shards: parsed zero bundle keys');
  return keys;
}

/** `only:` lists from the bundles job's matrix in ci.yml. */
function readShardLists() {
  const text = fs.readFileSync(CI_WORKFLOW, 'utf8');
  const shards = [];
  for (const m of text.matchAll(/^\s+- shard:\s*(\d+)\s*\n\s+only:\s*(.+)$/gm)) {
    shards.push({
      shard: Number(m[1]),
      bundles: m[2]
        .trim()
        .split(',')
        .map(s => s.trim()),
    });
  }
  if (shards.length === 0) throw new Error('check-bundle-shards: no shard entries found in ci.yml');
  return shards;
}

function main() {
  const bundles = readBundleKeys();
  const shards = readShardLists();

  const assigned = new Map(); // bundle -> [shard, ...]
  for (const { shard, bundles: list } of shards) {
    for (const b of list) {
      if (!assigned.has(b)) assigned.set(b, []);
      assigned.get(b).push(shard);
    }
  }

  const failures = [];

  for (const b of bundles) {
    if (!assigned.has(b)) {
      failures.push(
        `bundle '${b}' is in BUNDLES but no CI shard builds it — it would never be built in CI.`
      );
    }
  }
  for (const [b, where] of assigned) {
    if (!bundles.includes(b)) {
      failures.push(
        `shard ${where.join('/')} lists '${b}', which is not in BUNDLES — ` +
          `\`--only\` ignores unknown names, so that shard silently builds fewer bundles.`
      );
    } else if (where.length > 1) {
      failures.push(`bundle '${b}' is listed in shards ${where.join(' and ')} — build it once.`);
    }
  }

  if (failures.length > 0) {
    console.error('check-bundle-shards: FAILED\n');
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      `\n  BUNDLES (${bundles.length}): ${bundles.join(', ')}` +
        `\n  shards: ` +
        shards.map(s => `${s.shard}=[${s.bundles.join(' ')}]`).join('  ')
    );
    process.exit(1);
  }

  console.log(`check-bundle-shards: OK (${bundles.length} bundles across ${shards.length} shards)`);
}

main();
