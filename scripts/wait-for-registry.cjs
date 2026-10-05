#!/usr/bin/env node
/**
 * wait-for-registry — block until npm serves `<name>@<version>` for every package.
 *
 * publish.yml's release-smoke job installs the just-published packages from the
 * registry. npm accepts a publish (`+ @lokascript/semantic@4.0.0`, "Your package
 * is being processed") minutes before an install can resolve it: 8 minutes for
 * @hyperfixi/speech on 3.1.0, ~13 for @lokascript/semantic (11 MB) on 4.0.0.
 * Both times the smoke job's fixed 3 × 90 s retries ran out inside that window
 * and the run went red on a good release, and someone re-ran it by hand.
 *
 * This polls what `npm install` itself reads — the abbreviated ("corgi") document,
 * `Accept: application/vnd.npm.install-v1+json`, which is where 4.0.0's
 * `notarget` came from — until every package lists the version, then exits 0.
 * On timeout it exits 1 naming the packages still missing.
 *
 * Usage: node scripts/wait-for-registry.cjs <version> <name>... [--timeout-min N] [--interval-s N]
 * Zero dependencies (Node 18+ global fetch).
 */

'use strict';

const REGISTRY = 'https://registry.npmjs.org';
const ACCEPT = 'application/vnd.npm.install-v1+json';

/** Does the registry list `version` for `name`? A fetch error or non-200 counts as "not yet". */
async function served(name, version, fetchImpl) {
  try {
    const res = await fetchImpl(`${REGISTRY}/${name.replace('/', '%2f')}`, {
      headers: { accept: ACCEPT },
    });
    if (!res.ok) return false;
    const doc = await res.json();
    return Boolean(doc && doc.versions && doc.versions[version]);
  } catch {
    return false;
  }
}

/**
 * Poll until every name serves `version` or the deadline passes.
 * Returns { ok, pending, polls }. Injectable for tests.
 */
async function waitForRegistry({
  names,
  version,
  timeoutMs = 30 * 60 * 1000,
  intervalMs = 30 * 1000,
  fetchImpl = globalThis.fetch,
  sleep = ms => new Promise(r => setTimeout(r, ms)),
  now = () => Date.now(),
  log = console.log,
}) {
  const deadline = now() + timeoutMs;
  let pending = [...new Set(names)];
  let polls = 0;
  for (;;) {
    polls++;
    const results = await Promise.all(pending.map(n => served(n, version, fetchImpl)));
    pending = pending.filter((_, i) => !results[i]);
    if (pending.length === 0) {
      log(`✓ npm serves ${version} for all ${new Set(names).size} package(s) (poll ${polls})`);
      return { ok: true, pending, polls };
    }
    if (now() >= deadline) return { ok: false, pending, polls };
    log(`poll ${polls}: ${pending.length} not served yet: ${pending.join(', ')}`);
    await sleep(intervalMs);
  }
}

function parseArgs(argv) {
  const opts = { names: [], timeoutMin: 30, intervalS: 30 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--timeout-min') opts.timeoutMin = Number(argv[++i]);
    else if (a === '--interval-s') opts.intervalS = Number(argv[++i]);
    else if (!opts.version) opts.version = a;
    else opts.names.push(a);
  }
  return opts;
}

async function main() {
  const { version, names, timeoutMin, intervalS } = parseArgs(process.argv.slice(2));
  if (!version || names.length === 0) {
    console.error('Usage: node scripts/wait-for-registry.cjs <version> <name>... [--timeout-min N] [--interval-s N]');
    return 2;
  }
  const result = await waitForRegistry({
    names,
    version,
    timeoutMs: timeoutMin * 60 * 1000,
    intervalMs: intervalS * 1000,
  });
  if (result.ok) return 0;
  console.error(
    `::error::after ${timeoutMin} min npm still does not serve ${version} for: ${result.pending.join(', ')}`
  );
  return 1;
}

module.exports = { waitForRegistry, served, parseArgs };

if (require.main === module) main().then(code => process.exit(code));
