#!/usr/bin/env node
/**
 * check-ci-test-list — workspace → ci.yml unit-test enumeration drift guard
 *
 * Fails if the hand-written package lists in ci.yml's two unit-test jobs have
 * drifted from what's on disk:
 *
 *   (a)  a job runs tests for a package that no longer exists
 *   (a2) it exists but has no `test` script, so the step can only ever fail
 *   (b)  a package HAS a `test:check` script but appears in NEITHER job — so
 *        CI silently never runs its suite
 *   (c)  a package appears in BOTH jobs (or twice in one), violating the
 *        "exactly one of them" rule the split is built on
 *   (e)  an INTENTIONALLY_UNGATED entry has gone stale
 *
 * Why this exists: PR #857. `developer-tools` was in the local `test:check`
 * gate from the beginning but was never enumerated here, so the express 4 → 5
 * major broke all 26 of its dev-server tests (`'*.html'` is not a valid
 * path-to-regexp v8 route) while CI stayed green — and the permanently-red
 * local package masked every new failure on top of it. That commit fixed the
 * route and added the one missing step, then noted that ci.yml's enumeration
 * is a THIRD hand-maintained package list with nothing guarding it, and that
 * ten more locally-gated packages (~91 test files) were missing from it too.
 * This is that follow-up.
 *
 * How it composes with its two siblings — all three anchor on the SAME
 * predicate, `test:check` presence in package.json, without coupling to each
 * other's parse targets:
 *
 *   check-test-check-list.cjs   test:check  ⇔  scripts/test-check-all.sh
 *   check-ci-test-list.cjs      test:check  →  ci.yml unit-test jobs   (here)
 *   check-ci-build-order.cjs    workspace deps → ci.yml build order
 *
 * A real suite with a `test` script but no `test:check` is invisible here by
 * design; that is the local-gate guard's jurisdiction, and repo convention is
 * that every package with tests has both. Keying off `test` instead would
 * force a permanent exemption for placeholder packages like
 * language-server-hyperscript (a `test` script, zero test files).
 *
 * MEASURED NON-ISSUE — do not add a "watch mode" failure class. 24 packages
 * declare `"test": "vitest"`, which is watch mode locally, and twelve of them
 * are enumerated here with no `-- --run` suffix. That is safe: vitest disables
 * watch when `process.env.CI` is set, which GitHub Actions always sets
 * (verified 2026-07-31 — `CI=true npm test --prefix packages/domain-config`
 * exits 0 after one run). A guard requiring the suffix would have failed
 * twelve green steps.
 *
 * Zero runtime deps — node built-ins only, so it stays cheap enough for both
 * the pre-commit hook and the CI lint-typecheck step.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const CI_WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');

/**
 * The jobs whose steps count as "CI runs this package's unit tests". Both are
 * required checks and PR-gated; a package must appear in exactly one.
 *
 * Deliberately NOT the whole file: `coverage` is a nightly, non-required job
 * that also runs `npm test --prefix packages/<x> -- --coverage`. Counting it
 * would let a package look guarded while every required check skips it — the
 * exact silent gap this guard exists to prevent.
 */
const TEST_JOBS = ['unit-tests', 'unit-tests-packages'];

/**
 * Packages that have a `test:check` script but are deliberately NOT enumerated
 * in a unit-test job. Keep this empty if you can — an entry here means a real
 * suite CI will never run. Each entry MUST carry a reason.
 *
 * Format: dirName → reason string.
 */
const INTENTIONALLY_UNGATED = new Map([
  // e.g. ['some-package', 'needs a live GPU; covered by the nightly workflow'],
]);

