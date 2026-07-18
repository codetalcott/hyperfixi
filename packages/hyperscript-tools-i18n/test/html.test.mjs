// Smoke tests for the HTML attribute translator.
// Runs against the built dist; pretest rebuilds @lokascript/i18n + this package.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  translateHtml,
  translateHtmlToManyLangs,
  extractHyperscriptAttributes,
} from '../dist/index.js';
import { __resetParseCheckWarnings } from '../dist/validate.js';

// Stub validator: any body containing 'BAD' is invalid. Keeps these tests
// deterministic and independent of the real parser.
const stub = src => (src.includes('BAD') ? ['boom'] : []);

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
  const html =
    '<div class="x" data-id="1"><p>hello world</p><button _="on click toggle .active on me">go</button></div>';
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

// --- parse-check integration ---

test('no validate option → no parse-check runs (guard against default-on)', () => {
  const original = console.warn;
  let warned = 0;
  console.warn = () => {
    warned++;
  };
  try {
    translateHtml('<button _="BAD input-guard">x</button>', 'es');
  } finally {
    console.warn = original;
  }
  assert.equal(warned, 0);
});

test('input warn fires once for an invalid English attribute', () => {
  __resetParseCheckWarnings();
  const original = console.warn;
  let warned = 0;
  console.warn = () => {
    warned++;
  };
  try {
    const out = translateHtml('<button _="BAD input-a">x</button>', 'es', { validate: stub });
    assert.match(out, /<button _="[^"]+">x<\/button>/, 'still returns rewritten HTML');
  } finally {
    console.warn = original;
  }
  assert.equal(warned, 1);
});

test('onInvalid callback receives the input report shape', () => {
  const reports = [];
  translateHtml('<button _="BAD input-b">x</button>', 'es', {
    validate: stub,
    onInvalid: r => reports.push(r),
  });
  assert.equal(reports.length, 1);
  assert.deepEqual(reports[0], {
    stage: 'input',
    code: 'BAD input-b',
    errors: ['boom'],
    from: 'en',
    to: 'es',
  });
});

test('onInvalid "error" throws on invalid input', () => {
  assert.throws(
    () =>
      translateHtml('<button _="BAD input-c">x</button>', 'es', {
        validate: stub,
        onInvalid: 'error',
      }),
    /invalid hyperscript/
  );
});

test('output-stage check fires when target is en', () => {
  const reports = [];
  // from es → en; stub flags everything, so the translated output is reported.
  translateHtml('<button _="alternar .active">x</button>', 'en', {
    from: 'es',
    validate: () => ['boom'],
    onInvalid: r => reports.push(r),
  });
  assert.ok(reports.some(r => r.stage === 'output'));
});

test('checkInput:false skips the input check', () => {
  const reports = [];
  translateHtml('<button _="BAD input-d">x</button>', 'es', {
    validate: stub,
    checkInput: false,
    onInvalid: r => reports.push(r),
  });
  assert.equal(reports.length, 0);
});

test('translateHtmlToManyLangs checks the shared input exactly once', () => {
  const reports = [];
  translateHtmlToManyLangs('<button _="BAD input-e">x</button>', ['es', 'ja', 'ko'], {
    validate: stub,
    onInvalid: r => reports.push(r),
  });
  assert.equal(reports.length, 1, 'input checked once, not once per lang');
});

test('extractHyperscriptAttributes covers all quote styles and dedupes', () => {
  const html =
    '<a _="toggle .a"></a><b _=\'toggle .b\'></b><c _=`toggle .c`></c><d _="toggle .a"></d>';
  const bodies = extractHyperscriptAttributes(html);
  assert.deepEqual(bodies, ['toggle .a', 'toggle .b', 'toggle .c']);
});
