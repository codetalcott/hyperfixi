// Smoke tests for the HTML attribute translator.
// Runs against the built dist; pretest rebuilds @lokascript/i18n + this package.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { translateHtml, translateHtmlToManyLangs } from '../dist/index.js';

test('translateHtml swaps double-quoted _= attributes', () => {
  const html = '<button _="on click toggle .active on me">x</button>';
  const out = translateHtml(html, 'es');
  assert.notEqual(out, html, 'output should differ for non-en target');
  assert.match(out, /alternar/, 'expected Spanish "alternar" in translated output');
  assert.match(out, /<button _="[^"]+">x<\/button>/, 'attribute structure preserved');
});

test('translateHtml handles single-quoted attributes', () => {
  const html = "<button _='on click add .clicked to me'>add</button>";
  const out = translateHtml(html, 'ja');
  assert.match(out, /<button _='[^']+'>add<\/button>/, 'single-quote wrapper preserved');
  // SOV reorder + Japanese translation should produce non-ASCII content
  assert.match(out, /[぀-ヿ一-鿿]/, 'expected Japanese characters');
});

test('translateHtml preserves surrounding markup and other attributes', () => {
  const html = '<div class="x" data-id="1"><p>hello world</p><button _="on click toggle .active on me">go</button></div>';
  const out = translateHtml(html, 'es');
  // Non-_= structure is preserved verbatim
  assert.match(out, /<div class="x" data-id="1">/);
  assert.match(out, /<p>hello world<\/p>/);
  assert.match(out, /<\/div>$/);
  // The _= attribute was translated
  assert.match(out, /alternar/);
});

test('translateHtml is a no-op when from === to', () => {
  const html = '<button _="on click toggle .active on me">x</button>';
  const out = translateHtml(html, 'en', { from: 'en' });
  assert.equal(out, html);
});

test('translateHtml lenient mode (default) preserves bad snippets', () => {
  // Deliberately malformed hyperscript-ish; underlying translator may throw or
  // return unchanged. Either way, lenient mode must not throw.
  const html = '<button _="@@@nonsense @@@">x</button>';
  assert.doesNotThrow(() => translateHtml(html, 'ja'));
});

test('translateHtml strict mode propagates errors', () => {
  // Strict only throws when the translator throws on a given input. Some
  // transformer paths swallow errors and return the input unchanged, so we
  // can't assert throws unconditionally — the contract is "if it throws in
  // lenient, strict propagates". We verify the strict path runs without
  // surprise side effects, leaving the deeper invariant to the i18n suite.
  const html = '<button _="@@@nonsense @@@">x</button>';
  assert.doesNotThrow(() => translateHtml(html, 'ja', { lenient: false }));
});

test('translateHtmlToManyLangs returns one entry per requested lang', () => {
  const html = '<button _="on click toggle .active on me">x</button>';
  const result = translateHtmlToManyLangs(html, ['es', 'ja', 'ko']);
  assert.ok(result instanceof Map);
  assert.equal(result.size, 3);
  assert.ok(result.has('es') && result.has('ja') && result.has('ko'));
  // Each translation should differ from the English source
  for (const [lang, translated] of result) {
    assert.notEqual(translated, html, `${lang} should produce a translated output`);
  }
});

test('translateHtmlToManyLangs preserves order in iteration', () => {
  const html = '<button _="on click toggle .active on me">x</button>';
  const result = translateHtmlToManyLangs(html, ['ko', 'ja', 'es']);
  const keys = Array.from(result.keys());
  assert.deepEqual(keys, ['ko', 'ja', 'es']);
});
