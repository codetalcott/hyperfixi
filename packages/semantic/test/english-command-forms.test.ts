/**
 * Command forms upstream reads that English refused (M1 step 3): each case
 * was refused in all 24 lanes of the command-shape gate.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { translate } from '../src/index';

const roundTrip = (code: string, language: string): string =>
  translate(translate(code, 'en', language), language, 'en');

describe('`put … at the start of` / `at the end of`', () => {
  it.each([
    ['on click put "x" at the start of #out', 'on click put "x" at start of #out'],
    ['on click put "x" at the end of me', 'on click put "x" at end of me'],
    // Its `end` is the position's, not a block's.
    [
      'on click if x put "x" at the end of me end then log 1',
      'on click if x put "x" at end of me end then log 1',
    ],
  ])('%s', (code, english) => {
    expect(translate(code, 'en', 'en')).toBe(english);
  });
});

describe('`remove` takes a value from a collection, and a style block', () => {
  it.each([
    'on click remove 3 from :arr',
    'on click remove "b" from :s',
    'on click remove {color} from me',
    'on click remove {color; font-weight} from me',
  ])('%s', code => {
    expect(translate(code, 'en', 'en')).toBe(code);
    for (const language of ['es', 'ja', 'ar', 'tr']) expect(roundTrip(code, language)).toBe(code);
  });

  it('an element or a class still', () => {
    expect(translate('on click remove .a from #b', 'en', 'en')).toBe('on click remove .a from #b');
    expect(translate('on click remove me', 'en', 'en')).toBe('on click remove me');
  });
});

describe('`otherwise` is `else`', () => {
  it.each(['de', 'es', 'ja', 'zh'])('in a translation from English (%s)', language => {
    // de wrote `andernfalls` inside the condition, and read it back there.
    expect(roundTrip('on click if false otherwise put "foo" into me', language)).toBe(
      'on click if false else put "foo" into me end'
    );
  });

  it('English writes `else`', () => {
    expect(translate('on click if x log 1 otherwise log 2 end', 'en', 'en')).toBe(
      'on click if x log 1 else log 2 end'
    );
  });

  it('a variable named so is still one', () => {
    expect(translate('on click set otherwise to 1 then log otherwise', 'en', 'en')).toBe(
      'on click set otherwise to 1 then log otherwise'
    );
  });
});

describe('head words: `on every <event>`, `init immediately`', () => {
  it.each(['en', 'es', 'ja', 'ar', 'tr', 'qu'])('%s', language => {
    expect(roundTrip('on every click log 1', language)).toBe('on every click log 1');
    expect(roundTrip('init immediately set window.bar to 42 end', language)).toBe(
      'init immediately\n  set window.bar to 42\nend'
    );
  });

  it('`on first click` is still once', () => {
    expect(translate('on first click log 1', 'en', 'en')).toBe('on first click log 1');
  });
});
