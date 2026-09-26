/**
 * A class query keeps its `in` scope (`.item in #list`), in every language.
 *
 * Only a `<…/>` query took a scope, so `set x to .item in #list` rendered
 * `set x to .item`, in English and so in every translation: the query reached
 * every `.item` on the page. Upstream reads the matches inside #list. A class
 * NAME before a marker its command needs (es `alternar .active en #btn`) keeps
 * that marker for the command.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// Each renders as written in English, with the languages it is not yet right
// in: it reads `aggiungere .z a .item in #list` as `add .z in .item to #list`,
// as it reads an element query (`<li/> in #list`).
const CASES: Array<[string, readonly string[]]> = [
  ['on click set x to .item in #list then put x.length into #out', []],
  ['on click add .z to .item in #list', ['it']],
  ['on click put "y" into .item in #list', []],
  ['on click for el in .item in #list put "y" into el end', []],
  ['on click take .a from .item in #list', []],
  ['on click toggle .a on .item in #list', []],
  ['on click remove .a from .item in me', []],
  // A class name keeps no scope.
  ['on click add .a to me', []],
];

describe.each(CASES)('%s, through every language', (src, notYet) => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it.each(FOREIGN.filter(language => !notYet.includes(language)))('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});
