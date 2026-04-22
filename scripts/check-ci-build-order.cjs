#!/usr/bin/env node
/**
 * check-ci-build-order — workspace → CI build-order drift guard
 *
 * Fails if any workspace package listed in .github/workflows/ci.yml has a
 * workspace dependency that is either (a) missing from the workflow or
 * (b) appears *after* it in the workflow's build sequence.
 *
 * Why this exists: when `@lokascript/intent` was extracted as a new
 * workspace package in 2026-04-09, nothing updated ci.yml. The CI
 * pipeline stayed red on `main` for 11 days before anyone noticed — the
 * build just failed with a cryptic "Cannot find module" error from
 * `packages/framework`.
 *
 * Zero runtime deps — uses only node built-ins so it stays cheap to run
 * in both the pre-commit hook and the CI lint-typecheck step.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const CI_WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');

const WORKSPACE_SCOPES = ['@lokascript/', '@hyperfixi/'];

/**
 * Read every packages/*\/package.json. Returns a map of package name → dir name
 * and a map of package name → array of workspace dependency names.
 *
 * "Workspace dependency" = a dep in the `dependencies` or `devDependencies`
 * field that matches one of WORKSPACE_SCOPES.
 */
function loadWorkspaces() {
  const nameToDir = new Map();
  const nameToDeps = new Map();

  const dirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true });
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue;
    const pkgPath = path.join(PACKAGES_DIR, dirent.name, 'package.json');
    let raw;
    try {
      raw = fs.readFileSync(pkgPath, 'utf8');
    } catch {
      continue; // directory without package.json — skip
    }
    let pkg;
    try {
      pkg = JSON.parse(raw);
    } catch {
      throw new Error(`check-ci-build-order: invalid JSON in ${pkgPath}`);
    }

    if (!pkg.name) continue;
    nameToDir.set(pkg.name, dirent.name);

    // Only runtime `dependencies` affect CI build ordering: those resolve
    // to imports that tsc/bundlers pull from the dep's built dist. peerDeps
    // are provided by consumers; devDeps are only needed in downstream
    // test/lint jobs (which pull the shared build-artifacts bundle).
    // Scoping here to `dependencies` matches the actual failure mode and
    // avoids false positives on peer/dev relationships.
    const deps = new Set();
    const runtimeDeps = pkg.dependencies || {};
    for (const depName of Object.keys(runtimeDeps)) {
      if (WORKSPACE_SCOPES.some(scope => depName.startsWith(scope))) {
        deps.add(depName);
      }
    }
    nameToDeps.set(pkg.name, [...deps]);
  }

  return { nameToDir, nameToDeps };
}

/**
 * Extract the ordered list of `npm run build --prefix packages/<name>` steps
 * from the CI workflow. Returns an array of directory names in build order.
 *
 * We only parse `run:` values — regex is sufficient and avoids pulling in
 * a YAML library just for this one pattern. Any future workflow edit that
 * uses a different invocation syntax (e.g. a shared composite action) will
 * need this function updated.
 */
function loadWorkflowBuildOrder() {
  let text;
  try {
    text = fs.readFileSync(CI_WORKFLOW, 'utf8');
  } catch (err) {
    throw new Error(`check-ci-build-order: cannot read ${CI_WORKFLOW}: ${err.message}`);
  }

  // The build job's relevant lines look like:
  //   run: npm run build --prefix packages/<name>
  // or
  //   run: npm run build:browser --prefix packages/<name>
  //
  // We only care about the first `run:` occurrence per package because
  // subsequent calls (e.g. build:browser) happen after the main build.
  const pattern = /npm run build(?::[a-zA-Z-]+)?\s+--prefix\s+packages\/([a-zA-Z0-9-]+)/g;
  const seen = new Set();
  const order = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const dir = m[1];
    if (!seen.has(dir)) {
      seen.add(dir);
      order.push(dir);
    }
  }
  return order;
}

/**
 * Core check. Returns an array of human-readable failure messages;
 * empty array means all good.
 */
function check({ nameToDir, nameToDeps }, workflowOrder) {
  const failures = [];

  // Invert: dir name → package name, so we can resolve workflow-order entries
  // back to their package name and look up their deps.
  const dirToName = new Map();
  for (const [name, dir] of nameToDir) dirToName.set(dir, name);

  // Workflow entries with no matching package on disk — likely stale.
  for (const dir of workflowOrder) {
    if (!dirToName.has(dir)) {
      failures.push(
        `Workflow references packages/${dir} but no such workspace package exists. ` +
          `Remove the build step from .github/workflows/ci.yml or add the package.`
      );
    }
  }

  // Position of each package in the workflow, by package name.
  const workflowPos = new Map();
  for (let i = 0; i < workflowOrder.length; i++) {
    const name = dirToName.get(workflowOrder[i]);
    if (name) workflowPos.set(name, i);
  }

  // Check each built package's deps.
  for (const [name, pos] of workflowPos) {
    const deps = nameToDeps.get(name) || [];
    for (const dep of deps) {
      if (!nameToDir.has(dep)) continue; // external dep with a workspace-looking name (rare) — skip
      const depPos = workflowPos.get(dep);
      if (depPos === undefined) {
        failures.push(
          `Workspace package ${dep} is a dependency of ${name} but is NOT built in ` +
            `.github/workflows/ci.yml. Add a "Build ${dep} package" step before the ` +
            `"Build ${name} package" step (around line matching "npm run build --prefix ` +
            `packages/${nameToDir.get(name)}").`
        );
      } else if (depPos > pos) {
        failures.push(
          `Workspace package ${dep} is built AFTER its dependent ${name} in ` +
            `.github/workflows/ci.yml. Move the "Build ${dep} package" step to run ` +
            `before the "Build ${name} package" step.`
        );
      }
    }
  }

  return failures;
}

function main() {
  const workspaces = loadWorkspaces();
  const workflowOrder = loadWorkflowBuildOrder();
  const failures = check(workspaces, workflowOrder);

  if (failures.length === 0) {
    // Keep success output minimal so the pre-commit hook feels invisible.
    process.stdout.write('check-ci-build-order: OK\n');
    process.exit(0);
  }

  process.stderr.write('check-ci-build-order: FAIL\n\n');
  for (const msg of failures) {
    process.stderr.write(`  • ${msg}\n\n`);
  }
  process.stderr.write(
    `Fix the workflow at ${path.relative(REPO_ROOT, CI_WORKFLOW)} and re-run.\n`
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}

// Export for tests.
module.exports = { loadWorkspaces, loadWorkflowBuildOrder, check };
