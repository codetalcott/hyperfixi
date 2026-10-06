// A translation @lokascript/semantic refuses (it would lose part of the script)
// keeps its source text, and the build says so with what it would drop (M1).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { translateHtml, formatRefusalReport } from '../dist/index.js';
import hyperscriptI18nPlugin from '../dist/eleventy.js';

const LOSSY = 'on click toggle .a .b'; // the parse reads `toggle .a` only
const html = `<button _="${LOSSY}">x</button>`;

test('translateHtml keeps the attribute and warns with what it would drop', () => {
  // The only test that warns: the dedupe key (target, code) is fresh here.
  const warnings = [];
  const original = console.warn;
  console.warn = m => warnings.push(String(m));
  try {
    assert.equal(translateHtml(html, 'es'), html);
    assert.equal(translateHtml(html, 'es'), html); // deduped
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /refused, it would lose \.b/);
});

test('onRefused: a callback receives the report; error throws', () => {
  const reports = [];
  translateHtml(html, 'ja', { onRefused: r => reports.push(r) });
  assert.equal(reports.length, 1);
  assert.deepEqual(reports[0].lost, ['.b']);
  assert.equal(reports[0].to, 'ja');
  assert.match(formatRefusalReport(reports[0]), /en -> ja refused/);
  assert.throws(() => translateHtml(html, 'ja', { onRefused: 'error' }), /would lose \.b/);
});

test('lenient: false still throws the refusal', () => {
  assert.throws(
    () => translateHtml(html, 'ja', { lenient: false, onRefused: () => {} }),
    e => e.name === 'LossyTranslationError'
  );
});

test('the Eleventy filters report a refusal', async () => {
  const filters = {};
  await hyperscriptI18nPlugin(
    { addFilter: (name, fn) => (filters[name] = fn) },
    { parseCheck: 'off', onRefused: 'error' }
  );
  assert.throws(() => filters.translateHs(LOSSY, 'es'), /would lose \.b/);
  assert.throws(() => filters.translateHsAll(LOSSY, ['es']), /would lose \.b/);
  assert.equal(filters.translateHs('on click toggle .a', 'en'), 'on click toggle .a');
});
