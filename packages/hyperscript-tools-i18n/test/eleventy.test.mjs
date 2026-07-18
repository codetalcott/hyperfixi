// Smoke tests for the Eleventy plugin: filter registration and behavior.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import hyperscriptI18nPlugin from '../dist/eleventy.js';
import { __resetParseCheckWarnings } from '../dist/validate.js';

function fakeConfig() {
  const filters = new Map();
  return {
    addFilter(name, fn) {
      filters.set(name, fn);
    },
    _filters: filters,
  };
}

test('plugin registers three filters under default names', () => {
  const cfg = fakeConfig();
  hyperscriptI18nPlugin(cfg);
  assert.ok(cfg._filters.has('translateHs'));
  assert.ok(cfg._filters.has('translateHsAll'));
  assert.ok(cfg._filters.has('translateHsHtml'));
});

test('translateHs filter translates a snippet', () => {
  const cfg = fakeConfig();
  hyperscriptI18nPlugin(cfg);
  const fn = cfg._filters.get('translateHs');
  const out = fn('toggle .active', 'es');
  assert.notEqual(out, 'toggle .active');
  assert.match(out, /alternar/);
});

test('translateHs filter is no-op when from === to', () => {
  const cfg = fakeConfig();
  hyperscriptI18nPlugin(cfg);
  const fn = cfg._filters.get('translateHs');
  const out = fn('toggle .active', 'en');
  assert.equal(out, 'toggle .active');
});

test('translateHs filter passes through non-string input unchanged', () => {
  const cfg = fakeConfig();
  hyperscriptI18nPlugin(cfg);
  const fn = cfg._filters.get('translateHs');
  assert.equal(fn(null, 'es'), null);
  assert.equal(fn(undefined, 'es'), undefined);
  assert.equal(fn(42, 'es'), 42);
});

test('translateHsAll filter returns one entry per lang', () => {
  const cfg = fakeConfig();
  hyperscriptI18nPlugin(cfg);
  const fn = cfg._filters.get('translateHsAll');
  const out = fn('toggle .active', ['es', 'ja', 'ko']);
  assert.equal(typeof out, 'object');
  assert.deepEqual(Object.keys(out).sort(), ['es', 'ja', 'ko']);
});

test('translateHsAll filter passes the source through for source==lang', () => {
  const cfg = fakeConfig();
  hyperscriptI18nPlugin(cfg);
  const fn = cfg._filters.get('translateHsAll');
  const out = fn('toggle .active', ['en', 'es']);
  assert.equal(out.en, 'toggle .active');
  assert.notEqual(out.es, 'toggle .active');
});

test('translateHsHtml filter rewrites _= attributes', () => {
  const cfg = fakeConfig();
  hyperscriptI18nPlugin(cfg);
  const fn = cfg._filters.get('translateHsHtml');
  const out = fn('<button _="on click toggle .active on me">x</button>', 'es');
  assert.match(out, /<button _="[^"]+">x<\/button>/);
  assert.match(out, /alternar/);
});

test('plugin honors filterNames overrides', () => {
  const cfg = fakeConfig();
  hyperscriptI18nPlugin(cfg, {
    filterNames: { snippet: 'toLang', snippetMany: 'toLangs', html: 'toLangHtml' },
  });
  assert.ok(cfg._filters.has('toLang'));
  assert.ok(cfg._filters.has('toLangs'));
  assert.ok(cfg._filters.has('toLangHtml'));
  assert.ok(!cfg._filters.has('translateHs'));
});

test('plugin honors defaultFrom override', () => {
  const cfg = fakeConfig();
  hyperscriptI18nPlugin(cfg, { defaultFrom: 'es' });
  const fn = cfg._filters.get('translateHs');
  // With defaultFrom='es', translating to 'es' is a no-op
  const out = fn('alternar .active', 'es');
  assert.equal(out, 'alternar .active');
});

// --- parse-check integration (await the plugin so the validator is loaded) ---

const INVALID = 'on click qqqq zzzz';

test('parseCheck warn: invalid English input warns but still returns a result', async () => {
  __resetParseCheckWarnings();
  const cfg = fakeConfig();
  await hyperscriptI18nPlugin(cfg); // default parseCheck: 'warn'
  const fn = cfg._filters.get('translateHs');
  const original = console.warn;
  let warned = 0;
  console.warn = () => {
    warned++;
  };
  let out;
  try {
    out = fn(INVALID, 'es');
  } finally {
    console.warn = original;
  }
  assert.equal(warned, 1);
  assert.notEqual(out, undefined);
});

test('parseCheck error: filter throws on invalid, not on valid', async () => {
  const cfg = fakeConfig();
  await hyperscriptI18nPlugin(cfg, { parseCheck: 'error' });
  const fn = cfg._filters.get('translateHs');
  assert.throws(() => fn(INVALID, 'es'), /invalid hyperscript/);
  assert.doesNotThrow(() => fn('toggle .active', 'es'));
});

test('parseCheck off: no warning on invalid input', async () => {
  const cfg = fakeConfig();
  await hyperscriptI18nPlugin(cfg, { parseCheck: 'off' });
  const fn = cfg._filters.get('translateHs');
  const original = console.warn;
  let warned = 0;
  console.warn = () => {
    warned++;
  };
  try {
    fn(INVALID, 'es');
  } finally {
    console.warn = original;
  }
  assert.equal(warned, 0);
});

test('translateHsAll with parseCheck error throws on invalid English input', async () => {
  const cfg = fakeConfig();
  await hyperscriptI18nPlugin(cfg, { parseCheck: 'error' });
  const fn = cfg._filters.get('translateHsAll');
  assert.throws(() => fn(INVALID, ['es', 'ja']), /invalid hyperscript/);
});