/**
 * Read every packages/*\/package.json. Returns a map of directory name →
 * { name, hasTest, hasTestCheck }.
 *
 * Keyed by directory, not package name, because that's what the workflow steps
 * use (`npm test --prefix packages/<dir>`).
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
      throw new Error(`check-ci-test-list: invalid JSON in ${pkgPath}`);
    }

    byDir.set(dirent.name, {
      name: pkg.name || dirent.name,
      hasTest: Boolean(pkg.scripts && pkg.scripts.test),
      hasTestCheck: Boolean(pkg.scripts && pkg.scripts['test:check']),
    });
  }

  return byDir;
}

/**
 * Slice out one job's body: from its 2-space-indented key to the next one (or
 * EOF). Job keys are the only things at exactly two spaces — a job's own
 * properties sit at four, and the `# ===` banner comments between jobs can't
 * match either. Returns null when the job key is absent.
 */
function sliceJob(text, jobName) {
  const header = new RegExp(`^ {2}${jobName}:[ \\t]*$`, 'm');
  const start = header.exec(text);
  if (!start) return null;

  const rest = text.slice(start.index + start[0].length);
  const nextKey = /^ {2}[A-Za-z0-9_-]+:/m.exec(rest);
  return nextKey ? rest.slice(0, nextKey.index) : rest;
}

/**
 * Extract the packages each unit-test job runs tests for.
 *
 * Regex rather than a YAML parser, for the same reason as the sibling guards:
 * the shape is fixed and simple, and a parser (plus its dependency) would be
 * more code than the thing it guards. Anchoring on `run:` is what makes
 * comment lines unmatchable — ci.yml's prose mentions
 * `npm test --prefix packages/domain-<x>` in a note about lint:domains, which
 * a whole-file scan would happily read as a package named `domain-`.
 *
 * A future refactor to a `run: |` block, a matrix, or a composite action needs
 * this function updated; the missing-job and empty-job errors below fail loudly
 * rather than silently passing if that happens.
 *
 * Returns Map<jobName, Array<{ dir, args }>>.
 */
