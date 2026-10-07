/**
 * Values read as written (M1 phase 3). Each was re-spaced or re-split into a
 * different expression, with every check green: a hyphen became a subtraction,
 * an array index a property of an array literal.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { getSupportedLanguages, parse, render, tokenize, translate } from '../src/index';
import { readsAsOneExpression } from '../src/parser/utils/value-extent';

const en = (code: string) => render(parse(code, 'en'), 'en');

describe('a style block keeps its spacing', () => {
  it('`font-family` stays one word', () => {
    expect(en('on click add {color: red; font-family: monospace}')).toBe(
      'on click add {color: red; font-family: monospace}'
    );
  });

  it.each(['es', 'ja', 'ar'])('round-trips in %s', language => {
    const code = 'on click add {color: red; font-family: monospace}';
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(code);
  });
});

describe("show's strategy argument is read raw, as upstream reads it", () => {
  it.each([
    ['on click show .c1 with display:inline-block', 'on click show .c1 with display:inline-block'],
    ['on click show .c1 with display: inline-block', 'on click show .c1 with display:inline-block'],
    [
      'on click show .c1 with display:flex then log 1',
      'on click show .c1 with display:flex then log 1',
    ],
    ['on click show me with opacity', 'on click show me with opacity'],
    ['on click show me with *opacity', 'on click show me with *opacity'],
  ])('%s', (code, english) => {
    expect(en(code)).toBe(english);
  });

  it.each(['es', 'ja', 'ar', 'ko'])('round-trips in %s', language => {
    const code = 'on click show .c1 with display:inline-block';
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(code);
  });
});

describe("a swap's strategy is one of core's words", () => {
  it('any other value is the first of the two the swap exchanges', () => {
    const node = parse('on click swap arr[0] with arr[2]', 'en') as unknown as {
      body: Array<{ roles: Map<string, unknown> }>;
    };
    expect(node.body[0]!.roles.has('method')).toBe(false);
    expect(en('on click swap arr[0] with arr[2]')).toBe('on click swap arr[0] with arr[2]');
  });

  it.each(['swap into #t with it', 'swap over #modal with c', 'swap innerHTML of #t with x'])(
    '%s keeps its strategy',
    code => {
      const node = parse(code, 'en') as unknown as { roles: Map<string, unknown> };
      expect(node.roles.has('method')).toBe(true);
    }
  );
});

describe('a number with a CSS unit is one value (`100px`)', () => {
  // Upstream reads `100px` as one string (its stringPostfixExpression). Every
  // tokenizer split it, so `set my *width to 100px` was refused in all 24.
  const languages = getSupportedLanguages();

  it.each(languages)('`set my *width to 100px` round-trips in %s', language => {
    const code = 'on click set my *width to 100px';
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(code);
  });

  it.each([
    'on click transition my *width to 100px',
    'on click put 50% into #out',
    'on click set x to 1.5rem then put x into #out',
    'on click put 50% + "q" into #out',
  ])('%s', code => {
    expect(translate(code, 'en', 'en')).toBe(code);
    expect(translate(translate(code, 'en', 'ja'), 'ja', 'en')).toBe(code);
  });

  it('a `%` with an operand touching it, or spaced, is the operator', () => {
    expect(tokenize('set x to 5%2', 'en').tokens.map(t => t.value)).toEqual([
      'set',
      'x',
      'to',
      '5',
      '%',
      '2',
    ]);
    expect(en('on click put n % 4 into #out')).toBe('on click put n % 4 into #out');
  });

  it('a length ends its value: `50% "Y"` is two values, not `50 % "Y"`', () => {
    expect(readsAsOneExpression('50% x')).toBe(false);
    expect(readsAsOneExpression('50% + 2')).toBe(true);
    expect(readsAsOneExpression('5 % 2')).toBe(true);
  });
});

describe('a DOM property spelled like a swap strategy is a property', () => {
  // `innerHTML` and `outerHTML` were English keywords (swap's strategies), so
  // `set innerHTML of #d1 to …` named no property and was refused.
  it.each([
    ['on click set innerHTML of #d1 to "foo"', `on click set #d1's innerHTML to "foo"`],
    ['on click increment innerHTML of #d1', `on click increment #d1's innerHTML`],
    ['on click swap innerHTML of #t with "x"', 'on click put "x" into #t'],
  ])('%s', (code, english) => {
    expect(translate(code, 'en', 'en')).toBe(english);
  });
});

describe('a quoted string holding a quote is written so it still closes', () => {
  // Written back in double quotes, `'<div _="…">'` closed at its first `"`.
  it.each([
    `on click set #t to '<div _="on click log 1">new</div>'`,
    'on click put "<b id=\\"q\\">a</b>" into me',
  ])('%s', code => {
    expect(translate(code, 'en', 'en')).toBe(code);
    expect(translate(translate(code, 'en', 'es'), 'es', 'en')).toBe(code);
  });
});

it("`don't throw` is upstream's contraction of `do not throw`", () => {
  expect(translate("on click fetch /test don't throw then put it into me", 'en', 'en')).toBe(
    'on click fetch "/test" as text do not throw then put it into me'
  );
});
