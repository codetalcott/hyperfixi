/**
 * English parses that CHANGED A PROGRAM'S MEANING, and so every translation of
 * it (each is `render(parse_en(src), L)`): the "MEANING" family of the
 * en-reference-preservation allowlist (testing-framework). Every recall signal
 * missed them, because each translation faithfully reproduced its broken
 * reference.
 *
 *   go-back       `go back` rendered `go url back`: a navigation to a page named
 *                 "back". The renderer's value pins read extraction DEFAULTS
 *                 only, and go's `url` variant records its keyword as a fixed
 *                 VALUE, so it rendered every `go`.
 *   repeat-while  the loop head's condition kept `#counter.innerText` and
 *                 dropped `< 10`, so the loop no longer ended.
 *   worker-basic  `return a + b` became `return +`: en read `a` as the article,
 *                 and es/it/pt/tr read it as their preposition marker.
 *
 * Each case is checked in English and round-tripped through every language:
 * render in L, parse back in L, render in English.
 */

import { describe, expect, it } from 'vitest';
import { parseSemantic, render } from '../src';
import { SUPPORTED_LANGUAGES } from '../src/language-loader';

type Node = Parameters<typeof render>[0];

function en(src: string): string | null {
  const node = parseSemantic(src, 'en').node;
  return node ? render(node, 'en') : null;
}

/** English → L → English. */
function roundTrip(src: string, language: string): string | null {
  const node = parseSemantic(src, 'en').node;
  if (!node) return null;
  const back = parseSemantic(render(node, language), language).node;
  return back ? render(back as Node, 'en') : null;
}

const FOREIGN = SUPPORTED_LANGUAGES.filter(l => l !== 'en');

describe('go back is history navigation, not a page named "back"', () => {
  it('renders as written in English', () => {
    expect(en('on click go back')).toBe('on click go back');
  });

  it.each(FOREIGN)('round-trips through %s', language => {
    expect(roundTrip('on click go back', language)).toBe('on click go back');
  });

  it('keeps `url` where the source wrote it', () => {
    expect(en('on click go to url "/page"')).toBe('on click go url "/page"');
  });
});

describe('a repeat-while condition is the whole comparison', () => {
  const src = 'on click repeat while #counter.innerText < 10 increment #counter wait 200ms end';

  it('keeps `< 10` in English', () => {
    expect(en(src)).toBe(
      'on click repeat while #counter.innerText < 10 increment #counter then wait 200ms end'
    );
  });

  it.each(FOREIGN)('round-trips through %s', language => {
    expect(roundTrip(src, language)).toBe(en(src));
  });

  it('chains through `and`', () => {
    expect(en('on click repeat while x < 10 and y != "a" increment x end')).toBe(
      'on click repeat while x < 10 and y != "a" increment x end'
    );
  });

  it('still stops at the first body command', () => {
    expect(en('on click repeat while x < 10 log x end')).toBe(
      'on click repeat while x < 10 log x end'
    );
  });
});

describe('`a` before an operator is a variable', () => {
  it.each([
    'on click set x to a - 1',
    'on click log a * 2',
    'on click put a + b into #o',
    'on click put b + a into #o',
  ])('English keeps `%s`', src => {
    expect(en(src)).toBe(src);
  });

  it('`a` before a query literal is still the article', () => {
    expect(en('on click make a <div.card/> then put it into #c')).toBe(
      'on click make <div.card/> then put it into #c'
    );
  });

  const WORKER = 'worker Calculator\n  def add(a, b)\n    return a + b\n  end\nend';

  it('keeps `return a + b` in the worker row', () => {
    expect(en(WORKER)).toContain('return a + b');
  });

  it.each(FOREIGN)('the worker row round-trips through %s', language => {
    expect(roundTrip(WORKER, language)).toContain('return a + b');
  });

  // In es/it/pt `a` is the preposition "to", so the second operand is a particle.
  it.each(['es', 'it', 'pt'])('`b + a` round-trips through %s', language => {
    expect(roundTrip('on click put b + a into #o', language)).toBe('on click put b + a into #o');
  });

  it('a marker glued to a negative number stays a marker (es `añadir 5 a -1`)', () => {
    const node = parseSemantic('añadir 5 a -1', 'es').node as {
      roles: Map<string, { type: string; value?: unknown }>;
    };
    expect(node.roles.get('patient')).toMatchObject({ type: 'literal', value: 5 });
  });
});