function loadCiTestSteps(text) {
  if (text === undefined) {
    try {
      text = fs.readFileSync(CI_WORKFLOW, 'utf8');
    } catch (err) {
      throw new Error(`check-ci-test-list: cannot read ${CI_WORKFLOW}: ${err.message}`);
    }
  }

  const byJob = new Map();

  for (const jobName of TEST_JOBS) {
    const body = sliceJob(text, jobName);
    if (body === null) {
      throw new Error(
        `check-ci-test-list: no "${jobName}:" job found in .github/workflows/ci.yml. ` +
          `If the job was renamed or removed, update TEST_JOBS in ` +
          `scripts/check-ci-test-list.cjs — otherwise this guard would silently ` +
          `stop checking it.`
      );
    }

    const steps = [];
    const stepPattern = /^[ \t]*run:[ \t]*npm test --prefix packages\/([A-Za-z0-9-]+)(.*)$/gm;
    let m;
    while ((m = stepPattern.exec(body)) !== null) {
      steps.push({ dir: m[1], args: m[2].replace(/#.*$/, '').trim() });
    }

    if (steps.length === 0) {
      throw new Error(
        `check-ci-test-list: the "${jobName}" job has no ` +
          `\`run: npm test --prefix packages/<dir>\` steps. Either every package ` +
          `was removed from it, or its step shape changed — update ` +
          `loadCiTestSteps() in scripts/check-ci-test-list.cjs to match.`
      );
    }

    byJob.set(jobName, steps);
  }

  return byJob;
}

/**
 * Core check. Returns an array of human-readable failure messages;
 * empty array means all good.
 */
function check(byDir, byJob, ungated = INTENTIONALLY_UNGATED) {
  const failures = [];

  // Where each package is enumerated, so (c) can name both sites.
  const jobsByDir = new Map();
  for (const [jobName, steps] of byJob) {
    for (const { dir } of steps) {
      if (!jobsByDir.has(dir)) jobsByDir.set(dir, []);
      jobsByDir.get(dir).push(jobName);
    }
  }

  for (const [dir, jobs] of jobsByDir) {
    // (c) the split's core invariant: exactly one job per package.
    if (jobs.length > 1) {
      failures.push(
        `packages/${dir} is tested in more than one unit-test job (${jobs.join(', ')}). ` +
          `Both are required checks and each pays a full vitest boot; a package must ` +
          `appear in exactly one. Remove the duplicate step from ci.yml.`
      );
    }

    const pkg = byDir.get(dir);
    // (a) a step pointed at a package that has been deleted or renamed.
    if (!pkg) {
      failures.push(
        `ci.yml runs \`npm test --prefix packages/${dir}\`, but no such workspace ` +
          `package exists. The step dies on an ENOENT and fails the job. ` +
          `Remove it from .github/workflows/ci.yml.`
      );
      continue;
    }
    // (a2) it exists, but the step can only ever fail.
    if (!pkg.hasTest) {
      failures.push(
        `ci.yml runs \`npm test --prefix packages/${dir}\`, but ${pkg.name} has no ` +
          `"test" script. Add one to packages/${dir}/package.json, or drop the step.`
      );
    }
  }

  // (b) the #857 shape: a real suite CI never runs.
  for (const [dir, pkg] of byDir) {
    if (!pkg.hasTestCheck) continue;
    if (jobsByDir.has(dir)) continue;
    if (ungated.has(dir)) continue;
    failures.push(
      `${pkg.name} (packages/${dir}) has a "test:check" script but is NOT enumerated ` +
        `in either unit-test job of .github/workflows/ci.yml, so CI never runs its ` +
        `suite — it can break and stay green (that was #857). Add a step to the ` +
        `\`unit-tests-packages\` job:\n` +
        `        - name: Test ${dir}\n` +
        `          run: npm test --prefix packages/${dir}\n` +
        `    If its tests need a workspace dep's dist/, make sure the \`build\` job ` +
        `builds that dep. If skipping is deliberate, add it to INTENTIONALLY_UNGATED ` +
        `with a reason.`
    );
  }

  // (e) stale exemptions — an exemption that no longer describes reality is
  // worse than none, because it reads as a considered decision.
  for (const [dir, reason] of ungated) {
    const pkg = byDir.get(dir);
    if (!pkg) {
      failures.push(
        `INTENTIONALLY_UNGATED lists packages/${dir} ("${reason}"), but no such ` +
          `workspace package exists. Remove the entry from ` +
          `scripts/check-ci-test-list.cjs.`
      );
      continue;
    }
    if (jobsByDir.has(dir)) {
      failures.push(
        `INTENTIONALLY_UNGATED lists packages/${dir} ("${reason}"), but ci.yml now ` +
          `runs its tests. Remove the entry from scripts/check-ci-test-list.cjs.`
      );
      continue;
    }
    if (!pkg.hasTestCheck) {
      failures.push(
        `INTENTIONALLY_UNGATED lists packages/${dir} ("${reason}"), but ${pkg.name} ` +
          `has no "test:check" script, so the exemption is doing nothing. Remove it ` +
          `from scripts/check-ci-test-list.cjs.`
      );
    }
  }

  return failures;
}

function main() {
  let byDir;
  let byJob;
  try {
    byDir = loadWorkspaces();
    byJob = loadCiTestSteps();
  } catch (err) {
    process.stderr.write(`check-ci-test-list: FAIL\n\n  • ${err.message}\n\n`);
    process.exit(1);
  }

  const failures = check(byDir, byJob);

  if (failures.length === 0) {
    const total = [...byJob.values()].reduce((n, steps) => n + steps.length, 0);
    // Keep success output minimal so the pre-commit hook feels invisible.
    process.stdout.write(`check-ci-test-list: OK (${total} packages tested in CI)\n`);
    process.exit(0);
  }

  process.stderr.write('check-ci-test-list: FAIL\n\n');
  for (const msg of failures) {
    process.stderr.write(`  • ${msg}\n\n`);
  }
  process.stderr.write(`Fix ${path.relative(REPO_ROOT, CI_WORKFLOW)} and re-run.\n`);
  process.exit(1);
}

if (require.main === module) {
  main();
}

// Export for tests.
module.exports = { loadWorkspaces, loadCiTestSteps, sliceJob, check, INTENTIONALLY_UNGATED };
