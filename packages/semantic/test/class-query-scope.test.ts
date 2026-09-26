/**
 * A class query keeps its `in` scope (`.item in #list`), in every language.
 *
 * Only a `<…/>` query took a scope, so `set x to .item in #list` rendered
 * `set x to .item`, in English and so in every translation: the query reached
 * every `.item` on the page. Upstream reads the matches inside #list. A class
 * NAME (the patient of add/remove/toggle/take) is not a query and takes none.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// Each renders as written in English.
const CASES: string[] = [
  'on click set x to .item in #list then put x.length into #out',
  'on click add .z to .item in #list',
  'on click put "y" into .item in #list',
  'on click for el in .item in #list put "y" into el end',
  'on click take .a from .item in #list',
  'on click toggle .a on .item in #list',
  'on click remove .a from .item in me',
  // A class NAME takes no scope: it's `a` ("to") is also a locative, and
  // `aggiungere .a a <li/> in #list` read `.a` as a query scoped to the `<li/>`.
  'on click add .a to <li/> in #list',
];

describe.each(CASES)('%s, through every language', src => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});
