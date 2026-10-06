/**
 * Input the parser used to leave unread while the rest parsed: each one now
 * reads whole, so translate()'s truncation check does not refuse it.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, render, translate } from '../src/index';
import { blankComments } from '../src/parser/utils/comments';
import { unconsumedSpans } from '../src/explicit/lossy';

const reads = (code: string, language: string) => {
  const node = parse(code, language);
  return { unread: unconsumedSpans(node), english: render(node, 'en') };
};

describe('a comment is read as the engine reads it: not at all', () => {
  it('`--` and `//` to the end of the line', () => {
    expect(reads('on click put 1 into me -- a note', 'en')).toEqual({
      unread: [],
      english: 'on click put 1 into me',
    });
    expect(reads('on click put 1 into me // a note\nadd .a', 'en')).toEqual({
      unread: [],
      english: 'on click put 1 into me then add .a',
    });
  });

  it('is blanked, so every offset holds', () => {
    const code = 'put 1 into me -- note\nadd .a';
    expect(blankComments(code)).toHaveLength(code.length);
    expect(blankComments(code)).toBe('put 1 into me        \nadd .a');
  });

  it('a URL, a string and a `--` with a word after it are not comments', () => {
    expect(blankComments('fetch http://x.com/a')).toBe('fetch http://x.com/a');
    expect(blankComments(`put "a -- b" into me`)).toBe(`put "a -- b" into me`);
    expect(blankComments(`set #a's x to 'a // b'`)).toBe(`set #a's x to 'a // b'`);
    // As the engine reads it: `--` then a word is not a comment, `--` then the end is.
    expect(blankComments('set x to a--b')).toBe('set x to a--b');
    expect(blankComments('set x to y--')).toBe('set x to y  ');
  });
});

describe('a time unit after a space is the duration', () => {
  it.each([
    ['wait 10 ms', 'wait 10ms'],
    ['wait 2 seconds', 'wait 2s'],
    ['wait 1 s then log 1', 'wait 1s then log 1'],
    ['wait 5 milliseconds', 'wait 5ms'],
  ])('%s', (code, english) => {
    expect(reads(code, 'en')).toEqual({ unread: [], english });
  });

  it('only a unit word ends it', () => {
    expect(reads('repeat 3 times log 1 end', 'en').unread).toEqual([]);
    // `2 seconds` was two milliseconds in every language.
    expect(translate('wait 2 seconds', 'en', 'ja')).toContain('2s');
  });
});

describe('bn reads its own polite verb forms whole', () => {
  it.each([
    'on click toggle .foo',
    'on click empty #d1',
    'on click increment :n then put :n into me',
    'on click decrement :n',
  ])('%s', code => {
    const bn = translate(code, 'en', 'bn');
    expect(reads(bn, 'bn')).toEqual({ unread: [], english: code });
  });
});
