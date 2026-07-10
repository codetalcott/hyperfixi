/**
 * CssSelectorExtractor Tests
 *
 * Covers pseudo-class/pseudo-element consumption: a colon immediately
 * following a base selector is a pseudo segment (`#x:hover`, `.a:not(.b)`),
 * kept inside the ONE selector token so it reaches querySelector whole. This
 * used to split in every language including English (`#x` + `:hover`
 * variable-ref). Whitespace remains the discriminator: `.foo :bar` is a
 * selector followed by a local-variable reference.
 */
import { describe, it, expect } from 'vitest';
import { extractCssSelector, CssSelectorExtractor } from '../../src/tokenizers/extractors/css-selector';

describe('extractCssSelector — pseudo-class/pseudo-element segments', () => {
  it('consumes a pseudo-class after an id selector', () => {
    expect(extractCssSelector('#x:hover', 0)).toBe('#x:hover');
  });

  it('consumes a functional pseudo-class with parenthesized argument', () => {
    expect(extractCssSelector('.a:not(.b)', 0)).toBe('.a:not(.b)');
    expect(extractCssSelector('.a:nth-child(2n+1)', 0)).toBe('.a:nth-child(2n+1)');
  });

  it('consumes a pseudo-element (double colon)', () => {
    expect(extractCssSelector('.a::before', 0)).toBe('.a::before');
  });

  it('consumes chained pseudo segments', () => {
    expect(extractCssSelector('.a:not(.b):hover', 0)).toBe('.a:not(.b):hover');
  });

  it('consumes pseudo segments after an attribute selector', () => {
    expect(extractCssSelector('[data-x]:checked', 0)).toBe('[data-x]:checked');
  });

  it('consumes pseudo segments inside the <query/> form', () => {
    expect(extractCssSelector('<.foo:hover/>', 0)).toBe('<.foo:hover/>');
  });

  it('stops before a non-pseudo colon tail', () => {
    // `:2` / trailing `:` are not pseudo names — the colon stays outside
    expect(extractCssSelector('#x:2', 0)).toBe('#x');
    expect(extractCssSelector('#x:', 0)).toBe('#x');
  });

  it('does not consume an unbalanced functional argument', () => {
    expect(extractCssSelector('.a:not(', 0)).toBe('.a');
  });

  it('does not attach pseudo segments to @attr or *prop references', () => {
    // Attribute/style refs are not element queries — `:hover` after them is
    // left for the variable-ref path, same as before.
    expect(extractCssSelector('@disabled:hover', 0)).toBe('@disabled');
    expect(extractCssSelector('*opacity:hover', 0)).toBe('*opacity');
  });

  it('does not attach pseudo segments to the dynamic .{cls} form', () => {
    expect(extractCssSelector('.{cls}:hover', 0)).toBe('.{cls}');
  });

  it('stops at whitespace — spaced :name stays a separate token', () => {
    expect(extractCssSelector('.foo :bar', 0)).toBe('.foo');
  });
});

describe('CssSelectorExtractor', () => {
  const ex = new CssSelectorExtractor();

  it('extracts the fused selector with css-selector metadata', () => {
    const r = ex.extract('#x:hover on me', 0);
    expect(r?.value).toBe('#x:hover');
    expect(r?.length).toBe('#x:hover'.length);
    expect(r?.metadata?.type).toBe('css-selector');
  });
});
