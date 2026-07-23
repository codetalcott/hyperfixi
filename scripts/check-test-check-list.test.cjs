#!/usr/bin/env node
/**
 * Tests for scripts/check-test-check-list.cjs
 *
 * Uses node's built-in test runner to keep the zero-runtime-deps story —
 * no vitest, no jest, no extra install. Run with:
 *     node --test scripts/check-test-check-list.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { check, loadGateLists, loadWorkspaces } = require('./check-test-check-list.cjs');

/** Build a minimal workspaces map matching the shape `check()` expects. */
function workspaces(defs) {
  const byDir = new Map();
  for (const { dir, name = `@x/${dir}`, hasTestCheck = true } of defs) {
    byDir.set(dir, { name, hasTestCheck });
  }
  return byDir;
}

test('check: passes when the list exactly covers the packages with test:check', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  assert.deepEqual(check(ws, { listed: ['a', 'b'], ensureFresh: ['a'] }), []);
});

test('check: flags a listed package that no longer exists (the #686 → #756 drift)', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = check(ws, { listed: ['a', 'ghost-package'], ensureFresh: [] });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /PACKAGES lists packages\/ghost-package, but no such workspace/);
});

test('check: flags a listed package with no test:check script', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b', hasTestCheck: false }]);
  const failures = check(ws, { listed: ['a', 'b'], ensureFresh: [] });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /has no "test:check" script/);
});

test('check: flags a package with tests that the gate silently skips', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'realtime', name: '@hyperfixi/realtime' }]);
  const failures = check(ws, { listed: ['a'], ensureFresh: [] });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /@hyperfixi\/realtime \(packages\/realtime\) has a "test:check"/);
  assert.match(failures[0], /silently skips it/);
});

test('check: a package without test:check is not required to be listed', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'docs-only', hasTestCheck: false }]);
  assert.deepEqual(check(ws, { listed: ['a'], ensureFresh: [] }), []);
});

test('check: INTENTIONALLY_UNGATED suppresses the missing-package failure', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const ungated = new Map([['b', 'needs a live GPU']]);
  assert.deepEqual(check(ws, { listed: ['a'], ensureFresh: [] }, ungated), []);
});

test('check: flags a duplicate entry', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = check(ws, { listed: ['a', 'a'], ensureFresh: [] });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /listed twice/);
});

test('check: flags a stale ensure-fresh argument', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = check(ws, { listed: ['a'], ensureFresh: ['a', 'ghost-package'] });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /ensure-fresh\.sh is passed packages\/ghost-package/);
});

test('check: an empty PACKAGES array is a parse failure, not a silent pass', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = check(ws, { listed: [], ensureFresh: [] });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /Could not find any entries in the PACKAGES/);
});

test('check: reports failures from both directions in one run', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const failures = check(ws, { listed: ['a', 'ghost-package'], ensureFresh: [] });
  assert.equal(failures.length, 2); // ghost listed + b unlisted
});

test('loadGateLists: parses the PACKAGES array and ensure-fresh args', () => {
  const sample = [
    '#!/usr/bin/env bash',
    '"$REPO_ROOT/scripts/ensure-fresh.sh" \\',
    '  "$REPO_ROOT/packages/core" \\',
    '  "$REPO_ROOT/packages/framework"',
    '',
    'PACKAGES=(',
    '  # Core runtime',
    '  "core:Core"',
    '  "semantic:Semantic"',
    ')',
    '',
    'for entry in "${PACKAGES[@]}"; do',
  ].join('\n');

  const { listed, ensureFresh } = loadGateLists(sample);
  assert.deepEqual(listed, ['core', 'semantic']);
  assert.deepEqual(ensureFresh, ['core', 'framework']);
});

test('loadGateLists: does not swallow the loop body as array entries', () => {
  // The `for entry in "${PACKAGES[@]}"` line lives after the closing paren;
  // a greedy match would pull it in and produce junk entries.
  const sample = 'PACKAGES=(\n  "core:Core"\n)\n\nfor entry in "${PACKAGES[@]}"; do\n  :\ndone\n';
  assert.deepEqual(loadGateLists(sample).listed, ['core']);
});

// Integration smoke: the real repo should pass the guard. Pins the contract
// so a future refactor that breaks loader semantics fails this test.
test('integration: real repository state passes the guard', () => {
  const byDir = loadWorkspaces();
  const lists = loadGateLists();
  assert.deepEqual(check(byDir, lists), []);
});

// Integration smoke: the loaders find real data. Guards against a regex that
// silently matches nothing after a future edit to test-check-all.sh.
test('integration: loaders return non-trivial lists', () => {
  const { listed, ensureFresh } = loadGateLists();
  assert.ok(listed.length > 20, `expected >20 gated packages, got ${listed.length}`);
  assert.ok(ensureFresh.length > 10, `expected >10 ensure-fresh args, got ${ensureFresh.length}`);
  assert.ok(loadWorkspaces().size > 20);
});
