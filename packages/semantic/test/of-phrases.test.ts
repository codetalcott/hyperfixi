/**
 * `the X of Y` inside an expression, in each language's own construction (M2,
 * vocabulary sheet A3): es `( valor de #price ) + 1`, ja `( #priceの値 ) + 1`,
 * es `establecer @role de #sr-announce`. It was English in every translation
 * (`( the valor of #price ) + 1`), where a top-level property path was
 * already the language's own.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, parse, render, translate } from '../src/index';
import { ofPhrasesAsPossessives } from '../src/explicit/of-phrases';

const LANGUAGES = getSupportedLanguages().filter(l => l !== 'en');

/** The languages that put a possessive's owner first (ja `#priceの値`). */
const OWNER_FIRST = ['bn', 'hi', 'ja', 'ko', 'tl', 'vi', 'zh'];

const words = (text: string): string[] => text.split(/\s+/);

/** Both engines read `the X of Y` as `Y's X` (the command-shape gate's equivalence). */
const reading = (code: string): string => ofPhrasesAsPossessives(code);

describe.each([
  'on click put (the value of #price) + 1 into #out',
  'on click put (the textContent of #a) + "!" into #b',
  'on click set x to (the value of #a) + (the value of #b)',
  'on click if the value of #a is "x" then log 1 end',
  // A chain, each link the next one's owner.
  'on click set the innerHTML of the parentNode of #d1 to "foo"',
  // An attribute: the corpus's announce-screen-reader row.
  'on click set @role of #sr-announce to "alert"',
])('%s', source => {
  it.each(LANGUAGES)('%s', language => {
    const rendered = translate(source, 'en', language);
    expect(words(rendered)).not.toContain('of');
    expect(words(rendered)).not.toContain('the');
    expect(reading(translate(rendered, language, 'en'))).toBe(
      reading(translate(source, 'en', 'en'))
    );
  });
});

// Before `as` the phrase converts its owner (`the value of #price as Number` is
// `value of (#price as Number)`): a property-first rendering keeps that, an
// owner-first one would not, so there the English stays.
describe('before a conversion', () => {
  const source =
    'on input from .quantity set #total.innerText to (the value of #price as Number) * (my value as Number)';
  it.each(LANGUAGES)('%s', language => {
    const rendered = translate(source, 'en', language);
    if (OWNER_FIRST.includes(language)) expect(words(rendered)).toContain('of');
    else expect(words(rendered)).not.toContain('of');
    expect(reading(translate(rendered, language, 'en'))).toBe(
      reading(translate(source, 'en', 'en'))
    );
  });
});

// Where the language's of-word is also a marker the command wants (tr `nin`,
// qu `pa`, put's destination), the verified render writes the English.
describe('an of-word the reader would misread is written as English’s', () => {
  it.each(['tr', 'qu'])('%s', language => {
    const source = "on click put 'foo' into @bar of #div2";
    const rendered = render(parse(source, 'en')!, language);
    expect(words(rendered)).toContain('of');
    expect(reading(translate(rendered, language, 'en'))).toBe(
      reading(translate(source, 'en', 'en'))
    );
  });
});

describe('an attribute before the of-word reads back', () => {
  it.each([
    ['es', 'al clic establecer @role de #sr-announce a "alert"'],
    ['de', 'wenn klick setze @role von #sr-announce auf "alert"'],
    ['ru', 'при клик установить в @role из #sr-announce "alert"'],
    ['ar', 'على النقر اضبط @role لـ #sr-announce إلى "alert"'],
  ])('%s: %s', (language, code) => {
    expect(translate(code, language, 'en')).toBe('on click set @role of #sr-announce to "alert"');
  });
});

// A quoted string is written as written, and the phrase beside it in the
// language's own words. (Rewritten inside the string, the render would not
// read back, and the verified render would write both phrases in English.)
describe('a quoted string stays as written', () => {
  it.each(LANGUAGES)('%s', language => {
    const rendered = translate(
      'on click put "the value of #a" + (the value of #b) into #c',
      'en',
      language
    );
    expect(rendered).toContain('"the value of #a"');
    expect(words(rendered.replace('"the value of #a"', ''))).not.toContain('of');
  });
});

// The engine reads `the first of .items` as a position (its first match), and
// `.items's first` as a property named `first`.
describe('a position is not a property', () => {
  it('the readings are not equated', () => {
    expect(ofPhrasesAsPossessives('put the first of .items into #out')).toBe(
      'put the first of .items into #out'
    );
    expect(ofPhrasesAsPossessives('put the top of #a into #out')).toBe("put #a's top into #out");
  });

  it.each(LANGUAGES)('%s: the translation keeps the position', language => {
    const source = 'on click put (the last of .items) into #out';
    expect(reading(translate(translate(source, 'en', language), language, 'en'))).toBe(
      reading(translate(source, 'en', 'en'))
    );
  });
});
