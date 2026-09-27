/**
 * A value with a comparison, `mod`, `and`, `or` or `not` keeps its whole
 * expression, in English and in every translation.
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

// `and`, `or` and `not` join a run too, in English or in the language's own
// word (de `oder`, through the expression lexicon's connectives). Each is
// tested in the languages whose word for it reads back. Where it doesn't: qu
// writes `and` as `chaymanta` (also its `then`) and sw as `na` (also `with`),
// and `not` is hi `नहीं` (also `no`) and qu `mana` (also `false`).
const CONNECTIVES: Array<[string, string[]]> = [
  ['on click put p or q into #out', []],
  ['on click put p and q into #out', ['qu', 'sw']],
  ['on click put not p into #out', ['hi', 'qu']],
  ['on click set x to p and not q', ['hi', 'qu', 'sw']],
];

describe.each(CONNECTIVES)('%s', (source, broken) => {
  it.each(LANGUAGES.filter(language => !broken.includes(language)))('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(source);
  });
});

// `and` before a command verb still ends the command: semantic reads the two
// sides as two commands (both engines run neither).
it('`and` before a command verb starts the next command', () => {
  const source = 'on click set x to true and put 2 into #c';
  expect(render(parse(source, 'en')!, 'en')).toBe('on click set x to true then put 2 into #c');
});
