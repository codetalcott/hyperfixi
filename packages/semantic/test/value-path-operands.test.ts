/**
 * A value whose operand is a property path keeps its whole expression, in
 * English and in every translation.
 *
 * The operator run took one token, a possessive pair (`my value`) or a group
 * as an operand, so a value that started with `#d1's textContent`,
 * `textContent of #d1` or `#d1.textContent` was never a run: the path was
 * captured alone and the rest was left over. `put` then failed to match and
 * was dropped whole (`put #d1's textContent + "x" into #out` parsed as a bare
 * `on click`), and `set` kept the path alone.
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

/**
 * Two spellings that read the same on both engines: `#x's p` is `p of #x`,
 * which the property-first languages render and read back, and `the` before a
 * value is an article.
 */
const normalize = (code: string): string =>
  code.replace(/(#\w+)'s (\w+)/g, '$2 of $1').replace(/\bthe /g, '');

// Each source, with the languages whose `not` is also another word (hi
// `नहीं`; see value-operators.test.ts).
const SOURCES: Array<[string, string[]]> = [
  [`on click put #d1's textContent + "x" into #out`, []],
  [`on click put "x" + #d1's textContent into #out`, []],
  [`on click put #d1's textContent is "d" into #out`, []],
  [`on click put textContent of #d1 + "x" into #out`, []],
  [`on click put "x" + textContent of #d1 into #out`, []],
  [`on click put the textContent of #d1 + "x" into #out`, []],
  [`on click put "x" + the textContent of #d1 into #out`, []],
  [`on click put #d1.textContent + "x" into #out`, []],
  [`on click put n + #d1's textContent into #out`, []],
  [`on click set x to #d1's textContent + "x"`, []],
  [`on click put #d1's textContent is "d" and n is 3 into #out`, []],
  [`on click put not #d1's textContent into #out`, ['hi']],
];

describe.each(SOURCES)('%s', (source, broken) => {
  it('keeps the whole value in English', () => {
    expect(normalize(render(parse(source, 'en')!, 'en'))).toBe(normalize(source));
  });

  it.each(LANGUAGES.filter(language => !broken.includes(language)))('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(normalize(render(parse(foreign, language)!, 'en')), foreign).toBe(normalize(source));
  });
});
