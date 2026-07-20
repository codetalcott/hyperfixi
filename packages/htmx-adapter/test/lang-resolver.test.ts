import { describe, it, expect } from 'vitest';
import { langOf, normLang } from '../src/lang-resolver.js';

describe('normLang', () => {
  it('collapses regional variants and case', () => {
    expect(normLang('es-MX')).toBe('es');
    expect(normLang('ES_mx')).toBe('es');
    expect(normLang('ja')).toBe('ja');
  });

  it('defaults to en for empty input', () => {
    expect(normLang(null)).toBe('en');
    expect(normLang(undefined)).toBe('en');
    expect(normLang('')).toBe('en');
  });
});

describe('langOf', () => {
  it('resolves data-hyperfixi-lang on the element first', () => {
    document.body.innerHTML = `<div lang="ja"><button data-hyperfixi-lang="es"></button></div>`;
    expect(langOf(document.querySelector('button')!)).toBe('es');
  });

  it('resolves data-hyperfixi-lang on an ancestor over lang', () => {
    document.body.innerHTML = `<div data-hyperfixi-lang="ar"><section lang="ja"><button></button></section></div>`;
    // data-hyperfixi-lang wins per resolution order (explicit override tier).
    expect(langOf(document.querySelector('button')!)).toBe('ar');
  });

  it('falls back to nearest lang ancestor', () => {
    document.body.innerHTML = `<section lang="es-MX"><button></button></section>`;
    expect(langOf(document.querySelector('button')!)).toBe('es');
  });

  it('defaults to en with no lang in scope', () => {
    document.body.innerHTML = `<button></button>`;
    expect(langOf(document.querySelector('button')!)).toBe('en');
  });

  it('supports mixed-language sections on one page', () => {
    document.body.innerHTML = `
      <section lang="es"><button id="a"></button></section>
      <section lang="ja"><button id="b"></button></section>`;
    expect(langOf(document.getElementById('a')!)).toBe('es');
    expect(langOf(document.getElementById('b')!)).toBe('ja');
  });
});
