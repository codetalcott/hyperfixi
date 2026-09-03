import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveLanguage } from '../src/language-resolver';

// Minimal DOM mock for testing
function createElement(
  tag: string,
  attrs: Record<string, string> = {},
  parent?: Element,
): Element {
  const elt = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    elt.setAttribute(key, value);
  }
  if (parent) {
    parent.appendChild(elt);
  }
  return elt;
}

describe('resolveLanguage', () => {
  it('returns data-lang from element', () => {
    const elt = createElement('button', { 'data-lang': 'ja' });
    expect(resolveLanguage(elt)).toBe('ja');
  });

  it('normalizes BCP-47 tags', () => {
    const elt = createElement('button', { 'data-lang': 'zh-Hans' });
    expect(resolveLanguage(elt)).toBe('zh');
  });

  it('returns data-hyperscript-lang from element', () => {
    const elt = createElement('button', { 'data-hyperscript-lang': 'ko' });
    expect(resolveLanguage(elt)).toBe('ko');
  });

  it('prefers data-lang over data-hyperscript-lang', () => {
    const elt = createElement('button', {
      'data-lang': 'ja',
      'data-hyperscript-lang': 'ko',
    });
    expect(resolveLanguage(elt)).toBe('ja');
  });

  it('inherits data-hyperscript-lang from ancestor', () => {
    const container = createElement('div', { 'data-hyperscript-lang': 'es' });
    document.body.appendChild(container);
    const elt = createElement('button', {}, container);
    expect(resolveLanguage(elt)).toBe('es');
    document.body.removeChild(container);
  });

  it('returns null for English elements (no preprocessing needed)', () => {
    const elt = createElement('button', {});
    // No language attribute set, document.documentElement.lang is empty
    expect(resolveLanguage(elt)).toBe(null);
  });

  it('reads document lang attribute', () => {
    const original = document.documentElement.lang;
    document.documentElement.lang = 'fr';
    try {
      const elt = createElement('button', {});
      document.body.appendChild(elt);
      expect(resolveLanguage(elt)).toBe('fr');
      document.body.removeChild(elt);
    } finally {
      document.documentElement.lang = original;
    }
  });

  it('ignores document lang=en', () => {
    const original = document.documentElement.lang;
    document.documentElement.lang = 'en';
    try {
      const elt = createElement('button', {});
      expect(resolveLanguage(elt)).toBe(null);
    } finally {
      document.documentElement.lang = original;
    }
  });

  // ── Standard `lang` cascade ────────────────────────────────────────

  it('inherits lang from an ancestor (the standard HTML cascade)', () => {
    const section = createElement('section', { lang: 'es' });
    document.body.appendChild(section);
    const elt = createElement('button', {}, section);
    expect(resolveLanguage(elt)).toBe('es');
    document.body.removeChild(section);
  });

  it('reads lang on the element itself', () => {
    const elt = createElement('button', { lang: 'ja' });
    document.body.appendChild(elt);
    expect(resolveLanguage(elt)).toBe('ja');
    document.body.removeChild(elt);
  });

  it('nearest lang ancestor wins — nested lang="en" opts back out of an es scope', () => {
    const section = createElement('section', { lang: 'es' });
    document.body.appendChild(section);
    const inner = createElement('div', { lang: 'en' }, section);
    const elt = createElement('button', {}, inner);
    expect(resolveLanguage(elt)).toBe('en');
    document.body.removeChild(section);
  });

  it('normalizes BCP-47 tags from the lang cascade', () => {
    const section = createElement('section', { lang: 'pt-BR' });
    document.body.appendChild(section);
    const elt = createElement('button', {}, section);
    expect(resolveLanguage(elt)).toBe('pt');
    document.body.removeChild(section);
  });

  it('data-lang on the element beats an ancestor lang', () => {
    const section = createElement('section', { lang: 'es' });
    document.body.appendChild(section);
    const elt = createElement('button', { 'data-lang': 'ja' }, section);
    expect(resolveLanguage(elt)).toBe('ja');
    document.body.removeChild(section);
  });

  it('data-hyperscript-lang ancestor beats the lang cascade (data-* overrides first)', () => {
    const outer = createElement('div', { 'data-hyperscript-lang': 'ko' });
    document.body.appendChild(outer);
    const section = createElement('section', { lang: 'es' }, outer);
    const elt = createElement('button', {}, section);
    expect(resolveLanguage(elt)).toBe('ko');
    document.body.removeChild(outer);
  });

  it('detached elements still fall back to the document lang', () => {
    const original = document.documentElement.lang;
    document.documentElement.lang = 'fr';
    try {
      // A fragment not yet inserted into the document: closest() cannot see
      // <html>, so the documentElement fallback carries the page default.
      const fragment = createElement('div', {});
      const elt = createElement('button', {}, fragment);
      expect(resolveLanguage(elt)).toBe('fr');
    } finally {
      document.documentElement.lang = original;
    }
  });
});
