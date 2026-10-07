/**
 * A value upstream reads whole that a tokenizer split where nothing spaces it
 * (M1 phase 3, group 5): an attribute with its value (`@data-foo=baz`) and a
 * name with its index or range (`:arr[1]`, `var[..3]`, `var[2 .. 3]`). The
 * reader kept the first part and dropped the rest; fused into one token, every
 * reader takes it as one value and every language writes it as written.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { tokenize, translate } from '../src/index';

const roundTrip = (code: string, language: string): string =>
  translate(translate(code, 'en', language), language, 'en');
const values = (code: string, language = 'en') => tokenize(code, language).tokens.map(t => t.value);

describe('one value, as upstream reads it', () => {
  it.each([
    ['on click add @data-foo=baz', '@data-foo=baz'],
    ['on click add @data-foo="blue green"', '@data-foo="blue green"'],
    ['on click take @data-foo=baz from .div', '@data-foo=baz'],
    ['on click remove :arr[1]', ':arr[1]'],
    ['on click put var[..3] as String into #d1', 'var[..3]'],
    ['on click put var[2 .. 3] as String into #d1', 'var[2 .. 3]'],
    ['on click increment arr[1]', 'arr[1]'],
  ])('%s', (code, value) => {
    expect(values(code)).toContain(value);
    expect(translate(code, 'en', 'en')).toBe(code);
  });

  it.each(['es', 'ja', 'ar', 'zh', 'ko', 'bn', 'ms', 'th'])(
    'every language writes it (%s)',
    language => {
      for (const code of [
        'on click add @data-foo=baz',
        'on click set :arr to [1,2,3,4] then remove :arr[1]',
        'on click set arr to [10, 20, 30] then increment arr[1] then put arr[1] into me',
        'on click put var[(index-1)..(index+1)] as String into #d1',
      ]) {
        expect(roundTrip(code, language)).toBe(code);
      }
    }
  );

  it("an index's words are the script's, never a language's", () => {
    // `index` is a word bn, ms and th translate; inside the range it is the variable.
    for (const language of ['bn', 'ms', 'th']) {
      expect(
        translate('on click put var[(index-1)..(index+1)] as String into #d1', 'en', language)
      ).toContain('var[(index-1)..(index+1)]');
    }
  });
});

describe('what a space keeps apart', () => {
  it('an attribute and a value written apart', () => {
    expect(values('add @data-foo = baz')).not.toContain('@data-foo=baz');
  });

  it('a name and a bracket written apart', () => {
    expect(values('put arr [1] into me')).not.toContain('arr[1]');
  });
});
