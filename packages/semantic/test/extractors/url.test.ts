/**
 * UrlExtractor Tests
 *
 * Covers `${…}` interpolation spans inside URLs: the whitespace-terminator
 * scan used to cut `/api/search?q=${my value}` at the space inside the
 * interpolation, truncating the en reference for event-debounce and junking
 * every SOV parse of the same row (R1 deferred-tail Family E,
 * docs-internal/HANDOFF_r1-deferred-tail.md). A `${` that opens inside a URL
 * candidate is consumed through its matching `}` — whitespace and balanced
 * inner braces included — before the plain scan resumes. An UNCLOSED `${`
 * carries no span and keeps the legacy stop-at-whitespace behavior.
 */
import { describe, it, expect } from 'vitest';
import { extractUrl, UrlExtractor } from '../../src/tokenizers/extractors/url';

describe('extractUrl — plain URLs (legacy behavior unchanged)', () => {
  it('extracts each prefix form to the first whitespace', () => {
    expect(extractUrl('/api/data then log it', 0)).toBe('/api/data');
    expect(extractUrl('./rel/path x', 0)).toBe('./rel/path');
    expect(extractUrl('../up/path x', 0)).toBe('../up/path');
    expect(extractUrl('//cdn.example.com/lib.js x', 0)).toBe('//cdn.example.com/lib.js');
    expect(extractUrl('http://x.com/a b', 0)).toBe('http://x.com/a');
    expect(extractUrl('https://x.com/a b', 0)).toBe('https://x.com/a');
  });

  it('returns the bare prefix when nothing follows', () => {
    expect(extractUrl('/ alone', 0)).toBe('/');
  });

  it('returns null off a URL prefix', () => {
    expect(extractUrl('.active on me', 0)).toBeNull();
  });
});

describe('extractUrl — ${…} interpolation spans (Family E)', () => {
  it('carries a whitespace-bearing interpolation whole (the event-debounce shape)', () => {
    expect(extractUrl('/api/search?q=${my value} as json', 0)).toBe('/api/search?q=${my value}');
  });

  it('carries spans in absolute and relative forms, resuming the plain scan after', () => {
    expect(extractUrl('https://x.com/a?b=${c d}&e=1 rest', 0)).toBe('https://x.com/a?b=${c d}&e=1');
    expect(extractUrl('./rel/${a b}/tail x', 0)).toBe('./rel/${a b}/tail');
  });

  it('balances inner braces inside the span', () => {
    expect(extractUrl('/api?q=${fn({a:1}) ok}z w', 0)).toBe('/api?q=${fn({a:1}) ok}z');
  });

  it('an unclosed ${ keeps the legacy whitespace cut', () => {
    expect(extractUrl('/api?q=${unclosed rest', 0)).toBe('/api?q=${unclosed');
  });

  it('a bare $ without { is an ordinary URL character', () => {
    expect(extractUrl('/api?price=$5 x', 0)).toBe('/api?price=$5');
  });
});

describe('UrlExtractor — extract() length spans the interpolation', () => {
  it('reports the full span length so the tokenizer consumes past the inner space', () => {
    const r = new UrlExtractor().extract('/api/search?q=${my value} as json', 0);
    expect(r?.value).toBe('/api/search?q=${my value}');
    expect(r?.length).toBe('/api/search?q=${my value}'.length);
  });
});
