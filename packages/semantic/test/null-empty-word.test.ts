/**
 * The word for `null` that reads as `empty`.
 *
 * sw spells `null` and the `is empty` predicate alike, `tupu`, and its
 * tokenizer reads the word as `empty`. vi spells `null` `rỗng`, which its
 * tokenizer read as `empty` too, though vi's `empty` is `trống` (and the
 * command's `làm-rỗng`). So `put null into #out` wrote the text "empty" in
 * both, on the direct path.
 *
 * vi's tokenizer now reads `rỗng` as `null`, its lexicon's and the i18n
 * dictionary's sense. sw's word stays `empty`, but `empty` is a predicate or a
 * command, never a whole value, so a role that captures the word alone
 * captured `null`; and in a value it is `null` except after a copula, where
 * `ni tupu` stays `is empty` (#325: sw writes `is null` the same way).
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';

const roundTrip = (source: string, language: string): [string, string] => {
  const foreign = render(parse(source, 'en')!, language);
  return [render(parse(foreign, language)!, 'en'), foreign];
};

describe.each(['sw', 'vi'])('%s: `null` reads back', language => {
  it.each([
    'on click put null into #out',
    'on click set x to null then put x into #out',
    'on click put p == null into #out',
    'on click put [null, 1] into #out',
    'on click if p is empty then put 1 into #out end',
    'on click if p is not empty then put 1 into #out end',
    'on click empty #out',
  ])('%s', source => {
    const [back, foreign] = roundTrip(source, language);
    expect(back, foreign).toBe(render(parse(source, 'en')!, 'en'));
  });

  it('the direct path writes null, not the word', () => {
    const foreign = render(parse('on click put null into #out', 'en')!, language);
    expect(JSON.stringify(buildAST(parse(foreign, language)!).ast)).not.toContain('"empty"');
  });
});

describe('vi: `is null` is not `is empty`', () => {
  it.each([
    'on click if p is null then put 1 into #out end',
    'on click if p is not null then put 1 into #out end',
  ])('%s', source => {
    const [back, foreign] = roundTrip(source, 'vi');
    expect(back, foreign).toBe(render(parse(source, 'en')!, 'en'));
  });
});

describe('sw: after a copula the word is still `empty`', () => {
  // sw writes `is null` and `is empty` alike (`ni tupu`), and reads both as
  // `is empty` (#325).
  it.each([
    ['on click if p is null then put 1 into #out end', 'p is empty'],
    ['on click if p is not null then put 1 into #out end', 'p is not empty'],
  ])('%s', (source, condition) => {
    const [back, foreign] = roundTrip(source, 'sw');
    expect(back, foreign).toContain(condition);
  });
});

describe('ms: `kosong` is `empty`', () => {
  // ms's lexicon and the i18n dictionary write `empty` as `kosong` (and `null`
  // as `null`), and its tokenizer read `kosong` as `null`: `"" is empty` read
  // back `"" is null`, which is false.
  it.each([
    'on click put "" is empty into #out',
    'on click put "" is not empty into #out',
    'on click if s is empty put "Y" into #out end',
    'on click put x is null into #out',
    'on click put null into #out',
    'on click empty #out',
  ])('%s', source => {
    const [back, foreign] = roundTrip(source, 'ms');
    expect(back, foreign).toBe(render(parse(source, 'en')!, 'en'));
  });

  it('a whole-value `kosong` is still null', () => {
    expect(render(parse('letak kosong ke #out', 'ms')!, 'en')).toBe('put null into #out');
  });
});

describe('a whole-value `empty` is null in English too', () => {
  // An unset variable named `empty`, which upstream writes as null. The word
  // was a string, "empty".
  it('put empty into #out', () => {
    expect(render(parse('on click put empty into #out', 'en')!, 'en')).toBe(
      'on click put null into #out'
    );
  });
});
