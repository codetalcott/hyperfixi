/**
 * A counted loop is written in the language's own words (PR 131).
 *
 * The render wrote English `times` in 18 languages (es `repetir 3 times`, ja `3
 * times を repeat`) — every one whose i18n dictionary had no word for it — and
 * the SOV six wrote English `repeat` too: their counted head matched the verb by
 * its normalized form, and a literal renders as written. PR 127 taught the
 * readers each language's own words (`count-words.ts`, `native-count-word.test.ts`);
 * the owner's call here is to write them. The word is the dictionary's `times` (the lexicon's, which
 * `lexicon-parity.test.ts` in @lokascript/i18n locks to the dictionary), and
 * English `times` and `repeat` are still read.
 */
import { describe, it, expect } from 'vitest';
import { getLexicon, parse, render } from '../src/index';
import { KNOWN_PROFILES } from '../src/index';
import type { LanguageProfile } from '../src/index';

const FOREIGN = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];

const SOV = ['bn', 'hi', 'ja', 'ko', 'qu', 'tr'];

const SOURCE = 'on click set i to 0 then repeat 3 times increment i end then put i into #out';

const countWord = (language: string): string => {
  const lexicon = getLexicon(language) as { temporal?: Record<string, { primary: string }> };
  return lexicon.temporal!.times.primary;
};
const verb = (language: string): string =>
  (KNOWN_PROFILES as Readonly<Record<string, LanguageProfile>>)[language].keywords.repeat!.primary;
const english = (code: string, language: string): string => render(parse(code, language)!, 'en');
const words = (text: string): string[] => text.split(/\s+/);

describe('the render writes the language’s own count word', () => {
  it.each(FOREIGN)('%s', language => {
    const rendered = render(parse(SOURCE, 'en')!, language);
    expect(words(rendered)).toContain(countWord(language));
    expect(words(rendered)).not.toContain('times');
    expect(english(rendered, language)).toBe(SOURCE);
  });
});

describe('an SOV counted loop writes the language’s own verb', () => {
  it.each(SOV)('%s', language => {
    const rendered = render(parse(SOURCE, 'en')!, language);
    expect(rendered).toContain(verb(language));
    expect(words(rendered)).not.toContain('repeat');
  });
});

describe('English `times` is still read', () => {
  it.each(FOREIGN)('%s', language => {
    const rendered = render(parse(SOURCE, 'en')!, language);
    const code = rendered.replace(` ${countWord(language)} `, ' times ');
    expect(code).not.toBe(rendered);
    expect(english(code, language)).toBe(SOURCE);
  });
});

describe('English `repeat` is still read in the SOV counted head', () => {
  it.each(SOV)('%s', language => {
    const rendered = render(parse(SOURCE, 'en')!, language);
    const code = rendered.replace(` ${verb(language)} `, ' repeat ');
    expect(code).not.toBe(rendered);
    expect(english(code, language)).toBe(SOURCE);
  });
});

// sw's render writes the count before `mara`, and its word-first head reads it
// after (PR 127). An end word after a count's `mara` closes an empty loop; right
// after the verb it is the count (a variable named `mwisho`).
describe('sw `mara` and an end word', () => {
  it.each([
    [
      'unapo click seti n kwa 0 kisha rudia 3 mara mwisho kisha ongezeko n kisha weka n kwa #out',
      'on click set n to 0 then repeat 3 times end then increment n then put n into #out',
    ],
    [
      'unapo click rudia mara mwisho ongezeko x mwisho',
      'on click repeat mwisho times increment x end',
    ],
    [
      'unapo click rudia mwisho mara ongezeko x mwisho',
      'on click repeat mwisho times increment x end',
    ],
  ])('%s', (code, want) => {
    expect(english(code, 'sw')).toBe(want);
  });
});
