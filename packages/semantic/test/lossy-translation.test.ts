/**
 * translate() refuses a translation that would lose part of the script
 * (src/explicit/lossy.ts). The command-shape gate (testing-framework) measures
 * these checks over every script upstream's suite holds; this pins each one.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { LossyTranslationError, parse, translate } from '../src/index';
import {
  actionDifference,
  clauseDifference,
  findTranslationLoss,
  invariantValues,
  lostRoles,
  missingInvariants,
  unconsumedSpans,
} from '../src/explicit/lossy';

function refusal(input: string, from: string, to: string): LossyTranslationError {
  try {
    translate(input, from, to);
  } catch (e) {
    if (e instanceof LossyTranslationError) return e;
    throw e;
  }
  throw new Error(`translate(${JSON.stringify(input)}, ${from}, ${to}) was not refused`);
}

describe('translate() refuses a lossy translation', () => {
  // A clause in the language's own words (es `cuando`, when) is that language
  // unread, never English kept as written.
  const unreadSpanish = 'al clic alternar .foo cuando .bar';

  it('truncation: a part the parse does not read', () => {
    const e = refusal(unreadSpanish, 'es', 'en');
    expect(e.loss).toEqual({ kind: 'truncation', lost: ['cuando .bar'] });
    expect(e.partial).not.toContain('.bar');
    expect([e.from, e.to]).toEqual(['es', 'en']);
    expect(e.message).toContain('cuando .bar');
  });

  it('refuses in English too: en → en is the round trip', () => {
    expect(refusal("on click halt the event's bubbling", 'en', 'en').loss.kind).toBe('truncation');
  });

  it('core-only: a form only core ran that upstream reads with another meaning', () => {
    // Upstream and the engine read `swap morph of #t with it` as an exchange of
    // #t's `morph` property with `it`: no spelling of core's morph, in any language.
    for (const to of ['en', 'es', 'ja']) {
      expect(refusal('on click swap morph of #t with it', 'en', to).loss).toEqual({
        kind: 'core-only',
        lost: ['swap morph'],
      });
    }
    expect(refusal('on click swap none of #t with it', 'en', 'en').loss.lost).toEqual([
      'swap none',
    ]);
    // A strategy with no content: core threw, upstream reads `innerHTML of #t`.
    expect(refusal('on click swap innerHTML #t', 'en', 'en').loss.lost).toEqual(['swap innerHTML']);
    // In a finally clause too.
    expect(
      refusal('on click log 1 finally swap outermorph of #t with it', 'en', 'en').loss.kind
    ).toBe('core-only');
    // A strategy upstream spells, and an exchange of two values, translate.
    expect(translate('on click swap into #t with it', 'en', 'en')).toBe('on click put it into #t');
    expect(translate('on click swap #a with #b', 'en', 'en')).toBe('on click swap #a with #b');
  });

  it("`lossy: 'allow'` returns the partial output instead", () => {
    const partial = translate(unreadSpanish, 'es', 'en', { lossy: 'allow' });
    expect(partial).toBe(refusal(unreadSpanish, 'es', 'en').partial);
  });

  it('leaves a whole translation alone', () => {
    expect(translate('on click toggle .active on #menu', 'en', 'ja')).toBe(
      translate('on click toggle .active on #menu', 'en', 'ja', { lossy: 'allow' })
    );
    expect(translate('on click increment :n by 2 then put :n into #out', 'en', 'en')).toBe(
      'on click increment :n by 2 then put :n into #out'
    );
  });
});

describe('the checks, one at a time', () => {
  const node = parse('on click toggle .a then add .b', 'en');

  it('truncation reads the spans off the top node', () => {
    expect(unconsumedSpans(parse("on click halt the event's bubbling", 'en'))).toEqual([
      "' s bubbling",
    ]);
    expect(unconsumedSpans(node)).toEqual([]);
  });

  it('read-back: an output that does not read', () => {
    const loss = findTranslationLoss('x', node, 'out', 'en', () => {
      throw new Error('no parse');
    });
    expect(loss?.kind).toBe('read-back');
  });

  it('read-back: an output that reads back with other commands, counted', () => {
    const fewer = parse('on click toggle .a', 'en');
    expect(findTranslationLoss('x', node, 'out', 'en', () => fewer)).toEqual({
      kind: 'read-back',
      lost: ['-add'],
    });
    const twice = parse('on click toggle .a then toggle .b', 'en');
    expect(actionDifference(fewer, twice)).toEqual(['+toggle']);
  });

  it('read-back: an output its own reader leaves partly unread', () => {
    const unread = parse("on click halt the event's bubbling", 'en');
    expect(findTranslationLoss('x', node, 'out', 'en', () => unread)).toEqual({
      kind: 'read-back',
      lost: ["' s bubbling"],
    });
  });

  it('invariant: a verbatim value the output lacks', () => {
    const loss = findTranslationLoss(
      'on click toggle .a then add .b',
      node,
      'add .b',
      'en',
      () => node
    );
    expect(loss).toEqual({ kind: 'invariant', lost: ['.a'] });
  });
});

describe('invariantValues', () => {
  const values = (text: string): string[] => [...invariantValues(text).keys()];

  it('reads strings, numbers, refs and sigil names', () => {
    expect(values(`put "a b" into #out then add .c to <p.x/> then set @data-x to 2.5`)).toEqual([
      '"a b"',
      '#out',
      '.c',
      '<p.x/>',
      '@data-x',
      '2.5',
    ]);
    expect(values('set :x to $y + ^z then set *color to 1')).toEqual([
      ':x',
      '$y',
      '^z',
      '*color',
      '1',
    ]);
  });

  it('a dot or hash after a word is a property, in any script', () => {
    expect(values('put my.innerHTML into #a')).toEqual(['#a']);
    expect(values('положить я.innerHTML в #a')).toEqual(['#a']);
  });

  it('an apostrophe inside a word is not a quote', () => {
    expect(values("set #a's value to 'x'")).toEqual(['#a', '"x"']);
    expect(values("прив'язати $isDark до я")).toEqual(['$isDark']);
  });

  it('a name ends where an SOV particle is written onto it', () => {
    expect(values('#d1の*color を 切り替え')).toEqual(['#d1', '*color']);
    expect(values('#d1의 값')).toEqual(['#d1']);
  });

  it('counts repeats', () => {
    expect(missingInvariants('add .a then add .a', 'add .a')).toEqual(['.a']);
    expect(missingInvariants("put 'x' into #o", 'put "x" into #o')).toEqual([]);
  });
});

describe('read-back against what English writes (upstream spelling)', () => {
  it('a spelling that wraps a command is the same program', () => {
    expect(
      translate(
        "on click swap #a's textContent with #b's textContent using view transition",
        'en',
        'en'
      )
    ).toContain('start view transition');
  });

  it('a spelling that respells a command is the same program', () => {
    expect(translate("on click prepend #d1's value to #out", 'en', 'en')).toBe(
      "on click put #d1's value at start of #out"
    );
  });
});
// A command can read back with its roles changed and its count unchanged: the
// foreign `wait for <event>` renders read back as `wait <duration>` (`wait bar`
// waits a variable's time), and `put … at start of` was written with the
// language's `at end of`. Measured on the command-shape gate before it was
// enforced: no translation that passed is refused.
describe('the read-back sees a lost role', () => {
  it('a role the source wrote that the read-back lacks', () => {
    expect(lostRoles(parse('on foo wait for bar', 'en'), parse('on foo wait bar', 'en'))).toEqual([
      '-wait.event',
    ]);
  });

  it("a put's position", () => {
    expect(
      lostRoles(
        parse('on click put 1 at start of #a', 'en'),
        parse('on click put 1 at end of #a', 'en')
      )
    ).toEqual(['-put.manner=at start of']);
  });

  it('not a default the read-back writes out, nor one it fills in', () => {
    expect(lostRoles(parse('on click hide', 'en'), parse('on click hide me', 'en'))).toEqual([]);
    expect(
      lostRoles(parse('repeat forever log 1 end', 'en'), parse('repeat forever log 1 end', 'en'))
    ).toEqual([]);
  });

  // ar writes `repeat forever`'s form as a word it reads back; English reads it
  // as a pattern default (implicit): the form is not lost.
  it('a role the read-back holds as a default is not lost (ar → en, repeat forever)', () => {
    const code = 'def f() repeat forever set x to x + 1 end end';
    expect(() => translate(translate(code, 'en', 'ar'), 'ar', 'en')).not.toThrow();
  });

  it.each(['es', 'ja', 'de'])('refuses a dropped wait-for in %s', language => {
    expect(() => translate('on foo wait for bar then log 1', 'en', language)).toThrow(
      LossyTranslationError
    );
  });
});

describe('the read-back keeps every clause kept as written', () => {
  const kept = parse('on click take .a from .b when it matches .c', 'en');
  const bare = parse('on click take .a from .b', 'en');

  it('a clause the read-back lacks is lost', () => {
    expect(findTranslationLoss('x', kept, 'out', 'en', () => bare)).toEqual({
      kind: 'read-back',
      lost: ['-clause take: when it matches .c'],
    });
  });

  it('a clause only the read-back has is a part the source never read that way', () => {
    expect(clauseDifference(bare, kept)).toEqual(['+clause take: when it matches .c']);
    expect(clauseDifference(kept, kept)).toEqual([]);
  });

  it('a clause read onto another command is lost from its own', () => {
    const moved = parse('on click toggle .a when it matches .c', 'en');
    expect(clauseDifference(kept, moved)).toEqual([
      '-clause take: when it matches .c',
      '+clause toggle: when it matches .c',
    ]);
  });

  it('an unread run in a translation into English is refused, not kept', () => {
    // The Spanish reader leaves `cuando .bar` unread; the English reader would
    // keep the same words, written into the output, as a clause.
    expect(refusal('al clic alternar .foo cuando .bar', 'es', 'en').loss.kind).toBe('truncation');
  });
});
