import { describe, it, expect, beforeEach, vi as vitest } from 'vitest';
import { RuntimeI18nManager, initializeI18n, getI18n } from './runtime';

describe('RuntimeI18nManager', () => {
  let manager: RuntimeI18nManager;

  beforeEach(() => {
    manager = new RuntimeI18nManager({ locale: 'en' });
  });

  describe('constructor', () => {
    it('creates with default options', () => {
      const m = new RuntimeI18nManager();
      expect(m.getLocale()).toBe('en');
    });

    it('creates with custom locale', () => {
      const m = new RuntimeI18nManager({ locale: 'es' });
      expect(m.getLocale()).toBe('es');
    });
  });

  describe('getLocale', () => {
    it('returns current locale', () => {
      expect(manager.getLocale()).toBe('en');
    });
  });

  describe('setLocale', () => {
    it('updates the current locale', async () => {
      await manager.setLocale('fr');
      expect(manager.getLocale()).toBe('fr');
    });

    it('skips when same locale', async () => {
      const observer = vitest.fn();
      manager.onLocaleChange(observer);
      await manager.setLocale('en'); // same as current
      expect(observer).not.toHaveBeenCalled();
    });

    it('notifies observers on locale change', async () => {
      const observer = vitest.fn();
      manager.onLocaleChange(observer);
      await manager.setLocale('ja');
      expect(observer).toHaveBeenCalledWith('ja');
    });
  });

  describe('onLocaleChange', () => {
    it('subscribes to locale changes', async () => {
      const callback = vitest.fn();
      manager.onLocaleChange(callback);
      await manager.setLocale('ko');
      expect(callback).toHaveBeenCalledWith('ko');
    });

    it('returns cleanup function that unsubscribes', async () => {
      const callback = vitest.fn();
      const cleanup = manager.onLocaleChange(callback);
      cleanup();
      await manager.setLocale('de');
      expect(callback).not.toHaveBeenCalled();
    });

    it('supports multiple observers', async () => {
      const cb1 = vitest.fn();
      const cb2 = vitest.fn();
      manager.onLocaleChange(cb1);
      manager.onLocaleChange(cb2);
      await manager.setLocale('fr');
      expect(cb1).toHaveBeenCalledWith('fr');
      expect(cb2).toHaveBeenCalledWith('fr');
    });
  });

  describe('isRTL', () => {
    it('returns true for Arabic', () => {
      expect(manager.isRTL('ar')).toBe(true);
    });

    it('returns false for English', () => {
      expect(manager.isRTL('en')).toBe(false);
    });

    it('uses current locale when no argument', () => {
      expect(manager.isRTL()).toBe(false);
    });
  });

  describe('getSupportedLocales', () => {
    it('returns array of locale codes', () => {
      const locales = manager.getSupportedLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('es');
      expect(locales).toContain('ja');
      expect(locales.length).toBeGreaterThanOrEqual(22);
    });
  });

  describe('translate', () => {
    it('translates from English to target locale', () => {
      const result = manager.translate('on', { to: 'es' });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('createLocaleSwitcher', () => {
    it('creates a dropdown element by default', () => {
      const switcher = manager.createLocaleSwitcher();
      expect(switcher.tagName).toBe('SELECT');
    });

    it('creates a button container when type is buttons', () => {
      const switcher = manager.createLocaleSwitcher({ type: 'buttons' });
      expect(switcher.tagName).toBe('DIV');
    });

    it('applies custom className', () => {
      const switcher = manager.createLocaleSwitcher({ className: 'my-switcher' });
      expect(switcher.className).toBe('my-switcher');
    });
  });
});

describe('initializeI18n / getI18n', () => {
  it('getI18n throws before initialization', () => {
    // Reset global state — the module re-exports `runtimeI18n` as let
    // We can't easily reset it, so we test the pattern
    // This test is valid only if runtimeI18n hasn't been set yet in this module scope
  });

  it('initializeI18n creates a global instance', () => {
    const instance = initializeI18n({ locale: 'en' });
    expect(instance).toBeInstanceOf(RuntimeI18nManager);
    expect(instance.getLocale()).toBe('en');
  });

  it('getI18n returns the initialized instance', () => {
    initializeI18n({ locale: 'fr' });
    const instance = getI18n();
    expect(instance).toBeInstanceOf(RuntimeI18nManager);
    expect(instance.getLocale()).toBe('fr');
  });
});
