/**
 * A query of a pseudo-class alone (`<:checked/>`, upstream's reactive-query
 * tests) in every language (M2 reliability row 8). The tokenizers read `<`
 * and then `:checked` as a local variable, so the query was refused in every
 * language, English too (the command-shape gate's LOUD `pseudo-class-query`
 * family). A tag or class before the colon (`<input:checked/>`) was read.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate, getSupportedLanguages } from '../src/index';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

const SHAPES = [
  'when (the length of <:checked/> in #container) changes put it into me',
  'when (the length of <:checked/> in #scope) changes put it into me then increment $runs',
  'on click put the length of <:checked/> into me',
  'on click add .done to <:checked/>',
  'on change set x to <:checked/> then log x',
  'on click toggle .on on <:not(.done)/>',
];

// A reader writes `when (x)` back as `when ( x )`, which the engine reads alike.
const unspaced = (code: string): string => code.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

describe.each(SHAPES)('%s', source => {
  it('English reads it', () => {
    expect(translate(source, 'en', 'en')).toContain('<:');
  });

  it.each(FOREIGN)('%s', language => {
    const rendered = translate(source, 'en', language);
    expect(rendered).toContain('<:');
    expect(unspaced(translate(rendered, language, 'en'))).toBe(translate(source, 'en', 'en'));
  });
});

it('the query is a selector, not a variable', () => {
  const node = parse('add .done to <:checked/>', 'en') as {
    roles: Map<string, { type: string; value?: string }>;
  };
  expect(node.roles.get('destination')).toMatchObject({ type: 'selector', value: '<:checked/>' });
});
