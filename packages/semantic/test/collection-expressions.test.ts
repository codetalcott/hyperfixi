/**
 * Upstream 0.9.93's collection expressions (P57, M2 reliability row 8):
 * `<span/> in #box where it matches .a` keeps the items its condition holds
 * for, `matches mapped to its textContent` replaces each. They were refused in
 * every language, English too (the command-shape gate's LOUD
 * `collection-expressions` family), or kept as an English clause after the
 * command. They are now one value: semantic's expression parser reads both
 * operators (as the engine binds them: looser than `as`, tighter than
 * arithmetic), `where` is expression vocabulary, and `mapped to`'s `to` is the
 * operator's, never a marker. A translation writes the language's `where`, as
 * it already did in a condition, and `mapped to` in English (its dictionary
 * words wait on native review).
 *
 * Also here: what the shapes needed besides — an element-scoped variable
 * (`:items`) in the expression parser, the article in `in the closest <table/>`
 * and `checked of the :boxes`, and zh/tl's `no` before a sigil variable.
 */
import { describe, it, expect } from 'vitest';
import { translate, getSupportedLanguages } from '../src/index';
import { parseExpression } from '../src/ast-builder/expression-parser/parser';
import { readsAsOneExpression } from '../src/parser/utils/value-extent';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

/** Read back in every language. */
const EVERYWHERE = [
  'set :items to <span/> in #box where it matches .a on click put :items.length into me',
  'on click set m to items where it matches .yes',
  'on click set m to items mapped to its textContent',
  'on change if no :checkboxes log 1 end',
  'on change if no $n log 1 end',
];

describe.each(EVERYWHERE)('%s', source => {
  const english = translate(source, 'en', 'en');

  it('English reads it whole', () => {
    // A program comes back a feature to a line, its last one closed.
    const flat = (code: string): string => code.replace(/\s+/g, ' ').replace(/ end$/, '');
    expect(flat(english)).toBe(flat(source));
  });

  it.each(FOREIGN)('%s', language => {
    expect(translate(translate(source, 'en', language), language, 'en')).toBe(english);
  });
});

/** Read back in English and every language but the ones listed, which refuse (never silently). */
const MOSTLY: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    'set :others to <input[type=checkbox]/> in the closest <table/> where it is not me on click put :others.length into #out',
    [],
  ],
  // vi reads its `at end of me` since its `của tôi` (one `my` token) has a reader.
  ['on click repeat for x in :items where x.val > 10 put x.name at end of me end', []],
  // bn, th and vi refuse `checked of :boxes` without a collection too.
  ['on change set checked of the :checkboxes to my checked', ['bn', 'th', 'vi']],
  ['on click put matches mapped to its textContent into #out', ['bn', 'qu']],
];

describe.each(MOSTLY)('%s', (source, refusing) => {
  const english = translate(source, 'en', 'en');
  const flat = (code: string): string => code.replace(/\s+/g, ' ').replace(/ end$/, '');

  it('English reads it whole', () => {
    // The article before a positional or an `of`'s variable is noise, and English drops it.
    expect(flat(english)).toBe(
      flat(source).replace('in the closest', 'in closest').replace('of the :', 'of :')
    );
  });

  it.each(FOREIGN)('%s', language => {
    if (refusing.includes(language)) {
      expect(() => translate(translate(source, 'en', language), language, 'en')).toThrow();
      return;
    }
    expect(translate(translate(source, 'en', language), language, 'en')).toBe(english);
  });
});

describe('the expression parser', () => {
  const op = (src: string): string | undefined =>
    (parseExpression(src) as { node?: { operator?: string } }).node?.operator;

  it('reads both operators, each operand up to the next one', () => {
    expect(op('items where it matches .a')).toBe('where');
    expect(op('items mapped to its textContent')).toBe('mapped to');
    expect(op('items where it > 1 mapped to it * 2')).toBe('mapped to');
    expect(readsAsOneExpression('no :checkboxes where it is checked')).toBe(true);
    // `no` takes the collection, as the engine binds it.
    expect((parseExpression('no :c where it is checked') as { node?: { type: string } }).node?.type).toBe(
      'unaryExpression'
    );
  });

  it('reads an element-scoped variable where a value starts, and a colon touching a word as before', () => {
    expect(readsAsOneExpression(':items + 1')).toBe(true);
    expect(readsAsOneExpression('[:a, :b]')).toBe(true);
    expect((parseExpression('{a:b}') as { node?: { type: string } }).node?.type).toBe(
      'objectLiteral'
    );
    expect(op('x as Fixed:2')).toBeUndefined();
    expect(readsAsOneExpression('x as Fixed:2')).toBe(true);
  });

  it("skips the article before a positional and an `of`'s owner", () => {
    expect(readsAsOneExpression('<input/> in the closest <table/>')).toBe(true);
    expect(readsAsOneExpression('checked of the :checkboxes')).toBe(true);
  });
});

it('a variable named `mapped` keeps its marker', () => {
  expect(translate('set mapped to 5', 'en', 'en')).toBe('set mapped to 5');
  expect(translate(translate('set mapped to 5', 'en', 'es'), 'es', 'en')).toBe('set mapped to 5');
});
