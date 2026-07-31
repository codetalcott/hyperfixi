#!/usr/bin/env node
/**
 * Tests for scripts/check-ci-test-list.cjs
 *
 * Uses node's built-in test runner to keep the zero-runtime-deps story —
 * no vitest, no jest, no extra install. Run with:
 *     node --test scripts/check-ci-test-list.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  check,
  loadCiTestSteps,
  loadWorkspaces,
  sliceJob,
} = require('./check-ci-test-list.cjs');

/** Build a minimal workspaces map matching the shape `check()` expects. */
function workspaces(defs) {
  const byDir = new Map();
  for (const { dir, name = `@x/${dir}`, hasTest = true, hasTestCheck = true } of defs) {
    byDir.set(dir, { name, hasTest, hasTestCheck });
  }
  return byDir;
}

/**
 * Synthetic fixtures must not inherit the real INTENTIONALLY_UNGATED map — its
 * contents change as packages are vetted, and every entry would fire class (e)
 * against a fixture workspace that has no such directory.
 */
const NO_EXEMPTIONS = new Map();

/** Build a Map<jobName, steps[]> from a plain {job: [dir, ...]} object. */
function jobs(spec) {
  const byJob = new Map();
  for (const [jobName, dirs] of Object.entries(spec)) {
    byJob.set(
      jobName,
      dirs.map(dir => ({ dir, args: '' }))
    );
  }
  return byJob;
}

/**
 * A miniature ci.yml with the shapes that matter: the two guarded jobs, a
 * third (nightly, non-required) job that also runs `npm test`, a prose comment
 * naming a package, and an `npm run` step that is not a test.
 */
const SAMPLE_CI = [
  'name: CI',
  'jobs:',
  '  lint-typecheck:',
  '    steps:',
  '      - name: Verify',
  '        run: node scripts/check-ci-test-list.cjs',
  '',
  '  unit-tests:',
  '    timeout-minutes: 15',
  '    steps:',
  '      - name: Test core',
  '        run: npm test --prefix packages/core',
  '',
  '  # ============================================',
  '  # Job 4b: Unit Tests (packages)',
  '  # ============================================',
  '  unit-tests-packages:',
  '    steps:',
  '      # NOTE: lint:domains is `npm test --prefix packages/domain-<x> -- --run lint`',
  '      - name: Init db',
  '        run: npm run db:init:force --prefix packages/patterns-reference',
  '      - name: Test patterns-reference',
  '        run: npm test --prefix packages/patterns-reference',
  '      - name: Test realtime',
  '        run: npm test --prefix packages/realtime -- --run',
  '',
  '  coverage:',
  '    steps:',
  '      - name: Coverage semantic',
  '        run: npm test --prefix packages/semantic -- --coverage',
].join('\n');

test('check: passes when every package with test:check is enumerated once', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const byJob = jobs({ 'unit-tests': ['a'], 'unit-tests-packages': ['b'] });
  assert.deepEqual(check(ws, byJob, NO_EXEMPTIONS), []);
});

test('check: flags a package with tests that CI never runs (the #857 shape)', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'developer-tools', name: '@hyperfixi/developer-tools' }]);
  const failures = check(ws, jobs({ 'unit-tests': ['a'], 'unit-tests-packages': [] }), NO_EXEMPTIONS);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /@hyperfixi\/developer-tools \(packages\/developer-tools\)/);
  assert.match(failures[0], /NOT enumerated in either unit-test job/);
  assert.match(failures[0], /run: npm test --prefix packages\/developer-tools/);
});

