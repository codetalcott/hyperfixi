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
import { parse, translate } from '../src/index';
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

  it.each(['es', 'ja', 'zh', 'ar', 'ko', 'tr', 'de', 'qu'])(
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

describe('what is no head clause', () => {
  it('a bare count outside English: a body there can open with a number', () => {
    expect(() => roundTrip('on click 1 put 1 into me', 'ja')).toThrow(/lose/);
    expect(headOf('al clic 3 repetir mientras x < 3 incrementar x fin', 'es')).toBeUndefined();
  });

  it('a command the reader does not read (`ask` has no schema yet)', () => {
    // No word of upstream's `on` opens it, so it is never the head's.
    expect(() => translate('on click ask "Name?" put it into me', 'en', 'en')).toThrow(/ask/);
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
