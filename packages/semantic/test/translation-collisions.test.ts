/**
 * A variable a translation cannot keep (PR 116, the after-113 handoff's item 3):
 * spelled like a value word of the target language — a pronoun (tl `ako` is
 * `me`, it `io`, fr `je`) or another reference (es `objetivo` is `target`) — it
 * reads as that word there, and no spelling tells the two apart. The verified
 * render's parentheses are for structure words (a value word in parentheses is
 * still the value), so renaming the variable before translating is the only
 * fix, and the finder says so.
 */
import { describe, it, expect } from 'vitest';
import { findTranslationCollisions, parse, render } from '../src/index';

const english = (code: string, language: string): string => render(parse(code, language)!, 'en');

describe('a variable the target language reads as a value word', () => {
  it.each([
    ['on click put ako into #out', 'tl', 'ako', 1, 'the pronoun `me`'],
    ['on click set io to 1 then put io into #out', 'it', 'io', 2, 'the pronoun `me`'],
    ['on click set je to 2 then put je + 1 into #out', 'fr', 'je', 2, 'the pronoun `me`'],
    ['on click put objetivo into #out', 'es', 'objetivo', 1, 'the word for `target`'],
  ])('en → %s: %s', (code, to, name, places, word) => {
    const [finding, ...rest] = findTranslationCollisions(code, 'en', to);
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ name, collision: 'pronoun' });
    expect(finding!.occurrences).toHaveLength(places);
    for (const { start, end } of finding!.occurrences) expect(code.slice(start, end)).toBe(name);
    expect(finding!.message).toContain(word);
    expect(finding!.message).toContain('Rename it before translating');
  });

  it('is what the translation misreads', () => {
    const code = 'on click put ako into #out';
    expect(english(render(parse(code, 'en')!, 'tl'), 'tl')).toBe('on click put me into #out');
  });

  it('offers a rename that reads as a plain name in both languages', () => {
    const [finding] = findTranslationCollisions('on click put ako into #out', 'en', 'tl');
    const renamed = `on click put ${finding!.rename} into #out`;
    expect(findTranslationCollisions(renamed, 'en', 'tl')).toEqual([]);
    expect(english(render(parse(renamed, 'en')!, 'tl'), 'tl')).toBe(renamed);
  });

  it('checks the rename in the target language: tr splits `ben1` at its digit', () => {
    const [finding] = findTranslationCollisions('on click put ben into #out', 'en', 'tr');
    expect(finding).toMatchObject({ name: 'ben', rename: 'benValue' });
  });

  it('finds it in a foreign source too', () => {
    const [finding] = findTranslationCollisions('al clic poner ako en #out', 'es', 'tl');
    expect(finding).toMatchObject({ name: 'ako' });
  });
});

describe('nothing to report', () => {
  it.each([
    ['a plain name', 'on click put x into #out', 'tl'],
    ['a string', 'on click put "ako" into #out', 'tl'],
    // The verified render writes `(si)` where the plain spelling would misread.
    ['a structure word', 'on click put si into #out', 'es'],
  ])('%s', (_, code, to) => {
    expect(findTranslationCollisions(code, 'en', to)).toEqual([]);
  });
});
