#!/usr/bin/env node
/**
 * check-domains-peer-major — cross-repo contract guard for @lokascript/domains
 *
 * `@lokascript/domains` lives in its own repo (lokascript-domains) and PEERS
 * on the contract packages this repo publishes: @lokascript/framework,
 * @lokascript/semantic, @lokascript/intent. Three workspace packages here
 * consume it back (mcp-server at runtime; framework and server-bridge as
 * test-only devDependencies). That is a cycle across two repos, and the
 * version the lockfile pins for domains can silently fall behind the
 * version this repo is about to publish.
 *
 * What that looks like when it slips: @hyperfixi/mcp-server@3.1.0 shipped
 * pinning domains ^2.11.1, whose framework was a hard `dependency` on the
 * 2.x line. A clean install got TWO copies of framework/semantic/intent —
 * 3.1.0 at the top level, 2.11.1 nested under domains — and every
 * DomainRegistry / schema singleton forked across that boundary. Nothing in
 * the publish path or the release smoke could see it.
 *
 * The check, for the domains version the LOCKFILE resolves:
 *   1. every contract package domains declares must be a peerDependency,
 *      not a dependency (a bundled copy forks singletons even at equal majors
 *      when the ranges diverge);
 *   2. the version this repo publishes (packages/core's, uniform after
 *      set-version) must SATISFY each of those peer ranges — the same
 *      question lokascript-domains' pack-smoke asks from its side, so the two
 *      repos cannot both be green while disagreeing.
 *
 * Reads only package.json files and package-lock.json, so it runs before
 * `npm ci` in the lint-typecheck job, at the start of publish.yml (after the
 * version bump, before the build), and from the pre-commit hook. Zero deps.
 *
 * Fix when it fires: bump the `@lokascript/domains` range in the named
 * consumers to a release built against this line (`npm install` to relock),
 * or — on a framework major — cut that domains release first. Order for a
 * major: publish hyperfixi → domains' upstream Dependabot PR goes red →
 * domains `version:set` + publish → bump the range here → hyperfixi patch.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DOMAINS = '@lokascript/domains';
const CONTRACT_SCOPES = ['@lokascript/', '@hyperfixi/'];

function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function cmp(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/**
 * Minimal semver-range check covering the shapes this repo actually writes:
 * `^x.y.z`, `~x.y.z`, `>=x.y.z`, exact `x.y.z`, and `*`. Returns null for an
 * unrecognized range so the caller can fail loudly rather than guess.
 */
function satisfies(version, range) {
  const v = parseVersion(version);
  if (!v) return null;
  const r = range.trim();
  if (r === '*' || r === 'x' || r === '') return true;
  const m = /^(\^|~|>=)?(\d+)\.(\d+)\.(\d+)$/.exec(r);
  if (!m) return null;
  const op = m[1] || '';
  const floor = [Number(m[2]), Number(m[3]), Number(m[4])];
  if (cmp(v, floor) < 0) return false;
  if (op === '>=') return true;
  if (op === '^') return floor[0] === 0 ? v[0] === 0 && v[1] === floor[1] : v[0] === floor[0];
  if (op === '~') return v[0] === floor[0] && v[1] === floor[1];
  return cmp(v, floor) === 0;
}

/**
 * Pure check. `input` is:
 *   repoVersion   — the version this repo publishes (string)
 *   locked        — the lockfile entry for domains: { version, dependencies?, peerDependencies? }
 *                   or null when the lockfile has no entry
 *   consumers     — [{ name, field, range }] for each workspace package listing domains
 * Returns { ok, errors: string[], summary: string }.
 */
