/**
 * A translation writes a language's word only where that language's reader
 * brings the same word back.
 *
 * The renderer localized every word a lexicon names, wherever it stood. Two
 * places the reader cannot bring one back, measured 2026-10-07 in the
 * command-shape gate (silent in up to 23 languages):
 *
 *   - a PROPERTY name the reader's property table does not hold: es wrote
 *     `my children` as `mi hijos` and `my style["color"]` as
 *     `mi estilo["color"]`, read back as properties named `hijos` and `estilo`;
 *   - a CALL's arguments, which every reader takes as written: es wrote
 *     `sprayInto(me)` as `sprayInto(yo)`, a call with a variable named `yo`.
 *
 * And a type name after `am a` (`if I am a Element`) was localized, as one
 * after `is a` no longer is (PR 95).
 *
 * The value matrix runs a property and a call cell of each on both engines
 * (`#w's children's length`, `the length of the children of #w`,
 * `Math.max(n, true)`); these assertions name the rules.
 */
import { describe, it, expect } from 'vitest';
import { localizeValueInterior } from '../src/explicit/value-lexicon';
import { translate } from '../src/index';

const LANGUAGES = ['de', 'es', 'fr', 'ja', 'ru', 'zh'] as const;

const roundTrip = (source: string, language: string): { foreign: string; back: string } => {
  const foreign = translate(source, 'en', language);
  return { foreign, back: translate(foreign, language, 'en') };
};

describe('a property name the reader cannot bring back is written as spelled', () => {
  it.each(
    LANGUAGES.flatMap(language =>
      [
        ['on click add .foo to my children', 'my children'],
        ['on click add .foo to the children of #bar', 'children'],
        ['on click put "red" into my style["color"]', 'style["color"]'],
        ["on click put #w's children's length into #out", 'children'],
      ].map(([source, kept]) => [language, source, kept] as const)
    )
  )('%s: %s', (language, source, kept) => {
    const { foreign, back } = roundTrip(source, language);
    expect(foreign).toContain(kept.replace(/^my /, ''));
    expect(back).toContain(kept);
  });

  it.each(LANGUAGES)('%s still writes `value` in its own word, which its reader brings back', language => {
    const { foreign, back } = roundTrip('on click put my value into #out', language);
    expect(foreign).not.toMatch(/\bvalue\b/);
    expect(back).toBe('on click put my value into #out');
  });

  it('a word the reader takes as a keyword is still written in the language (es `primero`)', () => {
    const { foreign, back } = roundTrip('on click put the first of .items into #out', 'es');
    expect(foreign).toContain('primero');
    expect(back).toContain('first');
  });
});

describe("a call's arguments are written as written", () => {
  it.each(LANGUAGES)('%s', language => {
    expect(localizeValueInterior('Math.max(n, true)', language)).toBe('Math.max(n, true)');
    const { foreign, back } = roundTrip('on click call sprayInto(me)', language);
    expect(foreign).toContain('sprayInto(me)');
    expect(back).toBe('on click call sprayInto(me)');
  });

  it("including a possessive inside them, while one outside still moves (es `valor de #input`)", () => {
    const source = "on click put #input's value into #out then call writeText(#input's value)";
    const { foreign, back } = roundTrip(source, 'es');
    expect(foreign).toContain("writeText(#input's value)");
    expect(foreign).toContain('valor de #input');
    expect(back).toContain("writeText(#input's value)");
  });

  it('a parenthesized group that is not a call still localizes', () => {
    expect(localizeValueInterior('(true and x)', 'es')).not.toContain('true');
  });
});

describe('a type name after `am a` stays as written', () => {
  it.each(LANGUAGES)('%s', language => {
    const { foreign, back } = roundTrip('on click if I am a Element put "yes" into me end', language);
    expect(foreign).toContain('Element');
    expect(back).toContain('am a Element');
  });
});
