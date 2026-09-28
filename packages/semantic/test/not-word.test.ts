/**
 * `not`, where the language's word for it is also another word.
 *
 * qu `mana` is both `not` and `false`, and read as `false` everywhere: `2 is
 * not 6` came back `put 6`, `not flag` lost its `not`. `false` never takes an
 * operand, so before one (a literal `true`, `false` or `null` too) `mana` is
 * `not`; before a marker, the end or the
 * verb it is still `false` (`if p is false put 1 into #out`).
 *
 * `if not`, where the language's two words are one keyword:
 *
 * bn `যদি না` is also its `unless`, and vi `nếu không` an `else` ("otherwise"),
 * and each tokenizer took the pair whole: `if not flag … else … end` read back
 * bn `unless me`, vi a bare `put`. Where an operand follows the pair and none
 * precedes it, it is `if` and `not`: bn writes `unless` after its condition
 * (`flag যদি না`), and vi's `else` follows a branch and runs into a verb.
 *
 * hi `नहीं` was `not` and `no` alike, and both take an operand, so position
 * could not tell them apart: `not flag` read back `no flag`, `no .w` lost its
 * `no`. hi writes `no` as `कोई नहीं` ("none") now, which its tokenizer takes
 * whole, and `नहीं` alone is `not`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const roundTrip = (source: string, language: string): string => {
  const foreign = render(parse(source, 'en')!, language);
  const back = parse(foreign, language);
  return back ? render(back, 'en') : `(no parse: ${foreign})`;
};

describe('hi `नहीं` is `not`, and `कोई नहीं` is `no`', () => {
  it.each([
    'on click put not flag into #out',
    'on click put not false into #out',
    'on click put no flag into #out',
    'on click put no .w into #out',
    'on click if not flag put "Y" into #out end',
    'on click if no .w put "Y" into #out end',
    'on click put x is not empty into #out',
    'on click if #a does not match .x put "Y" into #out end',
  ])('%s', source => {
    expect(roundTrip(source, 'hi')).toBe(source);
  });

  it('writes `no` as `कोई नहीं`', () => {
    expect(render(parse('on click put no .w into #out', 'en')!, 'hi')).toContain('कोई नहीं .w');
  });
});

describe.each(['bn', 'vi'])('%s', language => {
  it.each([
    'on click if not flag put "Y" into #out else put "N" into #out end',
    'on click if not true put "Y" into #out end',
    'on click if not flag or n is 6 put "Y" into #out end',
    'on click if not #a put "Y" into #out end',
    'on click if flag put "Y" into #out else put "N" into #out end',
  ])('%s', source => {
    expect(roundTrip(source, language)).toBe(source);
  });

  it('unless is still unless', () => {
    expect(roundTrip('on click unless flag put "Y" into #out end', language)).toBe(
      'on click unless flag then put "Y" into #out'
    );
  });
});

it('vi `nếu không` before a verb is still `else`', () => {
  expect(
    render(parse('khi click nếu flag đặt "Y" vào #out nếu không đặt "N" vào #out kết thúc', 'vi')!, 'en')
  ).toBe('on click if flag put "Y" into #out else put "N" into #out end');
});

it('vi `nếu không` between two verbs is still `else`', () => {
  expect(render(parse('khi click nếu flag ẩn nếu không hiện kết thúc', 'vi')!, 'en')).toBe(
    'on click if flag hide else show end'
  );
});

describe('bn `যদি না` after its condition is still `unless`', () => {
  it.each([
    'ক্লিক তে flag যদি না তারপর "Y" কে #out এ রাখুন',
    // An operand after it too: what precedes the pair decides.
    'ক্লিক তে flag যদি না "Y" কে #out এ রাখুন',
  ])('%s', code => {
    expect(render(parse(code, 'bn')!, 'en')).toBe('on click unless flag then put "Y" into #out');
  });
});

describe('qu `mana`', () => {
  it.each([
    'on click put 2 is not 6 into #out',
    'on click set x to n is not 6 then put x into #out',
    'on click put not flag into #out',
    'on click put not true into #out',
    // `false` is `mana` too: `mana mana`.
    'on click put not false into #out',
    'on click put x is not null into #out',
    'on click if not flag put "Y" into #out end',
    'on click if p is not 1 put 1 into #out end',
    'on click if p is false put 1 into #out end',
    'on click put p is false into #out',
    'on click set x to false then put x into #out',
  ])('%s', source => {
    expect(roundTrip(source, 'qu')).toBe(source);
  });
});