function check({ repoVersion, locked, consumers }) {
  const errors = [];
  if (consumers.length === 0) {
    return { ok: true, errors, summary: `no workspace package depends on ${DOMAINS}` };
  }
  if (!locked) {
    errors.push(
      `${DOMAINS} is consumed by ${consumers.map(c => c.name).join(', ')} but package-lock.json has no entry for it — run \`npm install\``
    );
    return { ok: false, errors, summary: '' };
  }

  for (const c of consumers) {
    const sat = satisfies(locked.version, c.range);
    if (sat === null)
      errors.push(
        `${c.name}: unrecognized ${DOMAINS} range "${c.range}" (${c.field}) — this guard only understands ^, ~, >=, exact and *`
      );
    else if (!sat)
      errors.push(
        `${c.name}: ${c.field} range ${DOMAINS}@${c.range} is not satisfied by the locked ${locked.version} — lockfile and manifest disagree; run \`npm install\``
      );
  }

  const bundled = Object.entries(locked.dependencies || {}).filter(([n]) =>
    CONTRACT_SCOPES.some(s => n.startsWith(s))
  );
  for (const [name, range] of bundled) {
    errors.push(
      `${DOMAINS}@${locked.version} carries ${name}@${range} as a hard dependency, not a peer — a consumer on ${repoVersion} gets a second nested copy and singletons fork (the 2.11.1 shape). Bump ${DOMAINS} to a release that peers on the contract.`
    );
  }

  const peers = Object.entries(locked.peerDependencies || {}).filter(([n]) =>
    CONTRACT_SCOPES.some(s => n.startsWith(s))
  );
  if (peers.length === 0 && bundled.length === 0) {
    errors.push(
      `${DOMAINS}@${locked.version} declares no @lokascript/@hyperfixi peer at all — it should peer on framework/semantic/intent`
    );
  }
  for (const [name, range] of peers) {
    const sat = satisfies(repoVersion, range);
    if (sat === null)
      errors.push(`${DOMAINS}@${locked.version}: unrecognized peer range ${name}@${range}`);
    else if (!sat) {
      const consumerNames = consumers.map(c => `${c.name} (${c.field})`).join(', ');
      errors.push(
        `${DOMAINS}@${locked.version} peers on ${name}@${range}, but this repo publishes ${repoVersion} — the ${name} it would install beside itself is not the one it was built against. Consumers here: ${consumerNames}. Release lokascript-domains against ${repoVersion.split('.')[0]}.x first, then bump the range.`
      );
    }
  }

  const summary = `${DOMAINS}@${locked.version} peers ${peers.map(([n, r]) => `${n}@${r}`).join(', ')} — satisfied by ${repoVersion}; ${consumers.length} consumer(s) in range`;
  return { ok: errors.length === 0, errors, summary };
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadInput(root = REPO_ROOT) {
  const repoVersion = readJson(path.join(root, 'packages', 'core', 'package.json')).version;
  const lock = readJson(path.join(root, 'package-lock.json'));
  const entry = lock.packages && lock.packages[`node_modules/${DOMAINS}`];
  const locked = entry
    ? {
        version: entry.version,
        dependencies: entry.dependencies,
        peerDependencies: entry.peerDependencies,
      }
    : null;

  const consumers = [];
  const packagesDir = path.join(root, 'packages');
  for (const dir of fs.readdirSync(packagesDir)) {
    const pkgPath = path.join(packagesDir, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = readJson(pkgPath);
    for (const field of [
      'dependencies',
      'peerDependencies',
      'optionalDependencies',
      'devDependencies',
    ]) {
      const range = pkg[field] && pkg[field][DOMAINS];
      if (range) consumers.push({ name: pkg.name, field, range });
    }
  }
  return { repoVersion, locked, consumers };
}

function main() {
  const result = check(loadInput());
  if (result.ok) {
    console.log(`✅ domains peer-major guard: ${result.summary}`);
    return 0;
  }
  console.error('❌ domains peer-major guard failed\n');
  for (const e of result.errors) console.error(`  - ${e}`);
  console.error(
    '\n💡 See the header of scripts/check-domains-peer-major.cjs for the cross-repo release order.'
  );
  return 1;
}

module.exports = { check, satisfies, loadInput };

if (require.main === module) process.exit(main());
