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
 * `ni tupu` stays `is empty`.
 *
 * ar, hi, id, qu, sw, th and tr spelled `null` with their word for `empty`
 * (`فارغ`, `खाली`, `kosong`, `chusaq`, `tupu`, `ว่าง`, `boş`), so `is null` and
 * `is empty` read back as one of them: `"" is empty` as `"" is null` (false),
 * or in sw `x is null` as `x is empty` (#325). They write `null` as `null` now,
 * as de, ja, ms and pl do, and the word after a copula is `empty`; alone it is
 * still `null`, as the old rendering wrote it.
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

// Each language's word for `empty` (what `is empty` writes; th writes `ล้าง`,
// and its `null` was `ว่าง`), and how the old rendering wrote `put null into
// #out` with the one word, which still reads as `put null`. (hi's old
// rendering does not: a lone `खाली` heading the clause is its `empty` command,
// whose alternative it is, and read that way before this change too.)
const ONE_WORD: Record<string, { empty: string; oldPutNull?: string }> = {
  ar: { empty: 'فارغ', oldPutNull: 'على النقر ضع فارغ في #out' },
  hi: { empty: 'खाली' },
  id: { empty: 'kosong', oldPutNull: 'ketika klik taruh kosong ke dalam #out' },
  qu: { empty: 'chusaq', oldPutNull: 'maykama click chusaq ta #out man churay' },
  sw: { empty: 'tupu', oldPutNull: 'unapo click weka tupu kwa #out' },
  th: { empty: 'ล้าง', oldPutNull: 'เมื่อ click ใส่ ว่าง ใน #out' },
  tr: { empty: 'boş', oldPutNull: 'tıklama i üzerinde boş i #out e koy' },
};

describe.each(Object.keys(ONE_WORD))('%s: `null` and `empty` read back apart', language => {
  it.each([
    'on click put null into #out',
    'on click set x to null then put x into #out',
    'on click if p is null then put 1 into #out end',
    'on click if p is not null then put 1 into #out end',
    'on click if p is empty then put 1 into #out end',
    'on click if p is not empty then put 1 into #out end',
    'on click put "" is null into #out',
    'on click put "" is empty into #out',
    'on click put null is empty into #out',
    'on click empty #out',
  ])('%s', source => {
    const [back, foreign] = roundTrip(source, language);
    expect(back, foreign).toBe(render(parse(source, 'en')!, 'en'));
  });

  it('writes `null` as `null`, and `empty` as its word', () => {
    const foreign = render(parse('on click if p is empty put null into #out end', 'en')!, language);
    expect(foreign).toContain(' null ');
    expect(foreign).toContain(ONE_WORD[language]!.empty);
  });

  it.skipIf(!ONE_WORD[language]!.oldPutNull)('still reads the old rendering of `put null`', () => {
    expect(render(parse(ONE_WORD[language]!.oldPutNull!, language)!, 'en')).toBe(
      'on click put null into #out'
    );
  });
});

// A keyword operand before an ambiguous copula (ar `هو` is also `it`, hi `है`
// also `has`, th `เป็น` also `as`): the copula read `is` after a word or a
// literal, not after `true` or `{}`, and before a predicate keyword, which the
// English `null` in a translation is not (ar and id read it as a keyword with
// no normalized form, hi and th as a word).
describe.each([
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
])('%s: a keyword operand before the copula', language => {
  it.each([
    'on click put true is null into #out',
    'on click put {} is null into #out',
    'on click put null is null into #out',
    'on click put true is not null into #out',
    'on click put null is not empty into #out',
    'on click put {} is not empty into #out',
  ])('%s', source => {
    const [back, foreign] = roundTrip(source, language);
    expect(back, foreign).toBe(render(parse(source, 'en')!, 'en'));
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
