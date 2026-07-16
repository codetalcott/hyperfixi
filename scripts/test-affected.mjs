#!/usr/bin/env node
/**
 * test-affected — run `test:check` for every package affected by the current change.
 *
 * "Affected" = packages whose files changed PLUS every package that transitively
 * depends on a package whose SRC changed. This closes the verification gap where an
 * engine change (e.g. `packages/semantic`'s renderer) breaks a DOWNSTREAM consumer
 * (e.g. `packages/hyperscript-adapter`, which has its own `preprocessToEnglish` and
 * custom-renderer assertions) but running only the changed package's tests misses it
 * — the exact failure that slipped past local verification and was only caught by CI.
 *
 * The dependency graph is read from each `packages/<dir>/package.json`
 * (`dependencies` + `devDependencies`, scoped to @lokascript/ and @hyperfixi/), the
 * same source `scripts/check-ci-build-order.cjs` uses — so it stays correct as
 * packages are added.
 *
 * Usage:
 *   node scripts/test-affected.mjs                  # from the git diff vs origin/main (+ working tree)
 *   node scripts/test-affected.mjs semantic core    # explicit packages (dir or full name) + their dependents
 *   BASE=<ref> node scripts/test-affected.mjs        # override the diff base
 *   node scripts/test-affected.mjs --list            # print the affected set and exit (no tests)
 */

import { execSync, execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const SCOPES = ['@lokascript/', '@hyperfixi/'];

// --- 1. Read the workspace graph -------------------------------------------
/** @type {Record<string, {dir: string, deps: Set<string>, hasTestCheck: boolean}>} */
const byName = {};
const dirToName = {};
for (const dirent of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue;
  const pjPath = path.join(PACKAGES_DIR, dirent.name, 'package.json');
  if (!existsSync(pjPath)) continue;
  const pkg = JSON.parse(readFileSync(pjPath, 'utf8'));
  const deps = new Set(
    Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter(d =>
      SCOPES.some(s => d.startsWith(s))
    )
  );
  byName[pkg.name] = { dir: dirent.name, deps, hasTestCheck: !!pkg.scripts?.['test:check'] };
  dirToName[dirent.name] = pkg.name;
}
// Keep only edges to packages that actually exist in this workspace.
for (const n of Object.keys(byName)) {
  byName[n].deps = new Set([...byName[n].deps].filter(d => byName[d]));
}
// Reverse edges: dep -> set of packages that depend on it.
/** @type {Record<string, Set<string>>} */
const dependents = {};
for (const n of Object.keys(byName)) {
  for (const d of byName[n].deps) (dependents[d] ??= new Set()).add(n);
}

// --- 2. Determine changed packages -----------------------------------------
const argv = process.argv.slice(2);
const listOnly = argv.includes('--list');
const explicit = argv.filter(a => !a.startsWith('--'));

/** Map a repo-relative path to {name, testOnly} or null if outside a package. */
function classify(rel) {
  const m = rel.match(/^packages\/([^/]+)\/(.+)$/);
  if (!m) return null;
  const name = dirToName[m[1]];
  if (!name) return null;
  const sub = m[2];
  const testOnly =
    /(^|\/)(test|tests|__tests__|docs)\//.test(sub) ||
    /\.(test|spec)\.[cm]?tsx?$/.test(sub) ||
    /\.md$/.test(sub);
  return { name, testOnly };
}

const touched = new Set(); // any change under the package
const srcChanged = new Set(); // a non-test change (affects dependents)

if (explicit.length > 0) {
  for (const a of explicit) {
    const name = byName[a] ? a : dirToName[a];
    if (!name) {
      console.error(`✗ unknown package: ${a}`);
      process.exit(2);
    }
    touched.add(name);
    srcChanged.add(name);
  }
} else {
  let base = process.env.BASE;
  if (!base) {
    try {
      base = execSync('git merge-base HEAD origin/main', { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      base = 'HEAD'; // no origin/main (e.g. first checkout) → uncommitted work only
    }
  }
  const changed = new Set();
  try {
    // Working tree vs base captures committed-on-branch AND uncommitted changes.
    for (const f of execSync(`git diff --name-only ${base}`, { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean))
      changed.add(f);
    // Plus untracked files (a brand-new source file not yet added).
    for (const f of execSync('git ls-files --others --exclude-standard', {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean))
      changed.add(f);
  } catch (e) {
    console.error('✗ could not read git diff:', e.message);
    process.exit(2);
  }
  for (const rel of changed) {
    const c = classify(rel);
    if (!c) continue;
    touched.add(c.name);
    if (!c.testOnly) srcChanged.add(c.name);
  }
}

// --- 3. Affected = touched ∪ (reverse-dependency closure of srcChanged) ------
const affected = new Set(touched);
const stack = [...srcChanged];
while (stack.length) {
  const n = stack.pop();
  for (const dep of dependents[n] ?? []) {
    if (!affected.has(dep)) {
      affected.add(dep);
      stack.push(dep);
    }
  }
}

// --- 4. Order deps-before-dependents (build order + fail-fast on a dep) ------
function topoOrder(names) {
  const set = new Set(names);
  const seen = new Set();
  const order = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const d of byName[n].deps) if (set.has(d)) visit(d);
    order.push(n);
  };
  for (const n of names) visit(n);
  return order;
}

const affectedOrdered = topoOrder([...affected]);
const testable = affectedOrdered.filter(n => byName[n].hasTestCheck);
const untestable = affectedOrdered.filter(n => !byName[n].hasTestCheck);

if (affected.size === 0) {
  console.log('test-affected: no workspace packages affected by the change — nothing to test.');
  process.exit(0);
}

console.log(
  `test-affected: ${testable.length} package(s) to test ` +
    `(${srcChanged.size} changed, +${affected.size - touched.size} dependent):`
);
console.log('  ' + testable.map(n => byName[n].dir).join(', '));
if (untestable.length)
  console.log('  (skipped, no test:check: ' + untestable.map(n => byName[n].dir).join(', ') + ')');
if (listOnly) process.exit(0);

// --- 5. Rebuild stale dists (affected + their deps), then run test:check -----
const buildClosure = new Set(affected);
for (const n of affected) for (const d of byName[n].deps) buildClosure.add(d);
const freshDirs = topoOrder([...buildClosure]).map(n => path.join(PACKAGES_DIR, byName[n].dir));
try {
  execFileSync(path.join(ROOT, 'scripts/ensure-fresh.sh'), freshDirs, {
    cwd: ROOT,
    stdio: 'inherit',
  });
} catch {
  /* ensure-fresh failing (e.g. a build error) surfaces below as a test failure */
}

const failed = [];
for (const n of testable) {
  console.log(`\n=== ${byName[n].dir} ===`);
  try {
    execSync(`npm run test:check --prefix packages/${byName[n].dir}`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  } catch {
    failed.push(byName[n].dir);
  }
}

console.log('');
if (failed.length) {
  console.error(`✗ test-affected: FAILED in ${failed.length} package(s): ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`✓ test-affected: ${testable.length} package(s) passed.`);
