/**
 * Upstream's first person in the language's own words (M2, vocabulary sheet A2).
 *
 * `I match .x` and `I am a Node` stayed English in every translation: no
 * lexicon has `I` or `match`. Both engines read `me matches .x` and `me is a
 * Node` the same, and every lexicon has those words, so a value writes the
 * third person and the word pass localizes it (es `yo coincide .x`). English
 * writes the third person back in upstream's first, so a round trip is exact.
 *
 * Two readings had to change with it: `I` is never a variable spelled like a
 * word (tr and pl wrote `(I) match`), and a trailing `unless` whose clause holds
 * only its condition no longer reads the condition's operator as a command (ja
 * `それ 一致する .bar ない限り` added a phantom `matches`; refused on main for
 * `unless it matches` too).
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, translate } from '../src/index';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');
const words = (text: string): string[] => text.split(/\s+/);

describe.each([
  'on click if I match .active then remove .active else add .active end',
  'on click if I match .disabled halt else toggle .active end',
  'on click if I am a Node put "yes" into me end',
  'on click toggle .foo unless I match .bar',
])('%s', source => {
  // he has no word for `matches` yet (sheet B7).
  it.each(FOREIGN.filter(l => l !== 'he'))('%s', language => {
    const rendered = translate(source, 'en', language);
    expect(words(rendered)).not.toContain('I');
    expect(words(rendered)).not.toContain('match');
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

describe('English writes the third person back in the first', () => {
  it.each([
    ['on click if me matches .x add .a end', 'on click if I match .x add .a end'],
    ['on click if me is a Node add .a end', 'on click if I am a Node add .a end'],
    ['on click if me is not a Node add .a end', 'on click if I am not a Node add .a end'],
    ['on click toggle .foo unless me matches .bar', 'on click toggle .foo unless I match .bar'],
    // Not a name that ends in `me`, nor a property.
    ['on click if #me matches .x add .a end', 'on click if #me matches .x add .a end'],
  ])('%s', (source, english) => {
    expect(translate(source, 'en', 'en')).toBe(english);
  });
});

describe('a trailing unless reads its condition once', () => {
  it.each(['ja', 'tr', 'qu'])('%s', language => {
    const source = 'on click toggle .foo unless it matches .bar';
    expect(translate(translate(source, 'en', language), language, 'en')).toBe(source);
  });
});
