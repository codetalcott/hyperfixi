/**
 * Value readings no other test pinned, found by the particle cluster's
 * mutation check (PR 87): each case below is a shape one piece of a rule in
 * `src/parser/value-reading.ts` protects alone, found by reverting that piece
 * and probing the shape its comment names.
 *
 * - The clause ends at `else` and at a loop's `end`, so a particle-shaped
 *   variable right before one is the value (es/it/pt `a`, their "to"). An
 *   `if` block's own `end` is stripped before its branch parses, so only a
 *   loop's reaches the rule.
 * - `not` before a particle-shaped operand and an operator is `not` (`set x to
 *   not a < 3`), not a variable spelled like `not` followed by a marker and its
 *   value (sw `weka si kwa #out`, which colliding-names.test.ts pins).
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const readBack = (source: string, language: string): string => {
  const foreign = render(parse(source, 'en')!, language);
  const back = parse(foreign, language);
  return back ? render(back, 'en') : `(no parse: ${foreign})`;
};

describe('value readings the particle cluster pins', () => {
  it.each([
    // The clause ends at `else`…
    ['es', 'on click if flag then set x to a else set x to 2 end then put x into #out'],
    ['it', 'on click if flag then set x to a else set x to 2 end then put x into #out'],
    ['pt', 'on click if flag then set x to a else set x to 2 end then put x into #out'],
    // …and at a loop's `end`.
    ['es', 'on click for n in arr set x to a end then put x into #out'],
    ['it', 'on click for n in arr set x to a end then put x into #out'],
    ['pt', 'on click for n in arr set x to a end then put x into #out'],
    // `not`, a particle-shaped operand, an operator.
    ['es', 'on click set x to not a < 3 then put x into #out'],
    ['it', 'on click set x to not a < 3 then put x into #out'],
    ['pt', 'on click set x to not a < 3 then put x into #out'],
    ['tr', 'on click set x to not a < 3 then put x into #out'],
    ['tr', 'on click set x to not i < 3 then put x into #out'],
    ['pl', 'on click put not na < 3 into #out'],
  ])('%s: %s', (language, source) => {
    expect(readBack(source, language)).toBe(render(parse(source, 'en')!, 'en'));
  });

  // In an operator run, a particle right before the operator is its first
  // operand. Where the value's tail is not ASCII, the expression parser cannot
  // read it whole, and the run is the only reader.
  it.each([
    ['ru', 'при click положить в + 1 в #out', 'on click put в + 1 into #out'],
    ['ja', 'クリック で で + 1 を #out に 置く', 'on click put で + 1 into #out'],
    ['zh', '一 点击 就 放置 在 + 1 到 #out', 'on click put 在 + 1 into #out'],
  ])('%s: %s', (language, source, english) => {
    expect(render(parse(source, language)!, 'en')).toBe(english);
  });
});
