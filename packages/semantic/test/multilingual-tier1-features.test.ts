/**
 * Multilingual roadmap — Tier 1 parser features.
 *
 * Regression guards for the structural parser work that cleared the
 * `last-in-collection`, `set-color-variable`, and `input-clear` failures in
 * ar+tl (see docs-internal/MULTILINGUAL_ROADMAP.md). Each fails even in English
 * at the bare-command level today, so these tests assert genuine parsing rather
 * than the degenerate event-handler match.
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse, tokenize } from '../src';

function tokens(input: string, language = 'en') {
  return tokenize(input, language).tokens;
}

describe('Tag-less query selector tokenization (<.class/>, <#id/>, <[attr]/>)', () => {
  it('keeps <.message/> as a single selector token', () => {
    const t = tokens('scroll to last <.message/> in #chat');
    expect(t.some(tk => tk.kind === 'selector' && tk.value === '<.message/>')).toBe(true);
  });

  it('keeps <#id/> and <[attr]/> whole', () => {
    expect(tokens('<#main/>').some(tk => tk.value === '<#main/>')).toBe(true);
    expect(tokens('<[data-x=1]/>').some(tk => tk.value === '<[data-x=1]/>')).toBe(true);
  });

  it('does not mis-extract a less-than comparison (a < b)', () => {
    // The lone "<" must not swallow " b" as a tag-less selector.
    const t = tokens('a < b');
    expect(t.some(tk => tk.kind === 'selector' && tk.value.includes('b'))).toBe(false);
  });

  it('still tokenizes a normal tag selector <button/>', () => {
    expect(tokens('toggle .active on <button/>').some(tk => tk.value === '<button/>')).toBe(true);
  });
});

describe('Positional query expressions (last/first <sel> in <src>)', () => {
  const cases: [string, string][] = [
    ['scroll to last <.message/> in #chat', 'en'],
    ['scroll to first <.message/> in #chat', 'en'],
    ['تمرير إلى آخر <.message/> في #chat', 'ar'],
    ['iscroll sa huli <.message/> sa_loob #chat', 'tl'],
  ];
  for (const [input, lang] of cases) {
    it(`parses "${input}" (${lang})`, () => {
      expect(canParse(input, lang)).toBe(true);
      expect(parse(input, lang).action).toBe('scroll');
    });
  }

  it('does not consume a trailing command after the positional query', () => {
    // The optional source clause must not swallow the next selector if no marker
    // precedes it; plain scroll still works.
    expect(parse('scroll to #chat', 'en').action).toBe('scroll');
  });
});

describe('"of"-possessive set (set <prop> of <owner> to <value>)', () => {
  const cases: [string, string][] = [
    ['set the *--primary-color of #theme to "#ff6600"', 'en'],
    ['اضبط the *--primary-color من #theme إلى "#ff6600"', 'ar'],
    ['itakda the *--primary-color ng #theme sa "#ff6600"', 'tl'],
  ];
  for (const [input, lang] of cases) {
    it(`parses "${input}" (${lang})`, () => {
      expect(canParse(input, lang)).toBe(true);
      expect(parse(input, lang).action).toBe('set');
    });
  }

  it('does not regress simple set or source extraction', () => {
    expect(parse('set x to 5', 'en').action).toBe('set');
    expect(parse('set my innerHTML to "hi"', 'en').action).toBe('set');
    // The "of"-matcher is gated to property-path roles (set), so get's source
    // role is unaffected.
    expect(parse('get data from #input', 'en').action).toBe('get');
  });
});

describe('Member access on a queried element (previous <input/>.value)', () => {
  const cases: [string, string][] = [
    ['set previous <input/>.value to ""', 'en'],
    ['اضبط السابق <input/>.value إلى "" عند نقر', 'ar'],
    ['itakda nakaraan <input/>.value sa "" kapag click', 'tl'],
  ];
  for (const [input, lang] of cases) {
    it(`parses "${input}" (${lang})`, () => {
      expect(canParse(input, lang)).toBe(true);
    });
  }
});
