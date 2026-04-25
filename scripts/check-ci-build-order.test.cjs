#!/usr/bin/env node
/**
 * Tests for scripts/check-ci-build-order.cjs
 *
 * Uses node's built-in test runner to keep the zero-runtime-deps story —
 * no vitest, no jest, no extra install. Run with:
 *     node --test scripts/check-ci-build-order.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { check, loadWorkflowBuildOrder, loadWorkspaces } = require('./check-ci-build-order.cjs');

/** Build a minimal workspaces object matching the shape `check()` expects. */
function workspaces(defs) {
  const nameToDir = new Map();
  const nameToDeps = new Map();
  for (const { name, dir, deps = [] } of defs) {
    nameToDir.set(name, dir);
    nameToDeps.set(name, deps);
  }
  return { nameToDir, nameToDeps };
}

test('check: passes when order is correct and all deps are present', () => {
  const ws = workspaces([
    { name: '@x/a', dir: 'a', deps: [] },
    { name: '@x/b', dir: 'b', deps: ['@x/a'] },
  ]);
  const order = ['a', 'b'];
  assert.deepEqual(check(ws, order), []);
});

test('check: fails when a dep is missing from the workflow', () => {
  const ws = workspaces([
    { name: '@x/a', dir: 'a', deps: [] },
    { name: '@x/b', dir: 'b', deps: ['@x/a'] },
  ]);
  const order = ['b']; // 'a' missing
  const failures = check(ws, order);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /@x\/a is a dependency of @x\/b but is NOT built/);
});

test('check: fails when a dep is built AFTER its consumer', () => {
  const ws = workspaces([
    { name: '@x/a', dir: 'a', deps: [] },
    { name: '@x/b', dir: 'b', deps: ['@x/a'] },
  ]);
  const order = ['b', 'a']; // wrong order
  const failures = check(ws, order);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /@x\/a is built AFTER its dependent @x\/b/);
});

test('check: flags stale workflow entries with no matching package', () => {
  const ws = workspaces([{ name: '@x/a', dir: 'a', deps: [] }]);
  const order = ['a', 'ghost-package'];
  const failures = check(ws, order);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /packages\/ghost-package but no such workspace package exists/);
});

test('check: ignores packages not in the workflow (they may be private/unpublished)', () => {
  // Only `b` is in the workflow; `a` exists on disk but isn't a dep of `b` and isn't built.
  const ws = workspaces([
    { name: '@x/a', dir: 'a', deps: [] },
    { name: '@x/b', dir: 'b', deps: [] },
  ]);
  const order = ['b'];
  assert.deepEqual(check(ws, order), []);
});

test('check: ignores non-workspace lookalike deps', () => {
  // '@x/not-a-workspace' is NOT in nameToDir, so the dep is skipped cleanly.
  const ws = workspaces([
    { name: '@x/a', dir: 'a', deps: ['@x/not-a-workspace'] },
  ]);
  const order = ['a'];
  assert.deepEqual(check(ws, order), []);
});

test('check: reports multiple failures in one run', () => {
  const ws = workspaces([
    { name: '@x/a', dir: 'a', deps: [] },
    { name: '@x/b', dir: 'b', deps: ['@x/a'] },
    { name: '@x/c', dir: 'c', deps: ['@x/missing'] },
    { name: '@x/missing', dir: 'missing', deps: [] },
  ]);
  const order = ['b', 'c']; // a missing, missing missing
  const failures = check(ws, order);
  assert.equal(failures.length, 2);
});

test('check: transitive deps across multiple packages', () => {
  const ws = workspaces([
    { name: '@x/a', dir: 'a', deps: [] },
    { name: '@x/b', dir: 'b', deps: ['@x/a'] },
    { name: '@x/c', dir: 'c', deps: ['@x/b'] },
  ]);
  // c before b: caught. b before a: caught.
  // Failures emerge in workflow-position iteration order, so c's failure
  // (b after c) surfaces first, then b's failure (a after b).
  const order = ['c', 'b', 'a'];
  const failures = check(ws, order);
  assert.equal(failures.length, 2);
  assert.match(failures[0], /@x\/b is built AFTER its dependent @x\/c/);
  assert.match(failures[1], /@x\/a is built AFTER its dependent @x\/b/);
});

// Integration smoke: the real repo should pass the guard. Pins the contract
// so a future refactor that breaks loader semantics fails this test.
test('integration: real repository state passes the guard', () => {
  const ws = loadWorkspaces();
  const order = loadWorkflowBuildOrder();
  assert.deepEqual(check(ws, order), []);
});
