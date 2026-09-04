#!/usr/bin/env node
/**
 * Tests for scripts/check-domains-peer-major.cjs
 *     node --test scripts/check-domains-peer-major.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { check, satisfies, loadInput } = require('./check-domains-peer-major.cjs');

const consumers = [
  { name: '@hyperfixi/mcp-server', field: 'dependencies', range: '^3.0.0' },
  { name: '@lokascript/framework', field: 'devDependencies', range: '^3.0.0' },
];

const peered = (version, peer) => ({
  version,
  peerDependencies: {
    '@lokascript/framework': peer,
    '@lokascript/semantic': peer,
    '@lokascript/intent': peer,
  },
});

test('satisfies: caret, tilde, >=, exact, star', () => {
  assert.equal(satisfies('3.1.0', '^3.0.0'), true);
  assert.equal(satisfies('3.1.0', '^3.1.0'), true);
  assert.equal(satisfies('3.0.1', '^3.1.0'), false);
  assert.equal(satisfies('4.0.0', '^3.1.0'), false);
  assert.equal(satisfies('0.9.5', '^0.9.0'), true);
  assert.equal(satisfies('0.10.0', '^0.9.0'), false);
  assert.equal(satisfies('3.1.4', '~3.1.0'), true);
  assert.equal(satisfies('3.2.0', '~3.1.0'), false);
  assert.equal(satisfies('9.0.0', '>=3.1.0'), true);
  assert.equal(satisfies('3.1.0', '3.1.0'), true);
  assert.equal(satisfies('3.1.1', '3.1.0'), false);
  assert.equal(satisfies('3.1.0', '*'), true);
  assert.equal(satisfies('3.1.0', '3.x || 4.x'), null, 'unrecognized shapes return null');
});

test("passes: repo 3.1.0, domains 3.0.0 peering on ^3.1.0 (today's shape)", () => {
  const r = check({ repoVersion: '3.1.0', locked: peered('3.0.0', '^3.1.0'), consumers });
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
  assert.match(r.summary, /satisfied by 3\.1\.0/);
});

test('fails: the 2.11.1 shape — contract packages as hard dependencies', () => {
  const locked = {
    version: '2.11.1',
    dependencies: {
      '@lokascript/framework': '^2.10.0',
      '@lokascript/intent': '^2.10.0',
      '@lokascript/semantic': '^2.10.0',
    },
  };
  const r = check({
    repoVersion: '3.1.0',
    locked,
    consumers: consumers.map(c => ({ ...c, range: '^2.11.1' })),
  });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 3, 'one error per bundled contract package');
  assert.match(r.errors[0], /hard dependency, not a peer/);
});

test('fails: a framework major published against a domains still peering on the old line', () => {
  const r = check({ repoVersion: '4.0.0', locked: peered('3.0.0', '^3.1.0'), consumers });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 3);
  assert.match(r.errors[0], /publishes 4\.0\.0/);
  assert.match(r.errors[0], /Release lokascript-domains against 4\.x first/);
});

test('fails: domains ran AHEAD of the repo (peer floor above the published version)', () => {
  const r = check({ repoVersion: '3.1.0', locked: peered('3.2.0', '^3.2.0'), consumers });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 3);
});

test('fails: manifest range not satisfied by the locked version (stale lockfile)', () => {
  const r = check({
    repoVersion: '3.1.0',
    locked: peered('2.11.1', '^2.10.0'),
    consumers: [{ name: '@hyperfixi/mcp-server', field: 'dependencies', range: '^3.0.0' }],
  });
  assert.equal(r.ok, false);
  assert.ok(
    r.errors.some(e => /lockfile and manifest disagree/.test(e)),
    r.errors.join('\n')
  );
});

test('fails: no lockfile entry while a consumer exists', () => {
  const r = check({ repoVersion: '3.1.0', locked: null, consumers });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /no entry/);
});

test('fails: domains declares no contract peer at all', () => {
  const r = check({
    repoVersion: '3.1.0',
    locked: { version: '3.0.0', peerDependencies: { yaml: '^2' } },
    consumers,
  });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /no @lokascript\/@hyperfixi peer/);
});

test('passes vacuously when nothing here consumes domains', () => {
  const r = check({ repoVersion: '3.1.0', locked: null, consumers: [] });
  assert.equal(r.ok, true);
});

test('loadInput: reads the real repo and finds the three consumers', () => {
  const input = loadInput();
  assert.match(input.repoVersion, /^\d+\.\d+\.\d+/);
  const names = input.consumers.map(c => c.name).sort();
  assert.deepEqual(names, [
    '@hyperfixi/mcp-server',
    '@hyperfixi/server-bridge',
    '@lokascript/framework',
  ]);
  assert.ok(input.locked, 'lockfile has a domains entry');
});
