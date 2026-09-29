/**
 * core's `has` in every language (PR 106). The renderer writes the language's
 * own word (es `tiene`, pl `ma`, tl `may`), which no reader read back: a plain
 * word was a variable (`if #a tiene .x` compared `#a` with nothing), and bn
 * `আছে`, tl `may` and tr `var`, which are also `exists`, read `if #a exists`.
 * The word reads `has` before a class, where only `has` can stand
 * (AMBIGUOUS_SENSES), and ar's split `لديه` is one keyword. Upstream has no
 * `has`, so the value matrix cannot run it: core's
 * condition-phrases-direct-path.test.ts runs it in every language.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

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

describe.each([
  'on click if #a has .x then put "Y" into #out end',
  'on click put #a has .x into #out',
  // `exists` keeps its word where no class follows (bn, tl, tr share it).
  'on click if #a exists then put "Y" into #out end',
])('%s', source => {
  const english = render(parse(source, 'en')!, 'en');
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });
});
