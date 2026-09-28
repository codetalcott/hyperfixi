/**
 * Four operand readings the value matrix found lost in a few languages each.
 *
 * - **A unary minus before a possessive**: the operator run read `-` as a whole
 *   operand, so a run could not start with one. `- n` survived through the
 *   tail, but `- #aのtextContent` (ja, ko, tr, qu) lost its minus and uk `-
 *   obj's v` its whole `put`. `-` where an operand may start now prefixes it.
 * - **A particle after `of`**: pl's `w` (its `in`) is a common variable name,
 *   and `v of w of obj` stopped at it. `of` is followed by its owner, never by
 *   a marker.
 * - **`no` before a selector** (zh `没有 .w`, tl `walang .w`): the sense rule
 *   read `no` only before a bare word.
 * - **A called type name**: th `เป็น` before a conversion type name is `as`,
 *   so `6 เป็น String ( n )` was `6 as String` and a stray `(n)`. A type name
 *   followed by `(` is a call.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

/**
 * One program on both engines: an `of` chain rooted at a selector is the
 * possessive chain (`length of textContent of #a` is `#a's textContent's
 * length`), and the join spaces a unary minus and parentheses.
 */
const normalize = (code: string): string => {
  let out = code.replace(/\s*\(\s*/g, '(').replace(/\s*\)/g, ')').replace(/- /g, '-');
  for (let prev = ''; prev !== out; ) {
    prev = out;
    out = out.replace(/\b([A-Za-z][\w-]*) of ([#.][\w-]+(?:'s [A-Za-z][\w-]*)*)/g, "$2's $1");
  }
  return out;
};

const roundTrip = (source: string, language: string): string => {
  const foreign = render(parse(source, 'en')!, language);
  const back = parse(foreign, language);
  return back ? render(back, 'en') : `(no parse: ${foreign})`;
};

describe.each([
  "on click put -#a's textContent into #out",
  "on click put -obj's v into #out",
  "on click set x to -#a's textContent's length then put x into #out",
  'on click set i to 0 then repeat while i < -2 increment i end then put i into #out',
])('a unary minus: %s', source => {
  it.each(['ja', 'ko', 'tr', 'qu', 'uk', 'es', 'ar'])('%s', language => {
    expect(normalize(roundTrip(source, language))).toBe(normalize(source));
  });
});

describe('pl: a variable `w` after `of`', () => {
  it.each([
    'on click put v of w of obj into #out',
    'on click set x to v of w of obj + 2 then put x into #out',
    'on click put v of w of obj is in [1, 2, 6] into #out',
    'on click set i to 1 then increment i by v of w of obj then put i into #out',
  ])('%s', source => {
    expect(roundTrip(source, 'pl')).toBe(source);
  });

  it('`w` is still its marker elsewhere', () => {
    expect(render(parse('gdy click umieść 2 w #out', 'pl')!, 'en')).toBe(
      'on click put 2 into #out'
    );
  });
});

describe.each(['zh', 'tl'])('%s: `no` before a selector', language => {
  it.each([
    'on click put no .w into #out',
    'on click if no .w put "Y" into #out end',
    'on click set x to no <p/> then put x into #out',
    'on click put no s into #out',
  ])('%s', source => {
    expect(roundTrip(source, language)).toBe(source);
  });
});

describe('th: a called type name', () => {
  it.each([
    'on click put 6 is String(n) into #out',
    'on click set x to 6 is Number(s) then put x into #out',
    'on click put n as String into #out',
  ])('%s', source => {
    expect(normalize(roundTrip(source, 'th'))).toBe(normalize(source));
  });
});
