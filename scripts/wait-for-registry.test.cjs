'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { waitForRegistry, served, parseArgs } = require('./wait-for-registry.cjs');

/** A fake registry: `available(name, poll)` says whether `name` lists the version at that poll. */
function fakeRegistry(available) {
  let poll = 0;
  const calls = [];
  return {
    calls,
    nextPoll: () => poll++,
    fetchImpl: async (url, init) => {
      calls.push({ url, accept: init.headers.accept });
      const name = decodeURIComponent(url.split('/').pop());
      if (!available(name, poll)) return { ok: true, json: async () => ({ versions: {} }) };
      return { ok: true, json: async () => ({ versions: { '4.0.0': {} } }) };
    },
  };
}

function clock() {
  let t = 0;
  return { now: () => t, sleep: async ms => (t += ms) };
}

test('returns at once when everything is served', async () => {
  const reg = fakeRegistry(() => true);
  const c = clock();
  const r = await waitForRegistry({
    names: ['@hyperfixi/core', '@lokascript/semantic'],
    version: '4.0.0',
    fetchImpl: reg.fetchImpl,
    ...c,
    log: () => {},
  });
  assert.deepEqual(r, { ok: true, pending: [], polls: 1 });
});

test('waits through a lagging package (the 4.0.0 semantic shape), then succeeds', async () => {
  const c = clock();
  // semantic appears only once 13 minutes have passed
  const reg = fakeRegistry(name => name !== '@lokascript/semantic' || c.now() >= 13 * 60 * 1000);
  const r = await waitForRegistry({
    names: ['@hyperfixi/core', '@lokascript/semantic'],
    version: '4.0.0',
    intervalMs: 30 * 1000,
    fetchImpl: reg.fetchImpl,
    ...c,
    log: () => {},
  });
  assert.equal(r.ok, true);
  assert.equal(r.polls, 27); // 26 × 30 s = 13 min, served on the 27th poll
  // only the pending package is re-polled
  assert.equal(reg.calls.filter(x => x.url.endsWith('core')).length, 1);
});

test('times out naming what is still missing', async () => {
  const c = clock();
  const reg = fakeRegistry(name => name !== '@lokascript/semantic');
  const r = await waitForRegistry({
    names: ['@hyperfixi/core', '@lokascript/semantic'],
    version: '4.0.0',
    timeoutMs: 5 * 60 * 1000,
    intervalMs: 60 * 1000,
    fetchImpl: reg.fetchImpl,
    ...c,
    log: () => {},
  });
  assert.equal(r.ok, false);
  assert.deepEqual(r.pending, ['@lokascript/semantic']);
});

test('asks for the install document, with the scope slash encoded', async () => {
  const reg = fakeRegistry(() => true);
  await served('@hyperfixi/core', '4.0.0', reg.fetchImpl);
  assert.equal(reg.calls[0].url, 'https://registry.npmjs.org/@hyperfixi%2fcore');
  assert.equal(reg.calls[0].accept, 'application/vnd.npm.install-v1+json');
});

test('a 404 or a network error counts as not served', async () => {
  assert.equal(await served('x', '1.0.0', async () => ({ ok: false })), false);
  assert.equal(
    await served('x', '1.0.0', async () => {
      throw new Error('ECONNRESET');
    }),
    false
  );
});

test('parseArgs reads the version, names and flags', () => {
  assert.deepEqual(parseArgs(['4.0.0', 'a', '@s/b', '--timeout-min', '10', '--interval-s', '5']), {
    version: '4.0.0',
    names: ['a', '@s/b'],
    timeoutMin: 10,
    intervalS: 5,
  });
});
