/**
 * Upstream's first person in the language's own words (M2, vocabulary sheet A2).
 *
 * `I match .x` and `I am a Node` stayed English in every translation: no
 * lexicon has `I` or `match`. Both engines read `me matches .x` and `me is a
 * Node` the same, and every lexicon has those words, so a value writes the
 * third person and the word pass localizes it (es `yo coincide .x`). Read back,
 * the English is `me matches .x`.
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
  ['on click if I match .active then remove .active else add .active end', 'me matches .active'],
  ['on click if I match .disabled halt else toggle .active end', 'me matches .disabled'],
  ['on click if I am a Node put "yes" into me end', 'me is a Node'],
  ['on click toggle .foo unless I match .bar', 'me matches .bar'],
])('%s', (source, thirdPerson) => {
  // he has no word for `matches` yet (sheet B7).
  it.each(FOREIGN.filter(l => l !== 'he'))('%s', language => {
    const rendered = translate(source, 'en', language);
    expect(words(rendered)).not.toContain('I');
    expect(words(rendered)).not.toContain('match');
    const back = translate(rendered, language, 'en');
    expect(back).toContain(thirdPerson);
    expect(back.replace(thirdPerson, '')).toBe(
      translate(source, 'en', 'en').replace(/I match \S+|I am a \S+/, '')
    );
  });
});

describe('a trailing unless reads its condition once', () => {
  it.each(['ja', 'tr', 'qu'])('%s', language => {
    const source = 'on click toggle .foo unless it matches .bar';
    expect(translate(translate(source, 'en', language), language, 'en')).toBe(source);
  });
});
