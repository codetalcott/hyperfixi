/**
 * A reference's property reads back (PR 109). The value matrix's reference
 * operands (PR 108) found each way a translation lost one:
 *
 * - English itself parsed `put the type of event into #out` as a bare `on
 *   click`: `event`, `window` and `document` are no expression words, so the
 *   value stopped at the reference, short of what its `of` owns;
 * - a `.class` after an of-marker is its owner too (es `textContent de .w`);
 * - qu and uk keep an apostrophe inside a word, so `ruway's` and `подія's`
 *   were one token, which read no reference;
 * - ar and hi translate a reference-word property (`detail`) and owner
 *   (`window`), and the copula after it reads `is` only after an operand,
 *   which they were not.
 *
 * (bn, hi and th write `event` with a final combining mark, which the string
 * extractor took for the end of a word only once it counted marks:
 * `apostrophe-possessive.test.ts` in the framework.)
 */
import { describe, it, expect } from 'vitest';
import { parse, render, tokenize } from '../src/index';

const LANGUAGES = [
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

/** The source, rendered into `language` and read back as English. */
function roundTrip(source: string, language: string): { foreign: string; back: string } {
  const foreign = render(parse(source, 'en')!, language);
  return { foreign, back: render(parse(foreign, language)!, 'en') };
}

const values = (code: string, language: string): string[] =>
  tokenize(code, language).tokens.map(t => t.value);

describe('a reference after an of-marker is its owner', () => {
  describe.each([
    'on click put the type of event into #out',
    'on click set x to the scrollY of window then put x into #out',
    'on click put the title of document into #out',
    'on click put the type of event + "q" into #out',
    'on click put "ab" is the type of event into #out',
  ])('%s', source => {
    it('reads in English', () => {
      expect(render(parse(source, 'en')!, 'en')).toBe(source);
    });

    it.each(LANGUAGES)('%s', language => {
      const { foreign, back } = roundTrip(source, language);
      expect(back, foreign).toBe(source);
    });
  });

  it('a class selector after an of-marker is its owner (es `de`)', () => {
    expect(
      render(
        parse('al clic poner 1 en #out entonces establecer x a textContent de .w', 'es')!,
        'en'
      )
    ).toBe('on click put 1 into #out then set x to textContent of .w');
  });
});

describe("qu and uk read a reference and its `'s` apart", () => {
  it.each([
    ['qu', "ruway's type", ['ruway', "'", 's', 'type']],
    ['qu', "punta's id", ['punta', "'", 's', 'id']],
    ['uk', "подія's type", ['подія', "'", 's', 'type']],
    ['uk', "ціль's id", ['ціль', "'", 's', 'id']],
  ])('%s %s', (language, code, tokens) => {
    expect(values(code, language)).toEqual(tokens);
  });

  it("a qu underscore compound ends before the `'s` (`k_iri`, window)", () => {
    expect(values("k_iri's scrollY", 'qu')).toEqual(['k_iri', "'", 's', 'scrollY']);
    expect(values("sut_iy's x", 'qu')).toEqual(['sut_iy', "'", 's', 'x']);
  });

  it("a variable keeps its one-token `'s` (PR 83)", () => {
    expect(values("obj's v", 'qu')).toEqual(["obj's", 'v']);
    expect(values("obj's v", 'uk')).toEqual(["obj's", 'v']);
  });

  it("a variable whose stem the normalizer reads keeps its `'s` (qu `ity`, `mey`)", () => {
    expect(values("ity's length", 'qu')).toEqual(["ity's", 'length']);
    for (const name of ['ity', 'mey']) {
      const source = `on click put ${name}'s length into #out`;
      expect(roundTrip(source, 'qu').back).toBe(source);
    }
  });

  it("a variable spelled like a marker that normalizes to a reference keeps its `'s`", () => {
    // qu `pi` is a particle (normalized `event`), not the reference `ruway`.
    const source = "on click put pi's length into #out";
    expect(roundTrip(source, 'qu').back).toBe(source);
  });

  it.each([
    "on click put event's type into #out",
    "on click set x to target's id then put x into #out",
    'on click put "q" + event\'s target\'s id into #out',
    "on click set i to 1 then increment i by event's detail then put i into #out",
    "on click put body's id into #out",
    "on click put window's scrollY into #out",
    "on click put document's title into #out",
    "on click put result's length into #out",
    "on click put detail's x into #out",
  ])('%s', source => {
    for (const language of ['qu', 'uk']) {
      const { foreign, back } = roundTrip(source, language);
      expect(back, `${language}: ${foreign}`).toBe(render(parse(source, 'en')!, 'en'));
    }
  });
});

describe("a reference is an operand to the join's senses", () => {
  // ar `هو` and hi `है` read `is` only after an operand, and `detail` and
  // `window`, a translated property and owner, were not one.
  it.each([
    "on click put event's detail is equal to 6 into #out",
    "on click put event's detail is in [1, 2, 6] into #out",
    "on click set x to event's detail is a Number then put x into #out",
    'on click if the scrollY of window is equal to 6 then put 1 into #out end',
    'on click if the title of document is equal to "" then put 1 into #out end',
  ])('%s', source => {
    for (const language of ['ar', 'hi']) {
      const { foreign, back } = roundTrip(source, language);
      expect(back, `${language}: ${foreign}`).toBe(render(parse(source, 'en')!, 'en'));
    }
  });
});
