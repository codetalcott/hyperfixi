#!/usr/bin/env node
/**
 * check-test-check-list — workspace → `test:check` gate drift guard
 *
 * Fails if scripts/test-check-all.sh has drifted from what's on disk:
 *
 *   (a) it lists a package that no longer exists
 *   (b) it lists a package whose package.json has no `test:check` script
 *   (c) a package HAS a `test:check` script but is NOT listed — so the
 *       "whole-monorepo" gate silently skips it
 *   (d) its ensure-fresh argument list names a package that doesn't exist
 *
 * Why this exists: two drifts, in both directions, went unnoticed for months.
 *
 * Forward: `chore: extract mcp-server-hyperscript to its own repo` (#686)
 * deleted the package but left it in PACKAGES, so every `npm run test:check`
 * died on `npm error enoent Could not read package.json` and exited 1 on a
 * fully green tree, from 2026-07-15 until #756.
 *
 * Reverse (quieter, and the reason case (c) exists): nine packages with real
 * suites — domain-toolkit, htmx-adapter, hyperscript-tools-i18n, intent,
 * intent-element, intercept, mcp-multilingual-intent, planner, realtime —
 * had never been added to the list, so ~390 tests never ran in the gate that
 * claims to run everything.
 *
 * Neither is caught by CI, which runs vitest per-package rather than through
 * this script — which is exactly why the guard is cheap and runs early.
 *
 * Zero runtime deps — node built-ins only, so it stays cheap enough for both
 * the pre-commit hook and the CI lint-typecheck step.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const GATE_SCRIPT = path.join(REPO_ROOT, 'scripts', 'test-check-all.sh');

/**
 * Packages that have a `test:check` script but are deliberately NOT in the
 * gate. Keep this empty if you can — an entry here means a real suite that
 * `npm run test:check` will never run. Each entry MUST carry a reason.
 *
 * Format: dirName → reason string (shown in --explain output).
 */
const INTENTIONALLY_UNGATED = new Map([
  // e.g. ['some-package', 'needs a live GPU; covered by the nightly workflow'],
]);

/**
 * Read every packages/*\/package.json. Returns a map of directory name →
 * { name, hasTestCheck }.
 *
 * Keyed by directory, not package name, because that's what the gate script
 * uses (`npm run test:check --prefix packages/<dir>`).
 */
function loadWorkspaces() {
  const byDir = new Map();

  const dirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true });
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue;
    const pkgPath = path.join(PACKAGES_DIR, dirent.name, 'package.json');
    let raw;
    try {
      raw = fs.readFileSync(pkgPath, 'utf8');
    } catch {
      continue; // directory without package.json (stale build leftovers) — skip
    }
    let pkg;
    try {
      pkg = JSON.parse(raw);
    } catch {
      throw new Error(`check-test-check-list: invalid JSON in ${pkgPath}`);
    }

    byDir.set(dirent.name, {
      name: pkg.name || dirent.name,
      hasTestCheck: Boolean(pkg.scripts && pkg.scripts['test:check']),
    });
  }

  return byDir;
}

/**
 * Extract both lists the gate script maintains by hand:
 *
 *   - `listed`      — the PACKAGES=( "dir:Label" ... ) array
 *   - `ensureFresh` — the "$REPO_ROOT/packages/<dir>" args to ensure-fresh.sh
 *
 * Regex rather than a bash parser: the file is a fixed, simple shape, and a
 * parser would be more code than the thing it guards. A future edit that
 * changes either shape needs this function updated — the self-test's
 * integration case fails loudly if that happens.
 */
