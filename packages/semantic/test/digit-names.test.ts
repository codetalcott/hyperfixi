/**
 * A variable name with a digit in it (`x1`, `item2`) is one word in every language.
 *
 * The Turkish and Quechua extractors let a digit continue a word only after an `_`
 * (`x_1`), so `x1` tokenized as `x` + `1`. The renderer covered for it: the verified
 * render wrote the name in parentheses (`(x1) i 10 e ayarla`), which read back as
 * `set (x1) to 10`. But the same script written by hand, without the parentheses,
 * was refused (`Could not parse input in tr: x1 i 10 e ayarla`). No gate had a name
 * with a digit in it.
 *
 * A keyword ends at a word boundary, and a digit is not one: `it2` is a name, not
 * `it` and `2`.
 */
import { describe, it, expect } from 'vitest';
import { tokenize, translate, getSupportedLanguages } from '../src/index';

const LANGUAGES = getSupportedLanguages();
const FOREIGN = LANGUAGES.filter(l => l !== 'en');
const NAMES = [
  'x1',
  'item2',
  'count10',
  'v1x',
  'it2',
  'me1',
  'a1',
  'e2',
  'i3',
  'de2',
  'ta2',
  'en1',
];

describe('a name with a digit tokenizes as one word', () => {
  it.each(LANGUAGES)('%s', language => {
    for (const name of NAMES) {
      expect(
        tokenize(name, language).tokens.map(t => t.value),
        name
      ).toEqual([name]);
    }
  });
});

describe.each([
  'on click set x1 to 10 then log x1',
  'on click put item2 into #out',
  'on click increment count10',
])('%s', source => {
  it.each(FOREIGN)('is written plainly in %s and reads back', language => {
    const foreign = translate(source, 'en', language);
    expect(foreign, 'no parentheses around the name').not.toContain('(');
    expect(translate(foreign, language, 'en'), foreign).toBe(source);
  });
});

describe('written by hand, with no help from the renderer', () => {
  it.each(FOREIGN)('%s reads `x1` where it reads any other name', language => {
    const plain = translate('on click set zname to 10', 'en', language);
    const byHand = plain.replace('zname', 'x1');
    expect(translate(byHand, language, 'en'), byHand).toBe('on click set x1 to 10');
  });
});
