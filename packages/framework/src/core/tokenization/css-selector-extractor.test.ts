import { describe, it, expect } from 'vitest';
import { CssSelectorExtractor } from '../../interfaces/value-extractor';

/**
 * `getDefaultExtractors()` has no CSS-selector extractor, so a DSL that does not
 * register one splits the sigil off as its own token and the role capture keeps
 * only that sigil — `add .active to #button` parsed with patient `"."` and
 * destination `"#"` in domain-learn, -todo, -sql and -jsx, silently, in every
 * language. Five other domains each carried a private copy of this class; this
 * is the shared one.
 */
describe('CssSelectorExtractor', () => {
  const ex = new CssSelectorExtractor();

  const extract = (input: string, pos = 0) =>
    ex.canExtract(input, pos) ? ex.extract(input, pos) : null;

  it.each([
    ['.active', '.active'],
    ['#button', '#button'],
    ['.btn-primary', '.btn-primary'],
    ['._private', '._private'],
    ['#a1', '#a1'],
    ['.-leading-hyphen', '.-leading-hyphen'],
  ])('extracts %s whole', (input, expected) => {
    expect(extract(input)).toEqual({ value: expected, length: expected.length });
  });

  it('stops at the first character that cannot be in a selector', () => {
    expect(extract('.active to #button')).toEqual({ value: '.active', length: 7 });
  });

  it('keeps diacritics, so Latin-script class names survive', () => {
    expect(extract('.año')).toEqual({ value: '.año', length: 4 });
    expect(extract('#botón')).toEqual({ value: '#botón', length: 6 });
  });

  // The SOV languages write their particles flush against the value, so a
  // Unicode-wide body turns `#buttonに` into a single token and carries the role
  // marker inside the value — which is worse than truncating, because the marker
  // is then missing from where the pattern expects it.
  it.each([
    ['#buttonに', '#button'],
    ['.activeを', '.active'],
    ['#button에', '#button'],
    ['.active를', '.active'],
    ['#button的', '#button'],
  ])('stops at the particle in %s', (input, expected) => {
    expect(extract(input)).toEqual({ value: expected, length: expected.length });
  });

  it.each([
    ['.', 'a bare sigil'],
    ['#', 'a bare sigil'],
    ['. active', 'a sigil followed by a space'],
    ['.1col', 'a digit — CSS identifiers cannot start with one'],
    ['button', 'no sigil at all'],
  ])('declines %s (%s)', input => {
    expect(ex.canExtract(input, 0)).toBe(false);
  });

  it('declines a CJK-only class name rather than claiming the sigil alone', () => {
    // `.追加` would otherwise extract as a bare `.`; leaving it unclaimed lets
    // the keyword/identifier extractors see the verb.
    expect(ex.canExtract('.追加', 0)).toBe(false);
  });
});