function loadGateLists(text) {
  if (text === undefined) {
    try {
      text = fs.readFileSync(GATE_SCRIPT, 'utf8');
    } catch (err) {
      throw new Error(`check-test-check-list: cannot read ${GATE_SCRIPT}: ${err.message}`);
    }
  }

  // PACKAGES=(\n  # comment\n  "core:Core"\n  ...\n)
  const arrayMatch = /PACKAGES=\(([\s\S]*?)\n\)/.exec(text);
  const listed = [];
  if (arrayMatch) {
    const entryPattern = /"([a-z0-9-]+):[^"]*"/g;
    let m;
    while ((m = entryPattern.exec(arrayMatch[1])) !== null) {
      listed.push(m[1]);
    }
  }

  const freshPattern = /\$REPO_ROOT\/packages\/([a-z0-9-]+)/g;
  const ensureFresh = [];
  let f;
  while ((f = freshPattern.exec(text)) !== null) {
    ensureFresh.push(f[1]);
  }

  return { listed, ensureFresh };
}

/**
 * Core check. Returns an array of human-readable failure messages;
 * empty array means all good.
 */
function check(byDir, { listed, ensureFresh }, ungated = INTENTIONALLY_UNGATED) {
  const failures = [];

  if (listed.length === 0) {
    failures.push(
      'Could not find any entries in the PACKAGES=( ... ) array of ' +
        'scripts/test-check-all.sh. Either the file moved or its shape changed — ' +
        'update loadGateLists() in scripts/check-test-check-list.cjs to match.'
    );
    return failures;
  }

  // (a) + (b): every listed entry must exist and be runnable.
  const seen = new Set();
  for (const dir of listed) {
    if (seen.has(dir)) {
      failures.push(`packages/${dir} is listed twice in the PACKAGES array — remove the duplicate.`);
      continue;
    }
    seen.add(dir);

    const pkg = byDir.get(dir);
    if (!pkg) {
      failures.push(
        `PACKAGES lists packages/${dir}, but no such workspace package exists. ` +
          `\`npm run test:check\` will die on an ENOENT and the whole gate exits 1. ` +
          `Remove the entry from scripts/test-check-all.sh.`
      );
      continue;
    }
    if (!pkg.hasTestCheck) {
      failures.push(
        `PACKAGES lists packages/${dir}, but ${pkg.name} has no "test:check" script. ` +
          `Add one to packages/${dir}/package.json, or drop the entry.`
      );
    }
  }

  // (c) the quiet direction: a real suite the gate never runs.
  for (const [dir, pkg] of byDir) {
    if (!pkg.hasTestCheck) continue;
    if (seen.has(dir)) continue;
    if (ungated.has(dir)) continue;
    failures.push(
      `${pkg.name} (packages/${dir}) has a "test:check" script but is NOT in the ` +
        `PACKAGES array of scripts/test-check-all.sh, so \`npm run test:check\` ` +
        `silently skips it. Add "${dir}:<Label>" to the list — and if its tests ` +
        `need a workspace dep's dist/, add it to the ensure-fresh.sh args too. ` +
        `If skipping is deliberate, add it to INTENTIONALLY_UNGATED with a reason.`
    );
  }

  // (d) stale ensure-fresh args — same failure mode as (a), different list.
  for (const dir of ensureFresh) {
    if (!byDir.has(dir)) {
      failures.push(
        `ensure-fresh.sh is passed packages/${dir}, but no such workspace package ` +
          `exists. Remove the argument from scripts/test-check-all.sh.`
      );
    }
  }

  return failures;
}

function main() {
  const byDir = loadWorkspaces();
  const lists = loadGateLists();
  const failures = check(byDir, lists);

  if (failures.length === 0) {
    // Keep success output minimal so the pre-commit hook feels invisible.
    process.stdout.write(`check-test-check-list: OK (${lists.listed.length} packages gated)\n`);
    process.exit(0);
  }

  process.stderr.write('check-test-check-list: FAIL\n\n');
  for (const msg of failures) {
    process.stderr.write(`  • ${msg}\n\n`);
  }
  process.stderr.write(`Fix ${path.relative(REPO_ROOT, GATE_SCRIPT)} and re-run.\n`);
  process.exit(1);
}

if (require.main === module) {
  main();
}

// Export for tests.
module.exports = { loadWorkspaces, loadGateLists, check, INTENTIONALLY_UNGATED };
