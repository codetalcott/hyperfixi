/**
 * The last silent pairs of the command-shape gate (2026-10-13): four readings of a
 * render that came back as other English, each a reader fix.
 *
 * - pl writes `closest X to Y`'s `to` in English, as every language does, and read it
 *   as its own `to` (`it`): `closest .bar it .foo`.
 * - `closest @foo` queries an attribute, which every tokenizer reads as an identifier,
 *   so the positional run declined it and sw's `karibu` (a particle) stayed in the value.
 * - qu read a chain of `'s` as a single-quoted string between the two apostrophes.
 * - id `saya punya @data-x` (my @data-x) read `punya` as the property when an
 *   attribute followed.
 */
import { describe, it, expect } from 'vitest';
import { translate, tokenize } from '../src/index';

function roundTrip(source: string, language: string): string {
  return translate(translate(source, 'en', language), language, 'en');
}

describe('silent pairs: a render reads back as its source', () => {
  it.each([
    ['on click add .doh to closest .bar to .foo', 'pl'],
    ['on click set (closest @foo to #d1) to "doh"', 'pl'],
    ['on click set (closest @foo to #d1) to "doh"', 'sw'],
  ])('%s (%s)', (source, language) => {
    expect(roundTrip(source, language)).toBe(source);
  });

  it.each([
    ["when $data's inner's val changes put it into me", 'qu', "when $data's inner's val changes"],
    [
      "when ($obj's x + $obj's y) changes put it into me",
      'qu',
      "when ( $obj's x + $obj's y ) changes",
    ],
    ['when my @data-x changes put it into me', 'id', 'when my @data-x changes'],
  ])('%s (%s)', (source, language, head) => {
    expect(roundTrip(source, language).split('\n')[0]).toBe(head);
  });

  it('closest @foo reads in English, as a set target and a put value', () => {
    expect(translate('on click set closest @foo to "doh"', 'en', 'en')).toBe(
      'on click set closest @foo to "doh"'
    );
    expect(translate('on click put closest @foo into me', 'en', 'en')).toBe(
      'on click put closest @foo into me'
    );
  });
});

describe("qu tokenizer: a possessive 's is not a string opener", () => {
  const values = (input: string) => tokenize(input, 'qu').tokens.map(t => t.value);

  it("reads no string between the two 's of a chain", () => {
    // A word keeps a mid-word apostrophe (`inner's`, as `t'ika`); the reader takes it.
    expect(values("$data's inner's val")).toEqual(['$data', "'s", "inner's", 'val']);
  });

  it('still reads a single-quoted string after a space or a bracket', () => {
    expect(values("willay 'Saved!'")).toContain("'Saved!'");
    expect(values("('s x')")).toContain("'s x'");
  });

  it("keeps a glottalized word's apostrophe inside the word", () => {
    expect(values("t'ika")).toEqual(["t'ika"]);
  });
});
