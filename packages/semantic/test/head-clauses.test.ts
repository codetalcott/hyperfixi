/**
 * What upstream's `on` reads between the event and the body and no event
 * pattern models (`on click elsewhere`, a count `on click 1 to 2`, `on mutation
 * of attributes`, `on foo queue first`, `on x having threshold 0.1`) is the
 * handler's head clause: kept as written and written after the head, in every
 * language (M1 phase 3). Before, it was dropped and the handler ran on every
 * event, or never.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, translate, getSupportedLanguages } from '../src/index';
import { findTranslationLoss } from '../src/explicit/lossy';

const roundTrip = (code: string, language: string): string =>
  translate(translate(code, 'en', language), language, 'en');

const headOf = (code: string, language = 'en'): string | undefined =>
  (parse(code, language) as { headClause?: string }).headClause;

describe("the head clause upstream's `on` reads", () => {
  it.each([
    ['on click elsewhere add .clicked', 'elsewhere'],
    ['on click 1 put 1 into me', '1'],
    ['on click 1 to 2 put 1 into me', '1 to 2'],
    ['on mutation of attributes put "m" into me', 'of attributes'],
    ['on mutation of attributes from #d1 put "m" into me', 'of attributes from #d1'],
    ['on click in #d1 put it into window.tmp', 'in #d1'],
    ['on foo queue first log 1', 'queue first'],
    ['on intersection(seen) having threshold 0.1 log seen', 'having threshold 0.1'],
  ])('%s', (code, head) => {
    expect(headOf(code)).toBe(head);
    expect(translate(code, 'en', 'en')).toBe(code);
  });

  // bn, it and th: a head pattern that ends in an action slot, which takes the
  // clause and rewinds; the clause is read there too.
  it.each(['es', 'ja', 'zh', 'ar', 'ko', 'tr', 'de', 'qu', 'bn', 'it', 'th'])(
    'every language writes it (%s)',
    language => {
      for (const code of [
        'on click elsewhere add .clicked',
        'on mutation of attributes from #d1 put "m" into me',
        'on click 1 to 2 put 1 into me',
      ]) {
        expect(roundTrip(code, language)).toBe(code);
      }
    }
  );

  it("after the whole head: zh's closes on 就", () => {
    expect(translate('on click elsewhere add .clicked', 'en', 'zh')).toMatch(/就 elsewhere/);
  });

  it('a tool that checks the script still sees it', () => {
    const node = parse('on click elsewhere add .clicked', 'en') as {
      diagnostics?: Array<{ code?: string }>;
    };
    expect(node.diagnostics?.some(d => d.code === 'verbatim-clause')).toBe(true);
  });

  it('the read-back must keep it', () => {
    const kept = parse('on click elsewhere add .clicked', 'en');
    const bare = parse('on click add .clicked', 'en');
    expect(findTranslationLoss('x', kept, 'out', 'en', () => bare)).toEqual({
      kind: 'read-back',
      lost: ['-clause on: elsewhere'],
    });
  });
});

// Upstream's count (`on click 1`, the first click only), as its test pages and
// the scoping tests write it: refused in all 23 languages before (the command-
// shape gate's families `on`, `core/scoping`, `hide`, `transition`).
const COUNTS = [
  'on click 1 hide on click 2 show',
  'on click 1 set x to 10 on click 2 set @out to x',
  'on click 1 default global x to 0 on click 2 set global x to 10 on click 3 set @out to x',
  'on click 1 put 1 + my.innerHTML as Int into my.innerHTML',
  'on click 1 put "one" into me on click 3 put "three" into me on click 2 put "two" into me',
  'on click 1 transition my *width to 100px on click 2 transition my *width to initial',
  'behavior Behave(foo) on click 1 set foo to foo + 10 on click 2 set @out to foo end',
  'on click 2 put 3 into me',
  'on keydown 2 log 1 then log 2',
];

describe('a bare count, in every language', () => {
  it.each(getSupportedLanguages().filter(l => l !== 'en'))('%s', language => {
    for (const code of COUNTS) expect(roundTrip(code, language)).toBe(translate(code, 'en', 'en'));
  });

  it('is read where no command begins at the number', () => {
    expect(headOf('al clic 3 repetir mientras x < 3 incrementar x fin', 'es')).toBe('3');
    expect(headOf('クリックで 1 xを 10に 設定', 'ja')).toBe('1');
    // A number that is the body's first value is the body's (`3を`).
    expect(headOf('クリックで 3を 自分に 置く', 'ja')).toBeUndefined();
  });
});

describe('what is no head clause', () => {
  it('a count the reader does not take: refused, never dropped', () => {
    // pl's `to` is its `it`, and a run holding the language's own word is unread.
    expect(() => translate('on click 1 to 2 put 1 into me', 'en', 'pl')).toThrow(/lose/);
    // Before a block head in ko, bn, hi: the head's run never finds the `if`.
    expect(() => translate('on click 1 if x is 1 log 2 end', 'en', 'ko')).toThrow(/lose/);
    // A generated pattern takes the number as its first slot (ja repeat's form, tr fetch's source).
    expect(() => translate('on click 1 repeat 3 times log 1 end', 'en', 'ja')).toThrow(/lose/);
    expect(() => translate('on click 1 fetch /test then put it into me', 'en', 'tr')).toThrow(/lose/);
  });

  it('a clause the reader does not read (halt’s `default` mode, P56)', () => {
    // No word of upstream's `on` opens it, so it is never the head's.
    expect(() => translate('on click halt default put 1 into me', 'en', 'en')).toThrow(/default/);
  });

  it('a number that opens the body: a count is `1` or `1 to 2`', () => {
    for (const language of ['ja', 'hi', 'ko', 'tr']) {
      expect(roundTrip('on click put 2 is in [1, 2, 6] into #out', language)).toBe(
        'on click put 2 is in [1, 2, 6] into #out'
      );
      expect(roundTrip('on click repeat 3 + 3 times put "a" at end of me end', language)).toBe(
        'on click repeat 3 + 3 times put "a" at end of me end'
      );
      expect(headOf(translate('on first click put 1 + 2 into me', 'en', language), language)).toBe(
        undefined
      );
    }
  });

  it('a run of more than eight words before the first command', () => {
    expect(() =>
      translate('on click of x1 x2 x3 x4 x5 x6 x7 x8 x9 put 1 into me', 'en', 'en')
    ).toThrow(/lose/);
  });

  it("a run in the reading language's own words", () => {
    expect(() => translate('al clic elsewhere cuando agregar .x', 'es', 'en')).toThrow(/lose/);
  });

  it('a behavior inside a behavior, which no node here holds, is reported unread', () => {
    expect(() =>
      translate(
        'behavior A(x) on click 1 log x on click 2 log x behavior B(x) on click 3 log x',
        'en',
        'en'
      )
    ).toThrow(/behavior B/);
  });
});
