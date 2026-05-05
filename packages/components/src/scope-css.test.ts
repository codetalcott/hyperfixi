import { describe, it, expect, beforeEach } from 'vitest';
import { extractStyles, injectScopedStyles, _resetInjectedStylesForTest } from './scope-css';

describe('extractStyles', () => {
  it('returns the input unchanged when there are no <style> blocks', () => {
    const r = extractStyles('<div>hello</div>');
    expect(r.html).toBe('<div>hello</div>');
    expect(r.styles).toEqual([]);
  });

  it('strips a single <style> block and returns its body', () => {
    const r = extractStyles('<div>hi</div><style>.x { color: red; }</style><p>p</p>');
    expect(r.html).toBe('<div>hi</div><p>p</p>');
    expect(r.styles).toEqual(['.x { color: red; }']);
  });

  it('strips multiple <style> blocks and returns them in order', () => {
    const r = extractStyles('<style>a{}</style>mid<style>b{}</style>');
    expect(r.html).toBe('mid');
    expect(r.styles).toEqual(['a{}', 'b{}']);
  });

  it('handles attributes on the <style> tag', () => {
    const r = extractStyles('<style type="text/css">.x{}</style>');
    expect(r.styles).toEqual(['.x{}']);
    expect(r.html).toBe('');
  });

  it('preserves the inner whitespace of style content', () => {
    const css = '\n  .btn { padding: 4px; }\n';
    const r = extractStyles(`before<style>${css}</style>after`);
    expect(r.styles).toEqual([css]);
    expect(r.html).toBe('beforeafter');
  });
});

describe('injectScopedStyles', () => {
  beforeEach(() => {
    _resetInjectedStylesForTest();
  });

  it('does nothing when given no styles', () => {
    const before = document.head.querySelectorAll('style[data-component]').length;
    expect(injectScopedStyles('my-tag', [])).toBe(false);
    expect(document.head.querySelectorAll('style[data-component]').length).toBe(before);
  });

  it('appends a single <style data-component> wrapped in @scope', () => {
    expect(injectScopedStyles('my-tag', ['.btn { color: red; }'])).toBe(true);
    const el = document.head.querySelector('style[data-component="my-tag"]');
    expect(el).toBeTruthy();
    expect(el!.textContent).toContain('@scope (my-tag)');
    expect(el!.textContent).toContain('.btn { color: red; }');
  });

  it('joins multiple style blocks into one element with separate @scope rules', () => {
    expect(injectScopedStyles('my-card', ['.a {}', '.b {}'])).toBe(true);
    const el = document.head.querySelector('style[data-component="my-card"]');
    expect(el).toBeTruthy();
    const text = el!.textContent ?? '';
    expect(text.match(/@scope \(my-card\)/g)?.length).toBe(2);
    expect(text).toContain('.a {}');
    expect(text).toContain('.b {}');
  });

  it('is idempotent for the same tag name', () => {
    expect(injectScopedStyles('dedup-tag', ['.x {}'])).toBe(true);
    expect(injectScopedStyles('dedup-tag', ['.x {}'])).toBe(false);
    expect(injectScopedStyles('dedup-tag', ['.y {}'])).toBe(false);
    const matches = document.head.querySelectorAll('style[data-component="dedup-tag"]');
    expect(matches.length).toBe(1);
  });

  it('keeps distinct components in distinct <style> elements', () => {
    expect(injectScopedStyles('comp-a', ['.a {}'])).toBe(true);
    expect(injectScopedStyles('comp-b', ['.b {}'])).toBe(true);
    expect(document.head.querySelector('style[data-component="comp-a"]')).toBeTruthy();
    expect(document.head.querySelector('style[data-component="comp-b"]')).toBeTruthy();
  });
});
