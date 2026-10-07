/**
 * Values read as written (M1 phase 3). Each was re-spaced or re-split into a
 * different expression, with every check green: a hyphen became a subtraction,
 * an array index a property of an array literal.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, render, translate } from '../src/index';

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
    expect(en('on click swap arr[0] with arr[2]')).toBe('on click swap arr [0] with arr [2]');
  });

  it.each(['swap into #t with it', 'swap over #modal with c', 'swap innerHTML of #t with x'])(
    '%s keeps its strategy',
    code => {
      const node = parse(code, 'en') as unknown as { roles: Map<string, unknown> };
      expect(node.roles.has('method')).toBe(true);
    }
  );
});
