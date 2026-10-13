/**
 * Value spellings upstream's own tests write that every language refused,
 * English too (M2 reliability row 8; the command-shape gate's LOUD
 * `rare-values` family, 7 cases × 24 lanes):
 *
 * - an escaped class name (`.group-\[…\]:block`) and a query of several
 *   selectors (`<#d1, #d2/>`), which the tokenizers split;
 * - a unit after parentheses (`(startWidth)px`), fused like `100px`;
 * - `[@name]` and an attribute after a pronoun (`it @disabled`), read as
 *   the `@name` and the possessive both engines take them for;
 * - a dotted property before `of` (`parentNode.innerHTML of #d1`);
 * - `set {…} on obj`, an object's properties set on a target.
 *
 * Each reads in English and round-trips through every language.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate, tokenize, getSupportedLanguages } from '../src/index';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

/** Source, then the English every lane reads it back as (upstream's spelling). */
const SHAPES: ReadonlyArray<readonly [string, string]> = [
  [
    'on click set parentNode.innerHTML of #d1 to "foo"',
    `on click set #d1's parentNode.innerHTML to "foo"`,
  ],
  ['on click put the parentNode.id of #d1 into #o', `on click put #d1's parentNode.id into #o`],
  ['on click set {bar: 2, baz: 3} on obj', 'on click set {bar: 2, baz: 3} on obj'],
  ['on click log 1 then set {a: 1} on me', 'on click log 1 then set {a: 1} on me'],
  [
    'on click show <#d1, #d2/> with display: inline-block',
    'on click show <#d1, #d2/> with display:inline-block',
  ],
  [
    'on click toggle .group-\\[:nth-of-type\\(3\\)_\\&\\]:block',
    'on click toggle .group-\\[:nth-of-type\\(3\\)_\\&\\]:block',
  ],
  [
    'on click transition *width from (startWidth)px to (endWidth)px',
    'on click transition *width from (startWidth)px to (endWidth)px',
  ],
  ['on click put (x + 1)px into me', 'on click put (x + 1)px into me'],
  [
    'on click get the <button/> in me then set it @disabled to true',
    'on click get <button/> in me then set its @disabled to true',
  ],
  ['on click set my [@data-foo] to "blue"', 'on click set my @data-foo to "blue"'],
];

describe.each(SHAPES)('%s', (source, english) => {
  it('English reads it', () => {
    expect(translate(source, 'en', 'en')).toBe(english);
  });

  it.each(FOREIGN)('%s', language => {
    expect(translate(translate(source, 'en', language), language, 'en')).toBe(english);
  });
});

describe('the tokens', () => {
  const values = (code: string, language = 'en'): string[] =>
    tokenize(code, language).tokens.map(t => t.value);

  it('an escaped class name is one selector, as upstream reads it', () => {
    expect(values('toggle .a-\\[b\\]:c')).toEqual(['toggle', '.a-\\[b\\]:c']);
    // Without an escape the name still stops at a pseudo segment's colon.
    expect(values('toggle .a:hover')).toEqual(['toggle', '.a:hover']);
  });

  it('a query of selectors joined by commas is one selector', () => {
    expect(values('show <#d1, #d2/>')).toEqual(['show', '<#d1, #d2/>']);
    expect(values('show <li.a,li.b/>')).toEqual(['show', '<li.a,li.b/>']);
  });

  it('a unit fuses only after an operand in parentheses, never a call', () => {
    expect(values('put (w)px into me')).toEqual(['put', '(w)px', 'into', 'me']);
    expect(values('put f(w)px into me')).not.toContain('(w)px');
    // A language's own words never fuse: the value is written as written.
    expect(values('(mi anchura)px', 'es')).not.toContain('(mi anchura)px');
  });

  it('`[@name]` is `@name`', () => {
    expect(values('set my [@data-foo] to 1')).toEqual(['set', 'my', '@data-foo', 'to', '1']);
  });

  it("an English pronoun before an attribute is its owner; another language's word is not", () => {
    expect(values('set it @disabled to true')).toEqual([
      'set',
      'its',
      '@disabled',
      'to',
      'true',
    ]);
    expect(values('set me @a to 1')).toEqual(['set', 'my', '@a', 'to', '1']);
    expect(values('set it [@a] to 1')).toEqual(['set', 'its', '@a', 'to', '1']);
    expect(values('put it into me')).toEqual(['put', 'it', 'into', 'me']);
    expect(values('establecer it @a a 1', 'es')).toContain('it');
  });
});

it('a call before a unit stays refused, not truncated', () => {
  expect(() => translate('on click put f(x)px into me', 'en', 'es')).toThrow();
});

it('set {…} on obj reads the object as what is written and the target as its scope', () => {
  const node = parse('set {bar: 2} on obj', 'en') as {
    roles: Map<string, { type: string; raw?: string }>;
  };
  expect(node.roles.get('destination')).toMatchObject({ type: 'expression', raw: '{bar: 2}' });
  expect(node.roles.get('scope')).toMatchObject({ raw: 'obj' });
  expect(node.roles.has('patient')).toBe(false);
});

it("get has no destination: it `in me` after a query is the query's scope", () => {
  const source = 'on click get #p1 in me then put its id into @result';
  expect(translate(translate(source, 'en', 'it'), 'it', 'en')).toBe(source);
});
