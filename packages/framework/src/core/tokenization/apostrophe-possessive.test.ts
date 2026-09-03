/**
 * A word-glued apostrophe is the possessive marker, not a string opener.
 *
 * `(#price's value * #qty's value)` used to lex `'s value * #qty'` as ONE
 * string literal — the first apostrophe opened a string that the second closed
 * — which swallowed the operator and hid the property noun from translation in
 * every language that renders the `'s` fallback (hi `#price's मान`, pl
 * `#price's wartość`, …), so their English renders carried a non-ASCII
 * identifier the canonical parser rejects ("Unknown token: ś"). A quote that
 * opens a string always follows whitespace, punctuation, or the start of input.
 */
import { describe, it, expect } from 'vitest';
import { StringLiteralExtractor } from '../../interfaces/value-extractor';

const extractor = new StringLiteralExtractor();

describe('StringLiteralExtractor: apostrophe after a word character', () => {
  it.each([
    ["#price's value", 6],
    ["it's value", 2],
    ["(#qty's value)", 5],
    ["items[0]'s value", 8],
  ])('does not open a string at the possessive in %s', (input, position) => {
    expect(input[position]).toBe("'");
    expect(extractor.canExtract(input, position)).toBe(false);
  });

  it.each([
    ["put 'hello' into me", 4],
    ["log 'a' + 'b'", 4],
    ["log 'a' + 'b'", 10],
    ["'leading'", 0],
    ["items['a']", 6],
    ["call f('x')", 7],
  ])('still opens a string after whitespace/punctuation/start in %s', (input, position) => {
    expect(extractor.canExtract(input, position)).toBe(true);
  });

  it('extracts the whole quoted string once opened', () => {
    expect(extractor.extract("'hello' rest", 0)).toEqual({ value: "'hello'", length: 7 });
  });
});
