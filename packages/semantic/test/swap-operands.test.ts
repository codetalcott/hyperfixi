/**
 * `swap X with Y` where an operand is `me`, a variable or a property (was
 * OPEN_ITEMS P46). Only selector-with-selector round-tripped; the rest lost an
 * operand, or its property, in up to 21 languages. Four causes, each pinned below:
 *
 * - swap's patient took no reference or property path, and its destination no
 *   property path (the schema);
 * - a fused handler pattern binds the primary arg under `patient`, and its repair
 *   (re-parse the clause standalone) was vetoed when the canonical parse moved
 *   that value to `destination`, swap's primary role (semantic-parser);
 * - an optional role that read a value and declined it by type still consumed
 *   it: swap's marker-less `[{method}]` slot ate `mi textContent` (pattern-matcher);
 * - pl/uk's with-word is also their of-word, so `zamień el z #t` read as one
 *   operand, `#t's el` (pattern-matcher, scoped to swap).
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';
import type { SemanticNode } from '../src/types';

const FOREIGN = [
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
] as const;

const SHAPES = [
  'on click swap #a with #b',
  'on click swap #target with me',
  'on click swap me with #target',
  'on click swap :x with :y',
  'on click swap my textContent with #a',
  "on click swap #target's textContent with #b",
  "on click swap #target's textContent with my textContent",
  "on click swap #a's textContent with #b's textContent",
  'on click repeat for el in .x swap el with #t end',
  // Neighbours the matcher rules must leave alone (it's `di` is both `by` and `of`).
  "on click increment #counter's textContent by 2",
  "on click decrement #a's value by 5",
  "on click put 1 into #a's textContent",
];

const en = (src: string): string => render(parse(src, 'en')!, 'en');

describe('a swap keeps both operands in every language', () => {
  it.each(SHAPES)('English reads %s as written', src => {
    expect(en(src)).toBe(src);
  });

  it.each(FOREIGN.flatMap(lang => SHAPES.map(src => [lang, src] as const)))(
    '%s: %s',
    (lang, src) => {
      expect(render(parse(render(parse(src, 'en')!, lang), lang)!, 'en')).toBe(src);
    }
  );
});

describe('the matcher rules behind it', () => {
  const roles = (node: SemanticNode | null) => {
    const command = (node as { body?: SemanticNode[] })?.body?.[0] ?? node;
    return Object.fromEntries(
      [...(command?.roles ?? [])].map(([role, value]) => [role, value.type])
    );
  };

  it('an optional slot that declines a value does not consume it', () => {
    // `[{method}]` (literal only) read `mi textContent` and declined it; the
    // destination then saw `con` and the pattern failed.
    expect(roles(parse('intercambiar mi textContent con #a', 'es'))).toEqual({
      destination: 'property-path',
      patient: 'selector',
    });
  });

  it("pl/uk: swap's with-word is not read as an of-possessive", () => {
    expect(roles(parse('zamień el z #t', 'pl'))).toMatchObject({ patient: 'selector' });
    expect(roles(parse('поміняти el з #t', 'uk'))).toMatchObject({ patient: 'selector' });
  });
});
