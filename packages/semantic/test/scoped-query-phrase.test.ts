/**
 * A query's scope inside a phrase (OPEN_ITEMS P62, M2 reliability row 8):
 *
 * - `put the length of <:checked/> in #box into me`: the of-possessive read
 *   the owner and stopped, so `in` was put's marker. A scoped query owner is
 *   now a phrase, as a positional owner is (`the X of <owner>` in English).
 * - `put <span/> in #box where it matches .a into me`: a collection's filter
 *   after the scope ended the scoped read, and English came back silently as
 *   `put <span/> into #box where …`, which the engine rejects.
 * - `put the length of <p/> into #out`: read right, but the lossy check's
 *   value scanner took the `'` of `<p/>'s` for a quote and lost `#out`, so the
 *   translation was refused in every language.
 *
 * - `bind $n to the length of <:checked/> in the next <tbody/> …`: a positional
 *   scope, which no query scope reader takes, is read as a positional run.
 */
import { describe, it, expect } from 'vitest';
import { translate, getSupportedLanguages } from '../src/index';
import { invariantValues } from '../src/explicit/lossy';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

/** Source, then the languages that still refuse it (never silently). */
const SHAPES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['on click put the length of <p/> into #out', []],
  ['on click put <span/> in #box where it matches .a into me', []],
  // Refused only by the same scanner bug, in English too (LOUD
  // `possessive-after-query` until now); qu's `<div/>'s` is one token, glued back.
  ["on click put 'updated' into the next <div/>'s textContent", []],
  ["live put $config's label into me", []],
  // The owner-first `の` languages and tl/vi/zh do not read the phrase back yet.
  [
    'on click put the length of <:checked/> in #box into me',
    ['bn', 'hi', 'ja', 'ko', 'tl', 'vi', 'zh'],
  ],
];

describe.each(SHAPES)('%s', (source, refusing) => {
  const english = translate(source, 'en', 'en');

  it('English reads it', () => {
    const flat = (code: string): string =>
      code.replace(/\s+/g, ' ').replace(/ end$/, '').replace(/"updated"/, "'updated'");
    expect(flat(english).replace(/<p\/>'s length/, 'the length of <p/>')).toBe(flat(source));
  });

  it.each(FOREIGN)('%s', language => {
    if (refusing.includes(language)) {
      expect(() => translate(translate(source, 'en', language), language, 'en')).toThrow();
      return;
    }
    expect(translate(translate(source, 'en', language), language, 'en')).toBe(english);
  });
});

it("the value scanner reads `'s` after a query as a possessive", () => {
  expect([...invariantValues("put <p/>'s length into #out").keys()]).toEqual(['<p/>', '#out']);
});

// A scope is read only where the pattern says what follows: `into #out` is
// put's own, not `.w`'s scope.
it("an `of`'s owner keeps the command's marker", () => {
  const source = 'on click put 2 is in textContent of .w into #out';
  expect(translate(source, 'en', 'en')).toBe(source);
});

// Where the pattern owes the marker and nothing it owes follows the positional,
// the positional is the command's own role: `into the next <tbody/>` is put's
// destination, not the owner's scope (es writes both with `en`).
describe("a positional after put's own marker stays its destination", () => {
  const source = 'on click put the length of <p/> into the next <tbody/>';
  const english = translate(source, 'en', 'en');

  it('English', () => {
    expect(english).toBe("on click put <p/>'s length into next <tbody/>");
  });

  it.each(FOREIGN)('%s', language => {
    expect(translate(translate(source, 'en', language), language, 'en')).toBe(english);
  });
});

// A positional scope is read as the positional run it is (no query scope
// reader takes one). Before, English came back silently as `put <p/>'s length
// into next <tbody/> in me` once the scanner stopped refusing it.
it('a positional scope reads, its article dropped', () => {
  expect(translate('on click put the length of <p/> in the next <tbody/> into me', 'en', 'en')).toBe(
    'on click put the length of <p/> in next <tbody/> into me'
  );
});
