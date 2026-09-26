/**
 * A possessive as a value (`put #d1's value into #b`, `set x to the value of
 * #d1`), in every language.
 *
 * Most languages render a property path in the `of` form (es `valor de #d1`,
 * de `wert von #d1`), and the matcher reads that form only in a role whose
 * schema accepts a property path. The value roles of put, set, log, append,
 * prepend, copy, default, throw and return did not, so the possessive was lost
 * in 16 languages: the put dropped whole, or the set kept the property word.
 * In English the `of` form was lost too (`set x to the value of #d1` rendered
 * `set x to value`). None of these commands has a source role, so the `of`
 * form cannot be read as one (es `de` is also "from").
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// Source → its English render. English writes a possessive with `'s`, which
// both engines read exactly as the `of` form.
const CASES: Array<[string, string]> = [
  ["on click put #d1's value into #b", "on click put #d1's value into #b"],
  ['on click put the value of #d1 into #b', "on click put #d1's value into #b"],
  ["on click put 'x' into #b's textContent", 'on click put "x" into #b\'s textContent'],
  ["on click put #d1's value into #b's textContent", "on click put #d1's value into #b's textContent"],
  ["on click set x to #d1's value", "on click set x to #d1's value"],
  ['on click set x to the value of #d1', "on click set x to #d1's value"],
  ['on click set x to value of #d1 then log x', "on click set x to #d1's value then log x"],
  ["on click log #d1's value", "on click log #d1's value"],
  ['on click log the value of #d1', "on click log #d1's value"],
  ["on click append #d1's value to #b", "on click append #d1's value to #b"],
  ["on click prepend #d1's value to #b", "on click prepend #d1's value to #b"],
  ["on click copy #d1's value", "on click copy #d1's value"],
  ["on click default x to #d1's value", "on click default x to #d1's value"],
  ["on click throw #d1's value", "on click throw #d1's value"],
  ["def f() return #d1's value end", "def f\n  return #d1's value\nend"],
  ["put #d1's value into #b", "put #d1's value into #b"],
  // English's hand-written set pattern is now one definition, so its `on`
  // scope stays with it.
  ["on click set @aria-selected to 'false' on .tab", 'on click set @aria-selected to "false" on .tab'],
];

describe.each(CASES)('%s, through every language', (src, english) => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(english);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });
});
