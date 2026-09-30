/**
 * What a `get` reads is any value (PR 130).
 *
 * `get`'s source role took a selector, a reference or an expression, and no
 * literal, so English dropped `get "hello"`, `get 3` and `get true` whole —
 * `then put it into #out` wrote whatever `it` already held — and every
 * translation inherited the loss. `get {}` was cut to `get {`. And the role took
 * no property path, the of form ten translations write for `#a's textContent`
 * (es `textContent de #a`).
 *
 * de and zh have handcrafted get patterns that copied the narrow list; de's is
 * the one its render writes (`hole 2`), so de kept losing every literal after
 * the schema took one. Both read the schema's list now.
 *
 * Found by the value matrix's `get` position (PR 130).
 */
import { describe, it, expect } from 'vitest';
import { buildAST, parse, render } from '../src/index';

const FOREIGN = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];

const english = (code: string, language: string): string => render(parse(code, language)!, 'en');
const roundTrip = (code: string, language: string): string =>
  english(render(parse(code, 'en')!, language), language);

/** The first node of `type` in a built AST. */
function find(node: unknown, type: string): Record<string, unknown> | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const record = node as Record<string, unknown>;
  if (record.type === type) return record;
  for (const value of Object.values(record)) {
    const hit = find(value, type);
    if (hit) return hit;
  }
  return undefined;
}

const LITERALS = [
  'on click get "hello" then put it into #out',
  'on click get 3 then put it into #out',
  'on click get true then put it into #out',
  'on click get "7" as Int then put it into #out',
  'on click get 2 as String then put it into #out',
];

describe('English keeps a get whose value is a literal', () => {
  it.each(LITERALS)('%s', code => {
    expect(english(code, 'en')).toBe(code);
  });

  it('keeps it standing alone', () => {
    expect(english('get 3', 'en')).toBe('get 3');
  });
});

describe('every translation keeps it', () => {
  describe.each(LITERALS)('%s', code => {
    it.each(FOREIGN)('%s', language => {
      expect(roundTrip(code, language)).toBe(code);
    });
  });
});

describe('an object literal is an object', () => {
  const source = 'on click get {a: 1} then put it into #out';

  it.each(['en', ...FOREIGN])('%s builds one', language => {
    const code = language === 'en' ? source : render(parse(source, 'en')!, language);
    const object = find(buildAST(parse(code, language)!).ast, 'objectLiteral');
    expect(object).toBeDefined();
    expect((object!.properties as unknown[]).length).toBe(1);
  });

  // de and zh read `{ } is empty` through their handcrafted patterns.
  it.each(FOREIGN)('%s keeps the operator after it', language => {
    const code = 'on click get {} is empty then put it into #out';
    expect(roundTrip(code, language)).toBe(english(code, 'en'));
  });
});

describe('a possessive, in the of form a translation writes', () => {
  it.each(FOREIGN)('%s', language => {
    const code = "on click get #a's textContent then put it into #out";
    expect(roundTrip(code, language)).toBe(code);
  });
});
