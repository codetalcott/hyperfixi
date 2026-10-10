/**
 * The `as` of a conversion, in each language's own word (M2, vocabulary sheet
 * A4): `put it as String into me`, `(my value as Number)`, `x as Fixed:2`. It
 * was English in every translation; the type name still is. The word is the
 * dictionary's `modifiers.as` (grammar-words.ts CONVERSION_AS), and every
 * reader still takes English's.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, parse, render, translate } from '../src/index';
import { CONVERSION_AS } from '../src/parser/utils/grammar-words';
import { localizeValueInterior } from '../src/explicit/value-lexicon';
import { ofPhrasesAsPossessives } from '../src/explicit/of-phrases';
import { dictionaries } from '../../i18n/src/dictionaries';

const NATIVE = getSupportedLanguages().filter(l => CONVERSION_AS[l] !== undefined);

const words = (text: string): string[] => text.split(/\s+/);

describe.each([
  'on click put it as String into me',
  'on click put 1 + my.innerHTML as Int into #out',
  // The corpus's computed-value row.
  'on click put (the value of #price as Number) * (my value as Number) into #total',
  'on click set :n to (my value as Int) + 1',
  'on click if (my value as Int) > 5 then log 1 end',
  // A type the tokenizer splits at its colon: the matcher reads the value
  // through the language's own `as` (es `x como Fixed:2`).
  'on click put x as Fixed:2 into me',
  'on click put x as Values:Form into y',
  // With a query's `in` (sheet A5) in the same render.
  'on click put x as String into <p/> in me',
])('%s', source => {
  it.each(NATIVE)('%s', language => {
    const rendered = translate(source, 'en', language);
    expect(words(rendered)).toContain(CONVERSION_AS[language]);
    expect(words(rendered)).not.toContain('as');
    // `the value of #price` comes back without its `the` (sheet A3).
    expect(ofPhrasesAsPossessives(translate(rendered, language, 'en'))).toBe(
      ofPhrasesAsPossessives(translate(source, 'en', 'en'))
    );
  });
});

// fetch's responseType marker is the same word in most languages (es `buscar
// "/test" como json`), and a fused handler pattern (`al clic buscar
// {source}`) has no slot for it: the source must not take it as a conversion.
// Nor is `is a` a conversion.
describe.each([
  'on click fetch /test as json',
  'on click fetch /test as JSON then put it into me',
  'on click if x is a String then log 1 end',
  'on click put x is a Number into me',
])('%s still reads', source => {
  it.each(NATIVE)('%s', language => {
    const rendered = translate(source, 'en', language);
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

// The type check's `a` follows the copula, not `as` (th's copula is its `as`).
describe('`is a` keeps its copula', () => {
  it.each(NATIVE.filter(l => l !== 'th'))('%s', language => {
    expect(words(localizeValueInterior('x is a String', language))).not.toContain(
      CONVERSION_AS[language]
    );
  });
});

describe('English’s `as` still reads', () => {
  it.each([
    ['es', 'al clic poner ello as String en yo'],
    ['ja', 'クリック を で それ as String を 自分 に 置く'],
    ['ko', '클릭 할 때 그것 as String 을 나 에 넣다'],
  ])('%s: %s', (language, source) => {
    expect(translate(source, language, 'en')).toBe('on click put it as String into me');
  });
});

// Where the language's word reads as something else, the verified render
// writes English's: ko `로` is also a marker (get's `결과 로 JSONString` read
// as `get JSONString on result`), and th `เป็น` is also `is`, which is what it
// reads before a type name core does not have built in.
describe('a native `as` the reader would misread is written as English’s', () => {
  it.each([
    ['ko', 'on click get result as JSONString'],
    ['ko', 'on click get #f as Values'],
    ['th', 'on click put x as MyType into me'],
  ])('%s: %s', (language, source) => {
    const rendered = render(parse(source, 'en')!, language);
    expect(words(rendered)).toContain('as');
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

describe('th `เป็น`', () => {
  it('is `as` before a type core has built in, `Fixed:2` included', () => {
    expect(translate('เมื่อ คลิก ใส่ x เป็น Fixed:2 ใน ฉัน', 'th', 'en')).toBe(
      'on click put x as Fixed:2 into me'
    );
    expect(translate('เมื่อ คลิก ใส่ x เป็น Fixed ใน ฉัน', 'th', 'en')).toBe(
      'on click put x as Fixed into me'
    );
  });
});

// Policy 5: a translation writes only the dictionary's words.
describe('the words are the dictionaries’', () => {
  it.each(getSupportedLanguages().filter(l => l !== 'en'))('%s', language => {
    const modifiers = (dictionaries as Record<string, { modifiers?: Record<string, string> }>)[
      language
    ]?.modifiers;
    expect(CONVERSION_AS[language]).toBe(modifiers?.as);
  });
});
