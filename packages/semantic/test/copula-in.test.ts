/**
 * The `in` of `is in` / `is not in`.
 *
 * The operator stays English in every rendering, and in de and it `in` is also
 * the `into` marker: `put 2 is in [1, 2, 6] into #out` renders de `setzen 2
 * ist in [1, 2, 6] in #out`. The value join read that `in` as `destination`
 * (`if 2 is destination arr`), and a value's extent stopped at it as the
 * marker the pattern owes, so the de `put` lost everything and it `put obj's v
 * è in [1, 2, 6] in #out` kept `obj's v into`. Directly after the copula it is
 * the operator: no marker follows `is`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const LANGUAGES = [
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

const IS_IN = [
  'on click put 2 is in [1, 2, 6] into #out',
  'on click set x to n is in [1, 2, 6] then put x into #out',
  'on click if 2 is in arr put "Y" into #out else put "N" into #out end',
  "on click put obj's v is in [1, 2, 6] into #out",
  'on click put length of arr is in [1, 2, 6] into #out',
  'on click set x to obj.w.v is in [1, 2, 6] then put x into #out',
];

// qu's `not` is `mana`, also its `false` (filed): `2 kanqa mana in arr` reads
// back `2 is false in arr`.
const IS_NOT_IN = [
  'on click put 2 is not in arr into #out',
  'on click if n is not in arr put "Y" into #out end',
];

const roundTrip = (source: string, language: string): string => {
  const foreign = render(parse(source, 'en')!, language);
  const back = parse(foreign, language);
  return back ? render(back, 'en') : `(no parse: ${foreign})`;
};

describe.each(IS_IN)('%s', source => {
  it.each(LANGUAGES)('%s', language => {
    expect(roundTrip(source, language)).toBe(source);
  });
});

describe.each(IS_NOT_IN)('%s', source => {
  it.each(LANGUAGES.filter(l => l !== 'qu'))('%s', language => {
    expect(roundTrip(source, language)).toBe(source);
  });
});

describe('`in` is still the de and it `into` marker', () => {
  it.each([
    ['de', 'wenn klick setzen 2 in #out', 'on click put 2 into #out'],
    ['de', 'wenn klick setzen x in #out', 'on click put x into #out'],
    ['it', 'su click mettere 2 in #out', 'on click put 2 into #out'],
    ['de', 'wenn klick setzen 2 ist in arr in #out', 'on click put 2 is in arr into #out'],
  ])('%s %s', (language, code, english) => {
    expect(render(parse(code, language)!, 'en')).toBe(english);
  });
});
