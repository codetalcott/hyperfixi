/**
 * A value with a comparison or `mod` keeps its whole expression, in English
 * and in every translation.
 *
 * The operator-run capture joined only `+ - * /`, so `set x to n > 2` captured
 * `n` alone and dropped the rest: the English parse rendered `set x to n`, and
 * every translation with it, while `put n > 2 into #out` lost its whole `put`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const LANGUAGES = [
  'en',
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
  'on click put n > 2 into #out',
  'on click put n < 2 into #out',
  'on click put n == 3 into #out',
  'on click put n !== 3 into #out',
  'on click put n mod 2 into #out',
  // Core's alone (upstream rejects `%`), so it renders as written.
  'on click put n % 2 into #out',
  'on click set x to n + 2 > 4',
];

describe.each(SOURCES)('%s', source => {
  it.each(LANGUAGES)('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(source);
  });
});
