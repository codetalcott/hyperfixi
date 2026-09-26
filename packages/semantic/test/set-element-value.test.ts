/**
 * `set x to <an element or an array>`, in every language.
 *
 * set's value took a literal, an expression or a reference, and the tokenizers
 * read an element (`#panel`, `.item`, `<li/>`) and an array (`[1, 2]`) as one
 * selector token. So `set el to #panel` matched no pattern and the whole `set`
 * was lost, in English and so in every translation. The handcrafted de/fr/id/
 * ms/pt set patterns had copied the narrow list. it/pl/ru/uk render the value
 * unmarked after the variable, and the matcher read the spaced `:x .item` as
 * the property `:x.item`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// Each renders as written in English.
const CASES: string[] = [
  'on click set x to #d1 then log x',
  'on click set x to .item then log x',
  'on click set x to <li/> then log x',
  'on click set x to <li/> in #list then log x',
  'on click set x to [1, 2] then log x',
  'on click set x to ["a", "b"] then log x',
  'on click set x to [] then log x',
  'on click set x to [#d1, #d2] then log x',
  'on click set x to *opacity then log x',
  'on click set $x to #d1 then log $x',
  'on click set :x to .item then log :x',
  // The values it always took.
  'on click set x to 1 then log x',
  'on click set x to it then log x',
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
