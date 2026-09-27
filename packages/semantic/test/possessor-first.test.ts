/**
 * `my id`, as the renderer writes it.
 *
 * Two readings lost it:
 *
 * - bn and th render `id` in their own word (bn `আইডি`, th `ไอดี`, from the
 *   lexicon's `attributes`), and the property table the value join reads back
 *   through (PROPERTY_NAME_LEXICON, generated from the i18n dictionaries) did
 *   not carry `id`: `put my id` read back `put my আইডি`.
 * - pl, ru and uk `set` runs its destination straight into its value
 *   (`ustaw do x mój id`, set x to my id), and those profiles also read a
 *   possessor AFTER the property (`textContent mój`). The post-nominal matcher
 *   took `x mój` as `my x` and left `id` the value. The renderer writes the
 *   possessor first in every language, so a possessor that owns the word
 *   after it is that word's.
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

const SOURCES = [
  'on click put my id into #out',
  'on click set x to my id then put x into #out',
  'on click set x to my id + "q" then put x into #out',
  'on click put "q" + my id into #out',
  'on click set x to my value then put x into #out',
  'on click set my x to 5',
];

const roundTrip = (source: string, language: string): string => {
  const foreign = render(parse(source, 'en')!, language);
  const back = parse(foreign, language);
  return back ? render(back, 'en') : `(no parse: ${foreign})`;
};

describe.each(SOURCES)('%s', source => {
  it.each(LANGUAGES)('%s', language => {
    expect(roundTrip(source, language)).toBe(source);
  });
});

describe('a possessor after the property still reads, where nothing follows it', () => {
  it.each([
    ['ar', 'اضبط textContent لي إلى "x"', 'set my textContent to "x"'],
    ['pl', 'ustaw do textContent mój "x"', 'set my textContent to "x"'],
    ['pl', 'ustaw do textContent mój 5', 'set my textContent to 5'],
    ['ru', 'установить в textContent мой "x"', 'set my textContent to "x"'],
  ])('%s %s', (language, code, english) => {
    expect(render(parse(code, language)!, 'en')).toBe(english);
  });
});

describe('bn and th read their own word for `id`', () => {
  it.each([
    ['bn', 'ক্লিক তে আমার আইডি কে #out এ রাখুন'],
    ['th', 'เมื่อ click ใส่ ของฉัน ไอดี ใน #out'],
  ])('%s', (language, code) => {
    expect(render(parse(code, language)!, 'en')).toBe('on click put my id into #out');
  });
});
