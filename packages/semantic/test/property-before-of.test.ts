/**
 * A localized property word before English `of`.
 *
 * `length of arr` renders with its owner in English (a variable, not a
 * selector) but its property word localized in bn, ms, th and tl (ms `panjang
 * of arr`), and nothing read the word back: ms and tl kept `panjang`, and bn
 * and th lost the whole value, since a non-ASCII word fails the value-extent
 * check. The value join now reads a property word the lexicon names when
 * English `of` follows it, as it reads one after `'s`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const LANGUAGES = ['bn', 'ms', 'th', 'tl'];

const SOURCES = [
  'on click put length of arr into #out',
  'on click set x to length of arr + 2 then put x into #out',
  'on click if length of arr is 2 then put "Y" into #out end',
];

describe.each(SOURCES)('%s', source => {
  const english = render(parse(source, 'en')!, 'en');

  it.each(LANGUAGES)('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });
});

describe('an ordinary word before `of` is left alone', () => {
  it('ms `x of arr` keeps `x`', () => {
    expect(render(parse('apabila click letak x of arr ke #out', 'ms')!, 'en')).toContain(
      'x of arr'
    );
  });
});
