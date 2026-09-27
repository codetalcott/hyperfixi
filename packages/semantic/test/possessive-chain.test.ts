/**
 * A chained possessive in the `of` form.
 *
 * Sixteen languages render a possessive property-first (es `textContent de
 * #a`), and the renderer moved only a chain's first link: `#a's textContent's
 * length` came out `textContent de #a's length`, which reads as the
 * textContent of `#a's length`. The chain now nests, each link the next one's
 * owner (`length de textContent de #a`), as upstream reads `length of
 * textContent of #a`; and the value join reads the whole chain back, where it
 * read only a `<property> <of-marker> <selector>` pair.
 *
 * A role capture read one pair too: tr and qu render the chain the same way
 * (`length nin textContent nin #a`), and their `put` kept `#a's textContent`;
 * an operator run's operand did the same, so `while i < length de textContent
 * de #a` compared with the text. The of-possessive matcher now reads the whole
 * chain, unless its first marker is one the pattern wants next.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

/**
 * Spellings that are one program on both engines: an `of` chain rooted at a
 * selector is the possessive chain (`length of textContent of #a` is `#a's
 * textContent's length`) unless a conversion follows it, a parenthesized
 * possessive is the bare one, and the English join spaces parentheses.
 */
const normalize = (code: string): string => {
  let out = code.replace(/\(\s*/g, '(').replace(/\s*\)/g, ')');
  for (let prev = ''; prev !== out;) {
    prev = out;
    out = out
      .replace(/\b([A-Za-z][\w-]*) of ([#.][\w-]+(?:'s [A-Za-z][\w-]*)*)(?!\s+as\b)/g, "$2's $1")
      .replace(/\(([#.][\w-]+(?:'s [A-Za-z][\w-]*)+)\)/g, '$1');
  }
  return out;
};

const PROPERTY_FIRST = [
  'ar',
  'de',
  'es',
  'fr',
  'he',
  'id',
  'it',
  'ms',
  'pl',
  'pt',
  'ru',
  'sw',
  'th',
  'uk',
];

const SOURCES = [
  "on click put #a's textContent's length into #out",
  "on click set x to #a's textContent's length + 2 then put x into #out",
  "on click put #a's textContent's length as Int into #out",
];

describe.each(SOURCES)('%s', source => {
  it.each(PROPERTY_FIRST)('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(normalize(render(parse(foreign, language)!, 'en')), foreign).toBe(normalize(source));
  });
});

describe('the renderer nests the chain', () => {
  it('es', () => {
    expect(
      render(parse("on click put #a's textContent's length into #out", 'en')!, 'es')
    ).toContain('length de textContent de #a');
  });
});

describe('a mixed run is not a chain', () => {
  // tr's genitive `in` is also English `in`: `2 is in textContent of .w`
  // renders `2 dir in textContent of .w`, which must keep its `is in`.
  it('tr `2 dir in textContent of .w`', () => {
    const tr = render(parse('on click put 2 is in textContent of .w into #out', 'en')!, 'tr');
    expect(render(parse(tr, 'tr')!, 'en')).toContain('2 is in textContent of .w');
  });
});

describe('a role capture reads the whole chain', () => {
  it.each([
    ['tr', "on click put #a's textContent's length into #out"],
    ['tr', "on click put 2 + #a's textContent's length into #out"],
    ['tr', "on click put #a's textContent's length < 4 into #out"],
    ['qu', "on click put #a's textContent's length into #out"],
    ['qu', "on click put 2 + #a's textContent's length into #out"],
    [
      'es',
      "on click set i to 0 then repeat while i < #a's textContent's length increment i end then put i into #out",
    ],
    [
      'de',
      "on click set i to 0 then repeat while i < #a's textContent's length increment i end then put i into #out",
    ],
  ])('%s %s', (language, source) => {
    const foreign = render(parse(source, 'en')!, language);
    expect(normalize(render(parse(foreign, language)!, 'en')), foreign).toBe(
      normalize(render(parse(source, 'en')!, 'en'))
    );
  });

  // it says an increment's `by` with `di`, its `of` too: `incrementare i di
  // textContent di #a` is `increment i by #a's textContent`, not a chain.
  it.each([
    "on click set i to 1 then increment i by #a's textContent then put i into #out",
    'on click set i to 1 then increment i by textContent of #a + 2 then put i into #out',
  ])('it %s', source => {
    const foreign = render(parse(source, 'en')!, 'it');
    expect(normalize(render(parse(foreign, 'it')!, 'en')), foreign).toBe(normalize(source));
  });
});
