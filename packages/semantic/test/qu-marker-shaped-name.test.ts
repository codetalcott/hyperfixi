/**
 * A qu word keeps a marker-shaped end when a marker follows it (PR 128).
 *
 * qu attaches a case marker to its noun (`wasita`, house + accusative), and the
 * tokenizer splits one off a word's end: `triggerElta` is `triggerEl` + `ta`.
 * A variable whose name ends like a marker split the same way when its writer
 * put the marker after it: `userData ta` was `userDa` + `ta` + `ta`, and `data
 * ta #out man churay` (put data into #out) did not parse. A word takes one case
 * marker, so when the next word is one, the ending is the word's own. The
 * renderer writes `(userData) ta` (PR 111); this is the hand-written form.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, tokenize } from '../src/index';

const words = (code: string): string[] => tokenize(code, 'qu').tokens.map(t => t.value);
const english = (code: string): string => render(parse(code, 'qu')!, 'en');

describe('a marker-shaped end before a marker', () => {
  it.each([
    ['userData ta #out man churay', 'userData'],
    ['data ta #out man churay', 'data'],
    ['delta ta #out man churay', 'delta'],
    ['mapa ta #out man churay', 'mapa'],
    ['data -ta #out man churay', 'data'],
    ['data-ta #out man churay', 'data'],
  ])('%s keeps %s whole', (code, name) => {
    expect(words(code)[0]).toBe(name);
    expect(english(code)).toBe(`put ${name} into #out`);
  });

  it('reads in a handler', () => {
    expect(english('maykama click userData ta #out man churay')).toBe(
      'on click put userData into #out'
    );
  });
});

describe('an attached marker', () => {
  it.each([
    ['triggerElta #out man churay', ['triggerEl', 'ta']],
    ['wasita ruway', ['wasi', 'ta']],
  ])('%s splits', (code, split) => {
    expect(words(code).slice(0, 2)).toEqual(split);
  });
});
