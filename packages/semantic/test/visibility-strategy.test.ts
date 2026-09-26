/**
 * `hide`/`show` keep their `with <strategy>`.
 *
 * The schemas' `style` role accepted only a literal, and a strategy is a name
 * (`opacity`) or a `*`-prefixed style ref (`*opacity`, which tokenizes as a
 * selector), so `hide me with *opacity` rendered `hide me`, in English and so
 * in every translation. Four languages needed more: de, fr and th hand-written
 * patterns outranked the generated one and ignored the phrase, and ms read
 * `saya dengan` (me + with) as the possessive `my dengan`. And ja marks a
 * strategy and a handler's event with the same `で`, so a bare `自分 を opacity
 * で 隠す` read as the patient-first handler `on opacity hide me`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const SHAPES = [
  'on click hide me with *opacity',
  'on click show #modal with *opacity',
  'on click hide me with opacity',
  // Bare, outside a handler: where th's and ja's failures showed.
  'hide me with *opacity',
  'show #modal with *opacity',
  'hide me with opacity',
];

describe('English keeps the strategy', () => {
  it.each(SHAPES)('%s', src => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });
});

describe.each(SHAPES)('%s, through every language', src => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});

it('buildAST hands core the strategy as the `with` modifier', () => {
  const { ast } = buildAST(parse('hide me with *opacity', 'en')!);
  expect((ast as { modifiers?: { with?: { value?: unknown } } }).modifiers?.with?.value).toBe(
    '*opacity'
  );
});
