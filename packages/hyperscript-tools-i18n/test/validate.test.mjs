// Tests for the canonical parse-check (src/validate.ts).
// Runs against the built dist; pretest rebuilds @lokascript/i18n + this package.
// Uses the REAL hyperscript.org parser. Assertions match on message SUBSTRINGS
// only (never full text) so they survive upstream 0.9.x wording drift.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  loadValidator,
  validateHyperscript,
  formatParseCheckReport,
  warnInvalidOnce,
  __resetParseCheckWarnings,
} from '../dist/validate.js';

test('loadValidator resolves to a function and caches the instance', async () => {
  const a = await loadValidator();
  const b = await loadValidator();
  assert.equal(typeof a, 'function');
  assert.equal(a, b, 'two awaited loads return the same cached function');
});

test('valid hyperscript returns an empty error array', async () => {
  const validate = await loadValidator();
  assert.deepEqual(validate('on click toggle .active on me'), []);
  assert.deepEqual(validate('toggle .active'), []);
});

test('grammar-invalid hyperscript returns collected errors', async () => {
  const validate = await loadValidator();
  const errors = validate('on click qqqq zzzz');
  assert.ok(errors.length >= 1, 'expected at least one error');
  assert.match(errors[0], /qqqq/);
});

test('tokenizer throw is folded, never thrown', async () => {
  const validate = await loadValidator();
  let errors;
  assert.doesNotThrow(() => {
    errors = validate('ถ้า x'); // leaked Thai surface → tokenizer "Unknown token"
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^threw: /);
});

test('js-command throw is folded, never thrown', async () => {
  const validate = await loadValidator();
  let errors;
  assert.doesNotThrow(() => {
    errors = validate('js ] end'); // invalid JS body → new Function throws at parse time
  });
  assert.ok(errors.length >= 1);
});

test('validateHyperscript convenience loads and validates', async () => {
  assert.deepEqual(await validateHyperscript('on click toggle .active on me'), []);
});

test('formatParseCheckReport truncates long code and lists errors', () => {
  const long = 'on click ' + 'toggle .active '.repeat(20);
  const out = formatParseCheckReport({
    stage: 'input',
    code: long,
    errors: ['boom', 'bang'],
    from: 'en',
    to: 'es',
  });
  assert.match(out, /\.\.\.$|\.\.\."/, 'long code should be truncated with ...');
  assert.match(out, /\n {2}- boom/);
  assert.match(out, /\n {2}- bang/);
});

test('warnInvalidOnce dedupes by code within a process', () => {
  __resetParseCheckWarnings();
  const original = console.warn;
  let calls = 0;
  console.warn = () => {
    calls++;
  };
  try {
    const report = { stage: 'input', code: 'DUP', errors: ['x'], from: 'en', to: 'es' };
    assert.equal(warnInvalidOnce(report), true);
    assert.equal(warnInvalidOnce(report), false);
    assert.equal(calls, 1);
    __resetParseCheckWarnings();
    assert.equal(warnInvalidOnce(report), true);
    assert.equal(calls, 2);
  } finally {
    console.warn = original;
  }
});
