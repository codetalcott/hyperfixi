/**
 * Tests for the per-element lang resolver and vocab orchestrator.
 * Phase 8b of htmx-v4-reactive-streaming.md.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { register, isLangRegistered, resetOrchestrator } from '../i18n-orchestrator.js';
import { getHooks, resetHooks } from '../i18n-hooks.js';
import { langOf, normLang } from '../lang-resolver.js';

describe('lang-resolver', () => {
  describe('normLang', () => {
    it('lowercases and strips regional suffix', () => {
      expect(normLang('es-MX')).toBe('es');
      expect(normLang('PT_BR')).toBe('pt');
      expect(normLang('FR')).toBe('fr');
    });

    it('returns "en" for empty / null / undefined', () => {
      expect(normLang('')).toBe('en');
      expect(normLang(null)).toBe('en');
      expect(normLang(undefined)).toBe('en');
    });
  });

  describe('langOf', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => container.remove());

    it('reads data-hyperfixi-lang on the element itself first', () => {
      const el = document.createElement('div');
      el.setAttribute('data-hyperfixi-lang', 'ja-JP');
      container.appendChild(el);
      expect(langOf(el)).toBe('ja');
    });

    it('walks ancestors for data-hyperfixi-lang', () => {
      const section = document.createElement('section');
      section.setAttribute('data-hyperfixi-lang', 'es');
      const button = document.createElement('button');
      section.appendChild(button);
      container.appendChild(section);
      expect(langOf(button)).toBe('es');
    });

    it('falls back to ancestor lang= when no data-hyperfixi-lang found', () => {
      const section = document.createElement('section');
      section.setAttribute('lang', 'ar-SA');
      const button = document.createElement('button');
      section.appendChild(button);
      container.appendChild(section);
      expect(langOf(button)).toBe('ar');
    });

    it('defaults to "en" when no lang attribute found anywhere', () => {
      const el = document.createElement('div');
      container.appendChild(el);
      expect(langOf(el)).toBe('en');
    });

    it('data-hyperfixi-lang takes priority over ancestor lang=', () => {
      const html = document.createElement('section');
      html.setAttribute('lang', 'fr');
      const el = document.createElement('div');
      el.setAttribute('data-hyperfixi-lang', 'de');
      html.appendChild(el);
      container.appendChild(html);
      expect(langOf(el)).toBe('de');
    });
  });
});

describe('i18n-orchestrator', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    resetOrchestrator();
    resetHooks();
  });

  afterEach(() => {
    container.remove();
    resetOrchestrator();
    resetHooks();
  });

  describe('register', () => {
    it('stores vocab and reports the language as registered', () => {
      register('es', { hyperfixi: { attrs: { 'hx-acción': 'hx-get' } } });
      expect(isLangRegistered('es')).toBe(true);
      expect(isLangRegistered('ja')).toBe(false);
    });

    it('normalizes regional variants to base code', () => {
      register('es-MX', { hyperfixi: { attrs: { 'hx-jalar': 'hx-get' } } });
      expect(isLangRegistered('es')).toBe(true);
      expect(isLangRegistered('es-MX')).toBe(true);
    });
  });

  describe('nameOf hook (Spanish vocab)', () => {
    beforeEach(() => {
      register('es', {
        hyperfixi: {
          attrs: {
            'hx-acción': 'hx-get',
            'hx-objetivo': 'hx-target',
            'sse-conectar': 'sse-connect',
            'ws-enviar': 'ws-send',
          },
          events: { clic: 'click' },
        },
      });
    });

    it('returns the Spanish form for elements in Spanish scope', () => {
      const section = document.createElement('section');
      section.setAttribute('lang', 'es');
      const button = document.createElement('button');
      section.appendChild(button);
      container.appendChild(section);
      const hooks = getHooks();
      expect(hooks.nameOf(button, 'hx', 'get')).toBe('hx-acción');
      expect(hooks.nameOf(button, 'hx', 'target')).toBe('hx-objetivo');
      expect(hooks.nameOf(button, 'sse', 'connect')).toBe('sse-conectar');
      expect(hooks.nameOf(button, 'ws', 'send')).toBe('ws-enviar');
    });

    it('falls back to canonical English for unmapped keys', () => {
      const section = document.createElement('section');
      section.setAttribute('lang', 'es');
      const button = document.createElement('button');
      section.appendChild(button);
      container.appendChild(section);
      // hx-swap is NOT in the vocab — falls back to English literal.
      expect(getHooks().nameOf(button, 'hx', 'swap')).toBe('hx-swap');
    });

    it('returns English for elements outside any lang scope', () => {
      const button = document.createElement('button');
      container.appendChild(button);
      expect(getHooks().nameOf(button, 'hx', 'get')).toBe('hx-get');
    });

    it('translates event names via eventNameOf', () => {
      const section = document.createElement('section');
      section.setAttribute('lang', 'es');
      const button = document.createElement('button');
      section.appendChild(button);
      container.appendChild(section);
      expect(getHooks().eventNameOf(button, 'clic')).toBe('click');
    });
  });

  describe('selectorFor hook', () => {
    it('unions over all registered languages', () => {
      register('es', {
        hyperfixi: { attrs: { 'hx-acción': 'hx-get', 'hx-objetivo': 'hx-target' } },
      });
      register('ja', {
        hyperfixi: { attrs: { 'hx-取得': 'hx-get' } },
      });
      const sel = getHooks().selectorFor('hx', 'get');
      expect(sel).toContain('[hx-get]');
      expect(sel).toContain('[hx-acción]');
      expect(sel).toContain('[hx-取得]');
    });

    it('only emits canonical when no localized forms registered', () => {
      register('es', { hyperfixi: { attrs: { 'hx-objetivo': 'hx-target' } } });
      // 'hx-get' has no localized form even though Spanish is registered.
      expect(getHooks().selectorFor('hx', 'get')).toBe('[hx-get]');
    });
  });

  describe('missing-language warning', () => {
    it('warns once per missing language, not per call', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Register Japanese so the orchestrator's hooks are installed at
      // all — without any register() call, the default hooks are in use
      // and the missing-lang warning path never runs.
      register('ja', { hyperfixi: { attrs: { 'hx-取得': 'hx-get' } } });

      const section = document.createElement('section');
      section.setAttribute('lang', 'pt'); // unregistered
      const button = document.createElement('button');
      section.appendChild(button);
      container.appendChild(section);

      getHooks().nameOf(button, 'hx', 'get');
      getHooks().nameOf(button, 'hx', 'target');
      getHooks().nameOf(button, 'sse', 'connect');

      const matching = warn.mock.calls.filter(
        ([m]) => typeof m === 'string' && m.includes('lang="pt"')
      );
      expect(matching.length).toBe(1);
      warn.mockRestore();
    });
  });

  describe('window.__hyperfixi_i18n', () => {
    it('exposes the register function on import', () => {
      const w = window as unknown as {
        __hyperfixi_i18n?: { register: typeof register };
      };
      expect(typeof w.__hyperfixi_i18n?.register).toBe('function');
    });
  });
});