test('check: flags a step pointing at a package that does not exist', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = check(ws, jobs({ 'unit-tests': ['a', 'ghost-package'], 'unit-tests-packages': [] }), NO_EXEMPTIONS);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /packages\/ghost-package`, but no such workspace package exists/);
});

test('check: flags an enumerated package that has no test script', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b', hasTest: false }]);
  const failures = check(ws, jobs({ 'unit-tests': ['a'], 'unit-tests-packages': ['b'] }), NO_EXEMPTIONS);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /has no "test" script/);
});

test('check: flags a package enumerated in both jobs, naming both', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = check(ws, jobs({ 'unit-tests': ['a'], 'unit-tests-packages': ['a'] }), NO_EXEMPTIONS);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /more than one unit-test job \(unit-tests, unit-tests-packages\)/);
});

test('check: flags a package enumerated twice within one job', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const failures = check(ws, jobs({ 'unit-tests': [], 'unit-tests-packages': ['a', 'a'] }), NO_EXEMPTIONS);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /more than one unit-test job/);
});

test('check: a package without test:check is not required to be enumerated', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'placeholder', hasTestCheck: false }]);
  assert.deepEqual(check(ws, jobs({ 'unit-tests': ['a'], 'unit-tests-packages': [] }), NO_EXEMPTIONS), []);
});

test('check: INTENTIONALLY_UNGATED suppresses the never-run failure', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const ungated = new Map([['b', 'covered by the nightly workflow']]);
  const byJob = jobs({ 'unit-tests': ['a'], 'unit-tests-packages': [] });
  assert.deepEqual(check(ws, byJob, ungated), []);
});

test('check: flags a stale exemption whose package is now enumerated', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const ungated = new Map([['a', 'stale reason']]);
  const failures = check(ws, jobs({ 'unit-tests': ['a'], 'unit-tests-packages': [] }), ungated);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /but ci\.yml now runs its tests/);
});

test('check: flags an exemption for a package that no longer exists', () => {
  const ws = workspaces([{ dir: 'a' }]);
  const ungated = new Map([['ghost-package', 'stale reason']]);
  const failures = check(ws, jobs({ 'unit-tests': ['a'], 'unit-tests-packages': [] }), ungated);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /INTENTIONALLY_UNGATED lists packages\/ghost-package/);
  assert.match(failures[0], /no such workspace package exists/);
});

test('check: flags an exemption for a package that lost its test:check script', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b', hasTestCheck: false }]);
  const ungated = new Map([['b', 'stale reason']]);
  const failures = check(ws, jobs({ 'unit-tests': ['a'], 'unit-tests-packages': [] }), ungated);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /the exemption is doing nothing/);
});

test('check: reports failures from several classes in one run', () => {
  const ws = workspaces([{ dir: 'a' }, { dir: 'b' }]);
  const failures = check(
    ws,
    jobs({ 'unit-tests': ['a', 'ghost-package'], 'unit-tests-packages': [] }),
    NO_EXEMPTIONS
  );
  assert.equal(failures.length, 2); // ghost enumerated + b never run
});

test('loadCiTestSteps: parses both jobs and keeps them separate', () => {
  const byJob = loadCiTestSteps(SAMPLE_CI);
  assert.deepEqual(
    byJob.get('unit-tests').map(s => s.dir),
    ['core']
  );
  assert.deepEqual(
    byJob.get('unit-tests-packages').map(s => s.dir),
    ['patterns-reference', 'realtime']
  );
});

test('loadCiTestSteps: ignores the nightly coverage job entirely', () => {
  // A non-required job must never satisfy the guard — that would let a package
  // look covered while every required check skips it.
  const dirs = [...loadCiTestSteps(SAMPLE_CI).values()].flat().map(s => s.dir);
  assert.ok(!dirs.includes('semantic'), 'coverage-job step must not count');
});

test('loadCiTestSteps: a prose comment naming a package is not a step', () => {
  // ci.yml explains lint:domains with the literal text
  // `npm test --prefix packages/domain-<x>`; a whole-file scan reads that as a
  // package called `domain-`.
  const dirs = [...loadCiTestSteps(SAMPLE_CI).values()].flat().map(s => s.dir);
  assert.ok(!dirs.includes('domain-'), 'comment prose must not be parsed as a step');
});

test('loadCiTestSteps: `npm run <script>` is not a test step', () => {
  const steps = loadCiTestSteps(SAMPLE_CI).get('unit-tests-packages');
  const prCount = steps.filter(s => s.dir === 'patterns-reference').length;
  assert.equal(prCount, 1, 'db:init:force must not be counted as a second step');
});

test('loadCiTestSteps: captures the trailing args of a step', () => {
  const steps = loadCiTestSteps(SAMPLE_CI).get('unit-tests-packages');
  assert.equal(steps.find(s => s.dir === 'realtime').args, '-- --run');
  assert.equal(steps.find(s => s.dir === 'patterns-reference').args, '');
});

test('loadCiTestSteps: a renamed job is a hard error, not a silent pass', () => {
  const renamed = SAMPLE_CI.replace('  unit-tests-packages:', '  unit-tests-pkgs:');
  assert.throws(() => loadCiTestSteps(renamed), /no "unit-tests-packages:" job found/);
});

test('loadCiTestSteps: a job with no test steps is a hard error', () => {
  const emptied = SAMPLE_CI.replace(/^.*npm test --prefix packages\/core.*$/m, '        run: echo hi');
  assert.throws(() => loadCiTestSteps(emptied), /has no .*npm test --prefix.* steps/);
});

test('sliceJob: a job body stops at the next job key', () => {
  const body = sliceJob(SAMPLE_CI, 'unit-tests');
  assert.match(body, /Test core/);
  assert.ok(!body.includes('patterns-reference'), 'must not bleed into the next job');
});

test('sliceJob: banner comments between jobs do not terminate a body', () => {
  // `  # ====` is 2-space-indented but cannot match a job key.
  const body = sliceJob(SAMPLE_CI, 'unit-tests-packages');
  assert.match(body, /Test realtime/);
  assert.ok(!body.includes('--coverage'), 'must stop before the coverage job');
});

test('sliceJob: returns null for an absent job', () => {
  assert.equal(sliceJob(SAMPLE_CI, 'no-such-job'), null);
});

// Integration smoke: the real repo should pass the guard. Pins the contract
// so a future refactor that breaks loader semantics fails this test.
test('integration: real repository state passes the guard', () => {
  assert.deepEqual(check(loadWorkspaces(), loadCiTestSteps()), []);
});

// Integration smoke: the loaders find real data. Guards against a regex that
// silently matches nothing after a future edit to ci.yml.
test('integration: loaders return non-trivial lists', () => {
  const byJob = loadCiTestSteps();
  const total = [...byJob.values()].reduce((n, steps) => n + steps.length, 0);
  assert.ok(total > 20, `expected >20 packages tested in CI, got ${total}`);
  assert.ok(byJob.get('unit-tests').length > 0);
  assert.ok(byJob.get('unit-tests-packages').length > 0);
  assert.ok(loadWorkspaces().size > 20);
});

// The real ci.yml's known parsing hazards, pinned against the actual file.
test('integration: real ci.yml yields no duplicate and no phantom packages', () => {
  const dirs = [...loadCiTestSteps().values()].flat().map(s => s.dir);
  assert.equal(new Set(dirs).size, dirs.length, 'a package is enumerated twice');
  const byDir = loadWorkspaces();
  for (const dir of dirs) {
    assert.ok(byDir.has(dir), `ci.yml names packages/${dir}, which does not exist`);
  }
});
