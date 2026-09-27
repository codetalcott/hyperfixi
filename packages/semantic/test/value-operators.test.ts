/**
 * A value with a comparison, `mod`, `and`, `or`, `not` or one of core's
 * comparison phrases keeps its whole expression, in English and in every
 * translation.
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
// tested in the languages whose word for it reads back. Where it doesn't:
// qu writes `and` as `chaymanta` (also its `then`), and `not` is hi `नहीं`
// (also `no`) and qu `mana` (also `false`). (sw's `na` is also `with`: see
// and-word.test.ts.)
const CONNECTIVES: Array<[string, string[]]> = [
  ['on click put p or q into #out', []],
  ['on click put p and q into #out', ['qu']],
  ['on click put not p into #out', ['hi', 'qu']],
  ['on click set x to p and not q', ['hi', 'qu']],
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

// Core's comparison phrases join a run too, read word by word as the expression
// join reads them (es `n es no 3`, ar `n هو ليس 3`). qu is skipped where its
// `not` is `mana`, also its `false`.
const PHRASES: Array<[string, string[]]> = [
  ['on click set x to n is 3', []],
  ['on click set x to n is not 3', ['qu']],
  ['on click set x to n is greater than 2', []],
  ['on click put n is less than 2 into #out', []],
  ['on click put #d1 matches .x into #out', []],
  ['on click set x to #d1 does not match .x', ['qu']],
  ['on click set x to #d1 exists', []],
  ['on click set x to #zz does not exist', ['qu']],
  ['on click set x to n is a Number', []],
];

describe.each(PHRASES)('%s', (source, broken) => {
  it.each(LANGUAGES.filter(language => !broken.includes(language)))('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(source);
  });
});

// `contains`, `includes` and `equals` read back through the expression
// lexicon's connectives. Each is skipped where the dictionary uses its word for
// another concept (ja/ko/zh `contains`, tl/tr `includes`) or the tokenizer
// splits it (qu `ukupi_kan`, hi `में_है`, zh `等于`, pl `równa się`).
const WORDS: Array<[string, string[]]> = [
  ['on click put [1, 2] contains 1 into #out', ['ja', 'ko', 'qu', 'zh']],
  ['on click put [1, 2] includes 1 into #out', ['hi', 'tl', 'tr']],
  ['on click put n equals 3 into #out', ['pl', 'zh']],
];

describe.each(WORDS)('%s', (source, broken) => {
  it.each(LANGUAGES.filter(language => !broken.includes(language)))('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(source);
  });
});
