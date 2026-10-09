/**
 * Upstream's fixed words in each language's own (M2, vocabulary sheet B3–B6):
 * `go back`, `from elsewhere`, a loop's `index i`, and the `start` of `start
 * view transition`. Each was English in every translation; no profile had a
 * word for it. The words are the dictionaries' (grammar-words.ts), and every
 * reader still takes English's.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, parse, render, translate } from '../src/index';
import { GRAMMAR_WORDS, type GrammarWordKey } from '../src/parser/utils/grammar-words';
import { dictionaries } from '../../i18n/src/dictionaries';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

// [source, the word it holds]
const SHAPES: Array<[string, GrammarWordKey]> = [
  ['on click go back', 'back'],
  ['on click go back then add .a to me', 'back'],
  ['go back', 'back'],
  ['on click from elsewhere remove .open from .dropdown-menu', 'elsewhere'],
  ['on click from elsewhere remove .open', 'elsewhere'],
  ['on load repeat for item in .item index i add .visible to item wait 100ms end', 'index'],
  ['on click repeat 3 times index i log i end', 'index'],
  ['on click start view transition swap #a with #b end', 'start'],
  ['on click start view transition using "slide" add .x to me end then log 1', 'start'],
];

describe.each(SHAPES)('%s', (source, key) => {
  it.each(FOREIGN)('%s', language => {
    const rendered = translate(source, 'en', language);
    const native = GRAMMAR_WORDS[language]![key];
    // ko `뒤로` and zh `后退` are written as the tokens they read as.
    const spaced = rendered.replace(/\s+/g, '');
    expect(spaced).toContain(native.replace(/\s+/g, ''));
    if (native !== key) expect(rendered.split(/\s+/)).not.toContain(key);
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

describe('English’s words still read', () => {
  it.each([
    ['es', 'al clic ir a back', 'on click go back'],
    ['es', 'al clic de elsewhere quitar .open', 'on click from elsewhere remove .open'],
    ['es', 'al clic start view transition intercambiar #a con #b fin', 'on click start view transition swap #a with #b end'],
    ['ja', 'クリック で start view transition #a に #b を 交換 終わり', 'on click start view transition swap #a with #b end'],
    ['es', 'al clic repetir 3 veces index i registrar i fin', 'on click repeat 3 times index i log i end'],
  ])('%s: %s', (language, source, english) => {
    expect(translate(source, language, 'en')).toBe(english);
  });
});

describe('a destination other than back is never written as back', () => {
  it.each(FOREIGN)('%s', language => {
    for (const source of ['on click go to #d1', 'on click go to url "/x"', 'go to me']) {
      const rendered = render(parse(source, 'en')!, language);
      expect(rendered.replace(/\s+/g, '')).not.toContain(
        GRAMMAR_WORDS[language]!.back.replace(/\s+/g, '')
      );
      expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
    }
  });
});

// Policy 5: a translation writes only the dictionary's words.
describe('the words are the dictionaries’', () => {
  it.each(FOREIGN)('%s', language => {
    const expressions = (dictionaries as Record<string, { expressions?: Record<string, string> }>)[
      language
    ]?.expressions;
    expect(expressions).toMatchObject(GRAMMAR_WORDS[language]!);
  });
});
