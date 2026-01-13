// packages/i18n/src/parser/locale-manager.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { LocaleManager, detectBrowserLocale } from './locale-manager';
import { esKeywords } from './es';
import { jaKeywords } from './ja';
import { frKeywords } from './fr';
import { deKeywords } from './de';
import { arKeywords } from './ar';

describe('LocaleManager', () => {
  beforeEach(() => {
    LocaleManager.reset();
  });

  describe('register / unregister', () => {
    it('should register a locale provider', () => {
      LocaleManager.register('es', esKeywords);
      expect(LocaleManager.has('es')).toBe(true);
    });

    it('should unregister a locale provider', () => {
      LocaleManager.register('es', esKeywords);
      LocaleManager.unregister('es');
      expect(LocaleManager.has('es')).toBe(false);
    });

    it('should handle case-insensitive locale codes', () => {
      LocaleManager.register('ES', esKeywords);
      expect(LocaleManager.has('es')).toBe(true);
      expect(LocaleManager.has('ES')).toBe(true);
    });
  });

  describe('setDefault / getDefault', () => {
    it('should have en as default initially', () => {
      expect(LocaleManager.getDefault()).toBe('en');
    });

    it('should set default locale', () => {
      LocaleManager.register('es', esKeywords);
      LocaleManager.setDefault('es');
      expect(LocaleManager.getDefault()).toBe('es');
    });

    it('should throw when setting unregistered locale as default', () => {
      expect(() => LocaleManager.setDefault('xyz')).toThrow("Locale 'xyz' is not registered");
    });

    it('should allow setting en as default without registration', () => {
      LocaleManager.setDefault('en');
      expect(LocaleManager.getDefault()).toBe('en');
    });
  });

  describe('get', () => {
    it('should get English provider by default', () => {
      const provider = LocaleManager.get();
      expect(provider.locale).toBe('en');
    });

    it('should get registered locale provider', () => {
      LocaleManager.register('es', esKeywords);
      const provider = LocaleManager.get('es');
      expect(provider.locale).toBe('es');
    });

    it('should get default locale when no argument provided', () => {
      LocaleManager.register('ja', jaKeywords);
      LocaleManager.setDefault('ja');
      const provider = LocaleManager.get();
      expect(provider.locale).toBe('ja');
    });

    it('should throw for unregistered locale', () => {
      expect(() => LocaleManager.get('xyz')).toThrow("Locale 'xyz' is not registered");
    });
  });

  describe('has', () => {
    it('should always have en', () => {
      expect(LocaleManager.has('en')).toBe(true);
    });

    it('should return false for unregistered locale', () => {
      expect(LocaleManager.has('xyz')).toBe(false);
    });

    it('should return true for registered locale', () => {
      LocaleManager.register('fr', frKeywords);
      expect(LocaleManager.has('fr')).toBe(true);
    });
  });

  describe('getAvailable', () => {
    it('should include en by default', () => {
      expect(LocaleManager.getAvailable()).toContain('en');
    });

    it('should include registered locales', () => {
      LocaleManager.register('es', esKeywords);
      LocaleManager.register('ja', jaKeywords);
      const available = LocaleManager.getAvailable();
      expect(available).toContain('en');
      expect(available).toContain('es');
      expect(available).toContain('ja');
    });
  });

  describe('registerAll', () => {
    it('should register multiple locales at once', () => {
      LocaleManager.registerAll({
        es: esKeywords,
        ja: jaKeywords,
        fr: frKeywords,
        de: deKeywords,
        ar: arKeywords,
      });

      expect(LocaleManager.has('es')).toBe(true);
      expect(LocaleManager.has('ja')).toBe(true);
      expect(LocaleManager.has('fr')).toBe(true);
      expect(LocaleManager.has('de')).toBe(true);
      expect(LocaleManager.has('ar')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all registered locales and reset default', () => {
      LocaleManager.register('es', esKeywords);
      LocaleManager.setDefault('es');

      LocaleManager.reset();

      expect(LocaleManager.has('es')).toBe(false);
      expect(LocaleManager.getDefault()).toBe('en');
    });
  });

  describe('Integration: keyword resolution', () => {
    beforeEach(() => {
      LocaleManager.registerAll({
        es: esKeywords,
        ja: jaKeywords,
        fr: frKeywords,
      });
    });

    it('should resolve keywords for different locales', () => {
      // Spanish
      const es = LocaleManager.get('es');
      expect(es.resolve('alternar')).toBe('toggle');

      // Japanese
      const ja = LocaleManager.get('ja');
      expect(ja.resolve('切り替え')).toBe('toggle');

      // French
      const fr = LocaleManager.get('fr');
      expect(fr.resolve('basculer')).toBe('toggle');

      // English
      const en = LocaleManager.get('en');
      expect(en.resolve('toggle')).toBe('toggle');
    });

    it('should support switching default locale dynamically', () => {
      // Start with English
      expect(LocaleManager.get().resolve('toggle')).toBe('toggle');

      // Switch to Spanish
      LocaleManager.setDefault('es');
      expect(LocaleManager.get().resolve('alternar')).toBe('toggle');

      // Switch to Japanese
      LocaleManager.setDefault('ja');
      expect(LocaleManager.get().resolve('切り替え')).toBe('toggle');
    });
  });
});

describe('detectBrowserLocale', () => {
  beforeEach(() => {
    LocaleManager.reset();
  });

  it('should return English provider when navigator is undefined', () => {
    // In Node.js environment, navigator is undefined
    const provider = detectBrowserLocale();
    expect(provider.locale).toBe('en');
  });

  it('should return English when no matching locale is registered', () => {
    // No locales registered, should fall back to English
    const provider = detectBrowserLocale();
    expect(provider.locale).toBe('en');
  });
});
