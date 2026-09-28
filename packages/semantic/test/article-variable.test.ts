/**
 * A variable named like an English article.
 *
 * The English tokenizer reads `a` and `an` as keywords (`is a Number`), and a
 * role that captured one alone made it the text "a", which a `set` cannot
 * write: `set a to 5` did not parse, and in a handler the whole `set` dropped,
 * in English and so in every translation. Captured alone, an article is a
 * variable, as a conjunction is (PR 59).
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const SOURCES = [
  'on click set a to 5 then put a into #out',
  'on click set an to 5 then put an + 1 into #out',
  'on click set a to 5 then increment a then put a into #out',
];

// es, pt and it spell their `to` marker `a`, and de its `by` `um`, so a
// variable `a` is particle-shaped there (filed).
const LANGUAGES = ['en', 'ar', 'fr', 'ja', 'ko', 'ru', 'tr', 'zh'];

describe.each(SOURCES)('%s', source => {
  it.each(LANGUAGES)('%s', language => {
    const code = language === 'en' ? source : render(parse(source, 'en')!, language);
    expect(render(parse(code, language)!, 'en')).toBe(source);
  });
});

describe('an article before a word is still an article', () => {
  it.each([
    ['on click put n is a Number into #out', 'on click put n is a Number into #out'],
    [
      'on click if x is an Array put 1 into #out end',
      'on click if x is an Array put 1 into #out end',
    ],
    ['on click make a <div/> then put it into #out', 'on click make <div/> then put it into #out'],
  ])('%s', (source, english) => {
    expect(render(parse(source, 'en')!, 'en')).toBe(english);
  });
});
