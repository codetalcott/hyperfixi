/**
 * it, pl, ru and uk write `set` with its value right after its target, no
 * marker between (`impostare in .divs.innerHTML "foo"`), so where the target
 * ends is the reader's to say. Three readers ended it early:
 *
 * - a `.member` or `[index]` that touches the token before it is part of the
 *   value (`.divs.innerHTML`, `#d1.parentNode`, `bar["count"]`); the extent
 *   rule for an unbounded slot ran only through possessive links;
 * - a spaced `(` after a path opened the next value, not a call
 *   (`window.called ( window.called o 0 ) + 1`);
 * - English joined `bar["count"]` as `bar ["count"]`, which reads as a list
 *   where a value follows unmarked. Joined whole, qu keeps it one word, which
 *   the extent rule now takes as a name.
 */
import { describe, it, expect } from 'vitest';
import { translate } from '../src/index';

const squeeze = (s: string) => s.replace(/\s+/g, '');

describe.each(['it', 'pl', 'ru', 'uk'])('%s', language => {
  it.each([
    'on click set .divs.innerHTML to "foo"',
    'on click set innerHTML of #d1.parentNode to "foo"',
    'set window.called to (window.called or 0) + 1',
    'on click set x["count"] to y',
    "on click set element's bar[\"count\"] to 1",
  ])('%s', source => {
    const english = translate(source, 'en', 'en');
    const foreign = translate(source, 'en', language);
    expect(squeeze(translate(foreign, language, 'en')), foreign).toBe(squeeze(english));
  });

  it('a spaced value after a variable is still the value', () => {
    // `set :x to .item`: `:x .item`, spaced, is a variable and a class.
    expect(translate(translate('set :x to .item', 'en', language), language, 'en')).toBe(
      'set :x to .item'
    );
    expect(translate(translate('set x to [1, 2]', 'en', language), language, 'en')).toBe(
      'set x to [1, 2]'
    );
  });
});

it('English keeps an index against its name', () => {
  expect(translate('on click set x to bar["count"]', 'en', 'en')).toBe(
    'on click set x to bar["count"]'
  );
});

it("qu reads a possessive's indexed property, which its tokenizer keeps one word", () => {
  const source = "on click set element's bar[\"count\"] to 1";
  expect(translate(translate(source, 'en', 'qu'), 'qu', 'en')).toBe(source);
});

it('a spaced call keeps its old reading where a marker follows', () => {
  expect(translate('set x to target.closest ("li")', 'en', 'en')).toBe(
    'set x to target.closest("li")'
  );
});
